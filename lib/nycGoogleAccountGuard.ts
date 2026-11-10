// Pure NYC account-isolation guard shared by Calendar and Search Console reads.
// This protects against older, imported or incorrectly persisted OAuth records.
export function assertNycGoogleAccountEmail(
  connectedEmail: string | null | undefined,
  expectedEmail: string,
): void {
  const actual = String(connectedEmail || '').trim().toLowerCase()
  const expected = String(expectedEmail || '').trim().toLowerCase()
  if (!actual || !expected || actual !== expected) {
    throw new Error('The connected Google account does not match the NYC business account. Reconnect the dedicated NYC Google account before using Calendar or Search Console.')
  }
}
