export const ROUTE_OVERRIDE_PREFIX = '__route__'

export const WEBSITE_EDITOR_MAIN_PAGES = [
  { path: '/', title: 'Home' },
  { path: '/weddings', title: 'Weddings' },
  { path: '/category', title: 'Rentals' },
  { path: '/event-planning', title: 'Event Planning' },
  { path: '/design-your-event', title: 'Design Your Event' },
  { path: '/frequently_asked_questions', title: 'FAQs' },
  { path: '/about_us', title: 'About Us' },
  { path: '/contact_us', title: 'Contact Us' },
  { path: '/gallery', title: 'Gallery' },
  { path: '/employment', title: 'Employment' },
  { path: '/service-area', title: 'Service Area' },
] as const

const WEBSITE_EDITOR_MAIN_PATH_SET = new Set<string>(WEBSITE_EDITOR_MAIN_PAGES.map(page => page.path))

export const WEBSITE_EDITOR_RESERVED_CUSTOM_PATHS = [
  '/order-by-date',
  '/items',
  '/wedding-packages',
  '/wedding-vendors',
  '/popular-rentals',
  '/chiavari-chair-rentals',
  '/graduation-rentals',
  '/robots.txt',
  '/sitemap.xml',
  '/unsubscribe',
  '/schedule',
  '/index.html',
  '/home',
  '/hub',
  '/hub.html',
  '/view_gallery',
  '/sitemap_index.xml',
  '/sitemap-index.xml',
] as const

const WEBSITE_EDITOR_RESERVED_CUSTOM_PATH_SET = new Set<string>(WEBSITE_EDITOR_RESERVED_CUSTOM_PATHS)

export function isWebsiteEditorMainPath(rawPath: string) {
  return WEBSITE_EDITOR_MAIN_PATH_SET.has(normalizeBuilderPath(rawPath))
}

export function isWebsiteEditorCustomPagePathAllowed(rawPath: string) {
  const path = normalizeBuilderPath(rawPath)
  const parts = path.split('/').filter(Boolean)
  if (path === '/' || parts.length !== 1) return false
  if (!isBuilderOverrideAllowed(path)) return false
  if (WEBSITE_EDITOR_MAIN_PATH_SET.has(path)) return false
  if (WEBSITE_EDITOR_RESERVED_CUSTOM_PATH_SET.has(path)) return false
  if (path.startsWith('/party-rentals-')) return false
  return true
}

export const PAGE_BUILDER_BLOCK_TYPES = [
  'hero',
  'heading',
  'text',
  'image',
  'textImage',
  'cta',
  'imageGrid',
  'testimonial',
  'faq',
  'videoFeature',
  'button',
  'spacer',
  'separator',
  'threeCol',
  'html',
  'originalContent',
  'table',
  'carousel',
  'linkList',
  'iconGrid',
  'featureSection',
  'productFeature',
  'doubleImageBanner',
  'flipCards',
  'searchBar',
  'contactForm',
  'map',
  'articleFloat',
  'store',
  'fourCol',
  'columnLinks',
  'headerButton',
] as const

export type PageBuilderBlockType = typeof PAGE_BUILDER_BLOCK_TYPES[number]

export interface PageBuilderBlock {
  id: string
  type: PageBuilderBlockType
  hidden?: boolean
  headingText?: string
  headingSize?: 'h1' | 'h2' | 'h3'
  text?: string
  imageUrl?: string
  imageAlt?: string
  buttonLabel?: string
  buttonUrl?: string
  html?: string
  heroTitle?: string
  heroSubtitle?: string
  heroImageUrl?: string
  heroButtonLabel?: string
  heroButtonUrl?: string
  heroStyle?: 'overlay' | 'left-align' | 'solid-blue' | 'solid-red' | 'two-button'
  tiHeading?: string
  tiText?: string
  tiImageUrl?: string
  tiImageSide?: 'left' | 'right'
  quote?: string
  author?: string
  testimonialStyle?: 'quote' | 'card'
  col1Title?: string
  col1Text?: string
  col2Title?: string
  col2Text?: string
  col3Title?: string
  col3Text?: string
  ctaText?: string
  ctaButtonLabel?: string
  ctaButtonUrl?: string
  videoUrl?: string
  videoCaption?: string
  videoSide?: 'left' | 'right'
  videoSize?: 'normal' | 'large'
  videoButtonLabel?: string
  videoButtonUrl?: string
  gridImage1?: string
  gridImage2?: string
  gridImage3?: string
  gridImage4?: string
  gridLayout?: '3' | '4' | '6'
  gridLinkUrl?: string
  faqQ1?: string
  faqA1?: string
  faqQ2?: string
  faqA2?: string
  faqQ3?: string
  faqA3?: string
  spacerHeight?: string
  tableData?: string
  tableStyle?: 'basic' | 'striped' | 'bordered' | 'borderedStriped'
  data?: string
}

