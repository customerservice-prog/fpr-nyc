export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { isAuthorizedCronRequest } from '@/lib/cronAuth'
import { sendEmail } from '@/lib/email'
import { BUSINESS } from '@/lib/utils'

export async function GET(request: NextRequest) {
  if (!(await isAuthorizedCronRequest(request, '.github/workflows/internal-email-smoke.yml'))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await sendEmail({
      to: BUSINESS.email,
      subject: 'NYC transactional email internal verification',
      text: 'Internal production verification only. No customer received this message.',
      html: '<p><strong>Friendly Party Rental NYC internal email verification</strong></p><p>This is an internal production test only. No customer received this message.</p>',
    })
    return NextResponse.json({ ok: true, provider: 'provider' in result ? result.provider : null })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
