const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

const read = (file) => fs.readFileSync(file, 'utf8')

test('NYC admin mirrors the Syracuse dashboard structure', () => {
  const page = read('app/admin/page.tsx')
  for (const text of ['All tools', 'Job type', 'Tip Performance', 'Best Sellers (Last 60 Days)', 'Control Panel Colors', '<MediaPanel />']) {
    assert.ok(page.includes(text), 'missing dashboard parity marker: ' + text)
  }
  assert.ok(page.includes('Tips → Open Tip Report'))
})

test('NYC uses the Syracuse interview and video meeting center, not the old media panel', () => {
  const panel = read('components/admin/MediaPanel.tsx')
  for (const text of ['Interview & Video Meeting Center', 'Your meetings, managed here', '+ New interview', 'Connection settings', 'Refresh meetings']) {
    assert.ok(panel.includes(text), 'missing meeting-center marker: ' + text)
  }
  assert.ok(!panel.includes('Paste a YouTube link below to watch a video here'))
  assert.ok(!panel.includes('Paste a YouTube link or video ID'))
})

test('Google Calendar and Meet management routes stay installed', () => {
  for (const file of [
    'app/api/admin/google-calendar/status/route.ts',
    'app/api/admin/google-calendar/connect/route.ts',
    'app/api/admin/google-calendar/callback/route.ts',
    'app/api/admin/google-calendar/disconnect/route.ts',
    'app/api/admin/google-calendar/events/route.ts',
    'app/api/admin/google-calendar/events/[id]/route.ts',
    'lib/googleCalendar.ts',
    'lib/meetingTime.ts',
  ]) assert.ok(fs.existsSync(file), 'missing Google meeting route: ' + file)
})

test('NYC desktop admin navigation keeps the Syracuse proportions and approved NYC logo', () => {
  const nav = read('components/admin/AdminNav.tsx')
  assert.ok(nav.includes('NYC_LOGO_PATH'))
  assert.ok(nav.includes('hidden lg:flex min-w-0 flex-1 items-center justify-around'))
  assert.ok(!nav.includes("label: 'Planning'"))
})
