// Business rule added 8/26/2026 after an incident where a 30x45 Pole Tent
// order had a blank Setup Surface on file and the crew arrived to find a
// concrete pad - pole tents must be staked into the ground and cannot be
// installed on concrete/asphalt. Frame tents are weighted (no stakes), so
// they don't have this restriction and are fine on concrete or grass.
export interface SurfaceCheckItem {
  itemName: string
}

export function findPoleTentSurfaceIssue(
  items: SurfaceCheckItem[],
  setupSurface: string | null | undefined
  ): string | null {
  const hasPoleTent = items.some((i) => /pole tent/i.test(i.itemName))
  if (!hasPoleTent) return null

const surface = (setupSurface || '').trim().toLowerCase()
  if (surface === 'grass') return null

const surfaceLabel = setupSurface && setupSurface.trim() ? `"${setupSurface}"` : 'not set'
  return `This order includes a Pole Tent. Pole tents must be staked into the ground and can only be set up on Grass. Setup Surface is currently ${surfaceLabel}. If the site is concrete/asphalt, this needs to be a Frame Tent instead - pole tents cannot be installed there.`
}
