export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail, quoteEmail, updatedReceiptEmail } from '@/lib/email'
import { formatDate } from '@/lib/utils'
import { NYC_PUBLIC_ORIGIN } from '@/lib/nycPublicOrigin'

export async function POST(
        request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
    ) {
        const session = await getServerSession(authOptions)
        if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const order = await prisma.order.findUnique({
                where: { id: (await params).id },
                include: { customer: true, items: true },
    })

    if (!order) {
                return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (order.status === 'canceled') {
                return NextResponse.json({ error: 'This order is canceled. Automatic quote/receipt emails are blocked for canceled orders. Use the manual cancellation message option instead if you need to notify this customer.' }, { status: 400 })
    }

	let recipients: string[] = []
	try {
			const body = await request.json()
			if (Array.isArray(body?.recipients)) {
						recipients = body.recipients.filter((r: unknown) => typeof r === 'string' && r.trim()).map((r: string) => r.trim())
			}
	} catch {}
	const toAddress = recipients.length > 0 ? recipients.join(', ') : order.customer.email
	

    const origin = NYC_PUBLIC_ORIGIN
        const payLink = `${origin}/pay/${order.id}`

    const amountDue = order.amountPaid > 0
            ? Math.max(order.totalAmount - order.amountPaid, 0)
            : order.depositAmount > 0
            ? order.depositAmount
                : Math.max(order.totalAmount - order.amountPaid, 0)

    const catalogItems = await prisma.item.findMany({ select: { name: true, picture: true } })

    const findImage = (name: string) => {
                const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
                const lower = norm(name)
                const match = catalogItems.find((c) => {
                                const cn = norm(c.name)
                                return lower.includes(cn) || cn.includes(lower)
                })
                return match ? match.picture : null
    }

    const orderNumber = order.orderNumber
        const customerName = `${order.customer.firstName} ${order.customer.lastName}`
        const eventDate = formatDate(order.eventDate)
        const items = order.items.map((i) => ({ name: i.itemName, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total, image: findImage(i.itemName) }))

    const isUpdatedReceipt = order.amountPaid > 0

    const sharedDetails = {
        eventAddress: order.eventAddress,
        eventCity: order.eventCity,
        eventState: order.eventState,
        eventZip: order.eventZip,
        deliveryType: order.deliveryType,
        eventTimeSlot: order.eventTimeSlot,
        pickupTimeSlot: order.pickupTimeSlot,
        customerPhone: order.customer.phone,
        customerEmail: order.customer.email,
    }

    const emailContent = isUpdatedReceipt
            ? updatedReceiptEmail({
                            orderNumber,
                            customerName,
                            eventDate,
                            items,
                            totalAmount: order.totalAmount,
                            amountPaid: order.amountPaid,
                            amountDue,
                            payLink,
                            ...sharedDetails,
            })
                : quoteEmail({
                                orderNumber,
                                customerName,
                                eventDate,
                                items,
                                totalAmount: order.totalAmount,
                                amountDue,
                                payLink,
                                ...sharedDetails,
                })

    let result: { success: boolean; simulated?: boolean; provider?: string; providerId?: string; messageId?: string }
    try {
      result = await sendEmail({
                to: toAddress,
                subject: emailContent.subject,
                html: emailContent.html,
      })
    } catch (sendError) {
      console.error('Quote email could not be sent:', sendError instanceof Error ? sendError.message : 'unknown error')
      return NextResponse.json({ error: 'The quote email could not be sent because outgoing email is not configured or was rejected. Copy the payment link below and send it to the customer instead.', payLink }, { status: 503 })
    }

	if (!(result as { success: boolean }).success) {
		console.error('Quote email failed to send:', (result as { error?: unknown }).error)
		return NextResponse.json({ error: 'Failed to send email. Please check email configuration (EMAIL_USER/EMAIL_PASS) and try again.' }, { status: 500 })
	}

    const resultMeta = result as { simulated?: boolean; provider?: string; providerId?: string; messageId?: string }
    if (!resultMeta.simulated) {
      const provider = resultMeta.provider || 'unknown'
      const messageId = resultMeta.messageId || resultMeta.providerId || null
      try {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            emailDeliveryProvider: provider,
            emailDeliveryMessageId: messageId,
            emailDeliveryStatus: provider === 'resend' ? 'sent' : 'sent_untracked',
            emailDeliveryRecipient: toAddress,
            emailDeliverySubject: emailContent.subject,
            emailDeliveryLastEvent: provider === 'resend' ? 'email.sent' : null,
            emailDeliveryDetail: provider === 'resend'
              ? 'Accepted by Resend; awaiting delivery confirmation.'
              : 'Accepted by SMTP; provider delivery events are not available.',
            emailDeliverySentAt: new Date(),
            emailDeliveryUpdatedAt: new Date(),
          },
        })
      } catch (trackingError) {
        console.error('Quote/receipt sent, but NYC delivery tracking could not be recorded:', trackingError)
      }
    }


    return NextResponse.json({
                success: true,
                simulated: result.simulated || false,
                payLink,
                emailProvider: result.provider || 'unknown',
                messageId: result.messageId || result.providerId || null,
    })
}
