export function assert(cond, message = null) {
  if (!cond) {
    throw new Error(`assertion failed: ${message}`)
  }
}
