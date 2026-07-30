import net from 'node:net'

/** Ask the OS for an unused port by binding port 0, then releasing it. */
export function findFreePort(host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, host, () => {
      const { port } = srv.address()
      srv.close(() => resolve(port))
    })
  })
}
