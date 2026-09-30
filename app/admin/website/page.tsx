'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject, MouseEvent as ReactMouseEvent } from 'react'
import MobileHome from '@/components/public/MobileHome'
import { NYC_SERVICE_AREA_SUMMARY } from '@/lib/nycServiceAreas'

type HeroDraft = {
    mobileImageUrl: string | null
    desktopImageUrl: string | null
    focalX: number
    focalY: number
    primaryActionType: string
    primaryActionValue: string
    primaryPosLeft: number
    primaryPosTop: number
    primaryPosWidth: number
    primaryPosHeight: number
    secondaryActionType: string
    secondaryActionValue: string
    secondaryPosLeft: number
    secondaryPosTop: number
    secondaryPosWidth: number
    secondaryPosHeight: number
}

type ContentDraft = Record<string, string>

type Selection =
    | { kind: 'hero'; target: 'image' | 'primary' | 'secondary' }
  | { kind: 'content'; key: string }
        | { kind: 'category'; slug: string }
  | null

type RevisionSummary = {
    id: string
    revisionNumber: number
    isCurrent: boolean
    changeSummary: string | null
    createdAt: string
}

type HomeData = {
    categories: any[]
    popularItems: any[]
    bounceItems: any[]
    packages: any[]
    weddingImage: string | null
}

const CONTENT_LABELS: Record<string, string> = {
    shopCategoryHeading: 'Shop by Category — heading',
    viewAllRentalsButton: 'Shop by Category — View All Rentals button',
    planningEventHeading: 'Planning an Event bar — heading',
    planningEventBody: 'Planning an Event bar — body text',
    planningEventButton: 'Planning an Event bar — button',
    bounceEyebrow: 'Bounce Houses — small label',
    bounceHeading: 'Bounce Houses — heading',
    bounceBody: 'Bounce Houses — body text',
    bounceButton: 'Bounce Houses — button',
    popularHeading: 'Popular Rentals — heading',
    packagesHeading: 'Wedding & Event Packages — heading',
    packagesBody: 'Wedding & Event Packages — body text',
    packagesButton: 'Wedding & Event Packages — button',
    rentingEasyHeading: 'Renting Is Easy — heading',
    step1Label: 'Renting Is Easy — step 1 label',
    step2Label: 'Renting Is Easy — step 2 label',
    step3Label: 'Renting Is Easy — step 3 label',
    weddingBannerHeading: 'Wedding banner — heading',
    weddingBannerBody: 'Wedding banner — body text',
    weddingBannerButton: 'Wedding banner — button',
    trust1Label: 'Trust bar — item 1',
    trust2Label: 'Trust bar — item 2',
    trust3Label: 'Trust bar — item 3',
    eventPlanningEyebrow: 'Full-Service Event Planning — small label',
    eventPlanningHeading: 'Full-Service Event Planning — heading',
    eventPlanningBody: 'Full-Service Event Planning — body text',
    eventPlanningButton: 'Full-Service Event Planning — button',
    youtubeEyebrow: 'YouTube section — small label',
    youtubeHeading: 'YouTube section — heading',
}

const SEO_SECTION = (
    <section className="max-w-4xl mx-auto px-4 py-8 space-y-6 text-sm text-body">
        <p>Friendly Party Rental NYC provides reliable and affordable party rentals in Riverdale, NY and surrounding Downstate New York communities.</p>
        <p>Serving {NYC_SERVICE_AREA_SUMMARY}.</p>
    </section>
  )
  
  const ACTION_PRESETS = [
    { label: 'Check My Date (Order By Date page)', value: '/order-by-date' },
    { label: 'Browse Rentals (Category page)', value: '/category' },
    { label: 'Custom path...', value: '__custom__' },
    ]
    
    function clamp(v: number, min: number, max: number) {
        return Math.min(Math.max(v, min), max)
    }

