'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ClipboardPaste,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  History,
  ImagePlus,
  LayoutTemplate,
  Monitor,
  Plus,
  Smartphone,
  Tablet,
  Redo2,
  RotateCcw,
  Search,
  Trash2,
  Undo2,
  X,
} from 'lucide-react'
import PageBuilderContent from '@/components/public/PageBuilderContent'
import {
  PAGE_BUILDER_BLOCK_TYPES,
  createPageBuilderDocument,
  isBuilderOverrideAllowed,
  isWebsiteEditorCustomPagePathAllowed,
  newPageBuilderBlock,
  normalizeBuilderPath,
  parsePageBuilderDocument,
  routeOverrideSlug,
  type PageBuilderBlock,
  type PageBuilderBlockType,
  type PageBuilderDocument,
  type PageBuilderRevision,
  type PageBuilderSettings,
} from '@/lib/pageBuilder'

interface PageIndexItem {
  path: string
  title: string
  group: string
  image?: string | null
  overrideId?: string
  overridePublished?: boolean
  customPageId?: string
  customPagePublished?: boolean
  hasUnpublishedChanges?: boolean
  homePage?: boolean
}

type PagePreviewDevice = 'desktop' | 'tablet' | 'mobile'

interface WebsitePageRecord {
  id: string
  slug: string
  title: string
  content: string | null
  isPublished: boolean
  updatedAt?: string
}

function documentHasUnpublishedChanges(doc: PageBuilderDocument) {
  return (
    doc.draftTitle !== doc.publishedTitle ||
    JSON.stringify(doc.draftBlocks) !== JSON.stringify(doc.publishedBlocks) ||
    JSON.stringify(doc.draftSettings) !== JSON.stringify(doc.publishedSettings)
  )
}

function pageListStatus(item: PageIndexItem) {
  if (item.homePage && item.hasUnpublishedChanges) {
    return { label: 'Draft + live', className: 'bg-amber-100 text-amber-900' }
  }
  if (item.homePage) {
    return { label: 'Live', className: 'bg-green-100 text-green-800' }
  }
  if (item.hasUnpublishedChanges && item.overridePublished) {
    return { label: 'Draft + remodeled live', className: 'bg-amber-100 text-amber-900' }
  }
  if (item.hasUnpublishedChanges && item.group === 'Main website') {
    return { label: 'Draft + original live', className: 'bg-amber-100 text-amber-900' }
  }
  if (item.hasUnpublishedChanges && item.customPagePublished) {
    return { label: 'Draft + live', className: 'bg-amber-100 text-amber-900' }
  }
  if (item.hasUnpublishedChanges || ((item.overrideId || item.customPageId) && !item.overridePublished && !item.customPagePublished)) {
    return { label: 'Private draft', className: 'bg-amber-100 text-amber-800' }
  }
  if (item.overridePublished) return { label: 'Remodeled live', className: 'bg-green-100 text-green-800' }
  if (item.customPagePublished) return { label: 'Live', className: 'bg-green-100 text-green-800' }
  if (item.group === 'Main website') return { label: 'Original live', className: 'bg-slate-100 text-slate-600' }
  return { label: 'Draft', className: 'bg-amber-100 text-amber-800' }
}

const BLOCK_LABELS: Record<PageBuilderBlockType, string> = {
  hero: 'Hero / banner',
  heading: 'Heading',
  text: 'Text',
  image: 'Image',
  textImage: 'Image + text',
  cta: 'Call to action',
  imageGrid: 'Image gallery',
  testimonial: 'Testimonial',
  faq: 'FAQ',
  videoFeature: 'Video + text',
  button: 'Button',
  spacer: 'Spacer',
  separator: 'Divider',
  threeCol: '3 columns',
  html: 'Custom HTML',
  originalContent: 'Original page content',
  table: 'Table',
  carousel: 'Carousel',
  linkList: 'Link list',
  iconGrid: 'Icon grid',
  featureSection: 'Feature section',
  productFeature: 'Product feature',
  doubleImageBanner: 'Double image banner',
  flipCards: 'Flip cards',
  searchBar: 'Rental search bar',
  contactForm: 'Contact form',
  map: 'Map',
  articleFloat: 'Article + floated image',
  store: 'Browse rentals CTA',
  fourCol: '4 columns',
  columnLinks: 'Link columns',
  headerButton: 'Heading + button',
}

const BLOCK_HELP: Record<PageBuilderBlockType, string> = {
  hero: 'Large image, title and booking button',
  heading: 'Standalone page heading',
  text: 'Paragraph or multi-line copy',
  image: 'Full-width image',
  textImage: 'Two-column story section',
  cta: 'Strong message and action button',
  imageGrid: 'Four-image gallery',
  testimonial: 'Customer quote card',
  faq: 'Three expandable questions',
  videoFeature: 'Video beside supporting text',
  button: 'Standalone action button',
  spacer: 'Extra vertical space',
  separator: 'Simple divider line',
  threeCol: 'Three feature or service cards',
  html: 'Advanced custom HTML block',
  originalContent: 'Keep the existing coded page or booking controls inside your rebuild',
  table: 'Editable rows and columns',
  carousel: 'Image or quote carousel',
  linkList: 'A row of useful links',
  iconGrid: 'Four icon-based feature cards',
  featureSection: 'Heading plus three highlighted reasons',
  productFeature: 'Promote one rental or package',
  doubleImageBanner: 'Two large side-by-side images',
  flipCards: 'Three front/back style information cards',
  searchBar: 'Search rentals from this page',
  contactForm: 'Simple contact form section',
  map: 'Address and embedded map',
  articleFloat: 'Editorial text wrapped around an image',
  store: 'Large browse-rentals call to action',
  fourCol: 'Four equal feature columns',
  columnLinks: 'Up to three columns of navigation links',
  headerButton: 'Heading, optional subtext and button',
}



function cloneBlock(block: PageBuilderBlock): PageBuilderBlock {
  const id = newPageBuilderBlock(block.type).id
  return { ...block, id }
}

function pageNeedsOriginalContent(pathInput: string) {
  const path = normalizeBuilderPath(pathInput)
  return (
    path === '/order-by-date' ||
    path === '/items' ||
    path.startsWith('/items/') ||
    path === '/category' ||
    path.startsWith('/category/') ||
    path === '/weddings' ||
    path === '/event-planning' ||
    path === '/design-your-event' ||
    path === '/frequently_asked_questions' ||
    path === '/about_us' ||
    path === '/contact_us' ||
    path === '/gallery' ||
    path === '/employment' ||
    path === '/service-area'
  )
}

function starterBlocks(path = ''): PageBuilderBlock[] {
  const blocks: PageBuilderBlock[] = [
    {
      ...newPageBuilderBlock('hero'),
      heroTitle: 'Build your event with Friendly Party Rental',
      heroSubtitle: 'Use this section to explain exactly what this page is for and what customers should do next.',
    },
    {
      ...newPageBuilderBlock('textImage'),
      tiHeading: 'Tell customers what matters',
      tiText: 'Replace this copy and image with the real details for this page. Every section can be moved, duplicated, hidden or deleted.',
    },
    {
      ...newPageBuilderBlock('cta'),
      ctaText: 'Ready to get started?',
      ctaButtonLabel: 'Browse Rentals',
      ctaButtonUrl: '/order-by-date',
    },
  ]
  if (pageNeedsOriginalContent(path)) {
    blocks.splice(1, 0, newPageBuilderBlock('originalContent'))
  }
  return blocks
}

