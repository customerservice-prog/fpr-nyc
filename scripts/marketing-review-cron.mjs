import { pathToFileURL } from 'node:url'

// Only these aggregate fields are logged; provider responses and contacts never are.
export function validateSchedulerResult(result) {
  const counts = ['reviewsReady', 'draftsPrepared', 'errors', 'emailsSent']
  const optionalCounts = ['recipientsSuppressed', 'eligibleContacts', 'dueRecipients', 'customerRecords']
  if (!result || typeof result !== 'object' || result.status !== 'success' ||
      result.errors !== 0 || typeof result.completedAt !== 'string' ||
      !Number.isFinite(Date.parse(result.completedAt)) ||
      !counts.every(key => Number.isSafeInteger(result[key]) && result[key] >= 0) ||
      (result.automationMode !== undefined && !['review', 'automatic', 'paused'].includes(result.automationMode)) ||
      (result.emailsSent > 0 && result.automationMode !== 'automatic') ||
      (result.readinessReady !== undefined && typeof result.readinessReady !== 'boolean') ||
      !optionalCounts.every(key => result[key] === undefined || (Number.isSafeInteger(result[key]) && result[key] >= 0))) {
    throw new Error('Unexpected marketing scheduler result')
  }
  return {
    event: 'marketing_scheduler_check', status: result.status,
    completedAt: result.completedAt, reviewsReady: result.reviewsReady,
    draftsPrepared: result.draftsPrepared, errors: result.errors, emailsSent: result.emailsSent,
    ...(result.automationMode !== undefined ? { automationMode: result.automationMode } : {}),
    ...Object.fromEntries(optionalCounts.filter(key => result[key] !== undefined).map(key => [key, result[key]])),
    ...(result.readinessReady !== undefined ? { readinessReady: result.readinessReady } : {}),
  }
}

// A short-lived Railway cron process. It asks the website to check its recorded rules.
export async function runSchedulerCheck({
  secret = process.env.MARKETING_CRON_SECRET,
  origin = process.env.MARKETING_SITE_ORIGIN,
  fetcher = fetch,
} = {}) {
  if (!secret || !origin) throw new Error('Marketing scheduler configuration is missing or invalid')
  let site
  try { site = new URL(origin) } catch { throw new Error('Marketing scheduler configuration is missing or invalid') }
  if (site.protocol !== 'https:' || site.username || site.password) throw new Error('Marketing scheduler configuration is missing or invalid')
  const response = await fetcher(new URL('/api/cron/marketing-scheduled-send', site), {
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(90000), redirect: 'error',
  })
  if (!response.ok) throw new Error(`Marketing scheduler check returned HTTP ${response.status}`)
  return validateSchedulerResult(await response.json())
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSchedulerCheck().then(result => {
    console.log(JSON.stringify(result))
  }).catch(error => {
    // Fetch exceptions can include request details. Keep output to known error strings.
    const message = error instanceof Error && /^(Marketing scheduler|Unexpected marketing scheduler)/.test(error.message)
      ? error.message : 'Marketing scheduler check failed'
    console.error(message)
    process.exitCode = 1
  })
}
