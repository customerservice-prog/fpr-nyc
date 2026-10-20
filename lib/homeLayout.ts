import { DEFAULT_HOME_CONTENT } from '@/lib/homeContent'
import { DESKTOP_HOME_DEFAULTS } from '@/lib/desktopHomeContent'

export const HOME_SECTIONS = [
  { id: 'hero', label: 'Hero', fields: ['heroEyebrow', 'heroHeading', 'heroBody', 'heroPrimaryLabel', 'heroSecondaryLabel', 'heroTagline'] },
  { id: 'trust', label: 'Trust bar', fields: ['trust1Label', 'trust2Label', 'trust3Label'] },
  { id: 'planning', label: 'Date availability', fields: ['planningEventHeading', 'planningEventBody', 'planningEventButton', 'planningEventUrl'] },
  { id: 'youtube', label: 'YouTube showcase', fields: ['youtubeEyebrow', 'youtubeHeading', 'youtubeVideoId'] },
  { id: 'categories', label: 'Rental categories', fields: ['categoriesEyebrow', 'shopCategoryHeading', 'categoriesBody', 'viewAllRentalsButton', 'categoriesUrl'] },
  { id: 'popular', label: 'Popular rentals', fields: ['popularHeading', 'popularBody', 'popularButton', 'popularUrl'] },
  { id: 'bounce', label: 'Bounce houses', fields: ['bounceEyebrow', 'bounceHeading', 'bounceBody', 'bounceButton', 'bounceUrl'] },
  { id: 'designer', label: 'Event designer', fields: ['designerHeading', 'designerBody', 'designerButton', 'designerFeature1Heading', 'designerFeature1Body', 'designerFeature2Heading', 'designerFeature2Body', 'designerFeature3Heading', 'designerFeature3Body'] },
  { id: 'steps', label: 'How it works', fields: ['rentingEasyEyebrow', 'rentingEasyHeading', 'rentingEasyBody', 'step1Label', 'step1Body', 'step2Label', 'step2Body', 'step3Label', 'step3Body', 'stepsButton', 'stepsUrl'] },
  { id: 'reviews', label: 'Customer reviews', fields: ['reviewsHeading'] },
  { id: 'packages', label: 'Wedding packages', fields: ['packagesHeading', 'packagesBody', 'packagesButton', 'packagesUrl'] },
  { id: 'wedding', label: 'Wedding banner', fields: ['weddingBannerHeading', 'weddingBannerBody', 'weddingBannerButton', 'weddingBannerUrl', 'weddingBannerImage'] },
  { id: 'event', label: 'Event planning', fields: ['eventPlanningEyebrow', 'eventPlanningHeading', 'eventPlanningBody', 'eventPlanningButton', 'eventPlanningUrl'] },
  { id: 'seo', label: 'Service area', fields: ['seoHeading', 'seoBody'] },
] as const
export type HomeSectionId = typeof HOME_SECTIONS[number]['id']
export const DESKTOP_HOME_SECTIONS = [
  { id: 'hero', label: 'Desktop hero', fields: ['heroEyebrow', 'heroHeading', 'heroBody', 'heroPrimaryLabel', 'heroSecondaryLabel', 'heroTagline'] },
  { id: 'planning', label: 'Planning shortcuts', fields: ['desktopPlanningHeading'] },
  { id: 'intro', label: 'Introduction & benefits', fields: ['desktopIntroHeading', 'desktopIntroBody', 'desktopIntroButton', 'desktopBenefit1Heading', 'desktopBenefit1Body', 'desktopBenefit2Heading', 'desktopBenefit2Body', 'desktopBenefit3Heading', 'desktopBenefit3Body'] },
  { id: 'youtube', label: 'YouTube showcase', fields: ['youtubeEyebrow', 'youtubeHeading', 'youtubeVideoId', 'desktopYoutubeTagline', 'desktopYoutubeButton'] },
  { id: 'categories', label: 'Rental categories', fields: ['desktopCategoriesHeading'] },
  { id: 'designer', label: 'Event designer', fields: ['designerHeading', 'designerBody', 'designerButton', 'designerFeature1Heading', 'designerFeature1Body', 'designerFeature2Heading', 'designerFeature2Body', 'designerFeature3Heading', 'designerFeature3Body'] },
  { id: 'steps', label: 'How it works', fields: ['desktopStepsHeading', 'desktopStep1Label', 'desktopStep2Label', 'desktopStep3Label'] },
  { id: 'reviews', label: 'Customer reviews', fields: ['reviewsHeading'] },
  { id: 'seo', label: 'Service area', fields: ['seoHeading', 'seoBody'] },
  { id: 'packages', label: 'Wedding packages', fields: ['desktopPackagesHeading', 'packagesBody', 'packagesButton', 'packagesUrl'] },
  { id: 'why', label: 'Why choose us', fields: ['desktopWhyHeading', 'desktopWhyBody'] },
  { id: 'event', label: 'Event planning', fields: ['eventPlanningEyebrow', 'eventPlanningHeading', 'eventPlanningBody', 'eventPlanningButton', 'eventPlanningUrl'] },
] as const

