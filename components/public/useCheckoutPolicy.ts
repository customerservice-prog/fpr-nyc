'use client'

import { useEffect, useState } from 'react'
import type { PublicCheckoutPolicy } from '@/lib/nycCheckoutPolicy'

// Owner-approved minimum order and optional fees (GET /api/checkout-policy), shared
// by the category scheduling dialog and checkout so they only offer options that
// the server will price, at the approved amounts.

let pending: Promise<PublicCheckoutPolicy | null> | null = null

export function fetchCheckoutPolicy(): Promise<PublicCheckoutPolicy | null> {
  if (!pending) {
    pending = fetch('/api/checkout-policy', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null)
      .then((value: PublicCheckoutPolicy | null) => {
        if (!value) pending = null // retry on the next page that asks
        return value
      })
  }
  return pending
}

/** undefined while loading; null when the policy could not be loaded. */
export function useCheckoutPolicy(): PublicCheckoutPolicy | null | undefined {
  const [value, setValue] = useState<PublicCheckoutPolicy | null | undefined>(undefined)
  useEffect(() => {
    let active = true
    fetchCheckoutPolicy().then((policy) => { if (active) setValue(policy) })
    return () => { active = false }
  }, [])
  return value
}
