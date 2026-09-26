export const SC_EMAIL_ADDRESS='customerservice@friendlypartyrental.com'
export const SC_EMAIL_TAG='[NYC / Downstate]'
export function scEmailSubject(subject:string):string{
 const clean=String(subject||'Riverdale rental inquiry').replace(/[\r\n]+/g,' ').trim()
 return SC_EMAIL_TAG+' '+clean.replace(/^(?:\[NYC \/ Downstate\]\s*)+/i,'')
}
export function scEmailHref(subject='Riverdale rental inquiry',body=''):string{
 return 'mailto:'+SC_EMAIL_ADDRESS+'?subject='+encodeURIComponent(scEmailSubject(subject))+(body?'&body='+encodeURIComponent(body):'')
}
export function scEmailHtml(html:string):string{
 if(html.includes('data-fpr-location="nyc-downstate"'))return html
 const banner='<div data-fpr-location="nyc-downstate" style="font-family:Arial,sans-serif;background:#0B1F3A;color:#ffffff;padding:16px 20px;margin-bottom:20px;border-radius:8px;"><strong>NYC / DOWNSTATE &bull; RIVERDALE</strong><br><span style="font-size:12px;">Friendly Party Rental NYC &middot; Riverdale, Bronx &amp; Lower Westchester &middot; 315-884-1498</span></div>'
 return /<body\b[^>]*>/i.test(html)?html.replace(/<body\b[^>]*>/i,match=>match+banner):banner+html
}