export const CUSTOM_HOME_SECTION_KINDS = ['text', 'image', 'cta', 'gallery', 'split', 'video', 'spacer'] as const
export type CustomHomeSectionKind = typeof CUSTOM_HOME_SECTION_KINDS[number]
export type CustomHomeSectionLayout = 'mobile' | 'desktop'
export type CustomHomeSection = {
  id: string
  kind: CustomHomeSectionKind
  layout: CustomHomeSectionLayout
  label: string
  eyebrow?: string
  heading?: string
  body?: string
  imageUrl?: string
  imageAlt?: string
  buttonLabel?: string
  buttonUrl?: string
  videoId?: string
  image1Url?: string
  image1Alt?: string
  image2Url?: string
  image2Alt?: string
  image3Url?: string
  image3Alt?: string
  spacerHeight?: string
  backgroundColor?: string
  backgroundImage?: string
  backgroundOverlay?: string
  textColor?: string
  alignment?: 'left' | 'center' | 'right'
  contentWidth?: 'narrow' | 'normal' | 'wide' | 'full'
  paddingY?: string
  marginY?: string
  borderRadius?: string
  minHeight?: string
  galleryColumns?: '1' | '2' | '3'
  splitImagePosition?: 'left' | 'right'
}
export type HomeSectionDefinition = {
  id: string
  label: string
  fields: readonly string[]
  custom?: boolean
  kind?: CustomHomeSectionKind
}

export type BuiltInHomeSectionDesign = {
  layout: CustomHomeSectionLayout
  id: string
  backgroundColor: string
  backgroundImage: string
  backgroundOverlay: string
  textColor: string
  alignment: '' | 'left' | 'center' | 'right'
  contentWidth: '' | 'narrow' | 'normal' | 'wide' | 'full'
  paddingY: string
  marginY: string
  borderRadius: string
  minHeight: string
}

export const BUILTIN_HOME_SECTION_DESIGN_DEFAULTS: Omit<BuiltInHomeSectionDesign, 'layout' | 'id'> = {
  backgroundColor: '',
  backgroundImage: '',
  backgroundOverlay: '',
  textColor: '',
  alignment: '',
  contentWidth: '',
  paddingY: '',
  marginY: '',
  borderRadius: '',
  minHeight: '',
}

const CUSTOM_SECTION_LABELS: Record<CustomHomeSectionKind, string> = {
  text: 'Text section',
  image: 'Image section',
  cta: 'Call to action',
  gallery: 'Image gallery',
  split: 'Image + text',
  video: 'Video section',
  spacer: 'Spacer',
}

