import ts from 'typescript'
import { annotationNameEquals } from '../annotations'
import { findFunctionInFile, isNodeExported } from '../node'
import { parseAnnotation } from '../parse'
import { trackMetricsTransformer } from './track-metrics'
import { fixedTransfomer } from './fixed'
import { httpTransfomer } from './http'
import { scheduledTransfomer } from './scheduled'
import type { ServerlessConfigFunctions } from '../transpile'

/** This transformer maps all sub-transformers */
export function superTransformer(
  checker: ts.TypeChecker,
  functionDetails: ServerlessConfigFunctions
): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    context.slsFunctionDetails = functionDetails
    context.typeChecker = checker

    return (sourceFile) => {
      context.imports = new Set()

      const visitor: ts.Visitor = (node) => {
        // if the visitor is at source file level, keep traversing the AST
        if (ts.isSourceFile(node))
          return ts.visitEachChild(node, visitor, context)

        if (ts.isImportDeclaration(node)) {
          context.imports.add(
            node.moduleSpecifier
              .getText()
              .substring(1, node.moduleSpecifier.getText().length - 1) // remove quotes from module specifier
          )

          return node
        }

        const res = mainTransfomer(node, context)

        // if the function transformation was successful, return the new node
        if (res) return res
      }

      return ts.visitNode(sourceFile, visitor)
    }
  }
}

function mainTransfomer(
  node: ts.Node,
  context: ts.TransformationContext
): ts.Node | void {
  // Only consider exported function declarations
  if (!isNodeExported(node) || !ts.isFunctionDeclaration(node)) return

  // Define local environment
  context.locals = (node as any).locals
  // Define the source file present in the AST
  context.sourceFile = node.getSourceFile()

  const symbol = node.name && context.typeChecker.getSymbolAtLocation(node.name)
  if (!symbol) return

  const comments = ts
    .displayPartsToString(symbol.getDocumentationComment(context.typeChecker))
    .split(/\n(?!\s)/)
    .filter((c) => c.startsWith('$'))

  let res: ts.SourceFile | ts.FunctionDeclaration | undefined = node

  for (const comment of comments) {
    const parsedAnnotation = parseAnnotation(comment, symbol.getName(), node)
    if (!parsedAnnotation) continue

    const pipedNode =
      res && ts.isSourceFile(res)
        ? findFunctionInFile(res, symbol.getName())
        : res

    if (annotationNameEquals(parsedAnnotation, 'Fixed')) {
      res = fixedTransfomer(pipedNode, context, parsedAnnotation)
    } else if (annotationNameEquals(parsedAnnotation, 'TrackMetrics')) {
      res = trackMetricsTransformer(pipedNode, context, parsedAnnotation)
    } else if (annotationNameEquals(parsedAnnotation, 'HttpApi')) {
      httpTransfomer(pipedNode, context, parsedAnnotation)
    } else if (annotationNameEquals(parsedAnnotation, 'Scheduled')) {
      scheduledTransfomer(pipedNode, context, parsedAnnotation)
    }
  }

  return res
}
