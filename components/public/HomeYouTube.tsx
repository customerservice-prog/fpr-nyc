import Link from 'next/link'
import YouTubeFacade from './YouTubeFacade'
import ComicBookBackground from './ComicBookBackground'
export default function HomeYouTube() {
 return <section data-home-section="youtube" aria-label="Friendly Party Rental on YouTube"><ComicBookBackground className="px-5 py-10 md:py-14">
 <div className="mx-auto max-w-3xl text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-white drop-shadow">As Seen In Action</p><h2 className="mb-7 mt-2 text-2xl font-bold text-white drop-shadow-md md:text-4xl">Watch Us on YouTube</h2>
 <div className="rounded-3xl bg-gradient-to-br from-amber-300 via-yellow-100 to-amber-600 p-1.5 shadow-2xl"><div className="rounded-2xl bg-white p-1.5"><div className="aspect-video overflow-hidden rounded-xl bg-black"><YouTubeFacade videoId="LWQvMclQea4" title="Friendly Party Rental YouTube"/></div></div></div>
 <p className="mt-5 text-sm font-medium text-white drop-shadow">See the Friendly Party Rental brand in action.</p><Link href="/order-by-date" prefetch={false} className="btn-gold mt-5 inline-block">Book Your Rentals Online</Link></div>
 </ComicBookBackground></section>
}
