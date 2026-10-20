'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cloud,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  History,
  ImagePlus,
  Images,
  LayoutGrid,
  LayoutPanelLeft,
  MenuSquare,
  Monitor,
  Package,
  PanelRight,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
  Undo2,
  Redo2,
  WandSparkles,
  Wrench,
  X,
} from 'lucide-react'
import type { HomeHero } from '@/components/public/MobileHome'
import ResponsiveHome from '@/components/public/ResponsiveHome'
import WebsitePageStudio from '@/components/admin/WebsitePageStudio'
import HomeSeo from '@/components/public/HomeSeo'
import Header from '@/components/public/Header'
import MobileHeader from '@/components/public/MobileHeader'
import Footer, { DEFAULT_FOOTER_LINKS, type FooterLink } from '@/components/public/Footer'
import { createDraftSaveQueue } from '@/lib/draftSaveQueue'
import {
  HOME_DEFAULTS,
  CUSTOM_HOME_SECTION_KINDS,
  CUSTOM_SECTION_DESIGN_DEFAULTS,
  BUILTIN_HOME_SECTION_DESIGN_DEFAULTS,
  builtInHomeSectionDesign,
  createCustomHomeSection,
  customSectionDesign,
  homeSectionDefinitions,
  orderedHomeSections,
  orderedDesktopHomeSections,
  readCustomHomeSections,
  readBuiltInHomeSectionDesigns,
  type BuiltInHomeSectionDesign,
  type CustomHomeSection,
  type CustomHomeSectionKind,
} from '@/lib/homeLayout'

type Draft = { hero: HomeHero; content: Record<string, string> }
type Selection =
  | { kind: 'section'; id: string }
  | { kind: 'content'; key: string }
  | { kind: 'category'; slug: string }
  | { kind: 'hero'; target: 'image' | 'primary' | 'secondary' }
  | { kind: 'action'; labelKey: string; urlKey: string; urlScope: 'content' | 'hero' }
  | { kind: 'image'; key: string }
  | { kind: 'chrome'; target: 'header' | 'footer' }

type Device = 'mobile' | 'tablet' | 'desktop'
type LeftTab = 'sections' | 'tools'

const TOOLS = [
  { name: 'Planning inquiries', href: '/admin/planning-inquiries', icon: FileText, help: 'Review event-planning leads' },
  { name: 'Planning page', href: '/event-planning', icon: WandSparkles, help: 'Open the public planning experience' },
  { name: 'Website pages', href: '/admin/website?mode=pages', icon: MenuSquare, help: 'Edit and rebuild every public page' },
  { name: 'Image library', href: '/admin/settings/general-images', icon: Images, help: 'Manage reusable website images' },
  { name: 'Inventory', href: '/admin/items', icon: Package, help: 'Rental photos, pricing and visibility' },
  { name: 'Categories', href: '/admin/categories', icon: LayoutGrid, help: 'Manage rental category cards' },
  { name: 'Wedding packages', href: '/admin/wedding-packages', icon: Sparkles, help: 'Edit packages, pricing and photos' },
  { name: 'Advanced pages', href: '/admin/website?mode=pages', icon: Wrench, help: 'Use the complete section library for any page' },
] as const

const HEADER_STYLE_OPTIONS = [
  { value: 1, label: 'Classic logo + navigation' },
  { value: 2, label: 'Compact navigation' },
  { value: 3, label: 'Centered logo navigation' },
  { value: 4, label: 'Navigation only — right' },
  { value: 5, label: 'Cover header — blue foreground' },
  { value: 6, label: 'Classic black & white' },
  { value: 7, label: 'Split classic header' },
  { value: 8, label: 'Cover header — black foreground' },
  { value: 9, label: 'Cover header — white foreground' },
  { value: 10, label: 'Black navigation bar' },
  { value: 11, label: 'Large centered logo' },
  { value: 12, label: 'Logo only + navigation' },
  { value: 13, label: 'Split classic header alt' },
  { value: 14, label: 'Navigation only — centered' },
  { value: 15, label: 'Navigation only — left' },
  { value: 16, label: 'Inline logo left — white text' },
  { value: 17, label: 'Inline logo right — white text' },
  { value: 20, label: 'Inline logo left — black text' },
  { value: 21, label: 'Inline logo right — black text' },
] as const

const FOOTER_STYLE_OPTIONS = [
  { value: 'dark', label: 'Dark footer' },
  { value: 'light-center', label: 'Light centered footer' },
  { value: 'light-links', label: 'Light footer with rental links' },
  { value: 'none', label: 'No footer' },
] as const

const CUSTOM_SECTION_TEMPLATES: { kind: CustomHomeSectionKind; label: string; help: string }[] = [
  { kind: 'text', label: 'Text', help: 'Heading and rich body copy' },
  { kind: 'image', label: 'Image', help: 'Large image with heading and copy' },
  { kind: 'cta', label: 'Call to action', help: 'High-contrast message and button' },
  { kind: 'gallery', label: 'Gallery', help: 'Three-image event gallery' },
  { kind: 'split', label: 'Image + text', help: 'Two-column story with a button' },
  { kind: 'video', label: 'Video', help: 'YouTube showcase section' },
  { kind: 'spacer', label: 'Spacer', help: 'Adjustable vertical breathing room' },
]

const CUSTOM_SECTION_FIELDS: Record<CustomHomeSectionKind, (keyof CustomHomeSection)[]> = {
  text: ['heading', 'body'],
  image: ['heading', 'body', 'imageUrl', 'imageAlt'],
  cta: ['eyebrow', 'heading', 'body', 'buttonLabel', 'buttonUrl'],
  gallery: ['heading', 'body', 'image1Url', 'image1Alt', 'image2Url', 'image2Alt', 'image3Url', 'image3Alt'],
  split: ['eyebrow', 'heading', 'body', 'imageUrl', 'imageAlt', 'buttonLabel', 'buttonUrl'],
  video: ['eyebrow', 'heading', 'body', 'videoId'],
  spacer: ['spacerHeight'],
}

type DraftNavItem = { id: string; label: string; url: string; sortOrder?: number; isActive?: boolean }
type DraftFooterLink = FooterLink & { sortOrder?: number }

function readDraftFooterLinks(raw: string | undefined, fallback: DraftFooterLink[] = DEFAULT_FOOTER_LINKS): DraftFooterLink[] {
  if (!raw) return fallback.map((item, index) => ({ ...item, sortOrder: index * 10, isActive: item.isActive !== false }))
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return fallback
    return parsed
      .filter(item => item && typeof item.id === 'string' && typeof item.label === 'string' && typeof item.url === 'string')
      .map((item, index) => ({ ...item, sortOrder: index * 10, isActive: item.isActive !== false }))
  } catch {
    return fallback
  }
}

function readDraftNavItems(raw: string | undefined, fallback: DraftNavItem[]): DraftNavItem[] {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return fallback
    return parsed
      .filter(item => item && typeof item.id === 'string' && typeof item.label === 'string' && typeof item.url === 'string')
      .map((item, index) => ({ ...item, sortOrder: index * 10, isActive: item.isActive !== false }))
  } catch {
    return fallback
  }
}

const FIELD_LABELS: Record<string, string> = {
  mobileImageUrl: 'Mobile hero image',
  desktopImageUrl: 'Desktop hero image',
  primaryActionValue: 'Primary button destination',
  secondaryActionValue: 'Secondary button destination',
  focalX: 'Horizontal image focus',
  focalY: 'Vertical image focus',
  desktopFocalX: 'Horizontal image focus',
  desktopFocalY: 'Vertical image focus',
  youtubeVideoId: 'YouTube video ID',
  planningEventUrl: 'Button destination',
  categoriesUrl: 'Category destination',
  popularUrl: 'Button destination',
  bounceUrl: 'Button destination',
  stepsUrl: 'Button destination',
  packagesUrl: 'Button destination',
  weddingBannerUrl: 'Button destination',
  eventPlanningUrl: 'Button destination',
  __site_footerBusinessName: 'Business name',
  __site_footerAddress: 'Address',
  __site_footerPhone: 'Phone',
  __site_textNumber: 'Text number',
  __site_footerEmail: 'Email',
  __site_businessHours: 'Business hours',
  __site_footerServiceArea: 'Service area',
  __site_footerFacebook: 'Facebook URL',
  __site_footerYoutube: 'YouTube URL',
  __site_footerYelp: 'Yelp URL',
  __site_logoUrl: 'Site logo',
  __site_stickyBookLabel: 'Sticky bar booking label',
  __site_stickyBookUrl: 'Sticky bar booking destination',
  __site_stickyCallLabel: 'Sticky bar call label',
  __site_mobileHomeLabel: 'Mobile Home label',
  __site_mobileHomeUrl: 'Mobile Home destination',
  __site_mobileCategoriesLabel: 'Mobile Categories label',
  __site_mobileCategoriesUrl: 'Mobile Categories destination',
  __site_mobileSearchLabel: 'Mobile Search label',
  __site_mobileCartLabel: 'Mobile Cart label',
}

function label(key: string) {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key]
  return key
    .replace(/^desktop/, '')
    .replace(/^mobile/, '')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim()
}

function isImageField(key: string) {
  return /Image|_image$|__site_logoUrl$/.test(key)
}

function isLongTextField(key: string) {
  return key.endsWith('Body')
}

function isLinkField(key: string) {
  return /Url$|_href$|ActionValue$|__site_footer(Facebook|Youtube|Yelp)$/.test(key)
}

function fieldHelper(key: string) {
  if (isImageField(key)) return 'Paste a site image path or upload a new image.'
  if (/^__site_footer(Facebook|Youtube|Yelp)$/.test(key)) return 'Use a full https URL, or leave blank to hide this social icon.'
  if (isLinkField(key)) return 'Use a site path such as /category or a full https URL.'
  if (key === 'youtubeVideoId') return 'Paste only the YouTube video ID, not the full URL.'
  return ''
}

function deviceWidth(device: Device) {
  return device === 'desktop' ? 1280 : device === 'tablet' ? 768 : 390
}

function suggestedZoom(device: Device) {
  return device === 'desktop' ? 85 : device === 'tablet' ? 95 : 100
}

