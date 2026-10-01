export const STAFF_ACTIVITY_STORAGE_KEY = 'fpr.staff.lastActivity.v1'
export const STAFF_LOGOUT_STORAGE_KEY = 'fpr.staff.logout.v1'
export const STAFF_IDLE_TIMEOUT_MS = 15 * 60 * 1000
export const STAFF_IDLE_WARNING_MS = 2 * 60 * 1000
export const STAFF_ABSOLUTE_SESSION_SECONDS = 8 * 60 * 60

export function recordStaffActivity(now = Date.now()) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STAFF_ACTIVITY_STORAGE_KEY, String(now))
}