export default function AdminWebsitePage() {
    const [hero, setHero] = useState<HeroDraft | null>(null)
        const [content, setContent] = useState<ContentDraft | null>(null)
            const [homeData, setHomeData] = useState<HomeData | null>(null)
                const [loading, setLoading] = useState(true)
                    const [selection, setSelection] = useState<Selection>(null)
                        const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
                            const [hasUnpublished, setHasUnpublished] = useState(false)
                                const [publishedRevisionNumber, setPublishedRevisionNumber] = useState(0)
                                    const [revisionCount, setRevisionCount] = useState(0)
                                        const [showHistory, setShowHistory] = useState(false)
                                            const [revisions, setRevisions] = useState<RevisionSummary[]>([])
                                                const [publishing, setPublishing] = useState(false)
                                                    const [uploading, setUploading] = useState(false)
                                                        const [publishSummary, setPublishSummary] = useState<string[] | null>(null)
                                                          
                                                            const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
                                                                const canvasScrollRef = useRef<HTMLDivElement | null>(null)
                                                                    const fileInputRef = useRef<HTMLInputElement | null>(null)
                                                                      
                                                                        useEffect(() => {
                                                                              (async () => {
                                                                                      try {
                                                                                                const [homeRes, dataRes] = await Promise.all([
                                                                                                            fetch('/api/admin/website/home').then((r) => r.json()),
                                                                                                            fetch('/api/admin/website/home/data').then((r) => r.json()),
                                                                                                          ])
                                                                                                          setHero(homeRes.draft.hero)
                                                                                                                    setContent(homeRes.draft.content)
                                                                                                                              setRevisionCount(homeRes.revisionCount)
                                                                                                                                        setPublishedRevisionNumber(homeRes.publishedRevisionNumber)
                                                                                                    const pub = homeRes.published
                                                                                                        const heroChanged = !pub || JSON.stringify(homeRes.draft.hero) !== JSON.stringify(pub.hero)
                                                                                                            const contentChanged = !pub || JSON.stringify(homeRes.draft.content) !== JSON.stringify(pub.content)
                                                                                                                setHasUnpublished(heroChanged || contentChanged)
                                                                                                                    setHomeData(dataRes)
                                                                                        } finally {
                                                                                                setLoading(false)
                                                                                        }
                                                                              })()
                                                                        }, [])
                                                                          
                                                                            const persistDraft = useCallback((nextHero: HeroDraft | null, nextContent: ContentDraft | null) => {
                                                                                  if (saveTimer.current) clearTimeout(saveTimer.current)
                                                                                        setSaveState('saving')
                                                                                              saveTimer.current = setTimeout(async () => {
                                                                                                      try {
                                                                                                                const body: Record<string, unknown> = {}
                                                                                                                          if (nextHero) body.hero = nextHero
                                                                                                                                    if (nextContent) body.content = nextContent
                                                                                                                                              const res = await fetch('/api/admin/website/home', {
                                                                                                                                                          method: 'PUT',
                                                                                                                                                          headers: { 'Content-Type': 'application/json' },
                                                                                                                                                          body: JSON.stringify(body),
                                                                                                                                                })
                                                                                                                                                        setSaveState(res.ok ? 'saved' : 'error')
                                                                                                                                                                  if (res.ok) setHasUnpublished(true)
                                                                                                        } catch {
                                                                                                                setSaveState('error')
                                                                                                        }
                                                                                                }, 600)
                                                                            }, [])
                                                                              
                                                                                function updateHero(patch: Partial<HeroDraft>) {
                                                                                      setHero((prev) => {
                                                                                              const next = { ...(prev as HeroDraft), ...patch }
                                                                                                      persistDraft(next, null)
                                                                                                              return next
                                                                                        })
                                                                                }
  
    function updateContent(key: string, value: string) {
          setContent((prev) => {
                  const next = { ...(prev || {}), [key]: value }
                          persistDraft(null, next)
                                  return next
          })
    }
  
    async function handlePublish() {
          setPublishing(true)
                try {
                        const res = await fetch('/api/admin/website/home/publish', { method: 'POST' })
                                const data = await res.json()
                                        if (res.ok) {
                                                  setPublishedRevisionNumber(data.revision.revisionNumber)
                                                            setRevisionCount((c) => c + 1)
                                                                      setHasUnpublished(false)
                                                                                setPublishSummary(data.changedFields && data.changedFields.length ? data.changedFields : ['No changes from previous revision'])
                                        }
                } finally {
                        setPublishing(false)
                }
    }
  
    async function openHistory() {
          const res = await fetch('/api/admin/website/home/revisions')
                if (res.ok) {
                        const data = await res.json()
                                setRevisions(data.revisions || [])
                }
          setShowHistory(true)
    }
  
    async function handleRestore(revisionId: string) {
          if (!window.confirm('Restore this revision? It will be published as the new live version immediately.')) return
                const res = await fetch('/api/admin/website/home/restore', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ revisionId }),
                })
                      if (res.ok) {
                              const data = await res.json()
                                      setHero(data.revision.hero)
                                              setContent(data.revision.content)
                                                      setPublishedRevisionNumber(data.revision.revisionNumber)
                                                              setRevisionCount((c) => c + 1)
                                                                      setHasUnpublished(false)
                                                                              setShowHistory(false)
                      }
    }
  
    async function handleImageFile(file: File) {
          setUploading(true)
                try {
                        const body = new FormData()
                                body.append('file', file)
                                        const res = await fetch('/api/admin/upload', { method: 'POST', body })
                                                if (res.ok) {
                                                          const data = await res.json()
                                                                    updateHero({ mobileImageUrl: data.url })
                                                }
                } finally {
                        setUploading(false)
                }
    }
  
    function handleCanvasClickCapture(e: ReactMouseEvent<HTMLDivElement>) {
          const anchor = (e.target as HTMLElement).closest('a')
                if (anchor) e.preventDefault()
    }
  
    function handleCanvasClickClearSelection() {
          setSelection(null)
    }
  
    if (loading || !hero || !content || !homeData) {
          return (
                  <div className="flex items-center justify-center h-screen text-gray-500">
                          Loading website editor…
                  </div>
                )
    }
  
    const heroPos = (target: 'primary' | 'secondary') =>
          target === 'primary'
            ? { left: hero.primaryPosLeft, top: hero.primaryPosTop, width: hero.primaryPosWidth, height: hero.primaryPosHeight }
            : { left: hero.secondaryPosLeft, top: hero.secondaryPosTop, width: hero.secondaryPosWidth, height: hero.secondaryPosHeight }
      
        function setHeroPos(target: 'primary' | 'secondary', pos: { left: number; top: number; width: number; height: number }) {
              if (target === 'primary') {
                      updateHero({ primaryPosLeft: pos.left, primaryPosTop: pos.top, primaryPosWidth: pos.width, primaryPosHeight: pos.height })
              } else {
                      updateHero({ secondaryPosLeft: pos.left, secondaryPosTop: pos.top, secondaryPosWidth: pos.width, secondaryPosHeight: pos.height })
              }
        }
  
    return (
          <div className="h-screen flex flex-col bg-gray-100">
                <div className="flex items-center justify-between border-b bg-white px-4 py-3 shrink-0">
                        <div className="flex items-center gap-4">
                                  <Link href="/admin" className="text-sm text-gray-500 hover:text-dark">← Admin</Link>
                                  <span className="font-semibold text-dark">Home</span>
                                  <span className="text-xs text-gray-400 hidden sm:inline">Mobile preview · desktop editing coming soon</span>
                        </div>
                        <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-500 w-20 text-right">
                                    {saveState === 'saving' && 'Saving…'}
                                    {saveState === 'saved' && 'Saved'}
                                    {saveState === 'error' && 'Save failed'}
                                    {saveState === 'idle' && 'Up to date'}
                                  </span>
                                  <button onClick={openHistory} className="px-3 py-2 text-sm rounded border hover:bg-gray-50">History</button>
                                  <button
                                                onClick={handlePublish}
                                                disabled={publishing || !hasUnpublished}
                                                className="px-4 py-2 text-sm rounded bg-pink-600 text-white disabled:opacity-40 font-medium"
                                              >
                                    {publishing ? 'Publishing…' : hasUnpublished ? 'Publish changes' : 'Published'}
                                  </button>
                        </div>
                </div>
          
                <div className="flex flex-1 overflow-hidden">
                        <div
                                    ref={canvasScrollRef}
                                    className="flex-1 overflow-y-auto flex justify-center py-8"
                                    onClickCapture={handleCanvasClickCapture}
                                    onClick={handleCanvasClickClearSelection}
                                  >
                                  <div className="relative bg-white shadow-lg" style={{ width: 390 }}>
                                              <MobileHome
                                                              categories={homeData.categories}
                                                              popularItems={homeData.popularItems}
                                                              bounceItems={homeData.bounceItems}
                                                              packages={homeData.packages}
                                                              weddingImage={homeData.weddingImage}
                                                              seoSection={SEO_SECTION}
                                                              content={content}
                                                              hero={{
                                                                                mobileImageUrl: hero.mobileImageUrl,
                                                                                focalX: hero.focalX,
                                                                                focalY: hero.focalY,
                                                                                primaryActionValue: hero.primaryActionValue,
                                                                                primaryPosLeft: hero.primaryPosLeft,
                                                                                primaryPosTop: hero.primaryPosTop,
                                                                                primaryPosWidth: hero.primaryPosWidth,
                                                                                primaryPosHeight: hero.primaryPosHeight,
                                                                                secondaryActionValue: hero.secondaryActionValue,
                                                                                secondaryPosLeft: hero.secondaryPosLeft,
                                                                                secondaryPosTop: hero.secondaryPosTop,
                                                                                secondaryPosWidth: hero.secondaryPosWidth,
                                                                                secondaryPosHeight: hero.secondaryPosHeight,
                                                              }}
                                                              heroEditMode={{
                                                                                selected: selection && selection.kind === 'hero' ? selection.target : null,
                                                                                onSelect: (target, coords) => {
                                                                                                    setSelection({ kind: 'hero', target })
                                                                                                                        if (target === 'image' && coords) {
                                                                                                                                              updateHero({ focalX: clamp(coords.x / 100, 0, 1), focalY: clamp(coords.y / 100, 0, 1) })
                                                                                                                          }
                                                                                },
                                                              }}
                                                              contentEditMode={{
                                                                                selectedKey: selection && selection.kind === 'content' ? selection.key : null,
                                                                                onSelect: (key) => setSelection({ kind: 'content', key }),
                                                              }}
                                                            categoryEditMode={{
                                                                    selectedSlug: selection && selection.kind === 'category' ? selection.slug : null,
                                                                    onSelect: (slug) => setSelection({ kind: 'category', slug }),
                                                            }}
                                                  />
                                    {selection && selection.kind === 'hero' && (selection.target === 'primary' || selection.target === 'secondary') && (
                                                  <DragPositionOverlay
                                                                    anchorId="mobile-hero-cta"
                                                                    scrollContainerRef={canvasScrollRef}
                                                                    pos={heroPos(selection.target)}
                                                                    onChangePos={(pos) => setHeroPos(selection.target as 'primary' | 'secondary', pos)}
                                                                  />
                                                  )}
                                  </div>
                        </div>
                
                        <div className="w-80 shrink-0 bg-white border-l overflow-y-auto p-4">
                          {!selection && (
                        <div className="text-sm text-gray-500 space-y-2">
                                      <p className="font-medium text-dark">Nothing selected</p>
<p>Click the hero image, either hero button, any text, or a category card to edit it here.</p>
                        </div>
                                  )}
                        
                          {selection && selection.kind === 'hero' && selection.target === 'image' && (
                        <div className="space-y-3">
                                      <p className="text-xs text-gray-400">Home &gt; Hero &gt; Image</p>
                                      <h2 className="font-semibold text-dark">Hero Image</h2>
                                      <p className="text-xs text-gray-500">The headline and button labels are part of this photo, so they can&apos;t be edited as separate text. Replace the whole image below.</p>
                                      <button
                                                        onClick={() => fileInputRef.current?.click()}
                                                        disabled={uploading}
                                                        className="w-full px-3 py-2 text-sm rounded border hover:bg-gray-50 disabled:opacity-40"
                                                      >
                                        {uploading ? 'Uploading…' : 'Replace image'}
                                      </button>
                                      <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        accept="image/*"
                                                        className="hidden"
                                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }}
                                                      />
                                      <p className="text-xs text-gray-500">
                                                      Click anywhere on the image in the preview to move the focal point (the part that stays visible when cropped). Current: {Math.round(hero.focalX * 100)}%, {Math.round(hero.focalY * 100)}%
                                      </p>
                        </div>
                                  )}
                        
                          {selection && selection.kind === 'hero' && (selection.target === 'primary' || selection.target === 'secondary') && (
                        <ButtonEditor
                                        label={selection.target === 'primary' ? 'Home > Hero > Check My Date button' : 'Home > Hero > Browse Rentals button'}
                                        value={selection.target === 'primary' ? hero.primaryActionValue : hero.secondaryActionValue}
                                        pos={heroPos(selection.target)}
                                        onChangeValue={(v) => updateHero(selection.target === 'primary' ? { primaryActionValue: v } : { secondaryActionValue: v })}
                                        onChangePos={(pos) => setHeroPos(selection.target as 'primary' | 'secondary', pos)}
                                      />
                      )}
                        
                          {selection && selection.kind === 'content' && (
                        <div className="space-y-3">
                                      <p className="text-xs text-gray-400">Home &gt; {CONTENT_LABELS[selection.key] || selection.key}</p>
                                      <h2 className="font-semibold text-dark">{CONTENT_LABELS[selection.key] || selection.key}</h2>
                                      <textarea
                                                        className="w-full border rounded px-2 py-2 text-sm min-h-[100px]"
                                                        value={content[selection.key] ?? ''}
                                                        onChange={(e) => updateContent(selection.key, e.target.value)}
                                                      />
                        </div>
                                  )}
                            {selection && selection.kind === 'category' && (
                  <div className="space-y-3">
                          <p className="text-xs text-gray-400">Home &gt; Shop by Category &gt; {homeData?.categories?.find((c: any) => c.slug === selection.slug)?.name || selection.slug}</p>
                          <h2 className="font-semibold text-dark">Category card</h2>
                          <p className="text-xs text-gray-500">This card&apos;s name and image are managed in the Categories section, not this page editor. It links to {homeData?.categories?.find((c: any) => c.slug === selection.slug)?.href}.</p>
                  </div>
                        )}
                        </div>
                </div>
          
            {showHistory && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40" onClick={() => setShowHistory(false)}>
                              <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                                          <div className="flex items-center justify-between mb-4">
                                                        <h2 className="font-semibold text-dark">Home revision history</h2>
                                                        <button onClick={() => setShowHistory(false)} className="text-sm text-gray-500 hover:text-dark">Close</button>
                                          </div>
                                {revisions.length === 0 && <p className="text-sm text-gray-500">No published revisions yet.</p>}
                                          <ul className="space-y-2">
                                            {revisions.map((r) => (
                                      <li key={r.id} className="text-sm border rounded p-3 flex items-start justify-between gap-2">
                                                        <div>
                                                                            <div className="font-medium text-dark">
                                                                                                  Revision #{r.revisionNumber} {r.isCurrent && <span className="text-xs text-green-600">(live)</span>}
                                                                            </div>
                                                                            <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
                                                          {r.changeSummary && <div className="text-xs text-gray-500 mt-1">{r.changeSummary}</div>}
                                                        </div>
                                        {!r.isCurrent && (
                                                            <button onClick={() => handleRestore(r.id)} className="text-xs px-2 py-1 border rounded hover:bg-gray-50 shrink-0">
                                                                                  Restore
                                                            </button>
                                                        )}
                                      </li>
                                    ))}
                                          </ul>
                              </div>
                    </div>
                )}
          
            {publishSummary && (
                    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40" onClick={() => setPublishSummary(null)}>
                              <div className="bg-white rounded-lg p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                                          <h2 className="font-semibold text-dark mb-3">Published — Revision #{publishedRevisionNumber}</h2>
                                          <p className="text-xs text-gray-500 mb-2">Changes included in this publish:</p>
                                          <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                                            {publishSummary.map((f) => <li key={f}>{f}</li>)}
                                          </ul>
                                          <button onClick={() => setPublishSummary(null)} className="mt-4 px-3 py-2 text-sm rounded border hover:bg-gray-50 w-full">
                                                        Done
                                          </button>
                              </div>
                    </div>
                )}
          </div>
        )
}

