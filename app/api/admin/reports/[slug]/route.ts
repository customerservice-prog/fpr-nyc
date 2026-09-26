import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { slugify, IMPLEMENTED_SLUGS } from '@/lib/reportsConfig'

function money(n: number): number {
  return Math.round((n || 0) * 100) / 100
}

function getRange(request: NextRequest): { start: Date; end: Date } {
  const { searchParams } = new URL(request.url)
  const startParam = searchParams.get('start')
  const endParam = searchParams.get('end')
  const end = endParam ? new Date(endParam) : new Date()
  const start = startParam ? new Date(startParam) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
  end.setHours(23, 59, 59, 999)
  start.setHours(0, 0, 0, 0)
  return { start, end }
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function customerName(c: any): string {
  if (!c) return 'Unknown'
  return (c.firstName || '') + ' ' + (c.lastName || '')
}

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any).role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const slug = (await context.params).slug

  if (!IMPLEMENTED_SLUGS.has(slug)) {
    return NextResponse.json({ notImplemented: true })
  }

  if (slug === slugify('Sales References')) {
    const orders = await prisma.order.findMany({
      where: { status: { not: 'canceled' } },
      select: { referenceSource: true, totalAmount: true },
    })
    const byRef: any = {}
    for (const o of orders) {
      const key = o.referenceSource || 'Unknown'
      if (!byRef[key]) byRef[key] = { orders: 0, revenue: 0 }
      byRef[key].orders++
      byRef[key].revenue += o.totalAmount
    }
    const rows = Object.keys(byRef).map((ref) => ({ reference: ref, orders: byRef[ref].orders, revenue: money(byRef[ref].revenue) })).sort((a, b) => b.revenue - a.revenue)
    return NextResponse.json({
      title: 'Sales References',
      columns: [
        { key: 'reference', label: 'Reference Source' },
        { key: 'orders', label: 'Orders' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      summary: [{ label: 'Total Orders', value: orders.length }],
    })
  }

  if (slug === slugify('Sales References By Created Date')) {
    const year = new Date().getFullYear()
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) }, status: { not: 'canceled' } },
      select: { referenceSource: true, totalAmount: true },
    })
    const byRef: any = {}
    for (const o of orders) {
      const key = o.referenceSource || 'Unknown'
      if (!byRef[key]) byRef[key] = { orders: 0, revenue: 0 }
      byRef[key].orders++
      byRef[key].revenue += o.totalAmount
    }
    const rows = Object.keys(byRef).map((ref) => ({ reference: ref, orders: byRef[ref].orders, revenue: money(byRef[ref].revenue) })).sort((a, b) => b.revenue - a.revenue)
    return NextResponse.json({
      title: 'Sales References By Created Date',
      columns: [
        { key: 'reference', label: 'Reference Source' },
        { key: 'orders', label: 'Orders' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      summary: [{ label: 'Total Orders (This Year, By Created Date)', value: orders.length }],
    })
  }

  if (slug === slugify('Bad Customer Status Report')) {
    const customers = await prisma.customer.findMany({
      where: { OR: [{ doNotRent: true }, { creditStatus: { not: 'good' } }] },
      select: { firstName: true, lastName: true, email: true, phone: true, creditStatus: true, doNotRent: true, doNotRentNote: true },
      orderBy: { lastName: 'asc' },
    })
    const rows = customers.map((c) => ({
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      phone: c.phone || '',
      creditStatus: c.creditStatus,
      doNotRent: c.doNotRent ? 'Yes' : 'No',
      note: c.doNotRentNote || '',
    }))
    return NextResponse.json({
      title: 'Bad Customer Status Report',
      columns: [
        { key: 'name', label: 'Customer' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'creditStatus', label: 'Credit Status' },
        { key: 'doNotRent', label: 'Do Not Rent' },
        { key: 'note', label: 'Note' },
      ],
      rows,
      summary: [{ label: 'Flagged Customers', value: rows.length }],
    })
  }

  if (slug === slugify('Sales Overview')) {
    const year = new Date().getFullYear()
    const orders = await prisma.order.findMany({
      where: { eventDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) }, status: { not: 'canceled' } },
      select: { eventDate: true, totalAmount: true },
    })
    const byMonth: any = {}
    for (const o of orders) {
      const key = monthLabel(o.eventDate)
      if (!byMonth[key]) byMonth[key] = { orders: 0, revenue: 0, sortKey: o.eventDate.getFullYear() * 12 + o.eventDate.getMonth() }
      byMonth[key].orders++
      byMonth[key].revenue += o.totalAmount
    }
    const rows = Object.keys(byMonth).map((month) => ({ month, orders: byMonth[month].orders, revenue: money(byMonth[month].revenue), sortKey: byMonth[month].sortKey })).sort((a, b) => a.sortKey - b.sortKey).map(({ sortKey, ...r }) => r)
    return NextResponse.json({
      title: 'Sales Overview',
      columns: [
        { key: 'month', label: 'Month' },
        { key: 'orders', label: 'Orders' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      summary: [
        { label: 'Total Orders', value: orders.length },
        { label: 'Total Revenue', value: money(orders.reduce((s, o) => s + o.totalAmount, 0)) },
      ],
    })
  }

  if (slug === slugify('Sales Overview By Date Range')) {
    const { start, end } = getRange(request)
    const orders = await prisma.order.findMany({
      where: { eventDate: { gte: start, lte: end }, status: { not: 'canceled' } },
      select: { eventDate: true, totalAmount: true },
    })
    const byDay: any = {}
    for (const o of orders) {
      const key = dayLabel(o.eventDate)
      if (!byDay[key]) byDay[key] = { orders: 0, revenue: 0 }
      byDay[key].orders++
      byDay[key].revenue += o.totalAmount
    }
    const rows = Object.keys(byDay).map((day) => ({ date: day, orders: byDay[day].orders, revenue: money(byDay[day].revenue) }))
    return NextResponse.json({
      title: 'Sales Overview By Date Range',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'orders', label: 'Orders' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      summary: [
        { label: 'Total Orders', value: orders.length },
        { label: 'Total Revenue', value: money(orders.reduce((s, o) => s + o.totalAmount, 0)) },
      ],
    })
  }

  if (slug === slugify('Sales Created Overview')) {
    const year = new Date().getFullYear()
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) }, status: { not: 'canceled' } },
      select: { createdAt: true, totalAmount: true },
    })
    const byMonth: any = {}
    for (const o of orders) {
      const key = monthLabel(o.createdAt)
      if (!byMonth[key]) byMonth[key] = { orders: 0, revenue: 0 }
      byMonth[key].orders++
      byMonth[key].revenue += o.totalAmount
    }
    const rows = Object.keys(byMonth).map((month) => ({ month, orders: byMonth[month].orders, revenue: money(byMonth[month].revenue) }))
    return NextResponse.json({
      title: 'Sales Created Overview',
      columns: [
        { key: 'month', label: 'Month Created' },
        { key: 'orders', label: 'Orders' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      summary: [{ label: 'Total Orders', value: orders.length }],
    })
  }

  if (slug === slugify('Daily Sales')) {
    const end = new Date()
    const start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000)
    const orders = await prisma.order.findMany({
      where: { eventDate: { gte: start, lte: end }, status: { not: 'canceled' } },
      select: { eventDate: true, totalAmount: true },
    })
    const byDay: any = {}
    for (const o of orders) {
      const key = dayLabel(o.eventDate)
      if (!byDay[key]) byDay[key] = { orders: 0, revenue: 0 }
      byDay[key].orders++
      byDay[key].revenue += o.totalAmount
    }
    const rows = Object.keys(byDay).map((day) => ({ date: day, orders: byDay[day].orders, revenue: money(byDay[day].revenue) }))
    return NextResponse.json({
      title: 'Daily Sales (Last 14 Days)',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'orders', label: 'Orders' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('Month to Date')) {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const orders = await prisma.order.findMany({
      where: { eventDate: { gte: start, lte: now }, status: { not: 'canceled' } },
      include: { customer: true },
      orderBy: { eventDate: 'asc' },
    })
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      customer: customerName(o.customer),
      eventDate: dayLabel(o.eventDate),
      total: money(o.totalAmount),
      paid: money(o.amountPaid),
      balance: money(o.balanceDue),
    }))
    return NextResponse.json({
      title: 'Month to Date',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'eventDate', label: 'Event Date' },
        { key: 'total', label: 'Total' },
        { key: 'paid', label: 'Paid' },
        { key: 'balance', label: 'Balance' },
      ],
      rows,
      summary: [
        { label: 'Total Orders', value: orders.length },
        { label: 'Total Revenue', value: money(orders.reduce((s, o) => s + o.totalAmount, 0)) },
      ],
    })
  }

  if (slug === slugify('Sales by City')) {
    const orders = await prisma.order.findMany({
      where: { status: { not: 'canceled' } },
      select: { eventCity: true, totalAmount: true },
    })
    const byCity: any = {}
    for (const o of orders) {
      const key = o.eventCity || 'Unknown'
      if (!byCity[key]) byCity[key] = { orders: 0, revenue: 0 }
      byCity[key].orders++
      byCity[key].revenue += o.totalAmount
    }
    const rows = Object.keys(byCity).map((city) => ({ city, orders: byCity[city].orders, revenue: money(byCity[city].revenue) })).sort((a, b) => b.revenue - a.revenue)
    return NextResponse.json({
      title: 'Sales by City',
      columns: [
        { key: 'city', label: 'City' },
        { key: 'orders', label: 'Orders' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('Sales by Delivery Vs Pickup')) {
    const orders = await prisma.order.findMany({
      where: { status: { not: 'canceled' } },
      select: { deliveryType: true, totalAmount: true },
    })
    const byType: any = {}
    for (const o of orders) {
      const key = o.deliveryType || 'delivery'
      if (!byType[key]) byType[key] = { orders: 0, revenue: 0 }
      byType[key].orders++
      byType[key].revenue += o.totalAmount
    }
    const rows = Object.keys(byType).map((type) => ({ type, orders: byType[type].orders, revenue: money(byType[type].revenue) }))
    return NextResponse.json({
      title: 'Sales by Delivery Vs Pickup',
      columns: [
        { key: 'type', label: 'Delivery Type' },
        { key: 'orders', label: 'Orders' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('Annual Growth')) {
    const orders = await prisma.order.findMany({
      where: { status: { not: 'canceled' } },
      select: { eventDate: true, totalAmount: true },
    })
    const byYear: any = {}
    for (const o of orders) {
      const key = String(o.eventDate.getFullYear())
      if (!byYear[key]) byYear[key] = { orders: 0, revenue: 0 }
      byYear[key].orders++
      byYear[key].revenue += o.totalAmount
    }
    const years = Object.keys(byYear).sort()
    const rows = years.map((year, i) => {
      const prev = i > 0 ? byYear[years[i - 1]].revenue : null
      const growth = prev && prev > 0 ? (((byYear[year].revenue - prev) / prev) * 100).toFixed(1) + '%' : 'N/A'
      return { year, orders: byYear[year].orders, revenue: money(byYear[year].revenue), growth }
    })
    return NextResponse.json({
      title: 'Annual Growth',
      columns: [
        { key: 'year', label: 'Year' },
        { key: 'orders', label: 'Orders' },
        { key: 'revenue', label: 'Revenue' },
        { key: 'growth', label: 'YoY Growth' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('Tax by City')) {
    const orders = await prisma.order.findMany({
      where: { status: { not: 'canceled' } },
      select: { eventCity: true, taxAmount: true },
    })
    const byCity: any = {}
    for (const o of orders) {
      const key = o.eventCity || 'Unknown'
      if (!byCity[key]) byCity[key] = { orders: 0, tax: 0 }
      byCity[key].orders++
      byCity[key].tax += o.taxAmount
    }
    const rows = Object.keys(byCity).map((city) => ({ city, orders: byCity[city].orders, tax: money(byCity[city].tax) })).sort((a, b) => b.tax - a.tax)
    return NextResponse.json({
      title: 'Tax by City',
      columns: [
        { key: 'city', label: 'City' },
        { key: 'orders', label: 'Orders' },
        { key: 'tax', label: 'Tax Amount' },
      ],
      rows,
      summary: [{ label: 'Total Tax', value: money(orders.reduce((s, o) => s + o.taxAmount, 0)) }],
    })
  }

  if (slug === slugify('Tax Collected by City')) {
    const orders = await prisma.order.findMany({
      where: { status: { not: 'canceled' }, amountPaid: { gt: 0 } },
      select: { eventCity: true, taxAmount: true, amountPaid: true, totalAmount: true },
    })
    const byCity: any = {}
    for (const o of orders) {
      const key = o.eventCity || 'Unknown'
      const paidRatio = o.totalAmount > 0 ? Math.min(1, o.amountPaid / o.totalAmount) : 0
      const taxCollected = o.taxAmount * paidRatio
      if (!byCity[key]) byCity[key] = { orders: 0, tax: 0 }
      byCity[key].orders++
      byCity[key].tax += taxCollected
    }
    const rows = Object.keys(byCity).map((city) => ({ city, orders: byCity[city].orders, taxCollected: money(byCity[city].tax) })).sort((a, b) => b.taxCollected - a.taxCollected)
    return NextResponse.json({
      title: 'Tax Collected by City',
      columns: [
        { key: 'city', label: 'City' },
        { key: 'orders', label: 'Orders' },
        { key: 'taxCollected', label: 'Tax Collected' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('Payments by Order')) {
    const payments = await prisma.payment.findMany({
      include: { order: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    const rows = payments.map((p) => ({
      date: dayLabel(p.createdAt),
      orderNumber: p.order ? p.order.orderNumber : '',
      customer: customerName(p.order ? p.order.customer : null),
      amount: money(p.amount),
      method: p.method,
    }))
    return NextResponse.json({
      title: 'Payments by Order',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'amount', label: 'Amount' },
        { key: 'method', label: 'Method' },
      ],
      rows,
      summary: [{ label: 'Total Payments', value: money(payments.reduce((s, p) => s + p.amount, 0)) }],
    })
  }

  if (slug === slugify('Payment List')) {
    const payments = await prisma.payment.findMany({
      include: { order: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    const rows = payments.map((p) => ({
      date: dayLabel(p.createdAt),
      orderNumber: p.order ? p.order.orderNumber : '',
      amount: money(p.amount),
      method: p.method,
      notes: p.notes || '',
    }))
    return NextResponse.json({
      title: 'Payment List',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'orderNumber', label: 'Order #' },
        { key: 'amount', label: 'Amount' },
        { key: 'method', label: 'Method' },
        { key: 'notes', label: 'Notes' },
      ],
      rows,
      summary: [{ label: 'Total', value: money(payments.reduce((s, p) => s + p.amount, 0)) }],
    })
  }

  if (slug === slugify('Order List')) {
    const orders = await prisma.order.findMany({
      include: { customer: true },
      orderBy: { eventDate: 'desc' },
      take: 500,
    })
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      customer: customerName(o.customer),
      eventDate: dayLabel(o.eventDate),
      status: o.status,
      total: money(o.totalAmount),
      balance: money(o.balanceDue),
    }))
    return NextResponse.json({
      title: 'Order List',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'eventDate', label: 'Event Date' },
        { key: 'status', label: 'Status' },
        { key: 'total', label: 'Total' },
        { key: 'balance', label: 'Balance' },
      ],
      rows,
      summary: [{ label: 'Total Orders', value: orders.length }],
    })
  }

  if (slug === slugify('Order List with Notes')) {
    const orders = await prisma.order.findMany({
      include: { customer: true },
      orderBy: { eventDate: 'desc' },
      take: 500,
    })
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      customer: customerName(o.customer),
      eventDate: dayLabel(o.eventDate),
      status: o.status,
      notes: o.notes || '',
      internalNotes: o.internalNotes || '',
    }))
    return NextResponse.json({
      title: 'Order List with Notes',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'eventDate', label: 'Event Date' },
        { key: 'status', label: 'Status' },
        { key: 'notes', label: 'Notes' },
        { key: 'internalNotes', label: 'Internal Notes' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('Canceled Order List')) {
    const orders = await prisma.order.findMany({
      where: { status: 'canceled' },
      include: { customer: true },
      orderBy: { eventDate: 'desc' },
    })
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      customer: customerName(o.customer),
      eventDate: dayLabel(o.eventDate),
      total: money(o.totalAmount),
    }))
    return NextResponse.json({
      title: 'Canceled Order List',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'eventDate', label: 'Event Date' },
        { key: 'total', label: 'Total' },
      ],
      rows,
      summary: [{ label: 'Total Canceled', value: orders.length }],
    })
  }

  if (slug === slugify('Order Info List')) {
    const orders = await prisma.order.findMany({
      include: { customer: true },
      orderBy: { eventDate: 'desc' },
      take: 500,
    })
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      customer: customerName(o.customer),
      address: [o.eventAddress, o.eventCity, o.eventState, o.eventZip].filter(Boolean).join(', '),
      eventDate: dayLabel(o.eventDate),
      deliveryType: o.deliveryType,
      total: money(o.totalAmount),
      paid: money(o.amountPaid),
      balance: money(o.balanceDue),
      status: o.status,
    }))
    return NextResponse.json({
      title: 'Order Info List',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'address', label: 'Event Address' },
        { key: 'eventDate', label: 'Event Date' },
        { key: 'deliveryType', label: 'Delivery Type' },
        { key: 'total', label: 'Total' },
        { key: 'paid', label: 'Paid' },
        { key: 'balance', label: 'Balance' },
        { key: 'status', label: 'Status' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('Tip Report')) {
    const orders = await prisma.order.findMany({
      where: { tipAmount: { gt: 0 } },
      include: { customer: true },
      orderBy: { eventDate: 'desc' },
    })
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      customer: customerName(o.customer),
      eventDate: dayLabel(o.eventDate),
      tip: money(o.tipAmount),
    }))
    return NextResponse.json({
      title: 'Tip Report',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'eventDate', label: 'Event Date' },
        { key: 'tip', label: 'Tip' },
      ],
      rows,
      summary: [{ label: 'Total Tips', value: money(orders.reduce((s, o) => s + o.tipAmount, 0)) }],
    })
  }

  if (slug === slugify('Event Date Tip Report')) {
    const orders = await prisma.order.findMany({
      where: { tipAmount: { gt: 0 } },
      select: { eventDate: true, tipAmount: true },
    })
    const byDay: any = {}
    for (const o of orders) {
      const key = dayLabel(o.eventDate)
      if (!byDay[key]) byDay[key] = 0
      byDay[key] += o.tipAmount
    }
    const rows = Object.keys(byDay).map((date) => ({ date, tips: money(byDay[date]) }))
    return NextResponse.json({
      title: 'Event Date Tip Report',
      columns: [
        { key: 'date', label: 'Event Date' },
        { key: 'tips', label: 'Total Tips' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('Receivables')) {
    const orders = await prisma.order.findMany({
      where: { balanceDue: { gt: 0 }, status: { not: 'canceled' } },
      include: { customer: true },
      orderBy: { eventDate: 'asc' },
    })
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      customer: customerName(o.customer),
      eventDate: dayLabel(o.eventDate),
      total: money(o.totalAmount),
      paid: money(o.amountPaid),
      balance: money(o.balanceDue),
    }))
    return NextResponse.json({
      title: 'Receivables',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'eventDate', label: 'Event Date' },
        { key: 'total', label: 'Total' },
        { key: 'paid', label: 'Paid' },
        { key: 'balance', label: 'Balance' },
      ],
      rows,
      summary: [{ label: 'Total Outstanding', value: money(orders.reduce((s, o) => s + o.balanceDue, 0)) }],
    })
  }

  if (slug === slugify('Coupon Report')) {
    const orders = await prisma.order.findMany({
      where: { couponCode: { not: null } },
      select: { couponCode: true, couponDiscount: true },
    })
    const byCoupon: any = {}
    for (const o of orders) {
      const key = o.couponCode || 'Unknown'
      if (!byCoupon[key]) byCoupon[key] = { uses: 0, discount: 0 }
      byCoupon[key].uses++
      byCoupon[key].discount += o.couponDiscount
    }
    const rows = Object.keys(byCoupon).map((code) => ({ code, uses: byCoupon[code].uses, discount: money(byCoupon[code].discount) }))
    return NextResponse.json({
      title: 'Coupon Report',
      columns: [
        { key: 'code', label: 'Coupon Code' },
        { key: 'uses', label: 'Uses' },
        { key: 'discount', label: 'Total Discount' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('Customer List Report')) {
    const customers = await prisma.customer.findMany({
      include: { orders: true },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    const rows = customers.map((c) => ({
      name: customerName(c),
      email: c.email,
      phone: c.phone || '',
      city: c.city || '',
      orders: c.orders.length,
    }))
    return NextResponse.json({
      title: 'Customer List Report',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'city', label: 'City' },
        { key: 'orders', label: '# Orders' },
      ],
      rows,
      summary: [{ label: 'Total Customers', value: customers.length }],
    })
  }

  if (slug === slugify('Customer Sales')) {
    const customers = await prisma.customer.findMany({
      include: { orders: true },
    })
    const rows = customers
      .map((c) => ({
        name: customerName(c),
        email: c.email,
        orders: c.orders.filter((o) => o.status !== 'canceled').length,
        revenue: money(c.orders.filter((o) => o.status !== 'canceled').reduce((s, o) => s + o.totalAmount, 0)),
      }))
      .filter((r) => r.orders > 0)
      .sort((a, b) => b.revenue - a.revenue)
    return NextResponse.json({
      title: 'Customer Sales',
      columns: [
        { key: 'name', label: 'Customer' },
        { key: 'email', label: 'Email' },
        { key: 'orders', label: 'Orders' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('Customer Sales Filtered')) {
    const { start, end } = getRange(request)
    const orders = await prisma.order.findMany({
      where: { eventDate: { gte: start, lte: end }, status: { not: 'canceled' } },
      include: { customer: true },
    })
    const byCustomer: any = {}
    for (const o of orders) {
      const key = o.customerId
      if (!byCustomer[key]) byCustomer[key] = { name: customerName(o.customer), orders: 0, revenue: 0 }
      byCustomer[key].orders++
      byCustomer[key].revenue += o.totalAmount
    }
    const rows: any[] = Object.values(byCustomer)
    const sortedRows = rows.map((v: any) => ({ name: v.name, orders: v.orders, revenue: money(v.revenue) })).sort((a, b) => b.revenue - a.revenue)
    return NextResponse.json({
      title: 'Customer Sales Filtered',
      columns: [
        { key: 'name', label: 'Customer' },
        { key: 'orders', label: 'Orders' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows: sortedRows,
      summary: [{ label: 'Date Range', value: dayLabel(start) + ' - ' + dayLabel(end) }],
    })
  }

  if (slug === slugify('Customer Payments Filtered')) {
    const { start, end } = getRange(request)
    const payments = await prisma.payment.findMany({
      where: { createdAt: { gte: start, lte: end } },
      include: { order: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const rows = payments.map((p) => ({
      date: dayLabel(p.createdAt),
      customer: customerName(p.order ? p.order.customer : null),
      orderNumber: p.order ? p.order.orderNumber : '',
      amount: money(p.amount),
      method: p.method,
    }))
    return NextResponse.json({
      title: 'Customer Payments Filtered',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'customer', label: 'Customer' },
        { key: 'orderNumber', label: 'Order #' },
        { key: 'amount', label: 'Amount' },
        { key: 'method', label: 'Method' },
      ],
      rows,
      summary: [{ label: 'Total', value: money(payments.reduce((s, p) => s + p.amount, 0)) }],
    })
  }

  if (slug === slugify('Customer Email List Report')) {
    const customers = await prisma.customer.findMany({
      where: { email: { not: '' } },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })
    const rows = customers.map((c) => ({ name: customerName(c), email: c.email }))
    return NextResponse.json({
      title: 'Customer Email List Report',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
      ],
      rows,
      summary: [{ label: 'Total Emails', value: customers.length }],
    })
  }

  if (slug === slugify('Customer Info List')) {
    const customers = await prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    const rows = customers.map((c) => ({
      name: customerName(c),
      email: c.email,
      phone: c.phone || '',
      address: [c.address, c.city, c.state, c.zip].filter(Boolean).join(', '),
      notes: c.notes || '',
    }))
    return NextResponse.json({
      title: 'Customer Info List',
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'address', label: 'Address' },
        { key: 'notes', label: 'Notes' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('All Quotes and Incomplete Orders')) {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['quote', 'incomplete'] } },
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
    })
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      customer: customerName(o.customer),
      eventDate: dayLabel(o.eventDate),
      createdAt: dayLabel(o.createdAt),
      status: o.status,
      total: money(o.totalAmount),
    }))
    return NextResponse.json({
      title: 'All Quotes and Incomplete Orders',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'eventDate', label: 'Event Date' },
        { key: 'createdAt', label: 'Created' },
        { key: 'status', label: 'Status' },
        { key: 'total', label: 'Total' },
      ],
      rows,
      summary: [{ label: 'Total', value: orders.length }],
    })
  }

  if (slug === slugify('Signed Contract Orders')) {
    const orders = await prisma.order.findMany({
      where: { contractSignedAt: { not: null } },
      include: { customer: true },
      orderBy: { contractSignedAt: 'desc' },
    })
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      customer: customerName(o.customer),
      signedAt: o.contractSignedAt ? dayLabel(o.contractSignedAt) : '',
      signatureName: o.contractSignatureName || '',
    }))
    return NextResponse.json({
      title: 'Signed Contract Orders',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'signedAt', label: 'Signed At' },
        { key: 'signatureName', label: 'Signature Name' },
      ],
      rows,
      summary: [{ label: 'Total Signed', value: orders.length }],
    })
  }

  if (slug === slugify('Unsigned Contract Orders')) {
    const orders = await prisma.order.findMany({
      where: { contractSignedAt: null, status: { not: 'canceled' } },
      include: { customer: true },
      orderBy: { eventDate: 'asc' },
    })
    const rows = orders.map((o) => ({
      orderNumber: o.orderNumber,
      customer: customerName(o.customer),
      eventDate: dayLabel(o.eventDate),
      status: o.status,
    }))
    return NextResponse.json({
      title: 'Unsigned Contract Orders',
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'eventDate', label: 'Event Date' },
        { key: 'status', label: 'Status' },
      ],
      rows,
      summary: [{ label: 'Total Unsigned', value: orders.length }],
    })
  }

  if (slug === slugify('Incomplete Orders Created')) {
    const orders = await prisma.order.findMany({
      where: { status: { in: ['quote', 'incomplete'] } },
      select: { createdAt: true },
    })
    const byDay: any = {}
    for (const o of orders) {
      const key = dayLabel(o.createdAt)
      if (!byDay[key]) byDay[key] = 0
      byDay[key]++
    }
    const rows = Object.keys(byDay).map((date) => ({ date, count: byDay[date] }))
    return NextResponse.json({
      title: 'Incomplete Orders Created',
      columns: [
        { key: 'date', label: 'Date Created' },
        { key: 'count', label: 'Count' },
      ],
      rows,
      summary: [{ label: 'Total', value: orders.length }],
    })
  }

  if (slug === slugify('Sales By Category')) {
    const orderItems = await prisma.orderItem.findMany({
      select: { quantity: true, total: true, order: { select: { status: true } }, item: { select: { category: { select: { name: true } } } } },
    })
    const byCategory: any = {}
    for (const oi of orderItems) {
      if (oi.order.status === 'canceled') continue
      const key = oi.item && oi.item.category ? oi.item.category.name : 'Uncategorized'
      if (!byCategory[key]) byCategory[key] = { quantity: 0, revenue: 0 }
      byCategory[key].quantity += oi.quantity
      byCategory[key].revenue += oi.total
    }
    const rows = Object.keys(byCategory).map((category) => ({ category, quantity: byCategory[category].quantity, revenue: money(byCategory[category].revenue) })).sort((a, b) => b.revenue - a.revenue)
    return NextResponse.json({
      title: 'Sales By Category',
      columns: [
        { key: 'category', label: 'Category' },
        { key: 'quantity', label: 'Qty Sold' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('Sales By Item')) {
    const orderItems = await prisma.orderItem.findMany({
      include: { order: true },
    })
    const byItem: any = {}
    for (const oi of orderItems) {
      if (oi.order.status === 'canceled') continue
      const key = oi.itemName
      if (!byItem[key]) byItem[key] = { quantity: 0, revenue: 0 }
      byItem[key].quantity += oi.quantity
      byItem[key].revenue += oi.total
    }
    const rows = Object.keys(byItem).map((item) => ({ item, quantity: byItem[item].quantity, revenue: money(byItem[item].revenue) })).sort((a, b) => b.revenue - a.revenue)
    return NextResponse.json({
      title: 'Sales By Item',
      columns: [
        { key: 'item', label: 'Item' },
        { key: 'quantity', label: 'Qty Sold' },
        { key: 'revenue', label: 'Revenue' },
      ],
      rows,
      summary: [],
    })
  }

  if (slug === slugify('All Items')) {
    const items = await prisma.item.findMany({
      select: { name: true, cost: true, quantity: true, displayToCustomer: true, category: { select: { name: true } } },
      orderBy: { name: 'asc' },
    })
    const rows = items.map((i) => ({
      name: i.name,
      category: i.category ? i.category.name : '',
      cost: money(i.cost),
      quantity: i.quantity,
      active: i.displayToCustomer ? 'Yes' : 'No',
    }))
    return NextResponse.json({
      title: 'All Items',
      columns: [
        { key: 'name', label: 'Item Name' },
        { key: 'category', label: 'Category' },
        { key: 'cost', label: 'Price' },
        { key: 'quantity', label: 'Qty in Stock' },
        { key: 'active', label: 'Active' },
      ],
      rows,
      summary: [{ label: 'Total Items', value: items.length }],
    })
  }

  if (slug === slugify('Product Status Report')) {
    const items = await prisma.item.findMany({
      select: { name: true, quantity: true, displayToCustomer: true, category: { select: { name: true } } },
      orderBy: { quantity: 'asc' },
    })
    const rows = items.map((i) => ({
      name: i.name,
      category: i.category ? i.category.name : '',
      quantity: i.quantity,
      status: i.quantity === 0 ? 'Out of Stock' : i.quantity <= 2 ? 'Low Stock' : 'In Stock',
      active: i.displayToCustomer ? 'Active' : 'Hidden',
    }))
    return NextResponse.json({
      title: 'Product Status Report',
      columns: [
        { key: 'name', label: 'Item Name' },
        { key: 'category', label: 'Category' },
        { key: 'quantity', label: 'Qty' },
        { key: 'status', label: 'Stock Status' },
        { key: 'active', label: 'Active' },
      ],
      rows,
      summary: [],
    })
  }

        if (slug === slugify('Product Attention List')) {
              const items = await prisma.item.findMany({
                select: { name: true, status: true, attentionNotes: true, lastInspectedAt: true, category: { select: { name: true } } },
                      orderBy: { updatedAt: 'desc' },
              })
              const flagged = items.filter((i: any) => (i.status && i.status !== 'Available') || (i.attentionNotes && i.attentionNotes.trim().length > 0))
              const rows = flagged.map((i: any) => ({
                      name: i.name,
                      category: i.category ? i.category.name : 'Uncategorized',
                      status: i.status || 'Available',
                      notes: i.attentionNotes || '',
                      lastInspected: i.lastInspectedAt ? dayLabel(new Date(i.lastInspectedAt)) : 'Never',
              }))
              return NextResponse.json({
                      title: 'Product Attention List',
                      columns: [
                        { key: 'name', label: 'Item Name' },
                        { key: 'category', label: 'Category' },
                        { key: 'status', label: 'Status' },
                        { key: 'notes', label: 'Attention Notes' },
                        { key: 'lastInspected', label: 'Last Inspected' },
                              ],
                      rows,
                      summary: [{ label: 'Items Needing Attention', value: rows.length }],
              })
        }

  if (slug === slugify('Payments')) {
const payments = await prisma.payment.findMany({
include: { order: { include: { customer: true } } },
orderBy: { createdAt: 'desc' },
take: 500,
})
const rows = payments.map((p) => ({
date: dayLabel(p.createdAt),
orderNumber: p.order ? p.order.orderNumber : '',
customer: customerName(p.order ? p.order.customer : null),
amount: money(p.amount),
method: p.method,
}))
return NextResponse.json({
title: 'Payments',
columns: [
{ key: 'date', label: 'Date' },
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'amount', label: 'Amount' },
{ key: 'method', label: 'Method' },
],
rows,
summary: [{ label: 'Total Payments', value: money(payments.reduce((s, p) => s + p.amount, 0)) }],
})
}

if (slug === slugify('Manage Payments')) {
const payments = await prisma.payment.findMany({
include: { order: { include: { customer: true } } },
orderBy: { createdAt: 'desc' },
take: 500,
})
const rows = payments.map((p) => ({
date: dayLabel(p.createdAt),
orderNumber: p.order ? p.order.orderNumber : '',
customer: customerName(p.order ? p.order.customer : null),
amount: money(p.amount),
method: p.method,
source: p.stripePaymentId ? 'Online (Stripe)' : 'Manual',
notes: p.notes || '',
}))
return NextResponse.json({
title: 'Manage Payments',
columns: [
{ key: 'date', label: 'Date' },
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'amount', label: 'Amount' },
{ key: 'method', label: 'Method' },
{ key: 'source', label: 'Source' },
{ key: 'notes', label: 'Notes' },
],
rows,
summary: [{ label: 'Total', value: money(payments.reduce((s, p) => s + p.amount, 0)) }],
})
}

if (slug === slugify('Manage Payments by Activation Date')) {
const { start, end } = getRange(request)
const payments = await prisma.payment.findMany({
where: { createdAt: { gte: start, lte: end } },
include: { order: { include: { customer: true } } },
orderBy: { createdAt: 'desc' },
})
const rows = payments.map((p) => ({
date: dayLabel(p.createdAt),
orderNumber: p.order ? p.order.orderNumber : '',
customer: customerName(p.order ? p.order.customer : null),
amount: money(p.amount),
method: p.method,
}))
return NextResponse.json({
title: 'Manage Payments by Activation Date',
columns: [
{ key: 'date', label: 'Date' },
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'amount', label: 'Amount' },
{ key: 'method', label: 'Method' },
],
rows,
summary: [{ label: 'Date Range', value: dayLabel(start) + ' - ' + dayLabel(end) }, { label: 'Total', value: money(payments.reduce((s, p) => s + p.amount, 0)) }],
})
}

if (slug === slugify('Open Accounts')) {
const orders = await prisma.order.findMany({
where: { balanceDue: { gt: 0 }, status: { not: 'canceled' } },
include: { customer: true },
orderBy: { balanceDue: 'desc' },
})
const rows = orders.map((o) => ({
orderNumber: o.orderNumber,
customer: customerName(o.customer),
email: o.customer ? o.customer.email : '',
eventDate: dayLabel(o.eventDate),
total: money(o.totalAmount),
balance: money(o.balanceDue),
}))
return NextResponse.json({
title: 'Open Accounts',
columns: [
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'email', label: 'Email' },
{ key: 'eventDate', label: 'Event Date' },
{ key: 'total', label: 'Total' },
{ key: 'balance', label: 'Balance' },
],
rows,
summary: [{ label: 'Open Accounts', value: orders.length }, { label: 'Total Outstanding', value: money(orders.reduce((s, o) => s + o.balanceDue, 0)) }],
})
}

