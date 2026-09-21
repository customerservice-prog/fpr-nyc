"""Live Greenville UI checks with synthetic browser storage and ALL writes blocked.
Never clicks Pay, creates an order, creates a payment intent, or enters card data.
"""
import asyncio
import json
import re
from pathlib import Path
from playwright.async_api import async_playwright

BASE = 'https://friendlypartyrentalsc.com'
OUTPUT = Path('test-results')
OUTPUT.mkdir(exist_ok=True)
RESULTS = []

async def new_context(browser, *, mobile=False, old_pickup=False):
    context = await browser.new_context(
        viewport={'width': 390 if mobile else 1440, 'height': 844 if mobile else 1000},
        is_mobile=mobile, has_touch=mobile, locale='en-US', timezone_id='America/New_York',
    )
    blocked_writes = []
    async def prevent_writes(route):
        request = route.request
        if request.method not in ('GET', 'HEAD', 'OPTIONS'):
            blocked_writes.append({'method': request.method, 'url': request.url})
            await route.fulfill(status=403, content_type='application/json', body='{"error":"Automated QA blocks all writes"}')
        else:
            await route.continue_()
    await context.route('**/*', prevent_writes)
    seed = {
        'method': 'pickup' if old_pickup else 'delivery',
        'items': [{'id': 'sc-delivery-qa-synthetic-item', 'name': 'QA rental fixture', 'price': 163, 'quantity': 1, 'maxQuantity': 1}],
        'checkout': {'firstName': 'QA', 'lastName': 'Delivery Test', 'email': 'testcustomer@example.com', 'phone': '202-555-0100', 'eventAddress': '200 East Broad Street', 'eventCity': 'Greenville', 'eventState': 'SC', 'eventZip': '29601', 'deliveryType': 'pickup' if old_pickup else 'delivery', 'specialRequests': [], 'damageWaiver': False},
    }
    await context.add_init_script('''(() => {
      if (location.origin !== 'https://friendlypartyrentalsc.com') return;
      if (sessionStorage.getItem('sc_delivery_qa_seeded')) return;
      const seed = ''' + json.dumps(seed) + ''';
      localStorage.setItem('fpr_cart', JSON.stringify(seed.items));
      localStorage.setItem('fpr_event_date', 'Nov 20, 2026');
      localStorage.setItem('fpr_delivery_type', seed.method);
      localStorage.setItem('fpr_bookingMethod', seed.method);
      localStorage.setItem('fpr_event_time_slot', seed.method === 'pickup' ? 'Warehouse appointment' : '10:00 AM - 12:00 PM');
      localStorage.setItem('fpr_pickup_time_slot', 'Next morning');
      sessionStorage.setItem('checkout_data', JSON.stringify(seed.checkout));
      sessionStorage.setItem('sc_delivery_qa_seeded', '1');
    })();''')
    return context, blocked_writes

