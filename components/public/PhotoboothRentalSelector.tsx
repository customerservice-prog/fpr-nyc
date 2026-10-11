'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/components/public/CartContext'
import CartDrawer from '@/components/public/CartDrawer'
import { bookingDateKey } from '@/lib/rentsketchBooking'
import toast from 'react-hot-toast'
import {
  CalendarDays, Camera, CheckCircle2, ChevronDown, Clock3, Gift,
  Heart, Image as ImageIcon, PartyPopper, Printer, ShieldCheck,
  ShoppingCart, Sparkles, UsersRound, WandSparkles,
} from 'lucide-react'
import styles from './PhotoboothRentalSelector.module.css'

interface BoothItem {
  id: string
  name: string
  cost: number
  available: number
  slug?: string | null
  picture?: string | null
  category?: { pricingProfile?: string | null } | null
  bookableAfter?: string | null
  description?: string | null
}
type Service = 'self' | 'attended'
type Rental = { item: BoothItem; hours: number; service: Service }

const previewOnly = process.env.NEXT_PUBLIC_FPR_DESIGN_PREVIEW === '1'
const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
const photo = {
  graduation: '/images/photobooth/samples/graduation-sample-2026.webp',
  wedding: '/images/photobooth/samples/wedding-sample-2026.webp',
  birthday: '/images/photobooth/samples/birthday-sample-2026.webp',
  quince: '/images/photobooth/samples/quinceanera-sample-2026.webp',
  corporate: '/images/photobooth/samples/corporate-sample-2026.webp',
}
const examples = [
  { key: 'graduation', label: 'Graduation', foot: 'Class of 2026', headline: 'CLASS OF 2026', name: 'Congrats, Jordan!', sub: 'Bold. Proud. Memorable.', image: photo.graduation },
  { key: 'wedding', label: 'Wedding', foot: '06.14.2027', headline: 'Mr. & Mrs.', name: 'Olivia & Ethan', sub: 'Elegant. Timeless. Beautiful.', image: photo.wedding },
  { key: 'birthday', label: 'Birthday', foot: 'Celebrate!', headline: 'Happy Birthday', name: 'Make a Wish!', sub: 'Bright. Fun. Unforgettable.', image: photo.birthday },
  { key: 'quince', label: 'Quinceañera', foot: 'A Night to Remember', headline: 'Mis XV Años', name: 'Gabriela', sub: 'Classic. Stylish. Unique.', image: photo.quince },
  { key: 'corporate', label: 'Corporate Event', foot: 'Annual Celebration', headline: 'YOUR LOGO', name: 'Company Event', sub: 'Professional. Branded. Memorable.', image: photo.corporate },
] as const

function parseRental(item: BoothItem): Rental | null {
  const match = item.name.match(/^photobooth\s*\(\s*(\d+)\s*-\s*hour\s*\)\s*(with|no)\s*attendant$/i)
  if (!match) return null
  return { item, hours: Number(match[1]), service: match[2].toLowerCase() === 'with' ? 'attended' : 'self' }
}

// Real, local high-resolution versions of the five approved sample artworks.
// Keep the original proportions: no stretched faces, text or photo panels.
// Example photos are illustrative; guest prints are configured in the booth app.
function Strip({ design, small = false }: { design: typeof examples[number]; small?: boolean }) {
  return (
    <div
      role="img"
      aria-label={design.label + ' sample photo booth keepsake'}
      data-design={design.key}
      className={[styles.strip, styles.approvedStrip, small ? styles.stripSmall : ''].join(' ')}
    >
      <img src={design.image} alt="" loading={small ? 'eager' : 'lazy'} decoding="async" />
    </div>
  )
}

