const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../lib/nycRentalSearch.ts'), 'utf8')
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
const plain = value => JSON.parse(JSON.stringify(value))
const item = (id = 'one', slug = '20x20-pole-tent') => ({ id, slug, name: '20x20 Pole Tent', cost: 350, category: { name: 'Tents' } })
const success = rows => ({ ok: true, json: async () => rows })
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

function setup(fetchImpl = async () => success([])) {
  let now = 0, counter = 0
  const pending = new Map(), states = []
  const module = { exports: {} }
  const schedule = (fn, ms = 0) => { const id = ++counter; pending.set(id, { at: now + ms, fn }); return id }
  vm.runInNewContext(code, {
    module, exports: module.exports, AbortController, encodeURIComponent,
    fetch: fetchImpl, setTimeout: schedule, clearTimeout: id => pending.delete(id),
  })
  async function tick(ms = 0) {
    const until = now + ms
    while (true) {
      const entry = [...pending.entries()].filter(([, task]) => task.at <= until).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0]
      if (!entry) break
      now = entry[1].at
      pending.delete(entry[0])
      entry[1].fn()
      await new Promise(setImmediate)
    }
    now = until
    await new Promise(setImmediate)
  }
  return { ...module.exports, tick, states, publish: state => states.push(plain(state)), pending }
}

test('short and blank searches stay idle and never hit the API', async () => {
  let calls = 0
  const s = setup(async () => { calls++; return success([]) })
  for (const query of ['', ' ', 'x']) s.startRentalSearch(query, s.publish)
  await s.tick(30_000)
  assert.equal(calls, 0)
  assert.ok(s.states.every(state => state.status === 'idle'))
})

test('search is debounced and query is encoded in a same-origin GET', async () => {
  const calls = []
  const s = setup(async (...args) => { calls.push(args); return success([item()]) })
  s.startRentalSearch(' tents & chairs ', s.publish)
  assert.equal(s.states.at(-1).status, 'loading')
  await s.tick(249); assert.equal(calls.length, 0)
  await s.tick(1)
  assert.equal(calls[0][0], '/api/items?search=tents%20%26%20chairs')
  assert.equal(calls[0][1].cache, 'no-store')
  assert.equal(s.states.at(-1).status, 'success')
})

test('array and items-envelope responses both load valid catalog data', () => {
  const s = setup()
  assert.deepEqual(plain(s.parseRentalSearchResponse([item()])), plain(s.parseRentalSearchResponse({ items: [item()] })))
  assert.equal(s.parseRentalSearchResponse([item()])[0].cost, 350)
})

test('HTTP failure is an explicit error, not successful empty results', async () => {
  const s = setup(async () => ({ ok: false, json: async () => { throw new Error('must not read') } }))
  s.startRentalSearch('tent', s.publish); await s.tick(250)
  assert.equal(s.states.at(-1).status, 'error')
  assert.equal(s.states.at(-1).error, s.RENTAL_SEARCH_ERROR)
  assert.ok(!s.states.some(state => state.status === 'success'))
})

test('network failure gets the same recoverable error state', async () => {
  const s = setup(async () => { throw new Error('offline'); })
  s.startRentalSearch('tent', s.publish); await s.tick(250)
  assert.equal(s.states.at(-1).status, 'error')
})

test('malformed JSON is not displayed as no rentals found', async () => {
  const s = setup(async () => ({ ok: true, json: async () => { throw new Error('bad json') } }))
  s.startRentalSearch('tent', s.publish); await s.tick(250)
  assert.equal(s.states.at(-1).status, 'error')
})

test('unexpected API shape and malformed item records are rejected', () => {
  const s = setup()
  for (const payload of [null, {}, { error: 'broken' }, { items: null }, { items: {} }, [null], [{ id: 'x', name: null }]]) {
    assert.throws(() => s.parseRentalSearchResponse(payload), /Invalid rental search/)
  }
})

