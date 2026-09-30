const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

const origin = (process.env.NYC_HELP_QA_ORIGIN || 'http://127.0.0.1:3000').replace(/\/$/, '')
const local = new URL(origin).hostname === '127.0.0.1'
if (!local && origin !== 'https://friendlypartyrentalnyc.com') throw new Error('Only local disposable QA or the NYC live origin is allowed')
const output = path.resolve(process.env.NYC_HELP_QA_OUTPUT || 'nyc-help-proof')
fs.mkdirSync(output, { recursive: true })
const report = { origin, checkedAt: new Date().toISOString(), mode: local ? 'isolated-local-with-mocked-posts' : 'read-only-live', checks: [], screenshots: [] }

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  const errors = []
  async function contextFor(viewport, javaScriptEnabled = true) {
    const context = await browser.newContext({ viewport, javaScriptEnabled })
    // No write may reach a real service. Local contact success/error tests are mocked.
    await context.route('**/*', route => {
      const request = route.request()
      if (!['GET', 'HEAD'].includes(request.method())) return route.abort()
      if (new URL(request.url()).origin !== origin) return route.abort()
      return route.continue()
    })
    context.on('page', page => page.on('pageerror', error => errors.push(error.message)))
    return context
  }
  async function screenshot(page, name) {
    await page.screenshot({ path: path.join(output, name), fullPage: true })
    report.screenshots.push(name)
  }
  async function noOverflow(page) {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'horizontal overflow')
  }
  try {
    for (const [label, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }], ['small-mobile', { width: 320, height: 740 }]]) {
      const context = await contextFor(viewport)
      const page = await context.newPage()
      const faqResponse = await page.goto(origin + '/frequently_asked_questions', { waitUntil: 'networkidle' })
      assert.equal(faqResponse.status(), 200)
      const faq = page.locator('[data-nyc-customer-help="faq"]')
      await faq.waitFor()
      const schema = await faq.locator('script[type="application/ld+json"]').textContent()
      const questions = JSON.parse(schema).mainEntity
      assert.equal(await faq.locator('details').count(), questions.length)
      assert.ok(questions.length >= 16)
      for (let i = 0; i < questions.length; i++) {
        const details = faq.locator('details').nth(i)
        assert.equal((await details.locator('summary').innerText()).trim(), questions[i].name)
        assert.equal((await details.locator('div').textContent()).trim(), questions[i].acceptedAnswer.text)
      }
      const first = faq.locator('details').first()
      await first.locator('summary').focus()
      await page.keyboard.press('Enter')
      assert.ok(await first.evaluate(el => el.open), 'FAQ must open with keyboard')
      assert.ok(await first.locator('div').isVisible(), 'FAQ answer must be visible')
      await faq.locator('details').nth(1).locator('summary').click()
      assert.equal(await first.evaluate(el => el.open), false, 'only one question per topic open')
      await noOverflow(page)
      await screenshot(page, 'faq-' + label + '.png')
      report.checks.push(label + ': FAQ questions, visible answers, keyboard, topic groups, schema parity, no overflow')
      const contactResponse = await page.goto(origin + '/contact_us', { waitUntil: 'networkidle' })
      assert.equal(contactResponse.status(), 200)
      const contact = page.locator('[data-nyc-customer-help="contact"]')
      await contact.waitFor()
      assert.match(await contact.locator('[data-testid="nyc-service-area"]').innerText(), /Serving Riverdale, selected Bronx neighborhoods & Lower Westchester/)
      const map = new URL(await contact.locator('iframe').getAttribute('src'))
      assert.equal(map.searchParams.get('q'), 'Riverdale, Bronx, New York')
      assert.equal(await contact.locator('a[href=""]').count(), 0)
      assert.equal(await contact.locator('a[href="True"]').count(), 0)
      const profile = contact.getByRole('link', { name: 'View Friendly Party Rental NYC on Google' })
      if (await profile.count()) assert.match(await profile.getAttribute('href'), /^https:\/\/(www\.google\.com|google\.com|maps\.google\.com|maps\.app\.goo\.gl|g\.page)\//)
      await page.waitForFunction(() => !!document.querySelector('#contact-date')?.getAttribute('min'))
      const day = await page.evaluate(() => {
        const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
        return ['year', 'month', 'day'].map(type => parts.find(p => p.type === type).value).join('-')
      })
      assert.equal(await page.locator('#contact-date').getAttribute('min'), day)
      await noOverflow(page)
      await screenshot(page, 'contact-' + label + '.png')
      report.checks.push(label + ': contact service area, Bronx map, no broken Google link, New York date, no overflow')
      await context.close()
    }
    const noJs = await contextFor({ width: 390, height: 844 }, false)
    const staticPage = await noJs.newPage()
    await staticPage.goto(origin + '/frequently_asked_questions', { waitUntil: 'networkidle' })
    const firstNative = staticPage.locator('[data-nyc-customer-help="faq"] details').first()
    const summary = firstNative.locator('summary')
    await summary.scrollIntoViewIfNeeded()
    const box = await summary.boundingBox()
    assert.ok(box)
    // Native wheel scrolling mirrors moving content away from the fixed bottom
    // toolbar. Do not force clicks through overlays or alter the DOM under test.
    await staticPage.mouse.wheel(0, box.y + box.height / 2 - 422)
    await staticPage.waitForTimeout(250)
    await screenshot(staticPage, 'faq-no-javascript-before-click.png')
    await summary.click()
    assert.ok(await firstNative.locator('div').isVisible(), 'answers must open with JavaScript disabled')
    await screenshot(staticPage, 'faq-no-javascript.png')
    report.checks.push('FAQ opens and shows answer with JavaScript disabled after ordinary native scrolling')
    await noJs.close()

    if (local) {
      const context = await contextFor({ width: 390, height: 844 })
      const page = await context.newPage()
      let mock = { status: 202, body: { success: true, saved: true, notificationSent: false } }
      let posts = 0
      await context.route(origin + '/api/contact', async route => {
        if (route.request().method() !== 'POST') return route.continue()
        posts++
        const sent = route.request().postDataJSON()
        assert.ok(sent.elapsedMs >= 0)
        await new Promise(resolve => setTimeout(resolve, 100))
        await route.fulfill({ status: mock.status, contentType: 'application/json', body: typeof mock.body === 'string' ? mock.body : JSON.stringify(mock.body) })
      })
      async function fill() {
        await page.goto(origin + '/contact_us', { waitUntil: 'networkidle' })
        await page.locator('#contact-name').fill('NYC QA Example')
        await page.locator('#contact-email').fill('qa@example.invalid')
        await page.locator('#contact-message').fill('Disposable browser test; no real event or inquiry.')
        const submit = page.getByRole('button', { name: 'Send inquiry', exact: true })
        await submit.waitFor()
        for (let i = 0; i < 20 && !(await submit.isEnabled()); i++) await page.waitForTimeout(100)
        assert.ok(await submit.isEnabled())
        return submit
      }
      let submit = await fill()
      await submit.evaluate(el => { el.click(); el.click() })
      await page.locator('[data-testid="contact-receipt"]').waitFor()
      assert.equal(posts, 1, 'double click must result in one contact request')
      assert.match(await page.locator('[data-testid="contact-receipt"]').innerText(), /email notification was not delivered/)
      assert.equal(await page.locator('form').count(), 0, 'completed form must not stay open')
      await page.getByRole('button', { name: 'Start a different inquiry' }).click()
      assert.equal(await page.locator('#contact-name').inputValue(), '')
      report.checks.push('Mocked saved-but-email-failed: visible receipt, direct contact, no accidental duplicate and explicit reset')
      for (const scenario of [
        { name: 'received', status: 200, body: { success: true, saved: true, notificationSent: true }, success: true },
        { name: 'bot-success-without-save', status: 200, body: { success: true }, success: false },
        { name: 'server-failure', status: 500, body: { error: 'Failed' }, success: false },
        { name: 'rate-limited', status: 429, body: { error: 'Wait' }, success: false },
        { name: 'malformed-response', status: 200, body: '<html>Not JSON</html>', success: false },
      ]) {
        mock = scenario
        submit = await fill()
        await submit.click()
        if (scenario.success) await page.locator('[data-testid="contact-receipt"]').waitFor()
        else {
          await page.locator('[data-testid="contact-submit-error"]').waitFor()
          assert.equal(await page.locator('[data-testid="contact-receipt"]').count(), 0)
          assert.equal(await page.locator('#contact-name').inputValue(), 'NYC QA Example')
          assert.equal(await page.locator('#contact-message').inputValue(), 'Disposable browser test; no real event or inquiry.')
        }
        report.checks.push('Mocked contact response: ' + scenario.name)
      }
      await context.close()
    }
    assert.deepEqual(errors, [], 'unexpected browser JavaScript errors')
    report.checks.push('No browser JavaScript errors. No real forms, emails, orders or payments submitted.')
    report.success = true
  } finally {
    report.browserErrors = errors
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2))
    await browser.close()
  }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
