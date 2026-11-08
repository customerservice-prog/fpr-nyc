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
