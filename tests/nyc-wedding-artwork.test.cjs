const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const realSharp = require('sharp')

const root = path.join(__dirname, '..')
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/nyc-wedding-package-catalog.json'), 'utf8'))
const copyFixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/nyc-package-copy.json'), 'utf8'))
const packages = [
  ['pkg-basic', 'wedding-package-backyard-elopement', 595],
  ['pkg-standard', 'wedding-package-classic-ceremony', 995],
  ['pkg-premium', 'wedding-package-garden-reception', 3295],
  ['pkg-luxury', 'wedding-package-luxury-estate', 7495],
  ['pkg-elite', 'wedding-package-all-inclusive-premium', 12995],
]

// Use the same catalog localization as the NYC import. The captured fixture
// contains old price text, but its approved equipment quantities remain useful.
const casesPromise = import('../lib/nycCatalogCore.mjs').then(({ desiredNycItem }) => packages.map(([id, slug, cost], index) => ({
  id,
  item: desiredNycItem({
    slug,
    name: 'Wedding Package - ' + fixtures[index].name,
    description: fixtures[index].description,
    cost: copyFixtures.find(fixture => fixture.slug === slug).sourcePrice,
    quantity: 1,
    category: { slug: 'party-rental-packages' },
  }, index),
})))
const pngPromise = realSharp({ create: { width: 1536, height: 1024, channels: 4, background: '#f7f3e9' } }).png().toBuffer()

function loadRenderer({ asset, readError, item = null } = {}) {
  const reads = []
  const composites = []
  const sharpInputs = []
  const encoded = Buffer.from('test composite output')
  const modules = new Map()
  const mockedSharp = input => {
    sharpInputs.push(input)
    const chain = {
      async metadata() { return realSharp(input).metadata() },
      composite(layers) { composites.push({ input, layers }); return chain },
      png() { return chain },
      async toBuffer() { return encoded },
    }
    return chain
  }
  function load(file) {
    const absolute = path.join(root, file)
    if (modules.has(absolute)) return modules.get(absolute).exports
    if (file.endsWith('.json')) return JSON.parse(fs.readFileSync(absolute, 'utf8'))
    const module = { exports: {} }
    modules.set(absolute, module)
    const output = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: absolute,
    }).outputText
    const localRequire = spec => {
      if (spec === 'node:fs/promises') return { async readFile(filename) {
        reads.push(filename)
        if (readError) throw readError
        return asset
      } }
      if (spec === 'sharp') return mockedSharp
      if (spec === '@/lib/prisma') return { prisma: { item: { async findFirst() { return item } } } }
      if (spec.startsWith('@/') || spec.startsWith('.')) {
        const base = spec.startsWith('@/') ? spec.slice(2) : path.join(path.dirname(file), spec)
        const resolved = ['.ts', '.json', ''].map(extension => base + extension).find(candidate => fs.existsSync(path.join(root, candidate)))
        if (!resolved) throw new Error('Missing test module: ' + spec)
        return load(resolved)
      }
      return require(spec)
    }
    vm.runInNewContext(output, {
      module,
      exports: module.exports,
      require: localRequire,
      Buffer,
      Date,
      Intl,
      console,
      process: { cwd: () => root, env: {} },
    }, { filename: absolute })
    return module.exports
  }
  return { ...load('lib/nycWeddingArtworkServer.ts'), reads, composites, sharpInputs, encoded }
}

for (let index = 0; index < packages.length; index++) {
  test('reviewed Minoa-style artwork is returned unchanged at the approved NYC rate: ' + packages[index][0], async () => {
    const { id, item } = (await casesPromise)[index]
    const asset = await pngPromise
    const renderer = loadRenderer({ asset })
    assert.equal(item.cost, packages[index][2], 'the catalog import preserves the approved NYC price')
    const image = await renderer.renderMinoaStyleWeddingArtwork(id, item)
    assert.ok(image, id)
    assert.equal(image.contentType, 'image/png')
    assert.deepEqual(image.bytes, asset, 'the reviewed card is not unnecessarily re-encoded')
    assert.equal(renderer.composites.length, 0)
  })

  test('a later catalog price replaces the baked price without replacing the reviewed layout: ' + packages[index][0], async () => {
    const { id, item } = (await casesPromise)[index]
    const asset = await pngPromise
    const renderer = loadRenderer({ asset })
    const cost = item.cost + 100.25
    const image = await renderer.renderMinoaStyleWeddingArtwork(id, { ...item, cost })
    assert.ok(image)
    assert.equal(image.contentType, 'image/png')
    assert.deepEqual(image.bytes, renderer.encoded)
    assert.equal(renderer.composites.length, 1)
    assert.deepEqual(renderer.composites[0].input, asset, 'the current card stays as the composite background')
    const layers = renderer.composites[0].layers
    const svg = layers.map(layer => Buffer.from(layer.input).toString()).join('\n')
    assert.match(svg, /<svg\b/)
    assert.match(svg, /<rect\b/, 'a replacement background covers the stale price')
    assert.ok(svg.includes(new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cost)), 'the replacement uses the live price, including cents')
  })
}

