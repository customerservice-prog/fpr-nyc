export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { finalizePayment } from '@/lib/payments'

// Manual "Charge Saved Card" action for staff.
// Lets staff charge a customer's card on file (tokenized via Stripe - staff
// never sees or enters the actual card number) for damage, cleaning, or
// items that were kept or never returned. This is separate from the
// automatic pre-event Autopay cron (app/api/cron/auto-charge/route.ts) -
// this one is manually triggered, for any amount, at any time, with a
// required reason, from the order detail page.
export async function POST(
    request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if ((session.user as any).role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

  if (!stripe) {
        return NextResponse.json({ error: 'Stripe is not configured' }, { status: 400 })
  }

  try {
        const { amount, reason } = await request.json()

      const chargeAmount = Number(amount) || 0
        if (chargeAmount <= 0) {
                return NextResponse.json({ error: 'Enter a valid amount' }, { status: 400 })
        }
        if (!reason || !String(reason).trim()) {
                return NextResponse.json({ error: 'A reason is required (e.g. damage, item not returned)' }, { status: 400 })
        }

      const { id: orderId } = await params
        const order = await prisma.order.findUnique({ where: { id: orderId } })
        if (!order) {
                return NextResponse.json({ error: 'Order not found' }, { status: 404 })
        }

      if (!order.stripeCustomerId || !order.savedPaymentMethodId) {
              return NextResponse.json({ error: 'No card on file for this order. The customer must have paid by card and had their card saved before it can be charged.' }, { status: 400 })
      }

      const intent = await stripe.paymentIntents.create({
              amount: Math.round(chargeAmount * 100),
              currency: 'usd',
              customer: order.stripeCustomerId,
              payment_method: order.savedPaymentMethodId,
              off_session: true,
              confirm: true,
              metadata: {
                        orderId: order.id,
                        orderNumber: order.orderNumber,
                        chargeType: 'manual_saved_card_charge',
                        reason: String(reason).slice(0, 400),
                        chargedBy: session.user?.name || 'unknown',
              },
      })

      // Bump the order total by the charge amount first so this shows as a
      // real, intentional charge rather than tripping the "overpayment" alert
      // that finalizePayment sends when amountPaid exceeds totalAmount.
      await prisma.order.update({
              where: { id: order.id },
              data: { totalAmount: order.totalAmount + chargeAmount },
      })

      await finalizePayment({
              orderId: order.id,
              amount: chargeAmount,
              stripePaymentId: intent.id,
              method: 'card',
              notes: `Card on file charged - ${String(reason).trim()}`,
              recordedByName: session.user?.name || null,
      })

      return NextResponse.json({ success: true, stripePaymentId: intent.id })
  } catch (err: any) {
        console.error('Charge saved card failed:', err)
        const message = err?.message || 'Failed to charge saved card'
        return NextResponse.json({ error: message }, { status: 400 })
  }
}
