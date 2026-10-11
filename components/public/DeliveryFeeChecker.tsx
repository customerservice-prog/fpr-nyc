'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Loader2, MapPin, Truck } from 'lucide-react'
import { deliveryZipFromInput } from '@/lib/nycDeliveryInput'
import styles from './NycServiceArea.module.css'

interface Quote { fee: number; distance: number; zip: string; isEstimate: boolean; distanceBasis: string }

export default function DeliveryFeeChecker() {
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quote, setQuote] = useState<Quote | null>(null)
  const active = useRef<AbortController | null>(null)

  useEffect(() => {
    const zip = new URLSearchParams(window.location.search).get('zip')
    if (zip && /^\d{5}$/.test(zip)) setAddress(zip)
    return () => active.current?.abort()
  }, [])

  function change(value: string) {
    active.current?.abort()
    active.current = null
    setAddress(value)
    setQuote(null)
    setError('')
    setLoading(false)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    active.current?.abort()
    setQuote(null)
    setError('')
    const zip = deliveryZipFromInput(address)
    if (!zip) { setError('Enter a five-digit ZIP code, or include it at the end of your event address.'); return }
    const controller = new AbortController()
    active.current = controller
    setLoading(true)
    const timer = setTimeout(() => controller.abort(), 12000)
    try {
      const response = await fetch('/api/delivery-fee?zip=' + encodeURIComponent(zip), { signal: controller.signal, cache: 'no-store' })
      const data = await response.json()
      if (!response.ok || typeof data.fee !== 'number' || !Number.isFinite(data.fee) || data.fee <= 0 || data.zip !== zip) {
        throw new Error(data.error || 'A delivery estimate could not be calculated. Please retry.')
      }
      if (active.current === controller) setQuote(data)
    } catch (err) {
      if (active.current === controller) setError(controller.signal.aborted ? 'The delivery lookup timed out. Please try again.' : err instanceof Error ? err.message : 'Delivery pricing is temporarily unavailable. Please retry.')
    } finally {
      clearTimeout(timer)
      if (active.current === controller) { active.current = null; setLoading(false) }
    }
  }

  return <section id="delivery-estimate" className={styles.estimator} aria-labelledby="delivery-fee-heading">
    <div className={`${styles.wrap} ${styles.estimatorInner}`}>
      <div className={styles.estimatorIntro}>
        <span className={styles.estimatorIcon}><Truck size={25} aria-hidden="true" /></span>
        <div><p className={styles.goldEyebrow}>Before you book</p><h2 id="delivery-fee-heading">Check your delivery fee</h2><p>Enter your event address with ZIP code for a Riverdale-area travel estimate.</p></div>
      </div>
      <div className={styles.estimatorForm}>
        <form onSubmit={submit} noValidate>
          <label htmlFor="delivery-address" className={styles.inputLabel}>Event address with ZIP code, or ZIP code</label>
          <div className={styles.addressRow}>
            <div className={styles.addressInput}>
              <MapPin size={20} aria-hidden="true" />
              <input id="delivery-address" value={address} onChange={event => change(event.target.value)} placeholder="Street address, city, NY 10471" autoComplete="street-address" enterKeyHint="search" maxLength={240} aria-invalid={!!error} aria-describedby="delivery-estimate-help" />
            </div>
            <button type="submit" disabled={loading} className={styles.estimateButton}>
              {loading ? <Loader2 size={18} className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}
              {loading ? 'Checking…' : 'Check fee'}
            </button>
          </div>
          <p id="delivery-estimate-help" className={styles.estimatorHelp}>Uses the same ZIP-based estimate as checkout. No booking or account needed.</p>
        </form>
        <div aria-live="polite" aria-atomic="true">
          {error && <div role="alert" className={styles.estimateError}><p>{error}</p><a href="tel:+17182834593">Call 718-283-4593</a></div>}
          {quote && <div className={styles.estimateResult}>
            <div className={styles.resultTop}><div><p className={styles.resultLabel}><CheckCircle2 size={16} aria-hidden="true" /> Estimated delivery / travel fee</p><p className={styles.resultZip}>For ZIP {quote.zip}</p></div><strong className={styles.resultPrice}>${quote.fee.toFixed(2)}</strong></div>
            <p className={styles.resultNote}>Delivery only—warehouse pickup is not available. Rental charges, tax and optional services are separate. Confirm your event details and total at checkout.</p>
            <Link href="/order-by-date" prefetch={false} className={styles.resultLink}>Check my event date <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>}
        </div>
        <p className={styles.estimatorHelp}>Based on ZIP reference coordinates, not a warehouse-to-venue driving route. A street address is not verified by this estimate; our team confirms access and scheduling.</p>
      </div>
    </div>
  </section>
}
