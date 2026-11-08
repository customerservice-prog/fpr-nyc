const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const read = path => fs.readFileSync(path, 'utf8')

test('NYC does not advertise unverified Syracuse-only social profiles', () => {
  const source = read('lib/utils.ts')
  for (const key of [
    'NEXT_PUBLIC_NYC_FACEBOOK_URL',
    'NEXT_PUBLIC_NYC_INSTAGRAM_URL',
    'NEXT_PUBLIC_NYC_TIKTOK_URL',
    'NEXT_PUBLIC_NYC_X_URL',
  ]) assert.match(source, new RegExp(key))
  assert.match(source, /approvedNycSocialUrl/)
  assert.match(source, /url\.protocol !== 'https:'/)
  assert.match(source, /allowedHosts\.includes\(url\.hostname\.toLowerCase\(\)\)/)
  assert.doesNotMatch(source, /facebook: 'https:\/\/www\.facebook\.com\/friendlypartyrental'/)
  assert.doesNotMatch(source, /instagram: 'https:\/\/www\.instagram\.com\/friendlypartyrental'/)
  assert.doesNotMatch(source, /tiktok: 'https:\/\/www\.tiktok\.com\/@friendlypartyrental'/)
  assert.doesNotMatch(source, /twitter: 'https:\/\/twitter\.com\/friendlypartyrent'/)
  // The previously verified shared YouTube channel remains intentional.
  assert.match(source, /youtube: 'https:\/\/www\.youtube\.com\/@friendlypartyrental1005'/)
})

test('NYC header and footer do not render a blank Facebook icon', () => {
  const header = read('components/public/Header.tsx')
  const footer = read('components/public/Footer.tsx')
  assert.match(header, /\{BUSINESS\.facebook && <a href=\{BUSINESS\.facebook\}/)
  assert.equal((footer.match(/\{BUSINESS\.facebook && <a href=\{BUSINESS\.facebook\}/g) || []).length, 2)
  const layout = read('app/layout.tsx')
  assert.match(layout, /BUSINESS\.facebook/)
  assert.match(layout, /filter\(\(value\): value is string => Boolean\(value\)\)/)
})

test('social settings are explicitly NYC-scoped and optional', () => {
  const example = read('.env.example')
  assert.match(example, /NEXT_PUBLIC_NYC_FACEBOOK_URL=\n/)
  assert.match(example, /NEXT_PUBLIC_NYC_INSTAGRAM_URL=\n/)
  assert.match(example, /NEXT_PUBLIC_NYC_TIKTOK_URL=\n/)
  assert.match(example, /NEXT_PUBLIC_NYC_X_URL=\n/)
})
