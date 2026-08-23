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
  description?: string
}

export interface ReportCategoryDef {
  name: string
  reports: ReportItem[]
}

function makeReports(titles: string[]): ReportItem[] {
  return titles.map((title) => ({ title, slug: slugify(title) }))
}

export const REPORT_CATEGORIES: ReportCategoryDef[] = [
  {
    name: 'Top Reports',
    reports: [
      { title: 'Auto Pay Report', slug: slugify('Auto Pay Report'), description: 'Check the status of automatically charged payments' },
      { title: 'Tax Report', slug: 'tax', description: 'Look at a breakdown of all orders by year' },
      { title: 'FPRPay Reconciliation', slug: slugify('FPRPay Reconciliation'), description: 'View your FPRPay Payments and Associated Expenses' },
      { title: 'Transaction Search', slug: slugify('Transaction Search'), description: 'Search for individual transactions and view related details' },
    ],
  },
  {
    name: 'Sales Reports',
    reports: makeReports([
      'Sales Overview','Sales Overview By Date Range','Sales Created Overview','Daily Sales','Month to Date','Sales by City','Sales by Delivery Vs Pickup','Sales References','Sales References By Created Date','Annual Growth','Option Answers','Option Answers Filtered','Order Adjustments','Adjustments with Order Info','Adjustments Created','Adjustments by City','Tax by City','Tax Collected by City','Accrual Tax Report','Payments by City','Payments by Employee','Payments by Order','Payment List','Payment Breakdown List','Refunded Payment List','Voided Payment List','Invoice Accrual Report',
    ]),
  },
  {
    name: 'General Reports',
    reports: makeReports([
      'Payments','Manage Payments','Manage Payments by Activation Date','Receivables','Open Accounts','Balance Summary','Credits and Rainchecks','Order List','Order List with Notes','Canceled Order List','Order Info List','Coupon Report','Setup Surfaces','Pennsylvania Report','Payments List With Adjustments And Notes','Flagged Payments','Tip Report','Event Date Tip Report',
    ]),
  },
  {
    name: 'FPRPay Reports',
    reports: makeReports([
      'FPRPay Reconciliation Report','FPRPay Payments List','FPRPay Multi Invoice Breakdown','FPRPay Not Funded List','FPRPay by Funding Date','FPRPay Activity Report','FPRPay Fee Report','FPRPay Statement','FPRPay Chargeback Report','FPRPay Chargeback Action Report','FPRPay ACH Returns Report','Billing Risk Report','FPRGift Cards Outstanding','FPRGift History',
    ]),
  },
  {
    name: 'Customer Reports',
    reports: makeReports([
      'Surveys','Survey Answers','Messages Sent','Template Messages','Customer Sales','Customer Sales Filtered','Customer Payments Filtered','Customers Lapsed Report','Checklists','Customer List Report','Bad Customer Status Report','Customer Email List Report','Customer Info List','Digital Signature and Waiver List','Birthday List','Registered Participants','All Quotes and Incomplete Orders','Quotes Sent List','Abandoned Quotes Created','Incomplete Orders Created','Signed Contract Orders','Unsigned Contract Orders','Invitation Guests','Lead Form Summary','Lead Form List',
    ]),
  },
  {
    name: 'Product Reports',
    reports: makeReports([
      'Customer Custom Pricing List','Sales By Category','Sales By Item','Sales By Item Added','Sales by Item by Customer','Sales By Required Addons','Sales By Required Addons By Customer','Insurance Report','Sales Items Inventory','Cleaning Report','Return on Investment (ROI)','Return on Investment (ROI) by Date','ROI Breakdown','Inventory Usage Totals','Inventory Usage List','Rental Inventory Currently Checked Out','Rental Inventory Overdue','Rental Inventory Usage Totals','Rental Inventory Usage List','Product Attention List','Product Status Report','All Items',
    ]),
  },
]

export const IMPLEMENTED_SLUGS: Set<string> = new Set(
  [
        'Product Attention List',
    'Sales Overview','Sales Overview By Date Range','Sales Created Overview','Daily Sales','Month to Date','Sales by City','Sales by Delivery Vs Pickup','Annual Growth','Tax by City','Tax Collected by City','Payments by Order','Payment List','Order List','Order List with Notes','Canceled Order List','Order Info List','Tip Report','Event Date Tip Report','Receivables','Coupon Report','Customer List Report','Customer Sales','Customer Sales Filtered','Customer Payments Filtered','Customer Email List Report','Customer Info List','All Quotes and Incomplete Orders','Signed Contract Orders','Unsigned Contract Orders','Incomplete Orders Created','Sales By Category','Sales By Item','All Items','Product Status Report','Payments','Manage Payments','Manage Payments by Activation Date','Open Accounts','Balance Summary','Credits and Rainchecks','Setup Surfaces','Pennsylvania Report','Payments List With Adjustments And Notes','Flagged Payments','Adjustments Created','Accrual Tax Report','Payments by City','Payment Breakdown List','Refunded Payment List','Invoice Accrual Report','Surveys','Messages Sent','Template Messages','Customers Lapsed Report','Digital Signature and Waiver List','Quotes Sent List','Abandoned Quotes Created','Lead Form Summary','Lead Form List','Sales by Item by Customer','Sales Items Inventory','Return on Investment (ROI)','Return on Investment (ROI) by Date','ROI Breakdown','Inventory Usage Totals','Inventory Usage List','Rental Inventory Currently Checked Out','Rental Inventory Overdue','Rental Inventory Usage Totals','Rental Inventory Usage List','Auto Pay Report','tax','Transaction Search','FPRPay Reconciliation','FPRPay Reconciliation Report','FPRPay Payments List','FPRPay Multi Invoice Breakdown','FPRPay Not Funded List','FPRPay by Funding Date','FPRPay Activity Report','FPRPay Fee Report','FPRPay Statement','FPRPay Chargeback Report','FPRPay Chargeback Action Report','FPRPay ACH Returns Report','Billing Risk Report','FPRGift Cards Outstanding','FPRGift History','Voided Payment List','Payments by Employee',
  ].map(slugify)
)
