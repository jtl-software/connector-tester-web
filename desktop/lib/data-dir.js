import path from 'node:path'

/**
 * Resolve the portable data directory — always beside the app, never in the
 * OS user data dir, so copying the extracted folder carries saved connections,
 * history, and payloads with it.
 */
export function resolveDataDir({ platform, execPath, isPackaged, projectRoot }) {
  const p = platform === 'win32' ? path.win32 : path.posix

  if (!isPackaged) {
    return p.join(projectRoot, '.dev-data')
  }

  const exeDir = p.dirname(execPath)

  if (platform === 'darwin') {
    // execPath is <root>/Name.app/Contents/MacOS/Name — climb out of the
    // bundle so data/ is a visible sibling of the .app.
    return p.resolve(exeDir, '..', '..', '..', 'data')
  }

  return p.join(exeDir, 'data')
}

export function resolvePhpBinary({ platform, arch, resourcesPath }) {
  const isWindowsPath = resourcesPath.includes('\\')
  const p = isWindowsPath ? path.win32 : path.posix
  const binary = platform === 'win32' ? 'php.exe' : 'php'
  return p.join(resourcesPath, 'php', `${platform}-${arch}`, binary)
}
