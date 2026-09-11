import { prisma } from '@/lib/prisma'
import { sendEmail, orderConfirmationEmail, paymentReceiptEmail } from '@/lib/email'
import { formatDate } from '@/lib/utils'
import { BUSINESS } from '@/lib/utils'

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
  sendReceipt?: boolean; skipEmail?: boolean
}) {
  const { orderId, amount, tipAmount, stripePaymentId, method, notes, savedPaymentMethodId, stripeCustomerId, autopayEnabled, recordedByName, sendReceipt, skipEmail } = input

  if (stripePaymentId) {
    const existing = await prisma.payment.findFirst({ where: { stripePaymentId } })
    if (existing) { console.warn(`[finalizePayment] Duplicate call for stripePaymentId=${stripePaymentId} on order ${orderId} - a Payment record already exists, skipping re-processing (receipt email, if any, was already sent by the original call).`)
      return prisma.order.findUnique({ where: { id: orderId }, include: { items: true, customer: true } })
    }
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, customer: true } })
  if (!order) throw new Error('Order not found')

  const isFirstPayment = order.amountPaid === 0
  const paidAmount = Number(amount) || 0
  const tip = Number(tipAmount) || 0
  const newTotalAmount = order.totalAmount + tip
  const newAmountPaid = order.amountPaid + paidAmount
  const newBalanceDue = Math.round((newTotalAmount - newAmountPaid) * 100) / 100

  let updated
    try {
          updated = await prisma.order.update({
    where: { id: orderId },
    data: {
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
      totalAmount: newTotalAmount,
      tipAmount: (order.tipAmount || 0) + tip,
      status: order.status === 'quote' && newAmountPaid >= (order.depositAmount > 0 ? order.depositAmount : order.totalAmount) - 0.01 ? 'active' : order.status,
      stripePaymentId: stripePaymentId || order.stripePaymentId,
      ...(savedPaymentMethodId ? { savedPaymentMethodId } : {}),
      ...(stripeCustomerId ? { stripeCustomerId } : {}),
      ...(typeof autopayEnabled === 'boolean' ? { autopayEnabled } : {}),
      payments: {
        create: {
          amount: paidAmount,
          method: method || 'card',
          stripePaymentId: stripePaymentId || null,
          notes: notes || (stripePaymentId ? 'Online payment via pay link' : 'Payment recorded by staff'),
          recordedByName: recordedByName || null,
        },
      },
    },
    include: { items: { include: { item: true } }, customer: true, payments: true },
  })
    } catch (err: any) {
          if (err?.code === 'P2002' && stripePaymentId) { console.warn(`[finalizePayment] Race condition: order.update hit P2002 (duplicate) for stripePaymentId=${stripePaymentId} on order ${orderId} - skipping this call's receipt email since another concurrent call already recorded the payment.`)
                  return prisma.order.findUnique({ where: { id: orderId }, include: { items: true, customer: true } })
          }
          throw err
    }

  // Overpayment safety net: if this payment pushes the amount paid beyond
  // what is actually owed (accounting for any intentional tip), alert the
  // business immediately so it can be caught and refunded right away,
  // instead of only being discovered later by the customer or an audit.
  try {
    const overage = newAmountPaid - newTotalAmount
    if (!skipEmail && overage > 0.5) {
      const overpayCustomerName = (updated.customer?.firstName || '') + ' ' + (updated.customer?.lastName || '')
      await sendEmail({
        to: BUSINESS.email,
        subject: 'OVERPAYMENT ALERT - Order ' + updated.orderNumber,
        html:
          '<p><strong>This payment resulted in an overpayment that likely needs a refund.</strong></p>' +
          '<p>Order: ' + updated.orderNumber + '<br/>' +
          'Customer: ' + overpayCustomerName + '<br/>' +
          'This payment: $' + paidAmount.toFixed(2) + '<br/>' +
          'Total paid so far: $' + newAmountPaid.toFixed(2) + '<br/>' +
          'Order total (incl. tip): $' + newTotalAmount.toFixed(2) + '<br/>' +
          'Overpaid by: $' + overage.toFixed(2) + '</p>' +
          '<p>Please review this order and issue a refund for the overpaid amount if appropriate.</p>',
      })
    }
  } catch (err) {
    console.error('Overpayment alert email error:', err)
  }

  try {
    const email = updated.customer?.email || ''
    const isPlaceholderEmail = email.includes('@imported.friendlypartyrental.local') || email.startsWith('no-email-')
    const isCanceled = updated.status === 'canceled'
    if (!skipEmail) {
      const canEmailCustomer = !!email && !isPlaceholderEmail
      const customerName = updated.customer.firstName + ' ' + updated.customer.lastName
      const sharedDetails = {
        eventAddress: updated.eventAddress,
        eventCity: updated.eventCity,
        eventState: updated.eventState,
        eventZip: updated.eventZip,
        deliveryType: updated.deliveryType,
        eventTimeSlot: updated.eventTimeSlot,
        pickupTimeSlot: updated.pickupTimeSlot,
        customerPhone: updated.customer.phone,
        customerEmail: updated.customer.email,
      }
      if (isFirstPayment) {
        const orderConfirmationSetting = await prisma.automaticMessage.findFirst({ where: { id: 'automsg_order_confirmation' } })
        const orderConfirmationEnabled = orderConfirmationSetting?.enabled !== false
        const emailContent = orderConfirmationEmail({
          id: updated.id,
          orderNumber: updated.orderNumber,
          customerName,
          eventDate: formatDate(updated.eventDate),
          totalAmount: updated.totalAmount,
          depositAmount: paidAmount,
          balanceDue: updated.balanceDue,
          items: updated.items.map((i) => ({ name: i.itemName, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total, image: i.item?.picture || null })),
          ...sharedDetails,
        }, orderConfirmationSetting ?? undefined)
if (orderConfirmationEnabled && canEmailCustomer && !isCanceled && sendReceipt !== false) { try { await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html }) } catch (err) { console.error('Customer email send failed:', err) } } try { await sendEmail({ to: BUSINESS.email, subject: '[Copy] ' + emailContent.subject, html: emailContent.html }) } catch (err) { console.error('Business copy email send failed:', err) }
      } else {
        const receiptContent = paymentReceiptEmail({
          id: updated.id,
          orderNumber: updated.orderNumber,
          customerName,
          amountPaid: paidAmount,
          totalAmount: updated.totalAmount,
          balanceDue: updated.balanceDue,
          eventDate: formatDate(updated.eventDate),
          items: updated.items.map((i) => ({ name: i.itemName, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total, image: i.item?.picture || null })),
          subtotal: updated.subtotal,
          damageWaiver: updated.damageWaiver,
          damageWaiverFee: updated.damageWaiverFee,
          deliveryFee: updated.deliveryFee,
          deliveryDistance: updated.deliveryDistance,
          taxAmount: updated.taxAmount,
          taxRate: updated.taxRate,
          depositAmount: updated.depositAmount,
          payments: (updated.payments || []).map((p) => ({ amount: p.amount, method: p.method, createdAt: formatDate(p.createdAt), recordedByName: p.recordedByName })),
          ...sharedDetails,
        })
if (canEmailCustomer && !isCanceled && sendReceipt !== false) { try { await sendEmail({ to: email, subject: receiptContent.subject, html: receiptContent.html }) } catch (err) { console.error('Customer email send failed:', err) } } try { await sendEmail({ to: BUSINESS.email, subject: '[Copy] ' + receiptContent.subject, html: receiptContent.html }) } catch (err) { console.error('Business copy email send failed:', err) }
      }
    }
  } catch (err) {
    console.error(`[finalizePayment] Payment confirmation email error for order ${orderId}:`, err)
  }

  return updated
}

export async function removePayment(paymentId: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } })
  if (!payment) throw new Error('Payment not found')

  const order = await prisma.order.findUnique({ where: { id: payment.orderId }, include: { payments: true } })
  if (!order) throw new Error('Order not found')

  await prisma.payment.delete({ where: { id: paymentId } })

  const remainingPayments = order.payments.filter((p) => p.id !== paymentId)
  const newAmountPaid = remainingPayments.reduce((sum, p) => sum + p.amount, 0)
    const newBalanceDue = Math.round((order.totalAmount - newAmountPaid) * 100) / 100

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: {
      amountPaid: newAmountPaid,
      balanceDue: newBalanceDue,
    },
    include: { items: { include: { item: true } }, customer: true, payments: true },
  })

  return updated
}
