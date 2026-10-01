const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const read = file => fs.readFileSync(file, 'utf8')

test('NYC website editor uses the Syracuse-style builder workspace', () => {
  const page = read('app/admin/website/page.tsx')
  const builder = read('components/admin/NycWebsiteBuilder.tsx')
  assert.match(page, /NycWebsiteBuilder/)
  for (const marker of [
    'Website Builder',
    'Homepage',
    'Revision #',
    'History',
    'All pages',
    'Live site',
    'Discard draft / Reload live',
    'Restore original live design',
    'Matches live version',
    'Publish Live',
    'Desktop',
    'Tablet',
    'Mobile',
    'Add section',
    'Zoom',
  ]) assert.ok(builder.includes(marker), 'missing builder parity marker: ' + marker)
  assert.ok(!builder.includes('Mobile preview · desktop editing coming soon'))
})

test('NYC website builder previews the real NYC storefront instead of Syracuse copy', () => {
  const builder = read('components/admin/NycWebsiteBuilder.tsx')
  assert.match(builder, /ResponsiveHome/)
  assert.match(builder, /NycHomeSeo/)
  assert.match(builder, /Header/)
  assert.match(builder, /Footer/)
  assert.doesNotMatch(builder, /Party Rentals Made Easy in Syracuse|330 Costello Parkway|Serving Syracuse/)
})

test('NYC website builder keeps edits private until explicit publication', () => {
  const builder = read('components/admin/NycWebsiteBuilder.tsx')
  assert.match(builder, /Private draft saved · live unchanged/)
  assert.match(builder, /Publish this private homepage draft to the live NYC website/)
  assert.match(builder, /Discard the private NYC homepage draft/)
})