export default function WebsitePageStudio({ onBack }: { onBack: () => void }) {
  const [pageIndex, setPageIndex] = useState<PageIndexItem[]>([])
  const [records, setRecords] = useState<WebsitePageRecord[]>([])
  const [selectedPath, setSelectedPath] = useState('/about_us')
  const [doc, setDoc] = useState<PageBuilderDocument>(() => createPageBuilderDocument('/about_us', 'About Us'))
  const [recordId, setRecordId] = useState<string | null>(null)
  const [isPublished, setIsPublished] = useState(false)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [manualPath, setManualPath] = useState('')
  const [newPageTitle, setNewPageTitle] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [insertAfterBlockId, setInsertAfterBlockId] = useState<string | null>(null)
  const [previewMode, setPreviewMode] = useState<'draft' | 'live'>('draft')
  const [previewDevice, setPreviewDevice] = useState<PagePreviewDevice>('desktop')
  const [previewRevision, setPreviewRevision] = useState(0)
  const [dragBlockId, setDragBlockId] = useState<string | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)
  const [undoStack, setUndoStack] = useState<PageBuilderDocument[]>([])
  const [redoStack, setRedoStack] = useState<PageBuilderDocument[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [sectionClipboard, setSectionClipboard] = useState<PageBuilderBlock | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('Loading pages…')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [passwordAction, setPasswordAction] = useState<'publish' | 'restore' | 'delete' | null>(null)
  const [adminPassword, setAdminPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const uploadTarget = useRef<{ blockId: string; key?: keyof PageBuilderBlock; dataKey?: string } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const liveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recordIdRef = useRef<string | null>(null)
  const recordSlugRef = useRef<string | null>(null)
  const selectedPathRef = useRef(selectedPath)
  const docRef = useRef(doc)

  const selectedIndexItem = useMemo(
    () => pageIndex.find(item => item.path === selectedPath),
    [pageIndex, selectedPath],
  )

  const groupedPages = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = pageIndex.filter(item => {
      if (!needle) return true
      return item.title.toLowerCase().includes(needle) || item.path.toLowerCase().includes(needle) || item.group.toLowerCase().includes(needle)
    })
    const groups = new Map<string, PageIndexItem[]>()
    filtered.forEach(item => {
      const list = groups.get(item.group) || []
      list.push(item)
      groups.set(item.group, list)
    })
    return Array.from(groups.entries())
  }, [pageIndex, search])

  useEffect(() => {
    let active = true
    Promise.all([
      fetch('/api/admin/website/page-index', { cache: 'no-store' }),
      fetch('/api/admin/website-pages', { cache: 'no-store' }),
    ])
      .then(async responses => {
        if (responses.some(response => !response.ok)) throw new Error('Could not load the page editor.')
        const [indexData, pageData] = await Promise.all(responses.map(response => response.json()))
        if (!active) return
        const nextIndex = indexData.pages || []
        const nextRecords = pageData.items || []
        setPageIndex(nextIndex)
        setRecords(nextRecords)
        const preferred = nextIndex.find((item: PageIndexItem) => item.path === '/about_us')
          || nextIndex.find((item: PageIndexItem) => item.path !== '/')
        if (preferred) selectPage(preferred.path, nextIndex, nextRecords)
      })
      .catch(reason => {
        if (active) {
          setError(reason instanceof Error ? reason.message : 'Could not load pages.')
          setStatus('Load failed')
        }
      })
    return () => { active = false; if (liveTimer.current) clearTimeout(liveTimer.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectPage(pathInput: string, index = pageIndex, pageRecords = records) {
    const path = normalizeBuilderPath(pathInput)
    if (path === '/') {
      void goHome()
      return
    }
    if (!isBuilderOverrideAllowed(path)) {
      setError('That route is protected because replacing it could break checkout, staff, driver, contract, payment, or API functions.')
      return
    }
    const item = index.find(entry => entry.path === path)
    const title = item?.title || path.split('/').filter(Boolean).pop()?.replace(/[-_]/g, ' ') || 'New Page'
    const slug = routeOverrideSlug(path)
    const record = pageRecords.find(page => page.slug === slug) || null
    const baseCustomPage = !record && item?.customPageId
      ? pageRecords.find(page => page.id === item.customPageId) || null
      : null
    const nextDoc = record
      ? parsePageBuilderDocument(record.content, record.title, path)
      : baseCustomPage
        ? parsePageBuilderDocument(baseCustomPage.content, baseCustomPage.title, path)
        : createPageBuilderDocument(path, title)
    if (!record && !baseCustomPage && pageNeedsOriginalContent(path) && !nextDoc.draftBlocks.some(block => block.type === 'originalContent')) {
      nextDoc.draftBlocks = [newPageBuilderBlock('originalContent')]
    }
    if (liveTimer.current) {
      clearTimeout(liveTimer.current)
      liveTimer.current = null
      void persist(docRef.current, false)
    }
    const activeRecord = record || baseCustomPage
    selectedPathRef.current = path
    recordIdRef.current = activeRecord?.id || null
    recordSlugRef.current = activeRecord?.slug || routeOverrideSlug(path)
    setSelectedPath(path)
    setPreviewMode('draft')
    setAddOpen(false)
    setInsertAfterBlockId(null)
    setPreviewDevice('desktop')
    setPreviewRevision(value => value + 1)
    setHistoryOpen(false)
    setUndoStack([])
    setRedoStack([])
    docRef.current = nextDoc
    setDoc(nextDoc)
    setRecordId(activeRecord?.id || null)
    setIsPublished(Boolean(activeRecord?.isPublished))
    setSelectedBlockId(nextDoc.draftBlocks[0]?.id || null)
    const hasUnpublishedChanges = Boolean(activeRecord) && documentHasUnpublishedChanges(nextDoc)
    setDirty(hasUnpublishedChanges)
    setError('')
    setStatus(hasUnpublishedChanges ? 'Private draft saved · live site unchanged' : activeRecord?.isPublished ? 'Live version loaded' : 'Original live page loaded')
  }

  function schedulePrivateDraftSave(next: PageBuilderDocument) {
    docRef.current = next
    setDoc(next)
    setDirty(true)
    setStatus('Saving private draft…')
    if (liveTimer.current) clearTimeout(liveTimer.current)
    liveTimer.current = setTimeout(() => { void persist(next, false) }, 650)
  }

  function updateDoc(next: PageBuilderDocument) {
    setUndoStack(previous => [...previous.slice(-49), docRef.current])
    setRedoStack([])
    schedulePrivateDraftSave(next)
  }

  function applyHistoryDocument(next: PageBuilderDocument) {
    setSelectedBlockId(current => next.draftBlocks.some(block => block.id === current) ? current : next.draftBlocks[0]?.id || null)
    schedulePrivateDraftSave(next)
  }

  function undoDraft() {
    if (saving || !undoStack.length) return
    const previous = undoStack[undoStack.length - 1]
    setUndoStack(stack => stack.slice(0, -1))
    setRedoStack(stack => [...stack.slice(-49), docRef.current])
    applyHistoryDocument(previous)
  }

  function redoDraft() {
    if (saving || !redoStack.length) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack(stack => stack.slice(0, -1))
    setUndoStack(stack => [...stack.slice(-49), docRef.current])
    applyHistoryDocument(next)
  }

  async function goHome() {
    if (saving) return
    if (liveTimer.current) {
      clearTimeout(liveTimer.current)
      liveTimer.current = null
      const saved = await persist(docRef.current, false)
      if (!saved) return
    }
    onBack()
  }

  useEffect(() => {
    const pending = status === 'Saving private draft…' || status === 'Creating private draft…'
    if (!pending) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [status])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      const target = event.target as HTMLElement | null
      const typing = Boolean(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable))
      if (typing) return
      if (event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redoDraft()
        else undoDraft()
      } else if (event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redoDraft()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undoStack, redoStack, saving])


  async function changePreviewDevice(next: PagePreviewDevice) {
    if (next === previewDevice) return
    if (previewMode === 'draft' && next !== 'desktop' && liveTimer.current) {
      clearTimeout(liveTimer.current)
      liveTimer.current = null
      const saved = await persist(docRef.current, false)
      if (!saved) return
    }
    setPreviewDevice(next)
  }

  function patchBlock(id: string, patch: Partial<PageBuilderBlock>) {
    updateDoc({
      ...doc,
      draftBlocks: doc.draftBlocks.map(block => block.id === id ? { ...block, ...patch, id: block.id, type: block.type } : block),
    })
  }

  function openAddSection(afterBlockId: string | null = null) {
    setInsertAfterBlockId(afterBlockId)
    setAddOpen(true)
  }

  function addBlock(type: PageBuilderBlockType) {
    const block = newPageBuilderBlock(type)
    const blocks = [...doc.draftBlocks]
    if (insertAfterBlockId) {
      const index = blocks.findIndex(item => item.id === insertAfterBlockId)
      if (index >= 0) blocks.splice(index + 1, 0, block)
      else blocks.push(block)
    } else {
      blocks.push(block)
    }
    updateDoc({ ...doc, draftBlocks: blocks })
    setSelectedBlockId(block.id)
    setAddOpen(false)
    setInsertAfterBlockId(null)
    setTimeout(() => document.querySelector('[data-page-builder-block="' + block.id + '"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  function moveBlock(id: string, direction: -1 | 1) {
    const blocks = [...doc.draftBlocks]
    const index = blocks.findIndex(block => block.id === id)
    const target = index + direction
    if (index < 0 || target < 0 || target >= blocks.length) return
    const temp = blocks[index]
    blocks[index] = blocks[target]
    blocks[target] = temp
    updateDoc({ ...doc, draftBlocks: blocks })
  }

  function reorderBlockTo(sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    const blocks = [...doc.draftBlocks]
    const sourceIndex = blocks.findIndex(block => block.id === sourceId)
    const targetIndex = blocks.findIndex(block => block.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const [moved] = blocks.splice(sourceIndex, 1)
    blocks.splice(targetIndex, 0, moved)
    updateDoc({ ...doc, draftBlocks: blocks })
    setSelectedBlockId(sourceId)
  }

  function finishSectionDrag() {
    setDragBlockId(null)
    setDragOverBlockId(null)
  }

  function duplicateBlock(id: string) {
    const blocks = [...doc.draftBlocks]
    const index = blocks.findIndex(block => block.id === id)
    if (index < 0) return
    const copy = cloneBlock(blocks[index])
    blocks.splice(index + 1, 0, copy)
    updateDoc({ ...doc, draftBlocks: blocks })
    setSelectedBlockId(copy.id)
  }

  function copySectionToClipboard(id: string) {
    const block = doc.draftBlocks.find(item => item.id === id)
    if (!block) return
    setSectionClipboard({ ...block })
    setStatus(BLOCK_LABELS[block.type] + ' copied · switch pages and paste it anywhere')
  }

  function pasteClipboardSection(afterBlockId: string | null = null) {
    if (!sectionClipboard) return
    const copy = cloneBlock(sectionClipboard)
    const blocks = [...doc.draftBlocks]
    if (afterBlockId) {
      const index = blocks.findIndex(item => item.id === afterBlockId)
      if (index >= 0) blocks.splice(index + 1, 0, copy)
      else blocks.push(copy)
    } else {
      blocks.push(copy)
    }
    updateDoc({ ...doc, draftBlocks: blocks })
    setSelectedBlockId(copy.id)
    setTimeout(() => document.querySelector('[data-page-builder-block="' + copy.id + '"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50)
  }

  function deleteBlock(id: string) {
    if (!confirm('Delete this section from your private draft? The live site will not change.')) return
    const blocks = doc.draftBlocks.filter(block => block.id !== id)
    updateDoc({ ...doc, draftBlocks: blocks })
    setSelectedBlockId(blocks[0]?.id || null)
  }

  function seedStarter() {
    if (doc.draftBlocks.length && !confirm('Replace the current draft sections with a starter layout? The live site will not change.')) return
    const blocks = starterBlocks(selectedPath)
    updateDoc({ ...doc, draftBlocks: blocks })
    setSelectedBlockId(blocks[0].id)
  }

  async function persist(nextDoc: PageBuilderDocument, publish: boolean, password?: string) {
    setSaving(true)
    setError('')
    setStatus(publish ? 'Verifying password & publishing…' : 'Saving private draft…')
    try {
      const activePath = selectedPathRef.current
      const activeRecordId = recordIdRef.current
      const slug = recordSlugRef.current || routeOverrideSlug(activePath)
      const body = {
        ...(activeRecordId ? { id: activeRecordId } : {}),
        slug,
        title: nextDoc.draftTitle || selectedIndexItem?.title || 'Website Page',
        content: JSON.stringify(nextDoc),
        ...(publish ? { publishLive: true, adminPassword: password || '' } : {}),
      }
      const response = await fetch('/api/admin/website-pages', {
        method: activeRecordId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save this page.')
      const saved = result.item as WebsitePageRecord
      const stillSelected = selectedPathRef.current === activePath
      if (stillSelected) {
        recordIdRef.current = saved.id
        recordSlugRef.current = saved.slug
        setRecordId(saved.id)
        setIsPublished(saved.isPublished)
        if (publish) {
          setDoc(nextDoc)
          setDirty(false)
        }
        setPreviewRevision(value => value + 1)
        setStatus(publish ? 'Published live' : 'Private draft saved · live site unchanged')
      }
      setRecords(previous => previous.filter(record => record.id !== saved.id).concat(saved))
      setPageIndex(previous => {
        const existing = previous.find(item => item.path === activePath)
        const customRecord = !slug.startsWith('__route__')
        if (existing) return previous.map(item => item.path === activePath
          ? {
              ...item,
              title: nextDoc.draftTitle || item.title,
              hasUnpublishedChanges: documentHasUnpublishedChanges(nextDoc),
              ...(customRecord
                ? { customPageId: saved.id, customPagePublished: saved.isPublished }
                : { overrideId: saved.id, overridePublished: saved.isPublished }),
            }
          : item)
        return previous.concat({
          path: activePath,
          title: nextDoc.draftTitle || activePath,
          group: customRecord ? 'Your pages' : 'Main website',
          hasUnpublishedChanges: documentHasUnpublishedChanges(nextDoc),
          ...(customRecord ? { customPageId: saved.id, customPagePublished: saved.isPublished } : { overrideId: saved.id, overridePublished: saved.isPublished }),
        })
      })
      return saved
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this page.')
      setStatus(publish ? 'Publish blocked' : 'Draft save failed')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function publishDraft(password: string) {
    if (liveTimer.current) clearTimeout(liveTimer.current)
    const previousLive: PageBuilderRevision | null = isPublished
      ? {
          id: globalThis.crypto?.randomUUID?.() || 'revision-' + Date.now(),
          createdAt: new Date().toISOString(),
          title: doc.publishedTitle || doc.draftTitle,
          blocks: doc.publishedBlocks.map(block => ({ ...block })),
          settings: { ...doc.publishedSettings },
        }
      : null
    const liveDoc: PageBuilderDocument = {
      ...doc,
      publishedTitle: doc.draftTitle,
      publishedBlocks: doc.draftBlocks.map(block => ({ ...block })),
      publishedSettings: { ...doc.draftSettings },
      revisions: previousLive
        ? [previousLive, ...doc.revisions].slice(0, 20)
        : doc.revisions,
    }
    const saved = await persist(liveDoc, true, password)
    if (saved) {
      setDoc(liveDoc)
      docRef.current = liveDoc
      setDirty(false)
      setUndoStack([])
      setRedoStack([])
      return true
    }
    return false
  }

  function loadRevisionIntoDraft(revision: PageBuilderRevision) {
    const next: PageBuilderDocument = {
      ...doc,
      draftTitle: revision.title,
      draftBlocks: revision.blocks.map(block => ({ ...block })),
      draftSettings: { ...revision.settings },
    }
    updateDoc(next)
    setSelectedBlockId(next.draftBlocks[0]?.id || null)
    setPreviewMode('draft')
    setPreviewDevice('desktop')
    setHistoryOpen(false)
    setStatus('Saved version loaded into private draft · live site unchanged')
  }

  async function createNewPage() {
    const path = normalizeBuilderPath(manualPath)
    const parts = path.split('/').filter(Boolean)
    if (path === '/' || parts.length !== 1) {
      setError('New pages need a simple path such as /corporate-events.')
      return
    }
    if (!isWebsiteEditorCustomPagePathAllowed(path)) {
      setError('That page path is already reserved by another part of the website. Choose a different URL.')
      return
    }
    if (pageIndex.some(item => item.path === path)) {
      setError('That page already exists. Select it from the page list instead.')
      return
    }

    const title = newPageTitle.trim() || parts[0].replace(/[-_]/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())
    const slug = parts[0]
    const next = createPageBuilderDocument(path, title)
    next.draftBlocks = starterBlocks(path)

    if (liveTimer.current) clearTimeout(liveTimer.current)
    selectedPathRef.current = path
    recordIdRef.current = null
    recordSlugRef.current = slug
    setSelectedPath(path)
    setUndoStack([])
    setRedoStack([])
    docRef.current = next
    setDoc(next)
    setRecordId(null)
    setIsPublished(false)
    setSelectedBlockId(next.draftBlocks[0]?.id || null)
    setDirty(true)
    setError('')
    setStatus('Creating private draft…')
    const saved = await persist(next, false)
    if (saved) {
      setManualPath('')
      setNewPageTitle('')
      setDirty(true)
      setStatus('Private draft created · publish requires admin password')
    }
  }

  async function restoreOriginal(password: string) {
    if (!recordId || !isPublished || !recordSlugRef.current?.startsWith('__route__')) return false
    setSaving(true)
    setError('')
    setStatus('Restoring original live design…')
    try {
      const response = await fetch('/api/admin/website-pages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: recordId,
          title: doc.draftTitle,
          content: JSON.stringify(doc),
          restoreOriginal: true,
          adminPassword: password,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not restore the original page.')
      setIsPublished(false)
      setDirty(true)
      setRecords(records.map(record => record.id === recordId ? result.item : record))
      setPageIndex(previous => previous.map(item => item.path === selectedPath
        ? { ...item, overridePublished: false, hasUnpublishedChanges: true }
        : item))
      setStatus('Original live design restored · your private draft is still saved and can be republished')
      return true
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not restore the original page.')
      setStatus('Restore blocked')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function reloadLiveIntoDraft() {
    if (!confirm('Discard the current draft layout and reload the live version? This does not change the live site.')) return
    if (liveTimer.current) clearTimeout(liveTimer.current)
    const currentRecord = recordIdRef.current ? records.find(record => record.id === recordIdRef.current) : null
    let next: PageBuilderDocument
    if (currentRecord?.isPublished) {
      const parsed = parsePageBuilderDocument(currentRecord.content, currentRecord.title, selectedPath)
      next = {
        ...parsed,
        draftTitle: parsed.publishedTitle,
        draftBlocks: parsed.publishedBlocks.map(block => ({ ...block })),
        draftSettings: { ...parsed.publishedSettings },
      }
      await persist(next, false)
    } else {
      next = createPageBuilderDocument(selectedPath, selectedIndexItem?.title || doc.draftTitle)
      if (currentRecord) {
        const parsed = parsePageBuilderDocument(currentRecord.content, currentRecord.title, selectedPath)
        next.revisions = parsed.revisions
      }
      if (recordSlugRef.current?.startsWith('__route__') || selectedIndexItem?.group === 'Main website') {
        const originalBlock = newPageBuilderBlock('originalContent')
        next.draftBlocks = [{ ...originalBlock }]
        next.publishedBlocks = [{ ...originalBlock }]
        next.publishedTitle = next.draftTitle
        next.publishedSettings = { ...next.draftSettings }
      }
      if (recordIdRef.current) await persist(next, false)
    }
    docRef.current = next
    setDoc(next)
    setSelectedBlockId(next.draftBlocks[0]?.id || null)
    setDirty(false)
    setUndoStack([])
    setRedoStack([])
    setStatus('Draft reset to the current live look')
  }

  async function deleteCustomPage(password: string) {
    if (!recordId || selectedIndexItem?.group !== 'Your pages') return false
    setSaving(true)
    setError('')
    setStatus('Deleting page…')
    try {
      const response = await fetch('/api/admin/website-pages?id=' + encodeURIComponent(recordId), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminPassword: password }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not delete this page.')

      const deletedPath = selectedPath
      setRecords(previous => previous.filter(record => record.id !== recordId))
      setPageIndex(previous => previous.filter(item => item.path !== deletedPath))
      recordIdRef.current = null
      recordSlugRef.current = null
      setRecordId(null)
      setIsPublished(false)
      setDirty(false)
      setPasswordAction(null)
      setAdminPassword('')

      const fallback = pageIndex.find(item => item.path === '/about_us')
        || pageIndex.find(item => item.group === 'Main website' && item.path !== '/')
      if (fallback) {
        selectPage(fallback.path, pageIndex.filter(item => item.path !== deletedPath), records.filter(record => record.id !== recordId))
      } else {
        void goHome()
      }
      return true
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete this page.')
      setStatus('Delete blocked')
      return false
    } finally {
      setSaving(false)
    }
  }

  function openPassword(action: 'publish' | 'restore' | 'delete') {
    setAdminPassword('')
    setError('')
    setPasswordAction(action)
  }

  async function confirmPasswordAction() {
    if (!passwordAction || !adminPassword) return
    setPasswordBusy(true)
    const ok = passwordAction === 'publish'
      ? await publishDraft(adminPassword)
      : passwordAction === 'restore'
        ? await restoreOriginal(adminPassword)
        : await deleteCustomPage(adminPassword)
    setPasswordBusy(false)
    if (ok) {
      setPasswordAction(null)
      setAdminPassword('')
    }
  }

  async function uploadImage(file: File) {
    const target = uploadTarget.current
    if (!target) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const response = await fetch('/api/admin/upload', { method: 'POST', body: form })
      const result = await response.json()
      if (!response.ok || !result.url) throw new Error(result.error || 'Image upload failed.')
      if (target.dataKey) patchBlockData(target.blockId, target.dataKey, result.url)
      else if (target.key) patchBlock(target.blockId, { [target.key]: result.url } as Partial<PageBuilderBlock>)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Image upload failed.')
    } finally {
      setUploading(false)
      uploadTarget.current = null
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const selectedBlock = doc.draftBlocks.find(block => block.id === selectedBlockId) || null
  const canShowLiveReference = selectedIndexItem?.group === 'Main website' || isPublished
  const previewWidthClass = previewDevice === 'mobile'
    ? 'max-w-[390px]'
    : previewDevice === 'tablet'
      ? 'max-w-[820px]'
      : 'max-w-[1180px]'
  const previewDeviceLabel = previewDevice === 'mobile' ? 'Mobile' : previewDevice === 'tablet' ? 'Tablet' : 'Desktop'

  const textField = (
    block: PageBuilderBlock,
    key: keyof PageBuilderBlock,
    title: string,
    options?: { area?: boolean; image?: boolean; placeholder?: string },
  ) => {
    const value = String(block[key] ?? '')
    return (
      <label className="block rounded-2xl border border-slate-200 bg-white p-4">
        <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{title}</span>
        {options?.image && value ? <img src={value} alt="" className="mt-3 h-32 w-full rounded-xl border border-slate-200 object-cover" /> : null}
        {options?.area ? (
          <textarea
            rows={5}
            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium leading-6 text-slate-800 outline-none focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-100"
            value={value}
            placeholder={options.placeholder}
            onChange={event => patchBlock(block.id, { [key]: event.target.value } as Partial<PageBuilderBlock>)}
          />
        ) : (
          <input
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-100"
            value={value}
            placeholder={options?.placeholder}
            onChange={event => patchBlock(block.id, { [key]: event.target.value } as Partial<PageBuilderBlock>)}
          />
        )}
        {options?.image ? (
          <button
            type="button"
            disabled={uploading}
            className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:border-green-500 hover:bg-green-50 disabled:opacity-50"
            onClick={() => {
              uploadTarget.current = { blockId: block.id, key }
              fileInput.current?.click()
            }}
          >
            <ImagePlus size={15} />
            {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
          </button>
        ) : null}
      </label>
    )
  }

  const selectField = (
    block: PageBuilderBlock,
    key: keyof PageBuilderBlock,
    title: string,
    options: Array<{ value: string; label: string }>,
  ) => (
    <label className="block rounded-2xl border border-slate-200 bg-white p-4">
      <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{title}</span>
      <select
        className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-green-600"
        value={String(block[key] ?? '')}
        onChange={event => patchBlock(block.id, { [key]: event.target.value } as Partial<PageBuilderBlock>)}
      >
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  )

  function parsedBlockData(block: PageBuilderBlock): Record<string, string> {
    try {
      const parsed = JSON.parse(block.data || '{}')
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }

  function patchBlockData(blockId: string, key: string, value: string) {
    const block = doc.draftBlocks.find(item => item.id === blockId)
    if (!block) return
    const next = { ...parsedBlockData(block), [key]: value }
    patchBlock(blockId, { data: JSON.stringify(next) })
  }

  const dataField = (
    block: PageBuilderBlock,
    key: string,
    title: string,
    options?: { area?: boolean; image?: boolean; placeholder?: string },
  ) => {
    const value = String(parsedBlockData(block)[key] ?? '')
    return (
      <label className="block rounded-2xl border border-slate-200 bg-white p-4">
        <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{title}</span>
        {options?.image && value ? <img src={value} alt="" className="mt-3 h-32 w-full rounded-xl border border-slate-200 object-cover" /> : null}
        {options?.area ? (
          <textarea
            rows={5}
            className="mt-2 min-h-28 w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium leading-6 text-slate-800 outline-none focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-100"
            value={value}
            placeholder={options.placeholder}
            onChange={event => patchBlockData(block.id, key, event.target.value)}
          />
        ) : (
          <input
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-800 outline-none focus:border-green-600 focus:bg-white focus:ring-4 focus:ring-green-100"
            value={value}
            placeholder={options?.placeholder}
            onChange={event => patchBlockData(block.id, key, event.target.value)}
          />
        )}
        {options?.image ? (
          <button
            type="button"
            disabled={uploading}
            className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-black text-slate-700 hover:border-green-500 hover:bg-green-50 disabled:opacity-50"
            onClick={() => {
              uploadTarget.current = { blockId: block.id, dataKey: key }
              fileInput.current?.click()
            }}
          >
            <ImagePlus size={15} />
            {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
          </button>
        ) : null}
      </label>
    )
  }

  const dataSelect = (
    block: PageBuilderBlock,
    key: string,
    title: string,
    options: Array<{ value: string; label: string }>,
  ) => {
    const value = String(parsedBlockData(block)[key] ?? '')
    return (
      <label className="block rounded-2xl border border-slate-200 bg-white p-4">
        <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">{title}</span>
        <select
          className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-800 outline-none focus:border-green-600"
          value={value}
          onChange={event => patchBlockData(block.id, key, event.target.value)}
        >
          {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
    )
  }

  const renderInspector = (block: PageBuilderBlock) => {
    switch (block.type) {
      case 'hero':
        return <>
          {textField(block, 'heroTitle', 'Hero title')}
          {textField(block, 'heroSubtitle', 'Hero subtitle', { area: true })}
          {textField(block, 'heroImageUrl', 'Hero image', { image: true })}
          {textField(block, 'heroButtonLabel', 'Button label')}
          {textField(block, 'heroButtonUrl', 'Button destination')}
          {selectField(block, 'heroStyle', 'Hero style', [
            { value: 'overlay', label: 'Image overlay' },
            { value: 'left-align', label: 'Image overlay — left aligned' },
            { value: 'two-button', label: 'Image overlay — two buttons' },
            { value: 'solid-blue', label: 'Solid blue' },
            { value: 'solid-red', label: 'Solid red' },
          ])}
        </>
      case 'heading':
        return <>
          {textField(block, 'headingText', 'Heading text')}
          {selectField(block, 'headingSize', 'Heading size', [
            { value: 'h1', label: 'Large H1' },
            { value: 'h2', label: 'Section H2' },
            { value: 'h3', label: 'Small H3' },
          ])}
        </>
      case 'text':
        return textField(block, 'text', 'Text', { area: true })
      case 'image':
        return <>
          {textField(block, 'imageUrl', 'Image', { image: true })}
          {textField(block, 'imageAlt', 'Image description / alt text')}
        </>
      case 'button':
        return <>
          {textField(block, 'buttonLabel', 'Button label')}
          {textField(block, 'buttonUrl', 'Button destination')}
        </>
      case 'html':
        return textField(block, 'html', 'Custom HTML', { area: true })
      case 'originalContent':
        return <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-800">This section inserts the original coded page at this exact spot on the live site. Use it on rental-item, category, employment, or other functional pages when you want to keep their existing controls while redesigning around them.</div>
      case 'textImage':
        return <>
          {textField(block, 'tiHeading', 'Heading')}
          {textField(block, 'tiText', 'Text', { area: true })}
          {textField(block, 'tiImageUrl', 'Image', { image: true })}
          {selectField(block, 'tiImageSide', 'Image side', [
            { value: 'left', label: 'Image left' },
            { value: 'right', label: 'Image right' },
          ])}
        </>
      case 'cta':
        return <>
          {textField(block, 'ctaText', 'Call-to-action text')}
          {textField(block, 'ctaButtonLabel', 'Button label')}
          {textField(block, 'ctaButtonUrl', 'Button destination')}
        </>
      case 'imageGrid':
        return <>
          {textField(block, 'gridImage1', 'Image 1', { image: true })}
          {textField(block, 'gridImage2', 'Image 2', { image: true })}
          {textField(block, 'gridImage3', 'Image 3', { image: true })}
          {textField(block, 'gridImage4', 'Image 4', { image: true })}
          {textField(block, 'gridLinkUrl', 'Optional click destination')}
        </>
      case 'testimonial':
        return <>
          {textField(block, 'quote', 'Quote', { area: true })}
          {textField(block, 'author', 'Customer / author')}
          {selectField(block, 'testimonialStyle', 'Style', [
            { value: 'card', label: 'Card' },
            { value: 'quote', label: 'Quote line' },
          ])}
        </>
      case 'faq':
        return <>
          {textField(block, 'faqQ1', 'Question 1')}
          {textField(block, 'faqA1', 'Answer 1', { area: true })}
          {textField(block, 'faqQ2', 'Question 2')}
          {textField(block, 'faqA2', 'Answer 2', { area: true })}
          {textField(block, 'faqQ3', 'Question 3')}
          {textField(block, 'faqA3', 'Answer 3', { area: true })}
        </>
      case 'videoFeature':
        return <>
          {textField(block, 'videoUrl', 'Video embed URL')}
          {textField(block, 'videoCaption', 'Video text', { area: true })}
          {textField(block, 'videoButtonLabel', 'Optional button label')}
          {textField(block, 'videoButtonUrl', 'Optional button destination')}
          {selectField(block, 'videoSide', 'Video side', [
            { value: 'left', label: 'Video left' },
            { value: 'right', label: 'Video right' },
          ])}
        </>
      case 'spacer':
        return textField(block, 'spacerHeight', 'Spacer height in pixels')
      case 'separator':
        return <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-500">This divider has no content fields. Move, hide, duplicate or delete it using the section controls.</p>
      case 'threeCol':
        return <>
          {textField(block, 'col1Title', 'Column 1 title')}
          {textField(block, 'col1Text', 'Column 1 text', { area: true })}
          {textField(block, 'col2Title', 'Column 2 title')}
          {textField(block, 'col2Text', 'Column 2 text', { area: true })}
          {textField(block, 'col3Title', 'Column 3 title')}
          {textField(block, 'col3Text', 'Column 3 text', { area: true })}
        </>
      case 'table':
        return <>
          {textField(block, 'tableData', 'Table rows — separate columns with | and rows with new lines', { area: true })}
          {selectField(block, 'tableStyle', 'Table style', [
            { value: 'basic', label: 'Basic' },
            { value: 'striped', label: 'Striped rows' },
            { value: 'bordered', label: 'Bordered' },
            { value: 'borderedStriped', label: 'Bordered + striped' },
          ])}
        </>
      case 'carousel':
        return <>
          {dataSelect(block, 'mode', 'Carousel content', [{ value: 'images', label: 'Images' }, { value: 'quotes', label: 'Quotes' }])}
          {dataField(block, 'item1Img', 'Slide 1 image', { image: true })}
          {dataField(block, 'item1Cap', 'Slide 1 caption / quote')}
          {dataField(block, 'item2Img', 'Slide 2 image', { image: true })}
          {dataField(block, 'item2Cap', 'Slide 2 caption / quote')}
          {dataField(block, 'item3Img', 'Slide 3 image', { image: true })}
          {dataField(block, 'item3Cap', 'Slide 3 caption / quote')}
        </>
      case 'linkList':
        return <>
          {dataField(block, 'heading', 'Heading')}
          {dataField(block, 'link1Label', 'Link 1 label')}{dataField(block, 'link1Url', 'Link 1 destination')}
          {dataField(block, 'link2Label', 'Link 2 label')}{dataField(block, 'link2Url', 'Link 2 destination')}
          {dataField(block, 'link3Label', 'Link 3 label')}{dataField(block, 'link3Url', 'Link 3 destination')}
          {dataField(block, 'link4Label', 'Link 4 label')}{dataField(block, 'link4Url', 'Link 4 destination')}
        </>
      case 'iconGrid':
        return <>
          {dataField(block, 'item1Icon', 'Icon 1')}{dataField(block, 'item1Title', 'Feature 1 title')}{dataField(block, 'item1Text', 'Feature 1 text', { area: true })}
          {dataField(block, 'item2Icon', 'Icon 2')}{dataField(block, 'item2Title', 'Feature 2 title')}{dataField(block, 'item2Text', 'Feature 2 text', { area: true })}
          {dataField(block, 'item3Icon', 'Icon 3')}{dataField(block, 'item3Title', 'Feature 3 title')}{dataField(block, 'item3Text', 'Feature 3 text', { area: true })}
          {dataField(block, 'item4Icon', 'Icon 4')}{dataField(block, 'item4Title', 'Feature 4 title')}{dataField(block, 'item4Text', 'Feature 4 text', { area: true })}
        </>
      case 'featureSection':
        return <>
          {dataField(block, 'heading', 'Heading')}{dataField(block, 'subtext', 'Subtext', { area: true })}
          {dataSelect(block, 'style', 'Style', [{ value: 'main', label: 'Blue highlight' }, { value: 'gray', label: 'Soft gray' }, { value: 'red', label: 'Red highlight' }])}
          {dataField(block, 'col1Title', 'Column 1 title')}{dataField(block, 'col1Text', 'Column 1 text', { area: true })}
          {dataField(block, 'col2Title', 'Column 2 title')}{dataField(block, 'col2Text', 'Column 2 text', { area: true })}
          {dataField(block, 'col3Title', 'Column 3 title')}{dataField(block, 'col3Text', 'Column 3 text', { area: true })}
        </>
      case 'productFeature':
        return <>
          {dataField(block, 'image', 'Product image', { image: true })}
          {dataField(block, 'title', 'Product title')}
          {dataField(block, 'description', 'Description', { area: true })}
          {dataField(block, 'price', 'Price')}
          {dataField(block, 'buttonLabel', 'Button label')}
          {dataField(block, 'buttonUrl', 'Button destination')}
        </>
      case 'doubleImageBanner':
        return <>
          {dataField(block, 'image1', 'Image 1', { image: true })}{dataField(block, 'caption1', 'Image 1 caption')}
          {dataField(block, 'image2', 'Image 2', { image: true })}{dataField(block, 'caption2', 'Image 2 caption')}
        </>
      case 'flipCards':
        return <>
          {dataField(block, 'card1Front', 'Card 1 front')}{dataField(block, 'card1Back', 'Card 1 back', { area: true })}
          {dataField(block, 'card2Front', 'Card 2 front')}{dataField(block, 'card2Back', 'Card 2 back', { area: true })}
          {dataField(block, 'card3Front', 'Card 3 front')}{dataField(block, 'card3Back', 'Card 3 back', { area: true })}
        </>
      case 'searchBar':
        return dataField(block, 'placeholder', 'Search placeholder')
      case 'contactForm':
        return <>{dataField(block, 'heading', 'Form heading')}{dataField(block, 'buttonLabel', 'Submit button label')}</>
      case 'map':
        return <>{dataField(block, 'address', 'Address')}{dataField(block, 'embedUrl', 'Optional map embed URL')}</>
      case 'articleFloat':
        return <>
          {dataField(block, 'imageUrl', 'Article image', { image: true })}
          {dataSelect(block, 'imageSide', 'Image side', [{ value: 'left', label: 'Left' }, { value: 'right', label: 'Right' }])}
          {dataField(block, 'text', 'Article text', { area: true })}
        </>
      case 'store':
        return <>{dataField(block, 'heading', 'Heading')}{dataField(block, 'buttonLabel', 'Button label')}{dataField(block, 'buttonUrl', 'Button destination')}</>
      case 'fourCol':
        return <>
          {dataField(block, 'col1Title', 'Column 1 title')}{dataField(block, 'col1Text', 'Column 1 text', { area: true })}
          {dataField(block, 'col2Title', 'Column 2 title')}{dataField(block, 'col2Text', 'Column 2 text', { area: true })}
          {dataField(block, 'col3Title', 'Column 3 title')}{dataField(block, 'col3Text', 'Column 3 text', { area: true })}
          {dataField(block, 'col4Title', 'Column 4 title')}{dataField(block, 'col4Text', 'Column 4 text', { area: true })}
        </>
      case 'columnLinks':
        return <>
          {dataField(block, 'col1Heading', 'Column 1 heading')}{dataField(block, 'col1Links', 'Column 1 links — one Label|URL per line', { area: true })}
          {dataField(block, 'col2Heading', 'Column 2 heading')}{dataField(block, 'col2Links', 'Column 2 links — one Label|URL per line', { area: true })}
          {dataField(block, 'col3Heading', 'Column 3 heading')}{dataField(block, 'col3Links', 'Column 3 links — one Label|URL per line', { area: true })}
        </>
      case 'headerButton':
        return <>
          {dataField(block, 'heading', 'Heading')}{dataField(block, 'subtext', 'Subtext', { area: true })}
          {dataField(block, 'buttonLabel', 'Button label')}{dataField(block, 'buttonUrl', 'Button destination')}
          {dataSelect(block, 'align', 'Alignment', [{ value: 'center', label: 'Centered' }, { value: 'left', label: 'Left aligned' }])}
        </>
    }
  }

  const pageSettings = (key: keyof PageBuilderSettings, value: string | number | boolean) => {
    updateDoc({
      ...doc,
      draftSettings: { ...doc.draftSettings, [key]: value } as PageBuilderSettings,
    })
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#111820] text-slate-900">
      {historyOpen ? (
        <div className="fixed inset-0 z-[245] grid place-items-center bg-black/55 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Published version history</p>
                <h2 className="mt-1 text-xl font-black text-slate-950">{doc.draftTitle || selectedPath}</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">Each publish keeps the previous live version. Loading one here changes only your private draft. Review it first, then use Publish Live + admin password if you want customers to see it again.</p>
              </div>
              <button type="button" onClick={() => setHistoryOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"><X size={16} /></button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-4">
              {doc.revisions.length ? (
                <div className="space-y-3">
                  {doc.revisions.map((revision, index) => (
                    <div key={revision.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-2 py-1 text-[9px] font-black uppercase tracking-[0.08em] text-slate-500">Version {doc.revisions.length - index}</span>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(revision.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="mt-2 truncate text-sm font-black text-slate-900">{revision.title || 'Saved version'}</p>
                        <p className="mt-1 text-xs text-slate-500">{revision.blocks.length} sections · previously live</p>
                      </div>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => loadRevisionIntoDraft(revision)}
                        className="min-h-10 shrink-0 rounded-xl border border-violet-200 bg-violet-50 px-4 text-xs font-black text-violet-800 hover:bg-violet-100 disabled:opacity-40"
                      >
                        Load into private draft
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                  <History size={26} className="mx-auto text-slate-300" />
                  <p className="mt-3 text-sm font-black text-slate-700">No older published versions yet</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">After the next publish, the version that is live right now will be kept here automatically.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      {passwordAction ? (
        <div className="fixed inset-0 z-[250] grid place-items-center bg-black/55 p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Admin confirmation</p>
            <h2 className="mt-2 text-xl font-black text-slate-950">
              {passwordAction === 'publish'
                ? 'Publish this draft to the live site?'
                : passwordAction === 'restore'
                  ? 'Restore the original live design?'
                  : 'Delete this page?'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {passwordAction === 'publish'
                ? 'Your draft is already saved privately. Enter your admin password only when you are ready for customers to see these changes.'
                : passwordAction === 'restore'
                  ? 'This turns off the remodeled live version and puts the original coded page back. Your private draft will remain saved.'
                  : 'This permanently removes this custom page from the website. Main website pages cannot be deleted.'}
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
                onClick={() => { setPasswordAction(null); setAdminPassword('') }}
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
                {passwordBusy
                  ? 'Verifying…'
                  : passwordAction === 'publish'
                    ? 'Confirm & Publish'
                    : passwordAction === 'restore'
                      ? 'Confirm & Restore'
                      : 'Confirm & Delete'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <input
        ref={fileInput}
        className="hidden"
        type="file"
        accept="image/*"
        onChange={event => {
          const file = event.target.files?.[0]
          if (file) void uploadImage(file)
        }}
      />

      <header className="sticky top-0 z-[100] border-b border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 px-4 py-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => void goHome()}
              disabled={saving}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              title="Back to homepage editor"
            >
              <ArrowLeft size={17} />
            </button>
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1f6b38] text-white">
              <FileText size={20} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-black text-slate-950 sm:text-xl">Website Builder</h1>
                <span className="rounded-full bg-violet-50 px-2 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-violet-700">All Pages</span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {selectedPath} · {status}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void goHome()}
              disabled={saving}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"
            >
              <LayoutTemplate size={15} />
              Homepage
            </button>
            {selectedIndexItem?.group === 'Your pages' && !isPublished ? (
              <div
                className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-black text-slate-400"
                title="This custom page is still private. Publish it with your admin password before customers can open it."
              >
                <EyeOff size={15} />
                Not live yet
              </div>
            ) : (
              <a
                href={selectedPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink size={15} />
                View live
              </a>
            )}
            <button
              type="button"
              disabled={saving || !recordId || (selectedIndexItem?.group === 'Your pages' && !isPublished)}
              onClick={() => void reloadLiveIntoDraft()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              title={selectedIndexItem?.group === 'Your pages' && !isPublished ? 'This custom page has not been published yet, so there is no live version to reload.' : 'Discard private changes and reload what customers currently see.'}
            >
              <RotateCcw size={15} />
              Discard draft / Reload live
            </button>
            {isPublished && recordSlugRef.current?.startsWith('__route__') ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => openPassword('restore')}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-800 hover:bg-amber-100 disabled:opacity-50"
              >
                <RotateCcw size={15} />
                Restore original live design
              </button>
            ) : null}
            {selectedIndexItem?.group === 'Your pages' && recordId ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => openPassword('delete')}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-black text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 size={15} />
                Delete page
              </button>
            ) : null}
            <button
              type="button"
              disabled={saving || !recordId}
              onClick={() => setHistoryOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              title="Open saved published versions"
            >
              <History size={15} />
              History{doc.revisions.length ? ' · ' + doc.revisions.length : ''}
            </button>
            <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                type="button"
                title="Undo last draft change (Ctrl/Cmd+Z)"
                aria-label="Undo last draft change"
                disabled={saving || !undoStack.length}
                onClick={undoDraft}
                className="grid h-10 w-10 place-items-center text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <Undo2 size={15} />
              </button>
              <button
                type="button"
                title="Redo draft change (Ctrl/Cmd+Shift+Z or Ctrl+Y)"
                aria-label="Redo draft change"
                disabled={saving || !redoStack.length}
                onClick={redoDraft}
                className="grid h-10 w-10 place-items-center border-l border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30"
              >
                <Redo2 size={15} />
              </button>
            </div>
            <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              {saving ? 'Saving private draft…' : dirty ? 'Private draft · live unchanged' : 'Matches live version'}
            </div>
            <button
              type="button"
              disabled={saving || uploading || !dirty}
              onClick={() => openPassword('publish')}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1f6b38] px-4 text-xs font-black text-white hover:bg-[#18592e] disabled:opacity-50"
            >
              Publish Live
            </button>
          </div>
        </div>
        {error ? (
          <div className="flex items-center gap-2 border-t border-red-100 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-800">
            <AlertTriangle size={16} />
            {error}
          </div>
        ) : null}
      </header>

      <div className="grid min-h-[calc(100vh-10rem)] grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
        <aside className="border-r border-slate-200 bg-white xl:h-[calc(100vh-10rem)] xl:overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-4">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-3.5 text-slate-400" />
              <input
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm font-medium outline-none focus:border-green-600 focus:bg-white"
                placeholder="Search site pages…"
                value={search}
                onChange={event => setSearch(event.target.value)}
              />
            </div>
            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">Create new page</p>
              <input
                className="mt-2 min-h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium outline-none focus:border-green-600"
                placeholder="Page title"
                value={newPageTitle}
                onChange={event => setNewPageTitle(event.target.value)}
              />
              <div className="mt-2 flex gap-2">
                <input
                  className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium outline-none focus:border-green-600"
                  placeholder="/new-page"
                  value={manualPath}
                  onChange={event => setManualPath(event.target.value)}
                  onKeyDown={event => { if (event.key === 'Enter') void createNewPage() }}
                />
                <button
                  type="button"
                  disabled={saving || !manualPath.trim()}
                  className="rounded-xl bg-slate-900 px-3 text-xs font-black text-white disabled:opacity-40"
                  onClick={() => void createNewPage()}
                >
                  Create
                </button>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-400">The new page starts as a private draft. It will not exist publicly until you publish it with your admin password.</p>
            </div>
          </div>

          <div className="p-3">
            {groupedPages.map(([group, items]) => (
              <div key={group} className="mb-5">
                <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">{group} · {items.length}</p>
                <div className="space-y-1">
                  {items.map(item => (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => selectPage(item.path)}
                      disabled={saving}
                      className={'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition ' + (selectedPath === item.path ? 'bg-green-50 text-green-900 ring-1 ring-green-200' : 'hover:bg-slate-50')}
                    >
                      {item.image ? <img src={item.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" /> : <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400"><FileText size={15} /></span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-black">{item.title}</span>
                        <span className="block truncate text-[10px] text-slate-400">{item.path}</span>
                      </span>
                      {(() => {
                        const state = pageListStatus(item)
                        return <span className={'shrink-0 rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.06em] ' + state.className}>{state.label}</span>
                      })()}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main className="min-w-0 bg-[#161e27]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111820] px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                {previewMode === 'draft' ? 'Private draft preview' : 'Current live reference'}
              </p>
              <p className="truncate text-sm font-black text-white">{doc.draftTitle || selectedIndexItem?.title || selectedPath}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-xl border border-white/15 bg-white/5">
                <button
                  type="button"
                  onClick={() => setPreviewMode('draft')}
                  className={'min-h-10 px-3 text-xs font-black ' + (previewMode === 'draft' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10')}
                >
                  Draft preview
                </button>
                <button
                  type="button"
                  disabled={!canShowLiveReference}
                  onClick={() => canShowLiveReference && setPreviewMode('live')}
                  className={'min-h-10 border-l border-white/15 px-3 text-xs font-black disabled:cursor-not-allowed disabled:opacity-35 ' + (previewMode === 'live' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10')}
                  title={canShowLiveReference ? 'See what customers currently see' : 'This custom page has not been published yet'}
                >
                  Live reference
                </button>
              </div>
              <div className="flex overflow-hidden rounded-xl border border-white/15 bg-white/5">
                <button
                  type="button"
                  title="Desktop preview"
                  aria-label="Desktop preview"
                  onClick={() => void changePreviewDevice('desktop')}
                  className={'grid h-10 w-10 place-items-center ' + (previewDevice === 'desktop' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10')}
                >
                  <Monitor size={15} />
                </button>
                <button
                  type="button"
                  title="Tablet preview"
                  aria-label="Tablet preview"
                  onClick={() => void changePreviewDevice('tablet')}
                  className={'grid h-10 w-10 place-items-center border-l border-white/15 ' + (previewDevice === 'tablet' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10')}
                >
                  <Tablet size={15} />
                </button>
                <button
                  type="button"
                  title="Mobile preview"
                  aria-label="Mobile preview"
                  onClick={() => void changePreviewDevice('mobile')}
                  className={'grid h-10 w-10 place-items-center border-l border-white/15 ' + (previewDevice === 'mobile' ? 'bg-white text-slate-900' : 'text-slate-300 hover:bg-white/10')}
                >
                  <Smartphone size={15} />
                </button>
              </div>
              <span className="hidden rounded-lg bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-slate-300 sm:inline">
                {previewDeviceLabel}
              </span>
              {previewMode === 'draft' ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { if (addOpen && insertAfterBlockId === null) setAddOpen(false); else openAddSection(null) }}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs font-black text-slate-900"
                  >
                    <Plus size={15} />
                    Add section
                  </button>
                  {addOpen ? (
                    <div className="absolute right-0 top-12 z-[120] w-[min(340px,calc(100vw-2rem))] rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-2xl">
                      <div className="mb-2 rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-bold leading-4 text-slate-500">
                        {insertAfterBlockId
                          ? 'Choose a section to insert directly below the section you selected.'
                          : 'Choose a section to add at the bottom of this page.'}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {PAGE_BUILDER_BLOCK_TYPES.map(type => (
                          <button
                            key={type}
                            type="button"
                            className="rounded-xl border border-slate-200 p-3 text-left hover:border-green-300 hover:bg-green-50"
                            onClick={() => addBlock(type)}
                          >
                            <span className="block text-xs font-black">{BLOCK_LABELS[type]}</span>
                            <span className="mt-1 block text-[10px] leading-4 text-slate-500">{BLOCK_HELP[type]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="h-[calc(100vh-13rem)] min-h-[650px] overflow-auto bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.06)_1px,_transparent_1px)] bg-[length:18px_18px] p-5">
            {previewMode === 'draft' ? (
              previewDevice === 'desktop' ? (
                <div className={'mx-auto w-full overflow-hidden rounded-[24px] bg-white shadow-[0_30px_100px_rgba(0,0,0,.45)] transition-[max-width] duration-200 ' + previewWidthClass}>
                  <PageBuilderContent
                    title={doc.draftTitle}
                    blocks={doc.draftBlocks}
                    settings={doc.draftSettings}
                    editing
                    selectedId={selectedBlockId}
                    onSelect={setSelectedBlockId}
                  />
                </div>
              ) : (
                <div className={'mx-auto w-full overflow-hidden rounded-[24px] border border-white/10 bg-white shadow-[0_30px_100px_rgba(0,0,0,.45)] transition-[max-width] duration-200 ' + previewWidthClass}>
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-violet-600">Private responsive preview</p>
                      <p className="text-xs font-black text-slate-700">{selectedPath} · {previewDeviceLabel}</p>
                    </div>
                    <p className="max-w-[280px] text-right text-[10px] leading-4 text-slate-500">
                      Edit from the section list and inspector. This frame uses the real site viewport and refreshes after private autosave.
                    </p>
                  </div>
                  <iframe
                    key={selectedPath + ':draft:' + previewDevice + ':' + previewRevision}
                    src={selectedPath + '?websiteDraftPreview=1&preview=' + previewRevision}
                    title={'Private ' + previewDeviceLabel + ' draft preview for ' + (doc.draftTitle || selectedPath)}
                    className={previewDevice === 'mobile' ? 'h-[760px] min-h-[760px] w-full bg-white' : 'h-[820px] min-h-[720px] w-full bg-white'}
                  />
                </div>
              )
            ) : canShowLiveReference ? (
              <div className={'mx-auto w-full overflow-hidden rounded-[24px] border border-white/10 bg-white shadow-[0_30px_100px_rgba(0,0,0,.45)] transition-[max-width] duration-200 ' + previewWidthClass}>
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Customers currently see</p>
                    <p className="text-xs font-black text-slate-700">{selectedPath} · {previewDeviceLabel}</p>
                  </div>
                  <a href={selectedPath} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-700">
                    <ExternalLink size={13} />
                    Open full page
                  </a>
                </div>
                <iframe
                  key={selectedPath + ':' + String(isPublished)}
                  src={selectedPath}
                  title={'Live reference for ' + (doc.draftTitle || selectedPath)}
                  className={previewDevice === 'mobile' ? 'h-[760px] min-h-[760px] w-full bg-white' : previewDevice === 'tablet' ? 'h-[820px] min-h-[720px] w-full bg-white' : 'h-[calc(100vh-18rem)] min-h-[600px] w-full bg-white'}
                />
              </div>
            ) : (
              <div className="mx-auto grid min-h-[420px] w-full max-w-2xl place-items-center rounded-3xl border-2 border-dashed border-slate-600 bg-slate-900/70 p-8 text-center text-sm font-bold text-slate-300">
                This custom page is still private. Publish it with your admin password before a live reference exists.
              </div>
            )}
          </div>
        </main>

        <aside className="border-l border-slate-200 bg-[#f7f9f8] xl:h-[calc(100vh-10rem)] xl:overflow-y-auto">
          <div className="sticky top-0 z-10 border-b border-slate-200 bg-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400">Page controls</p>
            <h2 className="mt-1 text-base font-black text-slate-950">{selectedBlock ? BLOCK_LABELS[selectedBlock.type] : 'Page settings'}</h2>
          </div>

          <div className="space-y-4 p-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
              Edits to <strong>{selectedPath}</strong> auto-save as a private draft. Customers keep seeing the current live page until you choose <strong>Publish Live</strong> and enter your admin password. Use <strong>Live reference</strong> above to compare your draft with what customers see now. Desktop Draft stays directly clickable for editing; Tablet and Mobile Draft use the real public page viewport so responsive breakpoints are accurate before publishing. Use Undo/Redo in the top bar for draft mistakes. History keeps older published versions across sessions; loading one from History still changes only the private draft until you publish.
            </div>
            {pageNeedsOriginalContent(selectedPath) ? (
              <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-xs leading-5 text-violet-900">
                This page has built-in functionality. The <strong>Original page content</strong> section lets you keep those live controls wherever you want them while remodeling the page. You can remove it if you intentionally want a completely custom replacement.
              </div>
            ) : null}

            <label className="block rounded-2xl border border-slate-200 bg-white p-4">
              <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Page title</span>
              <input
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-green-600"
                value={doc.draftTitle}
                onChange={event => updateDoc({ ...doc, draftTitle: event.target.value })}
              />
            </label>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Page title visibility</p>
                  <p className="mt-1 text-xs text-slate-400">Hide this when the first section already has its own H1.</p>
                </div>
                <button
                  type="button"
                  onClick={() => pageSettings('showPageTitle', !doc.draftSettings.showPageTitle)}
                  className={'inline-flex min-h-9 items-center gap-2 rounded-xl px-3 text-xs font-black ' + (doc.draftSettings.showPageTitle ? 'bg-green-50 text-green-800' : 'bg-slate-100 text-slate-500')}
                >
                  {doc.draftSettings.showPageTitle ? <Eye size={14} /> : <EyeOff size={14} />}
                  {doc.draftSettings.showPageTitle ? 'Shown' : 'Hidden'}
                </button>
              </div>
            </div>

            <label className="block rounded-2xl border border-slate-200 bg-white p-4">
              <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Content width</span>
              <select
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-bold outline-none focus:border-green-600"
                value={doc.draftSettings.maxWidth}
                onChange={event => pageSettings('maxWidth', event.target.value)}
              >
                <option value="xl">Narrow</option>
                <option value="2xl">Medium</option>
                <option value="4xl">Wide</option>
                <option value="6xl">Extra wide</option>
                <option value="full">Full width</option>
              </select>
            </label>

            <label className="block rounded-2xl border border-slate-200 bg-white p-4">
              <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Page background</span>
              <div className="mt-2 flex gap-2">
                <input
                  type="color"
                  className="h-11 w-14 rounded-lg border border-slate-300 bg-white p-1"
                  value={doc.draftSettings.backgroundColor}
                  onChange={event => pageSettings('backgroundColor', event.target.value)}
                />
                <input
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-bold uppercase"
                  value={doc.draftSettings.backgroundColor}
                  onChange={event => {
                    const value = event.target.value
                    if (/^#[0-9a-f]{6}$/i.test(value)) pageSettings('backgroundColor', value)
                  }}
                />
              </div>
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="rounded-2xl border border-slate-200 bg-white p-4">
                <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Top padding</span>
                <input
                  type="number"
                  min={0}
                  max={240}
                  className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-sm font-bold"
                  value={doc.draftSettings.topPadding}
                  onChange={event => pageSettings('topPadding', Number(event.target.value))}
                />
              </label>
              <label className="rounded-2xl border border-slate-200 bg-white p-4">
                <span className="block text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Bottom padding</span>
                <input
                  type="number"
                  min={0}
                  max={240}
                  className="mt-2 min-h-10 w-full rounded-lg border border-slate-300 px-2 text-sm font-bold"
                  value={doc.draftSettings.bottomPadding}
                  onChange={event => pageSettings('bottomPadding', Number(event.target.value))}
                />
              </label>
            </div>

            {!doc.draftBlocks.length ? (
              <button
                type="button"
                onClick={seedStarter}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-black text-green-800 hover:bg-green-100"
              >
                <LayoutTemplate size={16} />
                Start with a 3-section layout
              </button>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between px-1 pb-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">Sections · {doc.draftBlocks.length}</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">Drag the grip to reorder. Use + on any section to insert directly below it. Up/down buttons still work on touch screens.</p>
                </div>
                <button type="button" className="text-[10px] font-black text-green-700" onClick={() => openAddSection(null)}>+ Add to bottom</button>
              </div>
              {sectionClipboard ? (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50 p-2.5">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-[0.08em] text-violet-500">Copied section</p>
                    <p className="truncate text-[11px] font-black text-violet-900">{BLOCK_LABELS[sectionClipboard.type]}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => pasteClipboardSection(null)}
                      className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-violet-700 px-2.5 text-[10px] font-black text-white"
                    >
                      <ClipboardPaste size={12} />
                      Paste to bottom
                    </button>
                    <button type="button" title="Clear copied section" onClick={() => setSectionClipboard(null)} className="grid h-8 w-8 place-items-center rounded-lg bg-white text-violet-500">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ) : null}
              <div className="space-y-2">
                {doc.draftBlocks.map((block, index) => (
                  <div
                    key={block.id}
                    onDragOver={event => {
                      if (!dragBlockId || dragBlockId === block.id) return
                      event.preventDefault()
                      if (dragOverBlockId !== block.id) setDragOverBlockId(block.id)
                    }}
                    onDrop={event => {
                      event.preventDefault()
                      if (dragBlockId) reorderBlockTo(dragBlockId, block.id)
                      finishSectionDrag()
                    }}
                    className={
                      'rounded-xl border p-2 transition ' +
                      (selectedBlockId === block.id ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-slate-50') +
                      (dragBlockId === block.id ? ' opacity-45' : '') +
                      (dragOverBlockId === block.id && dragBlockId !== block.id ? ' ring-2 ring-green-400 ring-offset-1' : '')
                    }
                  >
                    <div className="flex w-full items-center gap-2">
                      <button
                        type="button"
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white text-slate-400 hover:text-slate-700"
                        title="Drag to reorder section"
                        aria-label={'Drag ' + BLOCK_LABELS[block.type] + ' section to reorder'}
                        draggable
                        onDragStart={event => {
                          setDragBlockId(block.id)
                          setDragOverBlockId(null)
                          event.dataTransfer.effectAllowed = 'move'
                          event.dataTransfer.setData('text/plain', block.id)
                        }}
                        onDragEnd={finishSectionDrag}
                      >
                        <GripVertical size={15} />
                      </button>
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() => setSelectedBlockId(block.id)}
                      >
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white text-[10px] font-black text-slate-500">{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-xs font-black text-slate-700">{BLOCK_LABELS[block.type]}</span>
                        {block.hidden ? <EyeOff size={13} className="text-slate-400" /> : null}
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-200 pt-2">
                      <button type="button" title="Hide/show" onClick={() => patchBlock(block.id, { hidden: !block.hidden })} className="grid h-7 w-7 place-items-center rounded-lg bg-white text-slate-500 hover:text-slate-900">{block.hidden ? <Eye size={13} /> : <EyeOff size={13} />}</button>
                      <button type="button" title="Move up" disabled={index === 0} onClick={() => moveBlock(block.id, -1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white text-slate-500 disabled:opacity-25"><ChevronUp size={13} /></button>
                      <button type="button" title="Move down" disabled={index === doc.draftBlocks.length - 1} onClick={() => moveBlock(block.id, 1)} className="grid h-7 w-7 place-items-center rounded-lg bg-white text-slate-500 disabled:opacity-25"><ChevronDown size={13} /></button>
                      <button type="button" title="Duplicate on this page" onClick={() => duplicateBlock(block.id)} className="grid h-7 w-7 place-items-center rounded-lg bg-white text-slate-500"><Copy size={13} /></button>
                      <button type="button" title="Copy section for another page" onClick={() => copySectionToClipboard(block.id)} className="grid h-7 w-7 place-items-center rounded-lg bg-white text-violet-600 hover:bg-violet-50"><ClipboardPaste size={13} /></button>
                      {sectionClipboard ? (
                        <button type="button" title="Paste copied section directly below" onClick={() => pasteClipboardSection(block.id)} className="grid h-7 w-7 place-items-center rounded-lg bg-violet-50 text-violet-700"><Plus size={13} /></button>
                      ) : (
                        <button
                          type="button"
                          title="Add a section directly below"
                          aria-label={'Add section below ' + BLOCK_LABELS[block.type]}
                          onClick={() => openAddSection(block.id)}
                          className="grid h-7 w-7 place-items-center rounded-lg bg-white text-green-700 hover:bg-green-50"
                        >
                          <Plus size={13} />
                        </button>
                      )}
                      <button type="button" title="Delete" onClick={() => deleteBlock(block.id)} className="ml-auto grid h-7 w-7 place-items-center rounded-lg bg-white text-red-500"><Trash2 size={13} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedBlock ? (
              <div className="space-y-3 border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-black text-slate-900">{BLOCK_LABELS[selectedBlock.type]} settings</p>
                  <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100" onClick={() => setSelectedBlockId(null)}><X size={15} /></button>
                </div>
                {renderInspector(selectedBlock)}
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  )
}
