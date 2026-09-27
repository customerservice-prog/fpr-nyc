import { NYC_EMAIL_ADDRESS } from '@/lib/nycEmail'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, cancellationMessageEmail } from '@/lib/email'
import { formatDate } from '@/lib/utils'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const message = typeof body.message === 'string' ? body.message.trim() : ''
  if (!message) {
    return NextResponse.json({ error: 'A message is required to send a cancellation notice.' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({
    where: { id: (await params).id },
    include: { customer: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (order.status !== 'canceled') {
    return NextResponse.json({ error: 'This action is only for canceled orders.' }, { status: 400 })
  }

  const email = order.customer?.email || ''
  const isPlaceholderEmail = email.includes('@imported.friendlypartyrental.local') || email.startsWith('no-email-')
  if (!email || isPlaceholderEmail) {
    return NextResponse.json({ error: 'This customer has no valid email on file.' }, { status: 400 })
  }

  const customerName = `${order.customer.firstName} ${order.customer.lastName}`
  const emailContent = cancellationMessageEmail({
    orderNumber: order.orderNumber,
    customerName,
    eventDate: formatDate(order.eventDate),
    message,
  })

  await sendEmail({ to: email, subject: emailContent.subject, html: emailContent.html })

  try {
    const companySettings = await prisma.companySettings.findFirst()
    const notifyEmail = NYC_EMAIL_ADDRESS
    if (notifyEmail) {
      await sendEmail({
        to: notifyEmail,
        subject: 'Cancellation Message Sent: ' + order.orderNumber + ' - ' + customerName,
        html: '<p>A cancellation message was manually sent to a customer.</p>' +
          '<p><strong>Order:</strong> ' + order.orderNumber + '<br/>' +
          '<strong>Customer:</strong> ' + customerName + '<br/>' +
          '<strong>Message:</strong> ' + message + '</p>',
      })
    }
  } catch (notifyError) {
    console.error('Failed to send business notification email:', notifyError)
  }

  return NextResponse.json({ success: true })
}
