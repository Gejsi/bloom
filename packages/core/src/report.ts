import ts from 'typescript'
import { parse as parseFileName } from 'path'
import { stringify as stringifyYaml } from 'yaml'

export const reportSyntaxError = (
  text: string,
  emptyCount: number,
  markerCount: number,
  errorMessage: string,
  nodeName: string,
  node: ts.Node
): never => {
  let errorText = text + '\n'
  errorText += ' '.repeat(emptyCount) + '^'.repeat(markerCount) + '\n'
  errorText += ' '.repeat(emptyCount) + errorMessage + '\n\n'
  errorText += `You have provided an ${errorMessage.toLowerCase()}`

  return reportErrorAt(errorText, nodeName, node)
}

export const reportErrorAt = (
  errorMessage: string,
  nodeName: string,
  node: ts.Node
): never => {
  const { dir, base } = parseFileName(node.getSourceFile().fileName)
  const filePath = dir + '/' + base
  const { line } = node
    .getSourceFile()
    .getLineAndCharacterOfPosition(node.getStart())

  let errorText = errorMessage + '\n'
  errorText += `in function '${nodeName}' defined here:\n--> ${filePath}:${
    line + 1
  }`

  console.error(errorText)
  process.exit(1)
}

export const reportDiagnostics = (diagnostics: ts.DiagnosticWithLocation[]) => {
  diagnostics.forEach((diagnostic) => {
    let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')

    if (diagnostic.file) {
      let { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start!
      )
      console.log(
        `${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`
      )
    } else {
      console.log(message)
    }
  })
}

export const reportMissingServerlessConfig = (error: string) => {
  let errorText = error + '\n'
  errorText +=
    'Please, provide a valid configuration file. You can use the following reference:\n\n'

  errorText += stringifyYaml({
    service: 'my-service-name',
    provider: {
      name: 'aws',
      runtime: 'nodejs14.x',
      region: 'us-east-1',
    },
  })

  console.log(errorText)
}
