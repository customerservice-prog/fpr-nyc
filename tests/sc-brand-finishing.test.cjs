const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const read=p=>fs.readFileSync(p,'utf8')
test('root declares SC browser favicon and touch icons without changing driver identity',()=>{
 const root=read('app/layout.tsx');assert.ok(root.includes("applicationName: 'Friendly Party Rental - South Carolina'"));assert.ok(root.includes('/favicon.ico?v=sc-20260921'));assert.ok(root.includes('/apple-touch-icon.png?v=sc-20260921'))
 const driver=read('app/driver/layout.tsx');assert.ok(driver.includes("manifest: '/driver-manifest.webmanifest'"));assert.ok(driver.includes("apple: '/api/driver-icon-512'"))
})
test('all published icon assets exist with valid signatures',()=>{
 const ico=fs.readFileSync('public/favicon.ico');assert.equal(ico.readUInt16LE(0),0);assert.equal(ico.readUInt16LE(2),1);assert.equal(ico.readUInt16LE(4),6)
 for(const [path,size] of [['apple-touch-icon.png',180],['favicon-16x16.png',16],['favicon-32x32.png',32],['favicon-48x48.png',48],['favicon-96x96.png',96],['sc-icon-192.png',192],['sc-icon-512.png',512]]){
  const data=fs.readFileSync('public/'+path);assert.equal(data.toString('hex',0,8),'89504e470d0a1a0a');assert.equal(data.readUInt32BE(16),size);assert.equal(data.readUInt32BE(20),size)
 }
})
test('storefront manifest is independent of the existing driver app',()=>{
 const manifest=JSON.parse(read('public/site.webmanifest'));assert.equal(manifest.short_name,'FPR SC');assert.equal(manifest.start_url,'/');assert.equal(manifest.display,'browser');assert.equal(manifest.icons.length,2)
})
test('home video uses the exact NY cover requested by the owner',()=>{
 const code=read('components/public/YouTubeFacade.tsx');assert.ok(code.includes('/images/youtube-video-thumbnail.jpg'));assert.ok(code.includes('setLoaded(true)'));assert.ok(!code.includes('sc-event-reception.jpg'));assert.ok(!code.includes('i.ytimg.com'))
})
