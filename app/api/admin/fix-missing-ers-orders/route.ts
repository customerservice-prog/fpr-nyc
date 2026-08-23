export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// One-time fix, per manual reconciliation against the legacy ERS system:
// 1. Create 19 orders entirely missing from the original ERS migration.
// 2. Correct 5 payment dates on 2 orders (ERS-6803, ERS-7203) that were imported
//    with the wrong year (true 2025 payments mis-dated into 2026).
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

const results: any = { ordersCreated: 0, customersCreated: 0, paymentsCreated: 0, anomalyDatesFixed: 0, skipped: [] as string[] }

const orders: any[] = [
  {
    orderNumber: 'ERS-6931', customerId: 'cmrm1y17600ihuywnm3nl3y3e', status: 'canceled',
    eventDate: '2026-06-27T12:00:00.000Z', eventEndDate: '2026-06-28T12:00:00.000Z',
    eventAddress: '3130 Hidden Lake Dr', eventCity: 'Baldwinsville', eventState: 'NY', eventZip: '13027',
    subtotal: 307.00, damageWaiver: true, damageWaiverFee: 30.70, deliveryFee: 99.00,
    taxAmount: 34.94, taxRate: 8, tipAmount: 47.40, totalAmount: 471.64, amountPaid: -47.40, balanceDue: 519.04,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 307.00, total: 307.00 }],
    payments: [
      { amount: 155.64, createdAt: '2025-08-24T12:00:00.000Z' },
      { amount: 316.00, createdAt: '2026-06-01T12:00:00.000Z' },
      { amount: -155.64, createdAt: '2026-06-27T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      { amount: -363.40, createdAt: '2026-06-27T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-7234', customerId: 'cmrm1y1jg00jauywnbiij236f', status: 'canceled',
    eventDate: '2026-01-16T12:00:00.000Z', eventEndDate: '2026-01-19T12:00:00.000Z',
    eventAddress: '751 Comstock Ave', eventCity: 'Syracuse', eventState: 'NY', eventZip: '13210',
    subtotal: 75.00, damageWaiver: true, damageWaiverFee: 7.50, deliveryFee: 39.99,
    taxAmount: 9.80, taxRate: 8, tipAmount: 26.46, totalAmount: 132.29, amountPaid: -26.46, balanceDue: 158.75,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 75.00, total: 75.00 }],
    payments: [
      { amount: 132.29, createdAt: '2026-01-14T12:00:00.000Z' },
      { amount: -158.75, createdAt: '2026-01-16T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-7240', customerId: 'cmrm1xxvl008tuywnxtr6tfgx', status: 'canceled',
    eventDate: '2026-06-20T12:00:00.000Z', eventEndDate: '2026-06-21T12:00:00.000Z',
    eventAddress: '1240 Coddington Rd', eventCity: null, eventState: 'NY', eventZip: '14817',
    subtotal: 870.00, generalDiscount: 180.95, damageWaiver: true, damageWaiverFee: 68.91, deliveryFee: 179.99,
    couponCode: 'SAVE20', couponDiscount: 20.00,
    taxAmount: 73.44, taxRate: 8, totalAmount: 991.39, amountPaid: 0.00, balanceDue: 991.39,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 870.00, total: 870.00 }],
    payments: [
      { amount: 1664.63, createdAt: '2026-01-23T12:00:00.000Z' },
      { amount: -673.24, createdAt: '2026-06-20T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      { amount: -991.39, createdAt: '2026-06-21T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-7279', customerId: 'cmrm1xvow002tuywnspuc5br2', status: 'canceled',
    eventDate: '2026-06-28T12:00:00.000Z', eventEndDate: '2026-06-29T12:00:00.000Z',
    eventAddress: '416 east franklin st', eventCity: 'Fayetteville', eventState: 'NY', eventZip: '13066',
    subtotal: 758.00, damageWaiver: true, damageWaiverFee: 75.80, deliveryFee: 39.99,
    taxAmount: 69.90, taxRate: 8, totalAmount: 943.69, amountPaid: 0.00, balanceDue: 943.69,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 758.00, total: 758.00 }],
    payments: [
      { amount: 305.54, createdAt: '2026-02-10T12:00:00.000Z' },
      { amount: 638.15, createdAt: '2026-06-18T12:00:00.000Z' },
      { amount: -305.54, createdAt: '2026-06-28T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      { amount: -638.15, createdAt: '2026-06-28T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-7602', customerId: 'cmrm1xvwp003huywntzg36i3c', status: 'canceled',
    eventDate: '2026-06-27T12:00:00.000Z', eventEndDate: null,
    eventAddress: '4679 Watch Hill Rd.', eventCity: 'Manlius', eventState: 'NY', eventZip: '13104',
    subtotal: 224.00, damageWaiver: true, damageWaiverFee: 22.40, deliveryFee: 39.99,
    taxAmount: 22.91, taxRate: 8, totalAmount: 309.30, amountPaid: 0.00, balanceDue: 309.30,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 224.00, total: 224.00 }],
    payments: [
      { amount: 102.07, createdAt: '2026-04-11T12:00:00.000Z' },
      { amount: 207.23, createdAt: '2026-06-14T12:00:00.000Z' },
      { amount: -102.07, createdAt: '2026-06-27T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      { amount: -207.23, createdAt: '2026-06-27T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-7658', customerId: 'cmrm21uwb00nduywnhlwxctkf', status: 'completed',
    eventDate: '2026-06-06T12:00:00.000Z', eventEndDate: null,
    eventAddress: '102 Gadwell lane', eventCity: 'Manlius', eventState: 'NY', eventZip: '13104',
    subtotal: 100.00, generalDiscount: 9.80, damageWaiver: true, damageWaiverFee: 9.02, deliveryFee: 0,
    taxAmount: 0, taxRate: 8, totalAmount: 99.22, amountPaid: 99.22, balanceDue: 0,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 100.00, total: 100.00 }],
    payments: [
      { amount: 99.22, createdAt: '2026-04-20T12:00:00.000Z' },
      ],
  },
  {
    orderNumber: 'ERS-7763', customerId: 'cmrm1xvyr003ouywnoxldm80x', status: 'canceled',
    eventDate: '2026-07-03T12:00:00.000Z', eventEndDate: '2026-07-04T12:00:00.000Z',
    eventAddress: '6 Rippleton Road', eventCity: 'Cazenovia', eventState: 'NY', eventZip: '13035',
    subtotal: 2975.00, damageWaiver: true, damageWaiverFee: 297.50, deliveryFee: 39.99,
    taxAmount: 265.00, taxRate: 8, totalAmount: 3577.49, amountPaid: 0.00, balanceDue: 3577.49,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 2975.00, total: 2975.00 }],
    payments: [
      { amount: 1180.57, createdAt: '2026-04-28T12:00:00.000Z' },
      { amount: -1180.57, createdAt: '2026-06-30T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-7962', customerId: 'cmrm21ucy00lguywnxnta1gg7', status: 'canceled',
    eventDate: '2026-06-28T12:00:00.000Z', eventEndDate: '2026-06-29T12:00:00.000Z',
    eventAddress: '7825 karakul lane', eventCity: 'Fayetteville', eventState: 'NY', eventZip: '13066',
    subtotal: 534.00, damageWaiver: true, damageWaiverFee: 53.40, deliveryFee: 39.99,
    taxAmount: 50.19, taxRate: 8, totalAmount: 677.58, amountPaid: 0.00, balanceDue: 677.58,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 534.00, total: 534.00 }],
    payments: [
      { amount: 223.60, createdAt: '2026-05-19T12:00:00.000Z' },
      { amount: 453.98, createdAt: '2026-06-26T12:00:00.000Z' },
      { amount: -223.60, createdAt: '2026-06-28T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      { amount: -453.98, createdAt: '2026-06-28T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-7980', customerId: 'cmrm21wlh00syuywn9ys48lw9', status: 'canceled',
    eventDate: '2026-06-27T12:00:00.000Z', eventEndDate: null,
    eventAddress: '201 Maplegrove Rd', eventCity: 'Syracuse', eventState: 'NY', eventZip: '13209',
    subtotal: 705.00, damageWaiver: true, damageWaiverFee: 70.50, deliveryFee: 85.00,
    taxAmount: 68.84, taxRate: 8, totalAmount: 929.34, amountPaid: 0.00, balanceDue: 929.34,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 705.00, total: 705.00 }],
    payments: [
      { amount: 306.68, createdAt: '2026-05-17T12:00:00.000Z' },
      { amount: 622.66, createdAt: '2026-06-16T12:00:00.000Z' },
      { amount: -306.68, createdAt: '2026-06-27T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      { amount: -622.66, createdAt: '2026-06-27T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-8052', customerId: 'cmrm1y0rv00h9uywnhst01rxn', status: 'canceled',
    eventDate: '2026-06-28T12:00:00.000Z', eventEndDate: null,
    eventAddress: '4560 Brickyard Falls Rd', eventCity: 'Manlius', eventState: 'NY', eventZip: '1304',
    subtotal: 529.00, generalDiscount: 67.00, damageWaiver: true, damageWaiverFee: 46.20, deliveryFee: 39.99,
    taxAmount: 43.86, taxRate: 8, totalAmount: 592.05, amountPaid: 0.00, balanceDue: 592.05,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 529.00, total: 529.00 }],
    payments: [
      { amount: 280.45, createdAt: '2026-05-24T12:00:00.000Z' },
      { amount: 311.60, createdAt: '2026-06-24T12:00:00.000Z' },
      { amount: -280.45, createdAt: '2026-06-28T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      { amount: -311.60, createdAt: '2026-06-28T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-8089', customerId: 'cmrm1xz4c00chuywndu4yeqi4', status: 'canceled',
    eventDate: '2026-06-27T12:00:00.000Z', eventEndDate: null,
    eventAddress: '417 S Edwards Ave', eventCity: 'Syracuse', eventState: 'NY', eventZip: '13206',
    subtotal: 159.00, damageWaiver: true, damageWaiverFee: 15.90, deliveryFee: 39.99,
    taxAmount: 17.19, taxRate: 8, tipAmount: 11.49, totalAmount: 232.08, amountPaid: -11.49, balanceDue: 243.57,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 159.00, total: 159.00 }],
    payments: [
      { amount: 76.59, createdAt: '2026-05-28T12:00:00.000Z' },
      { amount: -88.08, createdAt: '2026-06-22T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-8171', customerId: 'cmrm18x3c0006uywnisqc54od', status: 'canceled',
    eventDate: '2026-06-20T12:00:00.000Z', eventEndDate: null,
    eventAddress: '203 Hibiscus Drive', eventCity: 'North Syracuse', eventState: 'NY', eventZip: '13212',
    subtotal: 315.50, damageWaiver: true, damageWaiverFee: 31.55, deliveryFee: 39.99,
    taxAmount: 30.96, taxRate: 8, tipAmount: 30.00, totalAmount: 418.00, amountPaid: -30.00, balanceDue: 448.00,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 315.50, total: 315.50 }],
    payments: [
      { amount: 137.94, createdAt: '2026-05-31T12:00:00.000Z' },
      { amount: 280.06, createdAt: '2026-06-11T12:00:00.000Z' },
      { amount: -137.94, createdAt: '2026-06-20T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      { amount: -310.06, createdAt: '2026-06-20T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-8244', customerId: 'cmrm1xvgo0024uywnml1rmjnf', status: 'canceled',
    eventDate: '2026-06-21T12:00:00.000Z', eventEndDate: '2026-06-22T12:00:00.000Z',
    eventAddress: '127 View Point Ln', eventCity: 'Camillus', eventState: 'NY', eventZip: '13031-2160',
    subtotal: 196.50, deliveryFee: 113.99, couponDiscount: 20.00,
    taxAmount: 23.24, taxRate: 8, totalAmount: 313.73, amountPaid: 0.00, balanceDue: 313.73,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 196.50, total: 196.50 }],
    payments: [
      { amount: 313.73, createdAt: '2026-06-05T12:00:00.000Z' },
      { amount: -313.73, createdAt: '2026-06-21T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-8250', customerId: 'cmrm1xx1n006ruywnmwkxsxu9', status: 'canceled',
    eventDate: '2026-06-28T12:00:00.000Z', eventEndDate: null,
    eventAddress: 'Hiawatha Lake', eventCity: 'Syracuse', eventState: 'NY', eventZip: '13207',
    subtotal: 37.50, deliveryFee: 0, taxAmount: 3.00, taxRate: 8, totalAmount: 40.50, amountPaid: 0.00, balanceDue: 40.50,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 37.50, total: 37.50 }],
    payments: [
      { amount: 40.50, createdAt: '2026-06-09T12:00:00.000Z' },
      { amount: -40.50, createdAt: '2026-06-27T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-8275', customerId: 'cmrm21umq00mguywnllksvzik', status: 'canceled',
    eventDate: '2026-06-27T12:00:00.000Z', eventEndDate: '2026-06-28T12:00:00.000Z',
    eventAddress: '793 Meeker Hill Rd', eventCity: 'Tully', eventState: 'NY', eventZip: '13159',
    subtotal: 640.00, deliveryFee: 117.99, taxAmount: 60.64, taxRate: 8, totalAmount: 818.63, amountPaid: 0.00, balanceDue: 818.63,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 640.00, total: 640.00 }],
    payments: [
      { amount: 270.15, createdAt: '2026-06-06T12:00:00.000Z' },
      { amount: 548.48, createdAt: '2026-06-25T12:00:00.000Z' },
      { amount: -270.15, createdAt: '2026-06-27T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      { amount: -548.48, createdAt: '2026-06-27T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-8301', customerId: 'cmrm1y1ka00jduywnzahwuokl', status: 'canceled',
    eventDate: '2026-06-27T12:00:00.000Z', eventEndDate: null,
    eventAddress: '7655 Stonehedge Lane', eventCity: 'Manlius', eventState: 'NY', eventZip: '13104',
    subtotal: 399.00, deliveryFee: 29.99, taxAmount: 34.32, taxRate: 8, totalAmount: 463.31, amountPaid: 0.00, balanceDue: 463.31,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 399.00, total: 399.00 }],
    payments: [
      { amount: 152.89, createdAt: '2026-06-08T12:00:00.000Z' },
      { amount: -152.89, createdAt: '2026-06-22T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-8360', customerId: 'cmrm1xvof002ruywne0wulyix', status: 'canceled',
    eventDate: '2026-06-27T12:00:00.000Z', eventEndDate: null,
    eventAddress: '4880 Firethorn circle', eventCity: 'Manlius', eventState: 'NY', eventZip: '13104',
    subtotal: 199.00, deliveryFee: 49.99, taxAmount: 19.92, taxRate: 8, tipAmount: 18.02, totalAmount: 268.91, amountPaid: -18.02, balanceDue: 286.93,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 199.00, total: 199.00 }],
    payments: [
      { amount: 88.74, createdAt: '2026-06-15T12:00:00.000Z' },
      { amount: 180.17, createdAt: '2026-06-26T12:00:00.000Z' },
      { amount: -88.74, createdAt: '2026-06-27T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      { amount: -198.19, createdAt: '2026-06-27T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  {
    orderNumber: 'ERS-8461', status: 'active',
    newCustomer: { firstName: 'Brian', lastName: 'Cavallo', email: 'brian.cavallo@wzbville.com', phone: '315-849-1177', address: '1254 highland forest rd', city: 'Fabius', state: 'NY', zip: '13063' },
    eventDate: '2027-09-03T12:00:00.000Z', eventEndDate: null,
    eventAddress: '1254 highland forest rd', eventCity: 'Fabius', eventState: 'NY', eventZip: '13063',
    subtotal: 825.00, deliveryFee: 109.99, miscellaneousFees: 100.00,
    taxAmount: 82.80, taxRate: 8, totalAmount: 1117.79, amountPaid: 368.87, balanceDue: 748.92,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 825.00, total: 825.00 }],
    payments: [
      { amount: 368.87, createdAt: '2026-06-18T12:00:00.000Z' },
      ],
  },
  {
    orderNumber: 'ERS-8496', customerId: 'cmrm18xee0015uywnmmuv19jx', status: 'canceled',
    eventDate: '2026-07-04T12:00:00.000Z', eventEndDate: null,
    eventAddress: '7875 MacArthur Blvd', eventCity: 'Bridgeport', eventState: 'NY', eventZip: '13030',
    subtotal: 250.00, deliveryFee: 49.99, taxAmount: 24.00, taxRate: 8, totalAmount: 323.99, amountPaid: 0.00, balanceDue: 323.99,
    items: [{ itemName: 'Rental Items (imported from ERS)', quantity: 1, unitPrice: 250.00, total: 250.00 }],
    payments: [
      { amount: 106.92, createdAt: '2026-06-21T12:00:00.000Z' },
      { amount: -106.92, createdAt: '2026-06-30T12:00:00.000Z', notes: 'Refund (imported from ERS)' },
      ],
  },
  ]

