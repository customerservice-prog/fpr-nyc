from pathlib import Path
import hashlib, json, re

ROOT = Path('.')
OLD = '/brand/friendly-party-rental-nyc-logo-v7.png'
NEW = '/brand/friendly-party-rental-nyc-20260929-original.png'
ICON = '/brand/nyc-20260929-icon-'
SOURCE_SHA = '37bb5f00906e5b71aba2e3d63715b71f1e4b29b5b01e8e40b5f1d27719d1b253'
assert hashlib.sha256(Path('public'+NEW).read_bytes()).hexdigest() == SOURCE_SHA

def edit(name, fn):
    path = ROOT / name
    before = path.read_text()
    after = fn(before)
    if after != before:
        path.write_text(after)
        print('Updated', name)

def replace(s, old, new):
    assert old in s, 'Expected source text missing: '+old[:100]
    return s.replace(old, new)

for name in ['components/public/Header.tsx','components/public/MobileHeader.tsx','components/public/Footer.tsx','app/layout.tsx','lib/marketing/message.ts']:
    edit(name, lambda s: replace(s, OLD, NEW))

def header(s):
    start = s.index('  const logo = ')
    end = s.index('\n  if (cfg.mode', start)
    s = s[:start] + '''  const logo = <Link href="/" prefetch={false} aria-label="Friendly Party Rental NYC home" className="inline-flex w-full max-w-[320px] items-center justify-center"><img src={LOGO_URL} alt={BUSINESS.name} width={1774} height={887} loading="eager" className="block h-auto w-full object-contain" style={{ maxWidth: cfg.logoLarge ? 320 : 300 }}/></Link>''' + s[end:]
    s = replace(s, 'md:grid-cols-[minmax(0,1fr)_250px_minmax(0,1fr)]', 'md:grid-cols-[minmax(0,1fr)_260px_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_320px_minmax(0,1fr)]')
    s = replace(s, "<div className={'min-w-0 flex justify-center' + (cfg.grayscale ? ' grayscale' : '')}>{logo}</div>", '<div className="min-w-0 flex justify-center">{logo}</div>')
    s = s.replace('width={220} height={147}', 'width={220} height={110} className="block h-auto max-w-full object-contain"')
    s = s.replace('width={160} height={107}', 'width={160} height={80} className="block h-auto max-w-full object-contain"')
    return s
edit('components/public/Header.tsx', header)

def mobile(s):
    s = replace(s, 'h-[104px] flex items-center px-2', 'min-h-[104px] grid grid-cols-[48px_minmax(0,1fr)_88px] items-center gap-1 px-2 py-1')
    s = replace(s, 'className="flex-1 flex justify-center"><img src={LOGO_URL} alt="Friendly Party Rental NYC" width={145} height={97} className="w-[145px] h-auto object-contain"', 'className="min-w-0 flex justify-center" aria-label="Friendly Party Rental NYC home"><img src={LOGO_URL} alt="Friendly Party Rental NYC" width={1774} height={887} loading="eager" className="block w-full max-w-[220px] h-auto object-contain"')
    s = s.replace('className="p-3"><Search size={22}', 'className="p-2.5"><Search size={22}')
    s = s.replace('className="p-3 relative"><ShoppingCart', 'className="p-2.5 relative"><ShoppingCart')
    return s
edit('components/public/MobileHeader.tsx', mobile)

def footer(s):
    s = s.replace('width={140} height={70} className="mx-auto"', 'width={260} height={130} className="mx-auto block h-auto max-w-full object-contain rounded-lg bg-white"')
    s = s.replace('width={120} height={60} className="mx-auto mb-1"', 'width={260} height={130} className="mx-auto mb-1 block h-auto max-w-full object-contain rounded-lg bg-white"')
    s = s.replace('width={180} height={120} className="mx-auto mb-2"', 'width={280} height={140} className="mx-auto mb-2 block h-auto max-w-full object-contain rounded-lg bg-white"')
    return s
edit('components/public/Footer.tsx', footer)

def layout(s):
    start = s.index('  icons: {')
    end = s.index('\n  title:', start)
    s = s[:start] + '''  icons: {
    icon: [
      { url: '/brand/nyc-20260929-icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/nyc-20260929-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/brand/nyc-20260929-icon-32.png',
    apple: [{ url: '/brand/nyc-20260929-icon-180.png', sizes: '180x180', type: 'image/png' }],
  },''' + s[end:]
    return replace(s, 'width: 768, height: 512, alt: BUSINESS.name', 'width: 1774, height: 887, alt: BUSINESS.name')