if (slug === slugify('Balance Summary')) {
const orders = await prisma.order.findMany({
where: { status: { not: 'canceled' } },
select: { status: true, balanceDue: true },
})
const byStatus: any = {}
for (const o of orders) {
const key = o.status
if (!byStatus[key]) byStatus[key] = { count: 0, balance: 0 }
if (o.balanceDue > 0) {
byStatus[key].count++
byStatus[key].balance += o.balanceDue
}
}
const rows = Object.keys(byStatus).map((status) => ({ status, ordersOwing: byStatus[status].count, balance: money(byStatus[status].balance) }))
const totalBalance = orders.reduce((s, o) => s + o.balanceDue, 0)
return NextResponse.json({
title: 'Balance Summary',
columns: [
{ key: 'status', label: 'Order Status' },
{ key: 'ordersOwing', label: 'Orders Owing' },
{ key: 'balance', label: 'Balance' },
],
rows,
summary: [{ label: 'Total Outstanding Balance', value: money(totalBalance) }],
})
}

if (slug === slugify('Credits and Rainchecks')) {
const rainchecks = await prisma.raincheck.findMany({
include: { customer: true },
orderBy: { issuedAt: 'desc' },
})
const rows = rainchecks.map((r) => ({
customer: customerName(r.customer),
amount: money(r.amount),
reason: r.reason || '',
issuedAt: dayLabel(r.issuedAt),
expiresAt: r.expiresAt ? dayLabel(r.expiresAt) : '',
redeemedAt: r.redeemedAt ? dayLabel(r.redeemedAt) : 'Not Redeemed',
}))
return NextResponse.json({
title: 'Credits and Rainchecks',
columns: [
{ key: 'customer', label: 'Customer' },
{ key: 'amount', label: 'Amount' },
{ key: 'reason', label: 'Reason' },
{ key: 'issuedAt', label: 'Issued' },
{ key: 'expiresAt', label: 'Expires' },
{ key: 'redeemedAt', label: 'Redeemed' },
],
rows,
summary: [{ label: 'Total Outstanding Credit', value: money(rainchecks.filter((r) => !r.redeemedAt).reduce((s, r) => s + r.amount, 0)) }],
})
}

