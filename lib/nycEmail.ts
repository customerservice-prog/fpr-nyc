import { NYC_PUBLIC_HOST } from '@/lib/nycPublicOrigin'

// Public Riverdale inbox and staff notifications have different destinations.
export const NYC_EMAIL_ADDRESS = 'friendlypartyrentalnyc@gmail.com'
export const NYC_NOTIFICATION_EMAIL = 'customerservice@friendlypartyrental.com'
export const NYC_EMAIL_TAG = '[NYC / Riverdale]'

export function nycEmailSubject(subject: string): string {
  const clean = String(subject || 'Riverdale inquiry').replace(/[\r\n]+/g, ' ').trim()
  return NYC_EMAIL_TAG + ' ' + clean.replace(/^(?:\[NYC \/ (?:Riverdale|Downstate)\]\s*)+/i, '')
}

export function nycEmailHref(subject = 'Rental inquiry', body = ''): string {
  return 'mailto:' + NYC_EMAIL_ADDRESS + '?subject=' + encodeURIComponent(nycEmailSubject(subject)) +
    (body ? '&body=' + encodeURIComponent(body) : '')
}

export function nycEmailHtml(html: string): string {
  if (html.includes('data-fpr-location="nyc-riverdale"')) return html
  const banner = '<div data-fpr-location="nyc-riverdale" style="font-family:Arial,sans-serif;background:#0B1F3A;color:#ffffff;padding:16px 20px;margin-bottom:20px;border-radius:8px;"><strong>NYC / RIVERDALE LOCATION</strong><br><span style="font-size:12px;">Friendly Party Rental NYC &middot; ' + NYC_PUBLIC_HOST + ' &middot; 718-283-4593</span></div>'
  return /<body\b[^>]*>/i.test(html) ? html.replace(/<body\b[^>]*>/i, m => m + banner) : banner + html
}
