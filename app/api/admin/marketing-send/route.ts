export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

// Wrap builder HTML in a professional, email-client-safe branded shell.
// Table-based layout with inline styles for maximum client compatibility (Gmail, Outlook, Apple Mail).
function wrapEmail(bodyHtml: string, recipient: string, origin: string): string {
  const unsubUrl = origin + '/api/unsubscribe?email=' + encodeURIComponent(recipient)
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<title>Friendly Party Rental</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f4f6fb;">Party & event rentals delivered and set up for you across Upstate South Carolina.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fb;"><tr><td align="center" style="padding:0;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;margin:0 auto;">
<tr><td style="background-color:#0b3d91;padding:22px 24px;text-align:center;border-radius:0;">
<img src="https://www.friendlypartyrentalsc.com/images/logo.png" width="150" alt="Friendly Party Rental" style="display:inline-block;max-width:150px;height:auto;border:0;" />
</td></tr>
<tr><td style="height:4px;background-color:#f5a623;line-height:4px;font-size:4px;">&nbsp;</td></tr>
<tr><td style="background-color:#ffffff;padding:12px 10px;text-align:center;border-bottom:1px solid #e5e7eb;">
<a href="${origin}/rentals?category=tents" style="color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:0 8px;">Tents</a><span style="color:#e5e7eb;">|</span>
<a href="${origin}/rentals?category=tables-chairs" style="color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:0 8px;">Tables & Chairs</a><span style="color:#e5e7eb;">|</span>
<a href="${origin}/rentals?category=linens" style="color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:0 8px;">Linens</a><span style="color:#e5e7eb;">|</span>
<a href="${origin}/rentals?category=beverage-and-food-service" style="color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:0 8px;">Beverage & Food</a><span style="color:#e5e7eb;">|</span>
<a href="${origin}/quote" style="color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:0 8px;">Get a Quote</a>
</td></tr>
<tr><td style="background-color:#ffffff;padding:28px 32px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:16px;line-height:1.6;">
${bodyHtml}
</td></tr>
<tr><td style="background-color:#ffffff;padding:6px 32px 4px;font-family:Arial,Helvetica,sans-serif;text-align:center;">
<div style="font-size:19px;font-weight:bold;color:#1a1a1a;padding:8px 0 2px;">Shop by Category</div>
<div style="font-size:14px;color:#6b7280;padding-bottom:6px;">Everything you need for an unforgettable event</div>
</td></tr>
<tr><td style="background-color:#ffffff;padding:6px 24px 26px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr>
<td width="50%" style="padding:6px;">
<a href="${origin}/rentals?category=tents" style="display:block;text-align:center;text-decoration:none;background-color:#f4f6fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 8px;color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">Tents & Canopies</a>
</td>
<td width="50%" style="padding:6px;">
<a href="${origin}/rentals?category=tables-chairs" style="display:block;text-align:center;text-decoration:none;background-color:#f4f6fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 8px;color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">Tables & Chairs</a>
</td>
</tr>
<tr>
<td width="50%" style="padding:6px;">
<a href="${origin}/rentals?category=linens" style="display:block;text-align:center;text-decoration:none;background-color:#f4f6fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 8px;color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">Linens & Draping</a>
</td>
<td width="50%" style="padding:6px;">
<a href="${origin}/rentals?category=heating-cooling" style="display:block;text-align:center;text-decoration:none;background-color:#f4f6fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 8px;color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">Heating & Cooling</a>
</td>
</tr>
<tr>
<td width="50%" style="padding:6px;">
<a href="${origin}/rentals?category=beverage-and-food-service" style="display:block;text-align:center;text-decoration:none;background-color:#f4f6fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 8px;color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">Beverage & Food</a>
</td>
<td width="50%" style="padding:6px;">
<a href="${origin}/rentals" style="display:block;text-align:center;text-decoration:none;background-color:#f4f6fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 8px;color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">Shop All Rentals</a>
</td>
</tr>
</table>
</td></tr>
<tr><td style="background-color:#0b3d91;padding:20px 24px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
<div style="color:#ffffff;font-size:16px;font-weight:bold;padding-bottom:4px;">Free delivery, setup &amp; pickup included</div>
<div style="color:#cfe0ff;font-size:13px;">Serving Greenville & Upstate South Carolina since day one</div>
<div style="padding-top:12px;"><a href="${origin}/quote" style="display:inline-block;background-color:#f5a623;color:#1a1a1a;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:6px;">Request a Free Quote</a></div>
</td></tr>
<tr><td style="background-color:#ffffff;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;text-align:center;border-top:1px solid #e5e7eb;">
<div style="font-size:15px;font-weight:bold;color:#1a1a1a;">Friendly Party Rental</div>
<div style="font-size:13px;color:#6b7280;padding-top:4px;">Greenville, SC (exact address provided after booking)</div>
<div style="font-size:13px;color:#6b7280;padding-top:2px;">315-884-1498 &nbsp;&bull;&nbsp; customerservice@friendlypartyrental.com</div>
<div style="padding-top:8px;"><a href="${origin}" style="color:#0b3d91;font-size:13px;font-weight:bold;text-decoration:none;">www.friendlypartyrentalsc.com</a></div>
<div style="font-size:11px;color:#6b7280;line-height:1.6;padding-top:16px;border-top:1px solid #e5e7eb;margin-top:16px;">
You are receiving this email because you are a customer of Friendly Party Rental.<br />
<a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe from marketing emails</a><br />
&copy; ${year} Friendly Party Rental, Greenville, SC. All rights reserved.
</div>
</td></tr>
</table>
</td></tr></table>
</body>
</html>`
}

type Segment = 'all' | 'outstanding' | 'recent' | 'lapsed' | 'manual'

async function resolveRecipients(segment: Segment, manual: string): Promise<string[]> {
  if (segment === 'manual') {
    return dedupeEmails(manual.split(/[,;\n]/))
  }

  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  if (segment === 'outstanding') {
    const customers = await prisma.customer.findMany({
      where: { email: { not: '' }, orders: { some: { balanceDue: { gt: 0 } } } },
      select: { email: true },
    })
    return dedupeEmails(customers.map((c) => c.email))
  }

  if (segment === 'recent') {
    const cutoff = new Date(now - 90 * DAY)
    const customers = await prisma.customer.findMany({
      where: { email: { not: '' }, orders: { some: { createdAt: { gte: cutoff } } } },
      select: { email: true },
    })
    return dedupeEmails(customers.map((c) => c.email))
  }

  if (segment === 'lapsed') {
    const cutoff = new Date(now - 180 * DAY)
    const customers = await prisma.customer.findMany({
      where: {
        email: { not: '' },
        orders: { some: {}, every: { createdAt: { lt: cutoff } } },
      },
      select: { email: true },
    })
    return dedupeEmails(customers.map((c) => c.email))
  }

  // all
  const customers = await prisma.customer.findMany({
    where: { email: { not: '' } },
    select: { email: true },
  })
  return dedupeEmails(customers.map((c) => c.email))
}

// Basic RFC-ish email format validation. Catches obvious typos (missing @, no domain,
// no TLD, stray spaces). It cannot catch a well-formed but non-existent address
// (e.g. a misspelled name) — those only surface as a delivery bounce.
function isValidEmail(email: string): boolean {
  const e = (email || '').trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)
}

function dedupeEmails(emails: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of emails) {
    const e = (raw || '').trim().toLowerCase()
    if (e && isValidEmail(e) && !seen.has(e)) {
      seen.add(e)
      out.push(e)
    }
  }
  return out
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const authHeader = request.headers.get('authorization')
    const isCron = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`
    if (!session && !isCron) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const subject: string = (body.subject || '').trim()
  const html: string = body.html || ''
  const mode: string = body.mode || 'test'
  const segment: Segment = body.segment || 'all'
  const manual: string = body.manual || ''
  const testEmail: string = (body.testEmail || '').trim()

  if (!subject) return NextResponse.json({ error: 'Subject is required' }, { status: 400 })
  if (!html) return NextResponse.json({ error: 'Email content is required' }, { status: 400 })

  const origin = new URL(request.url).origin

  // Test send: always to a single address the admin controls.
  if (mode === 'test') {
    if (!testEmail || !isValidEmail(testEmail)) {
      return NextResponse.json({ error: 'A valid test email address is required' }, { status: 400 })
    }
    const wrapped = wrapEmail(html, testEmail, origin)
    const res = await sendEmail({ to: testEmail, subject: '[TEST] ' + subject, html: wrapped })
    return NextResponse.json({ mode: 'test', recipients: 1, result: res })
  }

  // Bulk send to a segment (unsubscribed customers are already excluded).
  const recipients = await resolveRecipients(segment, manual)
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'No recipients matched this segment' }, { status: 400 })
  }

  let sent = 0
  let failed = 0
  const errors: string[] = []

  // Send sequentially with a small delay to reduce the chance of SMTP rate limiting.
  for (const to of recipients) {
    try {
      const wrapped = wrapEmail(html, to, origin)
      const res = await sendEmail({ to, subject, html: wrapped })
      if (res && (res as { success?: boolean }).success) sent++
      else failed++
    } catch (e) {
      failed++
      if (errors.length < 5) errors.push((e as Error).message)
    }
    await new Promise((r) => setTimeout(r, 150))
  }

  return NextResponse.json({ mode: 'bulk', segment, recipients: recipients.length, sent, failed, errors })
}
