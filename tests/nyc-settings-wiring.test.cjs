const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const settingsSource = fs.readFileSync('app/admin/settings/page.tsx', 'utf8')

const SETTINGS_LINKS = {
  'Company Info': '/admin/settings/company-info',
  'Email Delivery': '/admin/settings/email-delivery',
  'Google Search Visibility': '/admin/settings/search-visibility',
  'Time Zone': '/admin/settings/time-zone',
  'Routing Settings': '/admin/settings/routing-settings',
  'Google Integration': '/admin/settings/google-integration',
  'QuickBooks Online': '/admin/settings/quickbooks-online',
  'Mailchimp': '/admin/settings/mailchimp',
  'AWeber': '/admin/settings/aweber',
  'Constant Contact': '/admin/settings/constant-contact',
  'Text Messaging': '/admin/settings/text-messaging',
  'Text Logs': '/admin/settings/text-logs',
  'Tax Rate': '/admin/settings/tax-rate',
  'Misc Settings': '/admin/settings/misc-settings',
  'API Info': '/admin/settings/api-info',
  'Users': '/admin/settings/users',
  'System Setup': '/admin/settings/system-setup',
  'System Settings': '/admin/settings/system-settings',
  'Locations': '/admin/settings/locations',
  'Company Types': '/admin/settings/company-types',
  'Company Roles': '/admin/settings/company-roles',
  'HighLevel Connect': '/admin/settings/highlevel-connect',
  'Reminders': '/admin/settings/reminders',
  'Order Options': '/admin/settings/order-options',
  'References': '/admin/settings/references',
  'Setup Surfaces': '/admin/settings/setup-surfaces',
  'Coupons': '/admin/settings/coupons',
  'Service Areas': '/admin/settings/service-areas',
  'Closed Dates': '/admin/settings/closed-dates',
  'Misc Order Settings': '/admin/settings/order-options',
  'Loyalty & Credit Types': '/admin/settings/loyalty-credit-types',
  'General Documents': '/admin/settings/general-documents',
  'Source Code': '/admin/settings/source-code',
  'Setup Surveys': '/admin/settings/setup-surveys',
  'Automatic Messages': '/admin/settings/automatic-messages',
  'Automatic Text Messaging': '/admin/settings/automatic-text-messaging',
  'Text Message Templates': '/admin/settings/text-message-templates',
  'Email Templates for Orders': '/admin/settings/email-templates-orders',
  'Email Templates for Marketing': '/admin/settings/email-templates-marketing',
  'FPRMail': '/admin/settings/ersmail',
  'Contract Options': '/admin/settings/contract-options',
  'Categories': '/admin/categories',
  'Items': '/admin/items',
  'Sorting': '/admin/settings/sorting',
  'Schedule Profiles': '/admin/settings/schedule-profiles',
  'Bulk Pricing': '/admin/settings/bulk-pricing',
  'Addons': '/admin/settings/addons',
  'Product Sharing': '/admin/settings/product-sharing',
  'Cost of Goods': '/admin/settings/cost-of-goods',
  'Register Setup': '/admin/settings/register-setup',
  'Auto Charge': '/admin/settings/auto-charge',
  'Recurring Profiles': '/admin/settings/recurring-profiles',
  'Wedding Packages': '/admin/wedding-packages',
  'Adjustments': '/admin/settings/adjustments',
  'Deposit Rules': '/admin/settings/deposit-rules',
  'Price Rule Sets': '/admin/settings/pricing-tiers',
  'Special Request Fees': '/admin/settings/special-request-fees',
  'Availability Rule Sets': '/admin/settings/availability-rule-sets',
  'Website Pages': '/admin/settings/website-pages',
  'Visual Builder': '/admin/settings/visual-builder',
  'General Images': '/admin/settings/general-images',
  'Gallery': '/gallery',
  'Navigation Editor': '/admin/settings/navigation-editor',
  'Premium Features': '/admin/settings/premium-features',
  'Responsive Editor': '/admin/settings/responsive-editor',
  'Conversion Booster': '/admin/settings/conversion-booster',
}