export interface PageBuilderSettings {
  showPageTitle: boolean
  maxWidth: 'xl' | '2xl' | '4xl' | '6xl' | 'full'
  backgroundColor: string
  topPadding: number
  bottomPadding: number
}

export interface PageBuilderRevision {
  id: string
  createdAt: string
  title: string
  blocks: PageBuilderBlock[]
  settings: PageBuilderSettings
}

export interface PageBuilderDocument {
  version: 1
  path: string
  draftTitle: string
  publishedTitle: string
  draftBlocks: PageBuilderBlock[]
  publishedBlocks: PageBuilderBlock[]
  draftSettings: PageBuilderSettings
  publishedSettings: PageBuilderSettings
  revisions: PageBuilderRevision[]
}

export const DEFAULT_PAGE_BUILDER_SETTINGS: PageBuilderSettings = {
  showPageTitle: true,
  maxWidth: '6xl',
  backgroundColor: '#ffffff',
  topPadding: 48,
  bottomPadding: 64,
}

export function normalizeBuilderPath(raw: string) {
  let value = String(raw || '').trim()
  if (!value) return '/'
  if (/^https?:\/\//i.test(value)) {
    try {
      value = new URL(value).pathname
    } catch {
      return '/'
    }
  }
  value = value.split('?')[0].split('#')[0]
  if (!value.startsWith('/')) value = '/' + value
  value = value.replace(/\/{2,}/g, '/')
  if (value.length > 1) value = value.replace(/\/+$/, '')
  return value || '/'
}

export function routeOverrideSlug(rawPath: string) {
  const path = normalizeBuilderPath(rawPath)
  const body = path === '/' ? 'home' : path.slice(1).replace(/~/g, '~~').replace(/\//g, '~')
  return ROUTE_OVERRIDE_PREFIX + body
}

export function isRouteOverrideSlug(slug: string) {
  return slug.startsWith(ROUTE_OVERRIDE_PREFIX)
}

export function routeOverridePath(slug: string) {
  if (!isRouteOverrideSlug(slug)) return null
  const body = slug.slice(ROUTE_OVERRIDE_PREFIX.length)
  if (body === 'home') return '/'
  let decoded = ''
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index]
    if (char !== '~') {
      decoded += char
      continue
    }
    if (body[index + 1] === '~') {
      decoded += '~'
      index += 1
    } else {
      decoded += '/'
    }
  }
  return normalizeBuilderPath('/' + decoded)
}

export function isBuilderOverrideAllowed(rawPath: string) {
  const path = normalizeBuilderPath(rawPath)
  if (path === '/') return false
  const blocked = [
    '/admin',
    '/api',
    '/driver',
    '/employee',
    '/contract',
    '/checkout',
    '/receipt',
    '/quote',
    '/payment',
    '/pay',
    '/pay-now',
    '/save-card',
  ]
  return !blocked.some(prefix => path === prefix || path.startsWith(prefix + '/'))
}

function cloneSettings(value: Partial<PageBuilderSettings> | null | undefined): PageBuilderSettings {
  const maxWidth = ['xl', '2xl', '4xl', '6xl', 'full'].includes(String(value?.maxWidth))
    ? value?.maxWidth as PageBuilderSettings['maxWidth']
    : DEFAULT_PAGE_BUILDER_SETTINGS.maxWidth
  const color = /^#[0-9a-f]{6}$/i.test(String(value?.backgroundColor || ''))
    ? String(value?.backgroundColor)
    : DEFAULT_PAGE_BUILDER_SETTINGS.backgroundColor
  const clamp = (n: unknown, fallback: number) => {
    const parsed = Number(n)
    return Number.isFinite(parsed) ? Math.max(0, Math.min(240, Math.round(parsed))) : fallback
  }
  return {
    showPageTitle: value?.showPageTitle !== false,
    maxWidth,
    backgroundColor: color,
    topPadding: clamp(value?.topPadding, DEFAULT_PAGE_BUILDER_SETTINGS.topPadding),
    bottomPadding: clamp(value?.bottomPadding, DEFAULT_PAGE_BUILDER_SETTINGS.bottomPadding),
  }
}

