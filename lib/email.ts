import nodemailer from 'nodemailer'
import { NYC_EMAIL_ADDRESS, nycEmailSubject, nycEmailHtml } from '@/lib/nycEmail'
import { BUSINESS, formatDateTime } from '@/lib/utils'
import { NYC_EMAIL_LOGO_URL } from '@/lib/nycBrand'
import { NYC_PUBLIC_HOST, NYC_PUBLIC_ORIGIN } from '@/lib/nycPublicOrigin'
import { formatTaxRatePercent } from '@/lib/nycSalesTax'

// Host shown in the plain-text part and the X-FPR-Website header of every NYC email.
const NYC_EMAIL_SITE_HOST = NYC_PUBLIC_HOST

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  // Port 465 requires TLS immediately; submission ports upgrade with STARTTLS.
  secure: Number(process.env.EMAIL_PORT || '587') === 465,
  requireTLS: Number(process.env.EMAIL_PORT || '587') !== 465,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 20000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const LOGO_URL = NYC_EMAIL_LOGO_URL

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string
  subject: string
  html: string
  text?: string
  replyTo?: string
}) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    // Never count an unsent notification as delivered.
    throw new Error('Riverdale outgoing email is not configured (EMAIL_USER / EMAIL_PASS).')
  }

  try {
    const delivery = await transporter.sendMail({
      from: { name: BUSINESS.name, address: (process.env.EMAIL_FROM || process.env.EMAIL_USER || NYC_EMAIL_ADDRESS).replace(/^.*<([^>]+)>.*$/, '$1').trim() },
      to: to.toLowerCase() === 'customerservice@fpr-nyc-production.up.railway.app' ? NYC_EMAIL_ADDRESS : to,
      replyTo: replyTo || NYC_EMAIL_ADDRESS,
      subject: nycEmailSubject(subject),
      html: nycEmailHtml(html),
      text: 'NYC / DOWNSTATE NEW YORK | ' + NYC_EMAIL_SITE_HOST + '\n\n' + (text || html.replace(/<[^>]*>/g, '')),
      headers: { 'X-FPR-Location': 'nyc-downstate', 'X-FPR-Website': NYC_EMAIL_SITE_HOST },
    })
    // SMTP acceptance is not inbox delivery, but an empty/rejected envelope is
    // definitely not a successful send. Never mark it as one.
    if (!Array.isArray(delivery?.accepted) || delivery.accepted.length === 0 || (delivery.rejected?.length || 0) > 0) {
      throw new Error('SMTP did not accept every intended recipient')
    }
    return { success: true, simulated: false }
  } catch (error) {
    console.error('Riverdale email delivery failed')
    throw new Error('Riverdale email could not be delivered. Check the outgoing email configuration.')
  }
}

function emailHeader() {
  return `
    <div style="text-align:center; margin-bottom:20px;">
      <img src="${LOGO_URL}" alt="${BUSINESS.name}" width="220" height="110" style="display:block; margin:0 auto; width:220px; max-width:100%; height:auto; border:0;" />
    </div>
  `
}

function emailFooter() {
  return `
    <hr style="border:none; border-top:1px solid #e5e5e5; margin:28px 0 14px;" />
    <p style="font-size:13px; color:#555; margin:4px 0;">${BUSINESS.legalName}<br/>${BUSINESS.address}</p>
    <p style="font-size:13px; color:#555; margin:4px 0;">Questions? Call or text us at <a href="tel:${BUSINESS.phone.replace(/[^0-9]/g, '')}">${BUSINESS.phone}</a> or email <a href="${BUSINESS.emailHref}">${BUSINESS.email}</a></p>
    <p style="font-size:12px; color:#999; margin-top:14px; line-height:1.5;">Please note: your confirmed NYC quote and signed rental agreement set your payment deadline and rental terms. The remaining balance is due before your event. Deposits are non-refundable.</p>
    <p style="font-size:12px; color:#999; margin-top:8px;">Thank you for choosing ${BUSINESS.name}!</p>
  `
}

