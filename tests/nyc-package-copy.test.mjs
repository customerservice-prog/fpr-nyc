import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { nycPackageDescription, NYC_PACKAGE_SERVICE_DISCLOSURE, NYC_PACKAGE_BASE_INFLATABLES } from '../lib/nycPackageCopy.mjs'

// The 17 published NYC package descriptions captured before the owner-approved
// price change. Price localization runs before this presentation-only helper.
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/nyc-package-copy.json', import.meta.url), 'utf8'))
const dollars = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const headerDollars = n => '$' + n.toLocaleString('en-US')

for (const fixture of fixtures) {
  test('consistent package service copy preserves scope and localized price: ' + fixture.slug, () => {
    const localized = fixture.description.replaceAll(dollars(fixture.sourcePrice), dollars(fixture.approvedPrice))
      .replaceAll(headerDollars(fixture.sourcePrice), headerDollars(fixture.approvedPrice))
    const result = nycPackageDescription(fixture.slug, localized)
    assert.ok(result.endsWith(NYC_PACKAGE_SERVICE_DISCLOSURE))
    assert.equal(result.split(NYC_PACKAGE_SERVICE_DISCLOSURE).length, 2)
    assert.doesNotMatch(result, /Delivery, setup, and pickup included|delivered, set up, and picked up for you/i)
    assert.equal(nycPackageDescription(fixture.slug, result), result, 'repeated syncs do not append duplicate notices')
    assert.equal(nycPackageDescription(fixture.slug.replace(/-syracuse-ny$/, ''), localized), result, 'public and stored slugs agree')
    // Equipment dimensions and quantities are not rewritten by fee/model copy.
    const measurements = localized.match(/\b\d+(?:′|')?\s*[x×]\s*\d+(?:′|')?/g) || []
    for (const measurement of measurements) assert.ok(result.includes(measurement), measurement)
    const counts = localized.match(/\b\d+ (?:tables|chairs|folding tables|white folding chairs|gold Chiavari chairs|premium table linens|Rustic Lantern Table Centerpieces)\b/g) || []
    for (const count of counts) assert.ok(result.includes(count), count)
    if (localized.includes(headerDollars(fixture.approvedPrice))) assert.ok(result.includes(headerDollars(fixture.approvedPrice)))
    for (const marker of ['Please Note:', 'Not Included:', 'attendant service for the photo booth', 'one 6-hour photo booth rental']) {
      if (localized.includes(marker)) assert.ok(result.includes(marker), marker)
    }
  })
}

test('inflatable bundles name the base models and require a separate quote for other models', () => {
  for (const slug of ['bounce-house-package-4-tables-24-chairs', 'kids-birthday-party-package-bounce-house-cotton-candy-tables-chairs']) {
    const fixture = fixtures.find(item => item.slug === slug)
    const copy = nycPackageDescription(slug, fixture.description)
    assert.match(copy, /(?:one|1) Rainbow Castle Bounce House/)
    assert.doesNotMatch(copy, /standalone rental rate/)
    assert.doesNotMatch(copy, /Tidal Wave|Choose your favorite|automatic|select an upgrade/i)
    assert.match(copy, /Other models require a custom quote; any premium-model price difference is confirmed/)
  }
  const combo = nycPackageDescription('bounce-house-water-slide-combo-package', fixtures.find(item => item.slug === 'bounce-house-water-slide-combo-package').description)
  assert.match(combo, /one Rainbow Castle Bounce House and one Tidal Wave Inflatable Water Slide/)
  assert.match(combo, /named base models only: Rainbow Castle Bounce House and Tidal Wave Inflatable Water Slide/)
  assert.doesNotMatch(combo, /standalone rental rate/)
  assert.doesNotMatch(combo, /Choose your favorite/)
  const splash = nycPackageDescription('summer-splash-package-waterslide-tables-chairs', fixtures.find(item => item.slug.startsWith('summer-splash')).description)
  assert.match(splash, /1 Tidal Wave Inflatable Water Slide, 4 tables, and 24 chairs/)
  assert.doesNotMatch(splash, /standalone rental rate/)
  assert.doesNotMatch(splash, /Rainbow Castle/)
  assert.equal(NYC_PACKAGE_BASE_INFLATABLES.bounceHouse.standalonePrice, 340)
  assert.equal(NYC_PACKAGE_BASE_INFLATABLES.waterSlide.standalonePrice, 425)
})

test('wedding scope stays specific and the pop-up is not described as a pole tent', () => {
  const backyard = nycPackageDescription('wedding-package-backyard-elopement', fixtures.find(item => item.slug === 'wedding-package-backyard-elopement').description)
  assert.match(backyard, /10x20 EZ pop-up tent/)
  assert.match(backyard, /up to 4 folding tables, up to 30 white folding chairs, white table linens/)
  const garden = nycPackageDescription('wedding-package-garden-reception', fixtures.find(item => item.slug === 'wedding-package-garden-reception').description)
  assert.match(garden, /Eight 5′ Round Banquet Tables/)
  assert.match(garden, /Eighty Gold Chiavari Chairs/)
  assert.match(garden, /Not Included:[\s\S]*dance floor/)
  const classic = nycPackageDescription('wedding-package-classic-ceremony', fixtures.find(item => item.slug === 'wedding-package-classic-ceremony').description)
  assert.match(classic, /white table linens, and basic centerpiece accents/)
  assert.match(classic, /The linen sizes and basic centerpiece accents are confirmed in your final package quote\./)
  assert.match(classic, /Upgraded linens or décor beyond the listed package require a separate quote\./)
  assert.doesNotMatch(garden, /The linen sizes and basic centerpiece accents/)
})

test('non-package copy and missing descriptions are left alone', () => {
  const ordinary = 'A chair rental. Delivery, setup, and pickup included.'
  assert.equal(nycPackageDescription('white-resin-folding-chair', ordinary), ordinary)
  assert.equal(nycPackageDescription('unknown-new-package', ordinary), ordinary)
  assert.equal(nycPackageDescription('wedding-package-garden-reception', null), null)
  assert.equal(nycPackageDescription('wedding-package-garden-reception', ''), null)
})
