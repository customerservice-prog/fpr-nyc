'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CAMPAIGN_LIBRARY,
  VISUAL_THEMES,
  campaignToBlocks,
  campaignTagLabel,
  layoutTypeLabel,
  visualStyleLabel,
  type CampaignTag,
  type LayoutType,
  type VisualStyle,
} from '@/lib/marketing/campaignLibrary'
import { blocksToHtml, type Block } from '@/lib/marketing/emailRenderer'

const LAYOUT_ORDER: LayoutType[] = [
  'editorialLuxury',
  'boldSeasonal',
  'productShowcase',
  'corporateEditorial',
  'personalLetter',
  'availabilityUrgency',
  'collectionMagazine',
  'announcement',
]

const STYLE_ORDER: VisualStyle[] = ['elegant', 'energetic', 'professional', 'personal', 'urgency']

function renderCampaignFrame(slug: string) {
  const campaign = CAMPAIGN_LIBRARY.find((c) => c.slug === slug)
  if (!campaign) return null
  const theme = VISUAL_THEMES[campaign.visualStyle]
  const blocks = campaignToBlocks(campaign) as Block[]
  const html = blocksToHtml(blocks, theme)
  const frame =
    '<div style="width:600px;background:' + theme.cardBg + ';padding:32px 30px;font-family:' + theme.bodyFont + ';color:' + theme.textColor + ';">' + html + '</div>'
  return { campaign, theme, frame }
}

// Thumbnails sit inside a Link (an <a>). The real campaign HTML contains its
// own <a> tags (buttons, hero links), which would nest an <a> inside an <a> -
// invalid HTML that React's hydration then flags as a mismatch. Thumbnails
// are already pointer-events-none (non-interactive), so it's safe to strip
// the inner anchor tags entirely for this preview-only context.
function stripAnchors(html: string): string {
  return html.replace(/<a\b[^>]*>/gi, '').replace(/<\/a>/gi, '')
}

function Thumbnail({ slug }: { slug: string }) {
  const rendered = renderCampaignFrame(slug)
  if (!rendered) return null
  const { theme, frame } = rendered
  return (
    <div className="relative w-full h-[300px] overflow-hidden bg-white" style={{ background: theme.pageBg }}>
      <div
        className="pointer-events-none origin-top-left"
        style={{ transform: 'scale(0.4)', width: 600 }}
        dangerouslySetInnerHTML={{ __html: stripAnchors(frame) }}
      />
    </div>
  )
}

function PreviewModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [mode, setMode] = useState<'desktop' | 'mobile'>('desktop')
  const rendered = renderCampaignFrame(slug)
  if (!rendered) return null
  const { campaign, theme, frame } = rendered
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div>
            <p className="text-sm font-semibold text-gray-800">{campaign.name}</p>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-gray-50 text-gray-600 border-gray-200">{visualStyleLabel(campaign.visualStyle)}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-blue-50 text-blue-700 border-blue-200">{layoutTypeLabel(campaign.layoutType)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <button type="button" onClick={() => setMode('desktop')} className={'px-2 py-1 text-xs rounded ' + (mode === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-600 border border-gray-300')}>Desktop</button>
              <button type="button" onClick={() => setMode('mobile')} className={'px-2 py-1 text-xs rounded ' + (mode === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-600 border border-gray-300')}>Mobile</button>
            </div>
            <Link href={'/admin/marketing/campaigns/builder?slug=' + campaign.slug} className="text-xs font-medium text-blue-700 hover:underline whitespace-nowrap">Open in builder</Link>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
          </div>
        </div>
        <div className="p-4 overflow-auto" style={{ background: theme.pageBg }}>
          <div style={{ width: mode === 'mobile' ? 375 : 600, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: frame }} />
        </div>
      </div>
    </div>
  )
}

export default function CampaignGalleryPage() {
  const [styleFilter, setStyleFilter] = useState<VisualStyle | 'all'>('all')
  const [layoutFilter, setLayoutFilter] = useState<LayoutType | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<CampaignTag | 'all'>('all')
  const [previewSlug, setPreviewSlug] = useState<string | null>(null)

  const filtered = useMemo(() => {
    return CAMPAIGN_LIBRARY.filter((c) => {
      if (styleFilter !== 'all' && c.visualStyle !== styleFilter) return false
      if (layoutFilter !== 'all' && c.layoutType !== layoutFilter) return false
      if (tagFilter !== 'all' && c.tag !== tagFilter) return false
      return true
    })
  }, [styleFilter, layoutFilter, tagFilter])

  const layoutCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const c of CAMPAIGN_LIBRARY) counts[c.layoutType] = (counts[c.layoutType] || 0) + 1
    return counts
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-gray-700">Campaign Design Gallery</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-3xl">
          A visual contact sheet of all {CAMPAIGN_LIBRARY.length} campaigns so composition repetition or gaps are easy to spot at a glance.
          Each thumbnail is the real render used in the builder, not a mockup. Click the magnifier to preview large, or click the card to open it in the builder.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {LAYOUT_ORDER.map((lt) => (
          <span key={lt} className="px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-600">
            {layoutTypeLabel(lt)} · {layoutCounts[lt] || 0}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center border-t border-b border-gray-100 py-3">
        <select className="text-sm border rounded px-2 py-1" value={styleFilter} onChange={(e) => setStyleFilter(e.target.value as VisualStyle | 'all')}>
          <option value="all">All visual styles</option>
          {STYLE_ORDER.map((s) => (
            <option key={s} value={s}>{visualStyleLabel(s)}</option>
          ))}
        </select>
        <select className="text-sm border rounded px-2 py-1" value={layoutFilter} onChange={(e) => setLayoutFilter(e.target.value as LayoutType | 'all')}>
          <option value="all">All layout families</option>
          {LAYOUT_ORDER.map((lt) => (
            <option key={lt} value={lt}>{layoutTypeLabel(lt)}</option>
          ))}
        </select>
        <select className="text-sm border rounded px-2 py-1" value={tagFilter} onChange={(e) => setTagFilter(e.target.value as CampaignTag | 'all')}>
          <option value="all">All categories</option>
          {(['wedding', 'graduation', 'summer-family', 'fall', 'holiday-corporate', 'lifecycle', 'product-spotlight', 'availability', 'upsell'] as CampaignTag[]).map((tag) => (
            <option key={tag} value={tag}>{campaignTagLabel(tag)}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400">{filtered.length} of {CAMPAIGN_LIBRARY.length} campaigns</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((c) => (
          <div key={c.slug} className="group relative border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 hover:shadow-sm transition bg-white">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreviewSlug(c.slug) }}
              className="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-white/90 border border-gray-200 shadow-sm text-gray-600 opacity-0 group-hover:opacity-100 transition flex items-center justify-center hover:bg-white"
              title="Large preview"
            >
              <span aria-hidden="true">⤢</span>
            </button>
            <Link href={'/admin/marketing/campaigns/builder?slug=' + c.slug} className="block">
              <Thumbnail slug={c.slug} />
              <div className="p-3 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700">{c.name}</p>
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-gray-50 text-gray-600 border-gray-200">{visualStyleLabel(c.visualStyle)}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium bg-blue-50 text-blue-700 border-blue-200">{layoutTypeLabel(c.layoutType)}</span>
                </div>
              </div>
            </Link>
          </div>
        ))}
      </div>

      {previewSlug && <PreviewModal slug={previewSlug} onClose={() => setPreviewSlug(null)} />}
    </div>
  )
}
