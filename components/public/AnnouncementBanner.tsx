import { PartyPopper } from 'lucide-react'

export default function AnnouncementBanner() {
  return (
    <div className="w-full bg-gradient-to-r from-[#0B1D4A] via-[#16307a] to-[#0B1D4A] text-white text-center py-3 px-4 border-b-2 border-[#F5A31B]">
      <p className="flex flex-wrap items-center justify-center gap-2 text-sm md:text-base font-semibold tracking-wide">
        <PartyPopper className="w-4 h-4 md:w-5 md:h-5 text-[#F5A31B] shrink-0" />
        <span>
          <span className="text-[#F5A31B] font-extrabold">NEW LOCATION, NOW OPEN:</span>{' '}
          Greenville, SC is booking November dates and beyond — lock in your event before spots run out!
        </span>
      </p>
    </div>
  )
}
