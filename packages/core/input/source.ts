import { log } from 'console'

type First = 'First'
type Second = 'Second'

/**
 * #Fixed
 */
export async function kol(first: First) {
  const lambda = new Lambda()
  log('Hello')
}

/**
 * #Fixed
 */
export async function bar(second: Second) {
  const lambda = new Lambda()
}
