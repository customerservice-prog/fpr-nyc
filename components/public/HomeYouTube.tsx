import Link from 'next/link'
import { Playfair_Display } from 'next/font/google'
import YouTubeFacade from './YouTubeFacade'
import ComicBookBackground from './ComicBookBackground'
const playfair=Playfair_Display({subsets:['latin'],weight:['600','700'],style:['italic','normal'],display:'swap'})
// Separate original desktop and mobile treatments; no substituted cover or mobile frame.
export default function HomeYouTube({desktop=false}:{desktop?:boolean}){
 if(!desktop)return <section data-home-section="youtube" className="bg-[#0B1F3A] py-10 text-white"><div className="home-wrap"><p className="text-xs uppercase tracking-widest text-[#F4C542]">As Seen In Action</p><h2 className="home-heading">Watch Us on YouTube</h2><div className="mt-6 aspect-video overflow-hidden rounded-2xl bg-black"><YouTubeFacade videoId="LWQvMclQea4" title="Watch Us on YouTube"/></div></div></section>
 return <div data-home-section="youtube"><ComicBookBackground className="py-14">
  <div className="mx-auto max-w-4xl px-6 text-center">
   <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#EEC400]">As Seen In Action</p>
   <h2 className={`${playfair.className} mb-8 text-4xl font-bold text-white drop-shadow-md`}>Watch Us on YouTube</h2>
   <div className="relative mx-auto mb-8 max-w-3xl">
    <div className="absolute -inset-6 rounded-[2rem] opacity-70 blur-2xl" style={{background:'linear-gradient(135deg, #EEC400, #E07B00, #EEC400)'}} aria-hidden="true"/>
    <div className="absolute -inset-1.5 rounded-[1.75rem]" style={{background:'linear-gradient(135deg, #EEC400, #FFF7DC, #E07B00, #FFF7DC, #EEC400)'}} aria-hidden="true"/>
    <div className="relative rounded-3xl p-[6px] shadow-2xl" style={{background:'linear-gradient(135deg, #EEC400, #E07B00, #EEC400)'}}>
     <div className="rounded-[22px] bg-[#FFFDF7] p-2"><div className="aspect-video overflow-hidden rounded-2xl bg-black ring-1 ring-black/10"><YouTubeFacade videoId="LWQvMclQea4" title="Watch Us on YouTube"/></div></div>
     {['-top-3 -left-3','-top-3 -right-3','-bottom-3 -left-3','-bottom-3 -right-3'].map(position=><span key={position} className={`absolute ${position} flex h-6 w-6 rotate-45 items-center justify-center border-2 border-[#EEC400] bg-white shadow-lg`} aria-hidden="true"><span className="h-2 w-2 bg-[#E07B00]"/></span>)}
    </div>
   </div>
   <p className={`${playfair.className} mb-6 text-lg italic text-white/90`}>See the Friendly Party Rental difference for yourself</p>
   <Link href="/order-by-date" prefetch={false} className="btn-gold inline-block">Book Your Rentals Online</Link>
  </div>
 </ComicBookBackground></div>
}
