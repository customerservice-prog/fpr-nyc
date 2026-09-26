export const NYC_EMAIL_ADDRESS = 'customerservice@friendlypartyrental.com'
export const NYC_EMAIL_TAG = '[South Carolina]'
export function nycEmailSubject(subject: string): string {
 const clean = String(subject || 'Greenville inquiry').replace(/[\r\n]+/g, ' ').trim()
 return NYC_EMAIL_TAG + ' ' + clean.replace(/^(?:\[South Carolina\]\s*)+/i, '')
}
export function nycEmailHref(subject = 'Greenville rental inquiry', body = ''): string {
 return 'mailto:' + NYC_EMAIL_ADDRESS + '?subject=' + encodeURIComponent(nycEmailSubject(subject)) + (body ? '&body=' + encodeURIComponent(body) : '')
}
export function nycEmailHtml(html: string): string {
 if (html.includes('data-fpr-location="greenville-sc"')) return html
 const banner = '<div data-fpr-location="greenville-sc" style="font-family:Arial,sans-serif;background:#0B1F3A;color:#ffffff;padding:16px 20px;margin-bottom:20px;border-radius:8px;"><strong>SOUTH CAROLINA &bull; GREENVILLE</strong><br><span style="font-size:12px;">Friendly Party Rental SC &middot; friendlypartyrentalsc.com &middot; 864-610-5324</span></div>'
 return /<body\b[^>]*>/i.test(html) ? html.replace(/<body\b[^>]*>/i, match => match + banner) : banner + html
}