test('changed equipment quantities fall back instead of showing the old reviewed bundle', async () => {
  const { id, item } = (await casesPromise)[2]
  for (const [before, after] of [['Eight 5′ Round Banquet Tables', 'Nine 5′ Round Banquet Tables'], ['Eighty Gold Chiavari Chairs', 'Ninety Gold Chiavari Chairs']]) {
    assert.ok(item.description.includes(before), 'fixture contains the intended quantity')
    const renderer = loadRenderer({ asset: await pngPromise })
    assert.equal(await renderer.renderMinoaStyleWeddingArtwork(id, { ...item, description: item.description.replace(before, after) }), null)
    assert.equal(renderer.composites.length, 0)
  }
})

test('a changed package name does not reuse another approved card', async () => {
  const { id, item } = (await casesPromise)[0]
  const renderer = loadRenderer({ asset: await pngPromise })
  assert.equal(await renderer.renderMinoaStyleWeddingArtwork(id, { ...item, name: 'Custom Backyard Package' }), null)
})

test('changed guest capacity or an added rental inclusion disables the reviewed card', async () => {
  const { id, item } = (await casesPromise)[2]
  const changedDescriptions = [
    item.description.replace(/up to 80 guests/gi, 'up to 90 guests'),
    item.description.replace('Perimeter String Lighting around the tent', 'Perimeter String Lighting around the tent\nOne Portable Dance Floor'),
  ]
  for (const description of changedDescriptions) {
    const renderer = loadRenderer({ asset: await pngPromise })
    assert.equal(await renderer.renderMinoaStyleWeddingArtwork(id, { ...item, description }), null)
  }
})

test('invalid live costs never expose a baked approved price', async () => {
  const { id, item } = (await casesPromise)[0]
  for (const cost of [0, -1, NaN, Infinity]) {
    const renderer = loadRenderer({ asset: await pngPromise })
    assert.equal(await renderer.renderMinoaStyleWeddingArtwork(id, { ...item, cost }), null, String(cost))
    assert.equal(renderer.composites.length, 0)
  }
})

test('a missing reviewed asset falls back without failing the image request', async () => {
  const { id, item } = (await casesPromise)[0]
  const renderer = loadRenderer({ readError: Object.assign(new Error('missing test asset'), { code: 'ENOENT' }) })
  assert.equal(await renderer.renderMinoaStyleWeddingArtwork(id, item), null)
})

test('malformed or mislabeled images cannot be returned as reviewed PNGs', async () => {
  const { id, item } = (await casesPromise)[0]
  const signatureOnly = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)])
  for (const asset of [Buffer.from('not a PNG'), signatureOnly]) {
    const renderer = loadRenderer({ asset })
    assert.equal(await renderer.renderMinoaStyleWeddingArtwork(id, item), null)
  }
})

test('unknown package ids never read a reviewed card from disk', async () => {
  const renderer = loadRenderer({ asset: await pngPromise })
  assert.equal(await renderer.renderMinoaStyleWeddingArtwork('pkg-custom', (await casesPromise)[0].item), null)
  assert.equal(renderer.reads.length, 0)
})

test('the public artwork reader uses the reviewed card for a matching live catalog item', async () => {
  const { id, item } = (await casesPromise)[1]
  const asset = await pngPromise
  const renderer = loadRenderer({ asset, item })
  const image = await renderer.readNycWeddingArtwork(id)
  assert.ok(image)
  assert.deepEqual(image.bytes, asset)
  assert.equal(renderer.composites.length, 0)
  assert.equal(renderer.reads.length, 1, 'the native fallback photo and logo are unnecessary')
})

test('the public artwork reader renders live catalog scope when the reviewed inclusions drift', async () => {
  const { id, item } = (await casesPromise)[2]
  const changed = { ...item, description: item.description.replace('Eight 5′ Round Banquet Tables', 'Nine 5′ Round Banquet Tables') }
  const renderer = loadRenderer({ asset: await pngPromise, item: changed })
  const image = await renderer.readNycWeddingArtwork(id)
  assert.ok(image)
  assert.deepEqual(image.bytes, renderer.encoded)
  assert.equal(renderer.composites.length, 0, 'the outdated reviewed card was not used as a background')
  const svg = renderer.sharpInputs.filter(input => Buffer.isBuffer(input) && input.toString().startsWith('<svg')).map(input => input.toString()).join('\n')
  assert.match(svg, /Nine 5′ Round Banquet Tables/)
  assert.doesNotMatch(svg, /Eight 5′ Round Banquet Tables/)
})

test('native fallback preserves future catalog prices including cents', async () => {
  const { id, item } = (await casesPromise)[0]
  const cost = item.cost + 100.25
  const renderer = loadRenderer({
    asset: await pngPromise,
    item: { ...item, cost, name: 'Custom Backyard Package' },
  })
  const image = await renderer.readNycWeddingArtwork(id)
  assert.ok(image)
  assert.deepEqual(image.bytes, renderer.encoded)
  assert.equal(renderer.composites.length, 0)
  assert.ok(renderer.reads.every(filename => !filename.includes('nyc-wedding-minoa-style')), 'the mismatched reviewed artwork is skipped')
  const svg = renderer.sharpInputs.filter(input => Buffer.isBuffer(input) && input.toString().startsWith('<svg')).map(input => input.toString()).join('\n')
  const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cost)
  assert.ok(svg.includes(price), 'the fallback shows the complete live price, including cents')
  assert.doesNotMatch(svg, />\$695</, 'the fallback does not round away the cents')
})
