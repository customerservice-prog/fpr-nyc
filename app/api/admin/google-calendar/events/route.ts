export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listUpcomingGoogleCalendarEvents } from '@/lib/googleCalendar'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const events = await listUpcomingGoogleCalendarEvents(250)
    return NextResponse.json({ events })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load Google Calendar.' },
      { status: 502 }
    )
  }
}

