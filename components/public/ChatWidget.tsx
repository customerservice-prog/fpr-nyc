'use client'

import { useState, useRef, useEffect, FormEvent } from 'react'
import { MessageCircle, X, Send } from 'lucide-react'

interface FaqEntry {
  q: string
  a: string
}

interface ChatMessage {
  role: 'bot' | 'user'
  text: string
}

const FAQ_DATA: FaqEntry[] = [
  { q: 'How do I book a rental?', a: 'Browse our catalog, select items, choose your event date, and complete checkout online. You can also call 315-884-1498 for help.' },
  { q: 'What can I rent from you?', a: 'We carry tents, tables and chairs, linens, lighting, bounce houses and waterslides, concessions and beverage service, dance floors, generators, photo booths, yard games, heating and cooling, and full wedding and party packages.' },
  { q: 'Do I need to pay a deposit?', a: 'Yes, a 33% deposit is required at booking to reserve your date. The remaining balance is due before delivery.' },
  { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards through our secure online checkout.' },
  { q: 'When is the remaining balance due?', a: 'The balance is due before delivery. Automatic reminders are sent by email as your event approaches.' },
  { q: 'Is there sales tax on my order?', a: 'Yes, South Carolina sales tax applies to taxable rental items and is calculated automatically at checkout.' },
  { q: 'Do you have coupons or promo codes?', a: 'Yes, if you have a coupon code you can enter it at checkout to apply your discount.' },
  { q: 'Do you offer discounts for multi-day rentals?', a: 'Yes. Renting for more than one day costs less per day than paying full price every day: 2-3 days adds about 50% to the 1-day price, 4-6 days adds about 100%, and 7+ days adds about 150%.' },
  { q: 'Can I request overnight or exact delivery times?', a: 'Yes, for an extra fee. Overnight keep is $75 (bounce houses and waterslides only), a flexible delivery window is $40, and a guaranteed exact delivery time is $100 on any delivery order - otherwise choose a free Morning or Afternoon window.' },
  { q: 'What if I need to cancel or reschedule?', a: 'Deposits are non-refundable, but rainchecks are valid for one year.' },
  { q: 'How far in advance should I book?', a: 'As early as possible. Summer weekends often book 4-8 weeks out.' },
  { q: 'Can I modify my order after booking?', a: 'Yes, with 48-72 hours notice.' },
  { q: 'Does the price include delivery and setup?', a: 'Tent delivery and setup is included for most Greenville, SC area locations. Table and chair setup is available for an additional fee.' },
  { q: 'What areas do you serve?', a: 'We deliver throughout the Upstate South Carolina area, including Greenville, Greer, Simpsonville, Mauldin, Easley, Travelers Rest, Spartanburg, Anderson, Piedmont, and many nearby towns. A delivery fee based on distance may apply outside the immediate Greenville area.' },
  { q: 'When do you set up and pick up?', a: 'Setup is coordinated in advance based on your event schedule, and pickup is typically the same day or the following morning for evening events.' },
  { q: 'Does setup time count toward my rental period?', a: 'No, setup time does not count toward your rental period.' },
  { q: 'What if my event starts early in the morning?', a: 'Early setups are available - just let us know your event time when booking.' },
  { q: 'Is your equipment clean and safe?', a: 'Yes - every piece is cleaned, sanitized, and inspected before and after every rental. Our commercial-grade equipment is safe for children with adult supervision recommended.' },
  { q: 'What if something breaks?', a: 'Normal wear is covered. Damage from misuse may have associated costs.' },
  { q: 'Do you carry insurance?', a: 'Yes, we are fully insured.' },
  { q: 'How much does a bounce house cost?', a: 'Bounce houses start at \$199/day. Waterslides range from \$250-\$499, and combo units start at \$500.' },
  { q: 'Do bounce houses need power?', a: 'Yes, constant air supply is needed - a 20-amp outlet within 100 feet is required. We also rent generators starting at \$125 for locations without power.' },
  { q: 'Do water slides need a water hookup?', a: 'Yes, a standard garden hose connection is needed.' },
  { q: 'Can bounce houses be set up indoors?', a: 'Yes, as long as the space has a minimum 14-16 ft ceiling height.' },
  { q: 'What happens if it rains?', a: 'Light rain is generally okay, but heavy rain, lightning, or high winds require shutting down inflatables for safety.' },
  { q: 'Can you set up at parks?', a: 'Yes. Permits may be required for park setups, and the customer is responsible for obtaining them.' },
  { q: 'What surfaces can you set up on?', a: 'We can set up on grass, pavement, turf, gravel, or concrete.' },
  { q: 'Do I need a permit for a backyard tent?', a: 'Usually not for residential setups. Large tents at commercial venues may require permits.' },
  { q: 'Can you do a free yard assessment?', a: 'Yes! Call 315-884-1498 to schedule one.' },
  ]

const QUICK_QUESTIONS = [
  'How do I book a rental?',
  'What areas do you serve?',
  'How much does a bounce house cost?',
  'Do I need a deposit?',
]

const STOP_WORDS = new Set(['a', 'an', 'the', 'is', 'are', 'do', 'does', 'i', 'my', 'you', 'your', 'to', 'for', 'of', 'in', 'on', 'at', 'and', 'or', 'if', 'what', 'when', 'how', 'can', 'need', 'it', 'be'])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
}

