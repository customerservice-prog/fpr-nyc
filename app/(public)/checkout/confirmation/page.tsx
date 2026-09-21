'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'
import { trackEvent, AW_PURCHASE_DESTINATION } from '@/lib/gtag'

export default function ConfirmationPage() {
  const [order, setOrder] = useState<{
    orderNumber: string
    orderId: string
    depositAmount: number
    balanceDue: number
    totalAmount: number
  } | null>(null)

  useEffect(() => {
    const data = sessionStorage.getItem('order_confirmation')
    if (data) {
      const parsed = JSON.parse(data)
      setOrder(parsed)
      sessionStorage.removeItem('order_confirmation')
      trackEvent('purchase', {
        transaction_id: parsed.orderNumber,
        value: parsed.totalAmount,
        currency: 'USD',
      })
      if (AW_PURCHASE_DESTINATION) trackEvent('conversion', {
        send_to: AW_PURCHASE_DESTINATION,
        transaction_id: parsed.orderNumber,
        value: parsed.totalAmount,
        currency: 'USD',
      })
    }
  }, [])

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-body">No order found.</p>
        <Link href="/" className="btn-primary inline-block mt-4">Return Home</Link>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <div className="text-6xl mb-4">✅</div>
      <h1 className="text-3xl font-bold text-dark mb-4">Thank You!</h1>
      <p className="text-body mb-6">
        Your order has been confirmed. A confirmation email has been sent to your email address.
      </p>

      <div className="bg-gray-50 p-6 rounded-lg mb-8 text-left space-y-2">
        <p><strong>Order Number:</strong> {order.orderNumber}</p>
        <p><strong>Total:</strong> {formatCurrency(order.totalAmount)}</p>
        <p><strong>Deposit Paid:</strong> {formatCurrency(order.depositAmount)}</p>
        <p><strong>Balance Due:</strong> {formatCurrency(order.balanceDue)}</p>
      </div>

      {order.orderId && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-8 text-left">
          <p className="font-bold text-dark mb-2">One more step!</p>
          <p className="text-body text-sm mb-4">
            Please review and sign your rental contract so we can confirm your delivery.
          </p>
          <Link href={`/contract/${order.orderId}`} className="btn-primary inline-block">
            View &amp; Sign Your Contract
          </Link>
        </div>
      )}

      <p className="text-body text-sm mb-8">
        Questions? Call us at <a href="tel:864-610-5324" className="text-secondary">864-610-5324</a>
        or email <a href="mailto:customerservice@friendlypartyrentalsc.com" className="text-secondary">customerservice@friendlypartyrentalsc.com</a>
      </p>

      <Link href="/" className="btn-primary inline-block">Return Home</Link>
    </div>
  )
}
