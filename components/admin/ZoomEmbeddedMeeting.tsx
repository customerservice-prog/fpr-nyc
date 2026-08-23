'use client'

import { useEffect, useRef, useState } from 'react'

export interface ZoomSdkSession {
  signature: string
  sdkKey: string
  meetingNumber: string
  password: string
  userName: string
}

// Embeds a live Zoom meeting directly inside our own admin page using Zoom's
// Meeting SDK for Web, instead of opening zoom.us in a new tab.
export default function ZoomEmbeddedMeeting({
  session,
  onClose,
}: {
  session: ZoomSdkSession
  onClose: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const clientRef = useRef<ReturnType<typeof import('@zoom/meetingsdk/embedded').default.createClient> | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const mod = await import('@zoom/meetingsdk/embedded')
        const ZoomMtgEmbedded = mod.default
        if (cancelled || !containerRef.current) return

        const client = ZoomMtgEmbedded.createClient()
        clientRef.current = client

        await client.init({ zoomAppRoot: containerRef.current, language: 'en-US', patchJsMedia: true })
        if (cancelled) return

        await client.join({
          sdkKey: session.sdkKey,
          signature: session.signature,
          meetingNumber: session.meetingNumber,
          password: session.password,
          userName: session.userName,
        })
      } catch (err) {
        console.error('Zoom embedded join failed:', err)
        if (!cancelled) setError('Could not join the meeting. Please try again.')
      }
    }

    start()

    return () => {
      cancelled = true
      try {
        clientRef.current?.leaveMeeting()
      } catch {
        // ignore cleanup errors
      }
    }
  }, [session])

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] relative flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-2 border-b">
          <p className="text-sm font-semibold">Zoom Meeting</p>
          <button onClick={onClose} className="text-xs border rounded px-2 py-1 hover:bg-gray-50">
            Close
          </button>
        </div>
        {error && <p className="text-xs text-red-600 p-2">{error}</p>}
        <div ref={containerRef} className="flex-1 overflow-auto" />
      </div>
    </div>
  )
}
