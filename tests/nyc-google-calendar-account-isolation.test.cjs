const test = require('node:test')
const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')

test('NYC OAuth defaults to a NYC-specific mailbox and does not force Syracuse Workspace', () => {
  const src = readFileSync('lib/googleCalendar.ts', 'utf8')
  assert.match(src, /NYC_EMAIL_ADDRESS/)
  assert.match(src, /NYC_GOOGLE_CALENDAR_EMAIL/)
  assert.match(src, /login_hint', BUSINESS_GOOGLE_EMAIL/)
  assert.match(src, /connectedEmail !== BUSINESS_GOOGLE_EMAIL/)
  assert.doesNotMatch(src, /BUSINESS_GOOGLE_EMAIL = 'customerservice@friendlypartyrental\.com'/)
  assert.doesNotMatch(src, /searchParams\.set\('hd', 'friendlypartyrental\.com'\)/)
})

test('NYC calendar configuration does not alter NYC customer email or Syracuse repositories', () => {
  const src = readFileSync('lib/nycEmail.ts', 'utf8')
  assert.match(src, /friendlypartyrentalnyc@gmail\.com/)
  assert.match(src, /NYC_NOTIFICATION_EMAIL/)
})

test('persisted NYC Google Calendar and Search Console tokens require NYC email on every use', () => {
  const src = readFileSync('lib/googleCalendar.ts', 'utf8')
  assert.match(src, /getGoogleCalendarAccessToken\\(\\)[\\s\\S]*?assertNycGoogleAccountEmail\\(connection\\.googleEmail, BUSINESS_GOOGLE_EMAIL\\)/)
  assert.match(src, /getGoogleSearchConsoleAccessToken\\(\\)[\\s\\S]*?assertNycGoogleAccountEmail\\(connection\\.googleEmail, BUSINESS_GOOGLE_EMAIL\\)/)
})

test('NYC Google account identity guard rejects Syracuse, blanks and other accounts', () => {
  const vm = require('node:vm')
  const ts = require('typescript')
  const code = ts.transpileModule(readFileSync('lib/nycGoogleAccountGuard.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText
  const module = { exports: {} }
  vm.runInNewContext(code, { module, exports: module.exports, Error, String })
  const check = module.exports.assertNycGoogleAccountEmail
  assert.doesNotThrow(() => check(' FriendlyPartyRentalNYC@gmail.com ', 'friendlypartyrentalnyc@gmail.com'))
  assert.throws(() => check('customerservice@friendlypartyrental.com', 'friendlypartyrentalnyc@gmail.com'), /does not match/)
  assert.throws(() => check('', 'friendlypartyrentalnyc@gmail.com'), /does not match/)
  assert.throws(() => check(null, 'friendlypartyrentalnyc@gmail.com'), /does not match/)
})