export default function PhotoboothRentalSelector({
  items,
  onChooseDate,
  onChangeDate,
  bookingReady,
  dateExpired = false,
}: {
  items: BoothItem[]
  onChooseDate: () => void
  onChangeDate: () => void
  bookingReady: boolean
  dateExpired?: boolean
  onOpenCart?: () => void
}) {
  const { items: cartItems, addItem, removeItem, eventDate, loaded } = useCart()
  const [service, setService] = useState<Service>('self')
  const [hours, setHours] = useState(4)
  const [showCart, setShowCart] = useState(false)
  const [showFaq, setShowFaq] = useState<number | null>(null)
  const [showFaqList, setShowFaqList] = useState(false)

  const rentals = useMemo(() => items.map(parseRental).filter((item): item is Rental => !!item), [items])
  const rentalIds = useMemo(() => new Set(rentals.map(r => r.item.id)), [rentals])
  const chosenService = rentals.filter(r => r.service === service).sort((a, b) => a.hours - b.hours)
  const selected = chosenService.find(r => r.hours === hours) || chosenService.find(r => r.hours === 4) || chosenService[0]
  const activeHours = selected?.hours || 4
  const inCart = cartItems.find(item => rentalIds.has(item.id))
  const selectedInCart = selected?.item.id === inCart?.id
  const unavailable = !selected || selected.item.available <= 0 ||
    !!(selected.item.bookableAfter && new Date() < new Date(selected.item.bookableAfter))

  // Two separate real catalog items. A standard backdrop and 4x6 prints
  // remain included in every Photo Booth rental.
  const customLayoutSku = items.find(item => item.slug === 'photobooth-custom-image-layout-upgrade')
  const physicalBackdropSku = items.find(item => item.slug === 'photobooth-custom-backdrop-upgrade')
  const customizationPrice = customLayoutSku?.cost ?? null
  const backdropPrice = physicalBackdropSku?.cost ?? null
  const canAddCustomLayout = !!customLayoutSku && customLayoutSku.available > 0
  const canAddBackdrop = !!physicalBackdropSku && physicalBackdropSku.available > 0
  const customInCart = !!customLayoutSku && cartItems.some(item => item.id === customLayoutSku.id)
  const backdropInCart = !!physicalBackdropSku && cartItems.some(item => item.id === physicalBackdropSku.id)
  const now = new Date()
  const todayKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
  const selectedDateKey = bookingDateKey(eventDate)
  const usableCartDate = selectedDateKey && selectedDateKey >= todayKey ? eventDate : null

  useEffect(() => {
    if (!loaded) return
    const saved = cartItems.find(item => rentals.some(r => r.item.id === item.id))
    const cartChoice = rentals.find(r => r.item.id === saved?.id)
    if (cartChoice) {
      setService(cartChoice.service)
      setHours(cartChoice.hours)
    }
    // Upgrades now enter the cart directly; remove any stale staged choice
    // so an earlier event cannot accidentally carry a later customization fee.
    try { window.sessionStorage.removeItem('fpr-photobooth-custom-layout') } catch {}
    if (!cartChoice) {
      try {
        const stored = window.sessionStorage.getItem('fpr-photobooth-preview-choice')
        if (stored) {
          const data = JSON.parse(stored) as { service?: Service; hours?: number }
          if (data.service === 'self' || data.service === 'attended') setService(data.service)
          if (typeof data.hours === 'number') setHours(data.hours)
        }
      } catch {/* Selection remains usable without session storage. */}
    }
    // Restore once after cart hydration; do not override deliberate changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  const storeChoice = (nextService: Service, nextHours: number) => {
    try { window.sessionStorage.setItem('fpr-photobooth-preview-choice', JSON.stringify({ service: nextService, hours: nextHours })) } catch {}
  }
  const chooseService = (next: Service) => {
    const options = rentals.filter(r => r.service === next)
    if (!options.length) return
    const chosenHours = options.some(r => r.hours === activeHours) ? activeHours : (options.find(r => r.hours === 4)?.hours || options[0].hours)
    setService(next)
    setHours(chosenHours)
    storeChoice(next, chosenHours)
  }
  const chooseHours = (next: number) => {
    setHours(next)
    storeChoice(service, next)
  }


  const cartLineFor = (item: BoothItem) => ({
    id: item.id, name: item.name, price: item.cost,
    quantity: 1, maxQuantity: Math.max(1, item.available), picture: item.slug ? '/api/item-image/' + encodeURIComponent(item.slug) : item.picture,
    pricingProfile: item.category?.pricingProfile || undefined,
    eventDate: usableCartDate,
  })

  const addSelectedRental = (notify = true): boolean => {
    if (!bookingReady || !usableCartDate) {
      onChooseDate()
      return false
    }
    if (!loaded || !selected || unavailable) {
      toast.error('This Photo Booth package is unavailable. Try another option or contact us.')
      return false
    }
    if (!selectedInCart) {
      for (const line of cartItems) {
        if (rentalIds.has(line.id)) removeItem(line.id, line.selectedColor)
      }
      addItem(cartLineFor(selected.item))
    }
    if (service === 'self' && backdropInCart && physicalBackdropSku) {
      removeItem(physicalBackdropSku.id)
      toast('A custom physical backdrop requires an attended booth, so it was removed.')
    }
    if (notify) toast.success(usableCartDate
      ? 'Photo Booth added for ' + usableCartDate + '.'
      : 'Photo Booth added. Choose your event date at checkout.')
    return true
  }

  const toggleCustomDesign = () => {
    if (!loaded || !canAddCustomLayout || !customLayoutSku) {
      toast.error('The custom layout is unavailable. Contact us for help.')
      return
    }
    if (customInCart) {
      removeItem(customLayoutSku.id)
      toast.success('Custom layout removed from cart.')
    } else {
      if (!addSelectedRental(false)) return
      addItem(cartLineFor(customLayoutSku))
      toast.success(fmt(customLayoutSku.cost) + ' custom image layout added with your Photo Booth.')
    }
    setShowCart(true)
  }

  const togglePhysicalBackdrop = () => {
    if (backdropInCart && physicalBackdropSku) {
      removeItem(physicalBackdropSku.id)
      toast.success('Custom physical backdrop removed from cart.')
      setShowCart(true)
      return
    }
    if (service !== 'attended') {
      chooseService('attended')
      toast('A physical custom backdrop is for attended rentals. Review the updated rental price, then add the backdrop.')
      return
    }
    if (!canAddBackdrop || !physicalBackdropSku) {
      toast.error('Contact us to confirm availability of the custom physical backdrop.')
      return
    }
    if (!addSelectedRental(false)) return
    addItem(cartLineFor(physicalBackdropSku))
    toast.success('Custom physical backdrop added as a separate upgrade.')
    setShowCart(true)
  }

  const book = () => {
    if (!addSelectedRental()) return
    setShowCart(true)
  }

  const faqs = [
    {
      question: 'Are 4×6 prints included?',
      answer: 'Yes. Standard 4×6 instant prints are included in the published Riverdale Photo Booth packages. Our team confirms the print allowance and event artwork before your event.',
    },
    {
      question: 'What is the difference between self-service and attended?',
      answer: 'With self-service, we deliver and set up the booth and guests operate it themselves. With an attendant, a Friendly Party Rental team member stays during the booked session to help guests.',
    },
    {
      question: 'Can we choose a wedding, graduation, or birthday design?',
      answer: 'Yes. These are illustrative examples of different styles. Our team prepares the agreed design in advance, so guests do not need to edit it while taking pictures.',
    },
    {
      question: 'When do we receive the digital pictures?',
      answer: 'We arrange digital-gallery delivery after the event. Confirm the sharing method, gallery access period and photo backup arrangements with our team before booking.',
    },
    {
      question: 'What is included versus a physical custom backdrop?',
      answer: 'A standard physical backdrop and 4×6 prints are included. The optional custom physical backdrop for attended rentals is priced in the Riverdale catalog, separately from custom photo-print artwork.',
    },
    {
      question: 'Can I add a rental before choosing my event date?',
      answer: 'You can explore packages first. Choose your event date and delivery details before adding your selected rental so availability is checked for your event.',
    },
    {
      question: 'How does the custom design option work?',
      answer: customizationPrice !== null ? 'The standard photo-print layout is included. For ' + fmt(customizationPrice) + ', add personalized artwork with your colors, names, messages and logos. This is a separate design fee.' : 'Standard photo-print layouts are included. Contact our Riverdale team for custom artwork options and pricing.',
    },
  ]

  if (!rentals.length) return <div className={styles.empty}><p>There are no Photo Booth rental packages available for this date. Try another date or call 718-283-4593 for help.</p><button type="button" className={styles.bookButton} onClick={onChooseDate}>Choose Another Date</button></div>

  return (
    <div className={styles.root} data-photobooth-redesign="nyc-main-design-parity">
      {previewOnly && <div className={styles.previewRibbon} role="status">DESIGN PREVIEW — cart testing only, payments disabled · Original live website unchanged</div>}
      <section className={styles.hero} aria-label="Photo Booth Rentals">
        <div className={styles.heroGlow} />
        <div className={styles.approvedDevice} role="img" aria-label="Photo Booth with illuminated ring light and travel case, based on the approved page artwork" />
        <div className={styles.heroCenter}>
          <h1>Photo Booth <em>Rentals</em></h1>
          <p>CAPTURE MORE THAN PHOTOS<br />CREATE MEMORIES THAT LAST</p>
          <div className={styles.heroBenefits}>
            <div><Camera aria-hidden="true"/><span>Fun & Easy<br />for Guests</span></div>
            <div><Printer aria-hidden="true"/><span>4×6 Prints<br />Included</span></div>
            <div><ImageIcon aria-hidden="true"/><span>Digital Photos<br />After Your Event</span></div>
            <div><UsersRound aria-hidden="true"/><span>Perfect for<br />Any Occasion</span></div>
          </div>
        </div>
        <div className={styles.desktopHeroStrips} aria-hidden="true">
          <Strip design={examples[1]} small />
          <Strip design={examples[0]} small />
        </div>
        <div className={styles.mobileHeroStrips} aria-hidden="true">
          <div><Strip design={examples[1]} small /></div>
          <div><Strip design={examples[0]} small /></div>
        </div>
      </section>

      <section className={styles.rentalSection} id="choose-photobooth-rental">
        <div className={styles.sectionTitle}><h2>Choose Your Rental</h2><p>Simple pricing. Same great experience. 4×6 prints always included!</p></div>
        <div className={styles.rentalColumns}>
          <div className={styles.rentalControls}>
            <div className={styles.serviceTabs} role="group" aria-label="Choose service type">
              <button type="button" disabled={!loaded} className={service === 'self' ? styles.activeTab : ''} aria-pressed={service === 'self'} onClick={() => chooseService('self')}>
                <strong>Self-Service</strong><span>(You operate the booth)</span>
              </button>
              <button type="button" disabled={!loaded} className={service === 'attended' ? styles.activeTab : ''} aria-pressed={service === 'attended'} onClick={() => chooseService('attended')}>
                <strong>With Attendant</strong><span>(Our team stays on-site)</span>
              </button>
            </div>
            <div className={styles.hourOptions} role="group" aria-label="Rental hours">
              {chosenService.map(r => (
                <button type="button" key={r.item.id} disabled={!loaded} onClick={() => chooseHours(r.hours)} className={r.hours === activeHours ? styles.selectedHour : ''} aria-pressed={r.hours === activeHours}>
                  <span>{r.hours} Hours</span><strong>{fmt(r.item.cost)}</strong><small>rental</small>
                </button>
              ))}
            </div>
            <button className={styles.bookButton} type="button" onClick={book} disabled={unavailable || !loaded}>
              <CalendarDays size={19}/>{selectedInCart ? 'View Cart' : bookingReady ? 'Add Photo Booth to Cart' : 'Choose My Event Date'}
            </button>
            <p className={styles.bookingHint}>
              {usableCartDate ? <>Event date: <strong>{usableCartDate}</strong> · <button type="button" onClick={onChangeDate}>Change date</button>. Availability confirmed at checkout.</> : 'Choose your event date and delivery schedule to check availability, then add your rental.'}
            </p>
            {inCart && <p className={styles.cartHint}>Change your hours or service above, then update your selected booth.</p>}
          </div>
          <div className={styles.included}>
            <h3>What’s Included</h3>
            <ul>
              <li><CheckCircle2 /> Modern open-air Photo Booth</li>
              <li><CheckCircle2 /> <strong>4×6 prints included</strong> — one-photo or four-photo design</li>
              <li><CheckCircle2 /> Fun photo props</li>
              <li><CheckCircle2 /> Event backdrop</li>
              <li><CheckCircle2 /> Delivery, setup and pickup service</li>
              <li><CheckCircle2 /> Digital photo delivery after the event</li>
              <li><CheckCircle2 /> Friendly support</li>
            </ul>
            <p className={styles.includedScript}>Great for<br/>Weddings, Graduations,<br/>Birthdays & More! <Heart size={22} /></p>
            <p className={styles.disclaimer}>Print quantities, gallery delivery details and applicable taxes or travel fees are confirmed with your booking.</p>
          </div>
        </div>
      </section>

      <section className={styles.examplesSection} id="photobooth-examples">
        <div className={styles.sectionTitle}><h2>Photo Booth Print Examples</h2><p>See how your keepsake could look for all kinds of celebrations.</p></div>
        <div className={styles.exampleGrid}>
          {examples.map(design => (
            <article className={styles.exampleCard} key={design.key}>
              <Strip design={design} />
              <h3>{design.label}</h3>
              <p>{design.sub}</p>
            </article>
          ))}
        </div>
        <p className={styles.swipeHint}>Swipe to see more event designs →</p>
        <p className={styles.sampleNote}>These are illustrative sample designs with model photographs, not actual customer galleries. Your chosen design is prepared before the event.</p>
      </section>

      <section className={styles.customSection}>
        <div className={styles.customArt} aria-hidden="true">
          <div><Strip design={examples[1]} small /></div>
          <div><Strip design={examples[2]} small /></div>
          <div><Strip design={examples[0]} small /></div>
        </div>
        <div className={styles.customText}>
          <h2>Custom Image Layout Upgrade</h2>
          <p>Personalize the printed 4×6 photo artwork with your names, colors, theme, wording or logo. Standard layouts and 4×6 prints are already included. One-time design fee.</p>
        </div>
        <div className={styles.customPrice}>
          <strong>{customizationPrice !== null ? fmt(customizationPrice) : 'Ask for pricing'}</strong>
          {canAddCustomLayout
            ? <button type="button" disabled={!loaded} onClick={toggleCustomDesign} className={customInCart ? styles.customActive : ''}>{customInCart ? 'Remove from Cart' : 'Add Custom Design'} <WandSparkles size={17}/></button>
            : <a href="sms:7182834593" className={styles.customRequest}>Ask About Custom Design <WandSparkles size={17}/></a>}
          {!canAddCustomLayout && <small>Contact us to request your custom image layout.</small>}
        </div>
      </section>

      <section className={styles.backdropSection} aria-label="Optional physical backdrop upgrade">
        <img src="/api/item-image/photobooth-custom-backdrop-upgrade" className={styles.backdropImage} alt="Custom physical Photo Booth backdrop example" loading="lazy" />
        <div className={styles.backdropCopy}>
          <h2>Custom Physical Backdrop</h2>
          <p>Prefer your branding behind your guests? This upgrades the <strong>physical event backdrop</strong> for attended rentals. A standard backdrop is already included. Design and availability are confirmed before the event.</p>
        </div>
        <div className={styles.backdropPrice}>
          <strong>{backdropPrice !== null ? fmt(backdropPrice) : 'Ask for pricing'}</strong>
          {canAddBackdrop
            ? <button type="button" disabled={!loaded} onClick={togglePhysicalBackdrop}>
                {backdropInCart ? 'Remove Backdrop' : service === 'attended' ? 'Add Backdrop to Cart' : 'Choose Attended Rental'}
              </button>
            : <a href={'sms:7182834593?body=' + encodeURIComponent('Hi! Is a custom physical Photo Booth backdrop available for my Riverdale event?')}>Ask About Backdrop</a>}
          <small>Separate from custom printed photo artwork.</small>
        </div>
      </section>

      <section className={styles.bottomBanner} aria-label="Book your Photo Booth">
        <div><h2>Make Your Event <em>Unforgettable</em></h2><p>BOOK YOUR PHOTO BOOTH TODAY!</p></div>
        <button type="button" onClick={book}><CalendarDays size={20}/> {selectedInCart ? 'View Cart' : bookingReady ? 'Add Photo Booth to Cart' : 'Choose My Event Date'}</button>
      </section>

      <section className={styles.faqSection}>
        <div className={styles.sectionTitle}><h2>Photo Booth FAQs</h2><p>Quick answers to the most common questions.</p></div>
        <button
          type="button"
          aria-label={showFaqList ? 'Hide Photo Booth FAQs' : 'Show Photo Booth FAQs'}
          aria-expanded={showFaqList}
          aria-controls="photobooth-faq-answers"
          className={styles.faqReveal}
          onClick={() => { setShowFaqList(value => !value); setShowFaq(null) }}
        >
          <ChevronDown size={22} className={showFaqList ? styles.openChevron : ''} />
        </button>
        {showFaqList && <div id="photobooth-faq-answers" className={styles.faqList}>
          {faqs.map((faq, index) => (
            <div className={styles.faqItem} key={faq.question}>
              <button type="button" aria-expanded={showFaq === index} onClick={() => setShowFaq(showFaq === index ? null : index)}>
                <span>{faq.question}</span><ChevronDown size={18} className={showFaq === index ? styles.openChevron : ''}/>
              </button>
              {showFaq === index && <p>{faq.answer}</p>}
            </div>
          ))}
        </div>}
      </section>
      <CartDrawer isOpen={showCart} onClose={() => setShowCart(false)} />
    </div>
  )
}


