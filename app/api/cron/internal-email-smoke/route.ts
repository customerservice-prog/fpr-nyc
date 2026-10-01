export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { BUSINESS } from '@/lib/utils'

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedCronRequest(request, '.github/workflows/internal-email-smoke.yml'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = String(process.env.RESEND_API_KEY || '').trim()
  const from = String(process.env.RESEND_FROM || '').trim()
  if (!apiKey || !from) {
    return NextResponse.json({
      ok: false,
      provider: 'resend',
      error: 'Resend production configuration is incomplete',
      checks: { apiKeyPresent: Boolean(apiKey), fromPresent: Boolean(from) },
    }, { status: 500 })
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [BUSINESS.email],
        reply_to: [BUSINESS.email],
        subject: '[Downstate New York] NYC transactional email internal verification',
        text: 'Internal production verification only. No customer received this message.',
        html: '<p><strong>Friendly Party Rental NYC internal email verification</strong></p><p>This is an internal production test only. No customer received this message.</p>',
        headers: {
          'X-FPR-Location': 'nyc-downstate',
          'X-FPR-Website': 'friendlypartyrentalnyc.com',
        },
      }),
    })

    const raw = await response.text()
    let body: Record<string, unknown> = {}
    try { body = raw ? JSON.parse(raw) as Record<string, unknown> : {} } catch {}

    if (!response.ok) {
      const safeError = String(body.message || body.name || 'Resend rejected the request').slice(0, 300)
      return NextResponse.json({
        ok: false,
        provider: 'resend',
        providerStatus: response.status,
        error: safeError,
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      provider: 'resend',
      providerStatus: response.status,
      providerIdPresent: Boolean(body.id),
    })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      provider: 'resend',
      error: 'Resend network request failed: ' + (error instanceof Error ? error.message : String(error)),
    }, { status: 500 })
  }
}
