export type DriverAddressParts = {
  eventAddress?: string | null
  eventCity?: string | null
  eventState?: string | null
  eventZip?: string | null
}

function clean(value?: string | null) {
  return (value || '').trim().replace(/\s+/g, ' ')
}

export function driverNavigationDestination(parts: DriverAddressParts) {
  const street = clean(parts.eventAddress)
  const city = clean(parts.eventCity)
  const state = clean(parts.eventState)
  const zip = clean(parts.eventZip)
  const validZip = /^\d{5}(?:-\d{4})?$/.test(zip)

  // A valid ZIP is a stronger locator than a free-text city field. Imported
  // orders sometimes contain abbreviations such as "Caz", which can make
  // Google Maps choose the wrong road in another municipality.
  const pieces = validZip
    ? [street, state, zip, 'USA']
    : [street, city, state, 'USA']

  return pieces.filter(Boolean).join(', ')
}

export function driverNavigationUrl(parts: DriverAddressParts) {
  const destination = driverNavigationDestination(parts)
  return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destination)
}
