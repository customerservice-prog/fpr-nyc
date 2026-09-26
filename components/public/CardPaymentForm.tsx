'use client'

import { useState } from 'react'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import toast from 'react-hot-toast'
import { formatCurrency } from '@/lib/utils'

interface CardPaymentFormProps {
  amount: number
  onSuccess: (paymentIntentId: string) => void
}

export default function CardPaymentForm({ amount, onSuccess }: CardPaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (error) {
      toast.error(error.message || 'Payment failed. Please check your card details.')
      setSubmitting(false)
      return
    }

    if (paymentIntent && (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing')) {
      onSuccess(paymentIntent.id)
    } else {
      toast.error('Payment was not completed. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="btn-primary w-full text-lg py-3"
      >
        {submitting ? 'Processing...' : `Pay Deposit ${formatCurrency(amount)}`}
      </button>
    </form>
  )
}