function validBlocks(value: unknown): PageBuilderBlock[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((block): block is PageBuilderBlock => Boolean(
      block &&
      typeof block === 'object' &&
      typeof (block as PageBuilderBlock).id === 'string' &&
      PAGE_BUILDER_BLOCK_TYPES.includes((block as PageBuilderBlock).type),
    ))
    .map(block => ({ ...block, hidden: block.hidden === true }))
}

function validRevisions(value: unknown): PageBuilderRevision[] {
  if (!Array.isArray(value)) return []
  return value
    .filter(item => Boolean(
      item &&
      typeof item === 'object' &&
      typeof (item as PageBuilderRevision).id === 'string' &&
      typeof (item as PageBuilderRevision).createdAt === 'string',
    ))
    .slice(0, 20)
    .map(item => {
      const revision = item as Partial<PageBuilderRevision>
      return {
        id: String(revision.id || ''),
        createdAt: String(revision.createdAt || ''),
        title: typeof revision.title === 'string' ? revision.title : 'Saved version',
        blocks: validBlocks(revision.blocks),
        settings: cloneSettings(revision.settings),
      }
    })
}

export function createPageBuilderDocument(path: string, title = 'New Page'): PageBuilderDocument {
  return {
    version: 1,
    path: normalizeBuilderPath(path),
    draftTitle: title,
    publishedTitle: title,
    draftBlocks: [],
    publishedBlocks: [],
    draftSettings: { ...DEFAULT_PAGE_BUILDER_SETTINGS },
    publishedSettings: { ...DEFAULT_PAGE_BUILDER_SETTINGS },
    revisions: [],
  }
}

export function parsePageBuilderDocument(content: string | null | undefined, title: string, path: string): PageBuilderDocument {
  const fallback = createPageBuilderDocument(path, title)
  if (!content) return fallback
  try {
    const parsed = JSON.parse(content)
    if (Array.isArray(parsed)) {
      const blocks = validBlocks(parsed)
      return { ...fallback, draftBlocks: blocks, publishedBlocks: blocks }
    }
    if (!parsed || typeof parsed !== 'object') return fallback
    return {
      version: 1,
      path: normalizeBuilderPath(typeof parsed.path === 'string' ? parsed.path : path),
      draftTitle: typeof parsed.draftTitle === 'string' ? parsed.draftTitle : title,
      publishedTitle: typeof parsed.publishedTitle === 'string' ? parsed.publishedTitle : title,
      draftBlocks: validBlocks(parsed.draftBlocks),
      publishedBlocks: validBlocks(parsed.publishedBlocks),
      draftSettings: cloneSettings(parsed.draftSettings),
      publishedSettings: cloneSettings(parsed.publishedSettings),
      revisions: validRevisions(parsed.revisions),
    }
  } catch {
    return fallback
  }
}

function blockId(type: PageBuilderBlockType) {
  const token = globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return `page-${type}-${token.toLowerCase()}`
}

