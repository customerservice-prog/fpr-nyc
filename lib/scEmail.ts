const SITE_URL=(process.env.NEXT_PUBLIC_SITE_URL||process.env.PUBLIC_BASE_URL||'').replace(/\/$/,'')
export const NYC_EMAIL_ADDRESS='customerservice@friendlypartyrental.com'
export const NYC_EMAIL_TAG='[NYC / Downstate]'
export function nycEmailSubject(subject:string):string{const clean=String(subject||'NYC / Downstate inquiry').replace(/[\r\n]+/g,' ').trim();return NYC_EMAIL_TAG+' '+clean.replace(/^(?:\[NYC \/ Downstate\]\s*)+/i,'')}
export function nycEmailHref(subject='NYC / Downstate rental inquiry',body=''):string{return 'mailto:'+NYC_EMAIL_ADDRESS+'?subject='+encodeURIComponent(nycEmailSubject(subject))+(body?'&body='+encodeURIComponent(body):'')}
export function nycEmailHtml(html:string):string{if(html.includes('data-fpr-location="nyc-downstate"'))return html;const site=SITE_URL?' &middot; '+SITE_URL.replace(/^https?:\/\//,''):'';const banner='<div data-fpr-location="nyc-downstate" style="font-family:Arial,sans-serif;background:#0B1F3A;color:#ffffff;padding:16px 20px;margin-bottom:20px;border-radius:8px;"><strong>NYC / DOWNSTATE NEW YORK</strong><br><span style="font-size:12px;">Friendly Party Rental NYC'+site+' &middot; 315-884-1498</span></div>';return /<body\b[^>]*>/i.test(html)?html.replace(/<body\b[^>]*>/i,m=>m+banner):banner+html}
// Compatibility aliases during location-layer rename.
export const SC_EMAIL_ADDRESS=NYC_EMAIL_ADDRESS
export const SC_EMAIL_TAG=NYC_EMAIL_TAG
export const scEmailSubject=nycEmailSubject
export const scEmailHref=nycEmailHref
export const scEmailHtml=nycEmailHtml
