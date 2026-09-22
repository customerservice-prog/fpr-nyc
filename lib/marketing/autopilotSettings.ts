import { createHash } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { AUTO_CAMPAIGN_SLUGS, AUTO_SCHEDULE_CONFIG } from '@/lib/marketing/planner'
import { CAMPAIGN_LIBRARY } from '@/lib/marketing/campaignLibrary'

export type AutopilotMode = 'review' | 'automatic' | 'paused'
export type AutopilotConfig = {
  mode: AutopilotMode
  enabledCampaigns: string[]
  dailyLimit: number
  batchSize: number
  approvedAt: string | null
  approvedBy: string | null
  approvalFingerprint: string | null
  domainAuthenticationConfirmed: boolean
  feedbackMonitoringConfirmed: boolean
  audiencePermissionConfirmed: boolean
  pauseReason: string | null
}
export const AUTOPILOT_SETTING = { category: 'marketing_autopilot', key: 'configuration' }
export const DEFAULT_AUTOPILOT: AutopilotConfig = {
  mode: 'review', enabledCampaigns: [...AUTO_CAMPAIGN_SLUGS], dailyLimit: 50, batchSize: 10,
  approvedAt: null, approvedBy: null, approvalFingerprint: null,
  domainAuthenticationConfirmed: false, feedbackMonitoringConfirmed: false, audiencePermissionConfirmed: false, pauseReason: null,
}

export function parseAutopilotConfig(raw?: string | null): AutopilotConfig {
  const fallback = { ...DEFAULT_AUTOPILOT, enabledCampaigns: [...DEFAULT_AUTOPILOT.enabledCampaigns] }
  if (!raw) return fallback
  try {
    const value = JSON.parse(raw)
    if (!value || typeof value !== 'object' || !['review','automatic','paused'].includes(value.mode)
      || !Array.isArray(value.enabledCampaigns) || value.enabledCampaigns.some((s: unknown) => typeof s !== 'string' || !(AUTO_CAMPAIGN_SLUGS as readonly string[]).includes(s))
      || !Number.isInteger(value.dailyLimit) || value.dailyLimit < 1 || value.dailyLimit > 300
      || !Number.isInteger(value.batchSize) || value.batchSize < 1 || value.batchSize > 50) return { ...fallback, enabledCampaigns: [], pauseReason: 'Saved configuration needs review.' }
    return {
      ...fallback, mode: value.mode, enabledCampaigns: [...new Set<string>(value.enabledCampaigns)], dailyLimit: value.dailyLimit, batchSize: value.batchSize,
      approvedAt: typeof value.approvedAt === 'string' && Number.isFinite(Date.parse(value.approvedAt)) ? value.approvedAt : null,
      approvedBy: typeof value.approvedBy === 'string' ? value.approvedBy : null,
      approvalFingerprint: typeof value.approvalFingerprint === 'string' ? value.approvalFingerprint : null,
      domainAuthenticationConfirmed: value.domainAuthenticationConfirmed === true,
      feedbackMonitoringConfirmed: value.feedbackMonitoringConfirmed === true,
      audiencePermissionConfirmed: value.audiencePermissionConfirmed === true,
      pauseReason: typeof value.pauseReason === 'string' ? value.pauseReason : null,
    }
  } catch { return { ...fallback, enabledCampaigns: [], pauseReason: 'Saved configuration needs review.' } }
}

export function approvalFingerprint(config: AutopilotConfig, senderDomain: string | null) {
  return createHash('sha256').update(JSON.stringify({
    policy: 'targeted-autopilot-v3-fair-daily-paced-feedback', dailyLimit: config.dailyLimit, batchSize: config.batchSize, senderDomain,
    schedules: AUTO_SCHEDULE_CONFIG,
    campaigns: [...config.enabledCampaigns].sort().map(slug => CAMPAIGN_LIBRARY.find(c => c.slug === slug)),
    limits: { weekly: 1, monthly: 3, timeZone: 'America/New_York', weekdays: false, startHour: 9, endHour: 17 },
  })).digest('hex')
}

export function hasCurrentApproval(config: AutopilotConfig, senderDomain: string | null) {
  return config.mode === 'automatic' && !!config.approvedAt && !!config.approvedBy
    && config.domainAuthenticationConfirmed && config.feedbackMonitoringConfirmed && config.audiencePermissionConfirmed
    && config.approvalFingerprint === approvalFingerprint(config, senderDomain)
}

export async function getAutopilotConfig(): Promise<AutopilotConfig> {
  const row = await prisma.systemSetting.findUnique({ where: { category_key: AUTOPILOT_SETTING } })
  return parseAutopilotConfig(row?.value)
}

export async function updateAutopilotConfig(change: (current: AutopilotConfig) => AutopilotConfig) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext('marketing-autopilot-configuration'))`
    const row = await tx.systemSetting.findUnique({ where: { category_key: AUTOPILOT_SETTING } })
    const next = change(parseAutopilotConfig(row?.value))
    await tx.systemSetting.upsert({ where: { category_key: AUTOPILOT_SETTING }, create: { ...AUTOPILOT_SETTING, value: JSON.stringify(next) }, update: { value: JSON.stringify(next) } })
    return next
  })
}

export function revokeApproval(config: AutopilotConfig, mode: AutopilotMode = 'review'): AutopilotConfig {
  return { ...config, mode, approvedAt: null, approvedBy: null, approvalFingerprint: null,
    domainAuthenticationConfirmed: false, feedbackMonitoringConfirmed: false, audiencePermissionConfirmed: false, pauseReason: null }
}

