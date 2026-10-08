import { fulfillmentJob, JOB_COLORS, type FulfillmentOrder } from '@/lib/fulfillment'

export function FulfillmentBadge({ order, day }: { order: FulfillmentOrder; day: string }) {
  const job = fulfillmentJob(order, day)
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span
        className="rounded border px-2 py-1"
        style={{ borderColor: job.border, background: job.background, color: job.text }}
      >
        {job.label}
      </span>
      {job.noDeliveryCharge && (
        <span className="rounded border border-red-200 bg-red-50 px-2 py-1 text-red-800">
          No delivery charge · Riverdale counter
        </span>
      )}
    </div>
  )
}

export function FulfillmentLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs" aria-label="Job color key">
      {([
        ['delivery', 'Delivery / drop-off'],
        ['collection', 'Pickup from event'],
        ['riverdale', 'Customer pickup / return — Riverdale'],
      ] as const).map(([kind, label]) => (
        <span key={kind} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-3 w-3 rounded-sm border-2"
            style={{ borderColor: JOB_COLORS[kind].border, background: JOB_COLORS[kind].background }}
          />
          {label}
        </span>
      ))}
    </div>
  )
}