function policyFooterHtml() {
  // NYC terms come from the customer's confirmed NYC quote and rental agreement. No
  // inherited fees, damage waiver or other locations' policies are promised here.
  return `
    <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e5e5e5; font-size:12px; color:#555; line-height:1.6;">
      <p style="font-weight:bold; margin-bottom:8px; color:#C0392B; text-decoration:underline;">A few tips and reminders: (PLEASE READ BELOW)</p>
      <p>Your confirmed NYC quote and signed rental agreement set your prices, payment deadline and cancellation terms. Friendly Party Rental NYC is delivery-only: our crew delivers, sets up and picks up at your event address. No damage waiver is offered or charged.</p>
      <p>1) Please tell us in advance about stairs, hills, a tiered yard, narrow gates or other obstacles at the setup area so we can review the setup requirements.</p>
      <p>2) Pole tents can be installed on most natural surfaces but not on concrete or pavement. Stakes are driven about 42 inches into the ground, so please identify underground utilities, irrigation lines and drains before your event.</p>
      <p>3) Inflatables must be staked, or secured to approved fixed points on at least three corners. Sandbags are not used. Electricity must be available within 50 feet of each inflatable unless a generator is rented.</p>
      <p>4) Our driver will call when en route. On busy days delivery may arrive earlier than scheduled, at no additional charge.</p>
      <p>5) Please tell us in advance if your event is at a park, school or other public venue, and share any venue rules or permits with our team.</p>
      <p>6) Tents need at least 3 feet of clearance around the perimeter for stakes and poles. Contact us if you are unsure which tent size fits your space.</p>
      <p>7) If you need to change or cancel your order (including for weather), contact the NYC team as early as possible. Your rental agreement explains which cancellation or raincheck terms apply.</p>
      <p style="margin-top:12px;">We want your party to go as smoothly as possible. Please call if you have any questions. Thanks!</p>
    </div>
  `
}

function eventDetailsHtml(order: {
  eventDate: string
  eventAddress?: string | null
  eventCity?: string | null
  eventState?: string | null
  eventZip?: string | null
  deliveryType?: string | null
  eventTimeSlot?: string | null
  pickupTimeSlot?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
}) {
  const fullAddress = [order.eventAddress, order.eventCity, order.eventState, order.eventZip]
    .filter(Boolean)
    .join(', ')
  const isPickup = order.deliveryType === 'pickup'
  const addressLabel = isPickup ? 'Pickup Location' : 'Delivery Address'

  let html = `<div style="background:#EDE7F6;border-radius:6px;padding:10px 14px;margin-bottom:10px;"><strong style="color:#4A2E83;">Event Date:</strong> ${order.eventDate}</div>`
  if (fullAddress) {
    html += `<p style="margin:4px 0;"><strong>${addressLabel}:</strong> ${fullAddress}</p>`
  }
  if (order.eventTimeSlot) {
    html += `<p style="margin:4px 0;"><strong>${isPickup ? 'Customer Pickup Time' : 'Drop-Off Time'}:</strong> ${order.eventTimeSlot}</p>`
  }
  if (order.pickupTimeSlot) {
    html += `<p style="margin:4px 0;"><strong>${isPickup ? 'Customer Return Time' : 'Pickup Time'}:</strong> ${order.pickupTimeSlot}</p>`
  }
  if (order.customerPhone) {
    html += `<p style="margin:4px 0;"><strong>Phone:</strong> ${order.customerPhone}</p>`
  }
  if (order.customerEmail) {
    html += `<p style="margin:4px 0;"><strong>Email:</strong> ${order.customerEmail}</p>`
  }
  return html
}