export function newPageBuilderBlock(type: PageBuilderBlockType): PageBuilderBlock {
  const id = blockId(type)
  switch (type) {
    case 'hero': return { id, type, heroTitle: 'Your headline', heroSubtitle: 'Add a clear message for this page.', heroImageUrl: '', heroButtonLabel: 'Book Now', heroButtonUrl: '/order-by-date', heroStyle: 'overlay' }
    case 'heading': return { id, type, headingText: 'New section', headingSize: 'h2' }
    case 'text': return { id, type, text: 'Add your page text here.' }
    case 'image': return { id, type, imageUrl: '', imageAlt: '' }
    case 'textImage': return { id, type, tiHeading: 'Section heading', tiText: 'Add supporting details here.', tiImageUrl: '', tiImageSide: 'left' }
    case 'cta': return { id, type, ctaText: 'Ready to plan your event?', ctaButtonLabel: 'Get Started', ctaButtonUrl: '/order-by-date' }
    case 'imageGrid': return { id, type, gridImage1: '', gridImage2: '', gridImage3: '', gridImage4: '', gridLayout: '4', gridLinkUrl: '' }
    case 'testimonial': return { id, type, quote: 'Great service!', author: 'Happy Customer', testimonialStyle: 'card' }
    case 'faq': return { id, type, faqQ1: 'Question one?', faqA1: 'Answer one.', faqQ2: 'Question two?', faqA2: 'Answer two.', faqQ3: 'Question three?', faqA3: 'Answer three.' }
    case 'videoFeature': return { id, type, videoUrl: '', videoCaption: '', videoSide: 'left', videoSize: 'normal', videoButtonLabel: '', videoButtonUrl: '' }
    case 'button': return { id, type, buttonLabel: 'Learn More', buttonUrl: '/order-by-date' }
    case 'spacer': return { id, type, spacerHeight: '48' }
    case 'separator': return { id, type }
    case 'threeCol': return { id, type, col1Title: 'Feature 1', col1Text: 'Description', col2Title: 'Feature 2', col2Text: 'Description', col3Title: 'Feature 3', col3Text: 'Description' }
    case 'html': return { id, type, html: '<div>Custom HTML</div>' }
    case 'originalContent': return { id, type }
    case 'table': return { id, type, tableData: 'Column 1|Column 2\nValue 1|Value 2', tableStyle: 'borderedStriped' }
    case 'carousel': return { id, type, data: JSON.stringify({ mode: 'images', item1Img: '', item1Cap: 'Slide 1', item2Img: '', item2Cap: 'Slide 2', item3Img: '', item3Cap: 'Slide 3' }) }
    case 'linkList': return { id, type, data: JSON.stringify({ heading: 'Quick Links', link1Label: 'Link 1', link1Url: '#', link2Label: 'Link 2', link2Url: '#', link3Label: 'Link 3', link3Url: '#', link4Label: 'Link 4', link4Url: '#' }) }
    case 'iconGrid': return { id, type, data: JSON.stringify({ item1Icon: '⭐', item1Title: 'Feature 1', item1Text: 'Description', item2Icon: '⭐', item2Title: 'Feature 2', item2Text: 'Description', item3Icon: '⭐', item3Title: 'Feature 3', item3Text: 'Description', item4Icon: '⭐', item4Title: 'Feature 4', item4Text: 'Description' }) }
    case 'featureSection': return { id, type, data: JSON.stringify({ style: 'main', heading: 'Why Choose Us', subtext: '', col1Title: 'Reason 1', col1Text: 'Description', col2Title: 'Reason 2', col2Text: 'Description', col3Title: 'Reason 3', col3Text: 'Description' }) }
    case 'productFeature': return { id, type, data: JSON.stringify({ image: '', title: 'Product Name', description: 'Product description...', price: '$0', buttonLabel: 'View Details', buttonUrl: '#' }) }
    case 'doubleImageBanner': return { id, type, data: JSON.stringify({ image1: '', caption1: '', image2: '', caption2: '' }) }
    case 'flipCards': return { id, type, data: JSON.stringify({ card1Front: 'Card 1', card1Back: 'Details...', card2Front: 'Card 2', card2Back: 'Details...', card3Front: 'Card 3', card3Back: 'Details...' }) }
    case 'searchBar': return { id, type, data: JSON.stringify({ placeholder: 'Search rentals...' }) }
    case 'contactForm': return { id, type, data: JSON.stringify({ heading: 'Contact Us', buttonLabel: 'Send Message' }) }
    case 'map': return { id, type, data: JSON.stringify({ address: 'Riverdale, Bronx, NY', embedUrl: '' }) }
    case 'articleFloat': return { id, type, data: JSON.stringify({ imageUrl: '', imageSide: 'left', text: 'Article text wraps around the image...' }) }
    case 'store': return { id, type, data: JSON.stringify({ heading: 'Browse Our Rentals', buttonLabel: 'View All Rentals', buttonUrl: '/order-by-date' }) }
    case 'fourCol': return { id, type, data: JSON.stringify({ col1Title: 'Feature 1', col1Text: 'Description', col2Title: 'Feature 2', col2Text: 'Description', col3Title: 'Feature 3', col3Text: 'Description', col4Title: 'Feature 4', col4Text: 'Description' }) }
    case 'columnLinks': return { id, type, data: JSON.stringify({ col1Heading: 'Quick Links', col1Links: 'Home|/\nAbout|/about_us', col2Heading: 'Resources', col2Links: 'FAQ|/frequently_asked_questions', col3Heading: '', col3Links: '' }) }
    case 'headerButton': return { id, type, data: JSON.stringify({ heading: 'Ready to Book?', subtext: '', buttonLabel: 'Get a Quote', buttonUrl: '/contact_us', align: 'center' }) }
  }
}
