export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Sends any marketing campaigns whose scheduled send time has arrived.
// Runs on a schedule (see .github/workflows/marketing-scheduled-send-cron.yml).
// Reuses the tested /api/admin/marketing-send bulk-send logic (throttling,
// recipient resolution, unsubscribe handling) via an internal authenticated call.
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization')
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  const now = new Date()
    const due = await prisma.emailTemplateMarketing.findMany({
          where: { status: 'scheduled', scheduledAt: { lte: now } },
    })

  const origin = new URL(request.url).origin
    const results: Array<{ id: string; name: string; success: boolean; detail?: string }> = []

        for (const campaign of due) {
              try {
                      await prisma.emailTemplateMarketing.update({
                                where: { id: campaign.id },
                                data: { status: 'sending' },
                      })

                if (!campaign.renderedHtml) {
                          await prisma.emailTemplateMarketing.update({
                                      where: { id: campaign.id },
                                      data: { status: 'failed', sendError: 'No rendered email content was saved for this campaign.' },
                          })
                          results.push({ id: campaign.id, name: campaign.name, success: false, detail: 'missing renderedHtml' })
                          continue
                }

                const sendRes = await fetch(`${origin}/api/admin/marketing-send`, {
                          method: 'POST',
                          headers: {
                                      'Content-Type': 'application/json',
                                      Authorization: `Bearer ${process.env.CRON_SECRET || ''}`,
                          },
                          body: JSON.stringify({
                                      subject: campaign.subject,
                                      html: campaign.renderedHtml,
                                      mode: 'campaign',
                                      segment: campaign.segment || 'all',
                                      manual: campaign.manualRecipients || '',
                          }),
                })
                      const sendJson = await sendRes.json().catch(() => ({}))

                if (sendRes.ok) {
                          await prisma.emailTemplateMarketing.update({
                                      where: { id: campaign.id },
                                      data: {
                                                    status: 'sent',
                                                    sentAt: new Date(),
                                                    recipientCount: typeof sendJson.recipients === 'number' ? sendJson.recipients : null,
                                                    sendError: null,
                                      },
                          })
                          results.push({ id: campaign.id, name: campaign.name, success: true })
                } else {
                          await prisma.emailTemplateMarketing.update({
                                      where: { id: campaign.id },
                                      data: { status: 'failed', sendError: sendJson.error || `Send failed (${sendRes.status})` },
                          })
                          results.push({ id: campaign.id, name: campaign.name, success: false, detail: sendJson.error })
                }
              } catch (err) {
                      await prisma.emailTemplateMarketing.update({
                                where: { id: campaign.id },
                                data: { status: 'failed', sendError: err instanceof Error ? err.message : 'Unknown error' },
                      }).catch(() => {})
                      results.push({ id: campaign.id, name: campaign.name, success: false, detail: 'exception' })
              }
        }

  return NextResponse.json({ checked: due.length, results })
}
