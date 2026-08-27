export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getNextOrderNumber } from '@/lib/orderNumber'
import { BUSINESS } from '@/lib/utils'
import { sendEmail, newOrderAdminNotificationEmail } from '@/lib/email'
import { getItemAvailability } from '@/lib/availability'

export async function POST(request: NextRequest) {
    try {
          const body = await request.json()
          const {
                  firstName,
                  lastName,
                  email,
                  phone,
                  eventDate,
                  eventAddress,
                  eventCity,
                  eventState,
                  eventZip,
                  eventTimeSlot,
                  pickupTimeSlot,
                  tipAmount,
                  lastMinuteFeeAmount,
                  deliveryType,
                  notes,
                  items,
                  subtotal,
                  rentalDays,
                  durationLabel,
                  durationFee,
                  specialRequestFee,
                  specialRequestNames,
                  deliveryFee,
                  deliveryDistance,
                  taxRate,
                  taxAmount,
                  couponCode,
                  couponDiscount,
                  damageWaiver,
                  damageWaiverFee,
                  totalAmount: totalAmountInput,
                  depositAmount,
          } = body

      if (!firstName || !lastName || !email || !eventDate || !items?.length) {
              return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
      }

      const hoursUntilEvent = (new Date(eventDate).getTime() - Date.now()) / (1000 * 60 * 60)
          if (hoursUntilEvent < 24) {
                  return NextResponse.json({ error: 'Orders cannot be placed within 24 hours of the event date. Please call our office for last-minute availability.' }, { status: 400 })
          }

      // Server-side inventory check: never trust client-side availability math alone.
      // This prevents overbooking/double-booking even if the cart was manipulated
      // or an order is submitted directly via the API.
      for (const requestedItem of items) {
              if (!requestedItem?.id) continue
              const requestedQty = Number(requestedItem.quantity) || 0
              if (requestedQty <= 0) continue
              const available = await getItemAvailability(requestedItem.id, new Date(eventDate))
              if (requestedQty > available) {
                        return NextResponse.json({
                                    error: available > 0
                                      ? `Only ${available} of "${requestedItem.name}" available for the selected date. Please adjust the quantity in your cart.`
                                                  : `"${requestedItem.name}" is no longer available for the selected date. Please remove it or choose another date.`,
                        }, { status: 400 })
              }
      }

              const normalizedEmail = String(email).trim().toLowerCase(); const normalizedPhone = phone ? String(phone).trim() : null; let customer = await prisma.customer.findFirst({ where: { OR: [{ email: { equals: normalizedEmail, mode: 'insensitive' } }, ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])] } })
          if (!customer) {
                  customer = await prisma.customer.create({
                            data: {
                                        firstName,
                                        lastName,
                                        email: normalizedEmail,
                                        phone: normalizedPhone,
                                        address: eventAddress || null,
                                        city: eventCity || null,
                                        state: eventState || 'NY',
                                        zip: eventZip || null,
                            },
                  })
          }

      const orderNumber = await getNextOrderNumber()
          const fee = deliveryFee || 0
          const tax = taxAmount || 0
          const discount = couponDiscount || 0
          const waiverFee = damageWaiverFee || 0
          const durationFeeAmount = durationFee || 0
          const specialFee = specialRequestFee || 0
          const lastMinuteFee = lastMinuteFeeAmount || 0
          const baseTotalAmount = typeof totalAmountInput === 'number'
            ? totalAmountInput
                  : Math.max(subtotal - discount, 0) + fee + tax + waiverFee + specialFee + lastMinuteFee
          const totalAmount = baseTotalAmount + (Number(tipAmount) || 0)

      const order = await prisma.order.create({
              data: {
                        orderNumber,
                        customerId: customer.id,
                        status: 'quote',
                        eventDate: new Date(eventDate),
                        eventAddress: eventAddress || null,
                        eventCity: eventCity || null,
                        eventState: eventState || 'NY',
                        eventZip: eventZip || null,
                        eventTimeSlot: eventTimeSlot || null,
                        pickupTimeSlot: pickupTimeSlot || null,
                        deliveryType: deliveryType || 'delivery',
                        deliveryFee: fee,
                        deliveryDistance: deliveryDistance ?? null,
                        subtotal,
                        rentalDays: rentalDays || 1,
                        durationLabel: durationLabel || null,
                        durationFee: durationFeeAmount,
                        specialRequestFee: specialFee,
                        specialRequestNames: specialRequestNames || null,
                        taxRate: taxRate || 0,
                        taxAmount: tax,
                        couponCode: couponCode || null,
                        couponDiscount: discount,
                        damageWaiver: !!damageWaiver,
                        damageWaiverFee: waiverFee,
                        lastMinuteFeeAmount: lastMinuteFee,
                        totalAmount,
                        depositAmount,
                        tipAmount: tipAmount || 0,
                        amountPaid: 0,
                        balanceDue: totalAmount,
                        notes: notes || null,
                        items: {
                                    create: (items || []).map((item: any) => ({
                                                  itemId: item.id,
                                                  itemName: item.name,
                                                  quantity: item.quantity,
                                                  unitPrice: item.unitPrice,
                                                  total: item.unitPrice * item.quantity,
                                    })),
                        },
              },
              include: { items: true },
      })

      if (couponCode) {
              await prisma.coupon.update({
                        where: { code: String(couponCode).toUpperCase() },
                        data: { usageCount: { increment: 1 } },
              }).catch(() => {})
      }

      try {
              await sendEmail({
                        to: BUSINESS.email,
                        subject: newOrderAdminNotificationEmail({
                                    orderNumber: order.orderNumber,
                                    customerName: firstName + ' ' + lastName,
                                    customerPhone: phone,
                                    customerEmail: email,
                                    eventDate: new Date(eventDate).toLocaleDateString(),
                                    totalAmount,
                                    amountPaid: 0,
                        }).subject,
                        html: newOrderAdminNotificationEmail({
                                    orderNumber: order.orderNumber,
                                    customerName: firstName + ' ' + lastName,
                                    customerPhone: phone,
                                    customerEmail: email,
                                    eventDate: new Date(eventDate).toLocaleDateString(),
                                    totalAmount,
                                    amountPaid: 0,
                        }).html,
              })
      } catch (err) {
              console.error('New order admin notification email error:', err)
      }

      return NextResponse.json({ order: { id: order.id, orderNumber: order.orderNumber } })
    } catch (error) {
          console.error('Order creation error:', error)
          return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
    }
}
