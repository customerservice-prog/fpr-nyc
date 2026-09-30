import { nycPageMetadata } from '@/lib/nycSeo'
import Link from 'next/link'
import { NYC_SERVICE_AREA_SUMMARY } from '@/lib/nycServiceAreas'
import { BUSINESS } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata = nycPageMetadata("/wedding-vendors","Downstate New York Wedding Vendor Suggestions","Ask Friendly Party Rental NYC for wedding vendor suggestions in Riverdale, the Bronx and Lower Westchester while planning your rental equipment.")

export default function WeddingVendorsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-dark mb-6 text-center">Wedding Vendor Suggestions</h1>
      <p className="text-body mb-6">
        Planning a wedding takes more than tents and tables. Friendly Party Rental NYC handles your
        rental equipment; catering, bar service, DJ / MC, photography, videography, flowers and cake
        come from other vendors. We recommend contacting a few vendors in each category to compare
        pricing and availability for your date and venue.
      </p>
      <p className="text-body mb-10">
        We do not have formal partnerships with other vendors. If you would like suggestions for an
        event in {NYC_SERVICE_AREA_SUMMARY}, call or text {BUSINESS.phone} and our team will share
        what we can.
      </p>

      <div className="text-center">
        <p className="text-body mb-4">
          Prefer to have our team plan and coordinate everything for you instead? Ask us
          about full-service event planning when you call or text 315-884-1498.
        </p>
        <Link href="/event-planning" className="btn-accent">Learn About Event Planning</Link>
      </div>
    </div>
  )
}
