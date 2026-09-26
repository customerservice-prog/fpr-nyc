export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail, employmentApplicationEmail } from '@/lib/email'
import { SC_EMAIL_ADDRESS, scEmailHref } from '@/lib/scEmail'

export async function POST(request: NextRequest) {
    try {
          const body = await request.json()
          const { name, phone, email, position, availability, experience, whyWorkWithUs, message } = body

      if (!name || !email) {
              return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      await prisma.employmentApplication.create({
              data: {
                        name,
                        phone: phone || null,
                        email,
                        position: position || null,
                        availability: availability || null,
                        experience: experience || null,
                        whyWorkWithUs: whyWorkWithUs || null,
                        message: message || null,
              },
      })
      let notificationSent = false
                  try {
                      const emailContent = employmentApplicationEmail({ name, phone, email, position, availability, experience, message })
                      await sendEmail({ to: SC_EMAIL_ADDRESS, subject: emailContent.subject, html: emailContent.html, replyTo: email })
                      notificationSent = true
            } catch (emailError) {
                      console.error('Employment application email error:', emailError)
            }

      return NextResponse.json({ success: true, saved: true, notificationSent, emailHref: scEmailHref('Greenville employment application - ' + name) }, { status: notificationSent ? 200 : 202 })
    } catch (error) {
          console.error('Employment application error:', error)
          return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
    }
}
