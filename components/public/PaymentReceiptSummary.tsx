'use client'

import { useEffect } from 'react'
import { formatCurrency } from '@/lib/utils'
import type { PaymentReceipt } from '@/lib/paymentReceipt'
import { trackPaidBooking } from '@/lib/paidBookingTracking'

export default function PaymentReceiptSummary({ receipt }: { receipt: PaymentReceipt }) {
  useEffect(() => { trackPaidBooking(receipt) }, [receipt])
  return <div className="bg-gray-50 p-6 rounded-lg mb-8 text-left space-y-2">
    <h2 className="font-bold text-dark">Payment Receipt</h2>
    <p><strong>Order Number:</strong> {receipt.orderNumber}</p>
    <p><strong>Payment Reference:</strong> {receipt.paymentId}</p>
    <p><strong>Amount Paid:</strong> {formatCurrency(receipt.amountPaid)}</p>
    <p><strong>Order Total:</strong> {formatCurrency(receipt.totalAmount)}</p>
    <p><strong>Total Paid:</strong> {formatCurrency(receipt.totalPaid)}</p>
    <p><strong>Balance Due:</strong> {formatCurrency(receipt.balanceDue)}</p>
  </div>
}
