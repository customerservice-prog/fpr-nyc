'use client'

import { useRef, useState } from 'react'

export default function HomeVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [hasStarted, setHasStarted] = useState(false)

  return (
    <div className="relative h-full w-full">
    <video
      ref={videoRef}
      aria-label="Friendly Party Rental NYC: how to plan and book your Riverdale event"
      controls
      playsInline
      preload="metadata"
      poster="/videos/riverdale-website-guide-thumbnail-v2.jpg"
      width={1920}
      height={1080}
      className="block h-full w-full object-contain"
      onPlay={() => setHasStarted(true)}
    >
      <source src="/videos/riverdale-website-guide-v1.mp4" type="video/mp4" />
      <track kind="captions" src="/videos/riverdale-website-guide-v1.vtt" srcLang="en" label="English" />
      <a href="/videos/riverdale-website-guide-v1.mp4">Watch the Riverdale event guide</a>
    </video>
    {!hasStarted && <button
      type="button"
      aria-label="Play Riverdale rental guide"
      onClick={() => { videoRef.current?.play().catch(() => {}) }}
      className="absolute left-[75%] top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 bg-[#F4C542] text-[#0B1F3A] shadow-[0_8px_30px_rgba(0,0,0,0.5)] transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-white sm:h-20 sm:w-20"
    >
      <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 sm:h-10 sm:w-10" aria-hidden="true" focusable="false"><path fill="currentColor" d="M8 4v16l12-8z" /></svg>
    </button>}
    </div>
  )
}
