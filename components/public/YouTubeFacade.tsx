'use client'

import { useState } from 'react'

interface YouTubeFacadeProps {
  videoId: string
  title: string
  className?: string
}

export default function YouTubeFacade({ videoId, title, className = '' }: YouTubeFacadeProps) {
  const [loaded, setLoaded] = useState(false)
  const baseClass = ('w-full h-full ' + className).trim()

  if (loaded) {
    return (
      <iframe
        src={'https://www.youtube.com/embed/' + videoId + '?autoplay=1'}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className={baseClass}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      aria-label={'Play video: ' + title}
      data-exact-ny-thumbnail="20260921"
      className={'relative block group cursor-pointer overflow-hidden ' + baseClass}
    >
      <img
        src="/images/youtube-video-thumbnail.jpg"
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
      />
      <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <span className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 shadow-lg group-hover:scale-110 transition-transform">
          <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 sm:w-7 sm:h-7 ml-1" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </span>
    </button>
  )
}
