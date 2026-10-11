interface PlaybackOptions {
  lazy: boolean
  autoPlay: boolean
  source: string
  onReady: () => void
}

/** Keep the film in sync with visibility without resetting its source on every scroll. */
export function attachEventDesignPlayback(player: HTMLVideoElement, { lazy, autoPlay, source, onReady }: PlaybackOptions) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const connection = (navigator as Navigator & { connection?: EventTarget & { saveData?: boolean } }).connection
  let visible = !lazy
  let ready = !lazy
  let userPaused = false
  let automaticPause = false
  let disposed = false

  const canAutoplay = () => autoPlay && visible && !document.hidden && !motion.matches && !connection?.saveData && !userPaused
  const pauseAutomatically = () => {
    if (player.paused) return
    automaticPause = true
    player.pause()
  }
  const start = () => {
    if (disposed || !ready || !canAutoplay() || !player.paused) return
    // Set the DOM properties as well as the JSX attributes before asking Safari to play.
    player.defaultMuted = true
    player.muted = true
    player.playsInline = true
    // canplay/loadeddata and viewport re-entry retry an interrupted initial request.
    // Browser autoplay restrictions still leave the native Play control available.
    void player.play().catch(() => {})
  }
  const sync = () => {
    player.autoplay = canAutoplay()
    player.loop = !motion.matches
    if (!visible || document.hidden || motion.matches || connection?.saveData) pauseAutomatically()
    else start()
  }
  const onPause = () => {
    if (automaticPause) { automaticPause = false; return }
    // Native Pause should stay paused, even if more media subsequently buffers.
    if (visible && !document.hidden && !player.ended) {
      userPaused = true
      player.autoplay = false
    }
  }
  const onPlay = () => { userPaused = false }

  player.addEventListener('loadeddata', start)
  player.addEventListener('canplay', start)
  player.addEventListener('pause', onPause)
  player.addEventListener('play', onPlay)
  document.addEventListener('visibilitychange', sync)
  window.addEventListener('pageshow', sync)
  motion.addEventListener('change', sync)
  connection?.addEventListener('change', sync)

  const reveal = () => {
    if (ready) return
    ready = true
    player.defaultMuted = true
    player.muted = true
    player.playsInline = true
    player.autoplay = canAutoplay()
    player.preload = 'metadata'
    // Assigning src starts source selection. Calling load() again would cancel play().
    player.src = source
    onReady()
  }

  let observer: IntersectionObserver | undefined
  if (lazy && 'IntersectionObserver' in window) {
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio >= .15
      if (visible) reveal()
      sync()
    }, { threshold: [0, .15] })
    observer.observe(player)
  } else {
    visible = true
    if (lazy) reveal()
    sync()
  }

  return () => {
    disposed = true
    observer?.disconnect()
    player.removeEventListener('loadeddata', start)
    player.removeEventListener('canplay', start)
    player.removeEventListener('pause', onPause)
    player.removeEventListener('play', onPlay)
    document.removeEventListener('visibilitychange', sync)
    window.removeEventListener('pageshow', sync)
    motion.removeEventListener('change', sync)
    connection?.removeEventListener('change', sync)
  }
}

