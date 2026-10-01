// Admin screens need to know whether login is configured, not the credential.
export function driverForAdmin<T extends { pin: string | null }>(driver: T) {
  const { pin, ...profile } = driver
  return { ...profile, hasPin: !!pin }
}
