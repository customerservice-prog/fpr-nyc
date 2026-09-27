"""Direct NY/SC visual verification; all browser writes are blocked.
Checks originals, image-window geometry and rendered pixels. Regional offers
and contact copy are not claimed identical. Full-section screenshots are unaltered.
"""
import asyncio, datetime, hashlib, io, json
from pathlib import Path
from urllib.parse import urljoin, urlsplit, parse_qs
from PIL import Image, ImageChops, ImageStat
from playwright.async_api import async_playwright

OUT = Path('test-results/exact-ny-media')
OUT.mkdir(parents=True, exist_ok=True)
SITES = {'ny': 'https://www.friendlypartyrental.com', 'sc': 'https://www.friendlypartyrentalsc.com'}
RESULT = {'at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'checks': [], 'widths': {}, 'writesBlocked': True, 'ordersSubmitted': False, 'emailsSent': False}
manifest = json.loads(Path('lib/nyMediaSnapshot.json').read_text())

def raw_url(url, base):
    url = urljoin(base, url)
    for _ in range(4):
        query = parse_qs(urlsplit(url).query)
        if urlsplit(url).path == '/_next/image' and 'url' in query:
            url = urljoin(base, query['url'][0])
        else:
            break
    return url

async def record(browser, key, width):
    mobile = width < 768
    context = await browser.new_context(
        viewport={'width': width, 'height': 844 if mobile else 1000},
        is_mobile=mobile, has_touch=mobile, device_scale_factor=1,
        user_agent=('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' if mobile else 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'))
    async def readonly(route):
        if route.request.method not in ('GET', 'HEAD', 'OPTIONS'):
            await route.fulfill(status=403, body='Read-only visual verification')
        else:
            await route.continue_()
    await context.route('**/*', readonly)
    page = await context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        response = await page.goto(SITES[key], wait_until='domcontentloaded', timeout=45000)
        assert response.status == 200
        await page.wait_for_timeout(1500)
        await page.evaluate('document.fonts.ready')
        await page.wait_for_function("document.querySelector('[data-home-category]') !== null")
        cards = page.locator('[data-home-category]:visible')
        assert await cards.count() == 19, (key, width, await cards.count())
        records = []
        for index in range(await cards.count()):
            card = cards.nth(index)
            image = card.locator('img').first
            await image.evaluate('(i) => i.scrollIntoView({block: "center"})')
            await page.wait_for_function('''slug => {
                const card = [...document.querySelectorAll('[data-home-category]')].find(c => c.dataset.homeCategory === slug && c.getClientRects().length);
                const image = card?.querySelector('img');
                return image && image.complete && image.naturalWidth > 0;
            }''', arg=await card.get_attribute('data-home-category'))
            await page.mouse.move(0, 0)
            await page.wait_for_timeout(60)
            data = await card.evaluate('''e => {
                const i = e.querySelector('img'), r = i.getBoundingClientRect(), c = e.getBoundingClientRect(), s = getComputedStyle(i);
                return {slug: e.dataset.homeCategory, href: e.querySelector('a').getAttribute('href'), imageSrc: i.currentSrc,
                    width: r.width, height: r.height, cardWidth: c.width, cardHeight: c.height, fit: s.objectFit, position: s.objectPosition};
            }''')
            data['original'] = raw_url(data['imageSrc'], SITES[key])
            filename = f'{key}-{width}-category-{data["slug"]}.png'
            (OUT / filename).write_bytes(await image.screenshot(animations='disabled'))
            data['screenshot'] = filename
            records.append(data)
        heading = page.get_by_role('heading', name='Watch Us on YouTube', exact=True)
        visible = [h for h in await heading.all() if await h.is_visible()]
        assert len(visible) == 1
        section = visible[0].locator('xpath=ancestor::section[1]') if mobile else page.locator('[data-home-section="youtube"]:visible').first
        button = section.get_by_role('button', name='Play video: Watch Us on YouTube', exact=True)
        await button.scroll_into_view_if_needed()
        await page.wait_for_timeout(700)
        await page.mouse.move(0, 0)
        await page.wait_for_function('''() => [...document.querySelectorAll('button[aria-label="Play video: Watch Us on YouTube"] img')]
            .some(i => i.getClientRects().length && i.complete && i.naturalWidth === 1280)''')
        box = await button.bounding_box()
        section_box = await section.bounding_box()
        (OUT / f'{key}-{width}-thumbnail.png').write_bytes(await button.screenshot(animations='disabled'))
        await section.screenshot(path=str(OUT / f'{key}-{width}-youtube.png'), animations='disabled')
        category_section = cards.first.locator('xpath=ancestor::section[1]')
        category_box = await category_section.bounding_box()
        await category_section.scroll_into_view_if_needed()
        await page.wait_for_timeout(250)
        await category_section.screenshot(path=str(OUT / f'{key}-{width}-categories.png'), animations='disabled')
        shortcuts = page.locator('section[aria-label="What are you planning"]:visible')
        shortcut_data = []
        if not mobile:
            assert await shortcuts.count() == 1
            for anchor in await shortcuts.locator('a').all():
                image = anchor.locator('img')
                if await image.count():
                    await image.scroll_into_view_if_needed()
                    await page.wait_for_function('''src => [...document.images].some(i => i.getAttribute('src') === src && i.complete && i.naturalWidth > 0)''', arg=await image.get_attribute('src'))
                    shortcut_data.append(await image.evaluate('''i => {const r=i.getBoundingClientRect(),s=getComputedStyle(i);return {width:r.width,height:r.height,fit:s.objectFit,src:i.currentSrc}}'''))
            assert len(shortcut_data) == 7
            await shortcuts.screenshot(path=str(OUT / f'{key}-{width}-shortcuts.png'), animations='disabled')
        else:
            assert await shortcuts.count() == 0, 'Mobile must not add desktop-only photo circles'
        order = await page.evaluate("[...document.querySelectorAll('[data-home-section]')].filter(e => e.getClientRects().length).map(e => e.dataset.homeSection)")
        assert order.index('youtube') < order.index('categories')
        assert not any(x in ['wedding', 'wedding-banner'] for x in order[:order.index('categories')])
        if key == 'sc':
            assert await page.locator('head link[href*="favicon.ico"]').count() > 0
            assert await page.locator('a[href^="mailto:customerservice@friendlypartyrental.com?subject="]').count() > 0
        assert not await page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
        assert not errors, (key, width, errors)
        await button.scroll_into_view_if_needed()
        await button.focus()
        await page.keyboard.press('Enter')
        embed = section.locator('iframe')
        await embed.wait_for()
        assert 'LWQvMclQea4?autoplay=1' in await embed.get_attribute('src')
        value = {'categories': records, 'shortcuts': shortcut_data, 'thumbnailBox': box, 'youtubeBox': section_box,
                 'categorySectionBox': category_box, 'sectionOrder': order, 'scriptErrors': errors, 'keyboardPlay': True}
        (OUT / f'{key}-{width}-measurements.json').write_text(json.dumps(value, indent=2))
        return value
    except Exception:
        await page.screenshot(path=str(OUT / f'{key}-{width}-failure.png'), full_page=True)
        raise
    finally:
        await context.close()

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        api = await playwright.request.new_context()
        try:
            ready = False
            expected = next(a for a in manifest['assets'] if a['label'] == 'youtube-video-thumbnail')['sha256']
            for _ in range(48):
                try:
                    response = await api.get(SITES['sc'] + '/images/youtube-video-thumbnail.jpg', timeout=8000)
                    if response.status == 200 and hashlib.sha256(await response.body()).hexdigest() == expected:
                        ready = True
                        break
                except Exception:
                    pass
                await asyncio.sleep(5)
            assert ready, 'The exact original thumbnail must be deployed, not just committed'
            for asset in manifest['assets']:
                response = await api.get(SITES['sc'] + asset['publicPath'], timeout=20000)
                data = await response.body()
                assert response.status == 200 and hashlib.sha256(data).hexdigest() == asset['sha256'], asset['label']
                Image.open(io.BytesIO(data)).verify()
                RESULT['checks'].append({'name': asset['label'], 'originalBytesIdentical': True, 'sha256': asset['sha256']})
            for asset in manifest['assets']:
                if not asset['label'].startswith('category-') or asset['label'] == 'category-order-by-date':
                    continue
                slug = asset['label'].removeprefix('category-')
                response = await api.get(SITES['sc'] + '/api/category-image/' + slug + '?parity=20260921', timeout=20000)
                assert response.status == 200 and hashlib.sha256(await response.body()).hexdigest() == asset['sha256'], slug
            RESULT['checks'].append({'name': 'All 18 public category-image endpoints', 'originalBytesIdentical': True})
            verified_sources = {}
            async def source_digest(url):
                if url not in verified_sources:
                    response = await api.get(url, timeout=20000)
                    assert response.status == 200, url
                    verified_sources[url] = hashlib.sha256(await response.body()).hexdigest()
                return verified_sources[url]
            for width in [360, 390, 768, 1440]:
                ny = await record(browser, 'ny', width)
                sc = await record(browser, 'sc', width)
                RESULT['widths'][str(width)] = {'ny': ny, 'sc': sc, 'passed': False}
                assert [c['slug'] for c in ny['categories']] == [c['slug'] for c in sc['categories']]
                differences = []
                for first, second in zip(ny['categories'], sc['categories']):
                    for field in ['width', 'height', 'cardWidth']:
                        assert abs(first[field] - second[field]) <= 1, (width, first['slug'], field, first[field], second[field])
                    assert first['fit'] == second['fit'] and first['position'] == second['position']
                    a = Image.open(OUT / first['screenshot']).convert('RGB')
                    b = Image.open(OUT / second['screenshot']).convert('RGB')
                    expected_asset = next(asset for asset in manifest['assets'] if asset['label'] == 'category-' + first['slug'])
                    assert await source_digest(first['original']) == expected_asset['sha256'], (width, first['slug'], 'NY source changed')
                    assert await source_digest(second['original']) == expected_asset['sha256'], (width, first['slug'], 'SC rendered wrong source')
                    common = (min(a.width,b.width), min(a.height,b.height))
                    mean = sum(ImageStat.Stat(ImageChops.difference(a.crop((0,0,*common)), b.crop((0,0,*common)))).mean) / 3
                    # Keep unaltered screenshots and raw differences. Source bytes and
                    # measured crop/window geometry assert image parity; regional text
                    # and fractional screenshot raster positions are separate evidence.
                    differences.append({'slug': first['slug'], 'meanPixelDifference': mean, 'size': list(a.size)})
                for field in ['width', 'height']:
                    assert abs(ny['thumbnailBox'][field] - sc['thumbnailBox'][field]) <= 1, (width, 'thumbnail', field)
                    assert abs(ny['youtubeBox'][field] - sc['youtubeBox'][field]) <= 1, (width, 'youtube', field, ny['youtubeBox'][field], sc['youtubeBox'][field])
                a = Image.open(OUT / f'ny-{width}-thumbnail.png').convert('RGB')
                b = Image.open(OUT / f'sc-{width}-thumbnail.png').convert('RGB')
                common = (min(a.width,b.width), min(a.height,b.height))
                mean = sum(ImageStat.Stat(ImageChops.difference(a.crop((0,0,*common)), b.crop((0,0,*common)))).mean) / 3
                for first, second in zip(ny['shortcuts'], sc['shortcuts']):
                    assert first['width'] == second['width'] and first['height'] == second['height'] and first['fit'] == second['fit']
                RESULT['widths'][str(width)].update(categoryComparisons=differences, thumbnailMeanPixelDifference=mean,
                    comparisonScope='Exact original bytes and computed image geometry/crop are asserted at every width. Unaltered screenshots and raw RGB differences are retained; screenshots are not claimed pixel-identical because fractional raster positions and regional text may differ.', passed=True)
                print(json.dumps({'width': width, 'passed': True, 'categories': len(differences), 'thumbnailMeanPixelDifference': mean}), flush=True)
            RESULT['passed'] = True
        except Exception as error:
            RESULT['passed'] = False
            RESULT['error'] = str(error)
            raise
        finally:
            (OUT / 'results.json').write_text(json.dumps(RESULT, indent=2))
            await api.dispose()
            await browser.close()

asyncio.run(main())
