import { createHash } from 'node:crypto'
import { ImapFlow } from 'imapflow'
import { prisma } from '@/lib/prisma'
import { parseMarketingFeedback, type VerifiedFeedback } from './feedbackReports'
import { suppressMarketingEmail } from './suppression'
import { updateAutopilotConfig, revokeApproval } from './autopilotSettings'

const SETTING = { category: 'marketing_feedback', key: 'mailbox' }
const EVENT_CATEGORY = 'marketing_feedback_events'
type MonitorState = { status: 'healthy' | 'failed' | 'backlog'; checkedAt: string; matched: number; unmatched: number; lastUid: number; uidValidity: string; mailbox: string; accountKey: string }

function mailboxConfig() {
  const dedicated = ['USER', 'PASS', 'HOST', 'PORT', 'FROM', 'REPLY_TO'].some(n => !!process.env['MARKETING_EMAIL_' + n])
  const prefix = dedicated ? 'MARKETING_EMAIL_' : 'EMAIL_'
  const host = process.env[`${prefix}IMAP_HOST`] || (!(process.env[`${prefix}HOST`]) || process.env[`${prefix}HOST`] === 'smtp.gmail.com' ? 'imap.gmail.com' : '')
  const user = process.env[`${prefix}USER`] || '', pass = process.env[`${prefix}PASS`] || ''
  const accountKey = createHash('sha256').update(host.toLowerCase() + '\n' + user.trim().toLowerCase()).digest('hex')
  return { host, user, pass, accountKey, configured: !!(host && user && pass && process.env.NEXTAUTH_SECRET) }
}

export async function feedbackMonitorStatus(now = new Date()) {
  const { configured, accountKey } = mailboxConfig()
  const row = await prisma.systemSetting.findUnique({ where: { category_key: SETTING } })
  let state: MonitorState | null = null
  try { state = row?.value ? JSON.parse(row.value) : null } catch { /* Never infer health from an invalid saved value. */ }
  const age = state ? now.getTime() - Date.parse(state.checkedAt) : Infinity
  const ready = configured && state?.accountKey === accountKey && state?.status === 'healthy' && age >= -60000 && age < 20 * 60000
  return { configured, ready, state }
}

export async function recordMarketingFeedback(feedback: VerifiedFeedback, now = new Date()) {
  const key = createHash('sha256').update(`${feedback.runId}\n${feedback.email}\n${feedback.type}`).digest('hex')
  // Record the suppression before the receipt. A failed write cannot advance the
  // mailbox cursor past an unsuppressed recipient. Replaying a report is safe.
  await suppressMarketingEmail(feedback.email, feedback.type)
  await prisma.systemSetting.upsert({ where: { category_key: { category: EVENT_CATEGORY, key } },
    create: { category: EVENT_CATEGORY, key, value: JSON.stringify({ ...feedback, receivedAt: now.toISOString() }) }, update: {} })
  const rows = await prisma.systemSetting.findMany({ where: { category: EVENT_CATEGORY }, select: { value: true } })
  const recent = rows.flatMap(row => { try { const event = JSON.parse(row.value || ''); return Date.parse(event.receivedAt) >= now.getTime() - 86400000 ? [event] : [] } catch { return [] } })
  if (recent.some(e => e.type === 'complaint') || recent.filter(e => e.type === 'bounce').length >= 3) {
    await updateAutopilotConfig(current => current.mode === 'automatic' ? { ...revokeApproval(current, 'paused'), pauseReason: 'Delivery monitoring reported a complaint or repeated failed deliveries. Review the audience before resuming.' } : current)
  }
}

// Read-only mailbox access: no message is marked read, moved, deleted, or sent.
export async function checkMarketingFeedback(now = new Date()) {
  const config = mailboxConfig()
  if (!config.configured) return { ok: false }
  const saved = (await feedbackMonitorStatus(now)).state
  const previous = saved?.accountKey === config.accountKey ? saved : null
  const client = new ImapFlow({ host: config.host, port: 993, secure: true, auth: { user: config.user, pass: config.pass },
    logger: false, disableAutoIdle: true, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 12000 })
  client.on('error', () => { /* No credentials or message content in logs. */ })
  const timeout = setTimeout(() => client.close(), 25000)
  let state: MonitorState = { status: 'failed', checkedAt: now.toISOString(), matched: previous?.matched || 0, unmatched: previous?.unmatched || 0, lastUid: previous?.lastUid || 0, uidValidity: previous?.uidValidity || '', mailbox: previous?.mailbox || '', accountKey: config.accountKey }
  try {
    await client.connect()
    const mailboxes = await client.list()
    const mailbox = mailboxes.find(m => m.specialUse === '\\All')?.path || 'INBOX'
    const lock = await client.getMailboxLock(mailbox, { readOnly: true })
    try {
      const validity = client.mailbox ? String(client.mailbox.uidValidity) : ''
      const after = previous?.accountKey === config.accountKey && previous.uidValidity === validity && previous.mailbox === mailbox ? previous.lastUid : 0
      const found = await client.search({ since: new Date(now.getTime() - 30 * 86400000), header: { 'content-type': 'multipart/report' } }, { uid: true })
      if (!Array.isArray(found)) throw new Error('Mailbox search failed')
      const pending = found.filter(uid => uid > after).sort((a, b) => a - b)
      state = { ...state, lastUid: after, uidValidity: validity, mailbox, status: pending.length > 50 ? 'backlog' : 'healthy' }
      for (const uid of pending.slice(0, 50)) {
        const metadata = await client.fetchOne(uid, { size: true }, { uid: true })
        if (!metadata) throw new Error('Report could not be read')
        if (!metadata.size || metadata.size > 512 * 1024) { state.unmatched++; state.lastUid = uid; continue }
        const message = await client.fetchOne(uid, { source: true }, { uid: true })
        if (!message || !message.source) throw new Error('Report could not be read')
        const reports = await parseMarketingFeedback(message.source)
        if (!reports.length) state.unmatched++
        for (const report of reports) { await recordMarketingFeedback(report, now); state.matched++ }
        state.lastUid = uid
      }
    } finally { lock.release() }
  } catch { state.status = 'failed' }
  finally { clearTimeout(timeout); client.close() }
  // Always persist failure too: a previous success must not mask lost access.
  await prisma.systemSetting.upsert({ where: { category_key: SETTING }, create: { ...SETTING, value: JSON.stringify(state) }, update: { value: JSON.stringify(state) } })
  return { ok: state.status === 'healthy' }
}
