'use client'

import { useEffect, useState, useCallback, Suspense, createElement } from 'react'
import { useSearchParams } from 'next/navigation'
import { getCampaignBySlug, campaignToBlocks, VISUAL_THEMES } from '@/lib/marketing/campaignLibrary'
import type { VisualStyle, VisualThemeTokens } from '@/lib/marketing/campaignLibrary'

const LAYOUT_STARTERS: { key: string; label: string; desc: string; slug: string }[] = [
  { key: 'editorialLuxury', label: 'Editorial Luxury', desc: 'Elegant masthead, large editorial hero, single refined call to action. Best for weddings and formal occasions.', slug: 'wedding-planning-season' },
  { key: 'boldSeasonal', label: 'Bold Seasonal', desc: 'Colored band, energetic seasonal photography, punchy short copy. Best for graduation, summer, fall pushes.', slug: 'fall-events' },
  { key: 'productShowcase', label: 'Product Hero', desc: 'One large product photo with a few key benefits. Best for photo booth, inflatables, tents.', slug: 'photo-booth-spotlight' },
  { key: 'corporateEditorial', label: 'Corporate Editorial', desc: 'Clean, professional, understated. Best for corporate picnics and holiday parties.', slug: 'corporate-picnic-season' },
  { key: 'personalLetter', label: 'Personal Letter', desc: 'Simple letter-style note, no hero image or product grid. Best for rebooking and personal outreach.', slug: 'annual-rebooking' },
  { key: 'availabilityUrgency', label: 'Availability Alert', desc: 'Date-forward banner treatment for real open-date and last-chance messaging.', slug: 'open-availability-opportunity' },
  { key: 'collectionMagazine', label: 'Magazine Collection', desc: 'Curated two-panel magazine-style spread. Best for showcasing a curated set of rentals.', slug: 'wedding-reception-essentials' },
  { key: 'announcement', label: 'Announcement', desc: 'Bold reveal treatment for new products, services, or packages.', slug: 'graduation-party-package' },
]


type BlockType = 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'hero' | 'offer' | 'grid' | 'badges' | 'masthead' | 'eyebrow' | 'splitrow' | 'featureRow' | 'trust' | 'dateBanner' | 'signature' | 'footerBrand'

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
  eyebrow?: string
  title?: string
  code?: string
  buttonText?: string
  cards?: Card[]
  columns?: number
  variant?: string
  items?: { title: string; text: string }[]
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

const DEFAULT_THEME: VisualStyle = 'professional'

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