if (slug === slugify('Setup Surfaces')) {
const surfaces = await prisma.setupSurface.findMany({ orderBy: { sortOrder: 'asc' } })
const rows = surfaces.map((s) => ({ name: s.name, active: s.isActive ? 'Yes' : 'No' }))
return NextResponse.json({
title: 'Setup Surfaces',
columns: [
{ key: 'name', label: 'Surface Name' },
{ key: 'active', label: 'Active' },
],
rows,
summary: [{ label: 'Total Surfaces', value: surfaces.length }],
})
}

if (slug === slugify('Pennsylvania Report')) {
const orders = await prisma.order.findMany({
where: { eventState: 'PA', status: { not: 'canceled' } },
include: { customer: true },
orderBy: { eventDate: 'desc' },
})
const rows = orders.map((o) => ({
orderNumber: o.orderNumber,
customer: customerName(o.customer),
city: o.eventCity || '',
eventDate: dayLabel(o.eventDate),
total: money(o.totalAmount),
}))
return NextResponse.json({
title: 'Pennsylvania Report',
columns: [
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'city', label: 'City' },
{ key: 'eventDate', label: 'Event Date' },
{ key: 'total', label: 'Total' },
],
rows,
summary: [{ label: 'Total Orders', value: orders.length }],
})
}

