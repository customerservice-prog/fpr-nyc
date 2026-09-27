import nodemailer from 'nodemailer'
import { isDeliverySuppressed, normalizeSuppressionEmail, suppressMarketingEmail } from '@/lib/marketing/suppression'

// Marketing has its own transport boundary. Receipts and other transactional
// messages continue using lib/email.ts and are unaffected by these holds.
function transportConfiguration() {
  const names = ['USER', 'PASS', 'HOST', 'PORT', 'FROM', 'REPLY_TO']
  const dedicated = names.some(name => !!process.env[`MARKETING_EMAIL_${name}`])
  const prefix = dedicated ? 'MARKETING_EMAIL_' : 'EMAIL_'
  const user = process.env[`${prefix}USER`]?.trim() || ''
  const pass = process.env[`${prefix}PASS`] || ''
  const host = process.env[`${prefix}HOST`]?.trim() || 'smtp.gmail.com'
  const port = Number(process.env[`${prefix}PORT`] || '587')
  const from = process.env[`${prefix}FROM`]?.trim() || `Friendly Party Rental NYC <${user}>`
  const mailbox = normalizeSuppressionEmail(from.match(/^[^<>\r\n]*<([^<>]+)>$/)?.[1] || from)
  const replyTo = process.env[`${prefix}REPLY_TO`]?.trim() || undefined
  const configured = !!(user && pass && mailbox && host && Number.isInteger(port) && port > 0 && port <= 65535 && !/[\r\n]/.test(host + user + from + (replyTo || '')))
  return { configured, dedicated, senderDomain: mailbox?.split('@')[1] || null, user, pass, host, port, from, replyTo }
}

export function marketingTransportStatus(): { configured: boolean; senderDomain: string | null; dedicated: boolean } {
  const { configured, senderDomain, dedicated } = transportConfiguration()
  return { configured, senderDomain, dedicated }
}

function createMarketingTransport(config: ReturnType<typeof transportConfiguration>) {
  return nodemailer.createTransport({
    host: config.host, port: config.port, secure: config.port === 465,
    requireTLS: config.port !== 465,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000, dnsTimeout: 8000,
    logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true,
  })
}

// This performs only the provider handshake/authentication; it sends no email.
// It cannot verify domain DNS authentication or guarantee inbox delivery.
export async function verifyMarketingTransport(): Promise<boolean> {
  const config = transportConfiguration()
  if (!config.configured) return false
  const transport = createMarketingTransport(config)
  try { return await transport.verify() === true }
  catch { return false }
  finally { transport.close() }
}

export async function sendMarketingEmail({ to, subject, html, headers }: {
  to: string; subject: string; html: string; headers?: Record<string, string>
}): Promise<{ success: boolean; simulated?: boolean }> {
  const config = transportConfiguration()
  const email = normalizeSuppressionEmail(to)
  if (!config.configured || !email || /[\r\n]/.test(subject)) return { success: false }
  // Recheck immediately before contacting SMTP so newly reported complaints
  // also stop recipients that were already selected by an earlier audience read.
  try { if (await isDeliverySuppressed(email)) return { success: false } }
  catch { throw new Error('Marketing delivery holds could not be checked; sending stopped.') }
  const transport = createMarketingTransport(config)
  let accepted = false
  try {
    const result = await transport.sendMail({
      from: config.from, to: email, replyTo: config.replyTo,
      subject, html, text: html.replace(/<[^>]*>/g, ''), headers,
    })
    accepted = Array.isArray(result.accepted) && result.accepted.some(value =>
      normalizeSuppressionEmail(typeof value === 'string' ? value : value.address) === email)
  } catch {
    // Never print SMTP exceptions: providers commonly include the recipient,
    // envelope, credentials, or full message in error objects.
  } finally { transport.close() }
  if (accepted) return { success: true }
  try { await suppressMarketingEmail(email, 'delivery_failure') }
  catch { throw new Error('Marketing delivery status could not be saved; sending stopped.') }
  // Includes ambiguous timeouts. An admin must investigate/remove the hold;
  // another campaign must never automatically retry an uncertain delivery.
  return { success: false }
}
