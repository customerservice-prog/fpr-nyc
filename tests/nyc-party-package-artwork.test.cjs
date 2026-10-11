const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const realSharp = require('sharp')

const root = path.join(__dirname, '..')
const fixtures = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/nyc-party-package-catalog.json'), 'utf8'))
const pngPromise = realSharp({ create: { width: 1536, height: 1024, channels: 4, background: '#111111' } }).png().toBuffer()

function load({ asset, readError, rows = [], weddingArtwork = null } = {}) {
  const reads = [], composites = [], queries = [], upstream = []
  const encoded = Buffer.from('composited current price')
  const modules = new Map()
  const mockedSharp = input => {
    const chain = {
      async metadata() { return realSharp(input).metadata() },
      composite(layers) { composites.push({ input, layers }); return chain },
      png() { return chain },
      async toBuffer() { return encoded },
    }
    return chain
  }
  function moduleFor(file) {
    const absolute = path.join(root, file)
    if (modules.has(absolute)) return modules.get(absolute).exports
    const module = { exports: {} }
    modules.set(absolute, module)
    const output = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      fileName: absolute.replace(/\.mjs$/, '.ts'),
    }).outputText
    const localRequire = spec => {
      if (spec === 'node:fs/promises') return { async readFile(filename) {
        reads.push(filename)
        if (readError) throw readError
        return asset
      } }
      if (spec === 'sharp') return mockedSharp
      if (spec === 'next/server') return { NextResponse: Response }
      if (spec === '@/lib/prisma') return { prisma: { item: { async findMany(query) { queries.push(query); return rows } } } }
      if (spec === '@/lib/nycWeddingArtworkServer') return { async readNycWeddingArtwork() { return weddingArtwork } }
      if (spec.startsWith('@/') || spec.startsWith('.')) {
        const base = spec.startsWith('@/') ? spec.slice(2) : path.join(path.dirname(file), spec)
        const resolved = ['.ts', '.mjs', ''].map(extension => base + extension).find(candidate => fs.existsSync(path.join(root, candidate)))
        if (!resolved) throw new Error('Missing test module: ' + spec)
        return moduleFor(resolved)
      }
      return require(spec)
    }
    vm.runInNewContext(output, {
      module, exports: module.exports, require: localRequire, Buffer, Intl, URL, Response, AbortSignal,
      process: { cwd: () => root },
      fetch: async url => { upstream.push(String(url)); return new Response(asset, { headers: { 'Content-Type': 'image/png' } }) },
    }, { filename: absolute })
    return module.exports
  }
  return { renderer: moduleFor('lib/nycPartyPackageArtworkServer.ts'), route: () => moduleFor('app/api/item-image/[slug]/route.ts'), reads, composites, queries, upstream, encoded }
}

for (const item of fixtures) {
  test('approved party edit is returned byte-for-byte: ' + item.slug, async () => {
    const asset = await pngPromise
    const harness = load({ asset })
    const image = await harness.renderer.renderNycPartyPackageArtwork(item.slug, item)
    assert.ok(image, 'published approved scope is recognized')
    assert.deepEqual(image.bytes, asset)
    assert.equal(image.reference, 'NYC-Minoa-style-current-catalog')
    assert.equal(harness.composites.length, 0)
    assert.equal(harness.reads.length, 1)
    assert.match(harness.reads[0], /public\/images\/nyc-party-minoa-style\//)
    assert.ok(!harness.reads[0].includes('-syracuse'), 'stored aliases use the reviewed public-slug asset')
  })

  test('later price replaces the printed region without changing the party layout: ' + item.slug, async () => {
    const asset = await pngPromise
    const harness = load({ asset })
    const cost = item.cost + 100.25
    const image = await harness.renderer.renderNycPartyPackageArtwork(item.slug, { ...item, cost })
    assert.ok(image)
    assert.deepEqual(image.bytes, harness.encoded)
    assert.equal(harness.composites.length, 1)
    assert.deepEqual(harness.composites[0].input, asset)
    const svg = Buffer.from(harness.composites[0].layers[0].input).toString()
    assert.match(svg, /<(?:rect|path)\b/, 'stale price pixels are covered before new price text')
    const formattedPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cost)
    const region = harness.renderer.MINOA_PARTY_ARTWORK[item.slug.replace(/-syracuse-ny$/, '')].price
    assert.ok(svg.includes(region.preserveCurrency ? formattedPrice.slice(1) : formattedPrice))
    assert.match(svg, /preserveAspectRatio="none"/, 'calibrated region scales with the edited bitmap')
  })
}

test('the registry contains exactly the twelve approved non-wedding primary cards', async () => {
  const { renderer } = load()
  const { NYC_APPROVED_PACKAGE_PRICES } = await import('../lib/nycPackagePricing.mjs')
  const approved = Object.keys(NYC_APPROVED_PACKAGE_PRICES).filter(slug => !slug.startsWith('wedding-')).sort()
  assert.deepEqual(Object.keys(renderer.MINOA_PARTY_ARTWORK).sort(), approved)
  for (const item of fixtures) {
    assert.equal(renderer.isNycPartyArtworkRequest(item.slug, null), true)
    assert.equal(renderer.isNycPartyArtworkRequest(item.slug, 0), false, 'no audited gallery images exist')
    assert.equal(item.cost, NYC_APPROVED_PACKAGE_PRICES[item.slug.replace(/-syracuse-ny$/, '')])
    assert.equal(renderer.MINOA_PARTY_ARTWORK[item.slug.replace(/-syracuse-ny$/, '')].approvedPrice, item.cost, 'asset metadata records the printed rate independently of future policy edits')
  }
})