edit('app/layout.tsx', layout)
edit('lib/nycSeo.ts', lambda s: replace(s, '/images/logo.png', NEW))
edit('lib/email.ts', lambda s: replace(s, "const LOGO_URL = 'https://fpr-nyc-production.up.railway.app/images/logo.png'", "const LOGO_URL = (process.env.NEXT_PUBLIC_SITE_URL || process.env.PUBLIC_BASE_URL || 'https://fpr-nyc-production.up.railway.app').replace(/\\/$/, '') + '"+NEW+"'").replace('style="max-height:70px; max-width:320px;"', 'width="280" height="140" style="display:inline-block;width:280px;max-width:100%;height:auto;border:0;"'))
edit('lib/marketing/message.ts', lambda s: replace(s, 'width="150" alt="Friendly Party Rental NYC" style="display:inline-block;max-width:150px;height:auto;border:0;"', 'width="260" height="130" alt="Friendly Party Rental NYC" style="display:inline-block;width:260px;max-width:100%;height:auto;border:0;"'))
edit('components/admin/AdminNav.tsx', lambda s: replace(replace(s, 'src="/images/logo.png"', 'src="'+NEW+'"'), 'href="https://www.fpr-nyc-production.up.railway.app"', 'href="/"').replace('width={140}\n            height={48}', 'width={160}\n            height={80}').replace('className="h-12 w-auto object-contain"', 'className="h-16 w-auto max-w-[160px] object-contain rounded bg-white"'))
for name, suffix in [('app/api/driver-icon-512/route.ts','512.png'),('app/api/driver-icon-maskable/route.ts','maskable-512.png')]:
    edit(name, lambda s, suffix=suffix: replace(s, OLD, ICON+suffix))

p=Path('public/site.webmanifest'); m=json.loads(p.read_text())
m['icons']=[{'src':ICON+str(size)+'.png','sizes':str(size)+'x'+str(size),'type':'image/png','purpose':'any'} for size in [192,512]]
p.write_text(json.dumps(m,indent=2)+'\n')
p=Path('public/driver-manifest.webmanifest'); m=json.loads(p.read_text())
m['icons']=[{'src':ICON+'512.png','sizes':'512x512','type':'image/png','purpose':'any'},{'src':ICON+'maskable-512.png','sizes':'512x512','type':'image/png','purpose':'maskable'}]
p.write_text(json.dumps(m,indent=2)+'\n')
edit('app/driver/layout.tsx', lambda s: s.replace("'/api/driver-icon-512'", "'"+ICON+"512.png'"))
edit('app/health/route.ts',lambda s:replace(s,"revision: 'nyc-full-location-logo-v2'","revision: 'nyc-approved-brand-20260929',\n      brandSha256: '"+SOURCE_SHA+"'"))

Path('scripts/generate-nyc-brand-icons.cjs').write_text('''// Favicon/app-icon derivatives contain the whole owner-approved artwork.
// The original PNG is never transformed or overwritten.
const fs = require('node:fs/promises')
const crypto = require('node:crypto')
const sharp = require('sharp')
const source = 'public/brand/friendly-party-rental-nyc-20260929-original.png'
const prefix = 'public/brand/nyc-20260929-icon-'
async function main() {
  const bytes = await fs.readFile(source)
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== '37bb5f00906e5b71aba2e3d63715b71f1e4b29b5b01e8e40b5f1d27719d1b253') throw new Error('Wrong NYC logo source')
  const frames = []
  for (const size of [16,32,48,64,96,180,192,256,512]) {
    const png = await sharp(bytes).resize(size,size,{fit:'contain',background:'#ffffff'}).png().toBuffer()
    await fs.writeFile(prefix+size+'.png',png)
    if ([16,32,48,64,96,256].includes(size)) frames.push({size,png})
    if ([16,32,48,96].includes(size)) await fs.writeFile('public/favicon-'+size+'x'+size+'.png',png)
    if (size===180) await fs.writeFile('public/apple-touch-icon.png',png)
    if (size===512) await fs.writeFile('public/images/logo-icon.png',png)
  }
  const mask = await sharp(bytes).resize(400,400,{fit:'contain',background:'#ffffff'}).extend({top:56,bottom:56,left:56,right:56,background:'#ffffff'}).png().toBuffer()
  await fs.writeFile(prefix+'maskable-512.png',mask)
  await fs.writeFile('public/images/logo.png',bytes)
  const header=Buffer.alloc(6+16*frames.length)
  header.writeUInt16LE(1,2);header.writeUInt16LE(frames.length,4)
  let offset=header.length
  frames.forEach(({size,png},i)=>{const p=6+16*i;header[p]=size===256?0:size;header[p+1]=size===256?0:size;header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(png.length,p+8);header.writeUInt32LE(offset,p+12);offset+=png.length})
  await fs.writeFile('public/favicon.ico',Buffer.concat([header,...frames.map(f=>f.png)]))
  console.log('Generated full-artwork NYC icons and updated legacy logo fallbacks; original remains byte-identical')
}
main().catch(error=>{console.error(error);process.exitCode=1})
''')

