'use client'

import { PAYMENT_CARD_AUTHORIZATION_TEXT } from '@/lib/cardAuthorization'

export default function PaymentCardAuthorization({ checked, onChange, required = true, admin = false, compact = false }: {
  checked: boolean; onChange: (checked: boolean) => void; required?: boolean; admin?: boolean; compact?: boolean
}) {
  if (compact && !admin && !required) {
    return <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 text-sm text-body">
      <label className="flex cursor-pointer items-start gap-3">
        <input type="checkbox" name="cardAuthorization" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
        <span>
          <strong className="block text-dark">Optional: save this card for this order</strong>
          <span className="mt-1 block text-xs leading-5 text-gray-600">You can place and pay for your order without saving a card.</span>
        </span>
      </label>
      {checked && <div className="mt-3 border-t border-gray-200 pt-3 text-xs leading-5 text-gray-600">
        <p className="font-semibold text-dark">Card-on-file authorization</p>
        <p className="mt-1">{PAYMENT_CARD_AUTHORIZATION_TEXT}</p>
        <p className="mt-2">The same card used for this payment will be stored securely through Stripe for this order. No separate card entry is needed.</p>
      </div>}
    </div>
  }

  return <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-body">
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" name="cardAuthorization" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
      <span><strong className="block text-dark">{admin ? 'Customer authorizes saving this payment card' : `Save the card used for this payment${required ? ' (required for online rentals)' : ' (optional)'}`}</strong>
        {PAYMENT_CARD_AUTHORIZATION_TEXT}
      </span>
    </label>
    <p className="mt-3 text-xs text-gray-600">{admin ? 'Have the customer review and agree to the authorization above before selecting this option. ' : ''}The same card you use to pay will be saved securely for this order. No separate card entry is needed.</p>
  </div>
}
