/**
 * Deep UTF-8 sanitizer.
 *
 * Some legacy rows contain byte sequences that are not valid UTF-8 (for
 * example data recovered from a Railway deployment). Passing such strings to
 * NextResponse.json() / JSON.stringify can throw or produce invalid output,
 * which surfaces as a 500 on read endpoints. This helper walks any value and
 * rewrites strings so they are guaranteed to be valid, serializable UTF-8.
 * It never mutates its input and never touches the database.
 */

function cleanString(value: string): string {
  // Replace lone surrogates that break JSON serialization.
  let out = value.replace(/[\uD800-\uDFFF]/g, '\uFFFD')
  // Round-trip through TextEncoder/TextDecoder so any remaining invalid byte
  // sequences are replaced with the Unicode replacement character.
  try {
    const bytes = new TextEncoder().encode(out)
    out = new TextDecoder('utf-8', { fatal: false }).decode(bytes)
  } catch {
    // Fall back to the surrogate-stripped value if encoding fails.
  }
  return out
}

export function sanitizeUtf8<T>(value: T): T {
  if (typeof value === 'string') {
    return cleanString(value) as unknown as T
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeUtf8(v)) as unknown as T
  }
  if (value && typeof value === 'object') {
    if (value instanceof Date) return value
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value as Record<string, unknown>)) {
      out[key] = sanitizeUtf8((value as Record<string, unknown>)[key])
    }
    return out as unknown as T
  }
  return value
}

export default sanitizeUtf8
