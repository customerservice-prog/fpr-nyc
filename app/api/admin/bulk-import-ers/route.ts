export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const body = await request.json()
  const orders = body.orders || []
  let created = 0
  let customersCreated = 0
  let customersReused = 0
  const errors: any[] = []

  for (const [__idx, o] of orders.entries()) {
    try {
      let customer = null
      if (o.email) {
        customer = await prisma.customer.findFirst({ where: { email: o.email } })
      }
      if (!customer) {
        customer = await prisma.customer.findFirst({
          where: { firstName: o.firstName, lastName: o.lastName, address: o.address || undefined },
        })
      }
      if (customer) {
        customersReused++
      } else {
        const generatedEmail = 'no-email-' + Date.now() + '-' + Math.random().toString(36).slice(2,8) + '@imported.friendlypartyrental.local'
        const custNotes = o.companyName ? ('Company: ' + o.companyName) : null
        customer = await prisma.customer.create({
          data: {
            firstName: o.firstName || 'Unknown',
            lastName: o.lastName || '',
            email: o.email || generatedEmail,
            phone: o.phone || null,
            address: o.address || null,
            city: o.city || null,
            state: o.state || null,
            zip: o.zip || null,
            notes: custNotes,
          },
        })
        customersCreated++
      }

      const orderNumber = o.ersOrderId ? ('ERS-' + o.ersOrderId) : ('ERS-' + (__idx + 1) + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,6))
      const adjNotes = (o.adjLinesRaw || []).join(String.fromCharCode(10))
      const specialNotes = (o.specialRequestNames || []).join(String.fromCharCode(10))
      const orderNotes = 'Imported from ERS.' + String.fromCharCode(10) + adjNotes

      await prisma.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          status: o.status || 'active',
          eventDate: new Date(o.eventDate),
          eventEndDate: o.eventEndDate ? new Date(o.eventEndDate) : null,
          createdAt: new Date(o.eventDate),
          eventAddress: o.address || null,
          eventCity: o.city || null,
          eventState: o.state || null,
          eventZip: o.zip || null,
          deliveryType: 'delivery',
          deliveryFee: o.deliveryFee || 0,
          subtotal: o.subtotal || 0,
          taxRate: o.taxRate || 0,
          taxAmount: o.taxAmount || 0,
          couponCode: o.couponCode || null,
          couponDiscount: o.couponDiscount || 0,
          damageWaiver: !!o.damageWaiver,
          damageWaiverFee: o.damageWaiverFee || 0,
          specialRequestFee: o.specialRequestFee || 0,
          specialRequestNames: specialNotes || null,
          totalAmount: o.totalAmount || 0,
          amountPaid: o.amountPaid || 0,
          balanceDue: o.balanceDue || 0,
          notes: orderNotes,
          items: {
            create: (o.items || []).map((it: any) => ({
              itemName: it.itemName,
              quantity: it.quantity,
              unitPrice: 0,
              total: 0,
            })),
          },
          payments: {
            create: (o.payments || []).map((p: any) => ({
              amount: p.amount,
              method: p.method || 'card',
              notes: p.isRefund ? 'Refund (imported from ERS)' : 'Imported from ERS',
              createdAt: new Date(o.eventDate),
            })),
          },
        },
      })
      created++
    } catch (e: any) {
      errors.push({ idx: o.idx, error: e.message })
    }
  }

  return NextResponse.json({ created, customersCreated, customersReused, errors })
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin()
  if (denied) return denied

  const body = await request.json()
  const updates = body.updates || []
  let updated = 0
  const errors: any[] = []

  for (const u of updates) {
    try {
      const match = await prisma.customer.findFirst({
        where: {
          firstName: { equals: u.firstName, mode: 'insensitive' },
          lastName: { equals: u.lastName, mode: 'insensitive' },
          email: { contains: '@imported.friendlypartyrental.local' },
        },
      })
      if (match) {
        await prisma.customer.update({ where: { id: match.id }, data: { email: u.email } })
        updated++
      }
    } catch (e: any) {
      errors.push({ name: u.firstName + ' ' + u.lastName, error: e.message })
    }
  }

  return NextResponse.json({ updated, errors })
}
