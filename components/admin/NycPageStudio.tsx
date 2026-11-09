'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDown, ArrowUp, Check, ChevronLeft, ExternalLink, Eye, FilePlus2,
  History, LayoutTemplate, Monitor, Plus, Save, Smartphone, Tablet, Trash2,
  Undo2, UploadCloud, X,
} from 'lucide-react'
import { RenderBlock, type Block } from '@/components/public/NycCustomPageBlocks'
import { NYC_STUDIO_FIELDS, NYC_STUDIO_TYPES, niceNycStudioType } from '@/lib/nycPageStudio'

type PageRow = {
  id: string; slug: string; title: string; isPublished: boolean; hasDraft: boolean
}
type PageDetail = {
  page: PageRow
  title: string
  blocks: Block[]
  hasDraft: boolean
  draftUpdatedAt: string | null
}
type Device = 'desktop' | 'tablet' | 'mobile'
type StudioBlock = Block & Record<string, unknown>

const dimensions: Record<Device, number> = { desktop: 1120, tablet: 768, mobile: 390 }

function errMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to complete this request'
}
async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init })
  const result = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(result.error || 'The NYC website editor request failed')
  return result as T
}
function asJson(payload: unknown): RequestInit {
  return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
}

export default function NycPageStudio() {
  const [pages, setPages] = useState<PageRow[]>([])
  const [page, setPage] = useState<PageRow | null>(null)
  const [title, setTitle] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [savedSnapshot, setSavedSnapshot] = useState('')
  const [draftVersion, setDraftVersion] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null)
  const [device, setDevice] = useState<Device>('desktop')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [newBlockType, setNewBlockType] = useState('hero')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const snapshot = useMemo(() => JSON.stringify({ title, blocks }), [title, blocks])
  const dirty = Boolean(page) && snapshot !== savedSnapshot
  const legacyHtml = blocks.some(block => block.type === 'html')
  const selected = blocks.find(block => block.id === selectedBlock) as StudioBlock | undefined
  const selectedIndex = blocks.findIndex(block => block.id === selectedBlock)

  const fetchList = useCallback(async () => {
    const data = await api<{ pages: PageRow[] }>('/api/admin/website-pages/studio')
    setPages(data.pages)
    return data.pages
  }, [])

  const loadPage = useCallback(async (id: string) => {
    setLoading(true)
    setError('')
    try {
      const data = await api<PageDetail>('/api/admin/website-pages/studio?id=' + encodeURIComponent(id))
      setPage(data.page)
      setTitle(data.title)
      setBlocks(data.blocks)
      setSelectedBlock(data.blocks[0]?.id || null)
      setHasDraft(data.hasDraft)
      setDraftVersion(data.draftUpdatedAt)
      setSavedSnapshot(JSON.stringify({ title: data.title, blocks: data.blocks }))
      setStatus(data.hasDraft ? 'Private draft loaded — live website unchanged' : 'Showing current page content')
    } catch (cause) {
      setError(errMessage(cause))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchList().then(items => {
      if (!active) return
      if (items[0]) return loadPage(items[0].id)
      setLoading(false)
    }).catch(cause => {
      if (active) { setError(errMessage(cause)); setLoading(false) }
    })
    return () => { active = false }
  }, [fetchList, loadPage])

  async function switchPage(id: string) {
    if (id === page?.id) return
    if (dirty && !window.confirm('Leave this page and discard your unsaved local changes?')) return
    await loadPage(id)
  }

  function changeBlock(id: string, patch: Record<string, string>) {
    setBlocks(previous => previous.map(block => block.id === id ? { ...block, ...patch } : block))
  }
  function addBlock() {
    if (blocks.length >= 60) { setError('A page supports up to 60 sections.'); return }
    const id = 'section_' + globalThis.crypto.randomUUID().replaceAll('-', '')
    const block = { id, type: newBlockType } as Block
    setBlocks(previous => [...previous, block])
    setSelectedBlock(id)
    setError('')
  }
  function moveBlock(index: number, offset: number) {
    const nextIndex = index + offset
    if (nextIndex < 0 || nextIndex >= blocks.length) return
    setBlocks(previous => {
      const updated = [...previous]
      ;[updated[index], updated[nextIndex]] = [updated[nextIndex], updated[index]]
      return updated
    })
  }
  function deleteBlock(id: string) {
    setBlocks(previous => previous.filter(block => block.id !== id))
    setSelectedBlock(null)
  }
  async function saveDraft() {
    if (!page) return null
    setBusy(true); setError('')
    try {
      const data = await api<{ saved: boolean; draftUpdatedAt: string }>(
        '/api/admin/website-pages/studio',
        asJson({ action: 'save', pageId: page.id, title, blocks }),
      )
      setSavedSnapshot(snapshot)
      setDraftVersion(data.draftUpdatedAt)
      setHasDraft(true)
      setStatus('Private draft saved — live NYC site unchanged')
      await fetchList()
      return data.draftUpdatedAt
    } catch (cause) {
      setError(errMessage(cause))
      setStatus('Draft was not saved')
      return null
    } finally { setBusy(false) }
  }
  async function publish() {
    if (!page || busy) return
    if (!password) { setError('Enter the current NYC admin password to publish.'); return }
    if (blocks.length === 0) { setError('Add at least one page section before publishing.'); return }
    if (legacyHtml) { setError('Legacy HTML must be removed or converted before publishing from this editor.'); return }
    if (!window.confirm('Publish these changes to the LIVE NYC website at /' + page.slug + '?')) return
    const version = dirty || !hasDraft ? await saveDraft() : draftVersion
    if (!version) return
    setBusy(true); setError('')
    try {
      const data = await api<{ published: boolean; page: PageRow }>(
        '/api/admin/website-pages/studio',
        asJson({ action: 'publish', pageId: page.id, expectedDraftUpdatedAt: version, adminPassword: password }),
      )
      setPage({ ...data.page, hasDraft: false })
      setPassword('')
      setHasDraft(false)
      setDraftVersion(null)
      setSavedSnapshot(snapshot)
      setStatus('Published live — your NYC page is now visible to customers')
      await fetchList()
    } catch (cause) {
      setError(errMessage(cause))
      setStatus('Not published; live page unchanged')
    } finally { setBusy(false) }
  }
  async function discardDraft() {
    if (!page || busy) return
    if (!window.confirm('Discard this private draft and reload the current published page?')) return
    setBusy(true); setError('')
    try {
      await api('/api/admin/website-pages/studio', asJson({ action: 'discard', pageId: page.id }))
      await loadPage(page.id)
      await fetchList()
      setStatus('Private draft discarded — the live page was not changed')
    } catch (cause) {
      setError(errMessage(cause))
    } finally { setBusy(false) }
  }
  async function createPage() {
    setBusy(true); setError('')
    try {
      const result = await api<{ item: PageRow }>(
        '/api/admin/website-pages',
        asJson({ slug: newSlug.trim().toLowerCase(), title: newTitle.trim(), content: '[]' }),
      )
      setShowCreate(false); setNewTitle(''); setNewSlug('')
      await fetchList()
      await loadPage(result.item.id)
      setStatus('New NYC page created as a private draft — not visible to customers')
    } catch (cause) { setError(errMessage(cause)) }
    finally { setBusy(false) }
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-5 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-[1650px] space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div>
            <Link href="/admin/website" className="mb-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700"><ChevronLeft size={14} /> Homepage builder</Link>
            <h1 className="text-2xl font-black tracking-tight">NYC Page Studio</h1>
            <p className="mt-1 text-sm text-slate-600">Edit pages visually. Drafts are private until you explicitly publish with your NYC administrator password.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/settings/website-pages" className="rounded-xl border px-4 py-2 text-sm font-bold">Legacy page list</Link>
            <button onClick={() => setShowCreate(!showCreate)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white"><FilePlus2 size={16} /> New page</button>
          </div>
        </header>

        {showCreate && <section className="grid gap-3 rounded-2xl border border-blue-200 bg-white p-5 sm:grid-cols-[1fr_1fr_auto]">
          <label className="text-sm font-semibold">Page title<input value={newTitle} onChange={e => { setNewTitle(e.target.value); if (!newSlug) setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')) }} placeholder="Riverdale Birthday Rentals" className="mt-1 block w-full rounded-lg border p-3 font-normal" /></label>
          <label className="text-sm font-semibold">Page URL (slug)<input value={newSlug} onChange={e => setNewSlug(e.target.value)} placeholder="riverdale-birthday-rentals" className="mt-1 block w-full rounded-lg border p-3 font-normal" /></label>
          <button disabled={busy || !newSlug || !newTitle} onClick={createPage} className="self-end rounded-xl bg-blue-700 px-5 py-3 font-bold text-white disabled:opacity-40">Create private page</button>
          <p className="text-xs text-slate-600 sm:col-span-3">Creating a page does not publish it. Reserved URLs are blocked by the server.</p>
        </section>}

        {error && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div>}

        <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)_300px]">
          <aside className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black">All NYC pages</h2><span className="text-xs text-slate-500">{pages.length}</span></div>
            <nav aria-label="Select NYC page" className="space-y-1">
              {pages.map(item => <button key={item.id} onClick={() => void switchPage(item.id)}
                className={'w-full rounded-xl px-3 py-3 text-left text-sm ' + (item.id === page?.id ? 'bg-blue-50 ring-2 ring-blue-200' : 'hover:bg-slate-50')}>
                <span className="block font-bold">{item.title}</span>
                <span className="mt-1 block truncate text-xs text-slate-500">/{item.slug}</span>
                <span className={'mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ' + (item.isPublished ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600')}>{item.isPublished ? 'Live' : 'Not published'}</span>
                {item.hasDraft && <span className="ml-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">Draft saved</span>}
              </button>)}
              {!pages.length && <p className="text-sm text-slate-500">No custom pages yet. Create your first private page above.</p>}
            </nav>
          </aside>

          <section className="min-w-0 space-y-4">
            {page ? <>
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="nyc-page-title" className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Page title</label>
                    <input id="nyc-page-title" value={title} onChange={e => setTitle(e.target.value)} className="block w-full rounded-lg border px-3 py-2 text-xl font-black" />
                    <p className="mt-2 truncate text-xs text-slate-500">Public URL: /{page.slug} · {page.isPublished ? 'Currently published' : 'Private / unpublished'}</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border p-1">
                    {(['desktop','tablet','mobile'] as Device[]).map(kind => <button key={kind} onClick={() => setDevice(kind)} title={kind}
                      className={'flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold ' + (device === kind ? 'bg-blue-700 text-white' : 'text-slate-600')}>
                      {kind === 'desktop' ? <Monitor size={17} /> : kind === 'tablet' ? <Tablet size={17} /> : <Smartphone size={17} />}
                      <span className="hidden sm:inline">{kind}</span>
                    </button>)}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button onClick={() => void saveDraft()} disabled={busy || legacyHtml || (!dirty && hasDraft)} className="inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-800 disabled:opacity-40"><Save size={16} /> Save private draft</button>
                  <button onClick={() => void publish()} disabled={busy || legacyHtml || (!dirty && !hasDraft && page.isPublished)} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><UploadCloud size={16} /> Publish Live</button>
                  <button onClick={() => void discardDraft()} disabled={busy || (!dirty && !hasDraft)} className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-40"><Undo2 size={16} /> Discard draft</button>
                  {page.isPublished && <a href={'/' + page.slug} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold"><ExternalLink size={15} /> Live page</a>}
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-600">{dirty ? 'Unsaved local changes' : status}{hasDraft && !dirty ? ' · Saved privately' : ''}</p>
                {legacyHtml && <p className="mt-2 rounded-lg bg-amber-100 p-3 text-sm font-bold text-amber-900">This page contains a legacy HTML section. It cannot be saved with this visual editor until that section is removed or converted.</p>}
              </div>
              <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="inline-flex items-center gap-1 text-xs font-bold text-slate-600"><Eye size={15} /> Customer-style page preview · {device}</p>
                  <p className="text-xs text-slate-500">Draft preview — not publicly accessible</p>
                </div>
                <div className="overflow-x-auto rounded-xl border bg-slate-100 p-2 sm:p-4">
                  <div className="mx-auto min-h-[360px] bg-white px-4 py-10 shadow-lg sm:px-8"
                    style={{ width: dimensions[device], maxWidth: device === 'desktop' ? '100%' : undefined }}>
                    <div className="mb-8 text-center"><h1 className="text-3xl font-bold text-dark">{title}</h1></div>
                    <div className="space-y-8 text-body">
                      {blocks.map((block, index) => <div key={block.id}
                        onClick={() => setSelectedBlock(block.id)}
                        className={'group relative cursor-pointer rounded-lg border-2 p-2 ' + (block.id === selectedBlock ? 'border-blue-500' : 'border-transparent hover:border-blue-200')}>
                        <span className="absolute -top-3 left-2 z-10 rounded-full bg-blue-700 px-2 py-0.5 text-[10px] font-bold text-white">{index + 1}. {niceNycStudioType(block.type)}</span>
                        {block.type === 'html' ? <div className="rounded bg-amber-100 p-3 text-sm">Legacy HTML block · visual editing unavailable</div> : <RenderBlock block={block} />}
                      </div>)}
                      {!blocks.length && <div className="rounded-xl border-2 border-dashed p-10 text-center text-slate-500"><LayoutTemplate className="mx-auto mb-3" /><p>Add a section on the right to design this page.</p></div>}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">This uses the same section renderer as the NYC storefront. Device width previews do not replace testing in real browsers.</p>
              </div>
            </> : <div className="rounded-2xl bg-white p-10 text-center text-slate-500">{loading ? 'Loading NYC page editor…' : 'Select or create a custom NYC page.'}</div>}
          </section>

          <aside className="min-w-0 space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="text-sm font-black">Page sections</h2>
              <div className="mt-3 flex gap-2">
                <select aria-label="New section type" value={newBlockType} onChange={e => setNewBlockType(e.target.value)} className="min-w-0 flex-1 rounded-lg border p-2 text-sm">
                  {NYC_STUDIO_TYPES.map(type => <option key={type} value={type}>{niceNycStudioType(type)}</option>)}
                </select>
                <button disabled={!page} onClick={addBlock} className="rounded-lg bg-blue-700 p-2 text-white disabled:opacity-40" title="Add section"><Plus size={20} /></button>
              </div>
              <div className="mt-4 max-h-72 space-y-1 overflow-auto">
                {blocks.map((block, index) => <div key={block.id} className={'flex items-center gap-1 rounded-lg border p-1 text-xs ' + (selectedBlock === block.id ? 'border-blue-400 bg-blue-50' : '')}>
                  <button className="min-w-0 flex-1 truncate py-2 text-left font-semibold" onClick={() => setSelectedBlock(block.id)}>{index + 1}. {niceNycStudioType(block.type)}</button>
                  <button title="Move up" disabled={index===0} onClick={() => moveBlock(index, -1)} className="p-1 disabled:opacity-30"><ArrowUp size={14} /></button>
                  <button title="Move down" disabled={index===blocks.length-1} onClick={() => moveBlock(index, 1)} className="p-1 disabled:opacity-30"><ArrowDown size={14} /></button>
                  <button title="Remove section" onClick={() => deleteBlock(block.id)} className="p-1 text-red-700"><Trash2 size={14} /></button>
                </div>)}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-black">{selected ? 'Edit ' + niceNycStudioType(selected.type) : 'Select a section'}</h2>
              {selected && selectedIndex >= 0 ? <>
                {NYC_STUDIO_FIELDS[selected.type]?.map(field => <label key={field.key} className="mb-3 block text-xs font-bold text-slate-600">
                  {field.label}
                  {field.kind === 'textarea' ? <textarea rows={3} value={String(selected[field.key] || '')} onChange={e => changeBlock(selected.id, { [field.key]: e.target.value })} className="mt-1 block w-full rounded-lg border p-2 text-sm font-normal" /> :
                    field.kind === 'select' ? <select value={String(selected[field.key] || field.options?.[0] || '')} onChange={e => changeBlock(selected.id, { [field.key]: e.target.value })} className="mt-1 block w-full rounded-lg border p-2 text-sm font-normal">{field.options?.map(option => <option key={option} value={option}>{option}</option>)}</select> :
                      <input type="text" value={String(selected[field.key] || '')} onChange={e => changeBlock(selected.id, { [field.key]: e.target.value })} placeholder={field.kind === 'url' ? 'https://... or /...' : ''} className="mt-1 block w-full rounded-lg border p-2 text-sm font-normal" />}
                </label>)}
                {selected.type === 'html' && <p className="text-sm text-amber-800">Legacy HTML can only be removed from this studio; its original content stays public until publishing a replacement.</p>}
                {NYC_STUDIO_FIELDS[selected.type]?.length === 0 && <p className="text-xs text-slate-500">This section needs no additional fields.</p>}
              </> : <p className="text-sm text-slate-500">Choose an existing block or add a new one.</p>}
            </div>
            {page && <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
              <label htmlFor="nyc-studio-password" className="mb-2 block text-xs font-bold text-slate-700">Admin password for publishing</label>
              <input id="nyc-studio-password" type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Required only to publish" className="w-full rounded-lg border p-3 text-sm" />
              <p className="mt-2 text-xs text-slate-600">Saving and previewing drafts never requires payment credentials. Published content stays unchanged until you confirm Publish Live.</p>
            </div>}
          </aside>
        </div>
      </div>
    </main>
  )
}
