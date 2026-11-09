'use client'

import { useState } from 'react'

export default function NycOfficeEmailSmokeTest() {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  async function sendInternalTest() {
    if (!password) { setError('Enter the current NYC admin password.'); return }
    if (!window.confirm('Send ONE internal NYC test email to the central office? No customers will receive a message.')) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/email-delivery/smoke-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, adminPassword: password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Internal test failed')
      setMessage(data.note || 'Provider accepted the internal email. Verify actual inbox delivery separately.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to send the internal test')
    } finally {
      setPassword('')
      setBusy(false)
    }
  }

  return <section className="rounded-xl border border-blue-200 bg-white p-5">
    <h2 className="text-lg font-bold">Test real NYC outbound email safely</h2>
    <p className="mt-2 text-sm text-gray-700">
      This sends one idempotent test per UTC day from the configured NYC website sender
      to the central office only. It does not create orders, contact customers,
      charge cards or prove inbox delivery merely from provider acceptance.
    </p>
    <label htmlFor="nyc-test-admin-password" className="mt-4 block text-sm font-semibold">NYC admin password</label>
    <input id="nyc-test-admin-password" type="password" autoComplete="current-password"
      value={password} onChange={e => setPassword(e.target.value)}
      placeholder="Reconfirm before sending"
      className="mt-1 w-full max-w-sm rounded-lg border px-3 py-2 text-sm" />
    <div className="mt-3">
      <button type="button" disabled={busy || !password} onClick={() => void sendInternalTest()}
        className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {busy ? 'Submitting internal test…' : 'Send internal test to NYC office'}
      </button>
    </div>
    {message && <p role="status" className="mt-3 text-sm font-semibold text-blue-800">{message}</p>}
    {error && <p role="alert" className="mt-3 text-sm font-semibold text-red-700">{error}</p>}
    <p className="mt-3 text-xs text-gray-500">
      If Resend is not configured, the test refuses to fall back to SMTP because duplicate safety would be lost.
      Check the separate NYC delivery-event audit to verify delivery.
    </p>
  </section>
}
