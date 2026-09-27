const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')

const read=p=>fs.readFileSync(p,'utf8')

test('Riverdale public business hours are consistent across shared data and structured data',()=>{
  const utils=read('lib/utils.ts')
  const header=read('components/public/Header.tsx')
  const layout=read('app/layout.tsx')
  assert.match(utils,/hours: 'Mon–Sat: 9am–6pm'/)
  assert.match(header,/BUSINESS\.hours/)
  assert.match(layout,/OpeningHoursSpecification/)
  assert.match(layout,/opens: '09:00'/)
  assert.match(layout,/closes: '18:00'/)
})

test('Riverdale uses the verified shared YouTube channel and does not publish an unverified Yelp profile',()=>{
  const utils=read('lib/utils.ts')
  const header=read('components/public/Header.tsx')
  const footer=read('components/public/Footer.tsx')
  assert.match(utils,/youtube: 'https:\/\/www\.youtube\.com\/@friendlypartyrental1005'/)
  assert.match(utils,/yelp: ''/)
  assert.match(header,/BUSINESS\.yelp &&/)
  assert.match(footer,/BUSINESS\.yelp &&/)
  assert.doesNotMatch(utils,/youtube\.com\/channel\/friendlypartyrental/)
  assert.doesNotMatch(utils,/yelp\.com\/biz\/friendly-party-rental/)
})
