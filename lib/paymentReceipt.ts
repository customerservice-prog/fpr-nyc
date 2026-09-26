export interface PaymentReceipt {
  paymentId: string
  orderId: string
  orderNumber: string
  amountPaid: number
  totalPaid: number
  totalAmount: number
  balanceDue: number
  currency: 'USD'
  status: 'succeeded'
  paidAt: string
  purchaseEligible: boolean
}

type CompletedIntent = {
  id: string
  status: string
  currency: string
  amount_received: number
  livemode: boolean
  metadata: { orderId?: string }
}

type RecordedOrder = {
  id: string
  orderNumber: string
  status: string
  amountPaid: number
  totalAmount: number
  balanceDue: number
  payments: Array<{
    id: string
    orderId: string
    stripePaymentId: string | null
    status: string
    amount: number
    createdAt: Date
  }>
}

export function buildPaymentReceipt(intent: CompletedIntent, order: RecordedOrder): PaymentReceipt | null {
  if (intent.status !== 'succeeded' || intent.currency !== 'usd'
    || intent.metadata.orderId !== order.id || !Number.isSafeInteger(intent.amount_received)
    || intent.amount_received <= 0) return null

  const payments = order.payments
    .filter(payment => payment.orderId === order.id && payment.status === 'succeeded'
      && Number.isFinite(payment.amount) && payment.amount > 0)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
  const payment = payments.find(entry => entry.stripePaymentId === intent.id)
  if (!payment || Math.round(payment.amount * 100) !== intent.amount_received
    || !Number.isFinite(payment.createdAt.getTime())) return null

  const recordedNetCents = order.payments
    .filter(entry => entry.orderId === order.id && entry.status === 'succeeded' && Number.isFinite(entry.amount))
    .reduce((sum, entry) => sum + Math.round(entry.amount * 100), 0)
  const ledgerMatchesPaidTotal = Number.isFinite(order.amountPaid)
    && Math.round(order.amountPaid * 100) === recordedNetCents
  const firstPaymentTime = payments[0]?.createdAt.getTime()
  const unambiguousFirstPayment = payments.filter(entry => entry.createdAt.getTime() === firstPaymentTime).length === 1

  return {
    paymentId: payment.id,
    orderId: order.id,
    orderNumber: order.orderNumber,
    amountPaid: intent.amount_received / 100,
    totalPaid: order.amountPaid,
    totalAmount: order.totalAmount,
    balanceDue: order.balanceDue,
    currency: 'USD',
    status: 'succeeded',
    paidAt: payment.createdAt.toISOString(),
    purchaseEligible: intent.livemode === true && ledgerMatchesPaidTotal && unambiguousFirstPayment
      && payments[0]?.id === payment.id
      && !['canceled','cancelled'].includes(order.status),
  }
}
