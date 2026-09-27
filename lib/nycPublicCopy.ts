/**
 * NYC Public Copy
 * Localized text for Riverdale / Lower Westchester / Downstate New York
 * Modeled from scPublicCopy
 */

export const NYC_PHONE = '315-884-1498';
export const NYC_LOCATION_NAME = 'Riverdale / Lower Westchester';
export const NYC_REGION_NAME = 'Downstate New York';

/**
 * Location-specific messaging
 */
export const NYC_MESSAGING = {
  welcomeHeadline: `Party Rentals in ${NYC_LOCATION_NAME}`,
  welcomeSubheadline: `Premium event rentals for Riverdale, Yonkers, and Lower Westchester`,
  serviceDescription: `Serving Riverdale, Fieldston, Kingsbridge, Yonkers, Mount Vernon, New Rochelle, and surrounding areas in Downstate New York`,
  deliveryZone: `${NYC_LOCATION_NAME} and surrounding areas`,
  contactRegional: `For rentals in ${NYC_LOCATION_NAME}, call us at ${NYC_PHONE}`,
  scheduleCall: `Schedule your free consultation today`,
  pickupUnavailable: `Pickup is not available in our service area. We offer delivery to ${NYC_LOCATION_NAME}.`,
  weekdayDelivery: `Weekday deliveries available in ${NYC_LOCATION_NAME}`,
};

/**
 * Get fallback text for items/categories
 * Used when CMS data is missing
 */
export function getItemFallbackText(
  itemName: string,
  category?: string
): { title: string; description: string } {
  const categoryText = category ? ` for ${category}` : '';
  return {
    title: `${itemName}${categoryText}`,
    description: `Premium ${itemName.toLowerCase()} rentals for events in ${NYC_LOCATION_NAME}. Rent from Friendly Party Rental NYC.`,
  };
}

/**
 * Get fallback text for categories
 */
export function getCategoryFallbackText(
  categoryName: string
): { title: string; description: string } {
  return {
    title: `${categoryName} Rentals in ${NYC_LOCATION_NAME}`,
    description: `Browse our selection of ${categoryName.toLowerCase()} rentals for parties, weddings, and events in Riverdale, Yonkers, and Lower Westchester. Friendly Party Rental NYC.`,
  };
}

/**
 * Sanitize legacy Syracuse/Minoa/Greenville text
 */
export function sanitizePublicCopy(text: string): string {
  if (!text) return `Friendly Party Rental NYC • ${NYC_LOCATION_NAME}`;

  let cleaned = text;

  // Replace Syracuse/Minoa/CNY references
  cleaned = cleaned.replace(
    /Syracuse|Minoa|Central New York|CNY|upstate/gi,
    NYC_LOCATION_NAME
  );

  // Replace Greenville/SC references
  cleaned = cleaned.replace(
    /Greenville|South Carolina|SC(?:\s|$)|864-610-5324/gi,
    (match) => {
      if (match === '864-610-5324') return NYC_PHONE;
      return NYC_LOCATION_NAME;
    }
  );

  // Ensure phone is NYC
  cleaned = cleaned.replace(/\b\d{3}-\d{3}-\d{4}\b/g, (phone) => {
    if (phone === '864-610-5324' || phone === '315-884-1498') {
      return NYC_PHONE;
    }
    return phone;
  });

  return cleaned.trim();
}

