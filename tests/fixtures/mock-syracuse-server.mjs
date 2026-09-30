// CI-only stand-in for the public Syracuse catalog API (read-only endpoints).
//   node tests/fixtures/mock-syracuse-server.mjs 4010
import http from 'node:http'
import { syracuseCategories, syracuseHasPhoto, syracuseItems } from './syracuse-catalog-sample.mjs'

const port = Number(process.argv[2] || 4010)
const server = http.createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end()
    return
  }
  const url = new URL(request.url || '/', 'http://127.0.0.1')
  const json = (body) => {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(request.method === 'HEAD' ? undefined : JSON.stringify(body))
  }
  if (url.pathname === '/api/items') return json({ items: syracuseItems })
  if (url.pathname === '/api/categories') return json({ categories: syracuseCategories })
  const photo = url.pathname.match(/^\/api\/item-image\/(.+)$/)
  if (photo && syracuseHasPhoto(decodeURIComponent(photo[1]), url.searchParams.get('index'))) {
    response.writeHead(200, { 'content-type': 'image/png' })
    // 1x1 transparent PNG
    response.end(request.method === 'HEAD' ? undefined : Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64'))
    return
  }
  response.writeHead(404, { 'content-type': 'text/plain' }).end('Not found')
})
server.listen(port, '127.0.0.1', () => console.log('mock Syracuse catalog on http://127.0.0.1:' + port))