// SECURITY: escape a value for safe placement inside an HTML attribute
// (quotes must be escaped too, unlike esc() which is only for text nodes).
function escAttr(s: string): string {
  return esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

// SECURITY: only allow safe URL schemes (or relative/anchor links) into
// href/src attributes. Rejects javascript:, data:, vbscript:, etc., and
// prevents attribute-breakout since the value is escaped separately by escAttr().
function safeUrl(url: string | undefined | null): string {
  const u = (url || '').trim()
  if (!u) return '#'
  if (u.startsWith('/') || u.startsWith('#')) return u
  if (/^(https?:|mailto:)/i.test(u)) return u
  return '#'
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
      return { id, type, text: 'Shop Now', url: 'https://fpr-nyc-production.up.railway.app/rentals', align: 'center' }
    case 'divider':
      return { id, type }
    case 'spacer':
      return { id, type }
    case 'hero':
      return { id, type, image: 'https://fpr-nyc-production.up.railway.app/images/wedding-backyard-elopement.jpg', url: 'https://fpr-nyc-production.up.railway.app/rentals' }
    case 'offer':
      return { id, type, eyebrow: 'Limited-Time Offer', title: 'Save 15% on your next order', subtitle: 'Book by June 30th — mention code SUMMER15 on your quote.', code: 'SUMMER15', buttonText: 'Browse Rentals', url: 'https://fpr-nyc-production.up.railway.app/rentals' }
    case 'grid':
      return {
        id, type, title: 'Popular Rentals', subtitle: 'Tap any category to explore', columns: 2,
        cards: [
          { image: 'https://fpr-nyc-production.up.railway.app/api/category-image/tent-rentals', caption: 'Tents & Canopies', url: 'https://fpr-nyc-production.up.railway.app/rentals' },
          { image: 'https://fpr-nyc-production.up.railway.app/api/category-image/table-chair-rentals', caption: 'Tables & Chairs', url: 'https://fpr-nyc-production.up.railway.app/rentals' },
        ],
      }
    case 'badges':
      return {
        id, type, title: 'Why Friendly Party Rental NYC?',
        cards: [
          { image: 'https://fpr-nyc-production.up.railway.app/images/badge-all-day-8-hour-rental.png', caption: '', url: '' },
          { image: 'https://fpr-nyc-production.up.railway.app/images/badge-all-day-best-price-guarantee.png', caption: '', url: '' },
        ],
      }
    case 'masthead':
      return { id, type, variant: 'standard' }
    case 'eyebrow':
      return { id, type, text: 'SEASONAL COLLECTION' }
    case 'splitrow':
      return { id, type, image: 'https://fpr-nyc-production.up.railway.app/api/category-image/tent-rentals', title: 'What You May Need', text: 'A short description of this section.', url: 'https://fpr-nyc-production.up.railway.app/rentals', align: 'left' }
    case 'featureRow':
      return { id, type, title: 'Highlights', items: [{ title: 'Delivered & Set Up', text: '' }, { title: 'Local Support', text: '' }, { title: 'Flexible Scheduling', text: '' }] }
    case 'trust':
      return { id, type, title: 'Trusted Across Downstate New York', items: [{ title: 'Local Riverdale business', text: '' }, { title: 'Delivery & setup included', text: '' }] }
    case 'dateBanner':
      return { id, type, eyebrow: 'LIMITED AVAILABILITY', text: 'Open Dates This Month', subtitle: 'Check availability before it fills.' }
    case 'signature':
      return { id, type, text: '— The Friendly Party Rental Team' }
    case 'footerBrand':
      return { id, type, variant: 'standard' }
    default:
      return { id, type: 'text', text: '', align: 'left' }
  }
}
const BLOCK_TYPE_LABELS: Record<BlockType, string> = { heading: 'Heading', text: 'Text', image: 'Image', button: 'Button', divider: 'Divider', spacer: 'Spacer', hero: 'Hero Image', offer: 'Offer Box', grid: 'Image Grid', badges: 'Badge Row', masthead: 'Masthead', eyebrow: 'Eyebrow Label', splitrow: 'Image + Text Row', featureRow: 'Feature Row', trust: 'Trust Strip', dateBanner: 'Date/Availability Banner', signature: 'Signature', footerBrand: 'Branded Footer' }
function blockTypeLabel(t: BlockType): string { return BLOCK_TYPE_LABELS[t] || t }
function blockHtml(b: Block, theme: VisualThemeTokens): string {
  const align = b.align || 'left'
  switch (b.type) {
    case 'heading':
      return '<h1 style="margin:0 0 14px;font-family:' + theme.headingFont + ';font-size:28px;line-height:1.25;color:' + theme.headingColor + ';text-align:' + align + ';letter-spacing:' + theme.letterSpacing + ';">' + esc(b.text || '') + '</h1>'
    case 'text':
      return '<p style="margin:0 0 14px;font-family:' + theme.bodyFont + ';font-size:16px;line-height:1.6;color:' + theme.textColor + ';text-align:' + align + ';">' + esc(b.text || '').replace(/\n/g, '<br />') + '</p>'
    case 'image': {
      if (!b.image) return ''
      const img = '<img src="' + escAttr(safeUrl(b.image)) + '" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:' + theme.radius + ';margin:0 auto 16px;" alt="" />'
      return '<div style="text-align:' + align + ';">' + (b.url ? '<a href="' + escAttr(safeUrl(b.url)) + '" style="text-decoration:none;">' + img + '</a>' : img) + '</div>'
    }
    case 'button':
      return '<div style="text-align:' + align + ';margin:18px 0;"><a href="' + escAttr(safeUrl(b.url)) + '" style="display:inline-block;background:' + theme.accent + ';color:' + theme.accentText + ';font-family:' + theme.bodyFont + ';font-size:15px;font-weight:bold;text-decoration:none;padding:13px 34px;border-radius:' + theme.radius + ';letter-spacing:' + theme.letterSpacing + ';">' + esc(b.text || 'Shop Now') + '</a></div>'
    case 'divider':
      return '<div style="border-top:1px solid ' + theme.borderColor + ';margin:20px 0;"></div>'
    case 'spacer':
      return '<div style="height:24px;line-height:24px;font-size:1px;">&nbsp;</div>'
    case 'hero': {
      if (!b.image) return ''
      const img = '<img src="' + escAttr(safeUrl(b.image)) + '" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:' + theme.heroRadius + ';margin:0 auto 8px;" alt="" />'
      return '<div style="text-align:center;margin-bottom:8px;">' + (b.url ? '<a href="' + escAttr(safeUrl(b.url)) + '" style="text-decoration:none;">' + img + '</a>' : img) + '</div>'
    }
    case 'offer':
      return '<div style="background:' + theme.panelBg + ';border:1px solid ' + theme.borderColor + ';border-radius:' + theme.radius + ';padding:20px;margin:16px 0;text-align:center;font-family:' + theme.bodyFont + ';">' +
        (b.eyebrow ? '<div style="font-size:13px;letter-spacing:' + theme.letterSpacing + ';color:' + theme.eyebrowColor + ';font-weight:bold;text-transform:uppercase;">' + esc(b.eyebrow) + '</div>' : '') +
        '<div style="font-size:22px;font-weight:bold;color:' + theme.headingColor + ';padding:4px 0 2px;font-family:' + theme.headingFont + ';">' + esc(b.title || '') + '</div>' +
        (b.subtitle ? '<div style="font-size:14px;color:' + theme.mutedColor + ';">' + esc(b.subtitle) + '</div>' : '') +
        (b.buttonText ? '<div style="padding-top:14px;"><a href="' + escAttr(safeUrl(b.url)) + '" style="display:inline-block;background:' + theme.accent + ';color:' + theme.accentText + ';font-size:15px;font-weight:bold;text-decoration:none;padding:13px 32px;border-radius:' + theme.radius + ';">' + esc(b.buttonText) + '</a></div>' : '') +
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
          const inner = '<img src="' + escAttr(safeUrl(card.image)) + '" width="264" style="display:block;width:100%;max-width:264px;height:150px;object-fit:cover;border:0;" alt="" />' +
            '<div style="padding:10px 8px;text-align:center;font-family:' + theme.bodyFont + ';"><div style="font-size:15px;font-weight:bold;color:' + theme.headingColor + ';">' + esc(card.caption) + '</div>' + (card.url ? '<div style="font-size:13px;color:' + theme.accent + ';font-weight:bold;padding-top:3px;">Shop &rarr;</div>' : '') + '</div>'
          rows += '<td width="' + w + '%" valign="top" style="padding:6px;">' + (card.url ? '<a href="' + escAttr(safeUrl(card.url)) + '" style="text-decoration:none;color:' + theme.headingColor + ';display:block;border:1px solid ' + theme.borderColor + ';border-radius:' + theme.radius + ';overflow:hidden;background:' + theme.cardBg + ';">' + inner + '</a>' : '<div style="border:1px solid ' + theme.borderColor + ';border-radius:' + theme.radius + ';overflow:hidden;background:' + theme.cardBg + ';">' + inner + '</div>') + '</td>'
        }
        rows += '</tr>'
      }
      return (b.title ? '<div style="text-align:center;font-family:' + theme.headingFont + ';margin:8px 0 2px;"><div style="font-size:20px;font-weight:bold;color:' + theme.headingColor + ';">' + esc(b.title) + '</div>' + (b.subtitle ? '<div style="font-size:13px;color:' + theme.mutedColor + ';padding-bottom:6px;font-family:' + theme.bodyFont + ';">' + esc(b.subtitle) + '</div>' : '') + '</div>' : '') +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + rows + '</table>'
    }
    case 'badges': {
      const cards = b.cards || []
      const w = cards.length ? Math.floor(100 / cards.length) : 100
      let cells = ''
      cards.forEach((card) => {
        cells += '<td width="' + w + '%" align="center" style="padding:8px;"><img src="' + escAttr(safeUrl(card.image)) + '" width="88" style="display:block;width:88px;height:88px;border:0;margin:0 auto;" alt="" /></td>'
      })
      return (b.title ? '<div style="text-align:center;font-family:' + theme.bodyFont + ';font-size:16px;font-weight:bold;color:' + theme.headingColor + ';padding:6px 0 4px;">' + esc(b.title) + '</div>' : '') +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' + cells + '</tr></table>'
    }
    case 'masthead': {
      const variant = b.variant || 'standard'
      if (variant === 'minimal') {
        return '<div style="text-align:center;padding:10px 0 6px;"><span style="font-family:' + theme.headingFont + ';font-size:15px;font-weight:bold;color:' + theme.headingColor + ';letter-spacing:1px;">FRIENDLY PARTY RENTAL</span></div>'
      }
      if (variant === 'editorial') {
        return '<div style="text-align:center;padding:6px 0 18px;"><div style="font-family:' + theme.headingFont + ';font-size:14px;font-weight:normal;color:' + theme.headingColor + ';letter-spacing:3px;text-transform:uppercase;">Friendly Party Rental NYC</div><div style="font-size:11px;color:' + theme.mutedColor + ';letter-spacing:1px;margin-top:4px;font-family:' + theme.bodyFont + ';font-style:italic;">Riverdale &amp; Downstate New York</div></div>'
      }
      return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:16px 0;border-bottom:3px solid ' + theme.accent + ';">' +
        '<div style="font-family:' + theme.headingFont + ';font-size:19px;font-weight:bold;color:' + theme.headingColor + ';letter-spacing:1.5px;">FRIENDLY PARTY RENTAL</div>' +
        '<div style="font-size:11px;color:' + theme.mutedColor + ';letter-spacing:1px;margin-top:2px;font-family:' + theme.bodyFont + ';">RIVERDALE &bull; BRONX &bull; LOWER WESTCHESTER EVENT RENTALS</div>' +
        '</td></tr></table>'
    }
    case 'eyebrow':
      return '<div style="text-align:center;font-family:' + theme.bodyFont + ';font-size:12px;font-weight:bold;letter-spacing:2px;color:' + theme.eyebrowColor + ';text-transform:uppercase;margin:2px 0 12px;">' + esc(b.text || '') + '</div>'
    case 'splitrow': {
      if (!b.image) return ''
      const imgTd = '<td width="46%" valign="top" style="padding:0;"><img src="' + escAttr(safeUrl(b.image)) + '" width="240" style="display:block;width:100%;max-width:240px;height:auto;border:0;border-radius:' + theme.radius + ';" alt="" /></td>'
      const txtTd = '<td width="54%" valign="top" style="padding:0 0 0 20px;"><div style="font-family:' + theme.headingFont + ';font-size:17px;font-weight:bold;color:' + theme.headingColor + ';margin:0 0 8px;">' + esc(b.title || '') + '</div><div style="font-family:' + theme.bodyFont + ';font-size:14px;line-height:1.6;color:' + theme.textColor + ';">' + esc(b.text || '') + '</div></td>'
      const rightImgTd = '<td width="46%" valign="top" style="padding:0 0 0 20px;"><img src="' + escAttr(safeUrl(b.image)) + '" width="240" style="display:block;width:100%;max-width:240px;height:auto;border:0;border-radius:' + theme.radius + ';" alt="" /></td>'
      const leftTxtTd = '<td width="54%" valign="top" style="padding:0 20px 0 0;"><div style="font-family:' + theme.headingFont + ';font-size:17px;font-weight:bold;color:' + theme.headingColor + ';margin:0 0 8px;">' + esc(b.title || '') + '</div><div style="font-family:' + theme.bodyFont + ';font-size:14px;line-height:1.6;color:' + theme.textColor + ';">' + esc(b.text || '') + '</div></td>'
      const row = b.align === 'right' ? (leftTxtTd + rightImgTd) : (imgTd + txtTd)
      const wrapped = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0;"><tr>' + row + '</tr></table>'
      return b.url ? '<a href="' + escAttr(safeUrl(b.url)) + '" style="text-decoration:none;color:inherit;display:block;">' + wrapped + '</a>' : wrapped
    }
    case 'featureRow': {
      const items = b.items || []
      const cols = items.length || 1
      const w = Math.floor(100 / cols)
      let cells = ''
      items.forEach((it) => {
        cells += '<td width="' + w + '%" valign="top" style="padding:0 10px;text-align:center;">' +
          '<div style="width:34px;height:34px;border-radius:50%;background:' + theme.panelBg + ';margin:0 auto 8px;line-height:34px;color:' + theme.accent + ';font-weight:bold;font-family:' + theme.headingFont + ';">&#10003;</div>' +
          '<div style="font-family:' + theme.bodyFont + ';font-size:14px;font-weight:bold;color:' + theme.headingColor + ';margin-bottom:3px;">' + esc(it.title) + '</div>' +
          (it.text ? '<div style="font-family:' + theme.bodyFont + ';font-size:12px;color:' + theme.mutedColor + ';">' + esc(it.text) + '</div>' : '') +
          '</td>'
      })
      return (b.title ? '<div style="text-align:center;font-family:' + theme.headingFont + ';font-size:18px;font-weight:bold;color:' + theme.headingColor + ';margin:10px 0 14px;">' + esc(b.title) + '</div>' : '') +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' + cells + '</tr></table>'
    }
    case 'trust': {
      const items = b.items || []
      const lines = items.map((it) => '<div style="padding:4px 0;font-family:' + theme.bodyFont + ';font-size:13px;color:' + theme.mutedColor + ';">' + esc(it.title) + '</div>').join('')
      return '<div style="text-align:center;border-top:1px solid ' + theme.borderColor + ';border-bottom:1px solid ' + theme.borderColor + ';padding:14px 0;margin:16px 0;">' +
        (b.title ? '<div style="font-family:' + theme.headingFont + ';font-size:13px;font-weight:bold;color:' + theme.headingColor + ';letter-spacing:0.5px;margin-bottom:6px;">' + esc(b.title) + '</div>' : '') +
        lines + '</div>'
    }
    case 'dateBanner':
      return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;"><tr><td align="center" style="background:' + theme.accent + ';color:' + theme.accentText + ';padding:20px 16px;border-radius:' + theme.radius + ';">' +
        (b.eyebrow ? '<div style="font-family:' + theme.bodyFont + ';font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;opacity:0.85;margin-bottom:6px;">' + esc(b.eyebrow) + '</div>' : '') +
        '<div style="font-family:' + theme.headingFont + ';font-size:24px;font-weight:bold;line-height:1.3;">' + esc(b.text || '') + '</div>' +
        (b.subtitle ? '<div style="font-family:' + theme.bodyFont + ';font-size:14px;margin-top:6px;opacity:0.9;">' + esc(b.subtitle) + '</div>' : '') +
        '</td></tr></table>'
    case 'signature':
      return '<div style="text-align:left;font-family:' + theme.headingFont + ';font-style:italic;font-size:15px;color:' + theme.textColor + ';margin:6px 0 4px;">' + esc(b.text || '') + '</div>'
    case 'footerBrand': {
      const variant = b.variant || 'standard'
      const contact = '315-884-1498 &nbsp;•&nbsp; fpr-nyc-production.up.railway.app'
      if (variant === 'minimal') {
        return '<div style="text-align:center;border-top:1px solid ' + theme.borderColor + ';padding-top:14px;margin-top:18px;font-family:' + theme.bodyFont + ';font-size:12px;color:' + theme.mutedColor + ';">' +
          'Friendly Party Rental &nbsp;•&nbsp; ' + contact + '<br/><a href="#" style="color:' + theme.mutedColor + ';text-decoration:underline;">Manage email preferences</a></div>'
      }
      if (variant === 'corporate') {
        return '<div style="text-align:center;border-top:1px solid ' + theme.borderColor + ';padding-top:16px;margin-top:20px;font-family:' + theme.bodyFont + ';font-size:12px;color:' + theme.mutedColor + ';">' +
          '<div style="font-weight:bold;color:' + theme.headingColor + ';margin-bottom:3px;">Friendly Party Rental NYC</div>' +
          'Tents &bull; Tables &bull; Chairs &bull; Event Rentals &mdash; Riverdale / Downstate New York<br/>' + contact + '<br/>' +
          '<a href="#" style="color:' + theme.mutedColor + ';text-decoration:underline;">Manage preferences</a> &nbsp;|&nbsp; <a href="#" style="color:' + theme.mutedColor + ';text-decoration:underline;">Unsubscribe</a></div>'
      }
      return '<div style="text-align:center;border-top:1px solid ' + theme.borderColor + ';padding-top:16px;margin-top:20px;font-family:' + theme.bodyFont + ';font-size:12px;color:' + theme.mutedColor + ';">' +
        '<div style="font-weight:bold;color:' + theme.headingColor + ';margin-bottom:3px;">Friendly Party Rental NYC</div>' +
        'Tents &bull; Tables &bull; Chairs &bull; Event Rentals<br/>Riverdale, NY &nbsp;•&nbsp; ' + contact + '<br/>' +
        '<a href="#" style="color:' + theme.mutedColor + ';text-decoration:underline;">Manage preferences</a> &nbsp;|&nbsp; <a href="#" style="color:' + theme.mutedColor + ';text-decoration:underline;">Unsubscribe</a></div>'
    }
    default:
      return ''
  }
}

