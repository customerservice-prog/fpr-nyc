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
    if (existing) return prisma.order.findUnique({ where: { id: orderId }, include: { items: true, customer: true } })
  }

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, customer: true } })
  if (!order) throw new Error('Order not found')

  const paidAmount = Math.round((Number(amount) || 0) * 100) / 100
  const tip = Math.round((Number(tipAmount) || 0) * 100) / 100
  if (paidAmount <= 0) throw new Error('Payment amount must be greater than zero')
  if (tip < 0) throw new Error('Tip cannot be negative')

  const totalWithNewTip = Math.round((Number(order.totalAmount || 0) + tip) * 100) / 100
  const alreadyPaid = Math.round(Number(order.amountPaid || 0) * 100) / 100
  const amountOwed = Math.max(Math.round((totalWithNewTip - alreadyPaid) * 100) / 100, 0)

  if (amountOwed <= 0) throw new Error('Order is already paid in full. No additional payment is allowed.')
  if (paidAmount > amountOwed) throw new Error(`Payment cannot exceed the remaining balance of $${amountOwed.toFixed(2)}`)

  const isFirstPayment = alreadyPaid === 0
  const newTotalAmount = totalWithNewTip
  const newAmountPaid = Math.round((alreadyPaid + paidAmount) * 100) / 100
  const newBalanceDue = Math.max(Math.round((newTotalAmount - newAmountPaid) * 100) / 100, 0)

  let updated
  try {
    updated = await prisma.order.update({
      where: { id: orderId },
      data: {
        amountPaid: newAmountPaid,
        balanceDue: newBalanceDue,
        totalAmount: newTotalAmount,
        tipAmount: Math.round(((order.tipAmount || 0) + tip) * 100) / 100,
        status: order.status === 'quote' && newAmountPaid >= (order.depositAmount > 0 ? order.depositAmount : order.totalAmount) - 0.01 ? 'active' : order.status,
        stripePaymentId: stripePaymentId || order.stripePaymentId,
        ...(savedPaymentMethodId ? { savedPaymentMethodId } : {}),
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
        ...(typeof autopayEnabled === 'boolean' ? { autopayEnabled } : {}),
        payments: { create: { amount: paidAmount, method: method || 'card', stripePaymentId: stripePaymentId || null, notes: notes || (stripePaymentId ? 'Online payment via pay link' : 'Payment recorded by staff'), recordedByName: recordedByName || null } },
      },
      include: { items: { include: { item: true } }, customer: true, payments: true },
    })
  } catch (err: any) {
    if (err?.code === 'P2002' && stripePaymentId) return prisma.order.findUnique({ where: { id: orderId }, include: { items: true, customer: true } })
    throw err
  }

  try {
    const email = updated.customer?.email || ''
    const isPlaceholderEmail = email.includes('@imported.friendlypartyrental.local') || email.startsWith('no-email-')
    const isCanceled = updated.status === 'canceled'
    if (!skipEmail) {
      const canEmailCustomer = !!email && !isPlaceholderEmail
      const customerName = updated.customer.firstName + ' ' + updated.customer.lastName
      const sharedDetails = { eventAddress: updated.eventAddress, eventCity: updated.eventCity, eventState: updated.eventState, eventZip: updated.eventZip, deliveryType: updated.deliveryType, eventTimeSlot: updated.eventTimeSlot, pickupTimeSlot: updated.pickupTimeSlot, customerPhone: updated.customer.phone, customerEmail: updated.customer.email }
      if (isFirstPayment) {
        const setting = await prisma.automaticMessage.findFirst({ where: { id: 'automsg_order_confirmation' } })
        const content = orderConfirmationEmail({ id: updated.id, orderNumber: updated.orderNumber, customerName, eventDate: formatDate(updated.eventDate), totalAmount: updated.totalAmount, depositAmount: paidAmount, balanceDue: updated.balanceDue, items: updated.items.map(i => ({ name:i.itemName, quantity:i.quantity, unitPrice:i.unitPrice, total:i.total, image:i.item?.picture || null })), ...sharedDetails }, setting ?? undefined)
        if (setting?.enabled !== false && canEmailCustomer && !isCanceled && sendReceipt !== false) try { await sendEmail({to:email,subject:content.subject,html:content.html}) } catch {}
        try { await sendEmail({to:BUSINESS.email,subject:'[Copy] '+content.subject,html:content.html}) } catch {}
      } else {
        const content = paymentReceiptEmail({ id:updated.id, orderNumber:updated.orderNumber, customerName, amountPaid:paidAmount, totalAmount:updated.totalAmount, balanceDue:updated.balanceDue, eventDate:formatDate(updated.eventDate), items:updated.items.map(i=>({name:i.itemName,quantity:i.quantity,unitPrice:i.unitPrice,total:i.total,image:i.item?.picture||null})), subtotal:updated.subtotal, damageWaiver:updated.damageWaiver, damageWaiverFee:updated.damageWaiverFee, deliveryFee:updated.deliveryFee, deliveryDistance:updated.deliveryDistance, taxAmount:updated.taxAmount, taxRate:updated.taxRate, depositAmount:updated.depositAmount, payments:(updated.payments||[]).map(p=>({amount:p.amount,method:p.method,createdAt:formatDate(p.createdAt),recordedByName:p.recordedByName})), ...sharedDetails })
        if (canEmailCustomer && !isCanceled && sendReceipt !== false) try { await sendEmail({to:email,subject:content.subject,html:content.html}) } catch {}
        try { await sendEmail({to:BUSINESS.email,subject:'[Copy] '+content.subject,html:content.html}) } catch {}
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
