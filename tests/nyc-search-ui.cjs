// Exercises real rendered NYC React headers. Fixtures are browser intercepts only.
// No customer, order, price, stock, email or payment writes are permitted.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const origin = process.env.NYC_QA_ORIGIN || 'http://127.0.0.1:3000'
assert.ok(['http://127.0.0.1:3000', 'https://friendlypartyrentalnyc.com'].includes(origin), 'NYC-only QA origin')
if (origin.startsWith('https:')) assert.equal(process.env.NYC_QA_ALLOW_LIVE_READS, '1')
const out = process.env.NYC_QA_OUTPUT || '/tmp/nyc-search-proof'
fs.mkdirSync(out, { recursive: true })
const report = { origin, startedAt: new Date().toISOString(), tests: [], fixtures: 'Browser-only intercepted search responses; never saved', writesSent: 0, blockedWrites: [], publicStatus: null }
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function until(fn, label, timeout = 12000) {
  const deadline = Date.now() + timeout
  let last
  do {
    try { const value = await fn(); if (value) return value } catch (error) { last = error }
    await sleep(100)
  } while (Date.now() < deadline)
  throw new Error(label + (last ? ': ' + last.message : ' timed out'))
}
function check(name, actual) {
  assert.ok(actual, name)
  report.tests.push({ name, passed: true })
}
const fixture = (id, name = 'Browser-only ' + id, cost = 12.5) => ({ id: 'qa-' + id, slug: 'qa-fixture-' + id, name, cost, category: { name: 'Browser QA only' } })
let activePage
;(async () => {
  const browser = await chromium.launch({ headless: true })
  try {
    for (const width of [1440, 390, 320, 767]) {
      const mobile = width < 768
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
      const page = activePage = await context.newPage()
      page.setDefaultTimeout(15000)
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      await context.route('**/*', async route => {
        const request = route.request()
        if (!['GET', 'HEAD'].includes(request.method())) {
          report.blockedWrites.push({ method: request.method(), path: new URL(request.url()).pathname })
          return route.fulfill({ status: 204, body: '' })
        }
        if (request.isNavigationRequest() && new URL(request.url()).origin !== origin) return route.abort('blockedbyclient')
        return route.continue()
      })
      const response = await page.goto(origin + '/', { waitUntil: 'domcontentloaded' })
      check(width + ' homepage HTTP 200', response.status() === 200)
      await until(() => mobile ? page.getByRole('button', { name: 'Open menu', exact: true }).isVisible() : page.getByRole('search', { name: 'Find rental equipment' }).isVisible(), 'header')
      await sleep(750)
      check(width + ' no sideways overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      const logos = await page.locator('header:visible img[src*="/brand/"]').evaluateAll(imgs => imgs.map(img => ({ src: img.getAttribute('src'), loaded: img.complete && img.naturalWidth > 0, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, width: img.getBoundingClientRect().width, height: img.getBoundingClientRect().height })))
      check(width + ' full approved logo decodes at original aspect ratio', logos.length > 0 && logos.every(img => img.loaded && img.naturalWidth === 1774 && img.naturalHeight === 887 && Math.abs(img.width / img.height - 2) < 0.02))
      await page.screenshot({ path: path.join(out, width + '-homepage.png'), fullPage: false })
      if (width === 1440) {
        const status = await context.request.get(origin + '/api/payments/status')
        assert.equal(status.status(), 200)
        report.publicStatus = await status.json()
        check('Production charges remain disabled during search-only repair', report.publicStatus.onlinePaymentsAvailable === false)
      }
      if (mobile) {
        const menu = page.getByRole('button', { name: 'Open menu', exact: true })
        const priorOverflow = await page.evaluate(() => document.body.style.overflow)
        await menu.click()
        const dialog = page.getByRole('dialog', { name: 'Mobile navigation', exact: true })
        await dialog.waitFor({ state: 'visible' })
        check(width + ' menu native modal and initial close focus', await dialog.evaluate(el => el.matches(':modal') && el.contains(document.activeElement) && document.activeElement.getAttribute('aria-label') === 'Close menu'))
        check(width + ' menu body scroll locked', await page.evaluate(() => document.body.style.overflow === 'hidden'))
        const controls = dialog.locator('a[href], button')
        await controls.last().focus(); await page.keyboard.press('Tab')
        check(width + ' menu Tab wraps', await controls.first().evaluate(el => el === document.activeElement))
        await page.keyboard.press('Shift+Tab')
        check(width + ' menu Shift+Tab wraps', await controls.last().evaluate(el => el === document.activeElement))
        check(width + ' background cannot take focus', await page.evaluate(() => { document.querySelector('header button[aria-label="Open menu"]').focus(); return document.querySelector('dialog').contains(document.activeElement) }))
        await page.screenshot({ path: path.join(out, width + '-menu.png') })
        await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' })
        check(width + ' Escape restores menu button focus', await menu.evaluate(el => el === document.activeElement))
        check(width + ' Escape restores scrolling', await page.evaluate(value => document.body.style.overflow === value, priorOverflow))
        await menu.click(); await dialog.waitFor({ state: 'visible' })
        await page.mouse.click(width - 4, 200); await dialog.waitFor({ state: 'detached' })
        check(width + ' outside menu click dismisses', true)
        await menu.click(); await dialog.waitFor({ state: 'visible' })
        await page.evaluate(() => window.dispatchEvent(new Event('open-mobile-search')))
        await page.getByRole('dialog', { name: 'Search rental items', exact: true }).waitFor({ state: 'visible' })
        check(width + ' external search trigger replaces menu, never stacks', await page.locator('dialog[open]').count() === 1)
      }
      const scope = mobile ? page.getByRole('dialog', { name: 'Search rental items', exact: true }) : page.getByRole('search', { name: 'Find rental equipment' })
      const input = scope.getByRole('searchbox', { name: 'Search rental items', exact: true })
      if (mobile) check(width + ' search input receives focus', await input.evaluate(el => el === document.activeElement))
      let mode = 'http-error', calls = 0
      await context.route(url => url.pathname === '/api/items' && url.searchParams.has('search'), async route => {
        calls++
        const q = new URL(route.request().url()).searchParams.get('search')
        if (mode === 'http-error') return route.fulfill({ status: 503, json: { error: 'Browser-only outage simulation' } })
        if (mode === 'network-error') return route.abort('failed')
        if (mode === 'bad-json') return route.fulfill({ status: 200, contentType: 'application/json', body: '{broken' })
        if (mode === 'empty') return route.fulfill({ json: [] })
        if (mode === 'timeout') { await sleep(11000); return route.fulfill({ json: [] }).catch(() => {}) }
        if (q === 'old-query') { await sleep(800); return route.fulfill({ json: [fixture('old')] }).catch(() => {}) }
        if (q === 'new-query') return route.fulfill({ json: [fixture('new')] })
        return route.fulfill({ json: [fixture('one'), { ...fixture('invalid'), slug: null }, fixture('two', 'Browser-only invalid price', 'not-a-number')] })
      })
      await input.fill('t'); await sleep(350)
      check(width + ' one character does not search', calls === 0)
      await input.fill('rentals')
      await until(() => scope.getByRole('alert').isVisible(), 'HTTP error UI')
      check(width + ' HTTP failures are recoverable, not empty results', !(await scope.innerText()).includes('No rentals found') && !(await scope.innerText()).includes('No items found'))
      mode = 'results'; await scope.getByRole('button', { name: 'Try again', exact: true }).click()
      const list = scope.getByRole('list', { name: 'Rental search results' })
      await list.waitFor({ state: 'visible' })
      const links = list.getByRole('link')
      check(width + ' retry loads valid results and filters unusable slugs', await links.count() === 2)
      const hrefs = await links.evaluateAll(els => els.map(el => el.getAttribute('href')))
      check(width + ' results link to actual local item routes, not #', hrefs.join('|') === '/items/qa-fixture-one|/items/qa-fixture-two')
      check(width + ' invalid price does not crash or invent a price', (await list.innerText()).includes('$12.50') && !(await links.nth(1).innerText()).includes('$'))
      if (!mobile) {
        await input.focus(); await page.keyboard.press('ArrowDown')
        check('Desktop ArrowDown focuses first result', await links.first().evaluate(el => el === document.activeElement))
        await page.keyboard.press('ArrowUp')
        check('Desktop ArrowUp returns to input', await input.evaluate(el => el === document.activeElement))
        await page.keyboard.press('ArrowDown'); await page.keyboard.press('Escape')
        await list.waitFor({ state: 'detached' })
        check('Desktop Escape closes results and restores input focus', await input.evaluate(el => el === document.activeElement))
      }
      mode = 'network-error'; await input.fill('network')
      await until(() => scope.getByRole('alert').isVisible(), 'network error UI')
      check(width + ' network error shows retry', await scope.getByRole('button', { name: 'Try again', exact: true }).isVisible())
      mode = 'bad-json'; await input.fill('json-error')
      await sleep(450); await until(() => scope.getByRole('alert').isVisible(), 'JSON error UI')
      check(width + ' malformed response is an error', true)
      mode = 'empty'; await input.fill('no-matches')
      await until(async () => /No (?:items|rentals) found/.test(await scope.innerText()), 'empty state')
      check(width + ' genuine empty response has no error', await scope.getByRole('alert').count() === 0)
      mode = 'results'; await input.fill('old-query')
      await sleep(350); await input.fill('new-query')
      await until(async () => (await scope.innerText()).includes('Browser-only new'), 'new results')
      await sleep(1000)
      check(width + ' slower old results cannot overwrite new results', !(await scope.innerText()).includes('Browser-only old'))
      if (width === 390) {
        mode = 'timeout'; await input.fill('timeout')
        await until(() => scope.getByRole('alert').isVisible(), 'timeout becomes error', 12500)
        check('Mobile stalled search times out with retry', await scope.getByRole('button', { name: 'Try again', exact: true }).isVisible())
      }
      if (mobile) {
        await page.keyboard.press('Escape'); await scope.waitFor({ state: 'detached' })
        check(width + ' search Escape closes and unlocks page', await page.evaluate(() => document.body.style.overflow !== 'hidden'))
        await page.getByRole('button', { name: 'Open menu', exact: true }).click()
        await page.setViewportSize({ width: 1200, height: 900 })
        await until(async () => await page.locator('dialog[open]').count() === 0, 'desktop breakpoint closes panel')
        check(width + ' desktop breakpoint restores scroll', await page.evaluate(() => document.body.style.overflow !== 'hidden'))
        await page.setViewportSize({ width, height: 900 })
        await page.getByRole('button', { name: 'Open menu', exact: true }).click()
        await page.getByRole('dialog').locator('a[href="/category/tent-rentals"]').first().click()
        await page.waitForURL(origin + '/category/tent-rentals')
        check(width + ' menu category navigation closes panel', await page.locator('dialog[open]').count() === 0)
        check(width + ' category page loads without crash', !(await page.locator('body').innerText()).includes('Application error'))
      } else {
        await input.fill('blur-test'); await list.waitFor({ state: 'visible' })
        await page.locator('header a:visible').first().focus()
        await list.waitFor({ state: 'detached' })
        check('Desktop focus exit closes dropdown', true)
      }
      check(width + ' no browser JavaScript exceptions', errors.length === 0)
      check(width + ' final page has no horizontal overflow', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
      await context.close()
    }
    report.status = 'passed'
  } catch (error) {
    report.status = 'failed'; report.error = error.stack
    if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: path.join(out, 'failure.png') }).catch(() => {})
    throw error
  } finally {
    report.finishedAt = new Date().toISOString()
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2))
    console.log(JSON.stringify({ status: report.status, assertionsPassed: report.tests.length, error: report.error, origin, writesSent: report.writesSent }))
    await browser.close()
  }
})().catch(error => { console.error(error); process.exitCode = 1 })