if (slug === slugify('Payments List With Adjustments And Notes')) {
const payments = await prisma.payment.findMany({
include: { order: { include: { customer: true } } },
orderBy: { createdAt: 'desc' },
take: 500,
})
const adjustments = await prisma.adjustment.findMany({ where: { isActive: true } })
const rows = payments.map((p) => ({
date: dayLabel(p.createdAt),
orderNumber: p.order ? p.order.orderNumber : '',
customer: customerName(p.order ? p.order.customer : null),
amount: money(p.amount),
notes: p.notes || '',
}))
return NextResponse.json({
title: 'Payments List With Adjustments And Notes',
columns: [
{ key: 'date', label: 'Date' },
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'amount', label: 'Amount' },
{ key: 'notes', label: 'Notes' },
],
rows,
summary: [{ label: 'Active Adjustment Definitions', value: adjustments.length }, { label: 'Note', value: 'Adjustments are not linked to individual payments in this system; shown for reference only.' }],
})
}

if (slug === slugify('Flagged Payments')) {
const payments = await prisma.payment.findMany({
where: { notes: { not: null } },
include: { order: { include: { customer: true } } },
orderBy: { createdAt: 'desc' },
})
const flagged = payments.filter((p) => p.notes && p.notes.trim().length > 0)
const rows = flagged.map((p) => ({
date: dayLabel(p.createdAt),
orderNumber: p.order ? p.order.orderNumber : '',
customer: customerName(p.order ? p.order.customer : null),
amount: money(p.amount),
notes: p.notes || '',
}))
return NextResponse.json({
title: 'Flagged Payments',
columns: [
{ key: 'date', label: 'Date' },
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'amount', label: 'Amount' },
{ key: 'notes', label: 'Notes (flag heuristic: has notes)' },
],
rows,
summary: [{ label: 'Flagged Payments', value: rows.length }],
})
}