test('a genuine empty result is successful and not an error', async () => {
  const s = setup()
  s.startRentalSearch('tent', s.publish); await s.tick(250)
  assert.equal(s.states.at(-1).status, 'success')
  assert.deepEqual(s.states.at(-1).items, [])
  assert.equal(s.states.at(-1).error, null)
})

test('disposing before debounce prevents the fetch', async () => {
  let calls = 0
  const s = setup(async () => { calls++; return success([]) })
  const stop = s.startRentalSearch('tent', s.publish)
  stop(); await s.tick(500)
  assert.equal(calls, 0)
  assert.equal(s.states.length, 1)
})

test('disposing in flight aborts and blocks late success even when fetch ignores abort', async () => {
  const wait = deferred(); let signal
  const s = setup(async (_url, options) => { signal = options.signal; return wait.promise })
  const stop = s.startRentalSearch('old', s.publish); await s.tick(250)
  stop(); assert.equal(signal.aborted, true)
  wait.resolve(success([item()])); await s.tick()
  assert.equal(s.states.length, 1)
})

test('an obsolete request cannot clear the new request loading state', async () => {
  const old = deferred(), current = deferred()
  const s = setup(url => url.includes('old') ? old.promise : current.promise)
  const stop = s.startRentalSearch('old', s.publish); await s.tick(250)
  stop()
  s.startRentalSearch('new', s.publish); await s.tick(250)
  old.reject(new Error('aborted')); await s.tick()
  assert.equal(s.states.at(-1).query, 'new')
  assert.equal(s.states.at(-1).status, 'loading')
  current.resolve(success([item('new', 'new-tent')])); await s.tick()
  assert.equal(s.states.at(-1).items[0].slug, 'new-tent')
})

test('late responses cannot replace newer successful matches', async () => {
  const old = deferred()
  const s = setup(url => url.includes('old') ? old.promise : Promise.resolve(success([item('new', 'new-tent')])))
  const stop = s.startRentalSearch('old', s.publish); await s.tick(250)
  stop(); s.startRentalSearch('new', s.publish); await s.tick(250)
  old.resolve(success([item('old', 'old-tent')])); await s.tick()
  assert.equal(s.states.at(-1).query, 'new')
  assert.equal(s.states.at(-1).items[0].id, 'new')
})

test('timeout aborts a hung request and ignores later resolution', async () => {
  const wait = deferred(); let signal
  const s = setup((_url, options) => { signal = options.signal; return wait.promise })
  s.startRentalSearch('tent', s.publish, { timeoutMs: 1_000 })
  await s.tick(250); await s.tick(999)
  assert.equal(s.states.at(-1).status, 'loading')
  await s.tick(1)
  assert.equal(signal.aborted, true)
  assert.equal(s.states.at(-1).status, 'error')
  wait.resolve(success([item()])); await s.tick()
  assert.equal(s.states.at(-1).status, 'error')
})

test('successful completion cancels the timeout', async () => {
  const s = setup(async () => success([item()]))
  s.startRentalSearch('tent', s.publish); await s.tick(250); await s.tick(20_000)
  assert.equal(s.states.length, 2)
  assert.equal(s.states.at(-1).status, 'success')
  assert.equal(s.pending.size, 0)
})

test('retry of the same query can recover from failure', async () => {
  let call = 0
  const s = setup(async () => { if (++call === 1) throw new Error('offline'); return success([item()]) })
  s.startRentalSearch('tent', s.publish); await s.tick(250)
  assert.equal(s.states.at(-1).status, 'error')
  s.startRentalSearch('tent', s.publish); await s.tick(250)
  assert.equal(s.states.at(-1).status, 'success')
})

test('null, blank, traversal and encoded slugs never become dead result links', () => {
  const s = setup()
  const bad = [null, undefined, '', '.', '..', 'null', 'undefined', 'a/b', 'a?x', 'a#x', '//host', 'a\\b', ' a', 'a b', '%2e%2e', '%2Fadmin']
  for (const slug of bad) {
    assert.equal(s.parseRentalSearchResponse([{ ...item(), slug }]).length, 0, String(slug))
    assert.throws(() => s.rentalItemHref({ slug }), /Invalid rental item slug/)
  }
})