function pageFile(route) {
  if (route === '/gallery') return 'app/(public)/gallery/page.tsx'
  return 'app' + route + '/page.tsx'
}

test('every NYC Settings menu item is linked to a real page', () => {
  for (const [label, route] of Object.entries(SETTINGS_LINKS)) {
    assert.ok(settingsSource.includes(label), 'Settings is missing label: ' + label)
    assert.ok(settingsSource.includes(route), label + ' is not linked to ' + route)
    assert.ok(fs.existsSync(pageFile(route)), label + ' points to a missing page: ' + pageFile(route))
  }
})

test('Settings pages do not contain dead navigation controls', () => {
  const uniqueRoutes = [...new Set(Object.values(SETTINGS_LINKS))]
  for (const route of uniqueRoutes) {
    const file = pageFile(route)
    const source = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(source, /href\s*=\s*["']#["']/, file + ' contains href="#"')
    assert.doesNotMatch(source, /onClick\s*=\s*\{\(\)\s*=>\s*\{\s*\}\}/, file + ' contains an empty click handler')
  }
})

test('literal API calls from Settings pages resolve to API route files', () => {
  const uniqueRoutes = [...new Set(Object.values(SETTINGS_LINKS))]
  for (const route of uniqueRoutes) {
    const file = pageFile(route)
    const source = fs.readFileSync(file, 'utf8')
    const matches = [...source.matchAll(/fetch\(\s*(['"`])([^'"`]+)\1/g)]
    for (const match of matches) {
      let endpoint = match[2]
      if (!endpoint.startsWith('/api/')) continue
      if (endpoint.includes('${')) continue
      endpoint = endpoint.split('?')[0]
      const routeFile = 'app' + endpoint + '/route.ts'
      assert.ok(fs.existsSync(routeFile), file + ' calls missing API route ' + endpoint)
    }
  }
})

test('staff Settings are backed by real role and driver-profile enforcement', () => {
  const users = fs.readFileSync('app/admin/settings/users/page.tsx', 'utf8')
  const api = fs.readFileSync('app/api/admin/settings/users/route.ts', 'utf8')
  const proxy = fs.readFileSync('proxy.ts', 'utf8')
  const nav = fs.readFileSync('components/admin/AdminNav.tsx', 'utf8')
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8')
  assert.match(users, /Staff Security Hub/)
  assert.match(users, /STAFF_ROLE_OPTIONS/)
  assert.match(api, /export async function PATCH/)
  assert.match(api, /validateDriverProfile/)
  assert.match(schema, /driverProfileId String\? @unique/)
  assert.match(schema, /staffUser User\? @relation\("DriverStaffUser"\)/)
  assert.match(proxy, /hasStaffPermission/)
  assert.match(nav, /hasStaffPermission/)
})

test('General Images supports the same tagging metadata as the production library', () => {
  const page = fs.readFileSync('app/admin/settings/general-images/page.tsx', 'utf8')
  const api = fs.readFileSync('app/api/admin/general-images/route.ts', 'utf8')
  const schema = fs.readFileSync('prisma/schema.prisma', 'utf8')
  for (const field of ['seasonTags','categoryTags','eventTypeTags','brandTags']) {
    assert.ok(page.includes(field), 'General Images UI missing ' + field)
    assert.ok(schema.includes(field + ' String[]'), 'GeneralImage schema missing ' + field)
  }
  assert.match(api, /searchParams\.get\('season'\)/)
})

test('legacy delivery, pickup and exact-time request fees stay out of public checkout', () => {
  const helper = fs.readFileSync('lib/publicSpecialRequestFees.ts', 'utf8')
  const publicApi = fs.readFileSync('app/api/special-request-fees/route.ts', 'utf8')
  assert.match(helper, /isLegacySchedulingSpecialRequestFee/)
  assert.match(publicApi, /isLegacySchedulingSpecialRequestFee/)
})