if (slug === slugify('Adjustments Created')) {
const adjustments = await prisma.adjustment.findMany({
orderBy: { createdAt: 'desc' },
})
const rows = adjustments.map((a) => ({
name: a.name,
type: a.type,
value: a.value,
appliesTo: a.appliesTo,
active: a.isActive ? 'Yes' : 'No',
createdAt: dayLabel(a.createdAt),
}))
return NextResponse.json({
title: 'Adjustments Created',
columns: [
{ key: 'name', label: 'Adjustment Name' },
{ key: 'type', label: 'Type' },
{ key: 'value', label: 'Value' },
{ key: 'appliesTo', label: 'Applies To' },
{ key: 'active', label: 'Active' },
{ key: 'createdAt', label: 'Created' },
],
rows,
summary: [{ label: 'Total Adjustment Definitions', value: adjustments.length }, { label: 'Note', value: 'Adjustments are not linked to individual orders in this system; this lists adjustment definitions only.' }],
})
}

if (slug === slugify('Accrual Tax Report')) {
const { start, end } = getRange(request)
const orders = await prisma.order.findMany({
where: { eventDate: { gte: start, lte: end }, status: { not: 'canceled' } },
select: { eventDate: true, taxAmount: true, totalAmount: true },
})
const byMonth: any = {}
for (const o of orders) {
const key = monthLabel(o.eventDate)
if (!byMonth[key]) byMonth[key] = { orders: 0, tax: 0 }
byMonth[key].orders++
byMonth[key].tax += o.taxAmount
}
const rows = Object.keys(byMonth).map((month) => ({ month, orders: byMonth[month].orders, taxAccrued: money(byMonth[month].tax) }))
return NextResponse.json({
title: 'Accrual Tax Report',
columns: [
{ key: 'month', label: 'Month' },
{ key: 'orders', label: 'Orders' },
{ key: 'taxAccrued', label: 'Tax Accrued (by event date)' },
],
rows,
summary: [{ label: 'Total Tax Accrued', value: money(orders.reduce((s, o) => s + o.taxAmount, 0)) }],
})
}

if (slug === slugify('Payments by City')) {
const payments = await prisma.payment.findMany({
include: { order: true },
})
const byCity: any = {}
for (const p of payments) {
const key = (p.order && p.order.eventCity) || 'Unknown'
if (!byCity[key]) byCity[key] = { count: 0, amount: 0 }
byCity[key].count++
byCity[key].amount += p.amount
}
const rows = Object.keys(byCity).map((city) => ({ city, payments: byCity[city].count, amount: money(byCity[city].amount) })).sort((a, b) => b.amount - a.amount)
return NextResponse.json({
title: 'Payments by City',
columns: [
{ key: 'city', label: 'City' },
{ key: 'payments', label: '# Payments' },
{ key: 'amount', label: 'Total Amount' },
],
rows,
summary: [],
})
}

if (slug === slugify('Payment Breakdown List')) {
const payments = await prisma.payment.findMany({
include: { order: { include: { customer: true } } },
orderBy: { createdAt: 'desc' },
take: 500,
})
const byMethod: any = {}
for (const p of payments) {
const key = p.method
if (!byMethod[key]) byMethod[key] = { count: 0, amount: 0 }
byMethod[key].count++
byMethod[key].amount += p.amount
}
const rows = Object.keys(byMethod).map((method) => ({ method, count: byMethod[method].count, amount: money(byMethod[method].amount) })).sort((a, b) => b.amount - a.amount)
return NextResponse.json({
title: 'Payment Breakdown List',
columns: [
{ key: 'method', label: 'Method' },
{ key: 'count', label: '# Payments' },
{ key: 'amount', label: 'Total Amount' },
],
rows,
summary: [{ label: 'Total Payments', value: payments.length }, { label: 'Total Amount', value: money(payments.reduce((s, p) => s + p.amount, 0)) }],
})
}

