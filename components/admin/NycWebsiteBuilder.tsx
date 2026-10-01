'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  History,
  ImagePlus,
  Monitor,
  PanelRight,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Tablet,
  Undo2,
  WandSparkles,
  X,
} from 'lucide-react'
import ResponsiveHome from '@/components/public/ResponsiveHome'
import Header from '@/components/public/Header'
import Footer from '@/components/public/Footer'
import NycHomeSeo from '@/components/public/NycHomeSeo'

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

type Draft = { hero: HeroDraft; content: Record<string, string> }
type Device = 'desktop' | 'tablet' | 'mobile'
type Selection =
  | { kind: 'hero'; target: 'image' | 'primary' | 'secondary' }
  | { kind: 'content'; key: string }
  | { kind: 'category'; slug: string }
  | { kind: 'chrome'; target: 'header' | 'footer' }
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
  desktopCategories?: any[]
  popularItems: any[]
  bounceItems: any[]
  packages: any[]
  weddingImage: string | null
}

const CONTENT_LABELS: Record<string, string> = {
  heroEyebrow: 'Hero eyebrow',
  heroHeading: 'Hero heading',
  heroBody: 'Hero body',
  heroPrimaryLabel: 'Hero primary button',
  heroSecondaryLabel: 'Hero secondary button',
  heroTagline: 'Hero tagline',
  desktopPlanningHeading: 'What are you planning?',
  desktopIntroHeading: 'Desktop intro heading',
  desktopIntroBody: 'Desktop intro body',
  desktopIntroButton: 'Desktop intro button',
  desktopBenefit1Heading: 'Benefit 1 heading',
  desktopBenefit1Body: 'Benefit 1 body',
  desktopBenefit2Heading: 'Benefit 2 heading',
  desktopBenefit2Body: 'Benefit 2 body',
  desktopBenefit3Heading: 'Benefit 3 heading',
  desktopBenefit3Body: 'Benefit 3 body',
  desktopPackagesHeading: 'Desktop packages heading',
  shopCategoryHeading: 'Shop by Category heading',
  viewAllRentalsButton: 'View All Rentals button',
  planningEventHeading: 'Planning an Event heading',
  planningEventBody: 'Planning an Event body',
  planningEventButton: 'Planning an Event button',
  bounceEyebrow: 'Bounce Houses small label',
  bounceHeading: 'Bounce Houses heading',
  bounceBody: 'Bounce Houses body',
  bounceButton: 'Bounce Houses button',
  popularHeading: 'Popular Rentals heading',
  packagesHeading: 'Wedding & Event Packages heading',
  packagesBody: 'Wedding & Event Packages body',
  packagesButton: 'Wedding & Event Packages button',
  rentingEasyHeading: 'Renting Is Easy heading',
  step1Label: 'Renting Is Easy step 1',
  step2Label: 'Renting Is Easy step 2',
  step3Label: 'Renting Is Easy step 3',
  weddingBannerHeading: 'Wedding banner heading',
  weddingBannerBody: 'Wedding banner body',
  weddingBannerButton: 'Wedding banner button',
  trust1Label: 'Trust item 1',
  trust2Label: 'Trust item 2',
  trust3Label: 'Trust item 3',
  eventPlanningEyebrow: 'Event Planning small label',
  eventPlanningHeading: 'Event Planning heading',
  eventPlanningBody: 'Event Planning body',
  eventPlanningButton: 'Event Planning button',
  youtubeEyebrow: 'YouTube small label',
  youtubeHeading: 'YouTube heading',
}

const EDITABLE_TEXT_KEYS = Object.keys(CONTENT_LABELS)

function deviceWidth(device: Device) {
  return device === 'desktop' ? 1280 : device === 'tablet' ? 768 : 390
}

function suggestedZoom(device: Device) {
  return device === 'desktop' ? 85 : device === 'tablet' ? 95 : 100
}

function sameDraft(a: Draft | null, b: Draft | null) {
  return !!a && !!b && JSON.stringify(a) === JSON.stringify(b)
}

