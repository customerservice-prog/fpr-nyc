export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, contactFormEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, eventDate, message } = body

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone: phone || null,
        eventDate: eventDate ? new Date(eventDate) : null,
        message,
      },
    })

    const emailContent = contactFormEmail({
      name,
      email,
      phone,
      eventDate,
      message,
    })

    await sendEmail({
      to: 'customerservice@friendlypartyrental.com',
      subject: emailContent.subject,
      html: emailContent.html,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }
}
