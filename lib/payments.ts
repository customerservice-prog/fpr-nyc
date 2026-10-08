import { prisma } from '@/lib/prisma'
import { sendEmail, orderConfirmationEmail, paymentReceiptEmail } from '@/lib/email'
import { formatDate } from '@/lib/utils'
import { ownerNotificationRecipients } from '@/lib/orderLifecycleNotifications'
import { NYC_PUBLIC_ORIGIN } from '@/lib/nycPublicOrigin'
/** Email photo of an order line: the NYC photo proxy (never another store's image host). */
function nycItemImage(item: { slug?: string | null; picture?: string | null } | null | undefined): string | null {
  return item?.slug && item.picture ? NYC_PUBLIC_ORIGIN + '/api/item-image/' + encodeURIComponent(item.slug) : null
}


export async function finalizePayment(input: {
  orderId: string
  amount: number
  tipAmount?: number
  stripePaymentId?: string | null
  method?: string
  notes?: string
  savedPaymentMethodId?: string | null
  stripeCustomerId?: string | null
  autopayEnabled?: boolean
  recordedByName?: string | null
  receiptReason?: string
  sendReceipt?: boolean; skipEmail?: boolean
  /**
   * Set for money Stripe has already captured (verified server-side). A real charge
   * must always be recorded, even if it exceeds the balance (duplicate tab, canceled
   * order): it is stored and flagged for staff review/refund instead of being dropped.
   */
  allowOverpayment?: boolean
  /** Additional charge (e.g. saved-card damage charge) that raises the order total. Applied once, atomically. */
  increaseTotalBy?: number
}) {
  const { orderId, amount, tipAmount, stripePaymentId, method, notes, savedPaymentMethodId, stripeCustomerId, autopayEnabled, recordedByName, sendReceipt, skipEmail, receiptReason, allowOverpayment } = input

  const paidAmount = Math.round((Number(amount) || 0) * 100) / 100
  const tip = Math.round((Number(tipAmount) || 0) * 100) / 100
  const increase = Math.round((Number(input.increaseTotalBy) || 0) * 100) / 100
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) throw new Error('Payment amount must be greater than zero')
  if (!Number.isFinite(tip) || tip < 0) throw new Error('Tip cannot be negative')
  if (!Number.isFinite(increase) || increase < 0) throw new Error('Additional charge cannot be negative')
  const result = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM "Order" WHERE id = ${orderId} FOR UPDATE`
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: { include: { item: true } }, customer: true, payments: true } })
    if (!order) throw new Error('Order not found')
    if (stripePaymentId) {
      const existing = await tx.payment.findUnique({ where: { stripePaymentId } })
      if (existing) {
        if (existing.orderId !== orderId) throw new Error('Payment belongs to another order')
        return { updated: order, isFirstPayment: false, duplicate: true, overpaidBy: 0 }
      }
    }
    const totalWithNewTip = Math.round((Number(order.totalAmount || 0) + increase + tip) * 100) / 100
    const alreadyPaid = Math.round(Number(order.amountPaid || 0) * 100) / 100
    const amountOwed = Math.max(Math.round((totalWithNewTip - alreadyPaid) * 100) / 100, 0)
    let overpaidBy = 0
    if (amountOwed <= 0 || paidAmount > amountOwed) {
      if (!allowOverpayment) {
        if (amountOwed <= 0) throw new Error('Order is already paid in full. No additional payment is allowed.')
        throw new Error(`Payment cannot exceed the remaining balance of $${amountOwed.toFixed(2)}`)
      }
      overpaidBy = Math.round((paidAmount - amountOwed) * 100) / 100
    }
    if (stripePaymentId) {
      // A "processing" placeholder row for this PaymentIntent is superseded by the real payment.
      await tx.payment.updateMany({ where: { orderId, stripePaymentId: stripePaymentId + '_pending', status: 'pending' }, data: { status: 'cleared' } })
    }
    const overpaymentNote = overpaidBy > 0 ? ` | OVERPAYMENT of $${overpaidBy.toFixed(2)} (paid after balance was covered) - review and refund if needed` : ''
    const newAmountPaid = Math.round((alreadyPaid + paidAmount) * 100) / 100
    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: Math.max(Math.round((totalWithNewTip - newAmountPaid) * 100) / 100, 0),
        totalAmount: totalWithNewTip,
        tipAmount: Math.round(((order.tipAmount || 0) + tip) * 100) / 100,
        status: ['quote','incomplete'].includes(order.status) && newAmountPaid >= (order.depositAmount > 0 ? order.depositAmount : order.totalAmount) - 0.01 ? 'active' : order.status,
        checkoutStage: 'completed',
        checkoutCompletedAt: order.checkoutCompletedAt || new Date(),
        checkoutLastSeenAt: new Date(),
        stripePaymentId: stripePaymentId || order.stripePaymentId,
        ...(savedPaymentMethodId ? { savedPaymentMethodId } : {}),
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
        ...(typeof autopayEnabled === 'boolean' ? { autopayEnabled } : {}),
        payments: { create: { amount: paidAmount, method: method || 'card', stripePaymentId: stripePaymentId || null, notes: (notes || (stripePaymentId ? 'Online payment via pay link' : 'Payment recorded by staff')) + overpaymentNote, recordedByName: recordedByName || null } },
      },
      include: { items: { include: { item: true } }, customer: true, payments: true },
    })
    return { updated, isFirstPayment: alreadyPaid === 0, duplicate: false, overpaidBy }
  })
  const { updated, isFirstPayment } = result
  if (result.duplicate) return updated

  if (result.overpaidBy > 0) {
    console.error(`[finalizePayment] Overpayment recorded for order ${orderId}: $${result.overpaidBy.toFixed(2)} (${stripePaymentId || 'manual'})`)
    try {
      await sendEmail({
        to: ownerNotificationRecipients(),
        subject: `[Action needed] Overpayment on NYC order ${updated.orderNumber}`,
        html: `<p>A verified payment of $${paidAmount.toFixed(2)} was recorded on order ${updated.orderNumber}, which exceeded the remaining balance by $${result.overpaidBy.toFixed(2)}.</p><p>Stripe reference: ${stripePaymentId || 'manual entry'}. Please review the order and refund the extra amount if appropriate.</p>`,
      })
    } catch (err) { console.error('[finalizePayment] Overpayment alert email failed:', err) }
  }

  try {
    const reasonHtml = receiptReason ? '<p><strong>Charge reason:</strong> ' + receiptReason.replace(/[&<>"\']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] || c)) + '</p>' : ''
    const email = updated.customer?.email || ''
    const isPlaceholderEmail = email.includes('@imported.friendlypartyrental.local') || email.startsWith('no-email-')
    const isCanceled = updated.status === 'canceled'
    if (!skipEmail) {
      const canEmailCustomer = !!email && !isPlaceholderEmail
      const customerName = updated.customer.firstName + ' ' + updated.customer.lastName
      const sharedDetails = { eventAddress: updated.eventAddress, eventCity: updated.eventCity, eventState: updated.eventState, eventZip: updated.eventZip, deliveryType: updated.deliveryType, eventTimeSlot: updated.eventTimeSlot, pickupTimeSlot: updated.pickupTimeSlot, eventStartTime: updated.eventStartTime, eventEndTime: updated.eventEndTime, deliveryWindowStart: updated.deliveryWindowStart, deliveryWindowEnd: updated.deliveryWindowEnd, exactDeliveryRequested: updated.exactDeliveryRequested, exactDeliveryTime: updated.exactDeliveryTime, pickupType: updated.pickupType, pickupRequiredByTime: updated.pickupRequiredByTime, exactPickupTime: updated.exactPickupTime, customerPhone: updated.customer.phone, customerEmail: updated.customer.email, subtotal: updated.subtotal, rentalDays: updated.rentalDays, durationLabel: updated.durationLabel, durationFee: updated.durationFee, specialRequestFee: updated.specialRequestFee, specialRequestNames: updated.specialRequestNames, damageWaiver: updated.damageWaiver, damageWaiverFee: updated.damageWaiverFee, deliveryFee: updated.deliveryFee, deliveryDistance: updated.deliveryDistance, exactDeliveryFee: updated.exactDeliveryFee, exactPickupFee: updated.exactPickupFee, lastMinuteFeeAmount: updated.lastMinuteFeeAmount, miscellaneousFees: updated.miscellaneousFees, couponCode: updated.couponCode, couponDiscount: updated.couponDiscount, generalDiscount: updated.generalDiscount, taxAmount: updated.taxAmount, taxRate: updated.taxRate, tipAmount: updated.tipAmount }
      if (isFirstPayment) {
        const setting = await prisma.automaticMessage.findFirst({ where: { id: 'automsg_order_confirmation' } })
        const content = orderConfirmationEmail({ id: updated.id, orderNumber: updated.orderNumber, customerName, eventDate: formatDate(updated.eventDate), totalAmount: updated.totalAmount, depositAmount: paidAmount, balanceDue: updated.balanceDue, items: updated.items.map(i => ({ name:i.itemName, quantity:i.quantity, unitPrice:i.unitPrice, total:i.total, image:nycItemImage(i.item) })), ...sharedDetails }, setting ?? undefined)
        if (setting?.enabled !== false && canEmailCustomer && !isCanceled && sendReceipt !== false) try { await sendEmail({to:email,subject:content.subject,html:content.html + reasonHtml}) } catch {}
      } else {
        const content = paymentReceiptEmail({ id:updated.id, orderNumber:updated.orderNumber, customerName, amountPaid:paidAmount, totalAmount:updated.totalAmount, balanceDue:updated.balanceDue, eventDate:formatDate(updated.eventDate), items:updated.items.map(i=>({name:i.itemName,quantity:i.quantity,unitPrice:i.unitPrice,total:i.total,image:nycItemImage(i.item)})), depositAmount:updated.depositAmount, payments:(updated.payments||[]).map(p=>({amount:p.amount,method:p.method,createdAt:formatDate(p.createdAt),recordedByName:p.recordedByName})), ...sharedDetails })
        if (canEmailCustomer && !isCanceled && sendReceipt !== false) try { await sendEmail({to:email,subject:content.subject,html:content.html + reasonHtml}) } catch {}
      }
    }
  } catch (err) { console.error(`[finalizePayment] Payment confirmation email error for order ${orderId}:`, err) }
  return updated
}

export async function removePayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw new Error('Payment not found')
  const order = await prisma.order.findUnique({ where: { id: payment.orderId }, include: { payments: true } })
  if (!order) throw new Error('Order not found')
  await prisma.payment.delete({ where: { id: paymentId } })
  const remainingPayments = order.payments.filter(p => p.id !== paymentId)
  const newAmountPaid = remainingPayments.reduce((sum,p)=>sum+p.amount,0)
  const newBalanceDue = Math.max(Math.round((order.totalAmount-newAmountPaid)*100)/100,0)
  return prisma.order.update({ where:{id:order.id}, data:{amountPaid:newAmountPaid,balanceDue:newBalanceDue}, include:{items:{include:{item:true}},customer:true,payments:true} })
}

