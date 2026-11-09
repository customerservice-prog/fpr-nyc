const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')
const { timingSafeEqual } = require('node:crypto')

function loadPasswordChecker() {
  let queried = 0
  const file = 'lib/confirmNycPageAdminPassword.ts'
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  const env = { ADMIN_USERNAME: 'nycadmin', ADMIN_PASSWORD: 'environment-password' }
  const requireMock = id => {
    if (id === 'node:crypto') return { timingSafeEqual }
    if (id === 'bcryptjs') return { compare: async (password, stored) => password === 'database-password' && stored === 'dbhash' }
    if (id === '@/lib/prisma') return {
      prisma: { user: { findUnique: async ({ where }) => {
        queried++
        return where.username === 'dbadmin' ? { password: 'dbhash', role: 'admin' } : null
      } } },
    }
    throw Error('Unexpected import: ' + id)
  }
  vm.runInNewContext(code, { module, exports: module.exports, require: requireMock, process: { env }, Buffer, Date, console }, { filename: file })
  return { check: module.exports.confirmNycPageAdminPassword, getQueries: () => queried }
}

test('only a real NYC admin can re-confirm a public page change', async () => {
  const { check, getQueries } = loadPasswordChecker()
  assert.equal(await check(null, 'environment-password'), false)
  assert.equal(await check({ user: { role: 'staff', username: 'nycadmin' } }, 'environment-password'), false)
  assert.equal(await check({ user: { role: 'admin', username: 'nycadmin' } }, ''), false)
  assert.equal(await check({ user: { role: 'admin', username: 'nycadmin' } }, 'wrong'), false)
  assert.equal(await check({ user: { role: 'admin', username: 'nycadmin' } }, 'environment-password'), true)
  assert.equal(await check({ user: { role: 'admin', username: 'dbadmin' } }, 'database-password'), true)
  assert.equal(await check({ user: { role: 'admin', username: 'dbadmin' } }, 'wrong'), false)
  assert.ok(getQueries() >= 1)
})

test('custom pages are saved as private drafts without mass-assigned publication fields', () => {
  const route = fs.readFileSync('app/api/admin/website-pages/route.ts', 'utf8')
  assert.match(route, /isPublished: false/)
  assert.match(route, /validPageSlug\(body\.slug\)/)
  assert.match(route, /RESERVED_SLUGS/)
  assert.match(route, /sameNycOrigin\(request\)/)
  assert.match(route, /role !== 'admin'/)
  assert.match(route, /confirmNycPageAdminPassword\(session, body\.adminPassword\)/)
  assert.match(route, /Current admin password required to change a live page/)
  assert.match(route, /Current admin password required to delete a page/)
  assert.match(route, /Use explicit publishing actions/)
  assert.doesNotMatch(route, /prisma\.websitePage\.create\(\{ data \}\)/)
  assert.doesNotMatch(route, /data: rest/)
})

test('NYC admin page controls match the explicit publish and delete API', () => {
  const ui = fs.readFileSync('app/admin/settings/website-pages/page.tsx', 'utf8')
  assert.match(ui, /Save Private Draft/)
  assert.match(ui, /publishLive: !item\.isPublished/)
  assert.match(ui, /unpublishLive: item\.isPublished/)
  assert.match(ui, /JSON\.stringify\(\{ adminPassword \}\)/)
  assert.match(ui, /type="password"/)
  assert.match(ui, /Private draft/)
  assert.match(ui, /window\.confirm/)
  assert.doesNotMatch(ui, /JSON\.stringify\(\{ id: item\.id, isPublished:/)
})