export const CUSTOM_SECTION_DESIGN_DEFAULTS: Record<CustomHomeSectionKind, {
  backgroundColor: string
  textColor: string
  alignment: 'left' | 'center' | 'right'
  contentWidth: 'narrow' | 'normal' | 'wide' | 'full'
  paddingY: string
  marginY: string
  borderRadius: string
  minHeight: string
  backgroundOverlay: string
  galleryColumns: '1' | '2' | '3'
  splitImagePosition: 'left' | 'right'
}> = {
  text: { backgroundColor: '#ffffff', textColor: '#0B1F3A', alignment: 'left', contentWidth: 'normal', paddingY: '56', marginY: '0', borderRadius: '0', minHeight: '0', backgroundOverlay: '0', galleryColumns: '3', splitImagePosition: 'left' },
  image: { backgroundColor: '#FAFAF8', textColor: '#0B1F3A', alignment: 'left', contentWidth: 'normal', paddingY: '56', marginY: '0', borderRadius: '0', minHeight: '0', backgroundOverlay: '0', galleryColumns: '3', splitImagePosition: 'left' },
  cta: { backgroundColor: '#0B1F3A', textColor: '#ffffff', alignment: 'center', contentWidth: 'normal', paddingY: '64', marginY: '0', borderRadius: '0', minHeight: '0', backgroundOverlay: '35', galleryColumns: '3', splitImagePosition: 'left' },
  gallery: { backgroundColor: '#ffffff', textColor: '#0B1F3A', alignment: 'center', contentWidth: 'wide', paddingY: '56', marginY: '0', borderRadius: '0', minHeight: '0', backgroundOverlay: '0', galleryColumns: '3', splitImagePosition: 'left' },
  split: { backgroundColor: '#FFF8E8', textColor: '#0B1F3A', alignment: 'left', contentWidth: 'wide', paddingY: '56', marginY: '0', borderRadius: '0', minHeight: '0', backgroundOverlay: '0', galleryColumns: '3', splitImagePosition: 'left' },
  video: { backgroundColor: '#0B1F3A', textColor: '#ffffff', alignment: 'center', contentWidth: 'normal', paddingY: '56', marginY: '0', borderRadius: '0', minHeight: '0', backgroundOverlay: '35', galleryColumns: '3', splitImagePosition: 'left' },
  spacer: { backgroundColor: '#ffffff', textColor: '#0B1F3A', alignment: 'center', contentWidth: 'full', paddingY: '0', marginY: '0', borderRadius: '0', minHeight: '0', backgroundOverlay: '0', galleryColumns: '3', splitImagePosition: 'left' },
}

export function customSectionDesign(section: CustomHomeSection) {
  const defaults = CUSTOM_SECTION_DESIGN_DEFAULTS[section.kind]
  return {
    backgroundColor: section.backgroundColor || defaults.backgroundColor,
    backgroundImage: section.backgroundImage || '',
    backgroundOverlay: section.backgroundOverlay || defaults.backgroundOverlay,
    textColor: section.textColor || defaults.textColor,
    alignment: section.alignment || defaults.alignment,
    contentWidth: section.contentWidth || defaults.contentWidth,
    paddingY: section.paddingY || defaults.paddingY,
    marginY: section.marginY || defaults.marginY,
    borderRadius: section.borderRadius || defaults.borderRadius,
    minHeight: section.minHeight || defaults.minHeight,
    galleryColumns: section.galleryColumns || defaults.galleryColumns,
    splitImagePosition: section.splitImagePosition || defaults.splitImagePosition,
  }
}

