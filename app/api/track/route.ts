export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { recordHit } from '@/lib/realtime'

// Public, first-party page-view tracking endpoint. The site calls this on each
// page navigation (and on a periodic heartbeat) so we can build our own
// realtime "who's online" view without sending anything to Google.
//
// We intentionally keep only coarse, non-identifying data: a random visitor id
// generated client-side, the path, referrer host, coarse geo (city/region from
// edge headers when available) and a device bucket. No IP addresses are stored.

function deviceFromUA(ua: string): 'mobile' | 'tablet' | 'desktop' {
  const s = ua.toLowerCase()
  if (/ipad|tablet|playbook|silk/.test(s)) return 'tablet'
  if (/mobi|iphone|android.*mobile|phone/.test(s)) return 'mobile'
  return 'desktop'
}

function headerCity(req: NextRequest): string | null {
  // Various platforms expose geo via headers; try the common ones.
  const h = req.headers
  const raw =
    h.get('x-vercel-ip-city') ||
    h.get('cf-ipcity') ||
    h.get('x-geo-city') ||
    null
  if (!raw) return null
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

function headerRegion(req: NextRequest): string | null {
  const h = req.headers
  return (
    h.get('x-vercel-ip-country-region') ||
    h.get('cf-region') ||
    h.get('x-geo-region') ||
    null
  )
}

function headerCountry(req: NextRequest): string | null {
  const h = req.headers
  return (
    h.get('x-vercel-ip-country') ||
    h.get('cf-ipcountry') ||
    h.get('x-geo-country') ||
    null
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const visitorId = typeof body.visitorId === 'string' ? body.visitorId.slice(0, 64) : null
    const path = typeof body.path === 'string' ? body.path.slice(0, 256) : null
    if (!visitorId || !path) {
      return NextResponse.json({ ok: false }, { status: 400 })
    }

    let referrer: string | null = null
    if (typeof body.referrer === 'string' && body.referrer) {
      try {
        referrer = new URL(body.referrer).host
      } catch {
        referrer = body.referrer.slice(0, 128)
      }
    }

    const ua = req.headers.get('user-agent') || ''

    recordHit({
      visitorId,
      path,
      referrer,
      city: headerCity(req),
      region: headerRegion(req),
      country: headerCountry(req),
      device: deviceFromUA(ua),
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Tracking must never break the page; swallow errors quietly.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}
