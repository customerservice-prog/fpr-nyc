import Link from 'next/link'
import Image from 'next/image'
import { ArrowUpRight, Armchair, Check, Layers3, MoonStar, Move, PartyPopper, Tent, Undo2, Waves } from 'lucide-react'
import EventDesignVideo from '@/components/public/EventDesignVideo'
import { nycOrderAccessUrl } from '@/lib/nycRentSketch'
import { nycPageMetadata, nycBreadcrumbs, nycUrl, NYC_BUSINESS_ID } from '@/lib/nycSeo'
import { safeJsonLd } from '@/lib/jsonLd'
import styles from './design.module.css'

export const metadata = nycPageMetadata(
  '/design-your-event',
  '2D & 3D Event Layout Planner | Riverdale, Bronx & Lower Westchester',
  'Explore 2D and 3D event layout demonstrations, then plan tents, tables, chairs and event rentals with Friendly Party Rental NYC’s Riverdale team.',
)

const possibilities = [
  { icon: Move, title: 'Make room for the moments.', body: 'Consider where guests will sit, mingle and dance. The RentSketch demonstration shows how placement and rotation change a layout.' },
  { icon: MoonStar, title: 'See a different atmosphere.', body: 'Explore the day-to-night demonstration and see how lighting changes the same event scene.' },
  { icon: Armchair, title: 'Give every table some attention.', body: 'See table details in the demonstration: chair styles, seat counts and linens bring the close-up into focus.' },
  { icon: Undo2, title: 'Try a different arrangement.', body: 'Use the preview to think through your setup, then share your layout ideas with our Riverdale team.' },
]

const starters = [
  { name: '20x20 Pole Tent', slug: '20x20-pole-tent', title: 'Under the tent', tag: 'Receptions · graduations · gatherings', body: 'Start with the usable setup area. Our team can help choose a tent and work through seating, walkways and dance-floor space.', href: '/category/tent-rentals', label: 'Explore tent rentals →' },
  { name: 'Rainbow Castle Bounce House', slug: 'crayon-bounce-house', title: 'Big birthday energy', tag: 'Birthdays · school events · family fun', body: 'Plan the fun and a comfortable place for the grown-ups to sit. Confirm the inflatable dimensions and setup clearance with our team.', href: '/category/bounce-house-rentals', label: 'Explore inflatable rentals →' },
  { name: 'Tidal Wave Inflatable Water Slide', slug: 'tidal-wave-inflatable-water-slide', title: 'Make a splash', tag: 'Summer parties · backyard adventures', body: 'Work through space, water access and seating around the fun. Our team confirms the equipment and installation requirements.', href: '/category/bounce-house-rentals', label: 'Explore outdoor rentals →' },
]

const questions = [
  ['Does this preview reserve rental equipment?', 'No. A visual preview helps plan the setup. Friendly Party Rental NYC confirms your event date, rental availability, site requirements, delivery and final pricing before a reservation is finalized.'],
  ['Is the live reception demo my NYC event?', 'The reception scene is a public RentSketch demonstration. It shows the software’s visual planning features; it is not a saved NYC customer order or a confirmation of available inventory.'],
  ['I already booked with Friendly Party Rental NYC. What should I do?', 'Have your order number ready. Use the existing NYC order-access link when available, or contact our Riverdale team for help with your booked setup and any proposed changes.'],
  ['Can I plan a party without a tent?', 'Yes. Talk with our team about your event and usable space. Seating, games, concessions and inflatables can be considered as part of the rental plan, subject to availability and setup requirements.'],
  ['Are the people, flowers and place settings included?', 'Decorative scene details help picture the atmosphere. They are illustrative and are not automatically included in a rental. Your confirmed rental list identifies the equipment in your order.'],
  ['Will a tent or inflatable fit exactly as shown?', 'The visual scene is illustrative. Measure the usable space and tell our team about gates, slopes, trees, overhead lines, utilities and the setup surface so we can confirm required dimensions and clearances.'],
  ['Do you offer customer pickup?', 'Our Riverdale location is delivery only. Our team confirms delivery and any setup requirements for your event.'],
]