test('missing, malformed or invalid-rate cards fail closed without an upstream request', async () => {
  const item = fixtures[0]
  for (const options of [
    { readError: new Error('missing reviewed asset') },
    { asset: Buffer.from('stale upstream poster') },
    { asset: await pngPromise, rows: [{ ...item, cost: 0 }] },
  ]) {
    const harness = load({ rows: [item], ...options })
    const response = await harness.route().GET({ nextUrl: new URL('https://nyc.example/api/item-image/' + item.slug), url: 'https://nyc.example/' }, { params: Promise.resolve({ slug: item.slug }) })
    assert.equal(response.status, 503)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.equal(harness.upstream.length, 0)
  }
})

test('changed equipment/name and formerly misleading scope cannot reuse the reviewed card', async () => {
  const harness = load({ asset: await pngPromise })
  const tentItem = fixtures.find(item => item.slug === '30x30-tent-package-8-tables-80-chairs')
  for (const item of [
    { ...tentItem, description: tentItem.description.replace('8 tables', '10 tables').replace('80 chairs', '100 chairs') },
    { ...tentItem, name: 'Custom Tent Package' },
    { ...fixtures.find(item => item.slug.startsWith('kids-birthday-')), description: 'Includes 1 Rainbow Castle Bounce House, 4 tables, and 24 chairs.' },
    { ...fixtures.find(item => item.slug.startsWith('summer-splash-')), description: 'Includes 1 Different Inflatable Water Slide, 4 tables and 24 chairs. The listed base model is Tidal Wave Inflatable Water Slide.' },
    { ...fixtures.find(item => item.slug.startsWith('bounce-house-water-slide')), description: 'Includes 1 Rainbow Castle Bounce House and 1 Tidal Wave Inflatable Water Slide, 4 tables and 24 chairs.' },
  ]) assert.equal(await harness.renderer.renderNycPartyPackageArtwork(item.slug, item), null)
  assert.equal(harness.reads.length, 0)
})

test('invalid live prices and unknown slugs cannot read a price-bearing card', async () => {
  const harness = load({ asset: await pngPromise })
  for (const cost of [0, -1, NaN, Infinity]) assert.equal(await harness.renderer.renderNycPartyPackageArtwork(fixtures[0].slug, { ...fixtures[0], cost }), null)
  assert.equal(await harness.renderer.renderNycPartyPackageArtwork('unreviewed-package', fixtures[0]), null)
  assert.equal(harness.reads.length, 0)
})

test('party route uses published current catalog scope and short-slug aliases', async () => {
  const item = fixtures.find(item => item.slug.startsWith('graduation-party-package-small'))
  const slug = item.slug.replace(/-syracuse-ny$/, '')
  const asset = await pngPromise
  const harness = load({ asset, rows: [item] })
  const response = await harness.route().GET({ nextUrl: new URL('https://nyc.example/api/item-image/' + slug), url: 'https://nyc.example/' }, { params: Promise.resolve({ slug }) })
  assert.equal(response.status, 200)
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), asset)
  assert.equal(response.headers.get('x-image-reference'), 'NYC-Minoa-style-current-catalog')
  assert.equal(response.headers.get('cache-control'), 'public, max-age=0, must-revalidate')
  const query = harness.queries[0]
  assert.equal(query.where.displayToCustomer, true)
  assert.equal(query.where.category.displayToCustomer, true)
  assert.ok(query.where.slug.in.includes(item.slug))
  for (const field of ['name', 'cost', 'description']) assert.equal(query.select[field], true)
  assert.equal(harness.upstream.length, 0)
})

test('unpublished party item returns 404 and ordinary gallery photos retain the proxy', async () => {
  const missing = load({ asset: await pngPromise })
  const slug = fixtures[0].slug
  assert.equal((await missing.route().GET({ nextUrl: new URL('https://nyc.example/api/item-image/' + slug), url: 'https://nyc.example/' }, { params: Promise.resolve({ slug }) })).status, 404)
  assert.equal(missing.reads.length, 0)
  const ordinary = load({ asset: await pngPromise, rows: [{ slug: 'folding-table', name: 'Folding Table', picture: 'https://source.example/main.png', additionalImages: ['https://source.example/detail.png'] }] })
  const response = await ordinary.route().GET({ nextUrl: new URL('https://nyc.example/api/item-image/folding-table?index=0'), url: 'https://nyc.example/' }, { params: Promise.resolve({ slug: 'folding-table' }) })
  assert.equal(response.status, 200)
  assert.equal(ordinary.upstream[0], 'https://source.example/detail.png')
  assert.equal(ordinary.reads.length, 0)
  assert.equal(response.headers.get('cache-control'), 'public, max-age=3600, stale-while-revalidate=86400')
})

test('wedding item-image header reports the renderer actually used', async () => {
  const asset = await pngPromise
  const harness = load({ weddingArtwork: { bytes: asset, contentType: 'image/png', reference: 'NYC-Minoa-style-current-catalog' } })
  const slug = 'wedding-package-backyard-elopement'
  const response = await harness.route().GET({ nextUrl: new URL('https://nyc.example/api/item-image/' + slug), url: 'https://nyc.example/' }, { params: Promise.resolve({ slug }) })
  assert.equal(response.headers.get('x-image-reference'), 'NYC-Minoa-style-current-catalog')
})
