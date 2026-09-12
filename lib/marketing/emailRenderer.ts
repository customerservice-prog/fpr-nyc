// Shared email block rendering used by both the Campaign Builder and the
// Campaign Design Gallery, so previews are always pixel-identical.
import type { VisualThemeTokens } from './campaignLibrary'; function dateBannerOutline(b: Block, theme: VisualThemeTokens) { return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;"><tr><td align="center" style="background:' + theme.panelBg + ';border:1px solid ' + theme.borderColor + ';padding:18px 16px;border-radius:' + theme.radius + ';">' + (b.eyebrow ? '<div style="font-family:' + theme.bodyFont + ';font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:' + theme.eyebrowColor + ';margin-bottom:6px;">' + esc(b.eyebrow) + '</div>' : '') + '<div style="font-family:' + theme.headingFont + ';font-size:22px;font-weight:bold;line-height:1.3;color:' + theme.accent + ';">' + esc(b.text || '') + '</div>' + (b.subtitle ? '<div style="font-family:' + theme.bodyFont + ';font-size:14px;margin-top:6px;color:' + theme.textColor + ';">' + esc(b.subtitle) + '</div>' : '') + '</td></tr></table>' } function dateBannerSplit(b: Block, theme: VisualThemeTokens) { return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;"><tr><td width="38%" valign="middle" align="center" style="background:' + theme.accent + ';color:' + theme.accentText + ';padding:20px 12px;border-radius:' + theme.radius + ' 0 0 ' + theme.radius + ';">' + (b.eyebrow ? '<div style="font-family:' + theme.bodyFont + ';font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;opacity:0.85;margin-bottom:4px;">' + esc(b.eyebrow) + '</div>' : '') + '<div style="font-family:' + theme.headingFont + ';font-size:20px;font-weight:bold;line-height:1.25;">' + esc(b.text || '') + '</div>' + '</td><td valign="middle" style="background:' + theme.cardBg + ';border:1px solid ' + theme.borderColor + ';border-left:0;padding:16px 18px;border-radius:0 ' + theme.radius + ' ' + theme.radius + ' 0;">' + (b.subtitle ? '<div style="font-family:' + theme.bodyFont + ';font-size:14px;color:' + theme.textColor + ';">' + esc(b.subtitle) + '</div>' : '') + '</td></tr></table>' }

export type BlockType = 'heading' | 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'hero' | 'offer' | 'grid' | 'badges' | 'masthead' | 'eyebrow' | 'splitrow' | 'featureRow' | 'trust' | 'dateBanner' | 'signature' | 'footerBrand'

export interface Card {
  image: string
  caption: string
  url: string
}

export interface Block {
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


export function blockHtml(b: Block, theme: VisualThemeTokens): string {
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
        return '<div style="text-align:center;padding:6px 0 18px;"><div style="font-family:' + theme.headingFont + ';font-size:14px;font-weight:normal;color:' + theme.headingColor + ';letter-spacing:3px;text-transform:uppercase;">Friendly Party Rental</div><div style="font-size:11px;color:' + theme.mutedColor + ';letter-spacing:1px;margin-top:4px;font-family:' + theme.bodyFont + ';font-style:italic;">Greenville &amp; Upstate South Carolina</div></div>'
      }
      return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:16px 0;border-bottom:3px solid ' + theme.accent + ';">' +
        '<div style="font-family:' + theme.headingFont + ';font-size:19px;font-weight:bold;color:' + theme.headingColor + ';letter-spacing:1.5px;">FRIENDLY PARTY RENTAL</div>' +
        '<div style="font-size:11px;color:' + theme.mutedColor + ';letter-spacing:1px;margin-top:2px;font-family:' + theme.bodyFont + ';">GREENVILLE &amp; UPSTATE SOUTH CAROLINA EVENT RENTALS/div>' +
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
    case 'dateBanner': { const variant = b.variant || 'band'; if (variant === 'outline') { return dateBannerOutline(b, theme) } if (variant === 'split') { return dateBannerSplit(b, theme) } }
      return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 18px;"><tr><td align="center" style="background:' + theme.accent + ';color:' + theme.accentText + ';padding:20px 16px;border-radius:' + theme.radius + ';">' +
        (b.eyebrow ? '<div style="font-family:' + theme.bodyFont + ';font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;opacity:0.85;margin-bottom:6px;">' + esc(b.eyebrow) + '</div>' : '') +
        '<div style="font-family:' + theme.headingFont + ';font-size:24px;font-weight:bold;line-height:1.3;">' + esc(b.text || '') + '</div>' +
        (b.subtitle ? '<div style="font-family:' + theme.bodyFont + ';font-size:14px;margin-top:6px;opacity:0.9;">' + esc(b.subtitle) + '</div>' : '') +
        '</td></tr></table>'
    case 'signature':
      return '<div style="text-align:left;font-family:' + theme.headingFont + ';font-style:italic;font-size:15px;color:' + theme.textColor + ';margin:6px 0 4px;">' + esc(b.text || '') + '</div>'
    case 'footerBrand': {
      const variant = b.variant || 'standard'
      const contact = '315-884-1498 &nbsp;•&nbsp; friendlypartyrentalsc.com'
      if (variant === 'minimal') {
        return '<div style="text-align:center;border-top:1px solid ' + theme.borderColor + ';padding-top:14px;margin-top:18px;font-family:' + theme.bodyFont + ';font-size:12px;color:' + theme.mutedColor + ';">' +
          'Friendly Party Rental &nbsp;•&nbsp; ' + contact + '<br/><a href="#" style="color:' + theme.mutedColor + ';text-decoration:underline;">Manage email preferences</a></div>'
      }
      if (variant === 'corporate') {
        return '<div style="text-align:center;border-top:1px solid ' + theme.borderColor + ';padding-top:16px;margin-top:20px;font-family:' + theme.bodyFont + ';font-size:12px;color:' + theme.mutedColor + ';">' +
          '<div style="font-weight:bold;color:' + theme.headingColor + ';margin-bottom:3px;">Friendly Party Rental</div>' +
          'Tents &bull; Tables &bull; Chairs &bull; Event Rentals &mdash; Greenville / Upstate South Carolina<br/>' + contact + '<br/>' +
          '<a href="#" style="color:' + theme.mutedColor + ';text-decoration:underline;">Manage preferences</a> &nbsp;|&nbsp; <a href="#" style="color:' + theme.mutedColor + ';text-decoration:underline;">Unsubscribe</a></div>'
      }
      return '<div style="text-align:center;border-top:1px solid ' + theme.borderColor + ';padding-top:16px;margin-top:20px;font-family:' + theme.bodyFont + ';font-size:12px;color:' + theme.mutedColor + ';">' +
        '<div style="font-weight:bold;color:' + theme.headingColor + ';margin-bottom:3px;">Friendly Party Rental</div>' +
        'Tents &bull; Tables &bull; Chairs &bull; Event Rentals<br/>Greenville, SC &nbsp;•&nbsp; ' + contact + '<br/>' +
        '<a href="#" style="color:' + theme.mutedColor + ';text-decoration:underline;">Manage preferences</a> &nbsp;|&nbsp; <a href="#" style="color:' + theme.mutedColor + ';text-decoration:underline;">Unsubscribe</a></div>'
    }
    default:
      return ''
  }
}


export function blocksToHtml(blocks: Block[], theme: VisualThemeTokens): string {
  return blocks.map((b) => blockHtml(b, theme)).join('\n')
}