export function createCustomHomeSection(kind: CustomHomeSectionKind, id: string, layout: CustomHomeSectionLayout): CustomHomeSection {
  const defaults = CUSTOM_SECTION_DESIGN_DEFAULTS[kind]
  const base = { id, kind, layout, label: CUSTOM_SECTION_LABELS[kind], ...defaults }
  switch (kind) {
    case 'text': return { ...base, heading: 'Add a heading', body: 'Add your text here. Click this section to customize the content.' }
    case 'image': return { ...base, heading: 'Featured image', body: 'Add supporting text for this image.', imageUrl: '/images/desktop-hero-tent-reception.jpg', imageAlt: 'Friendly Party Rental event setup' }
    case 'cta': return { ...base, eyebrow: 'Ready to plan?', heading: 'Make Your Event Easy', body: 'Check your date or browse rentals to get started.', buttonLabel: 'CHECK MY DATE', buttonUrl: '/order-by-date' }
    case 'gallery': return {
      ...base,
      heading: 'Event Gallery',
      body: 'Show customers a few highlights from recent events.',
      image1Url: '/images/desktop-hero-tent-reception.jpg', image1Alt: 'Event rental setup',
      image2Url: '/images/design-your-event-3d-preview.png', image2Alt: 'Event design preview',
      image3Url: '/images/mobile-hero-event-scene-v4.png', image3Alt: 'Outdoor event setup',
    }
    case 'split': return {
      ...base,
      eyebrow: 'Friendly Party Rental',
      heading: 'Built Around Your Event',
      body: 'Pair an image with a message, then send customers to the next step.',
      imageUrl: '/images/desktop-hero-tent-reception.jpg',
      imageAlt: 'Friendly Party Rental event setup',
      buttonLabel: 'BROWSE RENTALS',
      buttonUrl: '/category',
    }
    case 'video': return { ...base, eyebrow: 'See it in action', heading: 'Watch Friendly Party Rental', body: 'Show customers a video without slowing down the initial page load.', videoId: 'LWQvMclQea4' }
    case 'spacer': return { ...base, spacerHeight: '64' }
  }
}

function strictCustomHomeSections(raw: unknown): CustomHomeSection[] {
  if (raw === undefined || raw === null || raw === '') return []
  if (typeof raw !== 'string' || raw.length > 100000) throw new Error('Custom homepage sections are invalid.')
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new Error('Custom homepage sections are invalid.') }
  if (!Array.isArray(parsed) || parsed.length > 24) throw new Error('Custom homepage sections are invalid.')
  const seen = new Set<string>()
  return parsed.map(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Custom homepage sections are invalid.')
    const row = entry as Record<string, unknown>
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    const kind = typeof row.kind === 'string' ? row.kind : ''
    const layout = typeof row.layout === 'string' ? row.layout : ''
    const label = typeof row.label === 'string' ? row.label.trim() : ''
    if (!/^custom-[a-z0-9-]{3,120}$/i.test(id) || seen.has(id)) throw new Error('Custom homepage sections need unique IDs.')
    if (!(CUSTOM_HOME_SECTION_KINDS as readonly string[]).includes(kind)) throw new Error('Choose a valid custom homepage section type.')
    if (layout !== 'mobile' && layout !== 'desktop') throw new Error('Choose a valid custom homepage layout.')
    if (!label || label.length > 80) throw new Error('Custom homepage section labels must be 1–80 characters.')
    seen.add(id)
    const result: Record<string, string> = { id, kind, layout, label }
    for (const key of ['eyebrow','heading','body','imageUrl','imageAlt','buttonLabel','buttonUrl','videoId','image1Url','image1Alt','image2Url','image2Alt','image3Url','image3Alt','spacerHeight','backgroundColor','backgroundImage','backgroundOverlay','textColor','alignment','contentWidth','paddingY','marginY','borderRadius','minHeight','galleryColumns','splitImagePosition']) {
      if (!(key in row)) continue
      if (typeof row[key] !== 'string' || String(row[key]).length > (key === 'body' ? 4000 : 500)) throw new Error('Custom homepage section text is too long.')
      result[key] = String(row[key])
    }
    for (const key of ['imageUrl','buttonUrl','image1Url','image2Url','image3Url','backgroundImage']) {
      if (result[key] && safeHomeUrl(result[key], '') === '') throw new Error('Custom section links and images must use a site path or https URL.')
    }
    if (result.videoId && !/^[\w-]{11}$/.test(result.videoId)) throw new Error('Custom video sections need a valid YouTube video ID.')
    for (const key of ['backgroundColor', 'textColor']) {
      if (result[key] && !/^#[0-9a-f]{6}$/i.test(result[key])) throw new Error('Custom section colors must use six-digit hex values.')
    }
    if (result.alignment && !['left','center','right'].includes(result.alignment)) throw new Error('Choose a valid custom section alignment.')
    if (result.contentWidth && !['narrow','normal','wide','full'].includes(result.contentWidth)) throw new Error('Choose a valid custom section width.')
    if (result.galleryColumns && !['1','2','3'].includes(result.galleryColumns)) throw new Error('Gallery columns must be 1, 2, or 3.')
    if (result.splitImagePosition && !['left','right'].includes(result.splitImagePosition)) throw new Error('Choose a valid split image position.')
    for (const [key, min, max] of [
      ['backgroundOverlay', 0, 90],
      ['paddingY', 0, 200],
      ['marginY', 0, 200],
      ['borderRadius', 0, 64],
      ['minHeight', 0, 1200],
    ] as const) {
      if (!result[key]) continue
      const value = Number(result[key])
      if (!Number.isFinite(value) || value < min || value > max) throw new Error('Custom section design values are outside the allowed range.')
      result[key] = String(Math.round(value))
    }
    if (kind === 'spacer') {
      const height = Number(result.spacerHeight || '64')
      if (!Number.isFinite(height) || height < 16 || height > 320) throw new Error('Spacer height must be between 16 and 320 pixels.')
      result.spacerHeight = String(Math.round(height))
    }
    return result as CustomHomeSection
  })
}

