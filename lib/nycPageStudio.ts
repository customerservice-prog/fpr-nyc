import type { Block } from '@/components/public/NycCustomPageBlocks'

export type NycStudioField = { key: string; label: string; kind?: 'text' | 'textarea' | 'url' | 'select'; options?: string[] }
const text = (key: string, label: string, kind: NycStudioField['kind'] = 'text'): NycStudioField => ({ key, label, kind })
const url = (key: string, label: string): NycStudioField => text(key, label, 'url')
const select = (key: string, label: string, options: string[]): NycStudioField => ({ key, label, kind: 'select', options })

// Matches the fields supported by NYC's public RenderBlock component.
// The legacy HTML block is viewable but never editable or publishable here.
export const NYC_STUDIO_FIELDS: Record<string, NycStudioField[]> = {
  hero: [text('heroTitle', 'Headline'), text('heroSubtitle', 'Description', 'textarea'), url('heroImageUrl', 'Background image URL'), text('heroButtonLabel', 'Button label'), url('heroButtonUrl', 'Button link'), select('heroStyle', 'Style', ['overlay', 'solid-blue', 'solid-red', 'left-align', 'two-button'])],
  heading: [text('headingText', 'Heading'), select('headingSize', 'Heading size', ['h2', 'h3', 'h1'])],
  text: [text('text', 'Paragraph', 'textarea')],
  image: [url('imageUrl', 'Image URL'), text('imageAlt', 'Image description')],
  button: [text('buttonLabel', 'Button text'), url('buttonUrl', 'Button destination')],
  textImage: [text('tiHeading', 'Heading'), text('tiText', 'Description', 'textarea'), url('tiImageUrl', 'Image URL'), select('tiImageSide', 'Image position', ['left', 'right'])],
  testimonial: [text('quote', 'Quote', 'textarea'), text('author', 'Attribution'), select('testimonialStyle', 'Style', ['card', 'simple'])],
  threeCol: [text('col1Title', 'Column 1 title'), text('col1Text', 'Column 1 text', 'textarea'), text('col2Title', 'Column 2 title'), text('col2Text', 'Column 2 text', 'textarea'), text('col3Title', 'Column 3 title'), text('col3Text', 'Column 3 text', 'textarea')],
  cta: [text('ctaText', 'Call to action', 'textarea'), text('ctaButtonLabel', 'Button label'), url('ctaButtonUrl', 'Button destination')],
  videoFeature: [url('videoUrl', 'Video URL'), text('videoCaption', 'Caption'), select('videoSide', 'Video position', ['left', 'right']), select('videoSize', 'Video size', ['medium', 'large']), text('videoButtonLabel', 'Button label'), url('videoButtonUrl', 'Button destination')],
  imageGrid: [url('gridImage1', 'Image 1'), url('gridImage2', 'Image 2'), url('gridImage3', 'Image 3'), url('gridImage4', 'Image 4'), select('gridLayout', 'Layout', ['grid', 'masonry']), url('gridLinkUrl', 'Image link')],
  faq: [text('faqQ1', 'Question 1'), text('faqA1', 'Answer 1', 'textarea'), text('faqQ2', 'Question 2'), text('faqA2', 'Answer 2', 'textarea'), text('faqQ3', 'Question 3'), text('faqA3', 'Answer 3', 'textarea')],
  table: [text('tableData', 'Rows / JSON data', 'textarea'), select('tableStyle', 'Style', ['default', 'striped'])],
  separator: [],
  spacer: [select('spacerHeight', 'Height', ['20', '40', '60', '80', '100'])],
}

export const NYC_STUDIO_TYPES = Object.keys(NYC_STUDIO_FIELDS)
const SAFE_PAGE_URL = /^(?:\/(?!\/)|https?:\/\/|mailto:[^\s@]+@[^\s@]+|tel:\+?[0-9()+.\- ]+$)/i
const SAFE_IMAGE_URL = /^(?:\/(?!\/)|https?:\/\/)/i

export function isSafeStudioUrl(value: string, image = false) {
  return !/[\u0000-\u001f\u007f]/.test(value) && (!value || (image ? SAFE_IMAGE_URL : SAFE_PAGE_URL).test(value))
}

export function parseNycStudioContent(raw: string | null): Block[] {
  if (!raw) return []
  try {
    const blocks: unknown = JSON.parse(raw)
    if (Array.isArray(blocks)) return blocks as Block[]
  } catch {}
  // Legacy NYC page manager previously accepted a plain text textarea.
  // Keep those pages visible and editable rather than rendering a blank body.
  return [{ id: 'legacy-text', type: 'text', text: raw }]
}

export function normalizeNycStudioContent(input: unknown): string {
  if (!Array.isArray(input) || input.length > 60) throw new Error('A page can have up to 60 content sections.')
  const seen = new Set<string>()
  const blocks = input.map((raw): Record<string, string> => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid page section.')
    const data = raw as Record<string, unknown>
    if (typeof data.type !== 'string' || !NYC_STUDIO_FIELDS[data.type]) {
      throw new Error('The page contains an unsupported or legacy HTML section. Remove it before saving in the new studio.')
    }
    if (typeof data.id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(data.id) || seen.has(data.id)) {
      throw new Error('Duplicate or invalid section ID.')
    }
    seen.add(data.id)
    const result: Record<string, string> = { id: data.id, type: data.type }
    // Preserve only rendering properties supported by the chosen block type.
    for (const field of NYC_STUDIO_FIELDS[data.type]) {
      const value = data[field.key]
      if (value === undefined || value === null || value === '') continue
      if (typeof value !== 'string' || value.length > 10000) throw new Error('Section fields must be valid text.')
      if (field.kind === 'select' && field.options && !field.options.includes(value)) {
        throw new Error('Invalid section style.')
      }
      if (field.kind === 'url' && !isSafeStudioUrl(value, /image|Image|tiImage|gridImage/.test(field.key))) {
        throw new Error('Links must use HTTPS, HTTP, a local URL, email or telephone where supported.')
      }
      result[field.key] = value
    }
    return result
  })
  const serialized = JSON.stringify(blocks)
  if (serialized.length > 120000) throw new Error('This page exceeds the 120 KB editor limit.')
  return serialized
}

export function niceNycStudioType(type: string) {
  const names: Record<string, string> = {
    hero: 'Hero banner', heading: 'Heading', text: 'Paragraph', image: 'Image',
    button: 'Button', textImage: 'Image + text', testimonial: 'Testimonial',
    threeCol: 'Three columns', cta: 'Call to action', videoFeature: 'Video',
    imageGrid: 'Image grid', faq: 'FAQs', table: 'Table', separator: 'Divider', spacer: 'Spacing',
    html: 'Legacy HTML',
  }
  return names[type] || type
}