function blocksToHtml(blocks: Block[], theme: VisualThemeTokens): string {
  return blocks.map((b) => blockHtml(b, theme)).join('\n')
}

interface ReadinessItem {
  label: string
  ok: boolean
  hint: string
}

function campaignReadiness(blocks: Block[], subject: string, preheader: string): ReadinessItem[] {
  const hasHero = blocks.some((b) => b.type === 'hero' && !!b.image)
  const hasCTA = blocks.some((b) => (b.type === 'button' && !!b.url) || (b.type === 'offer' && !!b.url && !!b.buttonText))
  const phoneRe = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/
  const hasFooterContact = blocks.some((b) => (b.type === 'text' && phoneRe.test(b.text || '')) || b.type === 'footerBrand')
  return [
    { label: 'Subject line', ok: subject.trim().length > 0, hint: 'Add an email subject line.' },
    { label: 'Preview text', ok: preheader.trim().length > 0, hint: 'Add inbox preview text (preheader).' },
    { label: 'Hero image', ok: hasHero, hint: 'Add a hero image block with an image selected.' },
    { label: 'Primary call to action', ok: hasCTA, hint: 'Add a button or offer box with a link.' },
    { label: 'Footer contact info', ok: hasFooterContact, hint: 'Add a footer text block with a phone number, or a branded footer block.' },
    { label: 'Mobile preview', ok: true, hint: 'Use the Mobile toggle above to check the layout.' },
  ]
}

