'use client'

import { useRef, useState } from 'react'

type Preview = {
  to: string
  message: string
  providerConnected: boolean
  reviewStatus: string
  lastReviewRequestAt?: string | null
}

function formatWhen(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

function openSmsComposer(to: string, message: string) {
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const separator = isiOS ? '&' : '?'
  window.location.href = `sms:${to}${separator}body=${encodeURIComponent(message)}`
}

export default function ReviewRequestButton({
  orderId,
  label = '★ Send Google Review Request',
  compact = false,
  ready = true,
  readyMessage = 'Available after pickup',
}: {
  orderId: string
  label?: string
  compact?: boolean
  ready?: boolean
  readyMessage?: string
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const loadPreview = async () => {
    if (!ready || loading) return
    setLoading(true); setError(''); setStatus('')
    try {
      const response = await fetch('/api/review-request?orderId=' + encodeURIComponent(orderId), { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not prepare the review request.')
      setPreview(data)
      dialog.current?.showModal()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not prepare the review request.')
    } finally {
      setLoading(false)
    }
  }

  const send = async () => {
    if (sending) return
    setSending(true); setError(''); setStatus('')
    try {
      const response = await fetch('/api/review-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not send the review request.')
      if (data.composeSms && data.to && data.message) {
        try { await navigator.clipboard?.writeText(data.message) } catch {}
        setStatus('Message prepared and copied. Tap Send in Messages.')
        openSmsComposer(data.to, data.message)
      } else {
        setStatus('Review request sent ✓')
      }
      setPreview((current) => current ? {
        ...current,
        reviewStatus: data.sent ? 'Sent' : 'Prepared',
        lastReviewRequestAt: new Date().toISOString(),
      } : current)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send the review request.')
    } finally {
      setSending(false)
    }
  }

  const buttonClass = compact
    ? 'rounded-xl border border-amber-300 bg-amber-50 px-3 py-3 font-semibold text-amber-900 disabled:opacity-50'
    : 'rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-50'

  return <>
    <div>
      <button type="button" onClick={loadPreview} disabled={!ready || loading} className={buttonClass}>
        {!ready ? readyMessage : loading ? 'Preparing…' : label}
      </button>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
      {status && <p className="mt-2 text-xs font-semibold text-green-700">{status}</p>}
    </div>

    <dialog ref={dialog} className="m-auto w-[calc(100%_-_2rem)] max-w-xl rounded-2xl p-0 shadow-2xl backdrop:bg-black/60">
      {preview && <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-950">Google review request</h2>
            <p className="mt-1 text-xs text-gray-500">To {preview.to}</p>
          </div>
          <span className={
            'rounded-full px-2.5 py-1 text-xs font-semibold ' +
            (preview.reviewStatus === 'Sent' ? 'bg-green-100 text-green-800' :
             preview.reviewStatus === 'Prepared' ? 'bg-amber-100 text-amber-800' :
             'bg-gray-100 text-gray-700')
          }>
            {preview.reviewStatus}
          </span>
        </div>

        {preview.lastReviewRequestAt && <p className="mt-2 text-xs text-gray-500">Last activity: {formatWhen(preview.lastReviewRequestAt)}</p>}

        <div className="mt-4 rounded-xl border bg-gray-50 p-4">
          <p className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{preview.message}</p>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          {preview.providerConnected
            ? 'Business texting is connected, so this will send automatically.'
            : 'Business texting is not connected, so the customer text will open with this message already filled in.'}
        </p>

        {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
        {status && <p className="mt-3 text-sm font-semibold text-green-700">{status}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" disabled={sending || preview.reviewStatus === 'Sent'} onClick={send} className="rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {preview.reviewStatus === 'Sent' ? 'Already sent' : sending ? 'Preparing…' : preview.providerConnected ? 'Send review request' : 'Open customer text'}
          </button>
          <button type="button" onClick={async()=>{try{await navigator.clipboard?.writeText(preview.message);setStatus('Message copied ✓')}catch{setError('Could not copy the message.')}}} className="rounded-lg border px-4 py-3 text-sm font-semibold">
            Copy message
          </button>
          <button type="button" onClick={()=>dialog.current?.close()} className="rounded-lg border px-4 py-3 text-sm">
            Close
          </button>
        </div>
      </div>}
    </dialog>
  </>
}
