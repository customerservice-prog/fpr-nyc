import Link from 'next/link'
import HomeVideo from './HomeVideo'
import ComicBookBackground from './ComicBookBackground'

function GuideDetails() {
  return <div className="mx-auto max-w-3xl rounded-2xl bg-[#0B1F3A] px-5 py-6 text-center shadow-lg ring-1 ring-white/15">
    <p className="text-sm text-white/90">48 seconds • Captioned • Sound available in the player</p>
    <p className="mt-3 text-base leading-relaxed text-white/90">Learn what to prepare, how to choose your rentals, and how to book delivery for your Riverdale event.</p>
    <div className="mt-5 flex flex-wrap justify-center gap-3">
      <Link href="/order-by-date" prefetch={false} className="btn-gold inline-block">Check My Date</Link>
      <Link href="/category" prefetch={false} className="inline-block rounded-lg border-2 border-[#F4C542] px-6 py-3 font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#F4C542]">Browse Rentals</Link>
    </div>
    <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm">
      <a href="/videos/riverdale-website-guide-v1.mp4" target="_blank" rel="noopener noreferrer" className="text-white underline underline-offset-4">Open video</a>
      <details className="max-w-2xl text-left">
        <summary className="cursor-pointer text-white underline underline-offset-4">Read video transcript</summary>
        <p className="mt-3 rounded-lg bg-black/20 p-4 leading-relaxed text-white/90">Planning a celebration in Riverdale? Here’s how to get started with Friendly Party Rental NYC. Have your event date, guest count, and delivery address ready. Browse Rentals to compare tents, tables, and chairs. Choose sizes and quantities for your guests, and measure the space for your tent. Tell us about the ground surface and access. Check My Date lets you see rentals available for your event. Add your items, review your cart, and enter your delivery details at checkout. NYC orders are delivery only. Need help choosing? Contact our Riverdale team. Start with Check My Date or Browse Rentals.</p>
      </details>
    </div>
  </div>
}

export default function HomeYouTube({ desktop = false }: { desktop?: boolean }) {
  if (!desktop) return <section data-home-section="youtube" className="bg-[#0B1F3A] py-10 text-white">
    <div className="home-wrap">
      <p className="text-xs uppercase tracking-widest text-[#F4C542]">Your Riverdale Rental Guide</p>
      <h2 className="home-heading">Plan Your Riverdale Event</h2>
      <div className="mb-5 mt-6 aspect-video overflow-hidden rounded-2xl bg-black"><HomeVideo /></div>
      <GuideDetails />
    </div>
  </section>

  return <div data-home-section="youtube"><ComicBookBackground className="py-14">
    <div className="mx-auto max-w-4xl px-6 text-center">
      <div className="mb-8 inline-block rounded-2xl bg-[#0B1F3A] px-6 py-4 shadow-lg ring-1 ring-white/15">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#F4C542]">Your Riverdale Rental Guide</p>
        <h2 className="font-serif text-4xl font-bold text-white">Plan Your Riverdale Event</h2>
      </div>
      <div className="relative mx-auto mb-8 max-w-3xl">
        <div className="absolute -inset-6 rounded-[2rem] opacity-70 blur-2xl" style={{ background: 'linear-gradient(135deg, #EEC400, #E07B00, #EEC400)' }} aria-hidden="true" />
        <div className="absolute -inset-1.5 rounded-[1.75rem]" style={{ background: 'linear-gradient(135deg, #EEC400, #FFF7DC, #E07B00, #FFF7DC, #EEC400)' }} aria-hidden="true" />
        <div className="relative rounded-3xl p-[6px] shadow-2xl" style={{ background: 'linear-gradient(135deg, #EEC400, #E07B00, #EEC400)' }}>
          <div className="rounded-[22px] bg-[#FFFDF7] p-2"><div className="aspect-video overflow-hidden rounded-2xl bg-black ring-1 ring-black/10"><HomeVideo /></div></div>
          {['-top-3 -left-3', '-top-3 -right-3', '-bottom-3 -left-3', '-bottom-3 -right-3'].map(position => <span key={position} className={['absolute', position, 'flex h-6 w-6 rotate-45 items-center justify-center border-2 border-[#EEC400] bg-white shadow-lg'].join(' ')} aria-hidden="true"><span className="h-2 w-2 bg-[#E07B00]" /></span>)}
        </div>
      </div>
      <GuideDetails />
    </div>
  </ComicBookBackground></div>
}
