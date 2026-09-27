/**
 * NYC Email utilities
 * Modeled from scEmail with NYC/Downstate branding
 */

export const NYC_EMAIL_ADDRESS = 'info@friendlypartyrentalnyc.com';
export const NYC_PHONE = '315-884-1498';
export const NYC_SUBJECT_PREFIX = '[NYC / Downstate]';
export const NYC_BANNER_TEXT = 'NYC / DOWNSTATE • RIVERDALE + LOWER WESTCHESTER';
export const NYC_LOCATION_DATA = 'nyc-downstate';

/**
 * Format email subject with location prefix
 */
export function nycEmailSubject(subject: string): string {
  return `${NYC_SUBJECT_PREFIX} ${subject}`;
}

/**
 * Generate email header banner
 */
export function nycEmailBanner(): string {
  return `
<div style="background: #1a1a1a; color: white; padding: 12px; text-align: center; font-size: 12px; font-weight: 600; letter-spacing: 0.5px;">
  ${NYC_BANNER_TEXT}
</div>
  `.trim();
}

/**
 * Contact information block
 */
export function nycContactBlock(): string {
  return `
<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-size: 13px; color: #555;">
  <p style="margin: 0 0 8px 0;">
    <strong>Questions?</strong> Call us at <a href="tel:${NYC_PHONE.replace(/[^0-9]/g, '')}">${NYC_PHONE}</a>
  </p>
  <p style="margin: 0;">
    Friendly Party Rental NYC • Riverdale + Lower Westchester • Downstate New York
  </p>
</div>
  `.trim();
}

/**
 * Add location data attribute to email element
 */
export function nycEmailDataAttribute(): string {
  return `data-fpr-location="${NYC_LOCATION_DATA}"`;
}