for (const o of orders) {
  const existingOrder = await prisma.order.findFirst({ where: { orderNumber: o.orderNumber } })
  if (existingOrder) { results.skipped.push(o.orderNumber); continue }

  let customerId: string
  if (o.newCustomer) {
    const c = await prisma.customer.create({ data: { ...o.newCustomer, customerType: 'Customer' } })
    results.customersCreated++
    customerId = c.id
  } else {
    customerId = o.customerId
  }

  await prisma.order.create({
    data: {
      orderNumber: o.orderNumber,
      customerId: customerId,
      status: o.status,
      eventDate: new Date(o.eventDate),
      eventEndDate: o.eventEndDate ? new Date(o.eventEndDate) : null,
      eventAddress: o.eventAddress,
      eventCity: o.eventCity || null,
      eventState: o.eventState,
      eventZip: o.eventZip,
      deliveryType: 'delivery',
      deliveryFee: o.deliveryFee || 0,
      subtotal: o.subtotal,
      generalDiscount: o.generalDiscount || 0,
      couponCode: o.couponCode || null,
      couponDiscount: o.couponDiscount || 0,
      damageWaiver: !!o.damageWaiver,
      damageWaiverFee: o.damageWaiverFee || 0,
      miscellaneousFees: o.miscellaneousFees || 0,
      taxAmount: o.taxAmount,
      taxRate: o.taxRate || 8,
      tipAmount: o.tipAmount || 0,
      totalAmount: o.totalAmount,
      amountPaid: o.amountPaid,
      balanceDue: o.balanceDue,
      notes: 'Imported from ERS.',
      items: { create: o.items },
      payments: { create: o.payments.map((p: any) => ({ amount: p.amount, method: 'card', notes: p.notes || 'Imported from ERS', createdAt: new Date(p.createdAt) })) },
    },
  })
  results.ordersCreated++
  results.paymentsCreated += o.payments.length
}

const anomalyFixes = [
  { orderNumber: 'ERS-7203', amount: 564.98, newDate: '2025-12-23T12:00:00.000Z' },
  { orderNumber: 'ERS-7203', amount: 49.68, newDate: '2026-01-26T12:00:00.000Z' },
  { orderNumber: 'ERS-6803', amount: 208.81, newDate: '2025-08-04T12:00:00.000Z' },
  { orderNumber: 'ERS-6803', amount: 472.97, newDate: '2026-05-23T12:00:00.000Z' },
  { orderNumber: 'ERS-6803', amount: 28.21, newDate: '2026-06-08T12:00:00.000Z' },
  ]
  for (const f of anomalyFixes) {
    const ord = await prisma.order.findFirst({ where: { orderNumber: f.orderNumber } })
    if (!ord) { results.skipped.push(`${f.orderNumber}-anomaly-not-found`); continue }
    const r = await prisma.payment.updateMany({
      where: { orderId: ord.id, amount: f.amount },
      data: { createdAt: new Date(f.newDate) },
    })
    results.anomalyDatesFixed += r.count
  }

return NextResponse.json(results)
}
