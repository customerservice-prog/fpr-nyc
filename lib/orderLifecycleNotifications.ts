import { BUSINESS, formatDate } from '@/lib/utils'

export function ownerNotificationRecipients() {
  const configured = String(process.env.OWNER_NOTIFICATION_EMAIL || '').trim()
  return Array.from(new Set([BUSINESS.email, configured].filter(Boolean).map(v => v.toLowerCase()))).join(',')
}

export function hasDeliverableCustomerEmail(email?: string | null) {
  const value = String(email || '').trim()
  return !!value && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    && !value.includes('@imported.friendlypartyrental.local')
    && !value.startsWith('no-email-')
}

function esc(value: unknown) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]!))
}

function money(value: unknown) {
  const amount = Number(value || 0)
  return '$' + (Number.isFinite(amount) ? amount : 0).toFixed(2)
}

export function orderReceivedEmail(order: {
  id: string
  orderNumber: string
  customerName: string
  eventDate: Date | string
  eventAddress?: string | null
  eventCity?: string | null
  eventState?: string | null
  eventZip?: string | null
  totalAmount: number
  depositAmount?: number | null
  items: Array<{ itemName: string; quantity: number; unitPrice: number; total: number }>
}) {
  const address = [order.eventAddress, order.eventCity, order.eventState, order.eventZip].filter(Boolean).join(', ')
  const rows = order.items.map(item =>
    '<tr><td style="padding:8px;border-bottom:1px solid #eee">' + esc(item.itemName) + '</td>' +
    '<td style="padding:8px;border-bottom:1px solid #eee;text-align:center">' + esc(item.quantity) + '</td>' +
    '<td style="padding:8px;border-bottom:1px solid #eee;text-align:right">' + money(item.total) + '</td></tr>'
  ).join('')
  const dueNow = Math.max(Number(order.depositAmount || 0), 0)
  return {
    subject: `Order Received #${order.orderNumber} - Friendly Party Rental`,
    html: `<div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#172536">
      <h2 style="color:#1A6FD4">We received your order</h2>
      <p>Hi ${esc(order.customerName)},</p>
      <p>Your order has been created. <strong>Your rentals are confirmed after the required payment is successfully completed.</strong></p>
      <p><strong>Order:</strong> ${esc(order.orderNumber)}<br>
      <strong>Event date:</strong> ${esc(formatDate(order.eventDate))}${address ? '<br><strong>Event location:</strong> ' + esc(address) : ''}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <tr style="background:#f5f7f8"><th style="padding:8px;text-align:left">Item</th><th style="padding:8px">Qty</th><th style="padding:8px;text-align:right">Amount</th></tr>
        ${rows}
      </table>
      <p><strong>Order total:</strong> ${money(order.totalAmount)}<br>
      <strong>Required payment now:</strong> ${money(dueNow)}</p>
      <p style="margin:24px 0"><a href="https://www.friendlypartyrentalsc.com/pay/${encodeURIComponent(order.id)}" style="background:#1A6FD4;color:#fff;padding:12px 20px;border-radius:7px;text-decoration:none;font-weight:bold">Complete Payment</a></p>
      <p style="font-size:13px;color:#555">After your payment succeeds, we will automatically email your confirmed-order receipt. Keep your order number for reference.</p>
      <p>Questions? Call or text ${esc(BUSINESS.phone)} or reply to this email.</p>
    </div>`
  }
}

export function automaticCancellationEmail(order: {
  orderNumber: string
  customerName: string
  eventDate: Date | string
}) {
  return {
    subject: `Order Canceled #${order.orderNumber} - Friendly Party Rental`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#172536">
      <h2 style="color:#1A6FD4">Your order has been canceled</h2>
      <p>Hi ${esc(order.customerName)},</p>
      <p>This email confirms that Friendly Party Rental order <strong>#${esc(order.orderNumber)}</strong> for <strong>${esc(formatDate(order.eventDate))}</strong> has been canceled.</p>
      <p>This cancellation notice does not by itself confirm a refund or credit. Any refund, raincheck, or other payment adjustment is handled separately and will be communicated to you if applicable.</p>
      <p>If you believe this was canceled in error, please call or text ${esc(BUSINESS.phone)}.</p>
    </div>`
  }
}

export function ownerCancellationEmail(order: {
  id: string
  orderNumber: string
  customerName: string
  customerEmail?: string | null
  customerPhone?: string | null
  eventDate: Date | string
  amountPaid: number
  balanceDue: number
}) {
  return {
    subject: `[Canceled] Order #${order.orderNumber} - ${order.customerName}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:620px">
      <h2>Order canceled</h2>
      <p><strong>Order:</strong> ${esc(order.orderNumber)}<br>
      <strong>Customer:</strong> ${esc(order.customerName)}<br>
      <strong>Email:</strong> ${esc(order.customerEmail || 'N/A')}<br>
      <strong>Phone:</strong> ${esc(order.customerPhone || 'N/A')}<br>
      <strong>Event date:</strong> ${esc(formatDate(order.eventDate))}<br>
      <strong>Paid:</strong> ${money(order.amountPaid)}<br>
      <strong>Balance shown at cancellation:</strong> ${money(order.balanceDue)}</p>
      <p><a href="https://www.friendlypartyrentalsc.com/admin/orders/${encodeURIComponent(order.id)}">Review order in admin</a></p>
    </div>`
  }
}
