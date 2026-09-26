const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),crypto=require('node:crypto')
const read=p=>fs.readFileSync(p,'utf8');const manifest=JSON.parse(read('lib/nyMediaSnapshot.json'))
test('all 21 copied media originals match reviewed NY SHA-256 without re-encoding',()=>{
 assert.equal(manifest.assets.length,21)
 for(const asset of manifest.assets)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(asset.path)).digest('hex'),asset.sha256,asset.label)
})
test('mobile uses NY card grid and video order, without added photo circles or banner between video and categories',()=>{
 const source=read('components/public/MobileHome.tsx');assert.ok(source.includes("import styles from './MobileHome.module.css'"));assert.ok(source.includes('<HomeCategoryGrid categories={categories} mobile'));assert.ok(!source.includes('<PlanningShortcuts'))
 assert.ok(source.indexOf('<HomeYouTube/>')<source.indexOf('<HomeCategoryGrid'))
 assert.ok(source.indexOf('<HomeWeddingBanner/>')>source.indexOf('data-home-section="packages"'))
 const css=read('components/public/MobileHome.module.css');assert.ok(css.includes('aspect-ratio:1;flex:none'));assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr));gap:12px'));assert.ok(css.includes('@container (min-width:600px)'))
})
test('exact NY cover, crop and click-to-play are retained without SC artwork overlays',()=>{
 const source=read('components/public/YouTubeFacade.tsx');assert.ok(source.includes('src="/images/youtube-video-thumbnail.jpg"'));assert.ok(source.includes('object-cover'));assert.ok(source.includes('bg-black/20'));assert.ok(source.includes('www.youtube.com/embed/'));assert.ok(!source.includes('/images/logo.png'))
})
test('all rental categories keep their own local checkout destinations',()=>{
 const source=read('lib/nyHomeMedia.ts');assert.ok(source.includes('order-by-date'));assert.ok(!source.includes('https://www.friendlypartyrental.com'));assert.ok(!source.includes('/admin/'))
})

test('wedding package artwork is snapshotted from NY at build time and served only through SC URLs',()=>{
 const pkg=JSON.parse(read('package.json'));assert.equal(pkg.scripts['snapshot:wedding-art'],'node scripts/snapshot-ny-wedding-art.mjs');assert.ok(pkg.scripts.build.startsWith('npm run snapshot:wedding-art && '))
 const capture=read('scripts/snapshot-ny-wedding-art.mjs')
 for(const id of ['pkg-basic','pkg-standard','pkg-premium','pkg-luxury','pkg-elite'])assert.ok(capture.includes('https://www.friendlypartyrental.com/api/wedding-package-image/'+id))
 assert.ok(capture.includes("writeFile(path.join(outDir, packageId + '.bin'), bytes)"));assert.ok(capture.includes("createHash('sha256')"))
 const map=read('lib/scWeddingImages.ts');for(const id of ['pkg-basic','pkg-standard','pkg-premium','pkg-luxury','pkg-elite'])assert.ok(map.includes('"'+id+'": "/api/wedding-art/'+id+'"'))
 assert.ok(!map.includes('https://www.friendlypartyrental.com'))
 const card=read('components/public/WeddingPackageCard.tsx');assert.ok(card.includes('object-contain bg-gray-50'));assert.ok(!card.includes('illustrative event setting'))
 const detail=read('app/(public)/wedding-packages/page.tsx');assert.ok(detail.includes('w-full h-auto object-contain bg-gray-50'));assert.ok(!detail.includes('max-h-[520px] object-cover'))
})
