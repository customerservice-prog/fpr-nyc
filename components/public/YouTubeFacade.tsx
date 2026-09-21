'use client'

import { useEffect, useState } from 'react'

interface YouTubeFacadeProps { videoId: string; title: string; className?: string }
const BRAND_VIDEO = 'LWQvMclQea4'
const LOCAL_COVER = '/images/sc-event-reception.jpg'

export default function YouTubeFacade({ videoId, title, className = '' }: YouTubeFacadeProps) {
  const id = /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : BRAND_VIDEO
  const [loaded, setLoaded] = useState(false)
  const [poster, setPoster] = useState<'maxresdefault' | 'hqdefault' | 'local'>('maxresdefault')
  useEffect(() => { setLoaded(false); setPoster('maxresdefault') }, [id])
  const branded = id === BRAND_VIDEO
  const local = branded || poster === 'local'
  const baseClass = ('w-full h-full ' + className).trim()
  const nextPoster = () => setPoster(value => value === 'maxresdefault' ? 'hqdefault' : 'local')

  if (loaded) return <iframe
    src={'https://www.youtube.com/embed/' + id + '?autoplay=1'}
    title={title}
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowFullScreen className={baseClass}
  />

  return <button type="button" onClick={() => setLoaded(true)}
    aria-label={'Play video: ' + title}
    data-sc-video-cover={branded ? '20260921' : undefined}
    className={'relative block group cursor-pointer overflow-hidden focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-amber-400 ' + baseClass}>
    <img src={local ? LOCAL_COVER : `https://i.ytimg.com/vi/${id}/${poster}.jpg`}
      alt={branded ? 'Friendly Party Rental South Carolina video cover' : title}
      onError={local ? undefined : nextPoster}
      onLoad={local ? undefined : event => { if (event.currentTarget.naturalWidth < 320) nextPoster() }}
      className="absolute inset-0 w-full h-full object-cover" loading="lazy" decoding="async" />
    <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" aria-hidden="true" />
    {branded && <>
      <span className="absolute top-3 left-3 w-[34%] max-w-56 overflow-hidden rounded-lg bg-white p-1 shadow-md" aria-hidden="true">
        <img src="/images/logo.png" alt="" width="1706" height="896" className="block h-auto w-full" loading="lazy" />
      </span>
      <span className="absolute inset-x-3 bottom-3 text-center text-[10px] font-bold uppercase tracking-widest text-white sm:bottom-5 sm:text-sm" aria-hidden="true">Friendly Party Rental · South Carolina</span>
    </>}
    <span className="absolute inset-0 flex items-center justify-center group-hover:bg-black/10 transition-colors" aria-hidden="true">
      <span className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 shadow-lg group-hover:scale-110 transition-transform">
        <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 sm:w-7 sm:h-7 ml-1"><path d="M8 5v14l11-7z" /></svg>
      </span>
    </span>
  </button>
}
