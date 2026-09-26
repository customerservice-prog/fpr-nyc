export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, selfServiceQuoteEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, customerName, eventDate, eventTimeSlot, pickupTimeSlot, deliveryType, items, subtotal } = body

    if (!to) {
      return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
    }
    if (!items || !items.length) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 })
    }

    const { subject, html } = selfServiceQuoteEmail({
      customerName,
      eventDate,
      eventTimeSlot,
      pickupTimeSlot,
      deliveryType,
      items: items.map((i: any) => ({ name: i.name, quantity: i.quantity, total: i.price * i.quantity })),
      subtotal: subtotal || 0,
    })

    const result = await sendEmail({ to, subject, html })

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Send quote error:', error)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
