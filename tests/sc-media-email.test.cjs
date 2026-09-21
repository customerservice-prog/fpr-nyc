const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
function load(file, mocks={}, env={}) {
 const output = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText
 const module={exports:{}}
 vm.runInNewContext(output,{module,exports:module.exports,process:{env},console:{log(){},warn(){},error(){}},Buffer,Date,URL,encodeURIComponent,require(id){if(id in mocks)return mocks[id];throw new Error('Unexpected import '+id)}},{filename:file})
 return module.exports
}
const location=load('lib/scEmail.ts')
const business={email:location.SC_EMAIL_ADDRESS,emailHref:location.scEmailHref(),name:'Friendly Party Rental',legalName:'Friendly Party Rental',phone:'864-610-5324',address:'Greenville, SC'}
const response={json(body,options={}){return {body,status:options.status||200}}}
for(const subject of ['New contact inquiry','New order #QA-TEST','Re: [South Carolina] Inquiry','[South Carolina] Inquiry','[South Carolina] [South Carolina] Inquiry','hello\r\nBcc: invalid']) {
 test('subject tag is safe and idempotent: '+subject,()=>{
  const labeled=location.scEmailSubject(subject)
  assert.ok(labeled.startsWith('[South Carolina] '));assert.ok(!/[\r\n]/.test(labeled));assert.equal(location.scEmailSubject(labeled),labeled)
 })
}
test('email link opens shared inbox with tagged subject and intact encoded body',()=>{
 const url=new URL(location.scEmailHref('Question & date?','An example\nsecond line & text'))
 assert.equal(url.protocol,'mailto:');assert.equal(url.pathname,'customerservice@friendlypartyrental.com')
 assert.equal(url.searchParams.get('subject'),'[South Carolina] Question & date?');assert.equal(url.searchParams.get('body'),'An example\nsecond line & text')
})
for(const html of ['<p>Example notification</p>','<!doctype html><html><head><title>Test</title></head><body><p>Hello</p></body></html>']) {
 test('location banner appears once in HTML '+html.slice(0,20),()=>{
  const branded=location.scEmailHtml(html);assert.equal(location.scEmailHtml(branded),branded);assert.ok(branded.includes('SOUTH CAROLINA'));assert.ok(branded.includes('friendlypartyrentalsc.com'))
  if(html.includes('<body>')) assert.ok(branded.indexOf('data-fpr-location')>branded.indexOf('<body>'))
 })
}
function mailModule(sendMail,env={}) {return load('lib/email.ts',{'nodemailer':{createTransport(){return {sendMail}}},'@/lib/scEmail':location,'@/lib/utils':{BUSINESS:business,formatDateTime:()=>''}},env)}
test('missing SMTP credentials never simulate a sent message',async()=>{
 let sends=0;const mail=mailModule(()=>sends++)
 await assert.rejects(mail.sendEmail({to:business.email,subject:'QA',html:'<p>QA</p>'}),/not configured/)
 assert.equal(sends,0)
})
test('provider failure is propagated instead of returning a false success',async()=>{
 const mail=mailModule(async()=>{throw Error('fake provider outage')},{EMAIL_USER:'sender@example.invalid',EMAIL_PASS:'mock-not-a-secret'})
 await assert.rejects(mail.sendEmail({to:business.email,subject:'QA',html:'<p>QA</p>'}),/could not be delivered/)
})
test('message headers, inbox, sender name and customer Reply-To identify SC',async()=>{
 let message;const mail=mailModule(async payload=>{message=payload;return {accepted:[payload.to],rejected:[],messageId:'qa-mock-only'}},{EMAIL_USER:'sender@example.invalid',EMAIL_PASS:'mock-not-a-secret'})
 const result=await mail.sendEmail({to:'customerservice@friendlypartyrentalsc.com',subject:'New contact inquiry',html:'<p>Test only</p>',replyTo:'customer@example.invalid'})
 assert.equal(result.success,true);assert.equal(result.simulated,false)
 assert.equal(message.to,business.email);assert.equal(message.replyTo,'customer@example.invalid');assert.equal(message.from.name,'Friendly Party Rental - South Carolina');assert.equal(message.from.address,'sender@example.invalid')
 assert.equal(message.subject,'[South Carolina] New contact inquiry');assert.equal(message.headers['X-FPR-Location'],'greenville-sc');assert.ok(message.html.includes('data-fpr-location'));assert.ok(message.text.startsWith('SOUTH CAROLINA'))
 fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/sc-email-preview.html',message.html);fs.writeFileSync('test-results/sc-email-envelope.json',JSON.stringify({from:message.from,to:message.to,replyTo:message.replyTo,subject:message.subject,headers:message.headers,actualEmailSent:false},null,2))
})
function contact(send) {
 const saved=[];const sent=[]
 const route=load('app/api/contact/route.ts',{'next/server':{NextResponse:response},'@/lib/prisma':{prisma:{contactMessage:{async create(record){saved.push(record)}}}},'@/lib/scEmail':location,'@/lib/email':{contactFormEmail(){return {subject:'New contact inquiry',html:'<p>Mock inquiry</p>'}},async sendEmail(args){sent.push(args);return send(args)}}})
 return {route,saved,sent}
}
const inquiry={name:'QA Example',email:'qa@example.invalid',phone:'202-555-0100',message:'QA mock inquiry only, not a live submission.',elapsedMs:4000}
test('contact is retained and direct email offered when server sending is unavailable',async()=>{
 const {route,saved}=contact(async()=>{throw Error('unconfigured')});const r=await route.POST({json:async()=>inquiry})
 assert.equal(saved.length,1);assert.equal(r.status,202);assert.equal(r.body.saved,true);assert.equal(r.body.notificationSent,false);assert.ok(r.body.emailHref.includes('South%20Carolina'))
})
test('contact goes to central inbox and replies return to the actual submitter',async()=>{
 const {route,saved,sent}=contact(async()=>({success:true}));const r=await route.POST({json:async()=>inquiry})
 assert.equal(saved.length,1);assert.equal(r.status,200);assert.equal(r.body.notificationSent,true);assert.equal(sent[0].to,business.email);assert.equal(sent[0].replyTo,inquiry.email)
})
test('invalid contact email creates no record and sends nothing',async()=>{
 const {route,saved,sent}=contact(async()=>{});const r=await route.POST({json:async()=>({...inquiry,email:'bad\r\naddress'})})
 assert.equal(r.status,400);assert.equal(saved.length,0);assert.equal(sent.length,0)
})
test('public sender diagnostic contains no credentials and does not claim active SMTP',async()=>{
 const {route}=contact(async()=>{});const r=await route.GET();assert.equal(r.body.notificationsEnabled,false);assert.equal(r.body.email,business.email);assert.equal(Object.keys(r.body).length,3)
})
test('all new category and wedding assets exist, with five distinct wedding previews',()=>{
 const categories=load('lib/scCategoryImages.ts').SC_CATEGORY_IMAGES;assert.equal(Object.keys(categories).length,18)
 const weddings=load('lib/scWeddingImages.ts').SC_WEDDING_IMAGES;assert.equal(new Set(Object.values(weddings)).size,5)
 for(const file of [...Object.values(categories),...Object.values(weddings)])assert.ok(fs.existsSync(path.join('public',file)),file)
})
test('audited item references are revision-locked and have real image files',()=>{
 const media=load('lib/scItemMedia.ts').SC_ITEM_MEDIA;assert.equal(Object.keys(media).length,34)
 for(const row of Object.values(media)){assert.ok(row.updatedAt);assert.equal(row.reference,true);assert.ok(fs.existsSync(path.join('public',row.path)))}
 const route=fs.readFileSync('app/api/item-image/[slug]/route.ts','utf8');assert.ok(route.includes('item.updatedAt.toISOString() === media.updatedAt'))
})
test('planning pictures are present before YouTube on mobile and desktop',()=>{
 const mobile=fs.readFileSync('components/public/MobileHome.tsx','utf8');assert.ok(mobile.indexOf('<PlanningShortcuts/>')<mobile.indexOf('<HomeYouTube/>'))
 const desktop=fs.readFileSync('app/(public)/page.tsx','utf8');assert.ok(desktop.includes('<PlanningShortcuts />'))
})
test('customer-facing contact links no longer advertise a separate unconfigured SC mailbox',()=>{
 for(const file of ['components/public/Header.tsx','components/public/MobileHeader.tsx','components/public/Footer.tsx','app/(public)/contact_us/page.tsx','app/(public)/employment/page.tsx']) {
  const text=fs.readFileSync(file,'utf8');assert.ok(text.includes('BUSINESS.emailHref'),file);assert.ok(!text.includes('mailto:customerservice@friendlypartyrentalsc.com'),file)
 }
})

for (const result of [{accepted:[],rejected:[]},{accepted:[],rejected:['recipient@example.invalid']},{accepted:['one@example.invalid'],rejected:['two@example.invalid']},undefined]) {
 test('empty or partially rejected SMTP response never counts as sent: '+JSON.stringify(result),async()=>{
  const mail=mailModule(async()=>result,{EMAIL_USER:'sender@example.invalid',EMAIL_PASS:'mock-not-a-secret'})
  await assert.rejects(mail.sendEmail({to:business.email,subject:'QA',html:'<p>QA</p>'}),/could not be delivered/)
 })
}
for (const [port,secure] of [['465',true],['587',false],['2525',false]]) {
 test('SMTP TLS mode matches submission port '+port,()=>{
  let options
  load('lib/email.ts',{'nodemailer':{createTransport(value){options=value;return {sendMail:async()=>({accepted:[],rejected:[]})}}},'@/lib/scEmail':location,'@/lib/utils':{BUSINESS:business,formatDateTime:()=>''}}, {EMAIL_PORT:port})
  assert.equal(options.secure,secure);assert.equal(options.requireTLS,!secure)
  assert.equal(options.connectionTimeout,10000);assert.equal(options.socketTimeout,20000)
 })
}