function ButtonEditor({ label, value, pos, onChangeValue, onChangePos }: {
    label: string
    value: string
    pos: { left: number; top: number; width: number; height: number }
    onChangeValue: (v: string) => void
    onChangePos: (p: { left: number; top: number; width: number; height: number }) => void
}) {
    const isPreset = value === '/order-by-date' || value === '/category'
        return (
              <div className="space-y-4">
                    <p className="text-xs text-gray-400">{label}</p>
                    <h2 className="font-semibold text-dark">Button</h2>
                    <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Where this button goes</label>
                            <select
                                        className="w-full border rounded px-2 py-2 text-sm"
                                        value={isPreset ? value : '__custom__'}
                                        onChange={(e) => onChangeValue(e.target.value === '__custom__' ? '' : e.target.value)}
                                      >
                              {ACTION_PRESETS.map((p) => (
                                                    <option key={p.value} value={p.value}>{p.label}</option>
                                                  ))}
                            </select>
                      {!isPreset && (
                          <input
                                        type="text"
                                        className="w-full border rounded px-2 py-2 text-sm mt-2"
                                        value={value}
                                        onChange={(e) => onChangeValue(e.target.value)}
                                        placeholder="/some-page"
                                      />
                        )}
                    </div>
                    <div>
                            <label className="block text-xs font-medium text-gray-500 mb-2">Position &amp; size (%)</label>
                            <div className="grid grid-cols-2 gap-2">
                                      <NumberField label="Left" value={pos.left} onChange={(v) => onChangePos({ ...pos, left: v })} />
                                      <NumberField label="Top" value={pos.top} onChange={(v) => onChangePos({ ...pos, top: v })} />
                                      <NumberField label="Width" value={pos.width} onChange={(v) => onChangePos({ ...pos, width: v })} />
                                      <NumberField label="Height" value={pos.height} onChange={(v) => onChangePos({ ...pos, height: v })} />
                            </div>
                    </div>
              </div>
            )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
    return (
          <label className="text-xs text-gray-500">
            {label}
                <input
                          type="number"
                          step="0.1"
                          className="w-full border rounded px-2 py-1 text-sm mt-0.5"
                          value={value}
                          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                        />
          </label>
        )
}

