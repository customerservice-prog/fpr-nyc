export function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export interface ReportItem {
  title: string
  slug: string
  description: string
  category: string
  keywords: string[]
  implemented: boolean
}

export const CATEGORY_ORDER: string[] = [
  'Sales & Revenue',
  'Orders & Bookings',
  'Payments & Balances',
  'Customers',
  'Inventory & Products',
  'Tax & Accounting',
  'FPRPay',
  'Operations',
]

export const ALL_REPORTS: ReportItem[] = [
  { title: 'Sales Overview', slug: 'sales-overview', description: 'Orders and revenue for the current year, grouped by month.', category: 'Sales & Revenue', keywords: ['revenue', 'monthly', 'sales'], implemented: true },
  { title: 'Sales Overview By Date Range', slug: 'sales-overview-by-date-range', description: 'Orders and revenue for a custom date range, grouped by day.', category: 'Sales & Revenue', keywords: ['date range', 'custom'], implemented: true },
  { title: 'Sales Created Overview', slug: 'sales-created-overview', description: 'Orders and revenue grouped by the month the order was created, not the event date.', category: 'Sales & Revenue', keywords: ['created date'], implemented: true },
  { title: 'Daily Sales', slug: 'daily-sales', description: 'Orders and revenue broken down by day.', category: 'Sales & Revenue', keywords: ['daily'], implemented: true },
  { title: 'Month to Date', slug: 'month-to-date', description: 'Orders created so far this month with totals, payments and balances.', category: 'Sales & Revenue', keywords: ['mtd'], implemented: true },
  { title: 'Sales by City', slug: 'sales-by-city', description: 'Orders and revenue grouped by event city.', category: 'Sales & Revenue', keywords: ['city', 'location'], implemented: true },
  { title: 'Annual Growth', slug: 'annual-growth', description: 'Year over year orders and revenue with growth percentage.', category: 'Sales & Revenue', keywords: ['yoy', 'growth', 'year'], implemented: true },
  { title: 'Sales References', slug: 'sales-references', description: 'Reference data for sales orders.', category: 'Sales & Revenue', keywords: ['reference'], implemented: false },
  { title: 'Sales References By Created Date', slug: 'sales-references-by-created-date', description: 'Sales reference data grouped by created date.', category: 'Sales & Revenue', keywords: ['reference'], implemented: false },
  { title: 'Coupon Report', slug: 'coupon-report', description: 'Coupon codes with usage counts and total discount given.', category: 'Sales & Revenue', keywords: ['discount', 'promo', 'coupon'], implemented: true },
  { title: 'Sales By Category', slug: 'sales-by-category', description: 'Quantity sold and revenue grouped by product category.', category: 'Sales & Revenue', keywords: ['category'], implemented: true },
  { title: 'Sales By Item', slug: 'sales-by-item', description: 'Quantity sold and revenue for each rental item.', category: 'Sales & Revenue', keywords: ['item', 'product', 'chairs', 'tables'], implemented: true },
  { title: 'Sales By Item Added', slug: 'sales-by-item-added', description: 'Revenue from items added on to existing orders.', category: 'Sales & Revenue', keywords: ['add-on'], implemented: false },
  { title: 'Sales by Item by Customer', slug: 'sales-by-item-by-customer', description: 'Quantity sold and revenue for each item, broken down by customer.', category: 'Sales & Revenue', keywords: ['item', 'customer'], implemented: true },
  { title: 'Sales By Required Addons', slug: 'sales-by-required-addons', description: 'Sales performance of required add-on items.', category: 'Sales & Revenue', keywords: ['addon'], implemented: false },
  { title: 'Sales By Required Addons By Customer', slug: 'sales-by-required-addons-by-customer', description: 'Required add-on sales grouped by customer.', category: 'Sales & Revenue', keywords: ['addon', 'customer'], implemented: false },
  { title: 'Sales by Delivery Vs Pickup', slug: 'sales-by-delivery-vs-pickup', description: 'Orders and revenue split between delivery and pickup.', category: 'Orders & Bookings', keywords: ['delivery', 'pickup', 'fulfillment'], implemented: true },
  { title: 'Order List', slug: 'order-list', description: 'All orders with status, total and balance.', category: 'Orders & Bookings', keywords: ['orders'], implemented: true },
  { title: 'Order List with Notes', slug: 'order-list-with-notes', description: 'Orders with their customer-facing and internal notes.', category: 'Orders & Bookings', keywords: ['notes'], implemented: true },
  { title: 'Canceled Order List', slug: 'canceled-order-list', description: 'Orders that have been canceled.', category: 'Orders & Bookings', keywords: ['canceled', 'cancelled'], implemented: true },
  { title: 'Order Info List', slug: 'order-info-list', description: 'Orders with event address, date and delivery type.', category: 'Orders & Bookings', keywords: ['address'], implemented: true },
  { title: 'Option Answers', slug: 'option-answers', description: 'Answers customers gave to order options or questions.', category: 'Orders & Bookings', keywords: ['options'], implemented: false },
  { title: 'Option Answers Filtered', slug: 'option-answers-filtered', description: 'Filtered order option answers.', category: 'Orders & Bookings', keywords: ['options'], implemented: false },
  { title: 'All Quotes and Incomplete Orders', slug: 'all-quotes-and-incomplete-orders', description: 'Every quote and incomplete order with its current status.', category: 'Orders & Bookings', keywords: ['quotes', 'incomplete'], implemented: true },
  { title: 'Quotes Sent List', slug: 'quotes-sent-list', description: 'Quotes that have been sent to customers.', category: 'Orders & Bookings', keywords: ['quotes'], implemented: true },
  { title: 'Abandoned Quotes Created', slug: 'abandoned-quotes-created', description: 'Quotes or incomplete orders that are 14 or more days old and never completed.', category: 'Orders & Bookings', keywords: ['abandoned'], implemented: true },
  { title: 'Incomplete Orders Created', slug: 'incomplete-orders-created', description: 'Count and value of incomplete orders, grouped by date created.', category: 'Orders & Bookings', keywords: ['incomplete'], implemented: true },
  { title: 'Signed Contract Orders', slug: 'signed-contract-orders', description: 'Orders with a signed rental contract on file.', category: 'Orders & Bookings', keywords: ['contract', 'signature'], implemented: true },
  { title: 'Unsigned Contract Orders', slug: 'unsigned-contract-orders', description: 'Orders that still need a signed rental contract.', category: 'Orders & Bookings', keywords: ['contract', 'unsigned'], implemented: true },
  { title: 'Auto Pay Report', slug: 'auto-pay-report', description: 'Orders on auto-charge with balance due and last attempted charge.', category: 'Payments & Balances', keywords: ['autopay', 'auto charge'], implemented: true },
  { title: 'Transaction Search', slug: 'transaction-search', description: 'Search recent payment transactions by order, customer or Stripe ID.', category: 'Payments & Balances', keywords: ['transaction', 'stripe', 'search'], implemented: true },
  { title: 'Order Adjustments', slug: 'order-adjustments', description: 'Adjustments applied directly to orders.', category: 'Payments & Balances', keywords: ['adjustments'], implemented: false },
  { title: 'Adjustments with Order Info', slug: 'adjustments-with-order-info', description: 'Order adjustments shown with full order details.', category: 'Payments & Balances', keywords: ['adjustments'], implemented: false },
  { title: 'Adjustments Created', slug: 'adjustments-created', description: 'Adjustment definitions such as fees or discounts that have been created.', category: 'Payments & Balances', keywords: ['fees', 'adjustments'], implemented: true },
  { title: 'Adjustments by City', slug: 'adjustments-by-city', description: 'Adjustments grouped by city.', category: 'Payments & Balances', keywords: ['adjustments', 'city'], implemented: false },
  { title: 'Payments by City', slug: 'payments-by-city', description: 'Payment totals grouped by city.', category: 'Payments & Balances', keywords: ['city', 'payments'], implemented: true },
  { title: 'Payments by Employee', slug: 'payments-by-employee', description: 'Payments recorded, grouped by the employee who took them.', category: 'Payments & Balances', keywords: ['employee', 'staff'], implemented: true },
  { title: 'Payments by Order', slug: 'payments-by-order', description: 'Payments grouped by order.', category: 'Payments & Balances', keywords: ['order', 'payments'], implemented: true },
  { title: 'Payment List', slug: 'payment-list', description: 'Complete payment transaction history.', category: 'Payments & Balances', keywords: ['payments', 'transactions'], implemented: true },
  { title: 'Payment Breakdown List', slug: 'payment-breakdown-list', description: 'Payments totaled by payment method.', category: 'Payments & Balances', keywords: ['method', 'breakdown'], implemented: true },
  { title: 'Refunded Payment List', slug: 'refunded-payment-list', description: 'Payments that were refunded.', category: 'Payments & Balances', keywords: ['refund'], implemented: true },
  { title: 'Voided Payment List', slug: 'voided-payment-list', description: 'Payments that were voided.', category: 'Payments & Balances', keywords: ['void'], implemented: true },
  { title: 'Invoice Accrual Report', slug: 'invoice-accrual-report', description: 'Orders with invoiced, collected and accrued (uncollected) amounts.', category: 'Payments & Balances', keywords: ['accrual', 'invoice'], implemented: true },
  { title: 'Payments', slug: 'payments', description: 'All recorded payments.', category: 'Payments & Balances', keywords: ['payments'], implemented: true },
  { title: 'Manage Payments', slug: 'manage-payments', description: 'Payments with source, for reviewing and managing individual entries.', category: 'Payments & Balances', keywords: ['manage'], implemented: true },
  { title: 'Manage Payments by Activation Date', slug: 'manage-payments-by-activation-date', description: 'Payments filtered by the date they were activated or processed.', category: 'Payments & Balances', keywords: ['activation'], implemented: true },
  { title: 'Receivables', slug: 'receivables', description: 'Orders with an unpaid balance and the amount still due.', category: 'Payments & Balances', keywords: ['outstanding', 'owed', 'unpaid', 'balance due', 'receivables'], implemented: true },
  { title: 'Open Accounts', slug: 'open-accounts', description: 'Orders with an open balance that have not been fully paid off.', category: 'Payments & Balances', keywords: ['outstanding', 'open balance'], implemented: true },
  { title: 'Balance Summary', slug: 'balance-summary', description: 'Outstanding balance totals grouped by order status.', category: 'Payments & Balances', keywords: ['outstanding', 'summary'], implemented: true },
  { title: 'Credits and Rainchecks', slug: 'credits-and-rainchecks', description: 'Customer credits and rainchecks that have been issued, redeemed or expired.', category: 'Payments & Balances', keywords: ['raincheck', 'credit'], implemented: true },
  { title: 'Payments List With Adjustments And Notes', slug: 'payments-list-with-adjustments-and-notes', description: 'Payments with any related adjustment notes.', category: 'Payments & Balances', keywords: ['adjustments'], implemented: true },
  { title: 'Flagged Payments', slug: 'flagged-payments', description: 'Payments that were flagged for having notes attached.', category: 'Payments & Balances', keywords: ['flagged'], implemented: true },
  { title: 'Tip Report', slug: 'tip-report', description: 'Tips collected per order.', category: 'Payments & Balances', keywords: ['tips', 'gratuity'], implemented: true },
  { title: 'Event Date Tip Report', slug: 'event-date-tip-report', description: 'Tips collected, grouped by event date.', category: 'Payments & Balances', keywords: ['tips'], implemented: true },
  { title: 'Surveys', slug: 'surveys', description: 'Customer surveys that have been set up.', category: 'Customers', keywords: ['survey'], implemented: true },
  { title: 'Survey Answers', slug: 'survey-answers', description: 'Customer answers submitted to surveys.', category: 'Customers', keywords: ['survey'], implemented: false },
  { title: 'Customer Sales', slug: 'customer-sales', description: 'Orders and revenue grouped by customer.', category: 'Customers', keywords: ['customer revenue'], implemented: true },
  { title: 'Customer Sales Filtered', slug: 'customer-sales-filtered', description: 'Customer sales for a chosen date range.', category: 'Customers', keywords: ['filtered'], implemented: true },
  { title: 'Customer Payments Filtered', slug: 'customer-payments-filtered', description: 'Payments by customer for a chosen date range.', category: 'Customers', keywords: ['filtered'], implemented: true },
  { title: 'Customers Lapsed Report', slug: 'customers-lapsed-report', description: 'Customers who have not placed an order in 12+ months.', category: 'Customers', keywords: ['lapsed', 'inactive'], implemented: true },
  { title: 'Checklists', slug: 'checklists', description: 'Checklists completed for orders or events.', category: 'Customers', keywords: ['checklist'], implemented: false },
  { title: 'Customer List Report', slug: 'customer-list-report', description: 'All customers with contact info and order counts.', category: 'Customers', keywords: ['customer list', 'directory'], implemented: true },
  { title: 'Bad Customer Status Report', slug: 'bad-customer-status-report', description: 'Customers flagged with a bad account status.', category: 'Customers', keywords: ['flagged'], implemented: false },
  { title: 'Customer Email List Report', slug: 'customer-email-list-report', description: 'Customer names and email addresses.', category: 'Customers', keywords: ['emails', 'email list', 'export', 'customer emails'], implemented: true },
  { title: 'Customer Info List', slug: 'customer-info-list', description: 'Customer contact details and notes.', category: 'Customers', keywords: ['contact info'], implemented: true },
  { title: 'Digital Signature and Waiver List', slug: 'digital-signature-and-waiver-list', description: 'Orders with signature and damage waiver details.', category: 'Customers', keywords: ['signature', 'waiver'], implemented: true },
  { title: 'Birthday List', slug: 'birthday-list', description: 'Customer birthdays.', category: 'Customers', keywords: ['birthday'], implemented: false },
  { title: 'Registered Participants', slug: 'registered-participants', description: 'Participants registered for an event.', category: 'Customers', keywords: ['participants'], implemented: false },
  { title: 'Invitation Guests', slug: 'invitation-guests', description: 'Guests invited to an event.', category: 'Customers', keywords: ['guests', 'invitation'], implemented: false },
  { title: 'Messages Sent', slug: 'messages-sent', description: 'Log of messages sent to customers.', category: 'Customers', keywords: ['messages', 'log'], implemented: true },
  { title: 'Template Messages', slug: 'template-messages', description: 'Order, marketing and text message templates that are configured.', category: 'Customers', keywords: ['templates'], implemented: true },
  { title: 'Lead Form Summary', slug: 'lead-form-summary', description: 'Leads received through the website contact form, by month.', category: 'Customers', keywords: ['leads'], implemented: true },
  { title: 'Lead Form List', slug: 'lead-form-list', description: 'Individual leads received through the website contact form.', category: 'Customers', keywords: ['leads'], implemented: true },
  { title: 'Customer Custom Pricing List', slug: 'customer-custom-pricing-list', description: 'Custom item pricing set up for specific customers.', category: 'Inventory & Products', keywords: ['pricing'], implemented: false },
  { title: 'Insurance Report', slug: 'insurance-report', description: 'Insurance information related to rental items.', category: 'Inventory & Products', keywords: ['insurance'], implemented: false },
  { title: 'Sales Items Inventory', slug: 'sales-items-inventory', description: 'Items with current stock quantity and all-time quantity sold.', category: 'Inventory & Products', keywords: ['stock', 'inventory'], implemented: true },
  { title: 'Cleaning Report', slug: 'cleaning-report', description: 'Cleaning status of rental items.', category: 'Inventory & Products', keywords: ['cleaning'], implemented: false },
  { title: 'Return on Investment (ROI)', slug: 'return-on-investment-roi', description: 'Revenue, cost and profit margin for each item.', category: 'Inventory & Products', keywords: ['roi', 'profit'], implemented: true },
  { title: 'Return on Investment (ROI) by Date', slug: 'return-on-investment-roi-by-date', description: 'Item ROI for a chosen date range.', category: 'Inventory & Products', keywords: ['roi'], implemented: true },
  { title: 'ROI Breakdown', slug: 'roi-breakdown', description: 'Cost per unit versus revenue for each item.', category: 'Inventory & Products', keywords: ['roi', 'cost'], implemented: true },
  { title: 'Inventory Usage Totals', slug: 'inventory-usage-totals', description: 'How many times each item has been rented and the total quantity used.', category: 'Inventory & Products', keywords: ['usage', 'rented', 'chairs', 'tables'], implemented: true },
  { title: 'Inventory Usage List', slug: 'inventory-usage-list', description: 'Detailed rental usage history by item.', category: 'Inventory & Products', keywords: ['usage'], implemented: true },
  { title: 'Rental Inventory Currently Checked Out', slug: 'rental-inventory-currently-checked-out', description: 'Items currently out on rental and their expected return date.', category: 'Inventory & Products', keywords: ['checked out'], implemented: true },
  { title: 'Rental Inventory Overdue', slug: 'rental-inventory-overdue', description: 'Items that are past their expected return date.', category: 'Inventory & Products', keywords: ['overdue'], implemented: true },
  { title: 'Rental Inventory Usage Totals', slug: 'rental-inventory-usage-totals', description: 'Rental item usage totals, filtered to rental inventory.', category: 'Inventory & Products', keywords: ['usage'], implemented: true },
  { title: 'Rental Inventory Usage List', slug: 'rental-inventory-usage-list', description: 'Detailed rental item usage history.', category: 'Inventory & Products', keywords: ['usage'], implemented: true },
  { title: 'Product Attention List', slug: 'product-attention-list', description: 'Items flagged as needing attention or inspection.', category: 'Inventory & Products', keywords: ['attention', 'inspection'], implemented: true },
  { title: 'Product Status Report', slug: 'product-status-report', description: 'Items with quantity and active or inactive status.', category: 'Inventory & Products', keywords: ['status'], implemented: true },
  { title: 'All Items', slug: 'all-items', description: 'Every item in the catalog with quantity and stock status.', category: 'Inventory & Products', keywords: ['catalog', 'items'], implemented: true },
  { title: 'Tax Report', slug: 'tax', description: 'Tax collected on payments, broken down by city, for a chosen month, quarter or year.', category: 'Tax & Accounting', keywords: ['tax', 'city'], implemented: true },
  { title: 'Tax by City', slug: 'tax-by-city', description: 'Tax amount collected, grouped by city.', category: 'Tax & Accounting', keywords: ['tax', 'city'], implemented: true },
  { title: 'Tax Collected by City', slug: 'tax-collected-by-city', description: 'Total tax collected per city.', category: 'Tax & Accounting', keywords: ['tax', 'city'], implemented: true },
  { title: 'Accrual Tax Report', slug: 'accrual-tax-report', description: 'Tax accrued by event date, grouped by month.', category: 'Tax & Accounting', keywords: ['accrual', 'tax'], implemented: true },
  { title: 'Pennsylvania Report', slug: 'pennsylvania-report', description: 'Orders with a Pennsylvania event location, for state tax purposes.', category: 'Tax & Accounting', keywords: ['pennsylvania', 'state'], implemented: true },
  { title: 'FPRPay Reconciliation', slug: 'fprpay-reconciliation', description: 'FPRPay payment activity for reconciliation.', category: 'FPRPay', keywords: ['reconciliation'], implemented: true },
  { title: 'FPRPay Reconciliation Report', slug: 'fprpay-reconciliation-report', description: 'FPRPay payment activity for reconciliation.', category: 'FPRPay', keywords: ['reconciliation'], implemented: true },
  { title: 'FPRPay Payments List', slug: 'fprpay-payments-list', description: 'FPRPay payment transactions with Stripe payment IDs.', category: 'FPRPay', keywords: ['payments'], implemented: true },
  { title: 'FPRPay Multi Invoice Breakdown', slug: 'fprpay-multi-invoice-breakdown', description: 'FPRPay payment activity across multiple invoices.', category: 'FPRPay', keywords: ['invoice'], implemented: true },
  { title: 'FPRPay Not Funded List', slug: 'fprpay-not-funded-list', description: 'FPRPay payments not yet funded.', category: 'FPRPay', keywords: ['not funded'], implemented: true },
  { title: 'FPRPay by Funding Date', slug: 'fprpay-by-funding-date', description: 'FPRPay payment activity grouped by funding date.', category: 'FPRPay', keywords: ['funding'], implemented: true },
  { title: 'FPRPay Activity Report', slug: 'fprpay-activity-report', description: 'FPRPay payment and refund activity by order.', category: 'FPRPay', keywords: ['activity'], implemented: true },
  { title: 'FPRPay Fee Report', slug: 'fprpay-fee-report', description: 'FPRPay processing fee activity.', category: 'FPRPay', keywords: ['fees'], implemented: true },
  { title: 'FPRPay Statement', slug: 'fprpay-statement', description: 'FPRPay payment activity in statement form.', category: 'FPRPay', keywords: ['statement'], implemented: true },
  { title: 'FPRPay Chargeback Report', slug: 'fprpay-chargeback-report', description: 'FPRPay chargeback activity.', category: 'FPRPay', keywords: ['chargeback'], implemented: true },
  { title: 'FPRPay Chargeback Action Report', slug: 'fprpay-chargeback-action-report', description: 'Actions taken on FPRPay chargebacks.', category: 'FPRPay', keywords: ['chargeback'], implemented: true },
  { title: 'FPRPay ACH Returns Report', slug: 'fprpay-ach-returns-report', description: 'FPRPay ACH payment returns.', category: 'FPRPay', keywords: ['ach', 'returns'], implemented: true },
  { title: 'Billing Risk Report', slug: 'billing-risk-report', description: 'FPRPay billing risk activity.', category: 'FPRPay', keywords: ['risk'], implemented: true },
  { title: 'FPRGift Cards Outstanding', slug: 'fprgift-cards-outstanding', description: 'Outstanding FPRGift card balances.', category: 'FPRPay', keywords: ['gift card'], implemented: true },
  { title: 'FPRGift History', slug: 'fprgift-history', description: 'FPRGift card activity history.', category: 'FPRPay', keywords: ['gift card'], implemented: true },
  { title: 'Setup Surfaces', slug: 'setup-surfaces', description: 'Setup surfaces configured for event setups, with active status.', category: 'Operations', keywords: ['setup'], implemented: true },
]

export const IMPLEMENTED_SLUGS: Set<string> = new Set(
  ALL_REPORTS.filter((r) => r.implemented).map((r) => r.slug)
)

export const QUICK_REPORT_SLUGS: string[] = [
  'receivables',
  'sales-overview',
  'payment-list',
  'order-list',
  'inventory-usage-totals',
  'customer-list-report',
  'tax',
]

export function searchReports(query: string): ReportItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored: Array<{ r: ReportItem; score: number }> = []
  for (const r of ALL_REPORTS) {
    const title = r.title.toLowerCase()
    let score = 0
    if (title === q) score = 100
    else if (title.startsWith(q)) score = 80
    else if (title.includes(q)) score = 60
    else if (r.keywords.some((k) => k.toLowerCase().includes(q) || q.includes(k.toLowerCase()))) score = 45
    else if (r.description.toLowerCase().includes(q)) score = 25
    else if (r.category.toLowerCase().includes(q)) score = 15
    if (score > 0) scored.push({ r, score })
  }
  scored.sort((a, b) => b.score - a.score || a.r.title.localeCompare(b.r.title))
  return scored.map((s) => s.r)
}