export function readCustomHomeSections(raw: unknown): CustomHomeSection[] {
  try { return strictCustomHomeSections(raw) } catch { return [] }
}

export function validateCustomHomeSections(raw: unknown) {
  strictCustomHomeSections(raw)
}

function strictBuiltInHomeSectionDesigns(raw: unknown): BuiltInHomeSectionDesign[] {
  if (raw === undefined || raw === null || raw === '') return []
  if (typeof raw !== 'string' || raw.length > 50000) throw new Error('Homepage section design settings are invalid.')
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new Error('Homepage section design settings are invalid.') }
  if (!Array.isArray(parsed) || parsed.length > 40) throw new Error('Homepage section design settings are invalid.')
  const seen = new Set<string>()
  return parsed.map(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Homepage section design settings are invalid.')
    const row = entry as Record<string, unknown>
    const layout = row.layout === 'mobile' || row.layout === 'desktop' ? row.layout : ''
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    if (!layout || !id) throw new Error('Homepage section design settings are invalid.')
    const allowed = layout === 'mobile' ? HOME_SECTIONS : DESKTOP_HOME_SECTIONS
    if (!allowed.some(section => section.id === id)) throw new Error('Homepage section design settings reference an unknown section.')
    const identity = `${layout}:${id}`
    if (seen.has(identity)) throw new Error('Homepage section design settings must be unique.')
    seen.add(identity)

    const result: BuiltInHomeSectionDesign = {
      layout,
      id,
      ...BUILTIN_HOME_SECTION_DESIGN_DEFAULTS,
    }
    for (const key of ['backgroundColor','backgroundImage','backgroundOverlay','textColor','alignment','contentWidth','paddingY','marginY','borderRadius','minHeight'] as const) {
      if (!(key in row)) continue
      if (typeof row[key] !== 'string' || String(row[key]).length > 500) throw new Error('Homepage section design settings are invalid.')
      ;(result as unknown as Record<string, string>)[key] = String(row[key])
    }
    for (const key of ['backgroundColor', 'textColor'] as const) {
      if (result[key] && !/^#[0-9a-f]{6}$/i.test(result[key])) throw new Error('Homepage section colors must use six-digit hex values.')
    }
    if (result.backgroundImage && safeHomeUrl(result.backgroundImage, '') === '') throw new Error('Homepage section backgrounds must use a site path or https URL.')
    if (result.alignment && !['left','center','right'].includes(result.alignment)) throw new Error('Choose a valid homepage section alignment.')
    if (result.contentWidth && !['narrow','normal','wide','full'].includes(result.contentWidth)) throw new Error('Choose a valid homepage section width.')
    for (const [key, min, max] of [
      ['backgroundOverlay', 0, 90],
      ['paddingY', 0, 200],
      ['marginY', 0, 200],
      ['borderRadius', 0, 64],
      ['minHeight', 0, 1200],
    ] as const) {
      if (!result[key]) continue
      const value = Number(result[key])
      if (!Number.isFinite(value) || value < min || value > max) throw new Error('Homepage section design values are outside the allowed range.')
      result[key] = String(Math.round(value))
    }
    return result
  })
}

