'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CAMPAIGN_LIBRARY,
  VISUAL_THEMES,
  audienceConfidenceLabel,
  campaignTagLabel,
  contentStatusLabel,
  designStatusLabel,
  type CampaignTag,
} from '@/lib/marketing/campaignLibrary'

const ORIGIN = 'https://www.friendlypartyrental.com'

const TAG_ORDER: CampaignTag[] = [
  'wedding', 'graduation', 'summer-family', 'fall', 'holiday-corporate',
  'lifecycle', 'product-spotlight', 'availability', 'upsell',
]

interface Draft {
  id: string
  name: string
  status?: string
  createdAt: string
}

const CONFIDENCE_STYLE: Record<string, string> = {
  ready: 'bg-green-50 text-green-700 border-green-200',
  broad: 'bg-gray-50 text-gray-600 border-gray-200',
  limited: 'bg-amber-50 text-amber-700 border-amber-200',
}

const STATUS_STYLE: Record<string, string> = {
  'content-ready': 'bg-green-50 text-green-700 border-green-200',
  'needs-image': 'bg-amber-50 text-amber-700 border-amber-200',
  'needs-audience-review': 'bg-blue-50 text-blue-700 border-blue-200',
}

const DESIGN_STATUS_STYLE: Record<string, string> = {
  'design-ready': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'needs-layout-review': 'bg-amber-50 text-amber-700 border-amber-200',
}

const clamp2 = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }
const clamp3 = { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }

function CampaignCard({ c }: { c: (typeof CAMPAIGN_LIBRARY)[number] }) {
  const theme = VISUAL_THEMES[c.visualStyle]
  return (
    <Link href={'/admin/marketing/campaigns/builder?slug=' + c.slug} className="group border border-gray-200 rounded-lg overflow-hidden flex flex-col hover:shadow-md hover:border-gray-300 transition-shadow bg-white">
      <div className="h-28 w-full overflow-hidden bg-gray-100 relative">
        <img src={ORIGIN + '/api/category-image/' + c.heroCategory} alt="" className="w-full h-full object-cover" />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 border border-gray-200">
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: theme.accent }} />
          {theme.label}
        </span>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">{campaignTagLabel(c.tag)}</span>
        <div className="text-sm font-bold text-gray-900 group-hover:text-blue-700">{c.name}</div>
        <p className="text-xs text-gray-500 mt-1" style={clamp2}>{c.subject}</p>
        <p className="text-sm text-gray-600 mt-2 flex-1" style={clamp3}>{c.goal}</p>
        <div className="flex items-center gap-1.5 flex-wrap mt-3">
          <span className={'text-[10px] px-1.5 py-0.5 rounded border font-medium ' + (CONFIDENCE_STYLE[c.audienceConfidence] || '')}>{audienceConfidenceLabel(c.audienceConfidence)}</span>
          <span className={'text-[10px] px-1.5 py-0.5 rounded border font-medium ' + (STATUS_STYLE[c.contentStatus] || '')}>{contentStatusLabel(c.contentStatus)}</span>
          <span className={'text-[10px] px-1.5 py-0.5 rounded border font-medium ' + (DESIGN_STATUS_STYLE[c.designStatus] || '')}>{designStatusLabel(c.designStatus)}</span>
        </div>
        <span className="inline-block mt-3 text-sm font-medium text-blue-700 group-hover:underline">Open in Builder →</span>
      </div>
    </Link>
  )
}

export default function CampaignsPage() {
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<CampaignTag | 'all'>('all')
  const [drafts, setDrafts] = useState<Draft[]>([])

  useEffect(() => {
    fetch('/api/admin/email-templates-marketing', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d && d.items) setDrafts(d.items.slice(0, 20)) })
      .catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return CAMPAIGN_LIBRARY.filter((c) => {
      if (activeTag !== 'all' && c.tag !== activeTag) return false
      if (!q) return true
      return (
        c.name.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.headline.toLowerCase().includes(q) ||
        c.goal.toLowerCase().includes(q)
      )
    })
  }, [search, activeTag])

  const readyCount = CAMPAIGN_LIBRARY.filter((c) => c.contentStatus === 'content-ready').length
  const designReadyCount = CAMPAIGN_LIBRARY.filter((c) => c.designStatus === 'design-ready').length

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-700">Campaign Library</h2>
            <Link href="/admin/marketing/campaigns/gallery" className="text-xs font-medium text-blue-700 hover:underline">Design Gallery →</Link>
          </div>
          <span className="text-xs text-gray-400">{CAMPAIGN_LIBRARY.length} campaigns · {readyCount} Copy Ready · {designReadyCount} Design Ready · 0 Send Enabled</span>
        </div>
        <p className="text-sm text-gray-500 mt-1 mb-4 max-w-3xl">
          The permanent, curated set of campaigns built for Friendly Party Rental — each with its own purpose, audience, and prewritten content. Open any one to review or edit it in the builder. No campaign sends automatically; outbound sending is disabled while the system is being built.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns by name, subject, or goal…"
            className="w-full sm:max-w-xs border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setActiveTag('all')} className={'px-2.5 py-1.5 text-xs rounded border font-medium ' + (activeTag === 'all' ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-50')}>All</button>
            {TAG_ORDER.map((tag) => (
              <button key={tag} type="button" onClick={() => setActiveTag(tag)} className={'px-2.5 py-1.5 text-xs rounded border font-medium whitespace-nowrap ' + (activeTag === tag ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-300 text-gray-600 hover:bg-gray-50')}>{campaignTagLabel(tag)}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400">No campaigns match your search.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((c) => <CampaignCard key={c.slug} c={c} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Saved Drafts</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-gray-400">No saved drafts yet. Open a campaign from the library above, or start a blank one from the builder.</p>
        ) : (
          <ul className="divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {drafts.map((d) => (
              <li key={d.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <span className="text-gray-800">{d.name || 'Untitled'}</span>
                <span className="text-xs text-gray-400 uppercase">{d.status || 'draft'}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/marketing/campaigns/builder" className="inline-block mt-3 text-sm text-blue-700 hover:underline">
          Open the builder to create or load a campaign →
        </Link>
      </section>
    </div>
  )
}