interface LookupItem {
  name: string
  cost: number | null
  slug: string | null
  category?: { name: string | null } | null
}

// Try to answer with a real catalog item's live name/price before falling back
// to the static FAQ list, so pricing questions about a specific item (e.g. "how
// much is the 10x10 tent") get an accurate answer instead of a generic FAQ guess.
async function findItemAnswer(userText: string, userTokens: Set<string>): Promise<string | null> {
  const lower = userText.toLowerCase()
  const wantsPricing = ['cost', 'price', 'much', 'rent', 'have', 'available'].some((w) => lower.includes(w))
  if (!wantsPricing) return null

  try {
    const keywords = Array.from(userTokens).join(' ')
    const res = await fetch(`/api/items?search=${encodeURIComponent(keywords)}`)
    if (!res.ok) return null
    const data = await res.json()
    const items: LookupItem[] = Array.isArray(data) ? data : data.items || []
    const item = items[0]
    if (!item || typeof item.cost !== 'number') return null
    const price = '$' + item.cost.toFixed(2).replace(/\.00$/, '')
    const categoryPart = item.category?.name ? ` (${item.category.name})` : ''
    return `Yes! We carry ${item.name}${categoryPart} starting at ${price}. Check availability for your date on our booking calendar, or call 315-884-1498.`
  } catch {
    return null
  }
}

async function findBestAnswer(userText: string): Promise<string> {
  const userTokens = new Set(tokenize(userText))
  if (userTokens.size === 0) {
    return "I'm not sure I understood that. Could you rephrase your question, or call us at 315-884-1498?"
  }

  const itemAnswer = await findItemAnswer(userText, userTokens)
  if (itemAnswer) return itemAnswer

  let bestScore = 0
  let bestEntry: FaqEntry | null = null

  for (const entry of FAQ_DATA) {
    const qTokens = tokenize(entry.q)
    const aTokens = tokenize(entry.a)
    let score = 0
    qTokens.forEach((t) => {
      if (userTokens.has(t)) score += 2
    })
    aTokens.forEach((t) => {
      if (userTokens.has(t)) score += 1
    })
    if (score > bestScore) {
      bestScore = score
      bestEntry = entry
    }
  }

  // Require a meaningfully strong match (not just one incidental shared word)
  // relative to how many words the visitor actually typed.
  if (bestEntry && bestScore >= 4 && bestScore / userTokens.size >= 0.5) {
    return bestEntry.a
  }

  return "I don't have an exact answer for that, but our team can help! Call or text 315-884-1498, or visit our Contact Us page and we'll get right back to you."
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'bot', text: "Hi! I'm the Friendly Party Rental assistant. Ask me about booking, pricing, delivery areas, or anything else about our rentals." },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isOpen, isLoading])

  const sendMessage = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isLoading) return
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setInput('')
    setIsLoading(true)
    let answer: string
    try {
      const res = await fetch('/api/chat-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      if (!res.ok) throw new Error('bad response')
      const data = await res.json()
      answer = typeof data?.answer === 'string' ? data.answer : await findBestAnswer(trimmed)
    } catch {
      answer = await findBestAnswer(trimmed)
    }
    setMessages((prev) => [...prev, { role: 'bot', text: answer }])
    setIsLoading(false)
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-80 max-w-[90vw] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col overflow-hidden" style={{ height: 420 }}>
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <span className="font-semibold text-sm">Friendly Party Rental Assistant</span>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="Close chat">
              <X size={18} />
            </button>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`rounded-lg px-3 py-2 text-sm max-w-[85%] ${
                    m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-dark'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg px-3 py-2 text-sm max-w-[85%] bg-white border border-gray-200 text-dark">
                  Typing...
                </div>
              </div>
            )}
            {messages.length === 1 && !isLoading && (
              <div className="flex flex-col gap-1.5 pt-2">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="text-left text-xs bg-white border border-blue-200 text-blue-700 rounded-full px-3 py-1.5 hover:bg-blue-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form onSubmit={handleSubmit} className="border-t border-gray-200 p-2 flex items-center gap-2 bg-white">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question..."
              disabled={isLoading}
              className="flex-1 text-sm border border-gray-300 rounded-full px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={isLoading}
              className="bg-blue-600 text-white rounded-full p-2 hover:bg-blue-700 flex-shrink-0 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open chat assistant"
        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg"
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  )
}