async def assert_ready(page):
    button = page.get_by_role('button', name=re.compile(r'^Pay \$'))
    await button.wait_for(state='visible', timeout=35000)
    assert await button.is_enabled(), 'Pay must become enabled only after all quote/settings requests succeed'
    label = page.get_by_text('Estimated Delivery Fee', exact=True)
    text = await label.locator('..').inner_text()
    assert '$29.99' in text, text
    assert 'street-address or driving-distance measurement' in await page.locator('body').inner_text()
    return {'deliveryFeeRow': text, 'paymentButton': await button.inner_text()}

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        try:
            for mobile in (False, True):
                context, blocked = await new_context(browser, mobile=mobile)
                page = await context.new_page()
                await page.goto(BASE + '/checkout/payment', wait_until='domcontentloaded')
                evidence = await assert_ready(page)
                assert await page.evaluate("localStorage.getItem('fpr_pickup_time_slot')") == 'Next morning', 'Crew collection schedule must remain available'
                assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'Unexpected horizontal overflow'
                name = 'mobile' if mobile else 'desktop'
                await page.screenshot(path=str(OUTPUT / ('sc-delivery-' + name + '.png')), full_page=True)
                assert not any('/api/orders' in item['url'] or '/api/checkout' in item['url'] for item in blocked), 'UI must not even attempt order or payment creation before Pay'
                RESULTS.append({'case': name + ' normal delivery payment review', 'passed': True, **evidence})
                await context.close()

            context, blocked = await new_context(browser)
            failed = True
            async def quote_failure(route):
                if failed:
                    await route.fulfill(status=503, content_type='application/json', body='{"error":"Delivery pricing is unavailable for this test. Please retry."}')
                else:
                    await route.continue_()
            await context.route('**/api/delivery-fee?*', quote_failure)
            page = await context.new_page()
            await page.goto(BASE + '/checkout/payment', wait_until='domcontentloaded')
            error_button = page.get_by_role('button', name='Resolve pricing to continue', exact=True)
            await error_button.wait_for(state='visible', timeout=35000)
            assert await error_button.is_disabled(), 'Lookup failure must block payment'
            assert 'Unavailable' in await page.get_by_text('Estimated Delivery Fee', exact=True).locator('..').inner_text()
            await page.screenshot(path=str(OUTPUT / 'sc-delivery-lookup-failure.png'), full_page=True)
            await page.wait_for_function("[...document.querySelectorAll('button')].some(b => b.textContent.includes('Retry delivery quote and pricing') && !b.disabled)")
            failed = False
            await page.get_by_role('button', name='Retry delivery quote and pricing', exact=True).click()
            await assert_ready(page)
            RESULTS.append({'case': 'failed delivery lookup blocks payment and retry recovers', 'passed': True})
            await context.close()

            context, blocked = await new_context(browser)
            async def delayed_quote(route):
                await asyncio.sleep(3)
                await route.continue_()
            await context.route('**/api/delivery-fee?*', delayed_quote)
            page = await context.new_page()
            await page.goto(BASE + '/checkout/payment', wait_until='domcontentloaded')
            pending_button = page.get_by_role('button', name='Calculating your total...', exact=True)
            await pending_button.wait_for(state='visible', timeout=20000)
            assert await pending_button.is_disabled(), 'Pending quote must block payment'
            await assert_ready(page)
            RESULTS.append({'case': 'pending delivery quote blocks payment until loaded', 'passed': True})
            await context.close()

            context, blocked = await new_context(browser, old_pickup=True)
            page = await context.new_page()
            await page.goto(BASE + '/category/table-chair-rentals?date=2026-11-20', wait_until='domcontentloaded')
            await page.wait_for_function("localStorage.getItem('fpr_delivery_type') === 'delivery' && localStorage.getItem('fpr_bookingMethod') === 'delivery'")
            assert await page.evaluate("sessionStorage.getItem('checkout_data')") is None
            assert await page.get_by_role('button', name=re.compile(r"I'll Pick Up", re.I)).count() == 0
            assert await page.evaluate("JSON.parse(localStorage.getItem('fpr_cart')).length") == 1
            RESULTS.append({'case': 'old pickup category session becomes delivery and keeps cart', 'passed': True})
            await context.close()

            context, blocked = await new_context(browser, old_pickup=True)
            page = await context.new_page()
            await page.goto(BASE + '/checkout/payment', wait_until='domcontentloaded')
            await page.wait_for_url(BASE + '/checkout', timeout=35000)
            assert await page.evaluate("localStorage.getItem('fpr_delivery_type')") == 'delivery'
            assert await page.evaluate("sessionStorage.getItem('checkout_data')") is None
            RESULTS.append({'case': 'old pickup payment session must revisit delivery checkout', 'passed': True})
            await context.close()
        finally:
            await browser.close()
            (OUTPUT / 'sc-delivery-browser.json').write_text(json.dumps({'cases': RESULTS, 'writesBlocked': True, 'paymentSubmitted': False}, indent=2))
            print(json.dumps(RESULTS, indent=2))

asyncio.run(main())
