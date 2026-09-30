const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

function load(file, cache = new Map()) {
  const absolute = path.resolve(file)
  if (cache.has(absolute)) return cache.get(absolute)
  const module = { exports: {} }
  cache.set(absolute, module.exports)
  const resolve = request => {
    if (request.startsWith('.')) return load(path.resolve(path.dirname(absolute), request + (path.extname(request) ? '' : '.ts')), cache)
    return require(request)
  }
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { module, exports: module.exports, require: resolve, Intl, Date, URL }, { filename: file })
  return module.exports
}
const help = load('lib/nycCustomerHelp.ts')
const areas = load('lib/nycServiceAreas.ts').NYC_SERVICE_AREAS
const read = file => fs.readFileSync(file, 'utf8')

test('FAQ and structured data share one NYC-only source', () => {
  const page = read('app/(public)/frequently_asked_questions/page.tsx')
  assert.match(page, /NYC_FAQ_SECTIONS\.flatMap/)
  assert.match(page, /NYC_FAQ_SECTIONS\.map/)
  assert.match(page, /safeJsonLd\(faqJsonLd\)/)
  assert.ok(help.NYC_FAQ_SECTIONS.length >= 4)
  const ids = help.NYC_FAQ_SECTIONS.map(section => section.id)
  assert.equal(new Set(ids).size, ids.length)
  const questions = help.NYC_FAQ_SECTIONS.flatMap(section => section.items)
  assert.equal(new Set(questions.map(item => item.question)).size, questions.length)
  for (const item of questions) { assert.ok(item.question.trim()); assert.ok(item.answer.trim()) }
})

test('NYC FAQ uses the actual NYC delivery directory, not inherited SC communities', () => {
  const copy = JSON.stringify(help.NYC_FAQ_SECTIONS)
  for (const area of areas) assert.ok(copy.includes(area.name), area.name)
  assert.doesNotMatch(copy, /Greenville|Greer|Simpsonville|Mauldin|Taylors|Easley|Travelers Rest|Fountain Inn|Piedmont/)
  assert.doesNotMatch(copy, /Starting at \$|\$\d|fully insured|Deposits are non-refundable|20-amp|6-8 children|14-16 ft/)
  assert.match(copy, /delivery-only/)
  assert.match(copy, /not a confirmed reservation/)
})

test('contact map identifies Riverdale in the Bronx, never a SC map or fabricated street address', () => {
  const query = new URL(help.NYC_SERVICE_MAP_EMBED_URL).searchParams.get('q')
  assert.equal(query, 'Riverdale, Bronx, New York')
  const contact = read('app/(public)/contact_us/page.tsx')
  assert.match(contact, /src=\{NYC_SERVICE_MAP_EMBED_URL\}/)
  assert.match(contact, /Serving \{BUSINESS\.serviceArea\}/)
  assert.doesNotMatch(contact, /BUSINESS\.address|Riverdale,\+SC/)
  assert.match(contact, /not a customer pickup or showroom address/)
})

test('unconfigured, malformed and unsafe Google profile links are not shown', () => {
  for (const value of [undefined, null, '', ' ', 'True', 'javascript:alert(1)', 'http://google.com/maps', 'https://google.com.attacker.invalid/maps', 'https://user:pass@google.com/maps', '/']) assert.equal(help.nycGoogleProfileHref(value), null, String(value))
  assert.equal(help.nycGoogleProfileHref('https://maps.app.goo.gl/example'), 'https://maps.app.goo.gl/example')
  assert.match(read('app/(public)/contact_us/page.tsx'), /profileHref &&/)
})

test('New York calendar date does not advance at UTC midnight', () => {
  assert.equal(help.nycCalendarDay(new Date('2026-09-30T00:30:00Z')), '2026-09-29')
  assert.equal(help.nycCalendarDay(new Date('2026-09-30T04:00:00Z')), '2026-09-30')
  assert.equal(help.nycCalendarDay(new Date('2027-01-01T03:00:00Z')), '2026-12-31')
  assert.equal(help.nycCalendarDay(new Date('2027-01-01T05:00:00Z')), '2027-01-01')
})

test('New York contact dates handle daylight-saving boundaries', () => {
  for (const instant of ['2026-03-08T06:59:59Z', '2026-03-08T07:00:00Z']) assert.equal(help.nycCalendarDay(new Date(instant)), '2026-03-08')
  for (const instant of ['2026-11-01T05:59:59Z', '2026-11-01T06:00:00Z']) assert.equal(help.nycCalendarDay(new Date(instant)), '2026-11-01')
  const contact = read('app/(public)/contact_us/page.tsx')
  assert.match(contact, /value >= nycCalendarDay\(\)/)
  assert.doesNotMatch(contact, /toISOString\(\)\.slice\(0,10\)/)
})

test('contact success requires explicit database-save confirmation', () => {
  for (const payload of [null, {}, { success: true }, { success: true, saved: false }, { success: true, saved: true }, { success: true, saved: true, notificationSent: 'true' }]) assert.equal(help.nycContactOutcome(200, payload), 'unconfirmed')
  assert.equal(help.nycContactOutcome(200, { success: true, saved: true, notificationSent: true }), 'received')
  assert.equal(help.nycContactOutcome(202, { success: true, saved: true, notificationSent: false }), 'saved-without-email')
  for (const status of [400, 429, 500, 503]) assert.equal(help.nycContactOutcome(status, { success: true, saved: true, notificationSent: true }), 'unconfirmed')
})

test('completed inquiries cannot be accidentally submitted from the same form again', () => {
  const contact = read('app/(public)/contact_us/page.tsx')
  assert.match(contact, /requestInFlight\.current \|\| receipt/)
  assert.match(contact, /receipt \? <div/)
  assert.match(contact, /Start a different inquiry/)
  assert.match(contact, /role="status"/)
  assert.match(contact, /role="alert"/)
  assert.match(contact, /nycEmailHref\(`/)
  assert.doesNotMatch(contact, /result\.emailHref|payload\.emailHref/)
})

test('native accordion answers are server-rendered and disclosure groups have separate names', () => {
  const Accordion = load('components/public/Accordion.tsx').default
  const items = [{ question: 'Where?', answer: 'Riverdale, Bronx.' }, { question: 'How?', answer: 'Contact the NYC team.' }]
  const html = renderToStaticMarkup(React.createElement(React.Fragment, null, React.createElement(Accordion, { items }), React.createElement(Accordion, { items })))
  assert.equal((html.match(/<details /g) || []).length, 4)
  assert.equal((html.match(/<summary /g) || []).length, 4)
  assert.ok(html.includes('Riverdale, Bronx.'))
  const names = [...html.matchAll(/<details[^>]+name="([^"]+)"/g)].map(match => match[1])
  assert.equal(names[0], names[1]); assert.equal(names[2], names[3]); assert.notEqual(names[0], names[2])
  assert.match(html, /focus-visible:outline/)
})
