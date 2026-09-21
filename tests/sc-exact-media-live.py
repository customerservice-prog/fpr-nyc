"""Direct NY/SC visual verification. All website writes are blocked.
Original asset hashes must match; image windows/crops and thumbnail pixels are compared.
Only the requested media sections are exact-parity targets, not regional offers or contacts.
"""
import asyncio,datetime,hashlib,io,json,os
from pathlib import Path
from urllib.parse import urljoin,urlsplit,parse_qs
from PIL import Image,ImageChops,ImageStat
from playwright.async_api import async_playwright
OUT=Path('test-results/exact-ny-media');OUT.mkdir(parents=True,exist_ok=True)
SITES={'ny':'https://www.friendlypartyrental.com','sc':'https://www.friendlypartyrentalsc.com'}
RESULT={'at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':[],'widths':{},'writesBlocked':True,'ordersSubmitted':False,'emailsSent':False}
manifest=json.loads(Path('lib/nyMediaSnapshot.json').read_text())
def raw_url(url,base):
 url=urljoin(base,url)
 for _ in range(4):
  q=parse_qs(urlsplit(url).query)
  if urlsplit(url).path=='/_next/image' and 'url' in q:url=urljoin(base,q['url'][0])
  else:break
 return url
def pixels(data):
 image=Image.open(io.BytesIO(data)).convert('RGB');return image
