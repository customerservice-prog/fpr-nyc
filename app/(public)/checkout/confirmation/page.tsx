'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PaymentReceiptSummary from '@/components/public/PaymentReceiptSummary'
import type { PaymentReceipt } from '@/lib/paymentReceipt'

export default function ConfirmationPage() {
  const [receipt, setReceipt] = useState<PaymentReceipt | null>(null)
  const [message, setMessage] = useState('Verifying your payment receipt...')

  useEffect(() => {
    let active = true
    async function verifyReceipt() {
      try {
        const proof = JSON.parse(sessionStorage.getItem('order_confirmation') || 'null')
        if (!proof || typeof proof.orderId !== 'string' || typeof proof.stripePaymentId !== 'string') {
          if (active) setMessage('No verified payment confirmation was found in this tab. Please check your receipt or contact us at 315-884-1498.')
          return
        }
        const response = await fetch('/api/orders/' + encodeURIComponent(proof.orderId) + '/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripePaymentId: proof.stripePaymentId }),
        })
        const data = await response.json()
        if (!response.ok || !data.receipt || data.receipt.orderId !== proof.orderId || data.receipt.status !== 'succeeded') {
          throw new Error('Receipt could not be verified')
        }
        if (!active) return
        setReceipt(data.receipt)
      } catch {
        if (active) setMessage('We could not load your verified payment receipt. Please contact us at 315-884-1498 before making another payment.')
      }
    }
    void verifyReceipt()
    return () => { active = false }
  }, [])

  if (!receipt) return <div className="max-w-2xl mx-auto px-4 py-12 text-center">
    <p className="text-body">{message}</p>
    <Link href="/" className="btn-primary inline-block mt-4">Return Home</Link>
  </div>

  return <div className="max-w-2xl mx-auto px-4 py-12 text-center">
    <div className="text-6xl mb-4">✅</div>
    <h1 className="text-3xl font-bold text-dark mb-4">Thank You!</h1>
    <p className="text-body mb-6">Your payment has been received. Your verified receipt is below.</p>
    <PaymentReceiptSummary receipt={receipt}/>
    <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg mb-8 text-left">
      <p className="font-bold text-dark mb-2">One more step!</p>
      <p className="text-body text-sm mb-4">Please review and sign your rental contract so we can confirm your delivery.</p>
      <Link href={'/contract/' + receipt.orderId} className="btn-primary inline-block">View &amp; Sign Your Contract</Link>
    </div>
    <p className="text-body text-sm mb-8">Questions? Call us at <a href="tel:315-884-1498" className="text-secondary">315-884-1498</a> or email <a href="mailto:customerservice@friendlypartyrental.com?subject=%5BNYC%20%2F%20Downstate%5D%20order%20question" className="text-secondary">customerservice@friendlypartyrental.com</a>.</p>
    <Link href="/" className="btn-primary inline-block">Return Home</Link>
  </div>
}
