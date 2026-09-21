'use client'

import { REVIEWS } from '@/lib/utils'

const SHARED_NY_REVIEWS = [{id:'ny-bonnie',author:'Bonnie Brown',rating:5,text:'Reliable and responsive.'},{id:'ny-mary',author:'Mary McCormick',rating:5,text:'Excellent service and communication. Would highly recommend.'},{id:'ny-jennie',author:'Jennie Karoleski',rating:5,text:'everything went very smoothly'}]

const AVATAR_COLORS = ['#1A73E8', '#D93025', '#188038', '#F9AB00', '#9334E6', '#12B5CB', '#E8710A']

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function ReviewCarousel() {
  const shared = REVIEWS.length === 0
  const reviews = shared ? SHARED_NY_REVIEWS : REVIEWS
  return (
    <div className="bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <h2 className="text-2xl font-bold text-center mb-2 text-dark">{shared ? "Reviews from Our New York Customers" : "What Our Customers Say"}</h2>{shared && <p className="mx-auto mb-6 max-w-2xl text-center text-sm leading-6 text-gray-600">These reviews come from Friendly Party Rental’s New York customers, not Greenville events. <a href="https://www.friendlypartyrental.com/#reviews" className="underline" target="_blank" rel="noopener noreferrer">Read the original reviews on our New York website.</a></p>}<div className="md:hidden flex gap-4 overflow-x-auto px-4 pb-2 snap-x snap-mandatory">{reviews.map((review) => (<div key={`m-${review.id}`} className="flex-shrink-0 w-[85%] snap-start bg-white p-5 rounded-lg shadow border border-primary/30"><div className="flex items-center gap-3 mb-3"><div className="flex items-center justify-center rounded-full text-white font-semibold flex-shrink-0" style={{ backgroundColor: avatarColor(review.author), width: 36, height: 36, fontSize: 15 }} aria-hidden="true">{review.author.trim().charAt(0).toUpperCase()}</div><div><span className="font-bold text-dark block text-sm">{review.author}</span><span className="text-yellow-500 text-xs">{'⭐'.repeat(review.rating)}</span></div></div><p className="text-body text-sm">{review.text}</p></div>))}</div>
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
