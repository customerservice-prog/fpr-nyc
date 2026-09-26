export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// One-time fix, per manual reconciliation against the legacy ERS system and Stripe:
// 1. Recreate order ERS-8484 (Felicia Squairs), entirely missing from the original ERS migration.
// 2. Add 6 payments that were missing from the ERS migration on existing orders.
// 3. Correct 16 payment createdAt dates corrupted by the earlier fix-ers-dates run.
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const results: any = {}

  const customer = await prisma.customer.create({
    data: {
      firstName: 'Felicia',
      lastName: 'Squairs',
      email: 'fsquairs1972@gmail.com',
      phone: '315-430-4348',
      address: '1015 Fyler Road',
      city: 'Kirkville',
      state: 'NY',
      zip: '13082',
      },
    })

  const order8484 = await prisma.order.create({
    data: {
      orderNumber: 'ERS-8484',
      customerId: customer.id,
      status: 'canceled',
      eventDate: new Date('2026-07-03T11:00:00.000Z'),
      eventEndDate: new Date('2026-07-04T11:30:00.000Z'),
      eventAddress: '1015 Fyler Road',
      eventCity: 'Kirkville',
      eventState: 'NY',
      eventZip: '13082',
      deliveryType: 'delivery',
      deliveryFee: 49.99,
      subtotal: 484.00,
      taxAmount: 42.72,
      taxRate: 8,
      totalAmount: 576.71,
      amountPaid: 0,
      balanceDue: 576.71,
      notes: 'Imported from ERS.',
      items: {
        create: [
          { itemName: '8ft Banquet Wood Folding Table', quantity: 6, unitPrice: 13.31, total: 79.86 },
          { itemName: 'White Plastic Folding Chair', quantity: 30, unitPrice: 2.38, total: 71.40 },
          { itemName: '20x30 Pole Tent', quantity: 1, unitPrice: 332.74, total: 332.74 },
          ],
        },
      payments: {
        create: [
          { amount: 190.31, method: 'card', notes: 'Imported from ERS', createdAt: new Date('2026-06-19T12:00:00.000Z') },
          { amount: 386.40, method: 'card', notes: 'Imported from ERS', createdAt: new Date('2026-07-01T12:00:00.000Z') },
          { amount: -190.31, method: 'card', notes: 'Refund (imported from ERS)', createdAt: new Date('2026-07-03T12:00:00.000Z') },
          { amount: -386.40, method: 'card', notes: 'Refund (imported from ERS)', createdAt: new Date('2026-07-03T12:00:00.000Z') },
          ],
        },
      },
    })
  results.order8484Id = order8484.id


  const missingPayments = [
    { orderId: 'cmrao21yg050bihxeil1pwqgn', amount: 86.40, createdAt: '2026-07-13T12:00:00.000Z', notes: 'Imported from ERS', newTotalAmount: 674.06, newAmountPaid: 674.06, newBalanceDue: 0 },
    { orderId: 'cmrao23lk059vihxerngqbw12', amount: 54.00, createdAt: '2026-07-07T12:00:00.000Z', notes: 'Imported from ERS', newTotalAmount: 2005.55, newAmountPaid: 2005.55, newBalanceDue: 0 },
    { orderId: 'cmrao235m056yihxe34cmtu09', amount: 347.32, createdAt: '2026-07-13T12:00:00.000Z', notes: 'Imported from ERS', stripePaymentId: 'pi_3TqfTbGf1s3HkC4m19YuyPbh', newAmountPaid: 518.39, newBalanceDue: 0 },
    { orderId: 'cmrao246205dpihxekd3l1uqo', amount: 184.15, createdAt: '2026-07-17T12:00:00.000Z', notes: 'Imported from ERS', newAmountPaid: 274.85, newBalanceDue: 0 },
    { orderId: 'cmrao244305d7ihxes8eu74tq', amount: 225.03, createdAt: '2026-07-11T12:00:00.000Z', notes: 'Imported from ERS', newAmountPaid: 335.87, newBalanceDue: 0 },
    { orderId: 'cmrao23mp05afihxec43sq1br', amount: -424.99, createdAt: '2026-07-11T12:00:00.000Z', notes: 'Refund (imported from ERS)', newAmountPaid: -20.00, newBalanceDue: 424.99 },
    ]

  let paymentsAdded = 0
  for (const p of missingPayments as any[]) {
    await prisma.payment.create({
      data: {
        orderId: p.orderId,
        amount: p.amount,
        method: 'card',
        notes: p.notes,
        stripePaymentId: p.stripePaymentId || null,
        createdAt: new Date(p.createdAt),
        },
      })
    paymentsAdded++

    const updateData: any = { amountPaid: p.newAmountPaid, balanceDue: p.newBalanceDue }
    if (p.newTotalAmount !== undefined) updateData.totalAmount = p.newTotalAmount
    await prisma.order.update({
      where: { id: p.orderId },
      data: updateData,
      })
    }
  results.paymentsAdded = paymentsAdded


  const dateFixes = [
    { orderId: 'cmrao20je04rtihxerhgstdp1', amount: 200, newDate: '2026-07-07T21:17:58.000Z' },
    { orderId: 'cmrao23wc05bxihxez2cugg3r', amount: 415.34, newDate: '2026-07-21T15:02:42.000Z' },
    { orderId: 'cmrao20hc04rfihxe13g6urat', amount: 412.82, newDate: '2026-07-07T21:58:34.000Z' },
    { orderId: 'cmrao20hc04rfihxe13g6urat', amount: 100.65, newDate: '2026-07-19T22:39:58.000Z' },
    { orderId: 'cmrao23sv05bfihxezwj8doyb', amount: 432.00, newDate: '2026-07-17T16:01:21.000Z' },
    { orderId: 'cmrceujsr0002qnsoiwg0hrxx', amount: 415.26, newDate: '2026-07-11T21:02:15.000Z' },
    { orderId: 'cmrceujsr0002qnsoiwg0hrxx', amount: 943.37, newDate: '2026-07-18T12:51:43.000Z' },
    { orderId: 'cmrao2393057jihxeggt5dz3o', amount: 227.17, newDate: '2026-07-08T20:42:39.000Z' },
    { orderId: 'cmrao22ud0557ihxej1wn3pqq', amount: 591.73, newDate: '2026-07-10T00:44:38.000Z' },
    { orderId: 'cmrao216q04vaihxezpegtm7k', amount: 1000.15, newDate: '2026-07-08T16:10:34.000Z' },
    { orderId: 'cmrao249z05ebihxekwu9y87n', amount: 237.33, newDate: '2026-07-14T12:00:00.000Z' },
    { orderId: 'cmrao241005cpihxe5pqzrky2', amount: 188.13, newDate: '2026-07-10T12:00:00.000Z' },
    { orderId: 'cmrao23s005bbihxeh9qn9863', amount: 469.90, newDate: '2026-07-09T12:00:00.000Z' },
    { orderId: 'cmrao23h30590ihxeo75n6f72', amount: -410.39, newDate: '2026-07-07T12:00:00.000Z' },
    { orderId: 'cmrao247205dvihxep5x254fc', amount: 186.68, newDate: '2026-07-07T12:00:00.000Z' },
    { orderId: 'cmrao22z50562ihxerjlbthtf', amount: 492.98, newDate: '2026-07-07T12:00:00.000Z' },
    ]

  let datesFixed = 0
  for (const f of dateFixes) {
    const r = await prisma.payment.updateMany({
      where: { orderId: f.orderId, amount: f.amount },
      data: { createdAt: new Date(f.newDate) },
      })
    datesFixed += r.count
    }
  results.datesFixed = datesFixed

  return NextResponse.json(results)
  }