export function readBuiltInHomeSectionDesigns(raw: unknown): BuiltInHomeSectionDesign[] {
  try { return strictBuiltInHomeSectionDesigns(raw) } catch { return [] }
}

export function validateBuiltInHomeSectionDesigns(raw: unknown) {
  strictBuiltInHomeSectionDesigns(raw)
}

export function builtInHomeSectionDesign(raw: unknown, layout: CustomHomeSectionLayout, id: string): BuiltInHomeSectionDesign {
  return readBuiltInHomeSectionDesigns(raw).find(item => item.layout === layout && item.id === id) || {
    layout,
    id,
    ...BUILTIN_HOME_SECTION_DESIGN_DEFAULTS,
  }
}

export function homeSectionDefinitions(content: Record<string, string>, layout: CustomHomeSectionLayout): HomeSectionDefinition[] {
  const fixed = (layout === 'mobile' ? HOME_SECTIONS : DESKTOP_HOME_SECTIONS) as readonly HomeSectionDefinition[]
  const custom = readCustomHomeSections(content.__site_customSections)
    .filter(section => section.layout === layout)
    .map(section => ({ id: section.id, label: section.label, fields: [] as string[], custom: true, kind: section.kind }))
  return [...fixed, ...custom]
}
export const HOME_DEFAULTS: Record<string, string> = {
  ...DEFAULT_HOME_CONTENT,
  ...DESKTOP_HOME_DEFAULTS,
  heroEyebrow: 'Party Rentals Made Easy', heroHeading: 'in Riverdale',
  heroBody: 'Tents, tables, chairs, inflatables, weddings & complete event setups delivered throughout Central New York.',
  heroPrimaryLabel: 'CHECK MY DATE', heroSecondaryLabel: 'BROWSE RENTALS', heroTagline: 'Local & Family-Owned • Professional Setup Available',
  planningEventUrl: '/order-by-date', categoriesUrl: '/category', popularBody: 'Explore customer favorites for your next celebration.', popularButton: 'BROWSE ALL RENTALS', popularUrl: '/category', bounceUrl: '/category/bounce-house-rentals',
  categoriesEyebrow: 'Everything for your event', categoriesBody: 'Browse all rental categories or start with your event date.',
  rentingEasyEyebrow: 'Simple from start to finish', rentingEasyBody: 'Pick what you need online. We handle the rental logistics.',
  step1Body: 'Start with your event date, then shop what is available.',
  step2Body: 'Choose your timing, add your address, and reserve securely online.',
  step3Body: 'We deliver, set up eligible equipment, and return for pickup.',
  stepsButton: 'CHECK MY DATE', stepsUrl: '/order-by-date',
  designerHeading: 'Not Sure What Fits Your Event?', designerBody: 'Tell us your guest count and explore a starting layout with tents, tables, chairs, and more. Customize it in 2D and 3D before you book.', designerButton: 'Design My Event', designerImage: '/images/design-your-event-3d-preview.png',
  designerFeature1Heading: 'Build your layout', designerFeature1Body: 'Arrange tents, tables, chairs, and outdoor fun. Explore your setup in 2D and 3D.',
  designerFeature2Heading: 'Make it your style', designerFeature2Body: 'Try linen colors and table settings, then see your event lighting after dark.',
  designerFeature3Heading: 'Turn your plan into a quote', designerFeature3Body: 'Use Review & Quote in the designer to send your layout to Friendly Party Rental.',
  packagesUrl: '/weddings', packagesBody: 'Explore our wedding packages. Travel fees are calculated separately for your location.',
  weddingBannerUrl: '/weddings', weddingBannerImage: '', reviewsHeading: 'What Our Customers Say', eventPlanningUrl: '/event-planning', youtubeVideoId: 'LWQvMclQea4',
  seoHeading: 'Party Rentals Serving Riverdale, the Bronx and Lower Westchester', seoBody: 'Friendly Party Rental provides party rentals in Riverdale, Riverdale, Cicero, Manlius, Camillus, Baldwinsville, Clay, Cazenovia, Liverpool, and surrounding Central New York communities.',
  sectionOrder: HOME_SECTIONS.map(s => s.id).join(','), sectionOrderCustomized: '', hiddenSections: '',
  desktopSectionOrder: DESKTOP_HOME_SECTIONS.map(s => s.id).join(','), desktopHiddenSections: '',
}
export function orderedHomeSections(content: Record<string, string>): HomeSectionDefinition[] {
  // Earlier editor defaults placed YouTube near the footer and split steps/reviews
  // with wedding sections. Correct that exact saved default in both live and preview
  // rendering, while retaining custom orders (including deliberate reorders).
  const legacyDefault = 'hero,trust,planning,categories,popular,bounce,designer,packages,steps,wedding,reviews,event,youtube,seo'
  const savedOrder = content.sectionOrder || ''
  const order = savedOrder === legacyDefault && content.sectionOrderCustomized !== 'true'
    ? HOME_DEFAULTS.sectionOrder
    : savedOrder
  const definitions = homeSectionDefinitions(content, 'mobile')
  const ids = order.split(',').filter(Boolean)
  return [...new Set([...ids, ...definitions.map(section => section.id)])].flatMap(id => {
    const section = definitions.find(item => item.id === id)
    return section ? [section] : []
  })
}
export function orderedDesktopHomeSections(content: Record<string, string>): HomeSectionDefinition[] {
  const definitions = homeSectionDefinitions(content, 'desktop')
  const ids = (content.desktopSectionOrder || '').split(',').filter(Boolean)
  return [...new Set([...ids, ...definitions.map(section => section.id)])].flatMap(id => {
    const section = definitions.find(item => item.id === id)
    return section ? [section] : []
  })
}
export function safeHomeUrl(value: string | null | undefined, fallback = '/category') {
  if (!value || /[\s\\\u0000-\u001f]/.test(value)) return fallback
  if (value.startsWith('/') && !value.startsWith('//')) return value
  try { const u = new URL(value); if (u.protocol === 'https:') return u.href } catch {}
  return fallback
}
export function validateHomeDraft(hero: Record<string, unknown>, content: Record<string, unknown>) {
  validateCustomHomeSections(content.__site_customSections)
  validateBuiltInHomeSectionDesigns(content.__site_builtinSectionStyles)
  for (const [key, value] of Object.entries(content)) {
    const maxLength = key === '__site_customSections'
      ? 100000
      : key === '__site_builtinSectionStyles' || key === '__site_navItems' || key === '__site_footerLinks'
        ? 50000
        : 10000
    const tooLargeMessage = key === '__site_customSections'
      ? 'Custom homepage sections are too large.'
      : key === '__site_builtinSectionStyles'
        ? 'Homepage section design settings are too large.'
        : key === '__site_navItems'
          ? 'Homepage navigation is too large.'
          : key === '__site_footerLinks'
            ? 'Footer links are too large.'
            : 'Homepage fields must be text under 10,000 characters.'
    if (typeof value !== 'string' || value.length > maxLength) throw new Error(tooLargeMessage)
    if ((key.endsWith('Url') || key.endsWith('Image') || key.endsWith('_href') || key.endsWith('_image')) && value && safeHomeUrl(value, '') === '') throw new Error('Use a site path or an https URL for links and images.')
  }
  for (const key of ['mobileImageUrl', 'desktopImageUrl', 'primaryActionValue', 'secondaryActionValue']) {
    const value = hero[key]
    if (value != null && (typeof value !== 'string' || value && safeHomeUrl(value, '') === '')) throw new Error('Use a site path or an https URL for hero images and buttons.')
  }
  for (const key of ['focalX', 'focalY', 'desktopFocalX', 'desktopFocalY']) {
    if (hero[key] !== undefined && (typeof hero[key] !== 'number' || !Number.isFinite(hero[key]) || Number(hero[key]) < 0 || Number(hero[key]) > 1)) throw new Error('Image focus must be between 0 and 100%.')
  }
}
