const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const crypto = require('node:crypto')
const vm = require('node:vm')
const ts = require('typescript')
const sharp = require('sharp')
const source = 'public/brand/friendly-party-rental-nyc-20260929-original.png'
const expected = '37bb5f00906e5b71aba2e3d63715b71f1e4b29b5b01e8e40b5f1d27719d1b253'
function loadIcons() {
  const code = ts.transpileModule(fs.readFileSync('lib/nycBrandIcon.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  const context = vm.createContext({ exports: {}, require, process, Buffer, console })
  vm.runInContext(code, context)
  return context.exports
}
test('owner-approved original is preserved byte for byte', () => {
  const bytes = fs.readFileSync(source)
  assert.equal(bytes.length, 2428349)
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), expected)
  assert.equal(fs.readFileSync('public/brand/friendly-party-rental-nyc-20260929-original.json', 'utf8').includes(expected), true)
})
test('entire image decodes at original 2:1 proportions', async () => {
  const bytes = fs.readFileSync(source)
  const metadata = await sharp(bytes, { failOn: 'warning' }).metadata()
  assert.equal(metadata.width, 1774)
  assert.equal(metadata.height, 887)
  await sharp(bytes, { failOn: 'warning' }).raw().toBuffer()
  await assert.rejects(sharp(bytes.subarray(0, 3000), { failOn: 'warning' }).raw().toBuffer())
})
test('legacy paths used by mobile footer admin and emails contain identical approved artwork', () => {
  for (const file of ['public/images/logo.png', 'public/brand/friendly-party-rental-nyc-logo-v7.png']) {
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), expected, file)
  }
})
test('square favicon and app icons retain the complete image on a white canvas', async () => {
  const { renderNycBrandIcon } = loadIcons()
  for (const size of [16, 32, 48, 96, 180, 192, 256, 512]) {
    const icon = await renderNycBrandIcon(size)
    const metadata = await sharp(icon).metadata()
    assert.equal(metadata.width, size)
    assert.equal(metadata.height, size)
    const expectedPixels = await sharp(source).resize(size, size, { fit: 'contain', background: '#ffffff' }).raw().toBuffer()
    assert.deepEqual(await sharp(icon).raw().toBuffer(), expectedPixels)
  }
})
test('maskable icon fits the full artwork inside a square safety margin', async () => {
  const { renderNycBrandIcon } = loadIcons()
  const icon = await renderNycBrandIcon(512, true)
  const metadata = await sharp(icon).metadata()
  assert.equal(metadata.width, 512)
  assert.equal(metadata.height, 512)
  const inset = Math.ceil(512 * 0.15)
  const expectedPixels = await sharp(source).resize(512-inset*2, 512-inset*2, { fit: 'contain', background: '#ffffff' }).extend({top:inset,bottom:inset,left:inset,right:inset,background:'#ffffff'}).raw().toBuffer()
  assert.deepEqual(await sharp(icon).raw().toBuffer(), expectedPixels)
  await assert.rejects(renderNycBrandIcon(10000))
})
test('header and metadata use the versioned original and dimensioned icons', () => {
  const header = fs.readFileSync('components/public/Header.tsx', 'utf8')
  const layout = fs.readFileSync('app/layout.tsx', 'utf8')
  assert.ok(header.includes('/brand/friendly-party-rental-nyc-20260929-original.png'))
  assert.ok(header.includes('width={1774} height={887}'))
  assert.ok(header.includes('h-auto'))
  assert.ok(header.includes('object-contain'))
  assert.ok(layout.includes('width: 1774, height: 887'))
  assert.ok(layout.includes('/api/nyc-brand-icon-20260929/180'))
  for (const file of ['public/site.webmanifest', 'public/driver-manifest.webmanifest']) {
    for (const icon of JSON.parse(fs.readFileSync(file, 'utf8')).icons) {
      assert.ok(icon.src.startsWith('/api/nyc-brand-icon-20260929/'))
      assert.ok(['192x192', '512x512'].includes(icon.sizes))
    }
  }
})
