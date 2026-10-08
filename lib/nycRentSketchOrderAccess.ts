import { prisma } from '@/lib/prisma'

export function includedNycRentSketchOrder(order: {
  status: string
  amountPaid: number
  scheduleApprovedUnpaid: boolean
  eventDate: Date
  eventEndDate: Date | null
}, now = Date.now()) {
  const expiresAt = new Date((order.eventEndDate || order.eventDate).getTime() + 7 * 86400000)
  const status = String(order.status || '').toLowerCase()
  const activeStatus = !['quote','draft','incomplete','canceled','cancelled'].includes(status)
  return {
    eligible: activeStatus && (order.amountPaid > 0 || order.scheduleApprovedUnpaid) && expiresAt.getTime() > now,
    expiresAt,
  }
}

function normalizedName(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[‘’]/g, "'").trim().replace(/\s+/g, ' ').toLowerCase()
}

export async function lookupNycRentSketchOrder(input: { orderNumber?: unknown; orderId?: unknown; email?: unknown; firstName?: unknown }) {
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : ''
  const firstName = typeof input.firstName === 'string' ? normalizedName(input.firstName) : ''
  const number = typeof input.orderNumber === 'string' ? input.orderNumber.trim().replace(/^#\s*/, '') : ''
  const id = typeof input.orderId === 'string' ? input.orderId : ''
  if ((!email && !firstName) || email.length > 254 || firstName.length > 100 || (!number && !id) || number.length > 80 || id.length > 100) return null

  const order = await prisma.order.findFirst({
    where: {
      ...(id ? { id } : { orderNumber: { equals: number, mode: 'insensitive' as const } }),
      ...(!firstName ? { customer: { email: { equals: email, mode: 'insensitive' as const } } } : {}),
    },
    include: {
      customer: true,
      items: { include: { item: { select: { slug: true } } } },
    },
  })
  if (!order) return null
  if (firstName && firstName !== normalizedName(order.customer.firstName || '')) return null

  const access = includedNycRentSketchOrder(order)
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    eligible: access.eligible,
    expiresAt: access.expiresAt.toISOString(),
    eventDate: order.eventDate.toISOString().slice(0, 10),
    eventEndDate: (order.eventEndDate || order.eventDate).toISOString().slice(0, 10),
    updatedAt: order.updatedAt.toISOString(),
    customerEmail: order.customer.email.trim().toLowerCase(),
    customerName: (order.customer.firstName + ' ' + order.customer.lastName).trim(),
    deliveryZip: order.eventZip || '',
    surfaceType: order.setupSurface || 'notSure',
    items: order.items.map(row => ({ slug: row.item?.slug || '', name: row.itemName, quantity: row.quantity })),
  }
}
