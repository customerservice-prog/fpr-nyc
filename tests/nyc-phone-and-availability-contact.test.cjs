const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const directories = ['app', 'components', 'lib']
function sourceFiles(dir) {
  if (!fs.existsSync(dir)) return []
  return fs.readdirSync(dir, {withFileTypes:true}).flatMap(item=>{
    const p = path.join(dir,item.name)
    if (item.isDirectory()) return sourceFiles(p)
    return /\.(tsx?|jsx?|mjs)$/.test(item.name) ? [p] : []
  })
}

test('NYC code contains no old Riverdale telephone number in customer-facing or operational sources', () => {
  const oldPhone = /718[()\s.\-]*283[()\s.\-]*4593|7182834593/g
  const matches = []
  for (const p of directories.flatMap(sourceFiles)) {
    const c = fs.readFileSync(p,'utf8')
    const lines = c.split('\n')
    for (let i=0;i<lines.length;i++){
      if (oldPhone.test(lines[i])) matches.push(p+':'+(i+1))
      oldPhone.lastIndex=0
    }
  }
  assert.deepEqual(matches,[], 'Old NYC telephone number is still in '+matches.join(', '))
})

test('NYC public rental cards offer call and contact instead of misleading unavailable carts', () => {
  const src=fs.readFileSync('components/public/ItemCard.tsx','utf8')
  assert.match(src,/import \{ BUSINESS, formatCurrency \}/)
  assert.match(src,/Call NYC to Confirm/)
  assert.match(src,/Send a Rental Inquiry/)
  assert.match(src,/href="\/contact_us"/)
  assert.match(src,/BUSINESS\.phone\.replace\(\/\[\^0-9\]\/g/)
  assert.match(src,/available>0\?<button/)
  assert.match(src,/available>0&&colorOptions\.length>0/)
  assert.doesNotMatch(src,/Out of stock|718-283-4593/)
})