export default function NycWebsiteBuilder() {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [published, setPublished] = useState<Draft | null>(null)
  const [homeData, setHomeData] = useState<HomeData | null>(null)
  const [device, setDevice] = useState<Device>('desktop')
  const [zoom, setZoom] = useState(85)
  const [selection, setSelection] = useState<Selection>(null)
  const [showInspector, setShowInspector] = useState(false)
  const [showTextPicker, setShowTextPicker] = useState(false)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [history, setHistory] = useState<RevisionSummary[] | null>(null)
  const [revision, setRevision] = useState(0)
  const [save, setSave] = useState('Up to date')
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pending = useRef<Promise<boolean>>(Promise.resolve(true))
  const undo = useRef<Draft[]>([])
  const redo = useRef<Draft[]>([])
  const current = useRef<Draft | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const dirty = useMemo(() => !sameDraft(draft, published), [draft, published])

  const load = useCallback(async () => {
    setError('')
    try {
      const [homeResponse, dataResponse] = await Promise.all([
        fetch('/api/admin/website/home', { cache: 'no-store' }),
        fetch('/api/admin/website/home/data', { cache: 'no-store' }),
      ])
      if (!homeResponse.ok || !dataResponse.ok) throw new Error('Could not load the website builder.')
      const [home, data] = await Promise.all([homeResponse.json(), dataResponse.json()])
      const next: Draft = {
        hero: home.draft.hero,
        content: home.draft.content || {},
      }
      const live: Draft | null = home.published
        ? { hero: home.published.hero, content: home.published.content || {} }
        : null
      current.current = next
      setDraft(next)
      setPublished(live)
      setHomeData(data)
      setRevision(home.publishedRevisionNumber || 0)
      setSave('Up to date')
      undo.current = []
      redo.current = []
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the website builder.')
    }
  }, [])

  useEffect(() => { void load() }, [load])
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  function queueSave(next: Draft) {
    if (timer.current) clearTimeout(timer.current)
    setSave('Saving private draft…')
    timer.current = setTimeout(() => {
      pending.current = fetch('/api/admin/website/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).then(async response => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}))
          throw new Error(body.error || 'Draft could not be saved.')
        }
        setSave('Private draft saved · live unchanged')
        return true
      }).catch(e => {
        setSave('Save failed')
        setError(e instanceof Error ? e.message : 'Draft could not be saved.')
        return false
      })
    }, 550)
  }

  async function flush() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
      if (current.current) {
        setSave('Saving private draft…')
        pending.current = fetch('/api/admin/website/home', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(current.current),
        }).then(r => r.ok).catch(() => false)
      }
    }
    const ok = await pending.current
    if (!ok) {
      setSave('Save failed')
      return false
    }
    setSave(dirty ? 'Private draft saved · live unchanged' : 'Up to date')
    return true
  }

  function change(next: Draft, record = true) {
    if (!current.current) return
    if (record) {
      undo.current = [...undo.current.slice(-29), current.current]
      redo.current = []
    }
    current.current = next
    setDraft(next)
    setError('')
    queueSave(next)
  }

  function updateContent(key: string, value: string) {
    if (!current.current) return
    change({ ...current.current, content: { ...current.current.content, [key]: value } })
  }

  function updateHero(patch: Partial<HeroDraft>) {
    if (!current.current) return
    change({ ...current.current, hero: { ...current.current.hero, ...patch } })
  }

  function travel(direction: 'undo' | 'redo') {
    if (!current.current) return
    const source = direction === 'undo' ? undo : redo
    const target = direction === 'undo' ? redo : undo
    const next = source.current.pop()
    if (!next) return
    target.current.push(current.current)
    current.current = next
    setDraft(next)
    queueSave(next)
  }

  async function publish() {
    if (!dirty || busy) return
    if (!confirm('Publish this private homepage draft to the live NYC website?')) return
    setBusy(true)
    setError('')
    try {
      if (!await flush()) throw new Error('Finish saving the draft before publishing.')
      const response = await fetch('/api/admin/website/home/publish', { method: 'POST' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Publish failed.')
      const live = current.current ? structuredClone(current.current) : null
      setPublished(live)
      setRevision(result.revision?.revisionNumber || revision + 1)
      setSave('Published live')
      undo.current = []
      redo.current = []
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed.')
    } finally {
      setBusy(false)
    }
  }

  async function reloadLiveIntoDraft() {
    if (!confirm('Discard the private NYC homepage draft and reload the current live homepage?')) return
    setBusy(true)
    try {
      const response = await fetch('/api/admin/website/home', { cache: 'no-store' })
      const home = await response.json()
      if (!response.ok || !home.published) throw new Error(home.error || 'No live homepage version is available.')
      const next: Draft = { hero: home.published.hero, content: home.published.content || {} }
      const saved = await fetch('/api/admin/website/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      })
      if (!saved.ok) throw new Error('Could not reset the private draft.')
      current.current = next
      setDraft(next)
      setPublished(structuredClone(next))
      setSave('Draft reset to live version')
      undo.current = []
      redo.current = []
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reload the live homepage.')
    } finally {
      setBusy(false)
    }
  }

  async function loadHistory() {
    const response = await fetch('/api/admin/website/home/revisions', { cache: 'no-store' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Could not load revision history.')
    setHistory(data.revisions || [])
  }

  async function restoreRevision(id: string) {
    if (!confirm('Restore this revision as the live NYC homepage? A new revision will be created and history will be preserved.')) return
    setBusy(true)
    try {
      const response = await fetch('/api/admin/website/home/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId: id }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not restore this revision.')
      const next: Draft = { hero: result.revision.hero, content: result.revision.content || {} }
      current.current = next
      setDraft(next)
      setPublished(structuredClone(next))
      setRevision(result.revision.revisionNumber)
      setHistory(null)
      setSave('Restored live')
      undo.current = []
      redo.current = []
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore this revision.')
    } finally {
      setBusy(false)
    }
  }

  async function restoreOriginal() {
    try {
      const response = await fetch('/api/admin/website/home/revisions', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not load revision history.')
      const revisions: RevisionSummary[] = data.revisions || []
      const oldest = revisions[revisions.length - 1]
      if (!oldest) throw new Error('No original live revision is available.')
      await restoreRevision(oldest.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not restore the original live design.')
    }
  }

  async function uploadHero(file: File) {
    setUploading(true)
    setError('')
    try {
      const body = new FormData()
      body.append('file', file)
      const response = await fetch('/api/admin/upload', { method: 'POST', body })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Image upload failed.')
      if (device === 'desktop' || device === 'tablet') updateHero({ desktopImageUrl: data.url })
      else updateHero({ mobileImageUrl: data.url })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function selectDevice(next: Device) {
    setDevice(next)
    setZoom(suggestedZoom(next))
  }

  if (!draft || !homeData) {
    return <div className="min-h-[70vh] bg-slate-100 p-8">
      <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {error ? <>
          <AlertCircle className="mx-auto text-red-600" />
          <h1 className="mt-4 text-xl font-black">Website builder could not load</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button onClick={() => void load()} className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white">Retry</button>
        </> : <>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-green-700" />
          <h1 className="mt-4 text-lg font-black">Loading Website Builder</h1>
        </>}
      </div>
    </div>
  }

  const width = deviceWidth(device)
  const scaledWidth = width * zoom / 100
  const scaledHeight = Math.max(720, 1100 * zoom / 100)
  const saveTone = save === 'Save failed'
    ? 'border-red-200 bg-red-50 text-red-700'
    : save.includes('Saving')
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700'
  const selectedContentKey = selection?.kind === 'content' ? selection.key : ''

  return <div className="bg-slate-100 text-slate-900 xl:min-h-[calc(100vh-5rem)]">
    <header className="z-20 border-b border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1f6b38] text-white shadow-sm">
            <WandSparkles size={21} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">Website Builder</h1>
              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Homepage</span>
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>Revision #{revision}</span><span>•</span>
              <span className={dirty ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>
                {dirty ? 'Unpublished changes' : 'Live site is current'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="status" className={'inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black ' + saveTone}>
            <Save size={15} />{save}
          </div>
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
            <button aria-label="Undo" title="Undo" disabled={!undo.current.length || busy} onClick={() => travel('undo')} className="grid h-10 w-10 place-items-center border-r border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"><Undo2 size={17}/></button>
            <button aria-label="Redo" title="Redo" disabled={!redo.current.length || busy} onClick={() => travel('redo')} className="grid h-10 w-10 place-items-center text-slate-600 hover:bg-slate-50 disabled:opacity-30"><Redo2 size={17}/></button>
          </div>
          <button onClick={() => void loadHistory()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"><History size={16}/>History</button>
          <Link href="/admin/settings/website-pages" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-black text-violet-800 hover:bg-violet-100"><FileText size={16}/>All pages</Link>
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"><ExternalLink size={16}/>Live site</a>
          <button disabled={busy} onClick={() => void reloadLiveIntoDraft()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"><RotateCcw size={15}/>Discard draft / Reload live</button>
          <button disabled={busy} onClick={() => void restoreOriginal()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-800 hover:bg-amber-100 disabled:opacity-40"><RotateCcw size={15}/>Restore original live design</button>
          <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600">
            <span className={'h-2 w-2 rounded-full ' + (dirty ? 'bg-amber-400' : 'bg-slate-400')} />
            {dirty ? 'Private draft · live unchanged' : 'Matches live version'}
          </div>
          <button disabled={busy || uploading || !dirty} onClick={() => void publish()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1f6b38] px-4 text-xs font-black text-white hover:bg-[#18592e] disabled:opacity-50">Publish Live</button>
        </div>
      </div>
      {error && <div role="alert" className="flex items-center gap-2 border-t border-red-100 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-800"><AlertCircle size={16}/>{error}</div>}
    </header>

    <main className="min-h-[calc(100vh-13rem)] bg-[#1d232c]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#151a21] px-3 py-2.5 text-white sm:px-4">
        <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
          {([
            ['desktop', Monitor, 'Desktop'],
            ['tablet', Tablet, 'Tablet'],
            ['mobile', Smartphone, 'Mobile'],
          ] as const).map(([value, Icon, name]) => <button
            key={value}
            type="button"
            onClick={() => selectDevice(value)}
            className={'inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-black transition ' + (device === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white')}
          ><Icon size={15}/><span>{name}</span></button>)}
        </div>

        <div className="hidden items-center gap-2 text-[11px] font-bold text-slate-400 lg:flex">
          Edit the real NYC homepage · Changes stay private until Publish Live
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setShowAddMenu(v => !v)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-black text-slate-300 hover:bg-white/10 hover:text-white"><Plus size={15}/>Add section</button>
            {showAddMenu && <div className="absolute right-0 top-11 z-[120] w-72 rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl">
              <p className="px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400">Homepage tools</p>
              <button onClick={() => { setShowTextPicker(true); setShowAddMenu(false) }} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-black hover:bg-green-50">Edit homepage text</button>
              <Link href="/admin/settings/general-images" className="block rounded-xl px-3 py-2.5 text-sm font-black hover:bg-green-50">Image library</Link>
              <Link href="/admin/categories" className="block rounded-xl px-3 py-2.5 text-sm font-black hover:bg-green-50">Categories</Link>
              <Link href="/admin/wedding-packages" className="block rounded-xl px-3 py-2.5 text-sm font-black hover:bg-green-50">Wedding packages</Link>
              <p className="px-3 py-2 text-[10px] leading-4 text-slate-400">NYC uses the same live homepage sections customers see. Use All pages for separate page building.</p>
            </div>}
          </div>
          <button onClick={() => setShowInspector(v => !v)} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10" title="Toggle inspector"><PanelRight size={16}/></button>
          <label className="flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-xs font-black text-slate-300">
            Zoom
            <select value={zoom} onChange={e => setZoom(Number(e.target.value))} className="bg-transparent text-white outline-none">
              {[50,65,75,85,95,100].map(v => <option key={v} value={v} className="text-slate-900">{v}%</option>)}
            </select>
          </label>
        </div>
      </div>

      <div className="relative min-h-[800px] overflow-auto bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.08)_1px,transparent_0)] bg-[size:20px_20px] px-4 py-8">
        <div className="mx-auto" style={{ width: scaledWidth, minHeight: scaledHeight }}>
          <div
            className="origin-top-left overflow-hidden bg-white shadow-2xl"
            style={{ width, transform: 'scale(' + zoom / 100 + ')' }}
            onClickCapture={event => {
              const target = event.target as HTMLElement
              if (target.closest('a,button')) event.preventDefault()
            }}
          >
            {device !== 'mobile' && <div
              data-website-preview-chrome="header"
              className={selection?.kind === 'chrome' && selection.target === 'header' ? 'relative outline outline-[3px] outline-cyan-400 outline-offset-[-3px]' : 'relative hover:outline hover:outline-2 hover:outline-cyan-300 hover:outline-offset-[-2px]'}
              onClickCapture={event => {
                event.preventDefault()
                event.stopPropagation()
                setSelection({ kind: 'chrome', target: 'header' })
                setShowInspector(true)
              }}
            >
              <Header />
              <span className="pointer-events-none absolute right-3 top-3 z-[85] rounded-full bg-cyan-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">Edit header</span>
            </div>}
            <ResponsiveHome
              {...homeData}
              hero={draft.hero}
              content={draft.content}
              seoSection={<NycHomeSeo />}
              device={device}
              heroEditMode={{
                selected: selection?.kind === 'hero' ? selection.target : null,
                onSelect: target => { setSelection({ kind:'hero', target }); setShowInspector(true) },
              }}
              contentEditMode={{
                selectedKey: selectedContentKey,
                onSelect: key => { setSelection({ kind:'content', key }); setShowInspector(true) },
              }}
              categoryEditMode={{
                selectedSlug: selection?.kind === 'category' ? selection.slug : null,
                onSelect: slug => { setSelection({ kind:'category', slug }); setShowInspector(true) },
              }}
            />
            <div
              data-website-preview-chrome="footer"
              className={selection?.kind === 'chrome' && selection.target === 'footer' ? 'relative outline outline-[3px] outline-cyan-400 outline-offset-[-3px]' : 'relative hover:outline hover:outline-2 hover:outline-cyan-300 hover:outline-offset-[-2px]'}
              onClickCapture={event => {
                event.preventDefault()
                event.stopPropagation()
                setSelection({ kind: 'chrome', target: 'footer' })
                setShowInspector(true)
              }}
            >
              <Footer />
              <span className="pointer-events-none absolute right-3 top-3 z-[85] rounded-full bg-cyan-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">Edit footer</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    {showInspector && <aside className="fixed bottom-4 right-4 top-[11rem] z-[140] w-[min(390px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-slate-200 bg-[#f8faf9] shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-green-50 text-green-700"><PanelRight size={18}/></div>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Inspector</p><h2 className="text-base font-black text-slate-900">{selection?.kind === 'content' ? CONTENT_LABELS[selection.key] || selection.key : selection?.kind === 'hero' ? 'Hero' : selection?.kind === 'category' ? 'Category card' : selection?.kind === 'chrome' ? (selection.target === 'header' ? 'Header' : 'Footer') : 'Homepage'}</h2></div>
        <button onClick={() => setShowInspector(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white"><X size={16}/></button>
      </div>
      <div className="space-y-4 p-4">
        {!selection && <>
          <p className="text-sm leading-6 text-slate-600">Click editable content directly in Desktop, Tablet, or Mobile preview, or choose a homepage field below.</p>
          <button onClick={() => setShowTextPicker(true)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800">Choose homepage text</button>
          <button onClick={() => { setSelection({kind:'hero',target:'image'}); fileInput.current?.click() }} className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-800"><ImagePlus size={17}/>Replace {device === 'mobile' ? 'mobile' : 'desktop'} hero image</button>
        </>}
        {selection?.kind === 'content' && <label className="block text-sm font-black text-slate-700">{CONTENT_LABELS[selection.key] || selection.key}<textarea value={draft.content[selection.key] || ''} onChange={e => updateContent(selection.key,e.target.value)} className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal outline-none focus:border-green-600"/></label>}
        {selection?.kind === 'hero' && selection.target === 'image' && <>
          <p className="text-sm leading-6 text-slate-600">Replace the hero artwork used for this preview layout.</p>
          <button onClick={() => fileInput.current?.click()} disabled={uploading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1f6b38] px-4 py-3 text-sm font-black text-white disabled:opacity-50"><ImagePlus size={17}/>{uploading ? 'Uploading…' : 'Upload hero image'}</button>
        </>}
        {selection?.kind === 'hero' && selection.target !== 'image' && <>
          <label className="block text-sm font-black text-slate-700">Button destination<input value={selection.target === 'primary' ? draft.hero.primaryActionValue : draft.hero.secondaryActionValue} onChange={e => updateHero(selection.target === 'primary' ? {primaryActionValue:e.target.value} : {secondaryActionValue:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-normal"/></label>
        </>}
        {selection?.kind === 'category' && <p className="text-sm leading-6 text-slate-600">Category card content is managed from <Link href="/admin/categories" className="font-bold text-green-700 underline">Categories</Link>. This preview always uses the current NYC category data.</p>}
        {selection?.kind === 'chrome' && selection.target === 'header' && <div className="space-y-3">
          <p className="text-sm leading-6 text-slate-600">The preview header is live NYC website chrome. Manage its navigation and business-facing assets from the admin tools below.</p>
          <Link href="/admin/settings/navigation-editor" className="block rounded-xl bg-[#1f6b38] px-4 py-3 text-center text-sm font-black text-white">Edit navigation</Link>
          <Link href="/admin/settings/general-images" className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-800">Manage website images</Link>
        </div>}
        {selection?.kind === 'chrome' && selection.target === 'footer' && <div className="space-y-3">
          <p className="text-sm leading-6 text-slate-600">The preview footer uses the NYC business identity and service-area content.</p>
          <Link href="/admin/settings/company-info" className="block rounded-xl bg-[#1f6b38] px-4 py-3 text-center text-sm font-black text-white">Edit company information</Link>
          <Link href="/admin/settings/navigation-editor" className="block rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-black text-slate-800">Edit navigation links</Link>
        </div>}
      </div>
    </aside>}

    {showTextPicker && <div className="fixed inset-0 z-[180] grid place-items-center bg-black/55 p-4" onClick={() => setShowTextPicker(false)}>
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Homepage text</p><h2 className="text-xl font-black">Choose something to edit</h2></div><button onClick={() => setShowTextPicker(false)} className="grid h-9 w-9 place-items-center rounded-xl border"><X size={16}/></button></div>
        <div className="grid gap-2 sm:grid-cols-2">
          {EDITABLE_TEXT_KEYS.filter(key => key in draft.content).map(key => <button key={key} onClick={() => { setSelection({kind:'content',key}); setShowInspector(true); setShowTextPicker(false) }} className="rounded-xl border border-slate-200 px-3 py-3 text-left text-sm font-black hover:border-green-300 hover:bg-green-50">{CONTENT_LABELS[key] || key}</button>)}
        </div>
      </div>
    </div>}

    <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={e => { const file=e.target.files?.[0]; if(file) void uploadHero(file); e.currentTarget.value='' }} />

    {history && <div className="fixed inset-0 z-[190] grid place-items-center bg-black/55 p-4" onClick={() => setHistory(null)}>
      <div className="max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Homepage history</p><h2 className="text-xl font-black">Published revisions</h2></div><button onClick={() => setHistory(null)} className="grid h-9 w-9 place-items-center rounded-xl border"><X size={16}/></button></div>
        <div className="space-y-2">
          {history.length === 0 && <p className="text-sm text-slate-500">No published revisions yet.</p>}
          {history.map(item => <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="text-sm font-black">Revision #{item.revisionNumber} {item.isCurrent && <span className="text-xs text-green-700">(live)</span>}</p><p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</p>{item.changeSummary && <p className="mt-1 text-xs text-slate-500">{item.changeSummary}</p>}</div>{!item.isCurrent && <button onClick={() => void restoreRevision(item.id)} className="shrink-0 rounded-lg border px-3 py-2 text-xs font-black hover:bg-slate-50">Restore live</button>}</div>)}
        </div>
      </div>
    </div>}
  </div>
}
