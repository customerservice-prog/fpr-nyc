const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

function setup(options = {}) {
  const sends = []
  const code = ts.transpileModule(
    fs.readFileSync('app/api/admin/email-delivery/smoke-test/route.ts', 'utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}},
  ).outputText
  const module = { exports: {} }
  const dependencies = {
    'next/server': {NextResponse:{json:(body,options={})=>({body,status:options.status||200})}},
    'next-auth': {getServerSession:async()=>options.role==='none'?null:{user:{role:options.role||'admin'}}},
    '@/lib/auth': {authOptions:{}},
    '@/lib/nycEmail':{
      NYC_EMAIL_ADDRESS:'friendlypartyrentalnyc@gmail.com',
      NYC_NOTIFICATION_EMAIL:'customerservice@friendlypartyrental.com',
    },
    '@/lib/email': {sendEmail:async payload=>{
      sends.push(payload)
      return {success:true,provider:'resend',providerId:'test-unique-id',simulated:false}
    }},
    '@/lib/confirmNycPageAdminPassword': {confirmNycPageAdminPassword:async(_,password)=>password==='valid-admin-password'},
  }
  vm.runInNewContext(code,{
    module,exports:module.exports,require:id=>{
      if (!(id in dependencies)) throw Error('Unexpected import '+id)
      return dependencies[id]
    },
    Date,URL,process:{env:{NODE_ENV:'production',RESEND_API_KEY:options.hasResend===false?'':'configured',RESEND_FROM:'configured'}},console,
  })
  function request(data,origin='https://friendlypartyrentalnyc.com') {
    return {
      headers:{get:key=>key==='origin'?origin:key==='content-type'?'application/json':null},
      nextUrl:{hostname:'friendlypartyrentalnyc.com'},
      json:async()=>data,
    }
  }
  return {POST:module.exports.POST,request,sends}
}

test('internal NYC email test is admin only, same origin and password protected',async()=>{
  const unauthorized=setup({role:'staff'})
  assert.equal((await unauthorized.POST(unauthorized.request({confirm:true,adminPassword:'valid-admin-password'}))).status,403)
  assert.equal(unauthorized.sends.length,0)
  const ctx=setup()
  assert.equal((await ctx.POST(ctx.request({confirm:true,adminPassword:'valid-admin-password'},'https://untrusted.example'))).status,403)
  assert.equal((await ctx.POST(ctx.request({confirm:false,adminPassword:'valid-admin-password'}))).status,400)
  assert.equal((await ctx.POST(ctx.request({confirm:true,adminPassword:'wrong'}))).status,403)
  assert.equal(ctx.sends.length,0)
})

test('the only recipient is the owned central office and the response never asserts delivery',async()=>{
  const ctx=setup()
  const response=await ctx.POST(ctx.request({confirm:true,adminPassword:'valid-admin-password',
    to:'outside@example.com',subject:'malicious',html:'override'}))
  assert.equal(response.status,200)
  assert.equal(response.body.accepted,true)
  assert.equal(response.body.delivered,false)
  assert.equal(ctx.sends.length,1)
  assert.equal(ctx.sends[0].to,'customerservice@friendlypartyrental.com')
  assert.equal(ctx.sends[0].replyTo,'friendlypartyrentalnyc@gmail.com')
  assert.equal(ctx.sends[0].subject.includes('malicious'),false)
  assert.equal(ctx.sends[0].idempotencyKey.startsWith('nyc-office-email-smoke-'),true)
})

test('no Resend configuration fails closed rather than triggering SMTP',async()=>{
  const ctx=setup({hasResend:false})
  const response=await ctx.POST(ctx.request({confirm:true,adminPassword:'valid-admin-password'}))
  assert.equal(response.status,503)
  assert.equal(ctx.sends.length,0)
})

test('NYC email setup integrates an explicit test button and delivery audit',()=>{
  const ui=fs.readFileSync('app/admin/settings/email-delivery/page.tsx','utf8')
  const button=fs.readFileSync('components/admin/NycOfficeEmailSmokeTest.tsx','utf8')
  assert.match(ui,/NycOfficeEmailSmokeTest/)
  assert.match(ui,/email-delivery\/audit/)
  assert.match(button,/window\.confirm/)
  assert.match(button,/adminPassword: password/)
  assert.match(button,/Send internal test to NYC office/)
})