function DragPositionOverlay({ anchorId, scrollContainerRef, pos, onChangePos }: {
    anchorId: string
    scrollContainerRef: RefObject<HTMLDivElement | null>
    pos: { left: number; top: number; width: number; height: number }
    onChangePos: (p: { left: number; top: number; width: number; height: number }) => void
}) {
    const [rect, setRect] = useState<DOMRect | null>(null)
        const dragRef = useRef<{ mode: 'move' | 'resize'; startX: number; startY: number; startPos: typeof pos } | null>(null)
          
            const updateRect = useCallback(() => {
                  const el = document.getElementById(anchorId)
                        if (el) setRect(el.getBoundingClientRect())
            }, [anchorId])
              
                useEffect(() => {
                      updateRect()
                            const scrollEl = scrollContainerRef.current
                                  window.addEventListener('resize', updateRect)
                                        scrollEl?.addEventListener('scroll', updateRect)
                                              const interval = setInterval(updateRect, 300)
                                                    return () => {
                                                            window.removeEventListener('resize', updateRect)
                                                                    scrollEl?.removeEventListener('scroll', updateRect)
                                                                            clearInterval(interval)
                                                    }
                }, [updateRect, scrollContainerRef])
                  
                    useEffect(() => {
                          const onMove = (e: PointerEvent) => {
                                  const d = dragRef.current
                                          if (!d || !rect) return
                                                  const dxPct = ((e.clientX - d.startX) / rect.width) * 100
                                                          const dyPct = ((e.clientY - d.startY) / rect.height) * 100
                                                                  if (d.mode === 'move') {
                                                                            onChangePos({
                                                                                        ...d.startPos,
                                                                                        left: clamp(d.startPos.left + dxPct, 0, 100 - d.startPos.width),
                                                                                        top: clamp(d.startPos.top + dyPct, 0, 100 - d.startPos.height),
                                                                            })
                                                                  } else {
                                                                            onChangePos({
                                                                                        ...d.startPos,
                                                                                        width: clamp(d.startPos.width + dxPct, 5, 100 - d.startPos.left),
                                                                                        height: clamp(d.startPos.height + dyPct, 2, 100 - d.startPos.top),
                                                                            })
                                                                  }
                          }
                                const onUp = () => { dragRef.current = null }
                                      window.addEventListener('pointermove', onMove)
                                            window.addEventListener('pointerup', onUp)
                                                  return () => {
                                                          window.removeEventListener('pointermove', onMove)
                                                                  window.removeEventListener('pointerup', onUp)
                                                  }
                    }, [rect, onChangePos])
                      
                        if (!rect) return null
                          
                            const boxLeft = rect.left + (pos.left / 100) * rect.width
                                const boxTop = rect.top + (pos.top / 100) * rect.height
                                    const boxWidth = (pos.width / 100) * rect.width
                                        const boxHeight = (pos.height / 100) * rect.height
                                          
                                            return (
                                                  <div
                                                          style={{ position: 'fixed', left: boxLeft, top: boxTop, width: boxWidth, height: boxHeight, zIndex: 9999 }}
                                                          className="border-2 border-blue-500 bg-blue-500/10 cursor-move"
                                                          onPointerDown={(e) => {
                                                                    e.preventDefault()
                                                                              e.stopPropagation()
                                                                                        dragRef.current = { mode: 'move', startX: e.clientX, startY: e.clientY, startPos: pos }
                                                          }}
                                                        >
                                                        <div
                                                                  style={{ position: 'absolute', right: -7, bottom: -7, width: 14, height: 14 }}
                                                                  className="bg-blue-500 rounded-full border-2 border-white cursor-se-resize"
                                                                  onPointerDown={(e) => {
                                                                              e.preventDefault()
                                                                                          e.stopPropagation()
                                                                                                      dragRef.current = { mode: 'resize', startX: e.clientX, startY: e.clientY, startPos: pos }
                                                                    }}
                                                                />
                                                  </div>
                                                )
                                              }
                                            
