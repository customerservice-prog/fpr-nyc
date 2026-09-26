export const dynamic = 'force-dynamic'


import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


async function getOrCreate() {
  let settings = await prisma.themeSettings.findFirst()
  if (!settings) {
    settings = await prisma.themeSettings.create({ data: {} })
  }
  return settings
}


export async function GET() {
  const settings = await getOrCreate()
  return NextResponse.json({ settings })
}


export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const body = await request.json()
  const existing = await getOrCreate()
  const allowed = [
    'headerStyle',
    'footerStyle',
    'storeBackgroundImage',
    'storeBackgroundTint',
    'categoryDisplayStyle',
    'colorTheme',
    'btnPrimaryColor',
    'btnPrimaryColorBg',
    'headerFont',
    'headerFont2',
    'categoryCarouselCount',
    'globalCustomCode',
  ]
  const data: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) data[key] = body[key]
  }
  const settings = await prisma.themeSettings.update({ where: { id: existing.id }, data })
  revalidatePath('/')
  return NextResponse.json({ settings })
}
