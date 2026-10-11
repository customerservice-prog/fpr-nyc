'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { Play, Layers3, Armchair, MoonStar, PartyPopper, Send, ArrowRight } from 'lucide-react'
import styles from '@/app/(public)/design-your-event/design.module.css'
import { attachEventDesignPlayback } from './eventDesignPlayback'
import { trackEvent } from '@/lib/gtag'
import Link from 'next/link'

const filmSource = '/videos/event-design-walkthrough-v2.mp4'
const DEMO_SECONDS = 32

const chapters = [
  { time: 0, title: 'Build a layout', icon: Play },
  { time: 6, title: 'Explore in 3D', icon: Layers3 },
  { time: 12, title: 'Style a table', icon: Armchair },
  { time: 18, title: 'Day to night', icon: MoonStar },
  { time: 24, title: 'Outdoor fun', icon: PartyPopper },
  { time: 28, title: 'Review & Quote', icon: Send },
]

export default function EventDesignVideo({
  lazy = false,
  autoPlay = true,
  homeFeature = false,
  className = '',
}: {
  lazy?: boolean
  autoPlay?: boolean
  homeFeature?: boolean
  className?: string
}) {
  const video = useRef<HTMLVideoElement>(null)
  const startedTracked = useRef(false)
  const completedTracked = useRef(false)
  const descriptionId = useId()
  const [ready, setReady] = useState(!lazy)
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState(false)
  const [completed, setCompleted] = useState(false)
  const source = lazy ? 'nyc_homepage' : 'nyc_design_your_event'

  useEffect(() => {
    const player = video.current
    if (!player) return
    return attachEventDesignPlayback(player, { lazy, autoPlay, source: filmSource, onReady: () => setReady(true) })
  }, [lazy, autoPlay])

  function trackStarted() {
    if (startedTracked.current) return
    startedTracked.current = true
    trackEvent('rentsketch_demo_started', { source, duration_seconds: DEMO_SECONDS })
  }

  function trackCompleted() {
    if (completedTracked.current) return
    completedTracked.current = true
    setCompleted(true)
    trackEvent('rentsketch_demo_completed', { source, duration_seconds: DEMO_SECONDS })
  }

  function seekTo(time: number) {
    const player = video.current
    if (!player || failed || !ready) return
    player.currentTime = time
    trackEvent('rentsketch_demo_chapter', { source, chapter_seconds: time })
    void player.play().catch(() => {})
  }

  function trackAction(action: 'layout_help' | 'check_date') {
    trackEvent('rentsketch_demo_cta_click', { source, action })
  }

  return <div className={`${styles.filmShell} ${className}`} data-rentsketch-demo data-home-feature={homeFeature ? 'true' : undefined}>
    <div className={styles.filmHeading}>
      <span><span className={styles.filmDot} /> {homeFeature ? 'RentSketch — see the designer in action' : 'See the full RentSketch idea in 32 seconds'}</span>
      <span>{homeFeature ? '32-second demo · fullscreen available' : 'Quick demo · 1440p'}</span>
    </div>
    <video
      ref={video}
      className={styles.film}
      controls
      muted
      playsInline
      preload={ready ? 'metadata' : 'none'}
      // The homepage instance is well below the fold. Do not download the
      // ~500 KB poster until IntersectionObserver has actually revealed the film.
      poster={ready ? '/videos/event-design-walkthrough-v2.jpg' : undefined}
      aria-label="32-second animated overview of RentSketch event planning features"
      aria-describedby={descriptionId}
      onError={() => setFailed(true)}
      onPlay={trackStarted}
      onEnded={trackCompleted}
      onTimeUpdate={() => {
        const player = video.current
        const time = player?.currentTime ?? 0
        setActive(chapters.reduce((index, chapter, next) => time >= chapter.time ? next : index, 0))
        const duration = player?.duration
        if (time >= DEMO_SECONDS - .6 || (duration && Number.isFinite(duration) && time >= duration - .6)) trackCompleted()
      }}
    >
      {!lazy && <source src={filmSource} type="video/mp4" />}
      Your browser does not support this video. <a href="/videos/event-design-walkthrough-v2.mp4">Open the animated walkthrough.</a>
    </video>
    {failed && <p className={styles.filmError} role="status">The demo could not load in this player. <a href="/videos/event-design-walkthrough-v2.mp4">Open the 32-second video directly</a>.</p>}
    <div className={styles.filmChapters} role="group" aria-label="Jump to a video chapter">
      {chapters.map(({ time, title, icon: Icon }, index) => <button key={time} type="button" aria-pressed={active === index} disabled={failed || !ready} onClick={() => seekTo(time)}><Icon size={17} aria-hidden="true" /><span>{title}</span></button>)}
    </div>

    {homeFeature ? <div data-home-film-footer id={descriptionId}>
      <p>Explore RentSketch’s layout and atmosphere previews. Our Riverdale team confirms the equipment and setup for your NYC event.</p>
      <a href="/design-your-event#quick-demo">Explore everything RentSketch can do <ArrowRight size={16} aria-hidden="true" /></a>
    </div> : <>
      <div className={styles.demoConversion} data-demo-complete={completed ? 'true' : 'false'}>
        <div className={styles.demoConversionCopy}>
          <p className={styles.demoEyebrow}>{completed ? 'You just saw RentSketch in action' : 'This is the quick look. The full designer is hands-on.'}</p>
          <h3>Picture your Riverdale celebration.</h3>
          <p>See how seating, tables and a tent work together in the demonstration. Share your date, guest count and space with our Riverdale team to plan the real rental setup.</p>
          <div className={styles.demoProof}>
            <span>✓ Riverdale, Bronx & Lower Westchester</span>
            <span>✓ Rental layout help from our team</span>
            <span>✓ Equipment and availability confirmed separately</span>
          </div>
        </div>
        <div className={styles.demoConversionActions}>
          <Link href="/contact_us" onClick={() => trackAction('layout_help')} className={styles.demoPassButton}>Get Riverdale Layout Help <ArrowRight size={17} aria-hidden="true" /></Link>
          <Link href="/order-by-date" onClick={() => trackAction('check_date')} className={styles.demoIncludedButton}>Check My Event Date</Link>
          <p>Our Riverdale team confirms your rental list, site requirements and delivery. A visual preview does not reserve equipment.</p>
        </div>
      </div>

      <div className={styles.filmDescription} id={descriptionId}><p>An animated demonstration of RentSketch models, not a recording of a NYC order or an availability guarantee.</p><details><summary>Read the video description</summary><p>Four 5-foot round tables with eight white resin chairs each form a layout. The complete 20×20 pole-tent model appears, and the camera moves toward the interior. A table close-up shows gold Chiavari chairs, selected plates, flatware, glasses and napkins, and a 120-inch linen changing from Ivory to Sage Green. The same tent scene changes from day to night with bistro lighting. The Crayon Bounce House and Tidal Wave Water Slide models appear without a tent. Review & Quote appears as part of the demonstrated workflow. Contact our Riverdale team to confirm the options for your NYC event. This silent film uses current RentSketch geometry with offline lighting and animation; it is not a screen recording. Inflatable dimensions remain illustrative until confirmed by our team.</p></details></div>
    </>}
  </div>
}
