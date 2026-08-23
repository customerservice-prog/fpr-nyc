export const dynamic = 'force-dynamic'


import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'


export async function GET() {
  const items = await prisma.pageCustomCode.findMany({ orderBy: { slug: 'asc' } })
  return NextResponse.json({ items })
}


export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json()
  const { slug, code } = body
  if (!slug) return NextResponse.json({ error: 'slug is required' }, { status: 400 })
  const item = await prisma.pageCustomCode.upsert({
    where: { slug },
    update: { code: code || '' },
    create: { slug, code: code || '' },
  })
  return NextResponse.json({ item })
}


export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  await prisma.pageCustomCode.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