test('result URLs stay on the local item route and preserve supported slugs', () => {
  const s = setup()
  assert.equal(s.rentalItemHref(item()), '/items/20x20-pole-tent')
  assert.equal(s.rentalItemHref({ slug: 'caf\u00e9-table' }), '/items/caf%C3%A9-table')
})

test('duplicate ids/slugs are removed and results are capped at eight', () => {
  const s = setup()
  const rows = [item(), item(), item('dup-slug')].concat(Array.from({ length: 12 }, (_, i) => item(String(i), 'tent-' + i)))
  const list = s.parseRentalSearchResponse(rows)
  assert.equal(list.length, 8)
  assert.equal(new Set(list.map(row => row.id)).size, 8)
  assert.equal(new Set(list.map(row => row.slug)).size, 8)
})

test('invalid prices cannot crash formatting or become fabricated values', () => {
  const s = setup()
  for (const cost of [null, undefined, '350', NaN, Infinity, -1, {}, true]) {
    assert.equal(s.parseRentalSearchResponse([{ ...item(), cost }])[0].cost, null)
  }
  assert.equal(s.parseRentalSearchResponse([{ ...item(), cost: 0 }])[0].cost, 0)
  assert.equal(s.parseRentalSearchResponse([{ ...item(), cost: 12.5 }])[0].cost, 12.5)
})

test('missing category metadata does not crash search', () => {
  const s = setup()
  for (const category of [null, undefined, 'Tents', { name: null }, { name: 2 }]) {
    assert.equal(s.parseRentalSearchResponse([{ ...item(), category }])[0].category, null)
  }
})

test('query changes hide prior matches before an effect can run', () => {
  const s = setup()
  const prior = { query: 'old', status: 'success', items: [item()], error: null }
  assert.equal(s.visibleRentalSearchState('new', true, prior).status, 'loading')
  assert.equal(s.visibleRentalSearchState('new', true, prior).items.length, 0)
  assert.equal(s.visibleRentalSearchState('', true, prior).status, 'idle')
  assert.equal(s.visibleRentalSearchState('old', false, prior).status, 'idle')
  assert.equal(s.visibleRentalSearchState('old', true, prior), prior)
})

test('both components use the shared search hook and separate empty/error UI', () => {
  for (const name of ['MobileHeader', 'HeaderSearch']) {
    const content = fs.readFileSync(path.join(__dirname, '../components/public/' + name + '.tsx'), 'utf8')
    assert.match(content, /useRentalSearch/)
    assert.match(content, /search.status === 'error'/)
    assert.match(content, /search.status === 'success'/)
    assert.match(content, /search\.retry/)
    assert.doesNotMatch(content, /href=\{[^}]*: '#'/)
    assert.doesNotMatch(content, /finally.*setLoading/)
    const compiled = ts.transpileModule(content, { reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } })
    assert.equal((compiled.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0)
  }
})

test('mobile panel is a single named native dialog and retains approved logo markup', () => {
  const mobile = fs.readFileSync(path.join(__dirname, '../components/public/MobileHeader.tsx'), 'utf8')
  assert.match(mobile, /useState<'menu' \| 'search' \| null>/)
  assert.match(mobile, /<dialog/)
  assert.match(mobile, /openNycMobileModal/)
  assert.match(mobile, /aria-modal="true"/)
  assert.match(mobile, /aria-label="Search rental items"/)
  assert.match(mobile, /src=\{LOGO_URL\} alt=\{NYC_LOGO_ALT\} width=\{NYC_LOGO_WIDTH\} height=\{NYC_LOGO_HEIGHT\} className="block w-full max-w-\[200px\] h-auto"/)
})