function itemsTableHtml(
  items: Array<{ name: string; quantity: number; unitPrice?: number; total: number; image?: string | null }>
) {
  const rows = items
    .map((i) => {
      const unit = typeof i.unitPrice === 'number' && i.unitPrice > 0 ? i.unitPrice : i.quantity > 0 ? i.total / i.quantity : i.total
      const imgTag = (i.image && /^https?:\/\//.test(i.image)) ? '<img src="' + i.image + '" width="40" height="40" style="object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:8px;" />' : ''
      return '<tr><td style="padding:8px; border-bottom:1px solid #eee;">' + imgTag + i.name + '</td><td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">' + i.quantity + '</td><td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">$' + unit.toFixed(2) + '</td><td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">$' + i.total.toFixed(2) + '</td></tr>'
    })
    .join('')

  return '<table cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-top:12px;"><tr style="background:#f5f5f5;"><th style="padding:8px; text-align:left;">Item</th><th style="padding:8px;">Qty</th><th style="padding:8px; text-align:right;">Unit Price</th><th style="padding:8px; text-align:right;">Total</th></tr>' + rows + '</table>'
}

function feeBreakdownHtml(fees: {
  subtotal?: number
  damageWaiver?: boolean
  damageWaiverFee?: number
  deliveryFee?: number
  deliveryDistance?: number | null
  taxAmount?: number
  taxRate?: number
}) {
  const rows: string[] = []
  let running = 0
  const addRow = (label: string, amount: number) => {
    running += amount
    rows.push(
      '<tr><td style="padding:6px 10px; color:#444;">' + label + '</td><td style="padding:6px 10px; text-align:right; color:#444;">$' + amount.toFixed(2) + '</td><td style="padding:6px 10px; text-align:right; color:#888; width:100px;">$' + running.toFixed(2) + '</td></tr>'
    )
  }
  if (typeof fees.subtotal === 'number' && fees.subtotal > 0) addRow('Subtotal', fees.subtotal)
  if (fees.damageWaiver && (fees.damageWaiverFee || 0) > 0) addRow('Damage Waiver', fees.damageWaiverFee || 0)
  if ((fees.deliveryFee || 0) > 0) addRow(fees.deliveryDistance ? 'Travel Fee (' + fees.deliveryDistance + ' mi)' : 'Travel Fee', fees.deliveryFee || 0)
  if ((fees.taxAmount || 0) > 0) addRow(fees.taxRate ? 'Tax (' + formatTaxRatePercent(fees.taxRate) + ')' : 'Tax', fees.taxAmount || 0)
  if (!rows.length) return ''
  return (
    '<table cellpadding="0" cellspacing="0" style="width:100%; margin-top:12px; border:1px solid #ddd; border-radius:6px; border-collapse:collapse;">' +
    '<tr style="background:#f7f5fb;"><th style="padding:6px 10px; text-align:left; font-size:12px; color:#888;">Charge</th><th style="padding:6px 10px; text-align:right; font-size:12px; color:#888;">Amount</th><th style="padding:6px 10px; text-align:right; font-size:12px; color:#888;">Running Total</th></tr>' +
    rows.join('') +
    '<tr><td style="padding:8px 10px; font-weight:bold; border-top:2px solid #ccc;">Total</td><td style="border-top:2px solid #ccc;"></td><td style="padding:8px 10px; text-align:right; font-weight:bold; border-top:2px solid #ccc;">$' + running.toFixed(2) + '</td></tr>' +
    '</table>'
  )
}

function paymentHistoryHtml(payments: Array<{ amount: number; method?: string | null; createdAt: string; recordedByName?: string | null }>) {
  if (!payments.length) return ''
  const rows = payments
    .map((p) => {
      const who = p.recordedByName ? p.recordedByName + ' - ' : ''
      const methodLabel = p.method === 'card' ? 'Credit Card' : (p.method || 'Payment')
      return '<tr><td style="padding:6px 10px; font-size:13px; color:#555; text-align:left; border-top:1px solid #eee;">' + who + formatDateTime(p.createdAt) + ' - ' + methodLabel + '</td><td style="padding:6px 10px; font-size:13px; color:#555; text-align:right; border-top:1px solid #eee;">$' + p.amount.toFixed(2) + '</td></tr>'
    })
    .join('')
  return (
    '<div style="margin-top:16px;"><strong>Payment History:</strong>' +
    '<table cellpadding="0" cellspacing="0" style="width:100%; margin-top:8px; border:1px solid #ddd; border-radius:6px; border-collapse:collapse;">' +
    '<tr style="background:#f7f5fb;"><th style="padding:6px 10px; text-align:left; font-size:12px; color:#888;">Date / Method</th><th style="padding:6px 10px; text-align:right; font-size:12px; color:#888;">Amount</th></tr>' +
    rows +
    '</table></div>'
  )
}

interface OrderEmailItem {
  name: string
  quantity: number
  unitPrice?: number
  total: number
  image?: string | null
}

export function orderConfirmationEmail(order: {
  orderNumber: string
  id: string
  customerName: string
  eventDate: string
  eventAddress?: string | null
  eventCity?: string | null
  eventState?: string | null
  eventZip?: string | null
  deliveryType?: string | null
  eventTimeSlot?: string | null
  pickupTimeSlot?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  totalAmount: number
  depositAmount: number
  balanceDue: number
  items: OrderEmailItem[]
}, setting?: { subject?: string }) {
  return {
    subject: setting?.subject || `Order Confirmation #${order.orderNumber} - Friendly Party Rental NYC`,
    html: `
      <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${emailHeader()}
        <h2 style="color: #1A6FD4;">Thank You for Your Order!</h2>
        <p>Dear ${order.customerName},</p>
        <p>Your party rental order has been confirmed. Here are the details:</p>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        ${eventDetailsHtml(order)}
        ${itemsTableHtml(order.items)}
        <p style="margin-top:16px;"><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>
        <p><strong>Deposit Paid:</strong> $${order.depositAmount.toFixed(2)}</p>
        <p><strong>Balance Due:</strong> $${order.balanceDue.toFixed(2)}</p>
        <p style="margin-top:20px;"><a href="${NYC_PUBLIC_ORIGIN}/contract/${order.id}" style="background:#1A6FD4;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">View &amp; Sign Your Contract</a></p>
        ${policyFooterHtml()}
        ${emailFooter()}
      </div>
    `,
  }
}

export function quoteEmail(order: {
  orderNumber: string
  customerName: string
  eventDate: string
  eventAddress?: string | null
  eventCity?: string | null
  eventState?: string | null
  eventZip?: string | null
  deliveryType?: string | null
  eventTimeSlot?: string | null
  pickupTimeSlot?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  totalAmount: number
  amountDue: number
  items: OrderEmailItem[]
  payLink: string
}) {
  return {
    subject: `Your Quote #${order.orderNumber} - Friendly Party Rental NYC`,
    html: `
      <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${emailHeader()}
        <h2 style="color: #1A6FD4;">Your Party Rental Quote</h2>
        <p>Dear ${order.customerName},</p>
        <p>Thank you for the opportunity to quote your event. Here are the details:</p>
        <p><strong>Quote Number:</strong> ${order.orderNumber}</p>
        ${eventDetailsHtml(order)}
        ${itemsTableHtml(order.items)}
        <p style="margin-top:16px;"><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>
        <p><strong>Amount Due Now:</strong> $${order.amountDue.toFixed(2)}</p>
        <p style="margin: 24px 0;">
          <a href="${order.payLink}" style="background:#1A6FD4;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">View Quote &amp; Pay Online</a>
        </p>
        ${policyFooterHtml()}
        ${emailFooter()}
      </div>
    `,
  }
}

export function updatedReceiptEmail(order: {
  orderNumber: string
  customerName: string
  eventDate: string
  eventAddress?: string | null
  eventCity?: string | null
  eventState?: string | null
  eventZip?: string | null
  deliveryType?: string | null
  eventTimeSlot?: string | null
  pickupTimeSlot?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  totalAmount: number
  amountPaid: number
  amountDue: number
  items: OrderEmailItem[]
  payLink: string
}) {
  return {
    subject: `Updated Receipt - Order #${order.orderNumber} - Friendly Party Rental NYC`,
    html: `
      <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${emailHeader()}
        <h2 style="color: #1A6FD4;">Your Order Has Been Updated</h2>
        <p>Dear ${order.customerName},</p>
        <p>Your order has been updated as requested. Here is your updated receipt:</p>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        ${eventDetailsHtml(order)}
        ${itemsTableHtml(order.items)}
        <p style="margin-top:16px;"><strong>Order Total:</strong> $${order.totalAmount.toFixed(2)}</p>
        <p><strong>Amount Paid:</strong> $${order.amountPaid.toFixed(2)}</p>
        <p><strong>Balance Due:</strong> $${order.amountDue.toFixed(2)}</p>
        <p style="margin: 24px 0;">
          <a href="${order.payLink}" style="background:#1A6FD4;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Pay Balance Due</a>
        </p>
        ${policyFooterHtml()}
        ${emailFooter()}
      </div>
    `,
  }
}

export function paymentReceiptEmail(payment: {
  orderNumber: string
  customerName: string
  amountPaid: number
  totalAmount: number
  balanceDue: number
  eventDate: string
  eventAddress?: string | null
  eventCity?: string | null
  eventState?: string | null
  eventZip?: string | null
  deliveryType?: string | null
  eventTimeSlot?: string | null
  pickupTimeSlot?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  id?: string
  items?: OrderEmailItem[]
  subtotal?: number
  damageWaiver?: boolean
  damageWaiverFee?: number
  deliveryFee?: number
  deliveryDistance?: number | null
  taxAmount?: number
  taxRate?: number
  depositAmount?: number
  payments?: Array<{ amount: number; method?: string | null; createdAt: string; recordedByName?: string | null }>
}) {
  return {
    subject: `Payment Receipt #${payment.orderNumber} - Friendly Party Rental NYC`,
    html: `
      <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${emailHeader()}
        <h2 style="color: #1A6FD4;">Payment Received - Thank You!</h2>
        <p>Dear ${payment.customerName},</p>
        <p>We've received your payment. Here is your receipt:</p>
        <p><strong>Order Number:</strong> ${payment.orderNumber}</p>
        ${eventDetailsHtml(payment)}
        ${payment.items && payment.items.length ? itemsTableHtml(payment.items) : ''}
        ${feeBreakdownHtml(payment)}
        <p style="margin-top:16px;"><strong>Payment Received:</strong> $${payment.amountPaid.toFixed(2)}</p>
        <p><strong>Order Total:</strong> $${payment.totalAmount.toFixed(2)}</p>
        <p><strong>Remaining Balance:</strong> $${payment.balanceDue.toFixed(2)}</p>
        ${payment.payments && payment.payments.length ? paymentHistoryHtml(payment.payments) : ''}
        ${payment.id ? '<p style="margin-top:20px;"><a href="' + NYC_PUBLIC_ORIGIN + '/contract/' + payment.id + '" style="background:#1A6FD4;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">View &amp; Sign Your Contract</a></p>' : ''}
        ${policyFooterHtml()}
        ${emailFooter()}
      </div>
    `,
  }
}

export function newOrderAdminNotificationEmail(order: {
  orderNumber: string
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  eventDate: string
  totalAmount: number
  amountPaid: number
}) {
  return {
    subject: `New Order #${order.orderNumber} - Payment Pending - Friendly Party Rental NYC`,
    html: `
    <div style="font-family: Roboto, sans-serif; max-width: 600px;">
    <h2 style="color: #1A6FD4;">New Order Received</h2>
    <p>A new order has been placed on the website and is awaiting payment.</p>
    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
    <p><strong>Customer:</strong> ${order.customerName}</p>
    <p><strong>Phone:</strong> ${order.customerPhone || 'N/A'}</p>
    <p><strong>Email:</strong> ${order.customerEmail || 'N/A'}</p>
    <p><strong>Event Date:</strong> ${order.eventDate}</p>
    <p><strong>Order Total:</strong> $${order.totalAmount.toFixed(2)}</p>
    <p><strong>Amount Paid So Far:</strong> $${order.amountPaid.toFixed(2)}</p>
    <p>Please follow up if payment is not completed soon.</p>
    </div>
    `,
  }
}

export function employmentApplicationEmail(data: {
  name: string
  phone?: string
  email: string
  position?: string
  availability?: string
  experience?: string
  whyWorkWithUs?: string
  message?: string
}) {
  return {
    subject: `New Employment Application: ${data.name} - Friendly Party Rental NYC`,
    html: `
      <div style="font-family: Roboto, sans-serif;">
        <h2>New Employment Application</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
        <p><strong>Position:</strong> ${data.position || 'N/A'}</p>
        <p><strong>Availability:</strong> ${data.availability || 'N/A'}</p>
        <p><strong>Experience:</strong> ${data.experience || 'N/A'}</p>
        <p><strong>Why work with us:</strong> ${data.whyWorkWithUs || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <p>${data.message || 'N/A'}</p>
      </div>
    `,
  }
}

export function contactFormEmail(data: {
  name: string
  email: string
  phone?: string
  eventDate?: string
  message: string
}) {
  return {
    subject: `New Contact Form Submission from ${data.name} - Friendly Party Rental NYC`,
    html: `
      <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${emailHeader()}
        <h2 style="color: #1A6FD4;">New Contact Form Message</h2>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Email:</strong> ${data.email}</p>
        <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
        <p><strong>Event Date:</strong> ${data.eventDate || 'N/A'}</p>
        <p><strong>Message:</strong></p>
        <p>${data.message.replace(/\n/g, '<br/>')}</p>
        ${emailFooter()}
      </div>
    `,
  }
}

export function selfServiceQuoteEmail(data: {
  customerName: string
  eventDate: string
  eventTimeSlot?: string | null
  pickupTimeSlot?: string | null
  deliveryType?: string | null
  items: Array<{ name: string; quantity: number; total: number; image?: string | null }>
  subtotal: number
}) {
  const itemsHtml = data.items
    .map((i) => {
      const imgTag = (i.image && /^https?:\/\//.test(i.image)) ? '<img src="' + i.image + '" width="40" height="40" style="object-fit:cover;border-radius:4px;vertical-align:middle;margin-right:8px;" />' : ''
      return '<tr><td style="padding:8px; border-bottom:1px solid #eee;">' + imgTag + i.name + '</td><td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">' + i.quantity + '</td><td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">$' + i.total.toFixed(2) + '</td></tr>'
    })
    .join('')

  return {
    subject: 'Your Quote from Friendly Party Rental NYC',
    html: `
      <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${emailHeader()}
        <h2 style="color: #1A6FD4;">Your Party Rental Quote</h2>
        <p>Hi ${data.customerName || 'there'},</p>
        <p>Thanks for building a quote with us! Here's a summary of what you selected:</p>
        <p><strong>Event Date:</strong> ${data.eventDate || 'Not selected yet'}</p>
        ${data.eventTimeSlot ? `<p><strong>Time:</strong> ${data.eventTimeSlot}</p>` : ''}
        ${data.pickupTimeSlot && data.pickupTimeSlot !== data.eventTimeSlot ? `<p><strong>Pickup/Return:</strong> ${data.pickupTimeSlot}</p>` : ''}
        ${data.deliveryType ? `<p><strong>Method:</strong> ${data.deliveryType === 'pickup' ? 'Customer Pickup' : 'Delivery'}</p>` : ''}
        <table border="1" cellpadding="6" cellspacing="0" style="width:100%; border-collapse: collapse; margin-top: 12px;">
          ${itemsHtml}
          <tr><td style="padding:8px; font-weight:bold;">Subtotal</td><td style="padding:8px; text-align:right; font-weight:bold;">$${data.subtotal.toFixed(2)}</td></tr>
        </table>
        <p style="margin-top:16px; font-size:13px; color:#666;">Delivery fees and sales tax are calculated at checkout based on your address. This quote does not reserve your date - complete checkout to confirm your booking.</p>
        <p style="margin-top:24px;"><a href="${NYC_PUBLIC_ORIGIN}/checkout">Return to checkout to complete your booking</a></p>
        ${emailFooter()}
      </div>
    `,
  }
}

export function cancellationMessageEmail(data: {
  orderNumber: string
  customerName: string
  eventDate: string
  message: string
}) {
  const messageHtml = data.message.replace(/\n/g, '<br/>')
  return {
    subject: `Regarding Your Canceled Order #${data.orderNumber} - Friendly Party Rental NYC`,
    html: `
      <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${emailHeader()}
        <h2 style="color: #1A6FD4;">Friendly Party Rental NYC</h2>
        <p>Dear ${data.customerName},</p>
        <p>${messageHtml}</p>
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Event Date:</strong> ${data.eventDate}</p>
        ${emailFooter()}
      </div>
    `,
  }
}

export function prePaymentReminderEmail(
    setting: { subject: string; content: string },
    order: { orderNumber: string; payLink: string }
  ) {
    const paymentButtonHtml = `<p style="margin: 24px 0;"><a href="${order.payLink}" style="background:#1A6FD4;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Review Order &amp; Pay Balance</a></p>`

    const subject = setting.subject.replace(/\[Order ID\]/g, order.orderNumber)
    const bodyHtml = setting.content
      .replace(/\[Order ID\]/g, order.orderNumber)
      .replace(/\[Payment Link\]/g, paymentButtonHtml)
      .replace(/\n/g, '<br/>')

    return {
          subject,
          html: `
                <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                        ${emailHeader()}
                                ${bodyHtml}
                                        ${emailFooter()}
                                              </div>
                                                  `,
    }
}

export function incompleteOrderRecaptureEmail(
  setting: { subject: string; content: string },
  order: { firstName: string; orderId: string; resumeLink: string }
  ) {
  const name = order.firstName || 'there'
    const subject = setting.subject
      .replace(/\[Order ID\]/g, order.orderId)
      .replace(/\{customer\.firstname\}/gi, name)
      const bodyHtml = setting.content
        .replace(/\[Order ID\]/g, order.orderId)
        .replace(/\{customer\.firstname\}/gi, name)
        .replace(/\n/g, '<br/>') + '<p><a href="' + order.resumeLink + '">' + order.resumeLink + '</a></p>'
        return {
          subject,
          html: `
          <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          ${emailHeader()}
          ${bodyHtml}
          ${emailFooter()}
          </div>
          `,
        }
}

export function balanceReminderEmail(order: {
  orderNumber: string
  customerName: string
  eventDate: string
  eventAddress?: string | null
  eventCity?: string | null
  eventState?: string | null
  eventZip?: string | null
  balanceDue: number
  payLink: string
}) {
  const fullAddress = [order.eventAddress, order.eventCity, order.eventState, order.eventZip]
    .filter(Boolean)
    .join(', ')
  return {
    subject: `Reminder: balance due for your upcoming event`,
    html: `
      <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${emailHeader()}
        <h2 style="color: #1A6FD4;">Balance Reminder</h2>
        <p>Dear ${order.customerName},</p>
        <p>Your event is coming up soon! This is a friendly reminder that there is a remaining balance due on your order.</p>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p><strong>Event Date:</strong> ${order.eventDate}</p>
        ${fullAddress ? `<p><strong>Event Address:</strong> ${fullAddress}</p>` : ''}
        <p><strong>Balance Due:</strong> $${order.balanceDue.toFixed(2)}</p>
        <p style="margin: 24px 0;">
          <a href="${order.payLink}" style="background:#1A6FD4;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Pay Balance Now</a>
        </p>
        <p>If you have already made arrangements to pay, no action is needed.</p>
        ${emailFooter()}
      </div>
    `,
  }
}

export function preRentalReminderEmail(setting: { subject: string; content: string }, order: { orderNumber: string }) {
  const subject = setting.subject.replace(/\[Order ID\]/g, order.orderNumber)
  const bodyHtml = setting.content.replace(/\[Order ID\]/g, order.orderNumber).replace(/\n/g, '<br/>')
  return {
    subject,
    html: `
      <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${emailHeader()}
        <p>${bodyHtml}</p>
        ${emailFooter()}
      </div>
    `,
  }
}

export function thankYouEmail(order: {
  orderNumber: string
  customerName: string
}, setting?: { subject?: string }) {
  return {
    subject: setting?.subject || `Thank you for choosing ${BUSINESS.name}!`,
    html: `
      <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${emailHeader()}
        <h2 style="color: #1A6FD4;">Thank You!</h2>
        <p>Dear ${order.customerName},</p>
        <p>Thank you for choosing ${BUSINESS.name} for your recent event. We hope everything went smoothly and that your celebration was a success.</p>
        <p><strong>Order Number:</strong> ${order.orderNumber}</p>
        <p>If you have a moment, we would appreciate an honest Google review. Your feedback—positive or critical—helps other Riverdale-area customers know what to expect and helps our local team improve.</p>
        <p style="margin:24px 0;">
          <a href="${BUSINESS.googleProfile}" style="background:#1A6FD4;color:#fff;padding:12px 22px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:bold;">Review ${BUSINESS.name} on Google</a>
        </p>
        <p>If anything needs our attention, you can also reply directly to this email or call us at ${BUSINESS.phone}.</p>
        <p>We hope to be part of your next celebration!</p>
        ${emailFooter()}
      </div>
    `,
  }
}

export function oneYearReminderEmail(setting: { subject: string; content: string }, customerName: string) {
  const bodyHtml = setting.content.replace(/\n/g, '<br/>')
  return {
    subject: setting.subject,
    html: `
      <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        ${emailHeader()}
        <p>Dear ${customerName},</p>
        <p>${bodyHtml}</p>
        ${emailFooter()}
      </div>
    `,
  }
}


export function meetingInviteEmail(meeting: {
    customerName: string
    scheduledAt: Date | string
    zoomLink: string
}) {
    const d = typeof meeting.scheduledAt === 'string' ? new Date(meeting.scheduledAt) : meeting.scheduledAt
    const when = d.toLocaleString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'UTC',
    })
    return {
          subject: `Your Meeting is Scheduled - ${BUSINESS.name}`,
          html: `
                <div style="font-family: Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                        ${emailHeader()}
                                <h2 style="color: #1A6FD4;">Your Meeting is Scheduled</h2>
                                        <p>Hi ${meeting.customerName},</p>
                                                <p>We've scheduled a Zoom meeting with you for <strong>${when}</strong>.</p>
                                                        <p style="margin: 24px 0;">
                                                                  <a href="${meeting.zoomLink}" style="background:#1A6FD4;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">Join Meeting</a>
                                                                          </p>
                                                                                  <p style="font-size:13px;color:#555;">You can join right from your phone or computer by tapping the button above at the scheduled time.</p>
                                                                                          ${emailFooter()}
                                                                                                </div>
                                                                                                    `,
    }
}
