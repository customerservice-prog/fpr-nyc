export function deliveryZipFromInput(value: string): string | null {
 const match=value.trim().match(/(?:^|[,\s])(\d{5})(?:-\d{4})?(?:\s*,?\s*(?:USA|United States))?\s*$/i)
 return match?.[1] || null
}
