'use client'

import { useEffect, useState, useCallback } from 'react'

type BlockType = 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'hero' | 'offer' | 'grid' | 'badges'

interface Card {
  image: string
  caption: string
  url: string
}

interface Block {
  id: string
  type: BlockType
  text?: string
  subtitle?: string
  url?: string
  image?: string
  align?: 'left' | 'center' | 'right'
  // offer block
  eyebrow?: string
  title?: string
  code?: string
  buttonText?: string
  // grid + badges blocks
  cards?: Card[]
  columns?: number
}

interface Template {
  id: string
  name: string
  subject: string
  content: string
  isActive: boolean
  createdAt: string
    status?: string
    scheduledAt?: string | null
    segment?: string | null
    manualRecipients?: string | null
    sentAt?: string | null
    recipientCount?: number | null
    sendError?: string | null
}

interface ImageItem {
  id: string
  name: string
  url: string
  category: string
}

const BLUE = '#0b3d91'
const ACCENT = '#f5a623'
const DARK = '#1a1a1a'
const GREY = '#6b7280'
const LIGHT = '#f4f6fb'
const BORDER = '#e5e7eb'

const SITE_CATEGORIES = [
  'tent-rentals', 'table-chair-rentals', 'bounce-house-rentals', 'photobooth-rentals',
  'concession-machine-rentals', 'yard-game-rentals', 'linen-rentals', 'event-lighting-rentals',
  'dance-floor-stage-rentals', 'generator-rentals', 'heater-fan-rentals', 'inflatable-movie-screen-rentals',
  'beverage-food-service', 'foam-party-machine-rentals', 'party-rental-packages', 'weddings',
]

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function esc(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function newBlock(type: BlockType): Block {
  const id = uid()
  switch (type) {
    case 'heading':
      return { id, type, text: 'Your headline here', align: 'center' }
    case 'text':
      return { id, type, text: 'Write your message here. Tell customers about your offer, event, or news.', align: 'left' }
    case 'image':
      return { id, type, image: '', url: '', align: 'center' }
    case 'button':
      return { id, type, text: 'Shop Now', url: 'https://www.friendlypartyrental.com/rentals', align: 'center' }
    case 'divider':
      return { id, type }
    case 'spacer':
      return { id, type }
    case 'hero':
      return { id, type, image: 'https://www.friendlypartyrental.com/images/wedding-backyard-elopement.jpg', url: 'https://www.friendlypartyrental.com/rentals' }
    case 'offer':
      return { id, type, eyebrow: 'Limited-Time Offer', title: 'Save 15% on your next order', subtitle: 'Book by June 30th \u2014 mention code SUMMER15 on your quote.', code: 'SUMMER15', buttonText: 'Browse Rentals', url: 'https://www.friendlypartyrental.com/rentals' }
    case 'grid':
      return {
        id, type, title: 'Popular Rentals', subtitle: 'Tap any category to explore', columns: 2,
        cards: [
          { image: 'https://www.friendlypartyrental.com/api/category-image/tent-rentals', caption: 'Tents & Canopies', url: 'https://www.friendlypartyrental.com/rentals' },
          { image: 'https://www.friendlypartyrental.com/api/category-image/table-chair-rentals', caption: 'Tables & Chairs', url: 'https://www.friendlypartyrental.com/rentals' },
        ],
      }
    case 'badges':
      return {
        id, type, title: 'Why Friendly Party Rental?',
        cards: [
          { image: 'https://www.friendlypartyrental.com/images/badge-syracuse-number1-party-rental.png', caption: '', url: '' },
          { image: 'https://www.friendlypartyrental.com/images/badge-all-day-8-hour-rental.png', caption: '', url: '' },
          { image: 'https://www.friendlypartyrental.com/images/badge-all-day-best-price-guarantee.png', caption: '', url: '' },
        ],
      }
    default:
      return { id, type: 'text', text: '', align: 'left' }
  }
}

function blockHtml(b: Block): string {
  const align = b.align || 'left'
  switch (b.type) {
    case 'heading':
      return '<h1 style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:26px;line-height:1.25;color:' + DARK + ';text-align:' + align + ';">' + esc(b.text || '') + '</h1>'
    case 'text':
      return '<p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:' + DARK + ';text-align:' + align + ';">' + esc(b.text || '').replace(/\n/g, '<br />') + '</p>'
    case 'image': {
      if (!b.image) return ''
      const img = '<img src="' + b.image + '" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:8px;margin:0 auto 16px;" alt="" />'
      return '<div style="text-align:' + align + ';">' + (b.url ? '<a href="' + b.url + '" style="text-decoration:none;">' + img + '</a>' : img) + '</div>'
    }
    case 'button':
      return '<div style="text-align:' + align + ';margin:18px 0;"><a href="' + (b.url || '#') + '" style="display:inline-block;background:' + BLUE + ';color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:13px 32px;border-radius:6px;">' + esc(b.text || 'Shop Now') + '</a></div>'
    case 'divider':
      return '<div style="border-top:1px solid ' + BORDER + ';margin:20px 0;"></div>'
    case 'spacer':
      return '<div style="height:24px;line-height:24px;font-size:1px;">&nbsp;</div>'
    case 'hero': {
      if (!b.image) return ''
      const img = '<img src="' + b.image + '" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:10px;margin:0 auto 8px;" alt="" />'
      return '<div style="text-align:center;margin-bottom:8px;">' + (b.url ? '<a href="' + b.url + '" style="text-decoration:none;">' + img + '</a>' : img) + '</div>'
    }
    case 'offer':
      return '<div style="background:' + LIGHT + ';border:1px solid ' + BORDER + ';border-radius:10px;padding:18px;margin:16px 0;text-align:center;font-family:Arial,sans-serif;">' +
        (b.eyebrow ? '<div style="font-size:13px;letter-spacing:1px;color:' + ACCENT + ';font-weight:bold;text-transform:uppercase;">' + esc(b.eyebrow) + '</div>' : '') +
        '<div style="font-size:22px;font-weight:bold;color:' + DARK + ';padding:4px 0 2px;">' + esc(b.title || '') + '</div>' +
        (b.subtitle ? '<div style="font-size:14px;color:' + GREY + ';">' + esc(b.subtitle) + '</div>' : '') +
        (b.buttonText ? '<div style="padding-top:14px;"><a href="' + (b.url || '#') + '" style="display:inline-block;background:' + BLUE + ';color:#fff;font-size:15px;font-weight:bold;text-decoration:none;padding:13px 32px;border-radius:6px;">' + esc(b.buttonText) + '</a></div>' : '') +
        '</div>'
    case 'grid': {
      const cards = b.cards || []
      const cols = b.columns === 1 ? 1 : (b.columns === 3 ? 3 : 2)
      const w = Math.floor(100 / cols)
      let rows = ''
      for (let i = 0; i < cards.length; i += cols) {
        rows += '<tr>'
        for (let c = 0; c < cols; c++) {
          const card = cards[i + c]
          if (!card) { rows += '<td width="' + w + '%"></td>'; continue }
          const inner = '<img src="' + card.image + '" width="264" style="display:block;width:100%;max-width:264px;height:150px;object-fit:cover;border:0;" alt="" />' +
            '<div style="padding:10px 8px;text-align:center;font-family:Arial,sans-serif;"><div style="font-size:15px;font-weight:bold;color:' + DARK + ';">' + esc(card.caption) + '</div>' + (card.url ? '<div style="font-size:13px;color:' + BLUE + ';font-weight:bold;padding-top:3px;">Shop &rarr;</div>' : '') + '</div>'
          rows += '<td width="' + w + '%" valign="top" style="padding:6px;">' + (card.url ? '<a href="' + card.url + '" style="text-decoration:none;color:' + DARK + ';display:block;border:1px solid ' + BORDER + ';border-radius:10px;overflow:hidden;background:#fff;">' + inner + '</a>' : '<div style="border:1px solid ' + BORDER + ';border-radius:10px;overflow:hidden;background:#fff;">' + inner + '</div>') + '</td>'
        }
        rows += '</tr>'
      }
      return (b.title ? '<div style="text-align:center;font-family:Arial,sans-serif;margin:8px 0 2px;"><div style="font-size:20px;font-weight:bold;color:' + DARK + ';">' + esc(b.title) + '</div>' + (b.subtitle ? '<div style="font-size:13px;color:' + GREY + ';padding-bottom:6px;">' + esc(b.subtitle) + '</div>' : '') + '</div>' : '') +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + rows + '</table>'
    }
    case 'badges': {
      const cards = b.cards || []
      const w = cards.length ? Math.floor(100 / cards.length) : 100
      let cells = ''
      cards.forEach((card) => {
        cells += '<td width="' + w + '%" align="center" style="padding:8px;"><img src="' + card.image + '" width="88" style="display:block;width:88px;height:88px;border:0;margin:0 auto;" alt="" /></td>'
      })
      return (b.title ? '<div style="text-align:center;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;color:' + DARK + ';padding:6px 0 4px;">' + esc(b.title) + '</div>' : '') +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' + cells + '</tr></table>'
    }
    default:
      return ''
  }
}

function blocksToHtml(blocks: Block[]): string {
  return blocks.map(blockHtml).join('\n')
}

const ORIGIN = 'https://www.friendlypartyrental.com'

function starterBlocks(): Block[] {
  return [
    { id: uid(), type: 'heading', text: 'Your Best Event Starts Here', align: 'center' },
    { id: uid(), type: 'text', text: 'Tents, tables, bounce houses & more \u2014 delivered, set up, and picked up for you.', align: 'center' },
    { id: uid(), type: 'hero', image: ORIGIN + '/images/wedding-backyard-elopement.jpg', url: ORIGIN + '/rentals' },
    { id: uid(), type: 'offer', eyebrow: 'Limited-Time Offer', title: 'Save 15% on your next order', subtitle: 'Book by June 30th \u2014 mention code SUMMER15 on your quote.', code: 'SUMMER15', buttonText: 'Browse Rentals', url: ORIGIN + '/rentals' },
    {
      id: uid(), type: 'grid', title: 'Popular Rentals', subtitle: 'Tap any category to explore', columns: 2,
      cards: [
        { image: ORIGIN + '/api/category-image/tent-rentals', caption: 'Tents & Canopies', url: ORIGIN + '/rentals' },
        { image: ORIGIN + '/api/category-image/table-chair-rentals', caption: 'Tables & Chairs', url: ORIGIN + '/rentals' },
        { image: ORIGIN + '/api/category-image/bounce-house-rentals', caption: 'Bounce Houses', url: ORIGIN + '/rentals' },
        { image: ORIGIN + '/api/category-image/photobooth-rentals', caption: 'Photo Booths', url: ORIGIN + '/rentals' },
        { image: ORIGIN + '/api/category-image/concession-machine-rentals', caption: 'Concessions', url: ORIGIN + '/rentals' },
        { image: ORIGIN + '/api/category-image/yard-game-rentals', caption: 'Yard Games', url: ORIGIN + '/rentals' },
      ],
    },
    { id: uid(), type: 'divider' },
    {
      id: uid(), type: 'badges', title: 'Why Friendly Party Rental?',
      cards: [
        { image: ORIGIN + '/images/badge-syracuse-number1-party-rental.png', caption: '', url: '' },
        { image: ORIGIN + '/images/badge-all-day-8-hour-rental.png', caption: '', url: '' },
        { image: ORIGIN + '/images/badge-all-day-best-price-guarantee.png', caption: '', url: '' },
      ],
    },
    { id: uid(), type: 'text', text: "Questions? Call 864-610-5324 \u2014 we're happy to help you plan the perfect event.", align: 'center' },
  ]
}

export default function MarketingHubPage() {
  const [blocks, setBlocks] = useState<Block[]>(starterBlocks())
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('Your Best Event Starts Here \u2014 Save 15% on Party Rentals')
  const [templates, setTemplates] = useState<Template[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [library, setLibrary] = useState<ImageItem[]>([])
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [segment, setSegment] = useState('all')
    const [scheduledAt, setScheduledAt] = useState('')
    const [scheduling, setScheduling] = useState(false)
  const [preview, setPreview] = useState<'desktop' | 'mobile'>('desktop')
  const [picker, setPicker] = useState<{ blockId: string; cardIndex: number | null } | null>(null)

  const loadTemplates = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/email-templates-marketing', { cache: 'no-store' })
      if (r.ok) { const d = await r.json(); setTemplates(d.items || []) }
    } catch { /* ignore */ }
  }, [])

  const loadLibrary = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/general-images', { cache: 'no-store' })
      if (r.ok) { const d = await r.json(); setLibrary(d.items || []) }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadTemplates(); loadLibrary() }, [loadTemplates, loadLibrary])

  function addBlock(type: BlockType) {
    setBlocks((b) => [...b, newBlock(type)])
  }
  function removeBlock(id: string) {
    setBlocks((b) => b.filter((x) => x.id !== id))
  }
  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((b) => {
      const i = b.findIndex((x) => x.id === id)
      const j = i + dir
      if (i < 0 || j < 0 || j >= b.length) return b
      const copy = [...b]
      const tmp = copy[i]; copy[i] = copy[j]; copy[j] = tmp
      return copy
    })
  }
  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }
  function updateCard(blockId: string, idx: number, patch: Partial<Card>) {
    setBlocks((b) => b.map((x) => {
      if (x.id !== blockId) return x
      const cards = [...(x.cards || [])]
      cards[idx] = { ...cards[idx], ...patch }
      return { ...x, cards }
    }))
  }
  function addCard(blockId: string) {
    setBlocks((b) => b.map((x) => (x.id === blockId ? { ...x, cards: [...(x.cards || []), { image: ORIGIN + '/api/category-image/tent-rentals', caption: 'New Item', url: ORIGIN + '/rentals' }] } : x)))
  }
  function removeCard(blockId: string, idx: number) {
    setBlocks((b) => b.map((x) => (x.id === blockId ? { ...x, cards: (x.cards || []).filter((_, i) => i !== idx) } : x)))
  }

  function loadTemplate(t: Template) {
    try {
      const parsed = JSON.parse(t.content)
      if (Array.isArray(parsed)) setBlocks(parsed)
    } catch { /* ignore */ }
    setName(t.name); setSubject(t.subject); setEditingId(t.id)
    setStatus('Loaded "' + t.name + '"')
  }
  function newCampaign() {
    setBlocks(starterBlocks()); setName(''); setEditingId(null); setStatus('')
    setSubject('Your Best Event Starts Here \u2014 Save 15% on Party Rentals')
  }

  async function saveCampaign() {
    if (!name.trim()) { setStatus('Please enter a campaign name.'); return }
    setSaving(true); setStatus('')
    try {
      const payload = { name: name.trim(), subject, content: JSON.stringify(blocks), isActive: true }
      const url = '/api/admin/email-templates-marketing'
      const res = editingId
        ? await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
        : await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (res.ok) { const d = await res.json(); if (d.item && d.item.id) setEditingId(d.item.id); setStatus('Saved.'); loadTemplates() }
      else setStatus('Could not save (' + res.status + ').')
    } catch { setStatus('Could not save.') }
    setSaving(false)
  }

                                                                                             async function scheduleCampaign() {
                                                                                                   if (!name.trim()) { setStatus('Please enter a campaign name.'); return }
                                                                                                   if (!scheduledAt) { setStatus('Please choose a date and time to schedule this campaign.'); return }
                                                                                                   const when = new Date(scheduledAt)
                                                                                                   if (isNaN(when.getTime()) || when.getTime() <= Date.now()) { setStatus('Please choose a future date and time.'); return }
                                                                                                   setScheduling(true); setStatus('')
                                                                                                   try {
                                                                                                           const html = blocksToHtml(blocks)
                                                                                                           const payload = {
                                                                                                                     name: name.trim(),
                                                                                                                     subject,
                                                                                                                     content: JSON.stringify(blocks),
                                                                                                                     isActive: true,
                                                                                                                     status: 'scheduled',
                                                                                                                     scheduledAt: when.toISOString(),
                                                                                                                     segment,
                                                                                                                     renderedHtml: html,
                                                                                                             }
                                                                                                           const url = '/api/admin/email-templates-marketing'
                                                                                                           const res = editingId
                                                                                                             ? await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
                                                                                                                     : await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
                                                                                                           if (res.ok) {
                                                                                                                     const d = await res.json(); if (d.item && d.item.id) setEditingId(d.item.id)
                                                                                                                     setStatus('Scheduled for ' + when.toLocaleString() + '.')
                                                                                                                     loadTemplates()
                                                                                                             } else setStatus('Could not schedule (' + res.status + ').')
                                                                                                     } catch { setStatus('Could not schedule.') }
                                                                                                   setScheduling(false)
                                                                                             }

    async function cancelSchedule(t: Template) {
          try {
                  const res = await fetch('/api/admin/email-templates-marketing', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, status: 'draft', scheduledAt: null }) })
                  if (res.ok) { setStatus('Schedule canceled.'); loadTemplates() }
          } catch { /* ignore */ }
    }

    async function deleteCampaign(t: Template) {
          if (!confirm('Delete "' + (t.name || 'Untitled') + '"? This cannot be undone.')) return
          try {
                  const res = await fetch('/api/admin/email-templates-marketing?id=' + t.id, { method: 'DELETE' })
                  if (res.ok) {
                            setStatus('Deleted.')
                            if (editingId === t.id) { newCampaign() }
                            loadTemplates()
                  } else setStatus('Could not delete (' + res.status + ').')
          } catch { setStatus('Could not delete.') }
    }

  async function send(mode: 'test' | 'campaign') {
    if (mode === 'test' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(testEmail)) { setStatus('Enter a valid test email address.'); return }
    setSending(true); setStatus('')
    try {
      const html = blocksToHtml(blocks)
      const payload: Record<string, unknown> = { mode, subject, html }
      if (mode === 'test') payload.testEmail = testEmail
      else payload.segment = segment
      const res = await fetch('/api/admin/marketing-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        const sim = d.result && d.result.simulated ? ' (simulated \u2014 SMTP not configured)' : ''
        setStatus(mode === 'test' ? 'Test email sent to ' + testEmail + '.' + sim : 'Campaign sent to ' + (d.recipients || 0) + ' recipient(s).' + sim)
      } else setStatus(d.error || 'Send failed (' + res.status + ').')
    } catch { setStatus('Send failed.') }
    setSending(false)
  }

  function chooseImage(imageUrl: string) {
    if (!picker) return
    if (picker.cardIndex === null) updateBlock(picker.blockId, { image: imageUrl })
    else updateCard(picker.blockId, picker.cardIndex, { image: imageUrl })
    setPicker(null)
  }

  const inputCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm'
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1'

  function ImageField({ value, onPick }: { value?: string; onPick: () => void }) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-14 h-14 border border-gray-200 rounded bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
          {value ? <img src={value} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] text-gray-400">none</span>}
        </div>
        <button type="button" onClick={onPick} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">Choose image</button>
      </div>
    )
  }

  function renderEditor(b: Block) {
    switch (b.type) {
      case 'heading':
      case 'text':
        return (
          <div className="space-y-2">
            <textarea className={inputCls} rows={b.type === 'text' ? 3 : 2} value={b.text || ''} onChange={(e) => updateBlock(b.id, { text: e.target.value })} />
            <AlignPicker b={b} />
          </div>
        )
      case 'button':
        return (
          <div className="space-y-2">
            <div><label className={labelCls}>Button text</label><input className={inputCls} value={b.text || ''} onChange={(e) => updateBlock(b.id, { text: e.target.value })} /></div>
            <div><label className={labelCls}>Link URL</label><input className={inputCls} value={b.url || ''} onChange={(e) => updateBlock(b.id, { url: e.target.value })} /></div>
            <AlignPicker b={b} />
          </div>
        )
      case 'image':
      case 'hero':
        return (
          <div className="space-y-2">
            <div><label className={labelCls}>Image</label><ImageField value={b.image} onPick={() => setPicker({ blockId: b.id, cardIndex: null })} /></div>
            <div><label className={labelCls}>Links to (optional)</label><input className={inputCls} value={b.url || ''} onChange={(e) => updateBlock(b.id, { url: e.target.value })} /></div>
            {b.type === 'image' && <AlignPicker b={b} />}
          </div>
        )
      case 'offer':
        return (
          <div className="space-y-2">
            <div><label className={labelCls}>Eyebrow</label><input className={inputCls} value={b.eyebrow || ''} onChange={(e) => updateBlock(b.id, { eyebrow: e.target.value })} /></div>
            <div><label className={labelCls}>Title</label><input className={inputCls} value={b.title || ''} onChange={(e) => updateBlock(b.id, { title: e.target.value })} /></div>
            <div><label className={labelCls}>Subtitle</label><input className={inputCls} value={b.subtitle || ''} onChange={(e) => updateBlock(b.id, { subtitle: e.target.value })} /></div>
            <div><label className={labelCls}>Button text</label><input className={inputCls} value={b.buttonText || ''} onChange={(e) => updateBlock(b.id, { buttonText: e.target.value })} /></div>
            <div><label className={labelCls}>Button link</label><input className={inputCls} value={b.url || ''} onChange={(e) => updateBlock(b.id, { url: e.target.value })} /></div>
          </div>
        )
      case 'grid':
        return (
          <div className="space-y-2">
            <div><label className={labelCls}>Section title</label><input className={inputCls} value={b.title || ''} onChange={(e) => updateBlock(b.id, { title: e.target.value })} /></div>
            <div><label className={labelCls}>Section subtitle</label><input className={inputCls} value={b.subtitle || ''} onChange={(e) => updateBlock(b.id, { subtitle: e.target.value })} /></div>
            <div><label className={labelCls}>Columns</label>
              <select className={inputCls} value={b.columns || 2} onChange={(e) => updateBlock(b.id, { columns: Number(e.target.value) })}>
                <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
              </select>
            </div>
            <div className="space-y-2">
              {(b.cards || []).map((card, i) => (
                <div key={i} className="border border-gray-200 rounded p-2 space-y-2 bg-gray-50">
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-600">Card {i + 1}</span><button type="button" onClick={() => removeCard(b.id, i)} className="text-xs text-red-600 hover:underline">Remove</button></div>
                  <ImageField value={card.image} onPick={() => setPicker({ blockId: b.id, cardIndex: i })} />
                  <input className={inputCls} placeholder="Caption" value={card.caption} onChange={(e) => updateCard(b.id, i, { caption: e.target.value })} />
                  <input className={inputCls} placeholder="Link URL" value={card.url} onChange={(e) => updateCard(b.id, i, { url: e.target.value })} />
                </div>
              ))}
              <button type="button" onClick={() => addCard(b.id)} className="text-sm text-blue-700 font-medium hover:underline">+ Add card</button>
            </div>
          </div>
        )
      case 'badges':
        return (
          <div className="space-y-2">
            <div><label className={labelCls}>Section title</label><input className={inputCls} value={b.title || ''} onChange={(e) => updateBlock(b.id, { title: e.target.value })} /></div>
            <div className="space-y-2">
              {(b.cards || []).map((card, i) => (
                <div key={i} className="border border-gray-200 rounded p-2 space-y-2 bg-gray-50">
                  <div className="flex items-center justify-between"><span className="text-xs font-semibold text-gray-600">Badge {i + 1}</span><button type="button" onClick={() => removeCard(b.id, i)} className="text-xs text-red-600 hover:underline">Remove</button></div>
                  <ImageField value={card.image} onPick={() => setPicker({ blockId: b.id, cardIndex: i })} />
                </div>
              ))}
              <button type="button" onClick={() => addCard(b.id)} className="text-sm text-blue-700 font-medium hover:underline">+ Add badge</button>
            </div>
          </div>
        )
      default:
        return <div className="text-xs text-gray-400">No options for this block.</div>
    }
  }

  function AlignPicker({ b }: { b: Block }) {
    return (
      <div className="flex gap-1">
        {(['left', 'center', 'right'] as const).map((a) => (
          <button key={a} type="button" onClick={() => updateBlock(b.id, { align: a })} className={'px-2 py-1 text-xs rounded border ' + (b.align === a ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600')}>{a}</button>
        ))}
      </div>
    )
  }

  function ImagePicker() {
    const [tab, setTab] = useState<'url' | 'library' | 'site'>('url')
    const [urlValue, setUrlValue] = useState('')
    const [saveName, setSaveName] = useState('')
    const [savingImg, setSavingImg] = useState(false)
    const [msg, setMsg] = useState('')

    async function saveToLibrary() {
      if (!/^https?:\/\//.test(urlValue)) { setMsg('Enter a valid image URL (starting with http).'); return }
      setSavingImg(true); setMsg('')
      try {
        const res = await fetch('/api/admin/general-images', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: saveName.trim() || 'My image', url: urlValue.trim(), category: 'marketing', isActive: true }),
        })
        if (res.ok) { setMsg('Saved to library.'); setSaveName(''); loadLibrary() }
        else setMsg('Could not save (' + res.status + ').')
      } catch { setMsg('Could not save.') }
      setSavingImg(false)
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setPicker(null)}>
        <div className="bg-white rounded-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Choose an image</h3>
            <button type="button" onClick={() => setPicker(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">&times;</button>
          </div>
          <div className="flex gap-1 px-4 pt-3">
            {([['url', 'Paste URL'], ['library', 'My Library'], ['site', 'Site Photos']] as const).map(([k, lbl]) => (
              <button key={k} type="button" onClick={() => setTab(k)} className={'px-3 py-1.5 text-sm rounded-t ' + (tab === k ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-500')}>{lbl}</button>
            ))}
          </div>
          <div className="p-4 overflow-auto">
            {tab === 'url' && (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Paste a link to any image on the web. Tip: right-click an image online and copy its address. (Direct file uploads need an image host \u2014 not set up yet.)</p>
                <input className={inputCls} value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://\u2026/photo.jpg" />
                {urlValue && <img src={urlValue} alt="" className="max-h-40 rounded border border-gray-200" />}
                <div className="flex gap-2">
                  <button type="button" onClick={() => urlValue && chooseImage(urlValue.trim())} className="px-4 py-2 text-sm bg-blue-600 text-white rounded">Use this image</button>
                </div>
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <label className={labelCls}>Save to my library for reuse (optional)</label>
                  <div className="flex gap-2">
                    <input className={inputCls} value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Image name" />
                    <button type="button" onClick={saveToLibrary} disabled={savingImg} className="px-3 py-2 text-sm border border-gray-300 rounded whitespace-nowrap disabled:opacity-50">Save to library</button>
                  </div>
                  {msg && <p className="text-xs text-gray-600">{msg}</p>}
                </div>
              </div>
            )}
            {tab === 'library' && (
              library.length === 0 ? <p className="text-sm text-gray-400">Your library is empty. Add images from the "Paste URL" tab.</p> : (
                <div className="grid grid-cols-3 gap-3">
                  {library.map((img) => (
                    <button key={img.id} type="button" onClick={() => chooseImage(img.url)} className="border border-gray-200 rounded overflow-hidden hover:ring-2 hover:ring-blue-500">
                      <img src={img.url} alt={img.name} className="w-full h-24 object-cover" />
                      <div className="text-[11px] text-gray-600 truncate px-1 py-0.5">{img.name}</div>
                    </button>
                  ))}
                </div>
              )
            )}
            {tab === 'site' && (
              <div className="grid grid-cols-3 gap-3">
                {SITE_CATEGORIES.map((slug) => {
                  const u = ORIGIN + '/api/category-image/' + slug
                  return (
                    <button key={slug} type="button" onClick={() => chooseImage(u)} className="border border-gray-200 rounded overflow-hidden hover:ring-2 hover:ring-blue-500">
                      <img src={u} alt={slug} className="w-full h-24 object-cover" />
                      <div className="text-[11px] text-gray-600 truncate px-1 py-0.5">{slug.replace(/-rentals$/, '').replace(/-/g, ' ')}</div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const BLOCK_TYPES: { type: BlockType; label: string }[] = [
    { type: 'heading', label: '+ Heading' },
    { type: 'text', label: '+ Text' },
    { type: 'hero', label: '+ Hero image' },
    { type: 'image', label: '+ Image' },
    { type: 'offer', label: '+ Offer box' },
    { type: 'grid', label: '+ Image grid' },
    { type: 'badges', label: '+ Badge row' },
    { type: 'button', label: '+ Button' },
    { type: 'divider', label: '+ Divider' },
    { type: 'spacer', label: '+ Spacer' },
  ]

  const previewHtml = blocksToHtml(blocks)
  const frame = '<div style="max-width:600px;margin:0 auto;background:#fff;padding:26px 28px;font-family:Arial,sans-serif;color:' + DARK + ';">' + previewHtml + '</div>'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Marketing Hub</h1>
        <button type="button" onClick={newCampaign} className="px-4 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50">+ New campaign</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Saved campaigns */}
        <div className="lg:col-span-3">
          <div className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Saved Campaigns</h2>
            {templates.length === 0 ? (
              <p className="text-sm text-gray-400">No saved campaigns yet. Build one and click Save.</p>
            ) : (
              <ul className="space-y-1">
                {templates.map((t) => (
                  <li key={t.id}>
                    <div className={'w-full flex items-center gap-1 px-2 py-2 rounded text-sm hover:bg-gray-100 ' + (editingId === t.id ? 'bg-blue-50 text-blue-800 font-medium' : 'text-gray-700')}>
                      <button type="button" onClick={() => loadTemplate(t)} className="flex-1 text-left truncate">
                      <span>{t.name || 'Untitled'}</span>
                        {t.status === 'scheduled' && t.scheduledAt ? (<span className="block text-[11px] text-amber-600">Scheduled: {new Date(t.scheduledAt).toLocaleString()}</span>) : null}
                        {t.status === 'sent' ? (<span className="block text-[11px] text-green-600">Sent</span>) : null}
                        {t.status === 'failed' ? (<span className="block text-[11px] text-red-600">Failed</span>) : null}
                      </button>
                      {t.status === 'scheduled' ? (<button type="button" onClick={() => cancelSchedule(t)} className="text-[11px] text-gray-500 hover:underline whitespace-nowrap">Cancel</button>) : null}
                    <button type="button" onClick={() => deleteCampaign(t)} className="text-[11px] text-red-500 hover:underline whitespace-nowrap">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Builder */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Build Email</h2>
            <div><label className={labelCls}>Campaign name</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer 2026 Promo" /></div>
            <div><label className={labelCls}>Email subject line</label><input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
          </div>

          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map((bt) => (
              <button key={bt.type} type="button" onClick={() => addBlock(bt.type)} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700">{bt.label}</button>
            ))}
          </div>

          <div className="space-y-3">
            {blocks.map((b, i) => (
              <div key={b.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{b.type}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveBlock(b.id, -1)} disabled={i === 0} className="px-2 py-0.5 text-xs border border-gray-300 rounded disabled:opacity-30">&uarr;</button>
                    <button type="button" onClick={() => moveBlock(b.id, 1)} disabled={i === blocks.length - 1} className="px-2 py-0.5 text-xs border border-gray-300 rounded disabled:opacity-30">&darr;</button>
                    <button type="button" onClick={() => removeBlock(b.id)} className="px-2 py-0.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50">&times;</button>
                  </div>
                </div>
                {renderEditor(b)}
              </div>
            ))}
          </div>

          <button type="button" onClick={saveCampaign} disabled={saving} className="w-full py-2.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving\u2026' : (editingId ? 'Update campaign' : 'Save campaign')}</button>
        </div>

        {/* Preview + Send */}
        <div className="lg:col-span-4 space-y-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">Preview</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => setPreview('desktop')} className={'px-2 py-1 text-xs rounded ' + (preview === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-600')}>Desktop</button>
                <button type="button" onClick={() => setPreview('mobile')} className={'px-2 py-1 text-xs rounded ' + (preview === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-600')}>Mobile</button>
              </div>
            </div>
            <div className="bg-gray-100 p-3 max-h-[520px] overflow-auto">
              <div style={{ width: preview === 'mobile' ? 360 : '100%', margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: frame }} />
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Send</h2>
            <div><label className={labelCls}>Send a test to yourself first</label>
              <div className="flex gap-2">
                <input className={inputCls} value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="you@example.com" />
                <button type="button" onClick={() => send('test')} disabled={sending} className="px-3 py-2 text-sm bg-gray-800 text-white rounded whitespace-nowrap disabled:opacity-50">Send test</button>
              </div>
            </div>
            <div><label className={labelCls}>Audience</label>
              <select className={inputCls} value={segment} onChange={(e) => setSegment(e.target.value)}>
                <option value="all">All customers</option>
                <option value="outstanding">Outstanding balance</option>
                <option value="recent">Recent (90 days)</option>
                <option value="lapsed">Lapsed (180+ days)</option>
              </select>
            </div>
            <div><label className={labelCls}>Or schedule for later (optional)</label>
            <div className="flex gap-2">
            <input type="datetime-local" className={inputCls} value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            <button type="button" onClick={scheduleCampaign} disabled={scheduling} className="px-3 py-2 text-sm bg-amber-600 text-white rounded whitespace-nowrap disabled:opacity-50">{scheduling ? 'Scheduling\u2026' : 'Schedule send'}</button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Schedules this exact campaign (current builder content + selected audience) to send automatically at the chosen date and time.</p>
            </div>
            <button type="button" onClick={() => send('campaign')} disabled={sending} className="w-full py-2.5 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50">{sending ? 'Sending\u2026' : 'Send campaign'}</button>
            {status && <p className="text-sm text-gray-700 pt-1">{status}</p>}
          </div>
        </div>
      </div>

      {picker && <ImagePicker />}
    </div>
  )
}
