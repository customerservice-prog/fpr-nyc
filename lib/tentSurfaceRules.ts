// Business rule added 8/26/2026 after an incident where a 30x45 Pole Tent
// order had a blank Setup Surface on file and the crew arrived to find a
// concrete pad - pole tents must be staked into the ground and cannot be
// installed on concrete/asphalt.
//
// Business rule added 8/27/2026: Frame tents are weighted (no stakes) and
// are reserved for concrete/hard-surface setups only - grass sites should
// use a Pole Tent instead. This mirrors the Pole Tent -> Grass rule below
// so the two tent types are never scheduled on the wrong surface.
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

export function findFrameTentSurfaceIssue(
items: SurfaceCheckItem[],
setupSurface: string | null | undefined
): string | null {
const hasFrameTent = items.some((i) => /frame tent/i.test(i.itemName))
if (!hasFrameTent) return null

const surface = (setupSurface || '').trim().toLowerCase()
if (surface === 'concrete') return null

const surfaceLabel = setupSurface && setupSurface.trim() ? `"${setupSurface}"` : 'not set'
return `This order includes a Frame Tent. Frame tents can only be set up on Concrete. Setup Surface is currently ${surfaceLabel}. If the site is grass, this needs to be a Pole Tent instead - frame tents cannot be installed there.`
}
