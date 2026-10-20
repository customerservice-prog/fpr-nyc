const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const read = file => fs.readFileSync(file, 'utf8')

test('NYC website editor uses Website Studio V3', () => {
  const page = read('app/admin/website/page.tsx')
  const editor = read('components/admin/WebsiteEditorV3.tsx')
  assert.match(page, /WebsiteEditorV3/)
  assert.match(page, /Friendly Party Rental NYC \/ Riverdale Website Studio V3/)
  for (const marker of [
    'Website pages',
    'Image library',
    'Inventory',
    'Categories',
    'Wedding packages',
    'desktop',
    'tablet',
    'mobile',
    'publish',
    'revision',
  ]) assert.ok(editor.toLowerCase().includes(marker.toLowerCase()), 'missing Website Studio V3 marker: ' + marker)
})

test('NYC Website Studio V3 edits the real NYC storefront', () => {
  const editor = read('components/admin/WebsiteEditorV3.tsx')
  assert.match(editor, /ResponsiveHome/)
  assert.match(editor, /Header/)
  assert.match(editor, /Footer/)
  assert.match(editor, /WebsitePageStudio/)
  assert.doesNotMatch(editor, /Party Rentals Made Easy in Syracuse|330 Costello Parkway|Serving Syracuse/)
})

test('NYC Website Studio keeps draft, publish and revision workflows', () => {
  const editor = read('components/admin/WebsiteEditorV3.tsx')
  assert.match(editor, /createDraftSaveQueue/)
  assert.match(editor, /\/api\/admin\/website\/home\/publish/)
  assert.match(editor, /\/api\/admin\/website\/home\/restore/)
  assert.match(editor, /\/api\/admin\/website\/home\/revisions/)
  assert.match(editor, /expectedUpdatedAt/)
})

test('NYC Website Studio supports all three responsive preview sizes', () => {
  const editor = read('components/admin/WebsiteEditorV3.tsx')
  assert.match(editor, /type Device = 'mobile' \| 'tablet' \| 'desktop'/)
  assert.match(editor, /deviceWidth/)
  assert.match(editor, /suggestedZoom/)
  assert.match(editor, /ResponsiveHome/)
})
