import { instrumentMarketingHtml, type MarketingTrackingContext } from '@/lib/marketing/tracking'
// Wrap builder HTML in a professional, email-client-safe branded shell.
// Table-based layout with inline styles for maximum client compatibility (Gmail, Outlook, Apple Mail).
export function wrapEmail(bodyHtml: string, recipient: string, origin: string, preheaderText?: string, tracking?: MarketingTrackingContext): string {
  const unsubUrl = origin + '/api/unsubscribe?email=' + encodeURIComponent(recipient)
  const year = new Date().getFullYear()
  const document = `<!DOCTYPE html>
  <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Friendly Party Rental NYC</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f6fb;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:#f4f6fb;">${(preheaderText || 'Party & event rentals in Riverdale and Downstate New York. Ask about delivery and setup options.').replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6fb;"><tr><td align="center" style="padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;">
  <tr><td style="background-color:#0b3d91;padding:22px 24px;text-align:center;border-radius:0;">
  <img src="${origin}/brand/friendly-party-rental-nyc-logo-v5.png" width="150" alt="Friendly Party Rental NYC" style="display:inline-block;max-width:150px;height:auto;border:0;" />
  </td></tr>
  <tr><td style="height:4px;background-color:#f5a623;line-height:4px;font-size:4px;">&nbsp;</td></tr>
  <tr><td style="background-color:#ffffff;padding:12px 10px;text-align:center;border-bottom:1px solid #e5e7eb;">
  <a href="${origin}/category/tent-rentals" style="color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:0 8px;">Tents</a><span style="color:#e5e7eb;">|</span>
  <a href="${origin}/category/table-chair-rentals" style="color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:0 8px;">Tables & Chairs</a><span style="color:#e5e7eb;">|</span>
  <a href="${origin}/category/linen-rentals" style="color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:0 8px;">Linens</a><span style="color:#e5e7eb;">|</span>
  <a href="${origin}/category/beverage-food-service" style="color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:0 8px;">Beverage & Food</a><span style="color:#e5e7eb;">|</span>
  <a href="${origin}/contact_us" style="color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;text-decoration:none;padding:0 8px;">Get a Quote</a>
  </td></tr>
  <tr><td style="background-color:#ffffff;padding:28px 32px;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:16px;line-height:1.6;">
  ${bodyHtml}
  </td></tr>
  <tr><td style="background-color:#ffffff;padding:6px 32px 4px;font-family:Arial,Helvetica,sans-serif;text-align:center;">
  <div style="font-size:19px;font-weight:bold;color:#1a1a1a;padding:8px 0 2px;">Shop by Category</div>
  <div style="font-size:14px;color:#6b7280;padding-bottom:6px;">Everything you need for an unforgettable event</div>
  </td></tr>
  <tr><td style="background-color:#ffffff;padding:6px 24px 26px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <td width="50%" style="padding:6px;">
  <a href="${origin}/category/tent-rentals" style="display:block;text-align:center;text-decoration:none;background-color:#f4f6fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 8px;color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">Tents & Canopies</a>
  </td>
  <td width="50%" style="padding:6px;">
  <a href="${origin}/category/table-chair-rentals" style="display:block;text-align:center;text-decoration:none;background-color:#f4f6fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 8px;color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">Tables & Chairs</a>
  </td>
  </tr>
  <tr>
  <td width="50%" style="padding:6px;">
  <a href="${origin}/category/linen-rentals" style="display:block;text-align:center;text-decoration:none;background-color:#f4f6fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 8px;color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">Linens & Draping</a>
  </td>
  <td width="50%" style="padding:6px;">
  <a href="${origin}/category/heater-fan-rentals" style="display:block;text-align:center;text-decoration:none;background-color:#f4f6fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 8px;color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">Heating & Cooling</a>
  </td>
  </tr>
  <tr>
  <td width="50%" style="padding:6px;">
  <a href="${origin}/category/beverage-food-service" style="display:block;text-align:center;text-decoration:none;background-color:#f4f6fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 8px;color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">Beverage & Food</a>
  </td>
  <td width="50%" style="padding:6px;">
  <a href="${origin}/category" style="display:block;text-align:center;text-decoration:none;background-color:#f4f6fb;border:1px solid #e5e7eb;border-radius:8px;padding:16px 8px;color:#0b3d91;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;">Shop All Rentals</a>
  </td>
  </tr>
  </table>
  </td></tr>
  <tr><td style="background-color:#0b3d91;padding:20px 24px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
  <div style="color:#ffffff;font-size:16px;font-weight:bold;padding-bottom:4px;">Delivery, setup &amp; pickup available</div>
  <div style="color:#cfe0ff;font-size:13px;">Serving Riverdale & Downstate New York</div>
  <div style="padding-top:12px;"><a href="${origin}/contact_us" style="display:inline-block;background-color:#f5a623;color:#1a1a1a;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 28px;border-radius:6px;">Request a Free Quote</a></div>
  </td></tr>
  <tr><td style="background-color:#ffffff;padding:24px 32px;font-family:Arial,Helvetica,sans-serif;text-align:center;border-top:1px solid #e5e7eb;">
  <div style="font-size:15px;font-weight:bold;color:#1a1a1a;">Friendly Party Rental NYC</div>
  <div style="font-size:13px;color:#6b7280;padding-top:4px;">Riverdale, NY &amp; nearby Bronx and Lower Westchester communities</div>
  <div style="font-size:13px;color:#6b7280;padding-top:2px;">315-884-1498 &nbsp;&bull;&nbsp; customerservice@friendlypartyrental.com</div>
  <div style="padding-top:8px;"><a href="${origin}" style="color:#0b3d91;font-size:13px;font-weight:bold;text-decoration:none;">${origin.replace(/^https?:\/\//, '')}</a></div>
  <div style="font-size:11px;color:#6b7280;line-height:1.6;padding-top:16px;border-top:1px solid #e5e7eb;margin-top:16px;">
  You are receiving this email because you are a customer of Friendly Party Rental NYC.<br />
  <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe from marketing emails</a><br />
  &copy; ${year} Friendly Party Rental NYC, Riverdale, NY. All rights reserved.
  </div>
  </td></tr>
  </table>
  </td></tr></table>
  </body>
  </html>`
  return tracking ? instrumentMarketingHtml(document, { ...tracking, email: recipient, origin }) : document
}

// RFC 2369 / RFC 8058 one-click unsubscribe headers for a specific
// recipient. Gmail/Yahoo etc. issue an automatic POST straight to this URL
// (not a JSON body) - see the matching POST handler in
// app/api/unsubscribe/route.ts, which reads the email from the query
// string for this exact reason.
export function unsubscribeHeaders(origin: string, recipient: string): Record<string, string> {
  const unsubUrl = origin + '/api/unsubscribe?email=' + encodeURIComponent(recipient)
  return {
    'List-Unsubscribe': `<${unsubUrl}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  }
}