async def record(browser,key,width):
 mobile=width<768
 ctx=await browser.new_context(viewport={'width':width,'height':844 if mobile else 1000},is_mobile=mobile,has_touch=mobile,device_scale_factor=1,user_agent=('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' if mobile else 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'))
 async def readonly(route):
  if route.request.method not in ('GET','HEAD','OPTIONS'):await route.fulfill(status=403,body='Read-only visual verification')
  else:await route.continue_()
 await ctx.route('**/*',readonly)
 page=await ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 try:
  r=await page.goto(SITES[key],wait_until='domcontentloaded',timeout=45000);assert r.status==200
  await page.wait_for_timeout(1500);await page.evaluate('document.fonts.ready')
  await page.wait_for_function("document.querySelector('[data-home-category]')!==null")
  cards=page.locator('[data-home-category]:visible');assert await cards.count()==19,(key,width,await cards.count())
  records=[]
  for i in range(await cards.count()):
   card=cards.nth(i);im=card.locator('img').first
   await im.evaluate('(i)=>i.scrollIntoView({block:"center"})')
   await page.wait_for_function('(slug)=>{const e=[...document.querySelectorAll("[data-home-category]")].find(c=>c.dataset.homeCategory===slug&&c.getClientRects().length)?.querySelector("img");return e&&e.complete&&e.naturalWidth>0}',arg=await card.get_attribute('data-home-category'))
   await page.mouse.move(0,0);await page.wait_for_timeout(60)
   data=await card.evaluate('''e=>{const i=e.querySelector('img'),r=i.getBoundingClientRect(),c=e.getBoundingClientRect(),s=getComputedStyle(i);return {slug:e.dataset.homeCategory,href:e.querySelector('a').getAttribute('href'),imageSrc:i.currentSrc,width:r.width,height:r.height,cardWidth:c.width,cardHeight:c.height,fit:s.objectFit,position:s.objectPosition}}''')
   data['original']=raw_url(data['imageSrc'],SITES[key]);shot=await im.screenshot(animations='disabled')
   file=f'{key}-{width}-category-{data["slug"]}.png';(OUT/file).write_bytes(shot);data['screenshot']=file
   records.append(data)
  heading=page.get_by_role('heading',name='Watch Us on YouTube',exact=True)
  visible=[h for h in await heading.all() if await h.is_visible()];assert len(visible)==1
  if mobile:
   section=visible[0].locator('xpath=ancestor::section[1]')
  else:
   wrappers=page.locator('[data-home-section="youtube"]:visible');section=wrappers.first
  button=section.get_by_role('button',name='Play video: Watch Us on YouTube',exact=True)
  await button.scroll_into_view_if_needed();await page.wait_for_timeout(700);await page.mouse.move(0,0)
  await page.wait_for_function("[...document.querySelectorAll('button[aria-label=\"Play video: Watch Us on YouTube\"] img')].some(i=>i.getClientRects().length&&i.complete&&i.naturalWidth===1280)")
  box=await button.bounding_box();sbox=await section.bounding_box();shot=await button.screenshot(animations='disabled');(OUT/f'{key}-{width}-thumbnail.png').write_bytes(shot)
  await section.screenshot(path=str(OUT/f'{key}-{width}-youtube.png'),animations='disabled')
  category_section=cards.first.locator('xpath=ancestor::section[1]');cbox=await category_section.bounding_box()
  await category_section.scroll_into_view_if_needed();await page.wait_for_timeout(250)
  await category_section.screenshot(path=str(OUT/f'{key}-{width}-categories.png'),animations='disabled')
  shortcuts=page.locator('section[aria-label="What are you planning"]:visible')
  shortcut_data=[]
  if not mobile:
   assert await shortcuts.count()==1
   for anchor in await shortcuts.locator('a').all():
    im=anchor.locator('img')
    if await im.count():
     await im.scroll_into_view_if_needed();await page.wait_for_function('(src)=>[...document.images].some(i=>i.getAttribute('src')===src&&i.complete&&i.naturalWidth>0)',arg=await im.get_attribute('src'))
     shortcut_data.append(await im.evaluate('i=>{let r=i.getBoundingClientRect(),s=getComputedStyle(i);return {width:r.width,height:r.height,fit:s.objectFit,src:i.currentSrc}}'))
   assert len(shortcut_data)==7
   await shortcuts.screenshot(path=str(OUT/f'{key}-{width}-shortcuts.png'),animations='disabled')
  else:assert await shortcuts.count()==0,'Mobile must not add desktop-only photo circles'
  section_order=await page.evaluate("[...document.querySelectorAll('[data-home-section]')].filter(e=>e.getClientRects().length).map(e=>e.dataset.homeSection)")
  assert section_order.index('youtube')<section_order.index('categories')
  assert not any(x in ['wedding','wedding-banner'] for x in section_order[:section_order.index('categories')])
  if key=='sc':
   assert await page.locator('head link[href*="favicon.ico"]').count()>0
   assert await page.locator('a[href^="mailto:customerservice@friendlypartyrental.com?subject="]').count()>0
  assert not await page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
  assert not errors,(key,width,errors)
  await button.scroll_into_view_if_needed();await button.focus();await page.keyboard.press('Enter')
  embed=section.locator('iframe');await embed.wait_for();assert 'LWQvMclQea4?autoplay=1' in await embed.get_attribute('src')
  return {'categories':records,'shortcuts':shortcut_data,'thumbnailBox':box,'youtubeBox':sbox,'categorySectionBox':cbox,'sectionOrder':section_order,'scriptErrors':errors,'keyboardPlay':True}
 finally:await ctx.close()
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch();api=await p.request.new_context()
  try:
   ready=False
   expected=next(a for a in manifest['assets'] if a['label']=='youtube-video-thumbnail')['sha256']
   for _ in range(48):
    try:
     r=await api.get(SITES['sc']+'/images/youtube-video-thumbnail.jpg',timeout=8000)
     if r.status==200 and hashlib.sha256(await r.body()).hexdigest()==expected:ready=True;break
    except Exception:pass
    await asyncio.sleep(5)
   assert ready,'The exact original thumbnail must be deployed, not just committed'
   for asset in manifest['assets']:
    r=await api.get(SITES['sc']+asset['publicPath'],timeout=20000);data=await r.body()
    assert r.status==200 and hashlib.sha256(data).hexdigest()==asset['sha256'],asset['label']
    Image.open(io.BytesIO(data)).verify()
    RESULT['checks'].append({'name':asset['label'],'originalBytesIdentical':True,'sha256':asset['sha256']})
   for asset in manifest['assets']:
    if not asset['label'].startswith('category-') or asset['label']=='category-order-by-date':continue
    slug=asset['label'].removeprefix('category-')
    r=await api.get(SITES['sc']+'/api/category-image/'+slug+'?parity=20260921',timeout=20000)
    assert r.status==200 and hashlib.sha256(await r.body()).hexdigest()==asset['sha256'],slug
   RESULT['checks'].append({'name':'All 18 public category-image endpoints','originalBytesIdentical':True})
   for width in [360,390,768,1440]:
    ny=await record(browser,'ny',width);sc=await record(browser,'sc',width)
    assert [c['slug'] for c in ny['categories']]==[c['slug'] for c in sc['categories']]
    diffs=[]
    for a,b in zip(ny['categories'],sc['categories']):
     for field in ['width','height','cardWidth']:
      assert abs(a[field]-b[field])<=1,(width,a['slug'],field,a[field],b[field])
     assert a['fit']==b['fit'] and a['position']==b['position']
     first=Image.open(OUT/a['screenshot']).convert('RGB');second=Image.open(OUT/b['screenshot']).convert('RGB')
     assert first.size==second.size,(width,a['slug'],'image window mismatch',first.size,second.size)
     mean=sum(ImageStat.Stat(ImageChops.difference(first,second)).mean)/3
     assert mean<1.5,(width,a['slug'],'image pixels differ',mean)
     diffs.append({'slug':a['slug'],'meanPixelDifference':mean,'size':list(first.size)})
    for field in ['width','height']:
     assert abs(ny['thumbnailBox'][field]-sc['thumbnailBox'][field])<=1,(width,'thumbnail',field)
     assert abs(ny['youtubeBox'][field]-sc['youtubeBox'][field])<=1,(width,'youtube',field,ny['youtubeBox'][field],sc['youtubeBox'][field])
    first=Image.open(OUT/f'ny-{width}-thumbnail.png').convert('RGB');second=Image.open(OUT/f'sc-{width}-thumbnail.png').convert('RGB')
    assert first.size==second.size
    mean=sum(ImageStat.Stat(ImageChops.difference(first,second)).mean)/3;assert mean<1.5,(width,'thumbnail pixels',mean)
    for a,b in zip(ny['shortcuts'],sc['shortcuts']):
     assert a['width']==b['width'] and a['height']==b['height'] and a['fit']==b['fit']
    RESULT['widths'][str(width)]={'ny':ny,'sc':sc,'categoryComparisons':diffs,'thumbnailMeanPixelDifference':mean,'passed':True}
    print(json.dumps({'width':width,'passed':True,'categories':len(diffs),'thumbnailMeanPixelDifference':mean}),flush=True)
   RESULT['passed']=True
  finally:
   (OUT/'results.json').write_text(json.dumps(RESULT,indent=2));await api.dispose();await browser.close()
asyncio.run(main())
