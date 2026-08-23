'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface WebsitePageItem {
  id: string
  slug: string
  title: string
  isPublished: boolean
}

interface PageCode {
  id: string
  slug: string
  code: string
}

interface Settings {
  id: string
  headerStyle: number
  footerStyle: string
  storeBackgroundImage: string | null
  storeBackgroundTint: string
  categoryDisplayStyle: string
  colorTheme: string
  btnPrimaryColor: string
  btnPrimaryColorBg: string
  headerFont: string
  headerFont2: string
  categoryCarouselCount: number
  globalCustomCode: string | null
}

// Real static pages that exist on the live site (matches sitemap.xml).
// These always show in Responsive Pages even though they are not rows in
// the WebsitePage table (which only stores extra custom-built pages).
const STATIC_PAGES: WebsitePageItem[] = [
  { id: 'static-home', slug: 'home', title: 'Home', isPublished: true },
  { id: 'static-about', slug: 'about_us', title: 'About Us', isPublished: true },
  { id: 'static-weddings', slug: 'weddings', title: 'Weddings', isPublished: true },
  { id: 'static-wedding-packages', slug: 'wedding-packages', title: 'Wedding Packages', isPublished: true },
  { id: 'static-contact', slug: 'contact_us', title: 'Contact Us', isPublished: true },
  { id: 'static-employment', slug: 'employment', title: 'Employment', isPublished: true },
  { id: 'static-faqs', slug: 'frequently_asked_questions', title: 'FAQs', isPublished: true },
  { id: 'static-gallery', slug: 'gallery', title: 'Gallery', isPublished: true },
  { id: 'static-order-by-date', slug: 'order-by-date', title: 'Order by Date', isPublished: true },
  { id: 'static-service-area', slug: 'service-area', title: 'Service Area', isPublished: true },
]

const HEADER_STYLES = [
  { value: 1, label: '[1] Navigation with Social Media, Blue' },
  { value: 6, label: '[6] Navigation with Social Media, Black & White' },
  { value: 2, label: '[2] Compact Navigation' },
  { value: 3, label: '[3] Centered Logo Navigation' },
  { value: 12, label: '[12] Centered Navigation, Logo Only' },
  { value: 11, label: '[11] Centered Logo (larger) Navigation' },
  { value: 4, label: '[4] Navigation Only Right - no logo, etc' },
  { value: 15, label: '[15] Navigation Only Left - no logo, etc' },
  { value: 14, label: '[14] Navigation Only Centered - no logo, etc' },
  { value: 5, label: '[5] Centered Logo Nav with Cover Background, Blue foreground' },
  { value: 8, label: '[8] Centered Logo Nav with Cover Background, Black foreground' },
  { value: 9, label: '[9] Centered Logo Nav with Cover Background, White foreground' },
  { value: 10, label: '[10] Centered Logo Navigation with black bar' },
  { value: 16, label: '[16] Inline Navigation with Cover Background, logo left, nav right, white text' },
  { value: 20, label: '[20] Inline Navigation with Cover Background, logo left, nav right, black text' },
  { value: 17, label: '[17] Inline Navigation with Cover Background, logo right, nav left, white text' },
  { value: 21, label: '[21] Inline Navigation with Cover Background, logo right, nav left, black text' },
  { value: 13, label: '[13] [Level 12] Testing 01' },
  { value: 7, label: '[7] [Level 12] Testing 02' },
]

const FOOTER_STYLES = [
  { value: 'none', label: 'No Footer' },
  { value: 'dark', label: 'Dark with links and social media' },
  { value: 'light-center', label: 'Light with center logo and links' },
  { value: 'light-links', label: 'Light with links' },
]

const TINT_OPTIONS = [
  { value: 'none', label: 'No background tint' },
  { value: 'dark', label: 'Dark background tint' },
]

