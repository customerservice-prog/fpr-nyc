import Link from 'next/link'
import { createElement } from 'react'
const settingsSections = [
 {title:'General Config',items:['Company Info','Email Delivery','Time Zone','Routing Settings','Google Integration','QuickBooks Online','Mailchimp','AWeber','Constant Contact','Text Messaging','Text Logs','Tax Rate','Misc Settings','API Info','Users','System Setup','System Settings','Locations','Company Types','Company Roles','HighLevel Connect']},
 {title:'Order Config',items:['Reminders','Order Options','References','Setup Surfaces','Coupons','Service Areas','Closed Dates','Misc Order Settings','Loyalty & Credit Types']},
 {title:'Documents',items:['General Documents','Source Code','Setup Surveys','Automatic Messages','Automatic Text Messaging','Text Message Templates','Email Templates for Orders','Email Templates for Marketing','FPRMail','Contract Options']},
 {title:'Products',items:['Categories','Items','Sorting','Schedule Profiles','Bulk Pricing','Addons','Product Sharing','Cost of Goods','Register Setup','Auto Charge','Recurring Profiles','Wedding Packages']},
 {title:'Rules',items:['Adjustments','Deposit Rules','Price Rule Sets','Special Request Fees','Availability Rule Sets']},
 {title:'Website',items:['Website Pages','Visual Builder','General Images','Gallery','Navigation Editor','Premium Features','Responsive Editor','Conversion Booster']},
]
const workingLinks: Record<string,string> = {
 'Email Delivery':'/admin/settings/email-delivery',
 'Website Pages':'/admin/settings/website-pages','Visual Builder':'/admin/settings/visual-builder','Wedding Packages':'/admin/wedding-packages','General Images':'/admin/settings/general-images','Navigation Editor':'/admin/settings/navigation-editor','Premium Features':'/admin/settings/premium-features','Responsive Editor':'/admin/settings/responsive-editor','Conversion Booster':'/admin/settings/conversion-booster',
 'General Documents':'/admin/settings/general-documents','Source Code':'/admin/settings/source-code','Setup Surveys':'/admin/settings/setup-surveys','Automatic Text Messaging':'/admin/settings/automatic-text-messaging','Text Message Templates':'/admin/settings/text-message-templates','Email Templates for Orders':'/admin/settings/email-templates-orders','Email Templates for Marketing':'/admin/settings/email-templates-marketing','FPRMail':'/admin/settings/ersmail','Contract Options':'/admin/settings/contract-options',
 'Sorting':'/admin/settings/sorting','Schedule Profiles':'/admin/settings/schedule-profiles','Bulk Pricing':'/admin/settings/bulk-pricing','Addons':'/admin/settings/addons','Product Sharing':'/admin/settings/product-sharing','Cost of Goods':'/admin/settings/cost-of-goods','Register Setup':'/admin/settings/register-setup','Auto Charge':'/admin/settings/auto-charge','Recurring Profiles':'/admin/settings/recurring-profiles',
 'Reminders':'/admin/settings/reminders','Order Options':'/admin/settings/order-options','Misc Order Settings':'/admin/settings/order-options','References':'/admin/settings/references','Setup Surfaces':'/admin/settings/setup-surfaces','Loyalty & Credit Types':'/admin/settings/loyalty-credit-types','Company Info':'/admin/settings/company-info','Users':'/admin/settings/users','Service Areas':'/admin/settings/service-areas','Closed Dates':'/admin/settings/closed-dates','Coupons':'/admin/settings/coupons','Deposit Rules':'/admin/settings/deposit-rules','Tax Rate':'/admin/settings/tax-rate','Categories':'/admin/categories','Items':'/admin/items','Gallery':'/gallery','Automatic Messages':'/admin/settings/automatic-messages',
 'Price Rule Sets':'/admin/settings/pricing-tiers','Special Request Fees':'/admin/settings/special-request-fees','Adjustments':'/admin/settings/adjustments','Availability Rule Sets':'/admin/settings/availability-rule-sets','Time Zone':'/admin/settings/time-zone','Routing Settings':'/admin/settings/routing-settings','Google Integration':'/admin/settings/google-integration','QuickBooks Online':'/admin/settings/quickbooks-online','Mailchimp':'/admin/settings/mailchimp','AWeber':'/admin/settings/aweber','Constant Contact':'/admin/settings/constant-contact','Text Messaging':'/admin/settings/text-messaging','Text Logs':'/admin/settings/text-logs','Misc Settings':'/admin/settings/misc-settings','API Info':'/admin/settings/api-info','System Setup':'/admin/settings/system-setup','System Settings':'/admin/settings/system-settings','Locations':'/admin/settings/locations','Company Types':'/admin/settings/company-types','HighLevel Connect':'/admin/settings/highlevel-connect','Company Roles':'/admin/settings/company-roles',
}
export default function SettingsPage() {
 return createElement('div',{className:'p-4'},
  createElement('h1',{className:'text-xl font-bold text-dark mb-6'},'Settings'),
  createElement('div',{className:'space-y-4'},settingsSections.map(section=>createElement('div',{key:section.title,className:'bg-white rounded shadow'},
   createElement('div',{className:'bg-admin-dark text-white px-4 py-2 font-medium text-sm'},section.title),
   createElement('div',{className:'p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-2'},section.items.map(item=>workingLinks[item]?createElement(Link,{key:item,href:workingLinks[item],className:'text-sm text-secondary hover:underline py-1'},item):createElement('span',{key:item,className:'text-sm text-body py-1'},item)))
  )))
 )
}
