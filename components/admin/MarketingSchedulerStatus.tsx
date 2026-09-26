import Link from 'next/link'
import { getSchedulerRun, schedulerHealth } from '@/lib/marketing/scheduler'

export default async function MarketingSchedulerStatus() {
  const run = await getSchedulerRun()
  const health = schedulerHealth(run, !!(process.env.MARKETING_CRON_SECRET || process.env.CRON_SECRET))
  const healthy = health.startsWith('Running')
  const modeLabel = run?.automationMode === 'automatic' ? 'Automatic sending activated' : run?.automationMode === 'paused' ? 'Automatic marketing paused' : 'Review before sending'
  return <section aria-label="Scheduler status" className={`rounded-xl border p-5 ${healthy ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
    <h3 className="font-bold">Automatic marketing checks</h3>
    <p className="mt-2 font-medium">{health}</p>
    <p className="mt-2 text-sm">Checks campaign rules and scheduled reviews every five minutes. Review mode prepares drafts; automatic sending begins only after an administrator activates the selected campaigns.</p>
    <dl className="mt-3 space-y-1 text-sm">
      <div><dt className="inline font-medium">Mode at last check: </dt><dd className="inline">{modeLabel}</dd></div>
      <div><dt className="inline font-medium">Last check: </dt><dd className="inline">{run ? `${new Date(run.completedAt).toLocaleString('en-US', { timeZone: 'America/New_York' })} ET` : 'No check recorded yet'}</dd></div>
      {run && <div><dt className="inline font-medium">Last result: </dt><dd className="inline">{run.reviewsReady} reviews ready · {run.draftsPrepared} drafts prepared · {run.emailsSent} emails sent · {run.recipientsSuppressed ?? 0} recipients skipped · {run.errors} errors</dd></div>}
    </dl>
    {run?.blockedReason && <p className="mt-3 text-sm font-medium">{run.blockedReason}</p>}
    <div className="mt-3 flex flex-wrap gap-4 text-sm">
      <Link className="underline" href="/admin/marketing/automations">Manage automatic marketing →</Link>
      <Link className="underline" href="/admin/marketing/history">Review sending history →</Link>
    </div>
  </section>
}
