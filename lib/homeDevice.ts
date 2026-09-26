export type HomeDevice = 'mobile' | 'desktop'

export function initialHomeDevice(userAgent: string | null): HomeDevice {
  return /iPhone|iPod|Android.*Mobile|Windows Phone|IEMobile|Opera Mini/i.test(userAgent || '') ? 'mobile' : 'desktop'
}