export default function DesignYourEventPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Riverdale 2D & 3D Event Layout Planning',
    url: nycUrl('/design-your-event'),
    publisher: { '@id': NYC_BUSINESS_ID },
    about: {
      '@type': 'WebApplication',
      name: 'RentSketch Public Event Design Demonstration',
      url: 'https://rentsketch.com/demo/',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Web browser',
      description: 'Public demonstrations of 2D floor plans and 3D event previews. NYC rental availability and final pricing are confirmed separately.',
    },
  }
  const breadcrumbs = nycBreadcrumbs([{ name: 'Home', path: '/' }, { name: 'Event Layout Planning', path: '/design-your-event' }])
  return <main className={styles.page}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(pageSchema) }} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }} />
    <section className={styles.hero}>
      <div className={styles.wrap}>
        <div className={styles.heroTop}><span className={styles.eyebrow}>Friendly Party Rental NYC × RentSketch</span><span className={styles.smallBadge}><span /> Riverdale, Bronx & Lower Westchester</span></div>
        <div className={styles.cinemaIntro}>
          <p className={styles.kicker}>Imagine it. Arrange it. See it come together.</p>
          <h1>See your event <em>come to life.</em></h1>
          <p className={styles.cinemaSubtitle}>Explore the layout. Picture the tables. Plan your Riverdale celebration with our team.</p>
        </div>
        <div id="quick-demo" className={styles.demoAnchor}><EventDesignVideo /></div>
        <div className={styles.cinemaActions}>
          <Link href="/contact_us" className={styles.primary}>Get Riverdale Layout Help →</Link>
          <Link href="/order-by-date" className={styles.textLink}>Check my event date <ArrowUpRight size={17} /></Link>
          <p className={styles.trust}>32-second RentSketch demonstration <span>·</span> NYC rentals confirmed by our team</p>
        </div>
        <div className={styles.capabilityStrip}><span><Layers3 size={19} /> 2D + 3D previews</span><span><Tent size={19} /> Tents & receptions</span><span><PartyPopper size={19} /> Birthday layouts</span><span><Waves size={19} /> Outdoor celebrations</span></div>
      </div>
    </section>

    <section id="explore-designs" className={`${styles.wrap} ${styles.section}`}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Choose your starting point</p><h2>What are we celebrating?</h2></div><p>Explore rental photos and talk through the pieces that make your event work. Event-date availability and setup requirements are confirmed separately.</p></div>
      <div className={styles.starters}>{starters.map((item, index) => <article key={item.slug} className={styles.starter}>
        <div className={styles.starterImage}><span className={styles.number}>0{index + 1}</span><img src={'/api/item-image/' + item.slug} alt={item.name + ' rental photo'} width={600} height={420} loading="lazy" /><span className={styles.photoLabel}>Rental photo</span></div>
        <div className={styles.starterCopy}><p className={styles.tag}>{item.tag}</p><h3>{item.title}</h3><p>{item.body}</p><Link href={item.href} prefetch={false} className={styles.cardButton}>{item.label}</Link></div>
      </article>)}</div>
      <p className={styles.underCards}>Complete the layout with <Link href="/category/table-chair-rentals">tables and chairs</Link> or <Link href="/category/dance-floor-stage-rentals">a dance floor</Link>. Have a different rental in mind? <Link href="/category">Browse our rental categories</Link> or <Link href="/contact_us">ask our Riverdale team</Link>.</p>
    </section>

    <section className={styles.pricingSection} aria-labelledby="layout-help-heading">
      <div className={styles.wrap}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Plan the real celebration</p><h2 id="layout-help-heading">Start with the setup you want.</h2></div><p>The preview helps explain your ideas. Our team confirms the rentals, site details and delivery for Riverdale, the Bronx and Lower Westchester.</p></div>
        <div className={styles.nycPlanningGrid}>
          <article className={`${styles.pricingCard} ${styles.eventPassCard}`}>
            <p className={styles.priceLabel}>Planning with our Riverdale team</p><h3>From guest count to a workable layout.</h3>
            <ul><li><Check size={18} aria-hidden="true" /> Share your event date and number of guests</li><li><Check size={18} aria-hidden="true" /> Measure the usable setup area and access route</li><li><Check size={18} aria-hidden="true" /> Confirm the rental list, delivery and final quote</li></ul>
            <Link href="/contact_us" className={styles.goldButton}>Get Riverdale Layout Help →</Link>
            <p className={styles.renewal}>Our Riverdale location is delivery only. Equipment and installation requirements are confirmed for your site.</p>
          </article>
          <article className={styles.pricingCard}>
            <p className={styles.priceLabel}>Already have a NYC order?</p><h3>Keep your booking details handy.</h3>
            <p className={styles.bodyCopy}>Use your order number when asking about the setup or proposing a change. Our team confirms changes before they become part of your reservation.</p>
            {nycOrderAccessUrl ? <a href={nycOrderAccessUrl} className={styles.previewPriceButton}>Open existing NYC order access ↗</a> : <Link href="/contact_us" className={styles.previewPriceButton}>Get help with my existing order →</Link>}
          </article>
        </div>
        <p className={styles.pricingSeparation}>RentSketch’s public demo illustrates event planning. It does not reserve equipment or determine your NYC rental total.</p>
      </div>
    </section>

    <section className={styles.tableSection}><div className={`${styles.wrap} ${styles.tableGrid}`}>
      <div className={styles.tableVisual}><span className={styles.tableNote}>A RentSketch event preview</span><Image src="/images/design-your-event-3d-preview.png" alt="Illustrative RentSketch event layout with tent, tables and chairs" width={1200} height={675} className={styles.localTablePreview} /><div className={styles.tableChips}><span>Chair style</span><span>Seat count</span><span>Table placement</span></div></div>
      <div><p className={styles.eyebrow}>Get closer to the details</p><h2>The whole event.<br />Or <em>one beautiful table.</em></h2><p className={styles.bodyCopy}>Consider the chair style, seating and linen choices alongside the whole event. The table close-up in the demo shows how those details change the scene.</p><ol className={styles.miniSteps}><li><span>1</span> Decide how many guests need seating.</li><li><span>2</span> Explore table, chair and linen options.</li><li><span>3</span> Confirm the setup with our Riverdale team.</li></ol></div>
    </div></section>

    <section className={`${styles.wrap} ${styles.section}`}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>More ways to picture your celebration</p><h2>See the space.<br />Feel the possibilities.</h2></div><p>A useful starting point for the practical details. A visual scene for the atmosphere.</p></div>
      <div className={styles.features}>{possibilities.map(({ icon: Icon, title, body }) => <article key={title}><span className={styles.featureIcon}><Icon size={25} /></span><h3>{title}</h3><p>{body}</p></article>)}</div>
      <div className={styles.viewBand}><div><span className={styles.viewNumber}>2D</span><h3>Think through the layout.</h3><p>Consider placement, spacing and guest circulation from above.</p></div><span className={styles.viewDivider}>↔</span><div><span className={styles.viewNumber}>3D</span><h3>Picture the atmosphere.</h3><p>See how the tent, tables and event details work together in a visual scene.</p></div></div>
    </section>

    <section className={styles.faqSection}><div className={`${styles.wrap} ${styles.faqGrid}`}><div><p className={styles.eyebrow}>A few helpful details</p><h2>Before you<br />start exploring.</h2><Link href="/contact_us" className={styles.textLink}>Ask our Riverdale team <ArrowUpRight size={17} /></Link></div><div className={styles.faqs}>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>

    <section className={`${styles.wrap} ${styles.section}`}><div className={styles.finalCard}><div><p className={styles.eyebrow}>From your screen to your celebration</p><h2>Have a layout in mind?<br /><em>Let’s plan the real thing.</em></h2><p>Share your ideas with Friendly Party Rental NYC. Our Riverdale team will help confirm the rental equipment, site details, event-date availability and final quote.</p></div><div className={styles.finalAction}><Link href="/contact_us" className={styles.finalBookingButton}>Plan with our Riverdale team →</Link><Link href="/order-by-date" className={styles.textLink}>Check my event date <ArrowUpRight size={17} /></Link></div></div><p className={styles.disclaimer}>Decorative people, weather, flowers and place settings are illustrative previews, not rental selections. This page presents the <a href="https://rentsketch.com/demo/" target="_blank" rel="noopener noreferrer">public RentSketch demonstration</a>; your NYC rental list and reservation are confirmed separately.</p></section>
  </main>
}
