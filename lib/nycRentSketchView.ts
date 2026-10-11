/** Check a temporary graphics context before selecting the planner view. */
export function nycRentSketchLaunchView(requested: '2d' | '3d'): '2d' | '3d' {
  if (requested === '2d') return '2d'
  if (typeof document === 'undefined') return '2d'
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!context) return '2d'
    const available = typeof context.isContextLost !== 'function' || !context.isContextLost()
    try {
      context.getExtension('WEBGL_lose_context')?.loseContext()
    } catch {
      // Optional cleanup must not reject a supported graphics context.
    }
    return available ? '3d' : '2d'
  } catch {
    return '2d'
  }
}
