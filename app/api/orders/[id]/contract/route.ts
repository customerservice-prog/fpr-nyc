export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPublicOrderAccess } from '@/lib/publicOrderAccess'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { hasStaffPermission } from '@/lib/staffPermissions'

const privateHeaders = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' }

async function authorizedOrderAccess(request: NextRequest, id: string, suppliedToken?: string | null) {
  if (hasPublicOrderAccess(request, id, suppliedToken)) return true
  const session = await getServerSession(authOptions).catch(() => null)
  return hasStaffPermission((session?.user as { role?: string } | undefined)?.role, 'orders')
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const id = (await params).id
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, items: true, payments: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!await authorizedOrderAccess(request, id, request.nextUrl.searchParams.get('access'))) {
    return NextResponse.json({ error: 'Verification required' }, { status: 401, headers: privateHeaders })
  }

const refundedAmount = (order.payments || []).filter((p) => p.amount < 0).reduce((sum, p) => sum + Math.abs(p.amount), 0)
  
  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      refundedAmount, payments: (order.payments || []).slice().sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map((p) => ({ amount: p.amount, createdAt: p.createdAt })),
      eventDate: order.eventDate,
      eventAddress: order.eventAddress,
      eventCity: order.eventCity,
      eventZip: order.eventZip,
      deliveryType: order.deliveryType,
      subtotal: order.subtotal,
      totalAmount: order.totalAmount,
      amountPaid: order.amountPaid,
      balanceDue: Math.max((order.totalAmount || 0) - (order.amountPaid || 0), 0),
      damageWaiver: order.damageWaiver,
      damageWaiverFee: order.damageWaiverFee,
      deliveryFee: order.deliveryFee,
      taxAmount: order.taxAmount,
      taxRate: order.taxRate,
      contractSignedAt: order.contractSignedAt,
      contractSignatureName: order.contractSignatureName,
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      customerEmail: order.customer.email,
      items: order.items.map((i) => ({
        itemName: i.itemName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.total,
      })),
    },
  }, { headers: privateHeaders })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await request.json()
  const id = (await params).id
  const name = (body?.name || '').trim()

  if (!name) {
    return NextResponse.json({ error: 'Signature name is required' }, { status: 400 })
  }

  const order = await prisma.order.findUnique({ where: { id } })
  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (!await authorizedOrderAccess(request, id, typeof body?.accessToken === 'string' ? body.accessToken : request.nextUrl.searchParams.get('access'))) {
    return NextResponse.json({ error: 'Verification required' }, { status: 401, headers: privateHeaders })
  }

  const forwardedFor = request.headers.get('x-forwarded-for')
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown'

  const updated = await prisma.order.update({
    where: { id },
    data: {
      contractSignedAt: new Date(),
      contractSignatureName: name,
      contractSignatureIp: ip,
    },
  })

  return NextResponse.json({
    success: true,
    contractSignedAt: updated.contractSignedAt,
    contractSignatureName: updated.contractSignatureName,
  })
}
