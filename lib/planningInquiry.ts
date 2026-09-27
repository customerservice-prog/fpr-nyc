import type { PrismaClient } from '@prisma/client'
import { PLANNING_HELP, planningServices } from './eventPlanning'

export class PlanningInquiryError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}
export function parsePlanningInquiry(body: unknown, now = new Date()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new PlanningInquiryError('Invalid inquiry.')
  const data = body as Record<string, unknown>
  const text = (key: string, max: number, required = false) => {
    const value = data[key] == null ? '' : data[key]
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new PlanningInquiryError('Please check ' + key + '.')
    if (required && !value.trim()) throw new PlanningInquiryError('Please complete ' + key + '.')
    return value.trim()
  }
  const requestId = text('requestId', 36, true)
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId)) throw new PlanningInquiryError('Please refresh the form and try again.')
  const name = text('name', 100, true), email = text('email', 254, true).toLowerCase(), phone = text('phone', 25, true)
  if (name.length < 2 || /[\r\n]/.test(name)) throw new PlanningInquiryError('Please enter your name.')
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(email)) throw new PlanningInquiryError('Please enter a valid email address.')
  if (!/^[+()0-9.\- ]{7,25}$/.test(phone) || phone.replace(/\D/g, '').length < 7) throw new PlanningInquiryError('Please enter a valid phone number.')
  const eventType = text('eventType', 80, true)
  if (![...planningServices.map(s => String(s.type)), 'Other / not sure yet'].includes(eventType)) throw new PlanningInquiryError('Please choose an event type.')
  const location = text('location', 200, true), venueStatus = text('venueStatus', 80) || 'Still deciding'
  if (!['Still deciding', 'Yes, booked', 'Have a venue in mind', 'Hosting at home'].includes(venueStatus)) throw new PlanningInquiryError('Please choose your venue status.')
  const eventDate = text('eventDate', 10)
  let date: Date | null = null
  if (eventDate) {
    date = new Date(eventDate + 'T12:00:00Z')
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== eventDate || eventDate < today) throw new PlanningInquiryError('Please choose a valid upcoming date, or leave it blank while deciding.')
  }
  const rawGuests = data.guestCount
  let guestCount: number | null = null
  if (rawGuests !== '' && rawGuests != null) {
    if (typeof rawGuests !== 'string' && typeof rawGuests !== 'number') throw new PlanningInquiryError('Please enter an approximate guest count.')
    guestCount = Number(rawGuests)
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > 100000) throw new PlanningInquiryError('Please enter a guest count between 1 and 100,000.')
  }
  const help = data.help ?? []
  if (!Array.isArray(help) || help.length > PLANNING_HELP.length || help.some(v => typeof v !== 'string' || !(PLANNING_HELP as readonly string[]).includes(v))) throw new PlanningInquiryError('Please choose the help you need.')
  const message = [
    '[SC EVENT PLANNING INQUIRY]', 'Event type: ' + eventType,
    'Guest count: ' + (guestCount ?? 'Undecided'), 'Venue / city: ' + location,
    'Venue status: ' + venueStatus, 'Help needed: ' + ([...new Set(help)].join(', ') || 'Not sure yet'),
    '', 'Event details / existing order:', text('message', 4000) || 'No additional details provided.',
  ].join('\n')
  return { id: 'planning_' + requestId, name, email, phone, eventDate: date, message, eventType }
}
export type PlanningInquiry = ReturnType<typeof parsePlanningInquiry>

// A retry saves one lead, even when the browser loses the original response.
// Per-email throttling is database-backed and serialized across app instances.
export async function savePlanningInquiry(db: PrismaClient, inquiry: PlanningInquiry, now = new Date()) {
  return db.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${ 'planning-inquiry:' + inquiry.email }))`
    const existing = await tx.contactMessage.findUnique({ where: { id: inquiry.id } })
    if (existing) {
      if (existing.email !== inquiry.email || existing.name !== inquiry.name || existing.phone !== inquiry.phone || existing.message !== inquiry.message || existing.eventDate?.getTime() !== inquiry.eventDate?.getTime()) throw new PlanningInquiryError('This request was already saved with different details. Refresh to send a new inquiry.', 409)
      return { created: false, reference: existing.id }
    }
    const recent = await tx.contactMessage.count({ where: { id: { startsWith: 'planning_' }, email: inquiry.email, createdAt: { gte: new Date(now.getTime() - 3600000) } } })
    if (recent >= 3) throw new PlanningInquiryError('Several inquiries have already been saved for this email. Please call 315-884-1498 for additional details.', 429)
    const { eventType, ...data } = inquiry
    await tx.contactMessage.create({ data })
    return { created: true, reference: inquiry.id }
  })
}
export function planningInquiryEmail(inquiry: PlanningInquiry) {
  const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
  const lines = [inquiry.name, inquiry.email, inquiry.phone, 'Date: ' + (inquiry.eventDate?.toISOString().slice(0,10) || 'Undecided'), '', inquiry.message, '', 'Reference: ' + inquiry.id]
  return { subject: '[SC EVENT PLANNING] ' + inquiry.eventType + ' — ' + inquiry.name,
    html: '<h2>New Riverdale / Downstate New York planning inquiry</h2><p>' + lines.map(escape).join('<br/>') + '</p><p><a href="https://fpr-nyc-production.up.railway.app/admin/planning-inquiries">Review planning inquiries</a></p>', text: lines.join('\n') }
}
