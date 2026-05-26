export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY)
}

export function hasTTY(): boolean {
  try {
    const { openSync, closeSync } = require('node:fs') as typeof import('node:fs')
    const ttyDevice = process.platform === 'win32' ? 'CONIN$' : '/dev/tty'
    const fd = openSync(ttyDevice, 'r')
    closeSync(fd)
    return true
  } catch {
    return false
  }
}
