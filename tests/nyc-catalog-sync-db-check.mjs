// CI check against a real (disposable) Postgres after the Railway pre-deploy scripts
// ran against the mock Syracuse API: node tests/nyc-catalog-sync-db-check.mjs [--snapshot file] [--compare file]
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { PrismaClient } from '@prisma/client'
import { cleanNycPrice, isPackageItem, localizeNycCatalogText, wrongMarketTerms } from '../lib/nycCatalogCore.mjs'
import { syracuseItems } from './fixtures/syracuse-catalog-sample.mjs'

const prisma = new PrismaClient()
const ORIGIN = 'http://127.0.0.1:4010'
const snapshotPath = process.argv.includes('--snapshot') ? process.argv[process.argv.indexOf('--snapshot') + 1] : null
const comparePath = process.argv.includes('--compare') ? process.argv[process.argv.indexOf('--compare') + 1] : null

try {
  const rows = await prisma.item.findMany({ include: { category: true } })
  const bySlug = new Map(rows.map((row) => [row.slug, row]))
  const idToSlug = new Map(rows.map((row) => [row.id, row.slug]))
  const syracuseIdToSlug = new Map(syracuseItems.map((row) => [row.id, row.slug]))
  for (const source of syracuseItems) {
    const row = bySlug.get(source.slug)
    assert.ok(row, 'missing ' + source.slug)
    const price = isPackageItem(source) ? source.cost : cleanNycPrice(Math.round(source.cost * 170) / 100)
    assert.equal(row.quantity, source.quantity, source.slug + ' quantity')
    assert.equal(row.cost, price, source.slug + ' price')
    assert.equal(row.name, source.name, source.slug + ' name')
    assert.equal(row.category.slug, source.category.slug, source.slug + ' category')
    assert.equal(row.status, source.status, source.slug + ' status')
    assert.equal(row.attendants, null, source.slug + ' attendants')
    assert.deepEqual(row.colorOptions, source.colorOptions, source.slug + ' colors')
    assert.equal(row.description || '', localizeNycCatalogText(source.description, { price }), source.slug + ' description')
    assert.deepEqual(wrongMarketTerms(row.description || ''), [], source.slug + ' wording')
    const hasPhoto = source.slug !== 'sugar-and-creamer-set'
    assert.equal(row.displayToCustomer, hasPhoto, source.slug + ' published')
    assert.equal(row.picture, hasPhoto ? ORIGIN + '/api/item-image/' + source.slug : null, source.slug + ' photo')
    assert.deepEqual(row.additionalImages, source.slug === '30-x-60-pole-tent' ? [ORIGIN + '/api/item-image/30-x-60-pole-tent?index=0'] : [], source.slug + ' additional photos')
    assert.deepEqual(row.suggestedAddonIds.map((id) => idToSlug.get(id)), source.suggestedAddonIds.map((id) => syracuseIdToSlug.get(id)), source.slug + ' add-ons')
  }
  const syracuseSlugs = new Set(syracuseItems.map((row) => row.slug))
  const extraPublic = rows.filter((row) => row.displayToCustomer && !syracuseSlugs.has(row.slug)).map((row) => row.slug)
  assert.deepEqual(extraPublic, [], 'only mirrored Syracuse items are public')
  const rule = await prisma.depositRule.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'desc' } })
  assert.equal(rule?.type, 'percentage')
  assert.equal(Number(rule?.amount), 25)
  const stamps = Object.fromEntries(rows.map((row) => [row.slug, row.updatedAt.toISOString()]))
  if (snapshotPath) fs.writeFileSync(snapshotPath, JSON.stringify(stamps))
  if (comparePath) {
    const before = JSON.parse(fs.readFileSync(comparePath, 'utf8'))
    const changed = Object.keys(stamps).filter((slug) => before[slug] !== stamps[slug])
    assert.deepEqual(changed, [], 'a repeated pre-deploy run must not rewrite any item')
  }
  console.log('NYC catalog DB check passed: ' + syracuseItems.length + ' mirrored items, ' + rows.filter((row) => row.displayToCustomer).length + ' public')
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await prisma.$disconnect()
}