export default function WebsiteEditorV3() {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [data, setData] = useState<any>(null)
  const [selection, setSelection] = useState<Selection>({ kind: 'section', id: 'hero' })
  const [device, setDevice] = useState<Device>('desktop')
  const [zoom, setZoom] = useState(85)
  const [save, setSave] = useState('Up to date')
  const [error, setError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [revision, setRevision] = useState(0)
  const [history, setHistory] = useState<any[] | null>(null)
  const [uploading, setUploading] = useState(false)
  const [leftTab, setLeftTab] = useState<LeftTab>('sections')
  const [showLeft, setShowLeft] = useState(false)
  const [showInspector, setShowInspector] = useState(false)
  const [showAddSection, setShowAddSection] = useState(false)
  const [workspaceMode, setWorkspaceMode] = useState<'home' | 'pages'>('home')
  const [passwordAction, setPasswordAction] = useState<'publish' | 'restore' | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [restoreRevisionId, setRestoreRevisionId] = useState<string | null>(null)
  const [passwordBusy, setPasswordBusy] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'pages') setWorkspaceMode('pages')
  }, [])

  const current = useRef<Draft | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const busyRef = useRef(false)
  const uploadTarget = useRef('mobileImageUrl')
  const fileInput = useRef<HTMLInputElement>(null)
  const undo = useRef<Draft[]>([])
  const redo = useRef<Draft[]>([])
  const draftVersion = useRef<string | null>(null)
  const draggedSection = useRef<string | null>(null)

  const queue = useRef(createDraftSaveQueue(async (value: Draft) => {
    const response = await fetch('/api/admin/website/home', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...value, expectedUpdatedAt: draftVersion.current }),
    })
    const saved = await response.json()
    if (!response.ok) throw new Error(saved.error || 'Homepage draft could not be saved.')
    draftVersion.current = saved.draft.updatedAt
  }))

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/admin/website/home', { cache: 'no-store' }),
      fetch('/api/admin/website/home/data', { cache: 'no-store' }),
    ])
      .then(async responses => {
        if (responses.some(r => !r.ok)) throw new Error('Could not load the website editor. Please retry.')
        const [h, d] = await Promise.all(responses.map(r => r.json()))
        if (!active) return
        const next = {
          hero: h.draft.hero,
          content: { ...HOME_DEFAULTS, ...h.draft.content },
        }
        draftVersion.current = h.draft.updatedAt
        current.current = next
        setDraft(next)
        setData(d)
        setRevision(h.publishedRevisionNumber || 0)
        setDirty(
          !h.published ||
          JSON.stringify(h.draft.hero) !== JSON.stringify(h.published.hero) ||
          JSON.stringify(h.draft.content) !== JSON.stringify(h.published.content),
        )
      })
      .catch(e => {
        if (active) setError(e.message)
      })

    return () => {
      active = false
      if (timer.current) clearTimeout(timer.current)
      void queue.current.flush().catch(() => {})
    }
  }, [])

  async function flush() {
    if (timer.current) clearTimeout(timer.current)
    setSave('Saving private draft…')
    try {
      await queue.current.flush()
      setSave('Private draft saved · live unchanged')
      return true
    } catch (e) {
      setSave('Save failed')
      setError(e instanceof Error ? e.message : 'Save failed')
      return false
    }
  }

  function change(next: Draft, record = true) {
    if (busyRef.current || !current.current) return
    if (record) {
      undo.current = [...undo.current.slice(-29), current.current]
      redo.current = []
    }
    current.current = next
    setDraft(next)
    setDirty(true)
    setError('')
    setSave('Saving private draft…')
    queue.current.enqueue(next)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      void flush()
    }, 600)
  }

  const contentChange = (key: string, value: string) => {
    if (!current.current) return
    change({
      ...current.current,
      content: {
        ...current.current.content,
        [key]: value,
        ...(key === 'sectionOrder' ? { sectionOrderCustomized: 'true' } : {}),
      },
    })
  }

  const heroChange = (key: string, value: string | number) => {
    if (!current.current) return
    change({
      ...current.current,
      hero: { ...current.current.hero, [key]: value },
    })
  }

  function travelHistory(direction: 'undo' | 'redo') {
    const source = direction === 'undo' ? undo : redo
    const target = direction === 'undo' ? redo : undo
    const next = source.current.pop()
    if (!next || !current.current) return
    target.current.push(current.current)
    change(next, false)
  }

  useEffect(() => {
    if (save !== 'Saving private draft…' && save !== 'Save failed') return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [save])

  async function loadHistory() {
    const r = await fetch('/api/admin/website/home/revisions', { cache: 'no-store' })
    if (!r.ok) throw new Error('Could not load revisions')
    return (await r.json()).revisions || []
  }

  async function showHistory() {
    try {
      setHistory(await loadHistory())
    } catch (e) {
      setError(String(e))
    }
  }

  async function publishHomepage(password: string) {
    if (busyRef.current) return false
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      if (!await flush()) return false
      const r = await fetch('/api/admin/website/home/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedUpdatedAt: draftVersion.current, adminPassword: password }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Publish failed')
      draftVersion.current = j.draft.updatedAt
      setRevision(j.revision.revisionNumber)
      setDirty(false)
      setSave('Published live')
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Publish failed')
      setSave('Publish blocked')
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function restore(id: string, password: string) {
    if (busyRef.current) return false
    busyRef.current = true
    setBusy(true)
    setError('')
    try {
      if (!await flush()) return false
      const r = await fetch('/api/admin/website/home/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionId: id, expectedUpdatedAt: draftVersion.current, adminPassword: password }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Restore failed')
      const next = {
        hero: j.revision.hero,
        content: { ...HOME_DEFAULTS, ...j.revision.content },
      }
      current.current = next
      setDraft(next)
      draftVersion.current = j.draft.updatedAt
      setRevision(j.revision.revisionNumber)
      setDirty(false)
      setHistory(null)
      undo.current = []
      redo.current = []
      setSave('Restored live')
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed')
      setSave('Restore blocked')
      return false
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  async function reloadLiveHomepageIntoDraft() {
    if (!confirm('Discard the current homepage draft and reload the live homepage? This does not change what customers see.')) return
    setBusy(true)
    setError('')
    try {
      if (timer.current) clearTimeout(timer.current)
      await queue.current.flush().catch(() => {})
      const response = await fetch('/api/admin/website/home', { cache: 'no-store' })
      const home = await response.json()
      if (!response.ok || !home.published) throw new Error(home.error || 'Could not load the live homepage.')
      const next = {
        hero: home.published.hero,
        content: { ...HOME_DEFAULTS, ...home.published.content },
      }
      const saveResponse = await fetch('/api/admin/website/home', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...next, expectedUpdatedAt: home.draft.updatedAt }),
      })
      const saved = await saveResponse.json()
      if (!saveResponse.ok) throw new Error(saved.error || 'Could not reset the draft.')
      draftVersion.current = saved.draft.updatedAt
      current.current = next
      setDraft(next)
      setDirty(false)
      undo.current = []
      redo.current = []
      setSave('Draft reset to live version')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not reload the live homepage.')
    } finally {
      setBusy(false)
    }
  }

  function openPassword(action: 'publish' | 'restore', revisionId?: string) {
    setAdminPassword('')
    setError('')
    setRestoreRevisionId(revisionId || null)
    setPasswordAction(action)
  }

  async function requestOriginalRestore() {
    try {
      const revisions = history || await loadHistory()
      const original = [...revisions].sort((a, b) => a.revisionNumber - b.revisionNumber)[0]
      if (!original) throw new Error('No original homepage revision is available.')
      setHistory(revisions)
      openPassword('restore', original.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not find the original homepage revision.')
    }
  }

  async function confirmPasswordAction() {
    if (!passwordAction || !adminPassword) return
    if (passwordAction === 'restore' && !restoreRevisionId) return
    setPasswordBusy(true)
    const ok = passwordAction === 'publish'
      ? await publishHomepage(adminPassword)
      : await restore(restoreRevisionId!, adminPassword)
    setPasswordBusy(false)
    if (ok) {
      setPasswordAction(null)
      setAdminPassword('')
      setRestoreRevisionId(null)
    }
  }

  async function upload(file: File) {
    setUploading(true)
    const target = uploadTarget.current
    try {
      const body = new FormData()
      body.append('file', file)
      const r = await fetch('/api/admin/upload', { method: 'POST', body })
      const j = await r.json()
      if (!r.ok || !j.url) throw new Error(j.error || 'Upload failed')
      if (target.startsWith('builtin:')) {
        const [, layout, sectionId, key] = target.split(':')
        if ((layout === 'mobile' || layout === 'desktop') && sectionId && key === 'backgroundImage') {
          updateBuiltInSectionDesign(layout, sectionId, { backgroundImage: j.url })
        }
      } else if (target.startsWith('custom:')) {
        const [, sectionId, key] = target.split(':')
        if (sectionId && key) updateCustomSection(sectionId, { [key]: j.url } as Partial<CustomHomeSection>)
      } else if (target.endsWith('ImageUrl')) heroChange(target, j.url)
      else contentChange(target, j.url)
    } catch (e) {
      setError(String(e))
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  useEffect(() => {
    const content = current.current?.content || {}
    const definitions = homeSectionDefinitions(content, device === 'mobile' ? 'mobile' : 'desktop')
    setSelection(previous => {
      if (previous.kind === 'section' && !definitions.some(section => section.id === previous.id)) {
        return { kind: 'section', id: 'hero' }
      }
      if (previous.kind === 'content' && !definitions.some(section => (section.fields as readonly string[]).includes(previous.key))) {
        return { kind: 'section', id: 'hero' }
      }
      if (previous.kind === 'hero') return previous
      return previous
    })
  }, [device, draft?.content.__site_customSections])

  if (!draft || !data) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-slate-100 p-6">
        <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          {error ? (
            <>
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-red-50 text-red-600">
                <AlertCircle size={22} />
              </div>
              <h1 className="mt-4 text-xl font-black text-slate-900">Website builder could not load</h1>
              <p role="alert" className="mt-2 text-sm leading-6 text-slate-600">{error}</p>
              <button className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white" onClick={() => location.reload()}>
                Retry
              </button>
            </>
          ) : (
            <>
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-green-700" />
              <h1 className="mt-4 text-lg font-black text-slate-900">Loading Website Builder</h1>
              <p className="mt-1 text-sm text-slate-500">Preparing your private homepage draft and live reference.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (workspaceMode === 'pages') {
    return <WebsitePageStudio onBack={() => setWorkspaceMode('home')} />
  }

  const mobileLayout = device === 'mobile'
  const layoutKey = mobileLayout ? 'mobile' : 'desktop'
  const definitions = homeSectionDefinitions(draft.content, layoutKey)
  const orderKey = mobileLayout ? 'sectionOrder' : 'desktopSectionOrder'
  const hiddenKey = mobileLayout ? 'hiddenSections' : 'desktopHiddenSections'
  const sections = mobileLayout ? orderedHomeSections(draft.content) : orderedDesktopHomeSections(draft.content)
  const hidden = new Set((draft.content[hiddenKey] || '').split(',').filter(Boolean))
  const hiddenSections = sections.filter(s => hidden.has(s.id))
  const section =
    selection.kind === 'section'
      ? definitions.find(s => s.id === selection.id)
      : selection.kind === 'content'
        ? definitions.find(s => (s.fields as readonly string[]).includes(selection.key))
        : selection.kind === 'hero'
          ? definitions.find(s => s.id === 'hero')
          : selection.kind === 'action'
            ? definitions.find(s => (s.fields as readonly string[]).includes(selection.labelKey) || (s.fields as readonly string[]).includes(selection.urlKey))
            : selection.kind === 'image'
              ? definitions.find(s => (s.fields as readonly string[]).includes(selection.key))
              : null
  const width = deviceWidth(device)
  const fallbackHeaderStyle = Number(data.shellTheme?.headerStyle ?? 1)
  const draftHeaderStyle = Number(draft.content.__site_headerStyle)
  const headerStyle = HEADER_STYLE_OPTIONS.some(option => option.value === draftHeaderStyle) ? draftHeaderStyle : fallbackHeaderStyle
  const footerStyle = FOOTER_STYLE_OPTIONS.some(option => option.value === draft.content.__site_footerStyle)
    ? draft.content.__site_footerStyle
    : (data.shellTheme?.footerStyle || 'dark')
  const shellTheme = {
    ...(data.shellTheme || {}),
    headerStyle,
    footerStyle,
    btnPrimaryColor: draft.content.__site_btnPrimaryColor || data.shellTheme?.btnPrimaryColor || '#F5A31B',
    btnPrimaryColorBg: draft.content.__site_btnPrimaryColorBg || data.shellTheme?.btnPrimaryColorBg || '#F5A31B',
  }
  const navItems = readDraftNavItems(draft.content.__site_navItems, data.navItems || [])
  const activeNavItems = navItems.filter(item => item.isActive !== false)
  const footerLinks = readDraftFooterLinks(draft.content.__site_footerLinks)
  const customSections = readCustomHomeSections(draft.content.__site_customSections)
  const customSection = selection.kind === 'section'
    ? customSections.find(item => item.id === selection.id) || null
    : null
  const customDesign = customSection ? customSectionDesign(customSection) : null
  const builtInSection = selection.kind === 'section' && section && !section.custom ? section : null
  const builtInDesign = builtInSection
    ? builtInHomeSectionDesign(draft.content.__site_builtinSectionStyles, layoutKey, builtInSection.id)
    : null
  const footerFieldDefaults: Record<string, string> = {
    __site_footerBusinessName: data.footerDefaults?.legalName || '',
    __site_footerAddress: data.footerDefaults?.address || '',
    __site_footerPhone: data.footerDefaults?.phone || '',
    __site_textNumber: data.footerDefaults?.text || '',
    __site_footerEmail: data.footerDefaults?.email || '',
    __site_businessHours: data.footerDefaults?.hours || '',
    __site_footerServiceArea: data.footerDefaults?.serviceArea || '',
    __site_footerFacebook: data.footerDefaults?.facebook || '',
    __site_footerYoutube: data.footerDefaults?.youtube || '',
    __site_footerYelp: data.footerDefaults?.yelp || '',
    __site_stickyBookLabel: 'Book Now',
    __site_stickyBookUrl: '/order-by-date',
    __site_stickyCallLabel: 'Call Us',
    __site_mobileHomeLabel: 'Home',
    __site_mobileHomeUrl: '/',
    __site_mobileCategoriesLabel: 'Categories',
    __site_mobileCategoriesUrl: '/category',
    __site_mobileSearchLabel: 'Search',
    __site_mobileCartLabel: 'Cart',
  }
  const logoUrl = draft.content.__site_logoUrl || '/images/logo.png'
  const footerDetails = {
    legalName: draft.content.__site_footerBusinessName ?? footerFieldDefaults.__site_footerBusinessName,
    address: draft.content.__site_footerAddress ?? footerFieldDefaults.__site_footerAddress,
    phone: draft.content.__site_footerPhone ?? footerFieldDefaults.__site_footerPhone,
    text: draft.content.__site_textNumber ?? footerFieldDefaults.__site_textNumber,
    email: draft.content.__site_footerEmail ?? footerFieldDefaults.__site_footerEmail,
    hours: draft.content.__site_businessHours ?? footerFieldDefaults.__site_businessHours,
    serviceArea: draft.content.__site_footerServiceArea ?? footerFieldDefaults.__site_footerServiceArea,
    facebook: draft.content.__site_footerFacebook ?? footerFieldDefaults.__site_footerFacebook,
    youtube: draft.content.__site_footerYoutube ?? footerFieldDefaults.__site_footerYoutube,
    yelp: draft.content.__site_footerYelp ?? footerFieldDefaults.__site_footerYelp,
  }

  const selectedFields = section
    ? selection.kind === 'content'
      ? [selection.key]
      : [...section.fields] as string[]
    : [] as string[]

  const move = (id: string, direction: number) => {
    const ids = sections.map(s => s.id)
    const i = ids.indexOf(id as any)
    const next = i + direction
    if (next < 0 || next >= ids.length) return
    ;[ids[i], ids[next]] = [ids[next], ids[i]]
    contentChange(orderKey, ids.join(','))
  }
  const reorder = (from: string, to: string) => {
    if (from === to) return
    const ids = sections.map(s => String(s.id))
    const sourceIndex = ids.indexOf(from)
    const targetIndex = ids.indexOf(to)
    if (sourceIndex < 0 || targetIndex < 0) return
    ids.splice(sourceIndex, 1)
    ids.splice(targetIndex, 0, from)
    contentChange(orderKey, ids.join(','))
  }
  const moveVisible = (id: string, direction: -1 | 1) => {
    const visibleIds = sections.filter(s => !hidden.has(s.id)).map(s => String(s.id))
    const index = visibleIds.indexOf(id)
    const target = visibleIds[index + direction]
    if (index < 0 || !target) return
    reorder(id, target)
  }


  const selectDevice = (next: Device) => {
    setDevice(next)
    setZoom(suggestedZoom(next))
  }

  const toggleVisibility = (id: string, visible: boolean) => {
    const nextHidden = new Set(hidden)
    if (visible) nextHidden.delete(id)
    else nextHidden.add(id)
    contentChange(hiddenKey, [...nextHidden].join(','))
  }

  function customSectionId(kind: CustomHomeSectionKind) {
    const token = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
    return `custom-${kind}-${token.toLowerCase()}`
  }

  function createSection(kind: CustomHomeSectionKind) {
    if (!current.current || busyRef.current) return
    const id = customSectionId(kind)
    const section = createCustomHomeSection(kind, id, layoutKey)
    const nextSections = [...customSections, section]
    const ids = [...sections.map(item => String(item.id)), id]
    change({
      ...current.current,
      content: {
        ...current.current.content,
        __site_customSections: JSON.stringify(nextSections),
        [orderKey]: ids.join(','),
        ...(mobileLayout ? { sectionOrderCustomized: 'true' } : {}),
      },
    })
    setSelection({ kind: 'section', id })
    setShowAddSection(false)
    setShowInspector(true)
    setTimeout(() => document.querySelector(`[data-home-section="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80)
  }

  function updateCustomSection(id: string, patch: Partial<CustomHomeSection>) {
    if (!current.current) return
    const next = customSections.map(section => section.id === id ? { ...section, ...patch, id: section.id, kind: section.kind, layout: section.layout } : section)
    change({
      ...current.current,
      content: { ...current.current.content, __site_customSections: JSON.stringify(next) },
    })
  }

  function duplicateCustomSection(id: string) {
    if (!current.current) return
    const source = customSections.find(section => section.id === id)
    if (!source) return
    const copyId = customSectionId(source.kind)
    const copy: CustomHomeSection = { ...source, id: copyId, label: `${source.label.slice(0, 73)} copy` }
    const nextSections = [...customSections, copy]
    const ids = sections.map(item => String(item.id))
    const index = ids.indexOf(id)
    ids.splice(index >= 0 ? index + 1 : ids.length, 0, copyId)
    change({
      ...current.current,
      content: {
        ...current.current.content,
        __site_customSections: JSON.stringify(nextSections),
        [orderKey]: ids.join(','),
        ...(mobileLayout ? { sectionOrderCustomized: 'true' } : {}),
      },
    })
    setSelection({ kind: 'section', id: copyId })
    setShowInspector(true)
  }

  function updateBuiltInSectionDesign(
    layout: 'mobile' | 'desktop',
    id: string,
    patch: Partial<Omit<BuiltInHomeSectionDesign, 'layout' | 'id'>>,
  ) {
    if (!current.current) return
    const all = readBuiltInHomeSectionDesigns(current.current.content.__site_builtinSectionStyles)
    const existing = all.find(item => item.layout === layout && item.id === id) || {
      layout,
      id,
      ...BUILTIN_HOME_SECTION_DESIGN_DEFAULTS,
    }
    const nextEntry: BuiltInHomeSectionDesign = {
      ...existing,
      ...patch,
      layout,
      id,
    }
    const rest = all.filter(item => !(item.layout === layout && item.id === id))
    const hasOverrides = Object.entries(nextEntry).some(([key, value]) => key !== 'layout' && key !== 'id' && value !== '')
    const next = hasOverrides ? [...rest, nextEntry] : rest
    change({
      ...current.current,
      content: {
        ...current.current.content,
        __site_builtinSectionStyles: JSON.stringify(next),
      },
    })
  }

  function resetBuiltInSectionDesign(layout: 'mobile' | 'desktop', id: string) {
    if (!current.current) return
    const next = readBuiltInHomeSectionDesigns(current.current.content.__site_builtinSectionStyles)
      .filter(item => !(item.layout === layout && item.id === id))
    change({
      ...current.current,
      content: {
        ...current.current.content,
        __site_builtinSectionStyles: JSON.stringify(next),
      },
    })
  }

  function deleteCustomSection(id: string) {
    if (!current.current) return
    const source = customSections.find(section => section.id === id)
    if (!source || !confirm(`Delete "${source.label}"? You can still undo this before publishing.`)) return
    const removeId = (value: string | undefined) => (value || '').split(',').filter(item => item && item !== id).join(',')
    change({
      ...current.current,
      content: {
        ...current.current.content,
        __site_customSections: JSON.stringify(customSections.filter(section => section.id !== id)),
        sectionOrder: removeId(current.current.content.sectionOrder),
        desktopSectionOrder: removeId(current.current.content.desktopSectionOrder),
        hiddenSections: removeId(current.current.content.hiddenSections),
        desktopHiddenSections: removeId(current.current.content.desktopHiddenSections),
      },
    })
    setSelection({ kind: 'section', id: 'hero' })
    setShowInspector(false)
  }

  const chromeChange = (patch: Record<string, string>) => {
    if (!current.current) return
    change({
      ...current.current,
      content: {
        ...current.current.content,
        __site_headerStyle: String(shellTheme.headerStyle ?? 1),
        __site_footerStyle: String(shellTheme.footerStyle || 'dark'),
        __site_btnPrimaryColor: String(shellTheme.btnPrimaryColor || '#F5A31B'),
        __site_btnPrimaryColorBg: String(shellTheme.btnPrimaryColorBg || '#F5A31B'),
        __site_navItems: JSON.stringify(navItems.map((item, index) => ({ id: item.id, label: item.label, url: item.url, sortOrder: index * 10, isActive: item.isActive !== false }))),
        __site_footerLinks: serializeFooterLinks(footerLinks),
        ...patch,
      },
    })
  }

  const serializeNavItems = (items: DraftNavItem[]) =>
    JSON.stringify(items.map((item, position) => ({
      id: item.id,
      label: item.label,
      url: item.url,
      sortOrder: position * 10,
      isActive: item.isActive !== false,
    })))

  const serializeFooterLinks = (items: DraftFooterLink[]) =>
    JSON.stringify(items.map((item, position) => ({
      id: item.id,
      label: item.label,
      url: item.url,
      sortOrder: position * 10,
      isActive: item.isActive !== false,
    })))

  const addFooterLink = () => {
    if (footerLinks.length >= 30) {
      setError('Footer supports up to 30 rental links.')
      return
    }
    const token = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
    const next = [
      ...footerLinks,
      { id: `footer-${token.toLowerCase()}`, label: 'New footer link', url: '/', sortOrder: footerLinks.length * 10, isActive: true },
    ]
    chromeChange({ __site_footerLinks: serializeFooterLinks(next) })
  }

  const removeFooterLink = (id: string) => {
    const item = footerLinks.find(link => link.id === id)
    if (!item || !confirm(`Remove "${item.label}" from the footer? You can undo this before publishing or restore it from a published revision later.`)) return
    chromeChange({ __site_footerLinks: serializeFooterLinks(footerLinks.filter(link => link.id !== id)) })
  }

  const updateFooterLink = (id: string, patch: Partial<Pick<DraftFooterLink, 'label' | 'url'>>) => {
    chromeChange({
      __site_footerLinks: serializeFooterLinks(footerLinks.map((item, index) =>
        item.id === id ? { ...item, ...patch, sortOrder: index * 10 } : { ...item, sortOrder: index * 10 }
      )),
    })
  }

  const moveFooterLink = (id: string, direction: -1 | 1) => {
    const next = footerLinks.map(item => ({ ...item }))
    const index = next.findIndex(item => item.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    chromeChange({ __site_footerLinks: serializeFooterLinks(next) })
  }

  const toggleFooterLink = (id: string) => {
    const next = footerLinks.map((item, index) =>
      item.id === id
        ? { ...item, isActive: item.isActive === false, sortOrder: index * 10 }
        : { ...item, sortOrder: index * 10 }
    )
    chromeChange({ __site_footerLinks: serializeFooterLinks(next) })
  }

  const addNavItem = () => {
    if (navItems.length >= 40) {
      setError('Navigation supports up to 40 links.')
      return
    }
    const token = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
    const next = [
      ...navItems,
      { id: `nav-${token.toLowerCase()}`, label: 'New link', url: '/', sortOrder: navItems.length * 10, isActive: true },
    ]
    chromeChange({ __site_navItems: serializeNavItems(next) })
  }

  const removeNavItem = (id: string) => {
    const item = navItems.find(nav => nav.id === id)
    if (!item || !confirm(`Remove "${item.label}" from navigation? You can undo this before publishing or restore it from a published revision later.`)) return
    chromeChange({ __site_navItems: serializeNavItems(navItems.filter(nav => nav.id !== id)) })
  }

  const updateNavItem = (id: string, patch: Partial<Pick<DraftNavItem, 'label' | 'url'>>) => {
    const next = navItems.map((item, index) =>
      item.id === id
        ? { ...item, ...patch, sortOrder: index * 10 }
        : { ...item, sortOrder: index * 10 }
    )
    chromeChange({
      __site_navItems: serializeNavItems(next),
    })
  }

  const moveNavItem = (id: string, direction: -1 | 1) => {
    const next = navItems.map(item => ({ ...item }))
    const index = next.findIndex(item => item.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    chromeChange({
      __site_navItems: serializeNavItems(next),
    })
  }

  const toggleNavItem = (id: string) => {
    const next = navItems.map((item, index) =>
      item.id === id
        ? { ...item, isActive: item.isActive === false, sortOrder: index * 10 }
        : { ...item, sortOrder: index * 10 }
    )
    chromeChange({
      __site_navItems: serializeNavItems(next),
    })
  }

  const field = (key: string, heroField = false, emphasized = false) => {
    const value = String(heroField ? draft.hero[key] || '' : (draft.content[key] ?? (key === '__site_logoUrl' ? '/images/logo.png' : footerFieldDefaults[key]) ?? ''))
    const image = isImageField(key)
    const helper = fieldHelper(key)

    return (
      <div
        key={key}
        className={`rounded-2xl border bg-white p-4 transition ${emphasized ? 'border-green-400 ring-4 ring-green-50' : 'border-slate-200'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <label className="block min-w-0 flex-1">
            <span className="block text-xs font-black uppercase tracking-[0.08em] text-slate-600">{label(key)}</span>
            {helper && <span className="mt-1 block text-[11px] leading-4 text-slate-400">{helper}</span>}
          </label>
          {emphasized && (
            <span className="shrink-0 rounded-full bg-green-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-green-700">
              Selected
            </span>
          )}
        </div>

        {image && value && (
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <img src={value} alt="" className="h-32 w-full object-cover" />
          </div>
        )}

        {isLongTextField(key) ? (
          <textarea
            className="mt-3 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium leading-6 text-slate-800 outline-none transition focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-100"
            rows={4}
            value={value}
            onChange={e => contentChange(key, e.target.value)}
          />
        ) : (
          <input
            className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-100"
            value={value}
            onChange={e => heroField ? heroChange(key, e.target.value) : contentChange(key, e.target.value)}
          />
        )}

        {image && (
          <button
            type="button"
            className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-green-500 hover:bg-green-50 disabled:opacity-50"
            disabled={uploading}
            onClick={() => {
              uploadTarget.current = key
              fileInput.current?.click()
            }}
          >
            <ImagePlus size={15} />
            {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
          </button>
        )}
      </div>
    )
  }

  const customField = (key: keyof CustomHomeSection) => {
    if (!customSection) return null
    const value = String(customSection[key] ?? '')
    const image = /^(?:image\d*Url|backgroundImage)$/.test(String(key))
    const long = key === 'body'
    const link = key === 'buttonUrl'
    const spacer = key === 'spacerHeight'
    const displayLabel = key === 'videoId' ? 'YouTube video ID' : label(String(key))
    return (
      <div key={String(key)} className="rounded-2xl border border-slate-200 bg-white p-4">
        <label className="block">
          <span className="block text-xs font-black uppercase tracking-[0.08em] text-slate-600">{displayLabel}</span>
          {image && <span className="mt-1 block text-[11px] leading-4 text-slate-400">Use a site image path or upload an image.</span>}
          {link && <span className="mt-1 block text-[11px] leading-4 text-slate-400">Use a site path or full https URL.</span>}
          {key === 'videoId' && <span className="mt-1 block text-[11px] leading-4 text-slate-400">Paste the 11-character YouTube video ID.</span>}
        </label>
        {image && value ? <img src={value} alt="" className="mt-3 h-32 w-full rounded-xl border border-slate-200 object-cover" /> : null}
        {long ? (
          <textarea
            rows={5}
            className="mt-3 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium leading-6 text-slate-800 outline-none focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-100"
            value={value}
            onChange={event => updateCustomSection(customSection.id, { [key]: event.target.value } as Partial<CustomHomeSection>)}
          />
        ) : (
          <input
            type={spacer ? 'number' : 'text'}
            min={spacer ? 16 : undefined}
            max={spacer ? 320 : undefined}
            className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-100"
            value={value}
            onChange={event => updateCustomSection(customSection.id, { [key]: event.target.value } as Partial<CustomHomeSection>)}
          />
        )}
        {image ? (
          <button
            type="button"
            disabled={uploading}
            className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:border-green-500 hover:bg-green-50 disabled:opacity-50"
            onClick={() => {
              uploadTarget.current = `custom:${customSection.id}:${String(key)}`
              fileInput.current?.click()
            }}
          >
            <ImagePlus size={15} />
            {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
          </button>
        ) : null}
      </div>
    )
  }

  const customDesignNumber = (
    key: 'backgroundOverlay' | 'paddingY' | 'marginY' | 'borderRadius' | 'minHeight',
    title: string,
    min: number,
    max: number,
    suffix = 'px',
  ) => {
    if (!customSection || !customDesign) return null
    const value = String(customDesign[key])
    return (
      <label className="block rounded-xl border border-slate-200 bg-slate-50 p-3">
        <span className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
          <span>{title}</span>
          <span>{value}{suffix}</span>
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={value}
          className="mt-3 w-full accent-green-700"
          onChange={event => updateCustomSection(customSection.id, { [key]: event.target.value } as Partial<CustomHomeSection>)}
        />
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          className="mt-2 min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-green-600"
          onChange={event => updateCustomSection(customSection.id, { [key]: event.target.value } as Partial<CustomHomeSection>)}
        />
      </label>
    )
  }

  const customDesignSelect = (
    key: 'alignment' | 'contentWidth' | 'galleryColumns' | 'splitImagePosition',
    title: string,
    options: { value: string; label: string }[],
  ) => {
    if (!customSection || !customDesign) return null
    return (
      <label className="block">
        <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{title}</span>
        <select
          className="mt-2 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          value={String(customDesign[key])}
          onChange={event => updateCustomSection(customSection.id, { [key]: event.target.value } as Partial<CustomHomeSection>)}
        >
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    )
  }

  const customColor = (key: 'backgroundColor' | 'textColor', title: string) => {
    if (!customSection || !customDesign) return null
    const value = String(customDesign[key])
    return (
      <label className="block">
        <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{title}</span>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            aria-label={title}
            className="h-10 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
            value={value}
            onChange={event => updateCustomSection(customSection.id, { [key]: event.target.value } as Partial<CustomHomeSection>)}
          />
          <input
            key={`${customSection.id}-${key}-${value}`}
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold uppercase text-slate-700 outline-none focus:border-green-600"
            defaultValue={value}
            maxLength={7}
            pattern="^#[0-9A-Fa-f]{6}$"
            onBlur={event => {
              const next = event.target.value.trim()
              if (/^#[0-9a-f]{6}$/i.test(next)) {
                if (next.toLowerCase() !== value.toLowerCase()) updateCustomSection(customSection.id, { [key]: next } as Partial<CustomHomeSection>)
              } else {
                event.target.value = value
                setError('Use a six-digit hex color such as #0B1F3A.')
              }
            }}
          />
        </div>
      </label>
    )
  }

  const builtInDesignNumber = (
    key: 'backgroundOverlay' | 'paddingY' | 'marginY' | 'borderRadius' | 'minHeight',
    title: string,
    min: number,
    max: number,
    fallback: number,
    suffix = 'px',
  ) => {
    if (!builtInSection || !builtInDesign) return null
    const value = String(builtInDesign[key] || '')
    const shown = value === '' ? String(fallback) : value
    return (
      <label className="block rounded-xl border border-slate-200 bg-slate-50 p-3">
        <span className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
          <span>{title}</span>
          <span>{value === '' ? 'Original' : `${value}${suffix}`}</span>
        </span>
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={shown}
          className="mt-3 w-full accent-green-700"
          onChange={event => updateBuiltInSectionDesign(layoutKey, builtInSection.id, { [key]: event.target.value })}
        />
        <div className="mt-2 flex gap-2">
          <input
            type="number"
            min={min}
            max={max}
            value={value}
            placeholder="Original"
            className="min-h-9 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 text-xs font-bold text-slate-700 outline-none focus:border-green-600"
            onChange={event => updateBuiltInSectionDesign(layoutKey, builtInSection.id, { [key]: event.target.value })}
          />
          {value !== '' ? (
            <button
              type="button"
              className="rounded-lg border border-slate-200 bg-white px-2 text-[10px] font-black text-slate-500 hover:bg-slate-100"
              onClick={() => updateBuiltInSectionDesign(layoutKey, builtInSection.id, { [key]: '' })}
            >
              Original
            </button>
          ) : null}
        </div>
      </label>
    )
  }

  const builtInDesignSelect = (
    key: 'alignment' | 'contentWidth',
    title: string,
    options: { value: string; label: string }[],
  ) => {
    if (!builtInSection || !builtInDesign) return null
    return (
      <label className="block">
        <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{title}</span>
        <select
          className="mt-2 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
          value={String(builtInDesign[key] || '')}
          onChange={event => updateBuiltInSectionDesign(layoutKey, builtInSection.id, { [key]: event.target.value })}
        >
          <option value="">Original layout</option>
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    )
  }

  const builtInColor = (key: 'backgroundColor' | 'textColor', title: string, fallback: string) => {
    if (!builtInSection || !builtInDesign) return null
    const value = String(builtInDesign[key] || '')
    return (
      <label className="block">
        <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{title}</span>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="color"
            aria-label={title}
            className="h-10 w-12 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
            value={value || fallback}
            onChange={event => updateBuiltInSectionDesign(layoutKey, builtInSection.id, { [key]: event.target.value })}
          />
          <input
            key={`${layoutKey}-${builtInSection.id}-${key}-${value}`}
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold uppercase text-slate-700 outline-none focus:border-green-600"
            defaultValue={value}
            placeholder="Original"
            maxLength={7}
            pattern="^#[0-9A-Fa-f]{6}$"
            onBlur={event => {
              const next = event.target.value.trim()
              if (!next) {
                updateBuiltInSectionDesign(layoutKey, builtInSection.id, { [key]: '' })
              } else if (/^#[0-9a-f]{6}$/i.test(next)) {
                if (next.toLowerCase() !== value.toLowerCase()) updateBuiltInSectionDesign(layoutKey, builtInSection.id, { [key]: next })
              } else {
                event.target.value = value
                setError('Use a six-digit hex color such as #0B1F3A, or leave it blank for the original section color.')
              }
            }}
          />
        </div>
        {value ? (
          <button
            type="button"
            className="mt-2 text-[10px] font-black text-slate-500 underline"
            onClick={() => updateBuiltInSectionDesign(layoutKey, builtInSection.id, { [key]: '' })}
          >
            Use original {title.toLowerCase()}
          </button>
        ) : <p className="mt-1 text-[10px] text-slate-400">Using this section&apos;s original color.</p>}
      </label>
    )
  }

  const builtInBackgroundField = () => {
    if (!builtInSection || !builtInDesign) return null
    const value = builtInDesign.backgroundImage || ''
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Background image</span>
        <p className="mt-1 text-[10px] leading-4 text-slate-400">Optional. Leave blank to keep the section&apos;s original background.</p>
        {value ? <img src={value} alt="" className="mt-3 h-28 w-full rounded-lg border border-slate-200 object-cover" /> : null}
        <input
          className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-green-600"
          value={value}
          placeholder="Original section background"
          onChange={event => updateBuiltInSectionDesign(layoutKey, builtInSection.id, { backgroundImage: event.target.value })}
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploading}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[10px] font-black text-slate-700 hover:border-green-500 hover:bg-green-50 disabled:opacity-50"
            onClick={() => {
              uploadTarget.current = `builtin:${layoutKey}:${builtInSection.id}:backgroundImage`
              fileInput.current?.click()
            }}
          >
            <ImagePlus size={14} />
            {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
          </button>
          {value ? (
            <button
              type="button"
              className="min-h-9 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-500 hover:bg-slate-100"
              onClick={() => updateBuiltInSectionDesign(layoutKey, builtInSection.id, { backgroundImage: '', backgroundOverlay: '' })}
            >
              Remove background
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  const selectionTitle =
    selection.kind === 'category'
      ? 'Category card'
      : selection.kind === 'hero'
        ? selection.target === 'image'
          ? 'Hero image'
          : selection.target === 'primary'
            ? 'Primary hero button'
            : 'Secondary hero button'
        : selection.kind === 'action'
          ? 'Button settings'
          : selection.kind === 'image'
            ? label(selection.key)
            : selection.kind === 'chrome'
              ? selection.target === 'header' ? 'Site header & navigation' : 'Site footer'
              : customSection?.label || section?.label || 'Homepage settings'

  const saveTone =
    save === 'Save failed'
      ? 'border-red-200 bg-red-50 text-red-700'
      : save === 'Saving private draft…'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  const SaveIcon = save === 'Save failed' ? AlertCircle : save === 'Saving private draft…' ? Cloud : CheckCircle2

  return (
    <div className="bg-slate-100 text-slate-900 xl:h-[calc(100vh-5rem)] xl:overflow-hidden">
      {passwordAction ? (
        <div className="fixed inset-0 z-[300] grid place-items-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Admin confirmation</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              {passwordAction === 'publish' ? 'Publish homepage changes?' : 'Restore this live homepage version?'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {passwordAction === 'publish'
                ? 'Your work is already saved privately. Enter your admin password only when you want customers to see this draft.'
                : 'Restoring changes the live homepage. Enter your admin password to confirm.'}
            </p>
            {error ? <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p> : null}
            <label className="mt-5 block">
              <span className="text-xs font-black text-slate-700">Admin password</span>
              <input
                autoFocus
                type="password"
                autoComplete="current-password"
                value={adminPassword}
                onChange={event => setAdminPassword(event.target.value)}
                onKeyDown={event => { if (event.key === 'Enter') void confirmPasswordAction() }}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={passwordBusy}
                onClick={() => { setPasswordAction(null); setAdminPassword(''); setRestoreRevisionId(null) }}
                className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={passwordBusy || !adminPassword}
                onClick={() => void confirmPasswordAction()}
                className="min-h-10 rounded-xl bg-[#1f6b38] px-4 text-xs font-black text-white disabled:opacity-50"
              >
                {passwordBusy ? 'Verifying…' : passwordAction === 'publish' ? 'Confirm & Publish' : 'Confirm & Restore'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex min-h-full flex-col">
        <header className="z-20 border-b border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-3 sm:px-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1f6b38] text-white shadow-sm">
                <WandSparkles size={21} />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">Website Builder</h1>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">
                    Homepage
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span>Revision #{revision}</span>
                  <span aria-hidden="true">•</span>
                  <span className={dirty ? 'font-bold text-amber-700' : 'font-bold text-emerald-700'}>
                    {dirty ? 'Unpublished changes' : 'Live site is current'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div role="status" className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black ${saveTone}`}>
                <SaveIcon size={15} />
                {save}
              </div>

              <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center border-r border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
                  aria-label="Undo"
                  title="Undo"
                  disabled={!undo.current.length || busy}
                  onClick={() => travelHistory('undo')}
                >
                  <Undo2 size={17} />
                </button>
                <button
                  type="button"
                  className="grid h-10 w-10 place-items-center text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
                  aria-label="Redo"
                  title="Redo"
                  disabled={!redo.current.length || busy}
                  onClick={() => travelHistory('redo')}
                >
                  <Redo2 size={17} />
                </button>
              </div>

              <button
                type="button"
                onClick={showHistory}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
              >
                <History size={16} />
                History
              </button>

              <button
                type="button"
                onClick={() => setWorkspaceMode('pages')}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-black text-violet-800 transition hover:bg-violet-100"
              >
                <FileText size={16} />
                All pages
              </button>

              <a
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                href="/"
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink size={16} />
                Live site
              </a>

              <button
                type="button"
                disabled={busy}
                onClick={() => void reloadLiveHomepageIntoDraft()}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                <RotateCcw size={15} />
                Discard draft / Reload live
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void requestOriginalRestore()}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-800 hover:bg-amber-100 disabled:opacity-40"
              >
                <RotateCcw size={15} />
                Restore original live design
              </button>

              <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600">
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                {save === 'Saving private draft…' ? 'Saving private draft…' : dirty ? 'Private draft · live unchanged' : 'Matches live version'}
              </div>

              <button
                type="button"
                disabled={busy || uploading || !dirty}
                onClick={() => openPassword('publish')}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1f6b38] px-4 text-xs font-black text-white hover:bg-[#18592e] disabled:opacity-50"
              >
                Publish Live
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-t border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800 sm:px-5">
              <span className="inline-flex items-center gap-2"><AlertCircle size={16} />{error}</span>
              {save === 'Save failed' && (
                <button className="rounded-lg bg-white px-3 py-1.5 text-xs font-black shadow-sm" onClick={() => void flush()}>
                  Retry save
                </button>
              )}
            </div>
          )}
        </header>

        <div className="relative min-h-0 flex-1">
          {showLeft && (
            <aside className="fixed bottom-4 left-4 top-[9.75rem] z-[90] w-[min(320px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-slate-200 bg-white shadow-2xl">
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-3">
                <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setLeftTab('sections')}
                    className={`flex min-h-9 items-center justify-center gap-2 rounded-lg text-xs font-black transition ${leftTab === 'sections' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                  >
                    <LayoutPanelLeft size={15} />
                    Sections
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftTab('tools')}
                    className={`flex min-h-9 items-center justify-center gap-2 rounded-lg text-xs font-black transition ${leftTab === 'tools' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                  >
                    <Wrench size={15} />
                    Site tools
                  </button>
                </div>
              </div>

              {leftTab === 'sections' ? (
                <div className="p-3">
                  <div className="mb-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                      {mobileLayout ? 'Mobile homepage' : 'Desktop & tablet'}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Drag sections to reorder. Hide anything you do not want displayed on this layout.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {sections.map((s, i) => {
                      const selected = section?.id === s.id
                      const visible = !hidden.has(s.id)
                      return (
                        <div
                          draggable={!busy}
                          onDragStart={e => {
                            draggedSection.current = s.id
                            e.dataTransfer.setData('text/plain', s.id)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                          onDragOver={e => e.preventDefault()}
                          onDragEnd={() => {
                            draggedSection.current = null
                          }}
                          onDrop={e => {
                            e.preventDefault()
                            const from = draggedSection.current
                            if (!from || from === s.id || busy) return
                            const ids = sections.map(section => String(section.id))
                            const sourceIndex = ids.indexOf(from)
                            const targetIndex = ids.indexOf(s.id)
                            if (sourceIndex < 0 || targetIndex < 0) return
                            ids.splice(sourceIndex, 1)
                            ids.splice(targetIndex, 0, from)
                            draggedSection.current = null
                            contentChange(orderKey, ids.join(','))
                          }}
                          key={s.id}
                          className={`group rounded-2xl border transition ${selected ? 'border-green-500 bg-green-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                        >
                          <div className="flex items-center gap-2 p-2.5">
                            <span className="cursor-grab text-slate-300 group-hover:text-slate-500" title="Drag to reorder">
                              <GripVertical size={17} />
                            </span>
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => {
                                setSelection({ kind: 'section', id: s.id })
                                document.querySelector(`[data-home-section="${s.id}"]`)?.scrollIntoView({
                                  block: 'nearest',
                                  behavior: 'smooth',
                                })
                              }}
                            >
                              <span className="block truncate text-sm font-black text-slate-800">{s.label}</span>
                              <span className={`mt-0.5 block text-[10px] font-bold uppercase tracking-wide ${visible ? 'text-emerald-600' : 'text-slate-400'}`}>
                                {visible ? 'Visible' : 'Hidden'}{s.custom ? ' · Custom' : ''}
                              </span>
                            </button>
                            <button
                              type="button"
                              aria-label={visible ? `Hide ${s.label}` : `Show ${s.label}`}
                              title={visible ? 'Hide section' : 'Show section'}
                              className={`grid h-8 w-8 place-items-center rounded-lg transition ${visible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}
                              disabled={busy}
                              onClick={() => toggleVisibility(s.id, !visible)}
                            >
                              {visible ? <Eye size={15} /> : <EyeOff size={15} />}
                            </button>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 px-2.5 py-1.5">
                            <span className="text-[10px] font-bold text-slate-400">Position {i + 1}</span>
                            <div className="flex items-center gap-1">
                              {s.custom ? (
                                <>
                                  <button
                                    type="button"
                                    className="rounded-lg px-2 py-1 text-[10px] font-black text-slate-500 hover:bg-white"
                                    onClick={() => duplicateCustomSection(s.id)}
                                  >
                                    Copy
                                  </button>
                                  <button
                                    type="button"
                                    className="rounded-lg px-2 py-1 text-[10px] font-black text-red-600 hover:bg-red-50"
                                    onClick={() => deleteCustomSection(s.id)}
                                  >
                                    Delete
                                  </button>
                                </>
                              ) : null}
                              <button
                                type="button"
                                aria-label={`Move ${s.label} up`}
                                className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-white disabled:opacity-20"
                                disabled={i === 0 || busy}
                                onClick={() => move(s.id, -1)}
                              >
                                <ChevronUp size={15} />
                              </button>
                              <button
                                type="button"
                                aria-label={`Move ${s.label} down`}
                                className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 hover:bg-white disabled:opacity-20"
                                disabled={i === sections.length - 1 || busy}
                                onClick={() => move(s.id, 1)}
                              >
                                <ChevronDown size={15} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-3">
                  <div className="mb-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">Website managers</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Jump to the areas that power the public website.</p>
                  </div>
                  <div className="space-y-2">
                    {TOOLS.map(({ name, href, icon: Icon, help }) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-green-300 hover:bg-green-50"
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-black text-slate-800">{name}</span>
                          <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{help}</span>
                        </span>
                        <span className="pt-1 text-slate-300">→</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          )}

          <main className="min-h-0 min-w-0 bg-[#1d232c]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#151a21] px-3 py-2.5 text-white sm:px-4">
              <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
                {([
                  ['desktop', Monitor, 'Desktop'],
                  ['tablet', Tablet, 'Tablet'],
                  ['mobile', Smartphone, 'Mobile'],
                ] as const).map(([value, Icon, name]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => selectDevice(value)}
                    className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs font-black transition ${device === value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                  >
                    <Icon size={15} />
                    <span className="hidden sm:inline">{name}</span>
                  </button>
                ))}
              </div>

              <div className="hidden items-center gap-2 text-[11px] font-bold text-slate-400 lg:flex">
                Click text to type · Add real sections · Hover sections for move/hide/copy/delete
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <button
                    type="button"
                    className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black transition ${showAddSection ? 'border-green-400 bg-green-500/20 text-green-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'}`}
                    onClick={() => setShowAddSection(value => !value)}
                    aria-expanded={showAddSection}
                    aria-haspopup="menu"
                    title="Add or restore a homepage section"
                  >
                    <Plus size={15} />
                    Add section
                    {hiddenSections.length > 0 && <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px]">{hiddenSections.length}</span>}
                  </button>
                  {showAddSection && (
                    <div role="menu" className="absolute right-0 top-11 z-[110] w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
                      <div className="border-b border-slate-100 px-4 py-3">
                        <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Create a new section</p>
                        <p className="mt-1 text-[11px] leading-4 text-slate-400">Adds a real editable block to the {mobileLayout ? 'mobile' : 'desktop & tablet'} homepage draft.</p>
                      </div>
                      <div className="max-h-[28rem] overflow-y-auto p-2">
                        <div className="grid grid-cols-2 gap-2">
                          {CUSTOM_SECTION_TEMPLATES.filter(template => CUSTOM_HOME_SECTION_KINDS.includes(template.kind)).map(template => (
                            <button
                              key={template.kind}
                              type="button"
                              role="menuitem"
                              className="rounded-xl border border-slate-200 px-3 py-3 text-left hover:border-green-300 hover:bg-green-50"
                              onClick={() => createSection(template.kind)}
                            >
                              <span className="block text-sm font-black text-slate-800">{template.label}</span>
                              <span className="mt-1 block text-[10px] leading-4 text-slate-500">{template.help}</span>
                            </button>
                          ))}
                        </div>

                        <div className="my-3 border-t border-slate-100" />
                        <p className="px-2 pb-1 text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Restore hidden sections</p>
                        {hiddenSections.length ? hiddenSections.map(section => (
                          <button
                            key={section.id}
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-black text-slate-700 hover:bg-green-50 hover:text-green-800"
                            onClick={() => {
                              toggleVisibility(section.id, true)
                              setSelection({ kind: 'section', id: section.id })
                              setShowAddSection(false)
                              setTimeout(() => document.querySelector(`[data-home-section="${section.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
                            }}
                          >
                            <span>{section.label}</span>
                            <Plus size={15} />
                          </button>
                        )) : (
                          <p className="px-3 py-3 text-xs font-semibold text-slate-400">No hidden sections on this layout.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  className={`grid h-9 w-9 place-items-center rounded-lg border transition ${showLeft ? 'border-green-400 bg-green-500/20 text-green-200' : 'border-white/10 bg-white/5 text-slate-300'}`}
                  onClick={() => setShowLeft(value => !value)}
                  aria-label="Toggle sections panel"
                  title="Toggle sections panel"
                >
                  <LayoutPanelLeft size={16} />
                </button>

                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-300">
                  Zoom
                  <select
                    className="h-9 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-black text-white outline-none"
                    value={zoom}
                    onChange={e => setZoom(Number(e.target.value))}
                  >
                    {[40, 50, 55, 65, 70, 80, 85, 90, 95, 100].map(z => (
                      <option key={z} value={z} className="text-slate-900">{z}%</option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  className={`grid h-9 w-9 place-items-center rounded-lg border transition ${showInspector ? 'border-green-400 bg-green-500/20 text-green-200' : 'border-white/10 bg-white/5 text-slate-300'}`}
                  onClick={() => setShowInspector(value => !value)}
                  aria-label="Toggle inspector panel"
                  title="Toggle inspector panel"
                >
                  <PanelRight size={16} />
                </button>
              </div>
            </div>

            <div className="h-[calc(100vh-10.1rem)] min-h-[620px] overflow-auto bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.06)_1px,_transparent_1px)] bg-[length:18px_18px] p-4 sm:p-6">
              <div className="mx-auto flex min-h-full w-max items-start justify-center">
                <div
                  className="relative"
                  style={{
                    width: width * zoom / 100,
                    minHeight: 200,
                  }}
                >
                  <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    <span>Live site preview</span>
                    <span>{width}px · {zoom}%</span>
                  </div>

                  <div
                    className={`origin-top-left overflow-hidden rounded-[18px] bg-white shadow-[0_30px_90px_rgba(0,0,0,0.4)] ring-1 ring-white/10 ${busy ? 'pointer-events-none opacity-70' : ''}`}
                    style={{ width, zoom: zoom / 100 }}
                    onClickCapture={event => {
                      const target = event.target as HTMLElement
                      if (target.closest('[data-home-field]')) return
                      const image = target.closest<HTMLElement>('[data-home-image-key]')
                      if (image?.dataset.homeImageKey) {
                        event.preventDefault()
                        event.stopPropagation()
                        setSelection({ kind: 'image', key: image.dataset.homeImageKey })
                        setShowInspector(true)
                        return
                      }
                      const action = target.closest<HTMLElement>('[data-home-action-label]')
                      if (!action) return
                      const labelKey = action.dataset.homeActionLabel
                      const urlKey = action.dataset.homeActionUrl
                      const urlScope = action.dataset.homeActionUrlScope === 'hero' ? 'hero' : 'content'
                      if (!labelKey || !urlKey) return
                      event.preventDefault()
                      event.stopPropagation()
                      setSelection({ kind: 'action', labelKey, urlKey, urlScope })
                      setShowInspector(true)
                    }}
                  >
                    <style
                      dangerouslySetInnerHTML={{
                        __html: `:root { --theme-btn-primary: ${shellTheme.btnPrimaryColor || '#F5A31B'}; --theme-btn-primary-bg: ${shellTheme.btnPrimaryColorBg || '#F5A31B'}; } .btn-primary { background-color: var(--theme-btn-primary-bg) !important; color: ${(shellTheme.btnPrimaryColor || '#F5A31B') === (shellTheme.btnPrimaryColorBg || '#F5A31B') ? '#fff' : (shellTheme.btnPrimaryColor || '#F5A31B')} !important; }`,
                      }}
                    />
                    <div
                      data-website-preview-chrome="header"
                      className={`relative ${selection.kind === 'chrome' && selection.target === 'header' ? 'outline outline-[3px] outline-cyan-400 outline-offset-[-3px]' : 'hover:outline hover:outline-2 hover:outline-cyan-300 hover:outline-offset-[-2px]'}`}
                      onClickCapture={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        setSelection({ kind: 'chrome', target: 'header' })
                        setShowInspector(true)
                      }}
                    >
                      {device === 'mobile'
                        ? <MobileHeader navItems={activeNavItems} logoUrl={logoUrl} details={footerDetails} />
                        : <Header navItems={activeNavItems} headerStyle={shellTheme.headerStyle ?? 1} logoUrl={logoUrl} details={footerDetails} />}
                      <span className="pointer-events-none absolute right-3 top-3 z-[85] rounded-full bg-cyan-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">
                        Edit header
                      </span>
                    </div>
                    <ResponsiveHome
                      {...data}
                      hero={draft.hero}
                      content={draft.content}
                      seoSection={<HomeSeo />}
                      device={device}
                      heroEditMode={{
                        selected: selection.kind === 'hero' ? selection.target : null,
                        onSelect: target => {
                          setSelection({ kind: 'hero', target })
                          setShowInspector(true)
                        },
                      }}
                      contentEditMode={{
                        selectedKey: selection.kind === 'content' ? selection.key : null,
                        onSelect: key => {
                          setSelection({ kind: 'content', key })
                        },
                        onChange: (key, value) => contentChange(key, value),
                      }}
                      categoryEditMode={{
                        selectedSlug: selection.kind === 'category' ? selection.slug : null,
                        onSelect: slug => {
                          setSelection({ kind: 'category', slug })
                          setShowInspector(true)
                        },
                      }}
                      sectionEditMode={{
                        selectedId: section?.id || null,
                        onSelect: id => {
                          setSelection({ kind: 'section', id })
                          setShowInspector(true)
                        },
                        onReorder: reorder,
                        onMove: moveVisible,
                        onHide: id => {
                          toggleVisibility(id, false)
                          setShowInspector(false)
                        },
                        onDuplicate: duplicateCustomSection,
                        onDelete: deleteCustomSection,
                        onCustomChange: updateCustomSection,
                      }}
                    />
                    <div
                      data-website-preview-chrome="footer"
                      className={`relative ${selection.kind === 'chrome' && selection.target === 'footer' ? 'outline outline-[3px] outline-cyan-400 outline-offset-[-3px]' : 'hover:outline hover:outline-2 hover:outline-cyan-300 hover:outline-offset-[-2px]'}`}
                      onClickCapture={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        setSelection({ kind: 'chrome', target: 'footer' })
                        setShowInspector(true)
                      }}
                    >
                      <Footer footerStyle={shellTheme.footerStyle ?? 'dark'} details={footerDetails} footerLinks={footerLinks} logoUrl={logoUrl} />
                      <span className="pointer-events-none absolute right-3 top-3 z-[85] rounded-full bg-cyan-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">
                        Edit footer
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {showInspector && (
            <aside className={`fixed bottom-4 right-4 top-[9.75rem] z-[90] w-[min(390px,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-slate-200 bg-[#f8faf9] shadow-2xl ${busy ? 'pointer-events-none opacity-70' : ''}`}>
              <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-green-50 text-green-700">
                    <PanelRight size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Inspector</p>
                    <h2 className="truncate text-base font-black text-slate-900">{selectionTitle}</h2>
                    {selection.kind === 'content' && (
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">Editing: {label(selection.key)}</p>
                    )}
                    {selection.kind === 'category' && (
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">Category: {selection.slug}</p>
                    )}
                    {selection.kind === 'hero' && (
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">Contextual hero controls</p>
                    )}
                    {selection.kind === 'action' && (
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">Edit button label and destination</p>
                    )}
                    {selection.kind === 'image' && (
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">Replace this image directly</p>
                    )}
                    {selection.kind === 'chrome' && (
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {selection.target === 'header' ? 'Draft header & navigation' : 'Draft footer'}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                    onClick={() => setShowInspector(false)}
                    aria-label="Close inspector"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-3 text-xs leading-5 text-slate-500">
                  <div className="flex items-center gap-2 font-black text-slate-700">
                    <CheckCircle2 size={14} className="text-green-600" />
                    Editing {mobileLayout ? 'mobile' : 'desktop & tablet'}
                  </div>
                  <p className="mt-1">
                    Text and links are shared unless the field is device-specific. Section order and visibility only affect this layout.
                  </p>
                </div>

                {builtInSection && builtInDesign && selection.kind === 'section' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-5 text-cyan-950">
                      This is a built-in homepage section. Its design, order, and visibility can be customized for {mobileLayout ? 'mobile' : 'desktop & tablet'} without changing the other layout. Text fields below remain shared unless they are already device-specific.
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-600">Section design</p>
                          <p className="mt-1 text-[11px] leading-4 text-slate-400">Blank controls preserve the section&apos;s original styling. Any change previews immediately but stays in your private draft until you publish with your admin password.</p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-black text-slate-500 hover:bg-slate-100"
                          onClick={() => resetBuiltInSectionDesign(layoutKey, builtInSection.id)}
                        >
                          Reset
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {builtInColor('backgroundColor', 'Background', '#ffffff')}
                        {builtInColor('textColor', 'Text color', '#0B1F3A')}
                      </div>

                      <div className="mt-4">
                        {builtInBackgroundField()}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {builtInDesignSelect('alignment', 'Text alignment', [
                          { value: 'left', label: 'Left' },
                          { value: 'center', label: 'Center' },
                          { value: 'right', label: 'Right' },
                        ])}
                        {builtInDesignSelect('contentWidth', 'Section width', [
                          { value: 'narrow', label: 'Narrow' },
                          { value: 'normal', label: 'Normal' },
                          { value: 'wide', label: 'Wide' },
                          { value: 'full', label: 'Full width' },
                        ])}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {builtInDesignNumber('paddingY', 'Vertical padding', 0, 200, 48)}
                        {builtInDesignNumber('marginY', 'Outer margin', 0, 200, 0)}
                        {builtInDesignNumber('minHeight', 'Minimum height', 0, 1200, 0)}
                        {builtInDesignNumber('borderRadius', 'Corner radius', 0, 64, 0)}
                      </div>

                      {builtInDesign.backgroundImage ? (
                        <div className="mt-4">
                          {builtInDesignNumber('backgroundOverlay', 'Image overlay', 0, 90, 0, '%')}
                        </div>
                      ) : null}

                      {builtInSection.id === 'hero' ? (
                        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-4 text-amber-900">
                          Hero photo and focal-point controls still use the dedicated hero image tools. These section controls style the hero frame around that content.
                        </p>
                      ) : null}
                    </div>

                    {selectedFields.length ? (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="mb-3 text-xs font-black uppercase tracking-[0.1em] text-slate-600">Section content</p>
                        <div className="space-y-3">
                          {selectedFields.map(key => field(key, false, false))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {customSection && selection.kind === 'section' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-900">
                      This is a custom {customSection.kind} section. Its content, position, visibility, duplicates, and deletion stay in your private draft until you publish with your admin password.
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <label className="block text-xs font-black uppercase tracking-[0.08em] text-slate-600">Section name</label>
                      <input
                        className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                        value={customSection.label}
                        onChange={event => updateCustomSection(customSection.id, { label: event.target.value })}
                      />
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-600">Section design</p>
                          <p className="mt-1 text-[11px] leading-4 text-slate-400">These controls change this block immediately and save directly to the live homepage.</p>
                        </div>
                        <button
                          type="button"
                          className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[10px] font-black text-slate-500 hover:bg-slate-100"
                          onClick={() => updateCustomSection(customSection.id, {
                            ...CUSTOM_SECTION_DESIGN_DEFAULTS[customSection.kind],
                            backgroundImage: '',
                          })}
                        >
                          Reset
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {customColor('backgroundColor', 'Background')}
                        {customColor('textColor', 'Text color')}
                      </div>

                      <div className="mt-4">
                        {customField('backgroundImage')}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {customDesignSelect('alignment', 'Text alignment', [
                          { value: 'left', label: 'Left' },
                          { value: 'center', label: 'Center' },
                          { value: 'right', label: 'Right' },
                        ])}
                        {customDesignSelect('contentWidth', 'Content width', [
                          { value: 'narrow', label: 'Narrow' },
                          { value: 'normal', label: 'Normal' },
                          { value: 'wide', label: 'Wide' },
                          { value: 'full', label: 'Full width' },
                        ])}
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {customDesignNumber('paddingY', 'Vertical padding', 0, 200)}
                        {customDesignNumber('marginY', 'Outer margin', 0, 200)}
                        {customDesignNumber('minHeight', 'Minimum height', 0, 1200)}
                        {customDesignNumber('borderRadius', 'Corner radius', 0, 64)}
                      </div>

                      {customDesign?.backgroundImage ? (
                        <div className="mt-4">
                          {customDesignNumber('backgroundOverlay', 'Image overlay', 0, 90, '%')}
                        </div>
                      ) : null}

                      {customSection.kind === 'gallery' ? (
                        <div className="mt-4">
                          {customDesignSelect('galleryColumns', 'Gallery columns', [
                            { value: '1', label: '1 column' },
                            { value: '2', label: '2 columns' },
                            { value: '3', label: '3 columns' },
                          ])}
                        </div>
                      ) : null}

                      {customSection.kind === 'split' ? (
                        <div className="mt-4">
                          {customDesignSelect('splitImagePosition', 'Image position', [
                            { value: 'left', label: 'Image left' },
                            { value: 'right', label: 'Image right' },
                          ])}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="mb-3 text-xs font-black uppercase tracking-[0.1em] text-slate-600">Section content</p>
                      <div className="space-y-3">
                        {CUSTOM_SECTION_FIELDS[customSection.kind].map(key => customField(key))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"
                        onClick={() => duplicateCustomSection(customSection.id)}
                      >
                        Duplicate section
                      </button>
                      <button
                        type="button"
                        className="min-h-11 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 hover:bg-red-100"
                        onClick={() => deleteCustomSection(customSection.id)}
                      >
                        Delete section
                      </button>
                    </div>
                  </div>
                )}

                {selection.kind === 'image' && (
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-slate-400">Image</p>
                    {field(selection.key, false, true)}
                  </div>
                )}

                {selection.kind === 'chrome' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs leading-5 text-emerald-900">
                      Header and footer changes stay in your private draft until you publish with your admin password.
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Brand logo</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">One logo controls the desktop header, mobile header, and logo-enabled footer styles.</p>
                      </div>
                      <div className="mt-3">{field('__site_logoUrl')}</div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Business details & social links</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">These details are shared by the desktop header, mobile menu, footer, and call bar. Blank social URLs hide those icons.</p>
                      </div>
                      <div className="mt-3 space-y-3">
                        {field('__site_footerBusinessName')}
                        {field('__site_footerAddress')}
                        {field('__site_footerPhone')}
                        {field('__site_textNumber')}
                        {field('__site_footerEmail')}
                        {field('__site_businessHours')}
                        {field('__site_footerServiceArea')}
                        {field('__site_footerFacebook')}
                        {field('__site_footerYoutube')}
                        {field('__site_footerYelp')}
                      </div>
                    </div>

                    {selection.target === 'header' ? (
                      <>
                        <label className="block rounded-2xl border border-slate-200 bg-white p-4">
                          <span className="block text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Header style</span>
                          <select
                            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                            value={shellTheme.headerStyle ?? 1}
                            onChange={event => chromeChange({ __site_headerStyle: event.target.value })}
                          >
                            {HEADER_STYLE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Site navigation</p>
                              <p className="mt-1 text-xs text-slate-500">Desktop and mobile use this same draft list. Add, edit, reorder, hide, or remove links here.</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">{activeNavItems.length}/{navItems.length} live</span>
                              <button
                                type="button"
                                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-[10px] font-black text-emerald-700 hover:bg-emerald-100"
                                onClick={addNavItem}
                              >
                                <Plus size={13} />
                                Add link
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 space-y-3">
                            {navItems.map((item, index) => (
                              <div key={item.id} className={`rounded-xl border p-3 ${item.isActive === false ? 'border-slate-200 bg-slate-100 opacity-70' : 'border-slate-200 bg-slate-50'}`}>
                                <div className="flex items-center gap-2">
                                  <input
                                    aria-label={`Navigation label ${index + 1}`}
                                    className="min-h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                    value={item.label}
                                    onChange={event => updateNavItem(item.id, { label: event.target.value })}
                                  />
                                  <button
                                    type="button"
                                    className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-20"
                                    disabled={index === 0}
                                    onClick={() => moveNavItem(item.id, -1)}
                                    aria-label={`Move ${item.label} up`}
                                  >
                                    <ChevronUp size={15} />
                                  </button>
                                  <button
                                    type="button"
                                    className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-20"
                                    disabled={index === navItems.length - 1}
                                    onClick={() => moveNavItem(item.id, 1)}
                                    aria-label={`Move ${item.label} down`}
                                  >
                                    <ChevronDown size={15} />
                                  </button>
                                </div>
                                <input
                                  aria-label={`Navigation destination ${index + 1}`}
                                  className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                  value={item.url}
                                  onChange={event => updateNavItem(item.id, { url: event.target.value })}
                                />
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black ${item.isActive === false ? 'border-slate-300 bg-white text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                                    onClick={() => toggleNavItem(item.id)}
                                  >
                                    {item.isActive === false ? <EyeOff size={14} /> : <Eye size={14} />}
                                    {item.isActive === false ? 'Hidden from site' : 'Visible on site'}
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 hover:bg-red-100"
                                    onClick={() => removeNavItem(item.id)}
                                  >
                                    <X size={13} />
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-[11px] leading-5 text-slate-500">
                          Navigation changes save privately first. They do not change the live site until you publish with your admin password. Earlier published versions remain restorable.
                        </div>
                      </>
                    ) : (
                      <>
                        <label className="block rounded-2xl border border-slate-200 bg-white p-4">
                          <span className="block text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Footer style</span>
                          <select
                            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-green-600 focus:ring-4 focus:ring-green-100"
                            value={shellTheme.footerStyle || 'dark'}
                            onChange={event => chromeChange({ __site_footerStyle: event.target.value })}
                          >
                            {FOOTER_STYLE_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Footer rental links</p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">Shown in the Light footer with rental links style. Add, edit, reorder, hide, or remove links here.</p>
                            </div>
                            <button
                              type="button"
                              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 text-xs font-black text-green-800 hover:bg-green-100"
                              onClick={addFooterLink}
                            >
                              <Plus size={14} />
                              Add link
                            </button>
                          </div>
                          <div className="mt-3 space-y-3">
                            {footerLinks.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">
                                No footer rental links. Add one when you are ready.
                              </div>
                            ) : footerLinks.map((item, index) => (
                              <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                                    <GripVertical size={13} />
                                    Link {index + 1}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      aria-label={`Move ${item.label} up`}
                                      disabled={index === 0}
                                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 disabled:opacity-30"
                                      onClick={() => moveFooterLink(item.id, -1)}
                                    >
                                      <ChevronUp size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={`Move ${item.label} down`}
                                      disabled={index === footerLinks.length - 1}
                                      className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 disabled:opacity-30"
                                      onClick={() => moveFooterLink(item.id, 1)}
                                    >
                                      <ChevronDown size={14} />
                                    </button>
                                  </div>
                                </div>
                                <input
                                  aria-label={`Footer link ${index + 1} label`}
                                  className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                  value={item.label}
                                  onChange={event => updateFooterLink(item.id, { label: event.target.value })}
                                />
                                <input
                                  aria-label={`Footer link ${index + 1} destination`}
                                  className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                                  value={item.url}
                                  onChange={event => updateFooterLink(item.id, { url: event.target.value })}
                                />
                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-black ${item.isActive === false ? 'border-slate-300 bg-white text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                                    onClick={() => toggleFooterLink(item.id)}
                                  >
                                    {item.isActive === false ? <EyeOff size={14} /> : <Eye size={14} />}
                                    {item.isActive === false ? 'Hidden from footer' : 'Visible in footer'}
                                  </button>
                                  <button
                                    type="button"
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 hover:bg-red-100"
                                    onClick={() => removeFooterLink(item.id)}
                                  >
                                    <X size={13} />
                                    Remove
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-5 text-slate-500">
                            These footer links are part of this website draft and publish with the rest of the footer. Removing one keeps revision history intact.
                          </p>
                        </div>
                      </>
                    )}

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Persistent action bars</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">Customize the desktop sticky buttons and mobile bottom navigation. Search behavior and checkout remain fixed so core customer actions cannot be broken.</p>
                      </div>
                      <div className="mt-3 space-y-3">
                        {field('__site_stickyBookLabel')}
                        {field('__site_stickyBookUrl')}
                        {field('__site_stickyCallLabel')}
                        {field('__site_mobileHomeLabel')}
                        {field('__site_mobileHomeUrl')}
                        {field('__site_mobileCategoriesLabel')}
                        {field('__site_mobileCategoriesUrl')}
                        {field('__site_mobileSearchLabel')}
                        {field('__site_mobileCartLabel')}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Primary button colors</p>
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <label className="text-xs font-bold text-slate-600">
                          Text
                          <input
                            type="color"
                            className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                            value={shellTheme.btnPrimaryColor || '#F5A31B'}
                            onChange={event => chromeChange({ __site_btnPrimaryColor: event.target.value })}
                          />
                        </label>
                        <label className="text-xs font-bold text-slate-600">
                          Background
                          <input
                            type="color"
                            className="mt-2 h-11 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                            value={shellTheme.btnPrimaryColorBg || '#F5A31B'}
                            onChange={event => chromeChange({ __site_btnPrimaryColorBg: event.target.value })}
                          />
                        </label>
                      </div>
                    </div>

                    <Link
                      href="/admin/settings/responsive-editor"
                      className="flex min-h-11 items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 hover:border-green-300 hover:bg-green-50"
                    >
                      Advanced site-wide appearance <span>→</span>
                    </Link>
                  </div>
                )}

                {selection.kind === 'action' && (
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-slate-400">Button</p>
                    <div className="space-y-3">
                      {field(selection.labelKey, false, true)}
                      {field(selection.urlKey, selection.urlScope === 'hero', true)}
                    </div>
                    <p className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-[11px] leading-5 text-cyan-900">
                      Tip: click directly on the button text in the page to type the label inline.
                    </p>
                  </div>
                )}

                {section?.id === 'hero' && (
                  <>
                    {selection.kind === 'hero' && selection.target === 'image' ? (
                      <div>
                        <p className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-slate-400">Hero artwork</p>
                        <div className="space-y-3">
                          {field(mobileLayout ? 'mobileImageUrl' : 'desktopImageUrl', true, true)}
                          {(mobileLayout ? ['focalX', 'focalY'] : ['desktopFocalX', 'desktopFocalY']).map(key => {
                            const value = Number(draft.hero[key] ?? (key === 'desktopFocalY' ? .35 : .5))
                            return (
                              <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">{label(key)}</span>
                                  <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{Math.round(value * 100)}%</span>
                                </div>
                                <input
                                  type="range"
                                  min="0"
                                  max="1"
                                  step=".01"
                                  className="mt-3 w-full accent-green-700"
                                  value={value}
                                  onChange={e => heroChange(key, Number(e.target.value))}
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : selection.kind === 'hero' && selection.target === 'primary' ? (
                      <div className="space-y-3">
                        {field('heroPrimaryLabel')}
                        {field('primaryActionValue', true, true)}
                      </div>
                    ) : selection.kind === 'hero' && selection.target === 'secondary' ? (
                      <div className="space-y-3">
                        {field('heroSecondaryLabel')}
                        {field('secondaryActionValue', true, true)}
                      </div>
                    ) : <>
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Hero content</p>
                        <span className="text-[10px] font-bold text-slate-400">Click preview text to select</span>
                      </div>
                      <div className="space-y-3">
                        {selectedFields.map(key => field(key, false, selection.kind === 'content' && selection.key === key))}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-slate-400">Hero artwork</p>
                      <div className="space-y-3">
                        {field(mobileLayout ? 'mobileImageUrl' : 'desktopImageUrl', true)}
                        {(mobileLayout ? ['focalX', 'focalY'] : ['desktopFocalX', 'desktopFocalY']).map(key => {
                          const value = Number(draft.hero[key] ?? (key === 'desktopFocalY' ? .35 : .5))
                          return (
                            <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-600">{label(key)}</span>
                                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{Math.round(value * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="1"
                                step=".01"
                                className="mt-3 w-full accent-green-700"
                                value={value}
                                onChange={e => heroChange(key, Number(e.target.value))}
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-slate-400">Hero buttons</p>
                      <div className="space-y-3">
                        {field('primaryActionValue', true)}
                        {field('secondaryActionValue', true)}
                      </div>
                    </div>
                    </>}
                  </>
                )}

                {section && !customSection && section.id !== 'hero' && selection.kind !== 'action' && selection.kind !== 'image' && selection.kind !== 'chrome' && (
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Section content</p>
                      {selection.kind === 'content' && (
                        <button
                          type="button"
                          className="text-[11px] font-black text-green-700"
                          onClick={() => setSelection({ kind: 'section', id: section.id })}
                        >
                          Show all fields
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {selectedFields.map(key => field(key, false, selection.kind === 'content' && selection.key === key))}
                    </div>
                  </div>
                )}

                {selection.kind === 'category' && (
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-slate-400">Category card</p>
                    <div className="space-y-3">
                      {field(`category_${selection.slug}_name`)}
                      {field(`category_${selection.slug}_image`)}
                      {field(`category_${selection.slug}_href`)}
                    </div>
                    <Link
                      href="/admin/categories"
                      className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"
                    >
                      Manage inventory category
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                )}

                {section?.id === 'categories' && selection.kind !== 'category' && (
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-xs leading-5 text-cyan-900">
                    Click any category card in the preview to change its homepage label, image or destination.
                  </div>
                )}

                {section?.id === 'popular' && (
                  <Link href="/admin/items" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-700 hover:border-green-300 hover:bg-green-50">
                    Manage rental photos, pricing and visibility <span>→</span>
                  </Link>
                )}

                {section?.id === 'packages' && (
                  <Link href="/admin/wedding-packages" className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-sm font-black text-slate-700 hover:border-green-300 hover:bg-green-50">
                    Edit package contents, photos and pricing <span>→</span>
                  </Link>
                )}
              </div>
            </aside>
          )}
        </div>

        {error && (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
              <p>Your local edits remain in this editor. Reloading discards them.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-xs font-black"
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(current.current, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const link = document.createElement('a')
                    link.href = url
                    link.download = 'homepage-unsaved-draft.json'
                    link.click()
                    setTimeout(() => URL.revokeObjectURL(url), 1000)
                  }}
                >
                  <Save size={14} />
                  Export local draft
                </button>
                <button
                  className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 text-xs font-black"
                  onClick={() => {
                    if (confirm('Discard local edits and reload the latest saved draft?')) location.reload()
                  }}
                >
                  <RotateCcw size={14} />
                  Reload latest draft
                </button>
              </div>
            </div>
          </div>
        )}

        <input
          type="file"
          accept="image/*"
          ref={fileInput}
          className="hidden"
          onChange={e => {
            if (e.target.files?.[0]) void upload(e.target.files[0])
          }}
        />

        {history && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Revision history"
            className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          >
            <div className="max-h-[82vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl">
              <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Published versions</p>
                  <h2 className="text-xl font-black text-slate-900">Revision history</h2>
                </div>
                <button
                  type="button"
                  className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"
                  onClick={() => setHistory(null)}
                  aria-label="Close revision history"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[68vh] overflow-y-auto p-4">
                <div className="space-y-3">
                  {history.map(r => (
                    <div
                      key={r.id}
                      className={`rounded-2xl border p-4 ${r.isCurrent ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white'}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="text-sm font-black text-slate-900">Revision #{r.revisionNumber}</strong>
                            {r.isCurrent && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-green-700">
                                <Check size={11} /> Live
                              </span>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</p>
                        </div>
                        {!r.isCurrent && (
                          <button
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50"
                            disabled={busy}
                            onClick={() => openPassword('restore', r.id)}
                          >
                            Restore this version
                          </button>
                        )}
                      </div>
                      {r.changeSummary && (
                        <p className="mt-3 break-words text-xs leading-5 text-slate-500">{r.changeSummary}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