Path('tests/nyc-approved-branding.test.cjs').write_text(r'''const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const crypto=require('node:crypto')
const zlib=require('node:zlib')
const path=require('node:path')
const LOGO='/brand/friendly-party-rental-nyc-20260929-original.png'
const ICON='/brand/nyc-20260929-icon-'
const read=p=>fs.readFileSync(p,'utf8')
function pngInfo(bytes) {
  assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a')
  let pos=8,end=false,width=0,height=0;const chunks=[]
  while(pos<bytes.length) {
    assert.ok(pos+12<=bytes.length,'Truncated chunk')
    const n=bytes.readUInt32BE(pos),kind=bytes.toString('ascii',pos+4,pos+8)
    assert.ok(pos+12+n<=bytes.length,'Truncated PNG payload')
    if(kind==='IHDR'){width=bytes.readUInt32BE(pos+8);height=bytes.readUInt32BE(pos+12)}
    if(kind==='IDAT')chunks.push(bytes.subarray(pos+8,pos+8+n))
    pos+=12+n
    if(kind==='IEND'){end=true;break}
  }
  assert.ok(end&&pos===bytes.length,'Missing IEND or trailing bytes')
  assert.ok(zlib.inflateSync(Buffer.concat(chunks)).length>0)
  return {width,height}
}
test('approved logo preserves exact original bytes and complete PNG',()=>{
  const b=fs.readFileSync('public'+LOGO)
  assert.equal(b.length,2428349)
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),'37bb5f00906e5b71aba2e3d63715b71f1e4b29b5b01e8e40b5f1d27719d1b253')
  assert.deepEqual(pngInfo(b),{width:1774,height:887})
  assert.throws(()=>pngInfo(b.subarray(0,b.length-20)))
})
test('public headers footer admin and email use approved NYC artwork',()=>{
  for(const p of ['components/public/Header.tsx','components/public/MobileHeader.tsx','components/public/Footer.tsx','components/admin/AdminNav.tsx','lib/email.ts','lib/marketing/message.ts','lib/nycSeo.ts','app/layout.tsx'])assert.ok(read(p).includes(LOGO),p)
  for(const p of ['components/public/Header.tsx','components/public/MobileHeader.tsx','components/public/Footer.tsx']){
    assert.match(read(p),/h-auto/);assert.match(read(p),/object-contain/)
  }
  assert.match(read('components/public/MobileHeader.tsx'),/min-w-0/)
  assert.doesNotMatch(read('components/public/MobileHeader.tsx'),/width=\{145\} height=\{97\}/)
})
test('icons have the dimensions advertised by website and driver manifests',()=>{
  for(const file of ['public/site.webmanifest','public/driver-manifest.webmanifest']) {
    for(const icon of JSON.parse(read(file)).icons){
      assert.ok(icon.src.startsWith(ICON));const [w,h]=icon.sizes.split('x').map(Number)
      assert.deepEqual(pngInfo(fs.readFileSync('public'+icon.src)),{width:w,height:h})
    }
  }
  assert.deepEqual(pngInfo(fs.readFileSync('public'+ICON+'180.png')),{width:180,height:180})
  assert.match(read('app/api/driver-icon-512/route.ts'),/nyc-20260929-icon-512/)
  assert.match(read('app/api/driver-icon-maskable/route.ts'),/nyc-20260929-icon-maskable-512/)
})
test('active source has no versioned skyline-logo references',()=>{
  for(const root of ['app','components','lib']){
    const pending=[root]
    while(pending.length){const p=pending.pop();if(fs.statSync(p).isDirectory()){for(const name of fs.readdirSync(p))pending.push(path.join(p,name));continue}if(!/\.(ts|tsx|js)$/.test(p))continue;assert.doesNotMatch(read(p),/friendly-party-rental-nyc-logo-v[1-7]\.png/,p)}
  }
})
test('legacy logo fallback contains exactly the approved image, not old data',()=>{
  assert.deepEqual(fs.readFileSync('public/images/logo.png'),fs.readFileSync('public'+LOGO))
  assert.deepEqual(pngInfo(fs.readFileSync('public/images/logo-icon.png')),{width:512,height:512})
})
''')
Path('tests/nyc-brand-finishing.test.cjs').write_text("// Current NYC brand tests replace the inherited pre-NYC icon assertions.\nrequire('./nyc-approved-branding.test.cjs')\n")
p=Path('package.json'); package=json.loads(p.read_text()); package['scripts']['test:nyc-branding']='node --test tests/nyc-approved-branding.test.cjs';package['scripts']['build']='npm run test:nyc-branding && '+package['scripts']['build'];p.write_text(json.dumps(package,indent=2)+'\n')
print('NYC brand patch prepared; no DNS, variables, Stripe or business records modified')
