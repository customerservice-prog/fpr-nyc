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

  const customer = await prisma.customer.findUnique({
    where: { id: (await params).id },
    include: {
      orders: { orderBy: { createdAt: 'desc' }, include: { items: true } },
      rainchecks: { orderBy: { issuedAt: 'desc' } },
    },
  })

  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ customer })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const customer = await prisma.customer.update({
    where: { id: (await params).id },
    data: {
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      phone: body.phone,
      company: body.company,
      secondaryPhone: body.secondaryPhone,
      secondaryEmail: body.secondaryEmail,
      customerType: body.customerType,
      notes: body.notes,
      address: body.address,
      city: body.city,
      state: body.state,
      zip: body.zip,
      creditStatus: body.creditStatus,
    },
  })

  return NextResponse.json({ customer })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orderCount = await prisma.order.count({ where: { customerId: (await params).id } })
  if (orderCount > 0) {
    return NextResponse.json({ error: 'Cannot delete a customer that has orders' }, { status: 400 })
  }

  await prisma.customer.delete({ where: { id: (await params).id } })

  return NextResponse.json({ success: true })
}
