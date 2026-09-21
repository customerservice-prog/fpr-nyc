const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs')
const read=path=>fs.readFileSync(path,'utf8')
test('package JSON uses storefront presentation without modifying approved offers',()=>{
 const api=read('app/api/wedding-packages/route.ts');assert.ok(api.includes('getSyncedWeddingPackages()'));assert.ok(!api.includes('prisma.weddingPackage.update'))
 const image=read('app/api/wedding-package-image/[id]/route.ts');assert.ok(image.includes("'2026-08-23T19:15:02.017Z'"));assert.ok(image.includes('SC_WEDDING_IMAGES[id]'));assert.ok(image.includes('shared-brand-inspiration'))
})
test('mobile wedding image banner is linked and attributed',()=>{
 const source=read('components/public/HomeYouTube.tsx');assert.ok(source.includes('data-home-section="wedding-banner"'));assert.ok(source.includes('md:hidden'));assert.ok(source.includes('/images/storefront/pkg-premium.jpg'));assert.ok(source.includes('Shared brand inspiration'));assert.ok(source.includes('Explore Wedding Packages'))
})
test('email readiness is administrator-only and never exposes or requests passwords',()=>{
 const page=read('app/admin/settings/email-delivery/page.tsx');assert.ok(page.includes('getServerSession(authOptions)'));assert.ok(page.includes("redirect('/admin/login')"));assert.ok(page.includes("role !== 'admin'"));assert.ok(page.includes('Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)'));assert.ok(!page.includes('sendEmail('));assert.ok(!page.includes('dangerouslySetInnerHTML'))
 assert.ok(read('app/admin/settings/page.tsx').includes("'Email Delivery':'/admin/settings/email-delivery'"))
})
