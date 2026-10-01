export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGoogleCalendarEvent, manageGoogleCalendarEvent } from '@/lib/googleCalendar'
import { cleanMeetingDecision, cleanMeetingDuration, parseMeetingWallClock } from '@/lib/meetingTime'

async function authorize() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return null
}

function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not update Google Calendar.' },
    { status: error instanceof SyntaxError ? 400 : Number((error as { status?: number })?.status) || 502 })
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorize()
  if (denied) return denied
  try { return NextResponse.json({ event: await getGoogleCalendarEvent((await params).id) }) }
  catch (error) { return failure(error) }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await authorize()
  if (denied) return denied
  let calendarUpdated = false
  try {
    const body = await request.json()
    const id = (await params).id
    if (body.action === 'metadata') {
      const snapshot = await getGoogleCalendarEvent(id)
      const description = (snapshot.description || '').toLowerCase()
      const inferredConfirmed = /candidate confirmed|confirmed this interview|confirmed the interview/.test(description)
      const inferredLinkSent = /(meet|meeting|video) link (?:was )?sent/.test(description)
      const duration = snapshot.start && snapshot.end
        ? Math.max(1, Math.round((new Date(snapshot.end).getTime() - new Date(snapshot.start).getTime()) / 60000))
        : 20
      const candidateName = snapshot.summary
        .replace(/^\s*(?:video\s+)?interview\s*(?::|with)?\s*/i, '')
        .replace(/\s*[—–-]\s*Friendly Party Rental.*$/i, '')
        .trim() || snapshot.summary
      const candidateConfirmedAt = typeof body.candidateConfirmed === 'boolean'
        ? (body.candidateConfirmed ? new Date() : null)
        : (inferredConfirmed ? new Date() : null)
      const linkSentAt = typeof body.linkSent === 'boolean'
        ? (body.linkSent ? new Date() : null)
        : (inferredLinkSent ? new Date() : null)
      const metadata = {
        ...(typeof body.notes === 'string' ? { notes: body.notes.slice(0, 10000) } : {}),
        ...('decision' in body ? { decision: cleanMeetingDecision(body.decision) } : {}),
        ...(typeof body.completed === 'boolean' ? { completed: body.completed } : {}),
        ...(typeof body.candidateConfirmed === 'boolean' || inferredConfirmed ? { candidateConfirmedAt } : {}),
        ...(typeof body.linkSent === 'boolean' || inferredLinkSent ? { linkSentAt } : {}),
        googleMeetLink: snapshot.meetLink,
        googleCalendarHtmlLink: snapshot.htmlLink,
      }
      const meeting = await prisma.meeting.upsert({
        where: { googleEventId: id },
        update: metadata,
        create: {
          customerName: candidateName,
          scheduledAt: snapshot.scheduledAtWall ? parseMeetingWallClock(snapshot.scheduledAtWall) : null,
          durationMinutes: duration,
          meetingProvider: 'google',
          googleEventId: id,
          googleMeetLink: snapshot.meetLink,
          googleCalendarHtmlLink: snapshot.htmlLink,
          pending: false,
          completed: body.completed === true,
          notes: typeof body.notes === 'string' ? body.notes.slice(0, 10000) : null,
          decision: 'decision' in body ? cleanMeetingDecision(body.decision) : null,
          candidateConfirmedAt,
          linkSentAt,
        },
      })
      return NextResponse.json({ event: snapshot, meeting })
    }
    if (!['reschedule', 'cancel', 'invite'].includes(body.action)) return NextResponse.json({ error: 'Choose a valid meeting action.' }, { status: 400 })
    const result = await manageGoogleCalendarEvent(id, body)
    calendarUpdated = true
    // Imported events work without a local row. If one exists, keep the two
    // lists synchronized only after Google confirms that the action succeeded.
    const data = {
      ...(body.action === 'cancel' ? { cancelledAt: new Date(), pending: false, token: null } : {}),
      ...(body.action === 'reschedule' ? { scheduledAt: parseMeetingWallClock(body.scheduledAt), durationMinutes: cleanMeetingDuration(body.durationMinutes), completed: false, pending: false } : {}),
      ...(body.action === 'invite' ? { invitedAt: new Date() } : {}),
      ...(result.event ? { googleMeetLink: result.event.meetLink, googleCalendarHtmlLink: result.event.htmlLink } : {}),
    }
    if (body.action === 'cancel' && result.event?.scheduledAtWall) {
      // A calendar-only interview also needs durable cancellation history.
      // Only a successfully deleted, owned event supplies this snapshot; a
      // missing/previously removed provider event never fabricates a row.
      const snapshot = result.event
      const duration = snapshot.start && snapshot.end ? Math.max(1, Math.round((new Date(snapshot.end).getTime() - new Date(snapshot.start).getTime()) / 60000)) : 20
      await prisma.meeting.upsert({ where: { googleEventId: id }, update: data, create: {
        customerName: snapshot.summary, scheduledAt: parseMeetingWallClock(snapshot.scheduledAtWall!),
        durationMinutes: duration, meetingProvider: 'google', googleEventId: id,
        googleMeetLink: snapshot.meetLink, googleCalendarHtmlLink: snapshot.htmlLink,
        cancelledAt: new Date(), pending: false,
      } })
    } else {
      await prisma.meeting.updateMany({ where: { googleEventId: id }, data })
    }
    return NextResponse.json(result)
  } catch (error) {
    if (calendarUpdated) return NextResponse.json({ error: 'Google Calendar was updated, but the saved app details could not be updated. Refresh to see the current calendar state before trying again.', calendarUpdated: true }, { status: 502 })
    return failure(error)
  }
}
