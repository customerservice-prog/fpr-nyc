/** Read public package inclusions from the same NYC catalog description checkout sells. */
export function weddingPackageCatalogDetails(description: string | null | undefined) {
  const text = (description || '').trim()
  const guestMatch = text.match(/\bup to\s+(\d+)\s+guests\b/i)
  const guests = guestMatch ? Number(guestMatch[1]) : 0
  const heading = /(?:Your package includes:\s*|The package includes\s+|\bIncludes\s+|\bfeaturing\s+)/i.exec(text)
  let items: string[] = []

  if (heading) {
    const remaining = text.slice(heading.index + heading[0].length)
    const included = remaining.split(/\n\s*Please Note:|\n\s*Not Included:|\n\s*Travel\/delivery fees/i)[0]
    if (/Your package includes:/i.test(heading[0])) {
      items = included.split(/\n+/).map(line => line.trim()).filter(Boolean)
    } else {
      const sentence = included.split(/\.\s|\n\s*\n/)[0].replace(/\.$/, '')
      items = sentence.split(/,\s*(?:and\s+)?|\s+and\s+(?=setup\s*&\s*breakdown|professional setup)/i)
        .map(item => item.trim()).filter(Boolean)
    }
  }

  if (items.length && !items.some(item => /setup\s*(?:&|and)\s*breakdown/i.test(item)) && /professional setup and breakdown[^.]*included/i.test(text)) {
    items.push('Professional setup and breakdown of included rental equipment')
  }

  return { guests, items }
}
