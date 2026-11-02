// Order dates are stored as UTC calendar dates. Choose the target calendar day
// using New York's date, then query the entire matching stored UTC day.
export function balanceReminderWindow(now: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (name: string) => parts.find((p) => p.type === name)!.value
  const start = new Date(Date.UTC(Number(part('year')), Number(part('month')) - 1, Number(part('day')) + 3))
  return { start, end: new Date(start.getTime() + 86_400_000) }
}

type ReminderOrder = {
  status: string
  followUpsPaused: boolean
  totalAmount: number
  amountPaid: number
  balanceReminderSentAt: Date | null
}

export function isBalanceReminderEligible(order: ReminderOrder, bookingAllowed: boolean) {
  return order.status === 'active' && !order.followUpsPaused && !order.balanceReminderSentAt &&
    (bookingAllowed || order.amountPaid > 0) && order.totalAmount - order.amountPaid > 0
}
