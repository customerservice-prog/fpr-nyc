const test=require('node:test')
const assert=require('node:assert/strict')
const config=require('../next.config.js')

test('Greenville global browser security headers stay enabled and SC-scoped',async()=>{
  assert.equal(typeof config.headers,'function')
  const rules=await config.headers()
  const globalRule=rules.find(rule=>rule.source==='/:path*')
  assert.ok(globalRule,'missing global header rule')
  const headers=Object.fromEntries(globalRule.headers.map(entry=>[entry.key.toLowerCase(),entry.value]))
  const csp=headers['content-security-policy']||''
  assert.match(csp,/default-src/)
  assert.match(csp,/frame-ancestors 'self'/)
  assert.match(csp,/form-action 'self' https:\/\/www\.friendlypartyrentalsc\.com https:\/\/friendlypartyrentalsc\.com/)
  assert.doesNotMatch(csp,/friendlypartyrental\.com(?:\s|;|$)/)
  assert.match(headers['strict-transport-security']||'',/max-age=31536000/)
  assert.equal(headers['x-content-type-options'],'nosniff')
  assert.equal(headers['referrer-policy'],'strict-origin-when-cross-origin')
  assert.equal(headers['x-frame-options'],'SAMEORIGIN')
  assert.equal(headers['cross-origin-opener-policy'],'same-origin-allow-popups')
  for(const source of ['/admin/:path*','/driver/:path*','/checkout/:path*','/pay/:path*']){
    const rule=rules.find(entry=>entry.source===source)
    assert.ok(rule,'missing private noindex rule for '+source)
    const map=Object.fromEntries(rule.headers.map(entry=>[entry.key.toLowerCase(),entry.value]))
    assert.match(map['x-robots-tag']||'',/noindex/)
  }
})