if (slug === slugify('Refunded Payment List')) {
const payments = await prisma.payment.findMany({
where: { amount: { lt: 0 } },
include: { order: { include: { customer: true } } },
orderBy: { createdAt: 'desc' },
})
const rows = payments.map((p) => ({
date: dayLabel(p.createdAt),
orderNumber: p.order ? p.order.orderNumber : '',
customer: customerName(p.order ? p.order.customer : null),
amount: money(p.amount),
notes: p.notes || '',
}))
return NextResponse.json({
title: 'Refunded Payment List',
columns: [
{ key: 'date', label: 'Date' },
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'amount', label: 'Amount' },
{ key: 'notes', label: 'Notes' },
],
rows,
summary: [{ label: 'Total Refunded', value: money(payments.reduce((s, p) => s + p.amount, 0)) }, { label: 'Note', value: 'Heuristic: refunds are identified as payments recorded with a negative amount. There is no dedicated refund flag in this system.' }],
})
}

  if (slug === slugify('Voided Payment List')) {
    const payments = await prisma.payment.findMany({
      where: { status: 'failed' },
      include: { order: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const rows = payments.map((p) => ({
      date: dayLabel(p.createdAt),
      orderNumber: p.order ? p.order.orderNumber : '',
      customer: customerName(p.order ? p.order.customer : null),
      amount: money(p.amount),
      notes: p.notes || '',
    }))
    return NextResponse.json({
      title: 'Voided Payment List',
      columns: [
        { key: 'date', label: 'Date' },
        { key: 'orderNumber', label: 'Order #' },
        { key: 'customer', label: 'Customer' },
        { key: 'amount', label: 'Amount' },
        { key: 'notes', label: 'Notes' },
        ],
      rows,
      summary: [{ label: 'Total Voided', value: money(payments.reduce((s, p) => s + p.amount, 0)) }, { label: 'Note', value: 'Heuristic: voided payments are identified as failed Stripe payment attempts (status = failed). There is no separate void flag in this system.' }],
    })
  }

  if (slug === slugify('Payments by Employee')) {
    const payments = await prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
    const byEmployee: any = {}
    for (const p of payments) {
      const key = p.recordedByName || (p.stripePaymentId ? 'Online (Customer Pay Link)' : ((p.notes || '').includes('Imported from ERS') ? 'Imported from ERS (Unknown)' : 'Unknown'))
      if (!byEmployee[key]) byEmployee[key] = { count: 0, amount: 0 }
      byEmployee[key].count++
      byEmployee[key].amount += p.amount
    }
    const rows = Object.keys(byEmployee).map((employee) => ({ employee, count: byEmployee[employee].count, amount: money(byEmployee[employee].amount) })).sort((a, b) => b.amount - a.amount)
    return NextResponse.json({
      title: 'Payments By Employee',
      columns: [
        { key: 'employee', label: 'Employee' },
        { key: 'count', label: '# Payments' },
        { key: 'amount', label: 'Total Amount' },
        ],
      rows,
      summary: [{ label: 'Total Payments', value: payments.length }, { label: 'Note', value: 'Only manual payments recorded by staff since this update are attributed to a named employee. Online pay-link and legacy imported payments are grouped separately since no per-employee data exists for them.' }],
    })
  }

if (slug === slugify('Invoice Accrual Report')) {
const { start, end } = getRange(request)
const orders = await prisma.order.findMany({
where: { eventDate: { gte: start, lte: end }, status: { not: 'canceled' } },
include: { customer: true },
orderBy: { eventDate: 'asc' },
})
const rows = orders.map((o) => ({
orderNumber: o.orderNumber,
customer: customerName(o.customer),
eventDate: dayLabel(o.eventDate),
invoiced: money(o.totalAmount),
collected: money(o.amountPaid),
accrued: money(o.totalAmount - o.amountPaid),
}))
return NextResponse.json({
title: 'Invoice Accrual Report',
columns: [
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'eventDate', label: 'Event Date' },
{ key: 'invoiced', label: 'Invoiced' },
{ key: 'collected', label: 'Collected' },
{ key: 'accrued', label: 'Accrued (Uncollected)' },
],
rows,
summary: [{ label: 'Total Invoiced', value: money(orders.reduce((s, o) => s + o.totalAmount, 0)) }, { label: 'Total Accrued', value: money(orders.reduce((s, o) => s + (o.totalAmount - o.amountPaid), 0)) }],
})
}

if (slug === slugify('Surveys')) {
const surveys = await prisma.setupSurvey.findMany({
orderBy: { createdAt: 'desc' },
})
const rows = surveys.map((s) => ({
name: s.name,
active: s.isActive ? 'Yes' : 'No',
createdAt: dayLabel(s.createdAt),
}))
return NextResponse.json({
title: 'Surveys',
columns: [
{ key: 'name', label: 'Survey Name' },
{ key: 'active', label: 'Active' },
{ key: 'createdAt', label: 'Created' },
],
rows,
summary: [{ label: 'Total Surveys', value: surveys.length }],
})
}

if (slug === slugify('Messages Sent')) {
const messages = await prisma.ersMailMessage.findMany({
orderBy: { sentAt: 'desc' },
take: 500,
})
const rows = messages.map((m) => ({
sentAt: dayLabel(m.sentAt),
to: m.toAddress,
from: m.fromAddress || '',
subject: m.subject,
status: m.status,
}))
return NextResponse.json({
title: 'Messages Sent',
columns: [
{ key: 'sentAt', label: 'Sent' },
{ key: 'to', label: 'To' },
{ key: 'from', label: 'From' },
{ key: 'subject', label: 'Subject' },
{ key: 'status', label: 'Status' },
],
rows,
summary: [{ label: 'Total Messages', value: messages.length }],
})
}

if (slug === slugify('Template Messages')) {
const [orderTemplates, marketingTemplates, textTemplates] = await Promise.all([
prisma.emailTemplateOrder.findMany({ orderBy: { name: 'asc' } }),
prisma.emailTemplateMarketing.findMany({ orderBy: { name: 'asc' } }),
prisma.textMessageTemplate.findMany({ orderBy: { name: 'asc' } }),
])
const rows = [
...orderTemplates.map((t) => ({ name: t.name, type: 'Email (Order)', subject: t.subject, active: t.isActive ? 'Yes' : 'No' })),
...marketingTemplates.map((t) => ({ name: t.name, type: 'Email (Marketing)', subject: t.subject, active: t.isActive ? 'Yes' : 'No' })),
...textTemplates.map((t) => ({ name: t.name, type: 'Text Message', subject: '', active: t.isActive ? 'Yes' : 'No' })),
]
return NextResponse.json({
title: 'Template Messages',
columns: [
{ key: 'name', label: 'Template Name' },
{ key: 'type', label: 'Type' },
{ key: 'subject', label: 'Subject' },
{ key: 'active', label: 'Active' },
],
rows,
summary: [{ label: 'Total Templates', value: rows.length }],
})
}

if (slug === slugify('Customers Lapsed Report')) {
const customers = await prisma.customer.findMany({
include: { orders: true },
})
const cutoff = new Date()
cutoff.setMonth(cutoff.getMonth() - 12)
const lapsed = customers
.map((c) => {
const nonCanceled = c.orders.filter((o) => o.status !== 'canceled')
if (nonCanceled.length === 0) return null
const mostRecent = nonCanceled.reduce((latest, o) => (o.eventDate > latest.eventDate ? o : latest), nonCanceled[0])
if (mostRecent.eventDate > cutoff) return null
return { name: customerName(c), email: c.email, lastOrderDate: dayLabel(mostRecent.eventDate), totalOrders: nonCanceled.length }
})
.filter((r) => r !== null)
.sort((a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime())
return NextResponse.json({
title: 'Customers Lapsed Report',
columns: [
{ key: 'name', label: 'Customer' },
{ key: 'email', label: 'Email' },
{ key: 'lastOrderDate', label: 'Last Order Date' },
{ key: 'totalOrders', label: 'Total Orders' },
],
rows: lapsed,
summary: [{ label: 'Lapsed Customers (no order in 12+ months)', value: lapsed.length }],
})
}

if (slug === slugify('Digital Signature and Waiver List')) {
const orders = await prisma.order.findMany({
where: { contractSignedAt: { not: null } },
include: { customer: true },
orderBy: { contractSignedAt: 'desc' },
})
const rows = orders.map((o) => ({
orderNumber: o.orderNumber,
customer: customerName(o.customer),
signedAt: o.contractSignedAt ? dayLabel(o.contractSignedAt) : '',
signatureName: o.contractSignatureName || '',
signatureIp: o.contractSignatureIp || '',
damageWaiver: o.damageWaiver ? 'Accepted' : 'Declined',
damageWaiverFee: money(o.damageWaiverFee),
}))
return NextResponse.json({
title: 'Digital Signature and Waiver List',
columns: [
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'signedAt', label: 'Signed At' },
{ key: 'signatureName', label: 'Signature Name' },
{ key: 'signatureIp', label: 'Signature IP' },
{ key: 'damageWaiver', label: 'Damage Waiver' },
{ key: 'damageWaiverFee', label: 'Waiver Fee' },
],
rows,
summary: [{ label: 'Total Signed', value: orders.length }],
})
}

if (slug === slugify('Quotes Sent List')) {
const orders = await prisma.order.findMany({
where: { status: 'quote' },
include: { customer: true },
orderBy: { createdAt: 'desc' },
})
const rows = orders.map((o) => ({
orderNumber: o.orderNumber,
customer: customerName(o.customer),
createdAt: dayLabel(o.createdAt),
eventDate: dayLabel(o.eventDate),
total: money(o.totalAmount),
}))
return NextResponse.json({
title: 'Quotes Sent List',
columns: [
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'createdAt', label: 'Created' },
{ key: 'eventDate', label: 'Event Date' },
{ key: 'total', label: 'Total' },
],
rows,
summary: [{ label: 'Total Quotes', value: orders.length }],
})
}

if (slug === slugify('Abandoned Quotes Created')) {
const cutoff = new Date()
cutoff.setDate(cutoff.getDate() - 14)
const orders = await prisma.order.findMany({
where: { status: { in: ['quote', 'incomplete'] }, createdAt: { lt: cutoff } },
include: { customer: true },
orderBy: { createdAt: 'desc' },
})
const rows = orders.map((o) => ({
orderNumber: o.orderNumber,
customer: customerName(o.customer),
createdAt: dayLabel(o.createdAt),
status: o.status,
total: money(o.totalAmount),
}))
return NextResponse.json({
title: 'Abandoned Quotes Created',
columns: [
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'createdAt', label: 'Created' },
{ key: 'status', label: 'Status' },
{ key: 'total', label: 'Total' },
],
rows,
summary: [{ label: 'Abandoned (14+ days old, still quote/incomplete)', value: rows.length }],
})
}

if (slug === slugify('Lead Form Summary')) {
const messages = await prisma.contactMessage.findMany({
select: { createdAt: true, isRead: true },
})
const byMonth: any = {}
for (const m of messages) {
const key = monthLabel(m.createdAt)
if (!byMonth[key]) byMonth[key] = { total: 0, read: 0 }
byMonth[key].total++
if (m.isRead) byMonth[key].read++
}
const rows = Object.keys(byMonth).map((month) => ({ month, totalLeads: byMonth[month].total, read: byMonth[month].read, unread: byMonth[month].total - byMonth[month].read }))
return NextResponse.json({
title: 'Lead Form Summary',
columns: [
{ key: 'month', label: 'Month' },
{ key: 'totalLeads', label: 'Total Leads' },
{ key: 'read', label: 'Read' },
{ key: 'unread', label: 'Unread' },
],
rows,
summary: [{ label: 'Total Leads', value: messages.length }],
})
}

if (slug === slugify('Lead Form List')) {
const messages = await prisma.contactMessage.findMany({
orderBy: { createdAt: 'desc' },
take: 500,
})
const rows = messages.map((m) => ({
name: m.name,
email: m.email,
phone: m.phone || '',
eventDate: m.eventDate ? dayLabel(m.eventDate) : '',
message: m.message,
read: m.isRead ? 'Yes' : 'No',
createdAt: dayLabel(m.createdAt),
}))
return NextResponse.json({
title: 'Lead Form List',
columns: [
{ key: 'name', label: 'Name' },
{ key: 'email', label: 'Email' },
{ key: 'phone', label: 'Phone' },
{ key: 'eventDate', label: 'Event Date' },
{ key: 'message', label: 'Message' },
{ key: 'read', label: 'Read' },
{ key: 'createdAt', label: 'Submitted' },
],
rows,
summary: [{ label: 'Total Leads', value: messages.length }],
})
}

