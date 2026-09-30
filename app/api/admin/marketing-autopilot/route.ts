export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { resolveRequestAuth } from '@/lib/marketing/adminAuth'
import { AUTO_CAMPAIGN_SLUGS } from '@/lib/marketing/planner'
import { getAutopilotStatus, autopilotReadiness, campaignEmail } from '@/lib/marketing/autopilot'
import { getAutopilotConfig, updateAutopilotConfig, revokeApproval, approvalFingerprint } from '@/lib/marketing/autopilotSettings'
import { marketingTransportStatus, verifyMarketingTransport } from '@/lib/marketing/delivery'
import { wrapEmail } from '@/lib/marketing/message'
import { NYC_PUBLIC_ORIGIN } from '@/lib/nycPublicOrigin'

export async function GET(request: NextRequest) {
  const auth = await resolveRequestAuth(request)
  if (!auth.isAdmin) return NextResponse.json({ error: 'Administrator access required' }, { status: auth.isAuthenticated ? 403 : 401 })
  try {
    const params = request.nextUrl.searchParams
    if (params.get('action') === 'preview') {
      const slug = params.get('slug') || ''
      if (!(AUTO_CAMPAIGN_SLUGS as readonly string[]).includes(slug)) return NextResponse.json({ error: 'Unknown automatic campaign' }, { status: 400 })
      const email = campaignEmail(slug)
      return NextResponse.json({ subject: email.subject, html: wrapEmail(email.html, 'preview@friendlypartyrental.com', NYC_PUBLIC_ORIGIN, email.campaign.preheader) }, { headers: { 'Cache-Control': 'no-store' } })
    }
    return NextResponse.json(await getAutopilotStatus(), { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    console.error('Marketing setup could not be loaded')
    return NextResponse.json({ error: 'Could not load marketing setup. Try again.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await resolveRequestAuth(request)
  if (!auth.isAdmin) return NextResponse.json({ error: 'Administrator access required' }, { status: auth.isAuthenticated ? 403 : 401 })
  try {
    const body = await request.json()
    if (body.action === 'configure') {
      if (!Array.isArray(body.enabledCampaigns) || body.enabledCampaigns.length > AUTO_CAMPAIGN_SLUGS.length
        || body.enabledCampaigns.some((s: unknown) => typeof s !== 'string' || !(AUTO_CAMPAIGN_SLUGS as readonly string[]).includes(s))
        || !Number.isInteger(body.dailyLimit) || body.dailyLimit < 1 || body.dailyLimit > 300
        || !Number.isInteger(body.batchSize) || body.batchSize < 1 || body.batchSize > 50 || body.batchSize > body.dailyLimit) return NextResponse.json({ error: 'Choose supported campaigns, a daily limit of 1–300, and a batch size of 1–50.' }, { status: 400 })
      const config = await updateAutopilotConfig(current => ({ ...revokeApproval(current), enabledCampaigns: [...new Set<string>(body.enabledCampaigns)], dailyLimit: body.dailyLimit, batchSize: body.batchSize }))
      return NextResponse.json({ success: true, config, message: 'Setup saved in review mode. Review and enable when ready to send automatically.' })
    }
    if (body.action === 'pause' || body.action === 'review') {
      const config = await updateAutopilotConfig(current => revokeApproval(current, body.action === 'pause' ? 'paused' : 'review'))
      return NextResponse.json({ success: true, config })
    }
    if (body.action !== 'activate') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    if (body.confirmAutomaticSending !== true || body.confirmDomainAuthentication !== true || body.confirmFeedbackMonitoring !== true || body.confirmAudiencePermission !== true) return NextResponse.json({ error: 'Confirm the selected customer campaigns, sending-domain authentication, bounce/complaint monitoring, and audience permission before enabling automatic delivery.' }, { status: 400 })
    const current = await getAutopilotConfig()
    if (body.expectedFingerprint !== approvalFingerprint(current, marketingTransportStatus().senderDomain)) return NextResponse.json({ error: 'The saved setup changed. Reload and review the current campaigns and limits.' }, { status: 409 })
    const readiness = await autopilotReadiness(current)
    if (!readiness.ready) return NextResponse.json({ error: 'Resolve the readiness checks before enabling automatic delivery.', readiness }, { status: 409 })
    if (!await verifyMarketingTransport()) return NextResponse.json({ error: 'The email connection could not be verified. Check the sending account before enabling. No email was sent.' }, { status: 503 })
    const fingerprint = approvalFingerprint(current, marketingTransportStatus().senderDomain)
    const config = await updateAutopilotConfig(latest => {
      if (approvalFingerprint(latest, marketingTransportStatus().senderDomain) !== fingerprint || JSON.stringify(latest) !== JSON.stringify(current)) throw new Error('Configuration changed')
      return { ...latest, mode: 'automatic', approvedAt: new Date().toISOString(), approvedBy: auth.name || auth.username || auth.userId || 'Administrator', approvalFingerprint: fingerprint, domainAuthenticationConfirmed: true, feedbackMonitoringConfirmed: true, audiencePermissionConfirmed: true, pauseReason: null }
    })
    return NextResponse.json({ success: true, config, message: 'Automatic marketing enabled. The scheduler will apply your campaign rules, contact caps and daily limit.' })
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    if (error instanceof Error && error.message === 'Configuration changed') return NextResponse.json({ error: 'Setup changed while you were reviewing it. Reload and review the current settings.' }, { status: 409 })
    console.error('Marketing setup update failed')
    return NextResponse.json({ error: 'Could not save marketing setup. Try again.' }, { status: 500 })
  }
}