const DISPLAY_STYLES = [
  { value: 'boxed', label: 'Boxed Images' },
  { value: 'circled', label: 'Circled Images' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'minimal-no-gutter', label: 'Minimal, No Gutter' },
  { value: 'image-only', label: 'Actual Image only' },
  { value: 'image-title', label: 'Actual Image with Title' },
]

const COLOR_THEMES: Record<string, string> = {
  theme1: '#F5A31B',
  theme2: '#2E7D32',
  theme3: '#1565C0',
  theme4: '#C62828',
  theme5: '#6A1B9A',
  theme6: '#00838F',
}

const FONT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'serif', label: 'Serif' },
  { value: 'rounded', label: 'Rounded' },
  { value: 'condensed', label: 'Condensed' },
]

export default function ResponsiveEditorPage() {
  const [pages, setPages] = useState<WebsitePageItem[]>([])
  const [codes, setCodes] = useState<PageCode[]>([])
  const [settings, setSettings] = useState<Settings | null>(null)
  const [globalCode, setGlobalCode] = useState('')
  const [editingSlug, setEditingSlug] = useState<string | null>(null)
  const [codeDraft, setCodeDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    const [pagesRes, codesRes, settingsRes] = await Promise.all([
      fetch('/api/admin/website-pages'),
      fetch('/api/admin/page-custom-code'),
      fetch('/api/admin/theme-settings'),
    ])
    const pagesData = await pagesRes.json()
    const codesData = await codesRes.json()
    const settingsData = await settingsRes.json()
    setPages(pagesData.items || [])
    setCodes(codesData.items || [])
    setSettings(settingsData.settings)
    setGlobalCode(settingsData.settings?.globalCustomCode || '')
    setLoading(false)
  }

  async function saveSettings(patch: Partial<Settings>) {
    if (!settings) return
    setSaving(true)
    const res = await fetch('/api/admin/theme-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      const data = await res.json()
      setSettings(data.settings)
      toast.success('Saved')
    } else {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  async function saveGlobalCode() {
    await saveSettings({ globalCustomCode: globalCode })
  }

  function openPageCode(slug: string) {
    const existing = codes.find((c) => c.slug === slug)
    setEditingSlug(slug)
    setCodeDraft(existing ? existing.code : '')
  }

  async function savePageCode() {
    if (!editingSlug) return
    setSaving(true)
    const res = await fetch('/api/admin/page-custom-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: editingSlug, code: codeDraft }),
    })
    if (res.ok) {
      const data = await res.json()
      setCodes((prev) => {
        const others = prev.filter((c) => c.slug !== editingSlug)
        return [...others, data.item]
      })
      toast.success('Saved')
      setEditingSlug(null)
    } else {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  if (loading || !settings) {
    return <div className="p-6">Loading...</div>
  }

  // Merge the always-present real site pages with any extra custom pages
  // created via Website Pages / Visual Builder, de-duped by slug.
  const allPages: WebsitePageItem[] = [
    ...STATIC_PAGES,
    ...pages.filter((p) => !STATIC_PAGES.some((sp) => sp.slug === p.slug)),
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Responsive Editor</h1>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Responsive Pages</h2>
        <div className="divide-y max-h-96 overflow-y-auto">
          {allPages.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2">
              <div>
                <div className="font-medium">{p.title}</div>
                <div className="text-sm text-gray-500">/{p.slug === 'home' ? '' : p.slug}/</div>
              </div>
              <button
                onClick={() => openPageCode(p.slug)}
                className="text-sm text-blue-700 hover:underline"
              >
                Custom Code
              </button>
            </div>
          ))}
        </div>
        {editingSlug && (
          <div className="mt-4 border-t pt-4">
            <label className="block text-sm font-medium mb-1">Custom code for /{editingSlug}/</label>
            <textarea
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              className="w-full border rounded p-2 h-32 font-mono text-sm"
              placeholder="HTML/CSS/JS for this page only"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={savePageCode} disabled={saving} className="bg-green-800 hover:bg-green-900 text-white px-4 py-2 rounded">Save</button>
              <button onClick={() => setEditingSlug(null)} className="px-4 py-2 rounded border">Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Custom Code for Every Page</h2>
        <textarea
          value={globalCode}
          onChange={(e) => setGlobalCode(e.target.value)}
          className="w-full border rounded p-2 h-32 font-mono text-sm"
          placeholder="HTML/CSS/JS injected on every page (e.g. tracking pixels)"
        />
        <button onClick={saveGlobalCode} disabled={saving} className="mt-2 bg-green-800 hover:bg-green-900 text-white px-4 py-2 rounded">Save</button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Header Options</h2>
        <select
          value={settings.headerStyle}
          onChange={(e) => saveSettings({ headerStyle: parseInt(e.target.value, 10) })}
          className="border rounded p-2 w-full"
        >
          {HEADER_STYLES.map((h) => (
            <option key={h.value} value={h.value}>{h.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Footer Options</h2>
        <select
          value={settings.footerStyle}
          onChange={(e) => saveSettings({ footerStyle: e.target.value })}
          className="border rounded p-2 w-full"
        >
          {FOOTER_STYLES.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold mb-2">Store Options</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Store background image URL</label>
          <input
            type="text"
            defaultValue={settings.storeBackgroundImage || ''}
            onBlur={(e) => saveSettings({ storeBackgroundImage: e.target.value })}
            className="border rounded p-2 w-full"
            placeholder="https://..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Background tinting</label>
          <select
            value={settings.storeBackgroundTint}
            onChange={(e) => saveSettings({ storeBackgroundTint: e.target.value })}
            className="border rounded p-2"
          >
            {TINT_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category display style</label>
          <select
            value={settings.categoryDisplayStyle}
            onChange={(e) => saveSettings({ categoryDisplayStyle: e.target.value })}
            className="border rounded p-2"
          >
            {DISPLAY_STYLES.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-xl font-bold mb-2">Template Options</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Color theme</label>
          <div className="flex gap-2">
            {Object.entries(COLOR_THEMES).map(([key, hex]) => (
              <button
                key={key}
                onClick={() => saveSettings({ colorTheme: key })}
                title={key}
                style={{ backgroundColor: hex }}
                className={
                  'w-10 h-10 rounded-full border-4 ' +
                  (settings.colorTheme === key ? 'border-gray-800' : 'border-transparent')
                }
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Button primary color</label>
          <input
            type="color"
            defaultValue={settings.btnPrimaryColor}
            onBlur={(e) => saveSettings({ btnPrimaryColor: e.target.value })}
            className="border rounded h-10 w-20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Button background color</label>
          <input
            type="color"
            defaultValue={settings.btnPrimaryColorBg}
            onBlur={(e) => saveSettings({ btnPrimaryColorBg: e.target.value })}
            className="border rounded h-10 w-20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Header style font</label>
          <select
            value={settings.headerFont}
            onChange={(e) => saveSettings({ headerFont: e.target.value })}
            className="border rounded p-2"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Header style 2 font</label>
          <select
            value={settings.headerFont2}
            onChange={(e) => saveSettings({ headerFont2: e.target.value })}
            className="border rounded p-2"
          >
            {FONT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Category Carousel Display Count</label>
          <input
            type="number"
            defaultValue={settings.categoryCarouselCount}
            onBlur={(e) => saveSettings({ categoryCarouselCount: parseInt(e.target.value, 10) || 0 })}
            className="border rounded p-2 w-24"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-2">Preview (Not Home Page)</h2>
        <p className="text-sm text-gray-500 mb-4">
          Preview your navigation, footer and store settings live. You can resize your browser on desktop to see a preview. Changes save instantly, no rebuild needed.
        </p>
        <iframe
          src="https://www.friendlypartyrental.com/"
          className="w-full border rounded"
          style={{ height: '600px' }}
        />
      </div>
    </div>
  )
}
