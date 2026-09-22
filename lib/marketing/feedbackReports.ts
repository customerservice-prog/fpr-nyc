import { simpleParser, type MailParserOptions } from 'mailparser'
import { FEEDBACK_HEADER, verifyFeedbackToken } from './feedbackToken'
import { normalizeSuppressionEmail } from './suppression'

export type VerifiedFeedback = { email: string; runId: string; type: 'bounce' | 'complaint' }

// A forwarded message, forged From address, or arbitrary email in a bounce body
// cannot suppress somebody. Require a machine-readable report AND our signed
// original marketing header, bound to the report's exact failed recipient.
export async function parseMarketingFeedback(source: Buffer, secret = process.env.NEXTAUTH_SECRET || ''): Promise<VerifiedFeedback[]> {
  if (source.length > 512 * 1024) return []
  const options: MailParserOptions & { keepDeliveryStatus: boolean } = { keepDeliveryStatus: true, skipHtmlToText: true, skipTextToHtml: true, skipImageLinks: true }
  const mail = await simpleParser(source, options)
  const contentType = mail.headerLines.find(h => h.key === 'content-type')?.line || ''
  if (!/multipart\/report/i.test(contentType)) return []
  const reportType = /report-type\s*=\s*"?([^";\s]+)/i.exec(contentType)?.[1]?.toLowerCase()
  const reports = mail.attachments.filter(a => a.contentType === (reportType === 'delivery-status' ? 'message/delivery-status' : reportType === 'feedback-report' ? 'message/feedback-report' : ''))
  const originals = mail.attachments.filter(a => ['message/rfc822', 'text/rfc822-headers'].includes(a.contentType))
  const identities: { email: string; runId: string }[] = []
  for (const original of originals) {
    const header = original.content.toString('utf8').split(/\r?\n\r?\n/, 1)[0].replace(/\r?\n[ \t]+/g, ' ')
    const token = new RegExp('^' + FEEDBACK_HEADER + ':\\s*(\\S+)\\s*$', 'im').exec(header)?.[1]
    const identity = token ? verifyFeedbackToken(token, secret) : null
    if (identity) identities.push(identity)
  }
  const result: VerifiedFeedback[] = []
  for (const report of reports) for (const section of report.content.toString('utf8').replace(/\r?\n[ \t]+/g, ' ').split(/\r?\n\r?\n/)) {
    const field = (name: string) => new RegExp('^' + name + ':\\s*(.+)$', 'im').exec(section)?.[1]?.trim() || ''
    const type = reportType === 'delivery-status' && field('Action').toLowerCase() === 'failed' && /^5\./.test(field('Status')) ? 'bounce'
      : reportType === 'feedback-report' && /^(abuse|fraud)$/i.test(field('Feedback-Type')) ? 'complaint' : null
    const recipient = normalizeSuppressionEmail((field('Final-Recipient') || field('Original-Recipient') || field('Original-Rcpt-To')).replace(/^rfc822\s*;\s*/i, '').replace(/^<([^<>]+)>$/, '$1'))
    const identity = identities.find(i => i.email === recipient)
    if (type && identity && !result.some(r => r.email === identity.email && r.type === type)) result.push({ ...identity, type })
  }
  return result
}
