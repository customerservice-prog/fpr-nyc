"""Read-only SC icon/media verification. No emails, orders or applications submitted."""
import asyncio, datetime, hashlib, io, json
from pathlib import Path
from PIL import Image
from playwright.async_api import async_playwright
BASE='https://www.friendlypartyrentalsc.com'
OUT=Path('test-results/sc-branding');OUT.mkdir(parents=True,exist_ok=True)
RESULT={'testedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'origin':BASE,'checks':[],'submittedEmail':False,'submittedOrder':False}
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch();api=await p.request.new_context()
  try:
   ready=False
   for _ in range(60):
    try:
     r=await api.get(BASE+'/api/wedding-packages',timeout=8000);rows=await r.json()
     icon=await api.get(BASE+'/favicon-32x32.png?v=sc-20260921',timeout=8000)
     if isinstance(rows,list) and len(rows)>=5 and all(str(row.get('image','')).startswith('/images/storefront/pkg-') for row in rows) and icon.status==200:
      ready=True;break
    except Exception:pass
    await asyncio.sleep(5)
   assert ready,'The combined SC branding and package API revision must actually be deployed'
   for name,size in [('favicon-16x16.png',16),('favicon-32x32.png',32),('favicon-48x48.png',48),('favicon-96x96.png',96),('apple-touch-icon.png',180),('sc-icon-192.png',192),('sc-icon-512.png',512)]:
    r=await api.get(BASE+'/'+name,timeout=15000);assert r.status==200,(name,r.status)
    data=await r.body();img=Image.open(io.BytesIO(data));assert img.size==(size,size),(name,img.size)
    (OUT/name).write_bytes(data);RESULT['checks'].append({'name':name,'status':r.status,'size':list(img.size),'sha256':hashlib.sha256(data).hexdigest()})
   r=await api.get(BASE+'/favicon.ico');data=await r.body();assert r.status==200;ico=Image.open(io.BytesIO(data));assert ico.format=='ICO';assert len(ico.ico.sizes())==6
   (OUT/'favicon.ico').write_bytes(data);RESULT['checks'].append({'name':'favicon.ico','status':r.status,'sizes':sorted([list(s) for s in ico.ico.sizes()])})
   r=await api.get(BASE+'/site.webmanifest');manifest=await r.json();assert r.status==200;assert manifest['short_name']=='FPR SC';assert 'South Carolina' in manifest['name']
   RESULT['checks'].append({'name':'manifest','status':r.status,'value':manifest})
   for width in [390,1440]:
    context=await browser.new_context(viewport={'width':width,'height':900},is_mobile=width<768,has_touch=width<768)
    async def readonly(route):
     if route.request.method not in ['GET','HEAD','OPTIONS']:await route.fulfill(status=403,body='Read-only verification')
     else:await route.continue_()
    await context.route('**/*',readonly)
    page=await context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
    response=await page.goto(BASE,wait_until='domcontentloaded',timeout=40000);assert response.status==200
    await page.locator('[data-sc-video-cover="20260921"]:visible').wait_for()
    for href in ['favicon-32x32.png','favicon.ico','apple-touch-icon.png','site.webmanifest']:
     assert await page.locator('head link[href*="'+href+'"]').count()>0,href
    cover=page.locator('[data-sc-video-cover="20260921"]:visible');await cover.scroll_into_view_if_needed();await page.wait_for_timeout(1200)
    for image in await cover.locator('img').all():
     assert await image.evaluate('(i)=>i.complete&&i.naturalWidth>0');assert 'i.ytimg.com' not in await image.get_attribute('src')
    await page.screenshot(path=str(OUT/f'youtube-{width}.png'))
    assert await page.locator('[data-sc-planning-images]:visible a').count()==8
    if width<768:
     banner=page.locator('[data-home-section="wedding-banner"]:visible');await banner.scroll_into_view_if_needed();await page.wait_for_timeout(600)
     assert await banner.get_by_role('link',name='Explore Wedding Packages').get_attribute('href')=='/weddings'
     await page.screenshot(path=str(OUT/'wedding-banner-mobile.png'))
    assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    await page.goto(BASE+'/contact_us',wait_until='domcontentloaded');link=page.locator('a[href^="mailto:customerservice@friendlypartyrental.com?subject="]').first
    assert await link.count()>0;assert 'South%20Carolina' in await link.get_attribute('href')
    await page.goto(BASE+'/admin/settings/email-delivery',wait_until='domcontentloaded');await page.wait_for_url('**/admin/login**')
    assert not errors,errors;RESULT['checks'].append({'name':f'homepage and public contact {width}px','passed':True,'scriptErrors':errors,'adminSetupRequiresLogin':True});await context.close()
   r=await api.get(BASE+'/api/wedding-packages');pkgs=await r.json();assert r.status==200 and isinstance(pkgs,list)
   photo_hashes=[]
   for pkg in pkgs:
    if pkg['id'] not in ['pkg-basic','pkg-standard','pkg-premium','pkg-luxury','pkg-elite']:continue
    assert pkg['image']=='/images/storefront/'+pkg['id']+'.jpg',pkg['id']
    image=await api.get(BASE+'/api/wedding-package-image/'+pkg['id']);assert image.status==200
    assert image.headers.get('x-image-reference')=='shared-brand-inspiration'
    content=await image.body();Image.open(io.BytesIO(content)).verify();photo_hashes.append(hashlib.sha256(content).hexdigest())
   assert len(photo_hashes)==5 and len(set(photo_hashes))==5;RESULT['checks'].append({'name':'five package API images agree with storefront','passed':True,'uniqueImages':len(set(photo_hashes))})
   r=await api.get(BASE+'/api/contact');diagnostic=await r.json();assert diagnostic['email']=='customerservice@friendlypartyrental.com'
   RESULT['checks'].append({'name':'live notification configuration','notificationsEnabled':diagnostic['notificationsEnabled'],'deliveryVerified':False});RESULT['passed']=True
  finally:
   (OUT/'results.json').write_text(json.dumps(RESULT,indent=2));print(json.dumps(RESULT,indent=2));await api.dispose();await browser.close()
asyncio.run(main())
