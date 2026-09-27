export function effectiveEventEndDate(
  eventDate: Date | string,
  eventEndDate?: Date | string | null,
  rentalDays?: number | null,
) {
  if (eventEndDate) return new Date(eventEndDate)
  const start = new Date(eventDate)
  const days = Math.max(Math.floor(Number(rentalDays) || 1), 1)
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + days - 1)
  return end
}
