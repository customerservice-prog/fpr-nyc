'use client'

import { REVIEWS } from '@/lib/utils'

const AVATAR_COLORS = ['#1A73E8', '#D93025', '#188038', '#F9AB00', '#9334E6', '#12B5CB', '#E8710A']

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

const ORIGINAL_LOCATION_REVIEWS = [
  { id:'company-review-1', author:'Larissa B.', rating:5, text:'This company was easy to work with and the tent was fantastic. The installers were professional, helpful, and quick.' },
  { id:'company-review-2', author:'Jennie Karoleski', rating:5, text:'Everything went very smoothly. The items were in good condition and delivered on time.' },
  { id:'company-review-3', author:'Mary McCormick', rating:5, text:'Excellent service and communication. Would highly recommend.' },
  { id:'company-review-4', author:'Bonnie Brown', rating:5, text:'Reliable and responsive.' },
]

// NYC reviews take priority as soon as they exist. Until then we may show a small,
// clearly labeled company-track-record sample from the original Syracuse-area
// location. The disclosure prevents those reviews from being represented as NYC jobs.
export default function ReviewCarousel() {
  const nycReviews = REVIEWS
  const shared = nycReviews.length === 0
  const reviews = shared ? ORIGINAL_LOCATION_REVIEWS : nycReviews
  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-2 text-dark">{shared ? "Friendly Party Rental Customer Reviews" : "What Our NYC Customers Say"}</h2>
        {shared && <div className="mx-auto mb-7 max-w-3xl rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-center text-sm leading-6 text-slate-700"><strong className="block text-slate-950">Company track record — original Syracuse-area location</strong>NYC / Downstate is a new Friendly Party Rental location. These reviews are from customers of our original Syracuse-area operation, not NYC rentals. <a href="https://www.friendlypartyrental.com/" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-800 underline">View the original location</a>.</div>}
        <div className="md:hidden flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">{reviews.map((review) => (<div key={`m-${review.id}`} className="flex-shrink-0 w-[85%] snap-start bg-white p-5 rounded-lg shadow border border-primary/30"><div className="flex items-center gap-3 mb-3"><div className="flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0" style={{ backgroundColor: avatarColor(review.author), width: 36, height: 36, fontSize: 15 }} aria-hidden="true">{review.author.trim().charAt(0).toUpperCase()}</div><div><span className="font-bold text-dark block text-sm">{review.author}</span><span className="text-yellow-500 text-xs">{'⭐'.repeat(review.rating)}</span></div></div><p className="text-body text-sm">{review.text}</p></div>))}</div>
        <div className="hidden md:grid md:grid-cols-2 gap-6">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white p-6 rounded-lg shadow border border-primary/30">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0"
                  style={{ backgroundColor: avatarColor(review.author), width: 40, height: 40, fontSize: 16 }}
                  aria-hidden="true"
                >
                  {review.author.trim().charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="font-bold text-dark block">{review.author}</span>
                  <span className="text-yellow-500 text-sm">{'⭐'.repeat(review.rating)}</span>
                </div>
              </div>
              <p className="text-body text-sm">{review.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