const ORIGIN = 'https://fpr-nyc-production.up.railway.app'

function starterBlocks(): Block[] {
  return [
    { id: uid(), type: 'heading', text: 'Your Best Event Starts Here', align: 'center' },
    { id: uid(), type: 'text', text: 'Tents, tables, bounce houses & more — delivered, set up, and picked up for you.', align: 'center' },
    { id: uid(), type: 'hero', image: ORIGIN + '/images/wedding-backyard-elopement.jpg', url: ORIGIN + '/rentals' },
    { id: uid(), type: 'offer', eyebrow: 'Limited-Time Offer', title: 'Save 15% on your next order', subtitle: 'Book by June 30th — mention code SUMMER15 on your quote.', code: 'SUMMER15', buttonText: 'Browse Rentals', url: ORIGIN + '/rentals' },
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
      id: uid(), type: 'badges', title: 'Why Friendly Party Rental NYC?',
      cards: [
        { image: ORIGIN + '/images/badge-all-day-8-hour-rental.png', caption: '', url: '' },
        { image: ORIGIN + '/images/badge-all-day-best-price-guarantee.png', caption: '', url: '' },
      ],
    },
    { id: uid(), type: 'text', text: "Questions? Call 315-884-1498 — we're happy to help you plan the perfect event.", align: 'center' },
  ]
}
function MarketingHubPage() {
  const [blocks, setBlocks] = useState<Block[]>(starterBlocks())
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('Your Best Event Starts Here — Save 15% on Party Rentals')
  const [preheader, setPreheader] = useState('')
  const [visualStyle, setVisualStyle] = useState<VisualStyle>(DEFAULT_THEME)
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
  const [showLayoutPicker, setShowLayoutPicker] = useState(false)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [showFullPreview, setShowFullPreview] = useState(false)
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

  const searchParams = useSearchParams()
  useEffect(() => {
    const slug = searchParams.get('slug')
    if (!slug) return
    const campaign = getCampaignBySlug(slug)
    if (!campaign) return
    setBlocks(campaignToBlocks(campaign) as unknown as Block[])
    setName(campaign.name)
    setSubject(campaign.subject)
    setPreheader(campaign.preheader || '')
    setVisualStyle(campaign.visualStyle)
    setStatus('Loaded "' + campaign.name + '" from the Campaign Library.')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function addBlock(type: BlockType) {
    const nb = newBlock(type)
    setBlocks((b) => [...b, nb])
    setSelectedBlockId(nb.id)
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

  function parseContent(raw: string): { blocks: Block[]; preheader: string; visualStyle: VisualStyle } {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return { blocks: parsed, preheader: '', visualStyle: DEFAULT_THEME }
      if (parsed && Array.isArray(parsed.blocks)) return { blocks: parsed.blocks, preheader: parsed.preheader || '', visualStyle: parsed.visualStyle || DEFAULT_THEME }
    } catch { /* ignore */ }
    return { blocks: [], preheader: '', visualStyle: DEFAULT_THEME }
  }

  function loadTemplate(t: Template) {
    const { blocks: loadedBlocks, preheader: loadedPreheader, visualStyle: loadedStyle } = parseContent(t.content)
    if (loadedBlocks.length) setBlocks(loadedBlocks)
    setPreheader(loadedPreheader)
    setVisualStyle(loadedStyle)
    setName(t.name); setSubject(t.subject); setEditingId(t.id)
    setStatus('Loaded "' + t.name + '"')
  }
  function newCampaign() {
    setBlocks(starterBlocks()); setName(''); setEditingId(null); setStatus('')
    setSubject('Your Best Event Starts Here — Save 15% on Party Rentals')
    setPreheader('')
    setVisualStyle(DEFAULT_THEME)
  }

  function newCampaignFromLayout(layoutKey: string) {
    const starter = LAYOUT_STARTERS.find((l) => l.key === layoutKey)
    const campaign = starter ? getCampaignBySlug(starter.slug) : null
    if (!starter || !campaign) { newCampaign(); setShowLayoutPicker(false); return }
    setBlocks(campaignToBlocks(campaign) as unknown as Block[])
    setName('')
    setEditingId(null)
    setSubject(campaign.subject)
    setPreheader(campaign.preheader || '')
    setVisualStyle(campaign.visualStyle)
    setStatus('Started from the "' + starter.label + '" layout. Customize the content, then save as a new campaign.')
    setShowLayoutPicker(false)
  }

  async function saveCampaign() {
    if (!name.trim()) { setStatus('Please enter a campaign name.'); return }
    setSaving(true); setStatus('')
    try {
      const payload = { name: name.trim(), subject, content: JSON.stringify({ blocks, preheader, visualStyle }), isActive: true }
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
      const html = blocksToHtml(blocks, VISUAL_THEMES[visualStyle])
      const payload = {
        name: name.trim(),
        subject,
        content: JSON.stringify({ blocks, preheader, visualStyle }),
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
      const html = blocksToHtml(blocks, VISUAL_THEMES[visualStyle])
      const payload: Record<string, unknown> = { mode, subject, html, preheaderText: preheader }
      if (mode === 'test') payload.testEmail = testEmail
      else payload.segment = segment
      const res = await fetch('/api/admin/marketing-send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const d = await res.json().catch(() => ({}))
      if (res.ok) {
        const sim = d.result && d.result.simulated ? ' (simulated — SMTP not configured)' : ''
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
      case 'masthead':
        return (
          <div className="space-y-2">
            <label className={labelCls}>Header style</label>
            <select className={inputCls} value={b.variant || 'standard'} onChange={(e) => updateBlock(b.id, { variant: e.target.value })}>
              <option value="standard">Standard</option>
              <option value="minimal">Minimal</option>
              <option value="editorial">Editorial</option>
            </select>
          </div>
        )
      case 'eyebrow':
        return (
          <div><label className={labelCls}>Label text</label><input className={inputCls} value={b.text || ''} onChange={(e) => updateBlock(b.id, { text: e.target.value })} /></div>
        )
      case 'splitrow':
        return (
          <div className="space-y-2">
            <div><label className={labelCls}>Image</label><ImageField value={b.image} onPick={() => setPicker({ blockId: b.id, cardIndex: null })} /></div>
            <div><label className={labelCls}>Heading</label><input className={inputCls} value={b.title || ''} onChange={(e) => updateBlock(b.id, { title: e.target.value })} /></div>
            <div><label className={labelCls}>Text</label><textarea className={inputCls} rows={3} value={b.text || ''} onChange={(e) => updateBlock(b.id, { text: e.target.value })} /></div>
            <div><label className={labelCls}>Link URL</label><input className={inputCls} value={b.url || ''} onChange={(e) => updateBlock(b.id, { url: e.target.value })} /></div>
            <div><label className={labelCls}>Image side</label>
              <div className="flex gap-1">
                {(['left', 'right'] as const).map((a) => (
                  <button key={a} type="button" onClick={() => updateBlock(b.id, { align: a })} className={'px-2 py-1 text-xs rounded border ' + ((b.align || 'left') === a ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600')}>{a}</button>
                ))}
              </div>
            </div>
          </div>
        )
      case 'featureRow':
      case 'trust':
        return (
          <div className="space-y-2">
            <div><label className={labelCls}>Section title</label><input className={inputCls} value={b.title || ''} onChange={(e) => updateBlock(b.id, { title: e.target.value })} /></div>
            <div className="space-y-2">
              {(b.items || []).map((it, i) => (
                <div key={i} className="border border-gray-200 rounded p-2 space-y-1 bg-gray-50">
                  <input className={inputCls} placeholder="Title" value={it.title} onChange={(e) => { const items = [...(b.items || [])]; items[i] = { ...items[i], title: e.target.value }; updateBlock(b.id, { items }) }} />
                  {b.type === 'featureRow' && <input className={inputCls} placeholder="Description (optional)" value={it.text} onChange={(e) => { const items = [...(b.items || [])]; items[i] = { ...items[i], text: e.target.value }; updateBlock(b.id, { items }) }} />}
                  <button type="button" onClick={() => { const items = (b.items || []).filter((_, idx) => idx !== i); updateBlock(b.id, { items }) }} className="text-xs text-red-600 hover:underline">Remove</button>
                </div>
              ))}
              <button type="button" onClick={() => updateBlock(b.id, { items: [...(b.items || []), { title: 'New item', text: '' }] })} className="text-sm text-blue-700 font-medium hover:underline">+ Add item</button>
            </div>
          </div>
        )
      case 'dateBanner':
        return (
          <div className="space-y-2">
            <div><label className={labelCls}>Eyebrow</label><input className={inputCls} value={b.eyebrow || ''} onChange={(e) => updateBlock(b.id, { eyebrow: e.target.value })} /></div>
            <div><label className={labelCls}>Main text</label><input className={inputCls} value={b.text || ''} onChange={(e) => updateBlock(b.id, { text: e.target.value })} /></div>
            <div><label className={labelCls}>Subtitle</label><input className={inputCls} value={b.subtitle || ''} onChange={(e) => updateBlock(b.id, { subtitle: e.target.value })} /></div>
          </div>
        )
      case 'signature':
        return (<div><label className={labelCls}>Signature text</label><input className={inputCls} value={b.text || ''} onChange={(e) => updateBlock(b.id, { text: e.target.value })} /></div>)
      case 'footerBrand':
        return (
          <div><label className={labelCls}>Footer style</label>
            <select className={inputCls} value={b.variant || 'standard'} onChange={(e) => updateBlock(b.id, { variant: e.target.value })}>
              <option value="standard">Standard</option>
              <option value="minimal">Minimal</option>
              <option value="corporate">Corporate</option>
            </select>
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
                <p className="text-xs text-gray-500">Paste a link to any image on the web. Tip: right-click an image online and copy its address. (Direct file uploads need an image host — not set up yet.)</p>
                <input className={inputCls} value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder="https://…/photo.jpg" />
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
    { type: 'masthead', label: '+ Masthead' },
    { type: 'eyebrow', label: '+ Eyebrow label' },
    { type: 'splitrow', label: '+ Image + text row' },
    { type: 'featureRow', label: '+ Feature row' },
    { type: 'trust', label: '+ Trust strip' },
    { type: 'dateBanner', label: '+ Date/availability banner' },
    { type: 'signature', label: '+ Signature' },
    { type: 'footerBrand', label: '+ Branded footer' },
  ]

  const theme = VISUAL_THEMES[visualStyle]
  const previewHtml = blocksToHtml(blocks, theme)
  const frame = '<div style="max-width:600px;margin:0 auto;background:' + theme.cardBg + ';padding:32px 30px;font-family:' + theme.bodyFont + ';color:' + theme.textColor + ';">' + previewHtml + '</div>'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaign Content Builder</h1>
          <p className="text-sm text-gray-500 mt-0.5">Edit the content for one campaign. Use the Campaigns tab to browse the full library.</p>
        </div>
        <button type="button" onClick={() => setShowLayoutPicker(true)} className="px-4 py-2 text-sm font-medium border border-gray-300 rounded hover:bg-gray-50">+ New campaign</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-4">
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
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">Build Email</h2>
            <div><label className={labelCls}>Campaign name</label><input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer 2026 Promo" /></div>
            <div><label className={labelCls}>Email subject line</label><input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div>
              <label className={labelCls}>Preview text (preheader)</label>
              <input className={inputCls} value={preheader} onChange={(e) => setPreheader(e.target.value)} placeholder="Shown next to the subject line in most inboxes" />
              <p className="text-[11px] text-gray-400 mt-1">Hidden in the email body itself — only shown as inbox preview text.</p>
            </div>
            <div>
              <label className={labelCls}>Visual style</label>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(VISUAL_THEMES) as VisualStyle[]).map((key) => {
                  const t = VISUAL_THEMES[key]
                  const active = visualStyle === key
                  return (
                    <button key={key} type="button" onClick={() => setVisualStyle(key)} className={'flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded border ' + (active ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50')}>
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: t.accent }} />
                      {t.label}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Loading a campaign from the library sets this automatically.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map((bt) => (
              <button key={bt.type} type="button" onClick={() => addBlock(bt.type)} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50 text-gray-700">{bt.label}</button>
            ))}
          </div>

          <div className="space-y-3">
            {blocks.map((b, i) => {
              const isActive = (selectedBlockId && blocks.some((x) => x.id === selectedBlockId) ? selectedBlockId : blocks[0]?.id) === b.id
              return (
                <div key={b.id} onClick={() => setSelectedBlockId(b.id)} className={'flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer ' + (isActive ? 'border-green-600 bg-green-50' : 'border-gray-200 hover:bg-gray-50')}>
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">{blockTypeLabel(b.type)}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={(e) => { e.stopPropagation(); moveBlock(b.id, -1) }} disabled={i === 0} className="px-2 py-0.5 text-xs border border-gray-300 rounded disabled:opacity-30">&uarr;</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); moveBlock(b.id, 1) }} disabled={i === blocks.length - 1} className="px-2 py-0.5 text-xs border border-gray-300 rounded disabled:opacity-30">&darr;</button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); removeBlock(b.id); if (selectedBlockId === b.id) setSelectedBlockId(null) }} className="px-2 py-0.5 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50">&times;</button>
                  </div>
                </div>
              )
            })}
          </div>

          </div>

        <div className="lg:col-span-6 space-y-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">Preview</span>
              <div className="flex gap-1">
                <button type="button" onClick={() => setPreview('desktop')} className={'px-2 py-1 text-xs rounded ' + (preview === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-600')}>Desktop</button>
                <button type="button" onClick={() => setPreview('mobile')} className={'px-2 py-1 text-xs rounded ' + (preview === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-600')}>Mobile</button>
                <button type="button" onClick={() => setShowFullPreview(true)} className="px-2 py-1 text-xs rounded text-gray-600">Fullscreen</button>
              </div>
            </div>
            {preheader && (
              <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                <div className="text-[11px] font-semibold text-gray-500">Inbox preview</div>
                <div className="text-xs text-gray-700 truncate"><span className="font-medium">{subject}</span> — <span className="text-gray-500">{preheader}</span></div>
              </div>
            )}
            <div className="p-3 max-h-[720px] overflow-auto" style={{ background: theme.pageBg }}>
              <div style={{ width: preview === 'mobile' ? 360 : '100%', margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: frame }} />
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Readiness</h2>
            <ul className="space-y-1.5">
              {campaignReadiness(blocks, subject, preheader).map((item) => (
                <li key={item.label} className="flex items-start gap-2 text-sm">
                  <span className={'mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ' + (item.ok ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400')}>{item.ok ? '✓' : '·'}</span>
                  <span className={item.ok ? 'text-gray-700' : 'text-gray-400'}>
                    {item.label}
                    {!item.ok && <span className="block text-[11px] text-gray-400">{item.hint}</span>}
                  </span>
                </li>
              ))}
            </ul>
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
                <button type="button" onClick={scheduleCampaign} disabled={scheduling} className="px-3 py-2 text-sm bg-amber-600 text-white rounded whitespace-nowrap disabled:opacity-50">{scheduling ? 'Scheduling…' : 'Schedule send'}</button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Schedules this exact campaign (current builder content + selected audience) to send automatically at the chosen date and time.</p>
            </div>
            <button type="button" onClick={() => send('campaign')} disabled={sending} className="w-full py-2.5 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:opacity-50">{sending ? 'Sending…' : 'Send campaign'}</button>
            {status && <p className="text-sm text-gray-700 pt-1">{status}</p>}
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="border border-gray-200 rounded-lg p-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Properties</h3>
            {(() => {
              const activeId = selectedBlockId && blocks.some((x) => x.id === selectedBlockId) ? selectedBlockId : blocks[0]?.id
              const active = blocks.find((x) => x.id === activeId)
              if (!active) return <p className="text-sm text-gray-400">Add a section above to start editing.</p>
              return renderEditor(active)
            })()}
          </div>

          <button type="button" onClick={saveCampaign} disabled={saving} className="w-full py-2.5 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : (editingId ? 'Update campaign' : 'Save campaign')}</button>
        </div>

              </div>

      {showLayoutPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLayoutPicker(false)}>
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[85vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Start From a Layout</h3>
            <p className="text-sm text-gray-500 mb-4">Pick the composition that fits this campaign. You can fully edit the content afterward.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LAYOUT_STARTERS.map((info) => (
                <button key={info.key} type="button" onClick={() => newCampaignFromLayout(info.key)} className="text-left border border-gray-200 rounded-lg p-3 hover:border-green-600 hover:bg-green-50">
                  <div className="text-sm font-semibold text-gray-800">{info.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{info.desc}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-between items-center">
              <button type="button" onClick={() => { newCampaign(); setShowLayoutPicker(false) }} className="text-xs text-gray-500 underline">Start blank instead</button>
              <button type="button" onClick={() => setShowLayoutPicker(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showFullPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowFullPreview(false)}>
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">Full Preview</span>
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <button type="button" onClick={() => setPreview('desktop')} className={'px-2 py-1 text-xs rounded ' + (preview === 'desktop' ? 'bg-blue-600 text-white' : 'text-gray-600')}>Desktop</button>
                  <button type="button" onClick={() => setPreview('mobile')} className={'px-2 py-1 text-xs rounded ' + (preview === 'mobile' ? 'bg-blue-600 text-white' : 'text-gray-600')}>Mobile</button>
                </div>
                <button type="button" onClick={() => setShowFullPreview(false)} className="text-gray-500 hover:text-gray-800 text-lg leading-none px-2">close</button>
              </div>
            </div>
            <div className="p-6 overflow-auto flex-1" style={{ background: theme.pageBg }}>
              <div style={{ width: preview === 'mobile' ? 375 : 600, margin: '0 auto' }} dangerouslySetInnerHTML={{ __html: frame }} />
            </div>
          </div>
        </div>
      )}

      {picker && <ImagePicker />}
    </div>
  )
}

export default function MarketingHubPageWrapper() {
  return createElement(
    Suspense,
    { fallback: createElement('div', { className: 'p-6 text-sm text-gray-400' }, 'Loading') },
    createElement(MarketingHubPage)
  )
}
