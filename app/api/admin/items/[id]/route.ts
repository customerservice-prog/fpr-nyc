export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const item = await prisma.item.findUnique({
    where: { id: (await params).id },
    include: { category: true },
  })

  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ item })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const item = await prisma.item.update({
    where: { id: (await params).id },
    data: {
      name: body.name,
      description: body.description,
      type: body.type,
      cost: body.cost ? parseFloat(body.cost) : undefined,
      quantity: body.quantity ? parseInt(body.quantity) : undefined,
      picture: body.picture,
      displayToCustomer: body.displayToCustomer,
      bookableAfter: body.bookableAfter !== undefined ? (body.bookableAfter ? new Date(body.bookableAfter) : null) : undefined,
      bookableAfterMessage: body.bookableAfterMessage !== undefined ? body.bookableAfterMessage : undefined,
      scheduleProfile: body.scheduleProfile,
      categoryId: body.categoryId,
            status: body.status !== undefined ? body.status : undefined,
            attentionNotes: body.attentionNotes !== undefined ? body.attentionNotes : undefined,
            lastInspectedAt: body.lastInspectedAt !== undefined ? (body.lastInspectedAt ? new Date(body.lastInspectedAt) : null) : undefined,
            specialDisplayName: body.specialDisplayName !== undefined ? body.specialDisplayName : undefined,
            sku: body.sku !== undefined ? body.sku : undefined,
            setupArea: body.setupArea !== undefined ? body.setupArea : undefined,
            actualSize: body.actualSize !== undefined ? body.actualSize : undefined,
            attendants: body.attendants !== undefined ? (body.attendants ? parseInt(body.attendants) : null) : undefined,
            ageGroup: body.ageGroup !== undefined ? body.ageGroup : undefined,
            additionalImages: body.additionalImages !== undefined ? body.additionalImages : undefined, colorOptions: body.colorOptions !== undefined ? body.colorOptions : undefined,
            taxable: body.taxable !== undefined ? body.taxable : undefined,
            setupFee: body.setupFee !== undefined ? (body.setupFee ? parseFloat(body.setupFee) : null) : undefined,
            internalNotes: body.internalNotes !== undefined ? body.internalNotes : undefined,
            suggestedAddonIds: body.suggestedAddonIds !== undefined ? body.suggestedAddonIds : undefined,
    },
    include: { category: true },
  })

  return NextResponse.json({ item })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await prisma.item.delete({ where: { id: (await params).id } })
  return NextResponse.json({ success: true })
}
