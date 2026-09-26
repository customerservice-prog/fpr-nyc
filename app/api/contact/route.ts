export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, contactFormEmail } from '@/lib/email'
import { NYC_EMAIL_ADDRESS, nycEmailHref } from '@/lib/nycEmail'

export async function GET() {
 return NextResponse.json({ email: NYC_EMAIL_ADDRESS, emailHref: nycEmailHref(), notificationsEnabled: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, eventDate, message, website, elapsedMs } = body

    // Honeypot check: real users never see or fill this field
    if (typeof website === 'string' && website.trim() !== '') {
      return NextResponse.json({ success: true })
    }
    // Timing check: reject submissions completed impossibly fast (likely bots)
    if (typeof elapsedMs === 'number' && elapsedMs < 1500) {
      return NextResponse.json({ success: true })
    }

    const trimmedName = typeof name === 'string' ? name.trim() : ''
    const trimmedEmail = typeof email === 'string' ? email.trim() : ''
    const trimmedMessage = typeof message === 'string' ? message.trim() : ''
    const trimmedPhone = typeof phone === 'string' ? phone.trim() : ''

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const phonePattern = /^[0-9+()\-.\s]{7,20}$/

    if (!trimmedName || trimmedName.length < 2) {
      return NextResponse.json({ error: 'Please enter a valid name' }, { status: 400 })
    }
    if (!trimmedEmail || !emailPattern.test(trimmedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }
    if (!trimmedMessage || trimmedMessage.length < 10) {
      return NextResponse.json({ error: 'Please enter a message with at least 10 characters' }, { status: 400 })
    }
    if (trimmedPhone && !phonePattern.test(trimmedPhone)) {
      return NextResponse.json({ error: 'Please enter a valid phone number' }, { status: 400 })
    }

    let parsedEventDate: Date | null = null
    if (eventDate) {
      const d = new Date(eventDate)
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Please enter a valid event date' }, { status: 400 })
      }
      parsedEventDate = d
    }

    await prisma.contactMessage.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone || null,
        eventDate: parsedEventDate,
        message: trimmedMessage,
      },
    })

    const emailContent = contactFormEmail({
      name: trimmedName,
      email: trimmedEmail,
      phone: trimmedPhone,
      eventDate,
      message: trimmedMessage,
    })

    let notificationSent = false
    try {
      await sendEmail({ to: NYC_EMAIL_ADDRESS, subject: emailContent.subject, html: emailContent.html, replyTo: trimmedEmail })
      notificationSent = true
    } catch { console.warn('Greenville inquiry saved; email notification pending configuration or retry.') }
    return NextResponse.json({ success: true, saved: true, notificationSent, emailHref: nycEmailHref('Greenville inquiry from ' + trimmedName, 'Website: friendlypartyrentalsc.com\nName: ' + trimmedName + '\nPhone: ' + trimmedPhone + '\nEvent date: ' + (eventDate || '') + '\n\n' + trimmedMessage) }, { status: notificationSent ? 200 : 202 })
  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
  }
}
