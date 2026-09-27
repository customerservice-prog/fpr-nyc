const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

function read(path){ return fs.readFileSync(path,'utf8') }

test('NYC checkout and admin orders default to New York', () => {
  const draft = read('app/api/checkout/draft/route.ts')
  const admin = read('app/admin/orders/new/page.tsx')
  const orders = read('app/api/orders/route.ts')
  assert.doesNotMatch(draft, /eventState[^\n]*\|\|\s*['"]SC['"]/)
  assert.doesNotMatch(admin, /(?:billingState|eventState):\s*['"]SC['"]/)
  assert.doesNotMatch(admin, /c\.state\s*\|\|\s*['"]SC['"]/)
  assert.doesNotMatch(orders, /Greenville's public delivery-only policy/)
  assert.match(draft, /eventState[^\n]*\|\|\s*['"]NY['"]/)
})

test('NYC staff email settings do not claim a Greenville banner', () => {
  const page = read('app/admin/settings/email-delivery/page.tsx')
  assert.doesNotMatch(page, /SOUTH CAROLINA|GREENVILLE/)
  assert.match(page, /NYC \/ DOWNSTATE NEW YORK/)
})

test('NYC app template keeps paid ads unconfigured', () => {
  const env = read('.env.example')
  assert.doesNotMatch(env, /NEXT_PUBLIC_NYC_GOOGLE_ADS_/)
})

test('NYC active source does not contain the SC public domain or phone', () => {
  const roots = ['app','components','lib','prisma']
  const banned = [/friendlypartyrentalsc\.com/i, /864[-. ]?610[-. ]?5324/]
  const stack = roots.filter(fs.existsSync)
  while(stack.length){
    const p = stack.pop()
    const stat = fs.statSync(p)
    if(stat.isDirectory()){
      for(const name of fs.readdirSync(p)) stack.push(p+'/'+name)
      continue
    }
    if(!/\.(?:ts|tsx|js|mjs|cjs|json)$/.test(p)) continue
    const content = fs.readFileSync(p,'utf8')
    for(const pattern of banned) assert.doesNotMatch(content, pattern, p+' contains active South Carolina location residue')
  }
})