if (slug === slugify('Sales by Item by Customer')) {
const orderItems = await prisma.orderItem.findMany({
include: { order: { include: { customer: true } } },
})
    const key2 = (itemName: string, customerId: string) => itemName + '::' + customerId
const grouped: any = {}
for (const oi of orderItems) {
if (oi.order.status === 'canceled') continue
const k = key2(oi.itemName, oi.order.customerId)
if (!grouped[k]) grouped[k] = { item: oi.itemName, customer: customerName(oi.order.customer), quantity: 0, revenue: 0 }
grouped[k].quantity += oi.quantity
grouped[k].revenue += oi.total
}
const rows = Object.values(grouped).map((g: any) => ({ item: g.item, customer: g.customer, quantity: g.quantity, revenue: money(g.revenue) })).sort((a: any, b: any) => b.revenue - a.revenue)
return NextResponse.json({
title: 'Sales by Item by Customer',
columns: [
{ key: 'item', label: 'Item' },
{ key: 'customer', label: 'Customer' },
{ key: 'quantity', label: 'Qty Sold' },
{ key: 'revenue', label: 'Revenue' },
],
rows,
summary: [],
})
}

if (slug === slugify('Sales Items Inventory')) {
const items = await prisma.item.findMany({
    select: { name: true, quantity: true, category: { select: { name: true } }, orderItems: { select: { quantity: true, order: { select: { status: true } } } } },
orderBy: { name: 'asc' },
})
const rows = items.map((i: any) => {
const sold = i.orderItems.filter((oi: any) => oi.order.status !== 'canceled').reduce((s: number, oi: any) => s + oi.quantity, 0)
return {
name: i.name,
category: i.category ? i.category.name : '',
inStock: i.quantity,
totalSold: sold,
}
})
return NextResponse.json({
title: 'Sales Items Inventory',
columns: [
{ key: 'name', label: 'Item Name' },
{ key: 'category', label: 'Category' },
{ key: 'inStock', label: 'Qty In Stock' },
{ key: 'totalSold', label: 'Total Qty Sold (All Time)' },
],
rows,
summary: [{ label: 'Total Items', value: items.length }],
})
}

if (slug === slugify('Return on Investment (ROI)')) {
const extras = await prisma.itemExtra.findMany()
const items = await prisma.item.findMany({ select: { id: true, name: true, orderItems: { select: { quantity: true, total: true, order: { select: { status: true } } } } } })
const extraByItem: any = {}
for (const e of extras) extraByItem[e.itemId] = e
const rows = items
.filter((i: any) => extraByItem[i.id] && extraByItem[i.id].costOfGoods > 0)
.map((i: any) => {
const sold = i.orderItems.filter((oi: any) => oi.order.status !== 'canceled')
const quantity = sold.reduce((s: number, oi: any) => s + oi.quantity, 0)
const revenue = sold.reduce((s: number, oi: any) => s + oi.total, 0)
const cost = extraByItem[i.id].costOfGoods * quantity
const profit = revenue - cost
const roi = cost > 0 ? money((profit / cost) * 100) : 0
return { name: i.name, quantitySold: quantity, revenue: money(revenue), cost: money(cost), profit: money(profit), roiPercent: roi }
})
.sort((a: any, b: any) => b.roiPercent - a.roiPercent)
return NextResponse.json({
title: 'Return on Investment (ROI)',
columns: [
{ key: 'name', label: 'Item Name' },
{ key: 'quantitySold', label: 'Qty Sold' },
{ key: 'revenue', label: 'Revenue' },
{ key: 'cost', label: 'Cost of Goods' },
{ key: 'profit', label: 'Profit' },
{ key: 'roiPercent', label: 'ROI %' },
],
rows,
summary: [{ label: 'Note', value: 'Only items with a Cost of Goods value set are shown.' }],
})
}

if (slug === slugify('Return on Investment (ROI) by Date')) {
const { start, end } = getRange(request)
const extras = await prisma.itemExtra.findMany()
const items = await prisma.item.findMany({ select: { id: true, name: true, orderItems: { select: { quantity: true, total: true, order: { select: { status: true, eventDate: true } } } } } })
const extraByItem: any = {}
for (const e of extras) extraByItem[e.itemId] = e
const rows = items
.filter((i: any) => extraByItem[i.id] && extraByItem[i.id].costOfGoods > 0)
.map((i: any) => {
const sold = i.orderItems.filter((oi: any) => oi.order.status !== 'canceled' && oi.order.eventDate >= start && oi.order.eventDate <= end)
const quantity = sold.reduce((s: number, oi: any) => s + oi.quantity, 0)
const revenue = sold.reduce((s: number, oi: any) => s + oi.total, 0)
const cost = extraByItem[i.id].costOfGoods * quantity
const profit = revenue - cost
const roi = cost > 0 ? money((profit / cost) * 100) : 0
return { name: i.name, quantitySold: quantity, revenue: money(revenue), cost: money(cost), profit: money(profit), roiPercent: roi }
})
.filter((r: any) => r.quantitySold > 0)
.sort((a: any, b: any) => b.roiPercent - a.roiPercent)
return NextResponse.json({
title: 'Return on Investment (ROI) by Date',
columns: [
{ key: 'name', label: 'Item Name' },
{ key: 'quantitySold', label: 'Qty Sold' },
{ key: 'revenue', label: 'Revenue' },
{ key: 'cost', label: 'Cost of Goods' },
{ key: 'profit', label: 'Profit' },
{ key: 'roiPercent', label: 'ROI %' },
],
rows,
summary: [{ label: 'Date Range', value: dayLabel(start) + ' - ' + dayLabel(end) }],
})
}

if (slug === slugify('ROI Breakdown')) {
const extras = await prisma.itemExtra.findMany()
const items = await prisma.item.findMany({ select: { id: true, name: true, category: { select: { name: true } }, orderItems: { select: { quantity: true, total: true, order: { select: { status: true } } } } } })
const extraByItem: any = {}
for (const e of extras) extraByItem[e.itemId] = e
const rows: any[] = []
for (const i of items as any[]) {
const extra = extraByItem[i.id]
if (!extra || extra.costOfGoods <= 0) continue
const sold = i.orderItems.filter((oi: any) => oi.order.status !== 'canceled')
const quantity = sold.reduce((s: number, oi: any) => s + oi.quantity, 0)
const revenue = sold.reduce((s: number, oi: any) => s + oi.total, 0)
const costPerUnit = extra.costOfGoods
const totalCost = costPerUnit * quantity
rows.push({
name: i.name,
category: i.category ? i.category.name : '',
costPerUnit: money(costPerUnit),
quantitySold: quantity,
totalCost: money(totalCost),
revenue: money(revenue),
profit: money(revenue - totalCost),
})
}
rows.sort((a, b) => b.profit - a.profit)
return NextResponse.json({
title: 'ROI Breakdown',
columns: [
{ key: 'name', label: 'Item Name' },
{ key: 'category', label: 'Category' },
{ key: 'costPerUnit', label: 'Cost/Unit' },
{ key: 'quantitySold', label: 'Qty Sold' },
{ key: 'totalCost', label: 'Total Cost' },
{ key: 'revenue', label: 'Revenue' },
{ key: 'profit', label: 'Profit' },
],
rows,
summary: [{ label: 'Total Profit', value: money(rows.reduce((s, r) => s + r.profit, 0)) }],
})
}

if (slug === slugify('Inventory Usage Totals') || slug === slugify('Rental Inventory Usage Totals')) {
const orderItems = await prisma.orderItem.findMany({
include: { order: true },
})
const byItem: any = {}
for (const oi of orderItems) {
if (oi.order.status === 'canceled') continue
const key = oi.itemName
if (!byItem[key]) byItem[key] = { timesRented: 0, totalQuantity: 0 }
byItem[key].timesRented++
byItem[key].totalQuantity += oi.quantity
}
const rows = Object.keys(byItem).map((item) => ({ item, timesRented: byItem[item].timesRented, totalQuantity: byItem[item].totalQuantity })).sort((a, b) => b.totalQuantity - a.totalQuantity)
return NextResponse.json({
title: slug === slugify('Rental Inventory Usage Totals') ? 'Rental Inventory Usage Totals' : 'Inventory Usage Totals',
columns: [
{ key: 'item', label: 'Item' },
{ key: 'timesRented', label: '# Times Rented' },
{ key: 'totalQuantity', label: 'Total Qty Rented' },
],
rows,
summary: [],
})
}

if (slug === slugify('Inventory Usage List') || slug === slugify('Rental Inventory Usage List')) {
const orderItems = await prisma.orderItem.findMany({
include: { order: { include: { customer: true } } },
orderBy: { createdAt: 'desc' },
take: 500,
})
const rows = orderItems
.filter((oi) => oi.order.status !== 'canceled')
.map((oi) => ({
item: oi.itemName,
orderNumber: oi.order.orderNumber,
customer: customerName(oi.order.customer),
eventDate: dayLabel(oi.order.eventDate),
quantity: oi.quantity,
}))
return NextResponse.json({
title: slug === slugify('Rental Inventory Usage List') ? 'Rental Inventory Usage List' : 'Inventory Usage List',
columns: [
{ key: 'item', label: 'Item' },
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'eventDate', label: 'Event Date' },
{ key: 'quantity', label: 'Qty' },
],
rows,
summary: [{ label: 'Total Rows', value: rows.length }],
})
}

if (slug === slugify('Rental Inventory Currently Checked Out')) {
const now = new Date()
const orders = await prisma.order.findMany({
where: {
status: { not: 'canceled' },
eventDate: { lte: now },
OR: [{ eventEndDate: { gte: now } }, { eventEndDate: null, eventDate: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }],
},
include: { customer: true, items: true },
orderBy: { eventDate: 'asc' },
})
const rows: any[] = []
for (const o of orders) {
for (const oi of o.items) {
rows.push({
item: oi.itemName,
quantity: oi.quantity,
orderNumber: o.orderNumber,
customer: customerName(o.customer),
eventDate: dayLabel(o.eventDate),
expectedReturn: o.eventEndDate ? dayLabel(o.eventEndDate) : dayLabel(o.eventDate),
})
}
}
return NextResponse.json({
title: 'Rental Inventory Currently Checked Out',
columns: [
{ key: 'item', label: 'Item' },
{ key: 'quantity', label: 'Qty' },
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'eventDate', label: 'Event Date' },
{ key: 'expectedReturn', label: 'Expected Return' },
],
rows,
summary: [{ label: 'Note', value: 'Heuristic: based on event date/end date window relative to now. There is no explicit check-in/return status field in this system.' }],
})
}

