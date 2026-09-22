export function csvCell(value: unknown) {
  const text = String(value ?? '')
  return '"' + (/^[=+\-@\t\r\n]/.test(text) ? "'" : '') + text.replace(/"/g, '""') + '"'
}
export function marketingTrend(sends: { sentAt: Date; openCount: number; clickCount: number }[], start: Date, end: Date) {
  const buckets = new Map<string, { date: string; sent: number; opened: number; clicked: number }>()
  for (let ms = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()); ms <= end.getTime(); ms += 86400000) {
    const date = new Date(ms).toISOString().slice(0, 10); buckets.set(date, { date, sent: 0, opened: 0, clicked: 0 })
  }
  for (const send of sends) {
    const row = buckets.get(send.sentAt.toISOString().slice(0, 10)); if (!row) continue
    row.sent++; if (send.openCount > 0) row.opened++; if (send.clickCount > 0) row.clicked++
  }
  return [...buckets.values()]
}
