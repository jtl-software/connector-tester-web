import path from 'node:path'

export function buildPhpArgs({ port, docRoot, routerScript, dataDir }) {
  const sessions = path.join(dataDir, 'sessions')
  const tmp = path.join(dataDir, 'tmp')

  return [
    '-d', `session.save_path=${sessions}`,
    '-d', `sys_temp_dir=${tmp}`,
    '-d', `upload_tmp_dir=${tmp}`,
    '-d', 'display_errors=0',
    '-d', 'log_errors=1',
    '-S', `127.0.0.1:${port}`,
    '-t', docRoot,
    routerScript
  ]
}