if (slug === slugify('Rental Inventory Overdue')) {
const now = new Date()
const orders = await prisma.order.findMany({
where: {
status: { not: 'canceled' },
OR: [{ eventEndDate: { lt: now } }, { eventEndDate: null, eventDate: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } }],
},
include: { customer: true, items: true },
orderBy: { eventDate: 'desc' },
take: 200,
})
const rows: any[] = []
for (const o of orders) {
for (const oi of o.items) {
rows.push({
item: oi.itemName,
quantity: oi.quantity,
orderNumber: o.orderNumber,
customer: customerName(o.customer),
expectedReturn: o.eventEndDate ? dayLabel(o.eventEndDate) : dayLabel(o.eventDate),
})
}
}
return NextResponse.json({
title: 'Rental Inventory Overdue',
columns: [
{ key: 'item', label: 'Item' },
{ key: 'quantity', label: 'Qty' },
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'expectedReturn', label: 'Expected Return' },
],
rows,
summary: [{ label: 'Note', value: 'Heuristic: orders whose event/end date has passed. There is no explicit check-in/return status field in this system, so this may include items already returned.' }],
})
}

if (slug === slugify('Auto Pay Report')) {
const orders = await prisma.order.findMany({
where: { autopayEnabled: true },
include: { customer: true },
orderBy: { eventDate: 'asc' },
})
const rows = orders.map((o) => ({
orderNumber: o.orderNumber,
customer: customerName(o.customer),
eventDate: dayLabel(o.eventDate),
balanceDue: money(o.balanceDue),
autoChargeStatus: o.autoChargeStatus || 'Not Attempted',
autoChargeAttemptedAt: o.autoChargeAttemptedAt ? dayLabel(o.autoChargeAttemptedAt) : '',
}))
return NextResponse.json({
title: 'Auto Pay Report',
columns: [
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'eventDate', label: 'Event Date' },
{ key: 'balanceDue', label: 'Balance Due' },
{ key: 'autoChargeStatus', label: 'Auto Charge Status' },
{ key: 'autoChargeAttemptedAt', label: 'Last Attempted' },
],
rows,
summary: [{ label: 'Autopay-Enabled Orders', value: orders.length }],
})
}

if (slug === 'tax') {
const orders = await prisma.order.findMany({
where: { status: { not: 'canceled' } },
select: { eventDate: true, taxAmount: true, totalAmount: true },
})
const byYear: any = {}
for (const o of orders) {
const key = String(o.eventDate.getFullYear())
if (!byYear[key]) byYear[key] = { orders: 0, tax: 0, revenue: 0 }
byYear[key].orders++
byYear[key].tax += o.taxAmount
byYear[key].revenue += o.totalAmount
}
const rows = Object.keys(byYear).sort().map((year) => ({ year, orders: byYear[year].orders, revenue: money(byYear[year].revenue), tax: money(byYear[year].tax) }))
return NextResponse.json({
title: 'Tax Report',
columns: [
{ key: 'year', label: 'Year' },
{ key: 'orders', label: 'Orders' },
{ key: 'revenue', label: 'Revenue' },
{ key: 'tax', label: 'Tax' },
],
rows,
summary: [{ label: 'Total Tax (All Years)', value: money(orders.reduce((s, o) => s + o.taxAmount, 0)) }],
})
}

if (slug === slugify('Transaction Search')) {
const payments = await prisma.payment.findMany({
include: { order: { include: { customer: true } } },
orderBy: { createdAt: 'desc' },
take: 500,
})
const rows = payments.map((p) => ({
date: dayLabel(p.createdAt),
orderNumber: p.order ? p.order.orderNumber : '',
customer: customerName(p.order ? p.order.customer : null),
amount: money(p.amount),
method: p.method,
stripePaymentId: p.stripePaymentId || '',
}))
return NextResponse.json({
title: 'Transaction Search',
columns: [
{ key: 'date', label: 'Date' },
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'amount', label: 'Amount' },
{ key: 'method', label: 'Method' },
{ key: 'stripePaymentId', label: 'Stripe Payment ID' },
],
rows,
summary: [{ label: 'Showing', value: 'Most recent ' + rows.length + ' transactions' }],
})
}

      if (slug === slugify('FPRPay Payments List')) {
const payments = await prisma.payment.findMany({
include: { order: { include: { customer: true } } },
orderBy: { createdAt: 'desc' },
take: 500,
})
const rows = payments.map((p) => ({
date: dayLabel(p.createdAt),
orderNumber: p.order ? p.order.orderNumber : '',
customer: customerName(p.order ? p.order.customer : null),
amount: money(p.amount),
method: p.method,
stripePaymentId: p.stripePaymentId || '',
      status: p.status || 'succeeded',
      pendingAmount: p.pendingAmount ? money(p.pendingAmount) : '',
}))
return NextResponse.json({
  title: 'FPRPay Payments List',
columns: [
{ key: 'date', label: 'Date' },
{ key: 'orderNumber', label: 'Order #' },
{ key: 'customer', label: 'Customer' },
{ key: 'amount', label: 'Amount' },
{ key: 'method', label: 'Method' },
{ key: 'stripePaymentId', label: 'Stripe Payment ID' },
  { key: 'status', label: 'Status' },
  { key: 'pendingAmount', label: 'Pending Amount' },
],
rows,
  summary: [{ label: 'Total Payments', value: money(payments.reduce((s, p) => s + p.amount, 0)) }, { label: 'Pending Amount', value: money(payments.reduce((s, p) => s + (p.pendingAmount || 0), 0)) }],
})
}

if (slug === slugify('FPRPay Not Funded List')) {
  const payments = await prisma.payment.findMany({
    where: { OR: [{ status: 'pending' }, { pendingAmount: { gt: 0 } }] },
    include: { order: { include: { customer: true } } },
    orderBy: { createdAt: 'desc' },
  })
    const rows = payments.map((p) => ({
      date: dayLabel(p.createdAt),
      orderNumber: p.order ? p.order.orderNumber : '',
      customer: customerName(p.order ? p.order.customer : null),
      amount: money(p.amount),
      pendingAmount: money(p.pendingAmount || p.amount),
      status: p.status || 'pending',
    }))
      return NextResponse.json({
        title: 'FPRPay Not Funded List',
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'orderNumber', label: 'Order #' },
          { key: 'customer', label: 'Customer' },
          { key: 'amount', label: 'Amount' },
          { key: 'pendingAmount', label: 'Not Yet Funded' },
          { key: 'status', label: 'Status' },
          ],
        rows,
        summary: [{ label: 'Total Not Funded', value: money(payments.reduce((s, p) => s + (p.pendingAmount || p.amount), 0)) }, { label: 'Note', value: 'Shows Stripe payments that have not yet settled/funded to the merchant account (status pending or with a pending amount).' }],
      })
}
  
  if (slug === slugify('FPRPay Activity Report')) {
    const payments = await prisma.payment.findMany({
      include: { order: { include: { customer: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    })
      const rows = payments.map((p) => ({
        date: dayLabel(p.createdAt),
        orderNumber: p.order ? p.order.orderNumber : '',
        customer: customerName(p.order ? p.order.customer : null),
        activity: p.status === 'failed' ? 'Voided' : p.amount < 0 ? 'Refund' : 'Payment',
        amount: money(p.amount),
        method: p.method,
        recordedBy: p.recordedByName || '',
      }))
        return NextResponse.json({
          title: 'FPRPay Activity Report',
          columns: [
            { key: 'date', label: 'Date' },
            { key: 'orderNumber', label: 'Order #' },
            { key: 'customer', label: 'Customer' },
            { key: 'activity', label: 'Activity' },
            { key: 'amount', label: 'Amount' },
            { key: 'method', label: 'Method' },
            { key: 'recordedBy', label: 'Recorded By' },
            ],
          rows,
          summary: [{ label: 'Total Activity', value: rows.length }],
        })
  }
  
  if ([
'FPRPay Reconciliation','FPRPay Reconciliation Report','FPRPay Multi Invoice Breakdown','FPRPay by Funding Date','FPRPay Fee Report','FPRPay Statement','FPRPay Chargeback Report','FPRPay Chargeback Action Report','FPRPay ACH Returns Report','Billing Risk Report','FPRGift Cards Outstanding','FPRGift History',
      ].some((t) => slugify(t) === slug)) {
const title = [
'FPRPay Reconciliation','FPRPay Reconciliation Report','FPRPay Multi Invoice Breakdown','FPRPay by Funding Date','FPRPay Fee Report','FPRPay Statement','FPRPay Chargeback Report','FPRPay Chargeback Action Report','FPRPay ACH Returns Report','Billing Risk Report','FPRGift Cards Outstanding','FPRGift History',
  ].find((t) => slugify(t) === slug) || 'Report'
return NextResponse.json({
title,
columns: [{ key: 'message', label: 'Notice' }],
rows: [{ message: 'Not Applicable: this report was part of the legacy FPRPay payment processor used by the legacy system this company migrated from. This system processes payments through Stripe instead, and there is no equivalent FPRPay data to report on. This has been intentionally left as Not Applicable rather than showing fabricated data.' }],
summary: [{ label: 'Status', value: 'Not Applicable (Legacy FPRPay Feature)' }],
})
}

return NextResponse.json({ notImplemented: true })
}
