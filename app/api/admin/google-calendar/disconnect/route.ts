export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { disconnectGoogleCalendar } from '@/lib/googleCalendar'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as { role?: string }).role !== 'admin') {
    return NextResponse.json({ error: 'Only the owner can disconnect Google Calendar.' }, { status: 403 })
  }

  await disconnectGoogleCalendar()
  return NextResponse.json({ success: true })
}
