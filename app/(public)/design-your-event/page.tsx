import Image from 'next/image'
import Link from 'next/link'
import { ArrowUpRight, Check, Move, MoonStar, Layers3, Armchair, Undo2, Tent, PartyPopper, Waves } from 'lucide-react'
import DesignYourEventCTA from '@/components/public/DesignYourEventCTA'
import EventDesignVideo from '@/components/public/EventDesignVideo'
import RentSketchBookingEntry from '@/components/public/RentSketchBookingEntry'
import { nycRentSketchDesignerUrl as rentSketchPlanningUrl } from '@/lib/nycRentSketch'
import { nycPageMetadata, nycBreadcrumbs, nycUrl, NYC_BUSINESS_ID } from '@/lib/nycSeo'
import { safeJsonLd } from '@/lib/jsonLd'
import styles from './design.module.css'

export const metadata = nycPageMetadata(
  '/design-your-event',
  'Free 2D & 3D Event Layout Planner | Riverdale, Bronx & Lower Westchester',
  'Plan your Friendly Party Rental NYC event in 2D and 3D for free. Arrange Riverdale rentals, save your layout and send it to our team for a quote. No design fee or card required.',
)

const possibilities = [
  { icon: Move, title: 'Make room for the moments.', body: 'Place, move and rotate rentals. Work out where guests will sit, mingle and dance in the same event layout.' },
  { icon: MoonStar, title: 'See a different atmosphere.', body: 'Explore day and night, rain, preview guests and animated activity with the 3D Scene controls.' },
  { icon: Armchair, title: 'Give every table some attention.', body: 'Select a table and open Table details to choose chairs, adjust seats, and try compatible linens and colors.' },
  { icon: Undo2, title: 'Try it. Change it. Make it yours.', body: 'Experiment with arrangements, duplicate items and use undo or redo as your plan comes together.' },
]
const questions = [
  ['Do I have to pay to use RentSketch with Friendly Party Rental NYC?', 'No. Friendly Party Rental NYC shoppers can use the Friendly RentSketch planner without a design fee or card. RentSketch helps you plan a setup; rentals are only reserved after Friendly confirms availability and your order.'],
  ['I already booked with Friendly. Can I still use RentSketch?', 'Yes. Use the same free RentSketch planner as everyone else. No separate order login is required. If you want to change rentals on an existing booking, send the updated plan to Friendly for confirmation.'],
  ['Does my design reserve the rentals?', 'No. Send the design through Review & Quote so our team can confirm your event date, item availability, delivery, installation requirements and final pricing.'],
  ['Can I design a party without a tent?', 'Yes. Start with a bounce house or waterslide below to open an outdoor layout with that rental and no tent, then add seating and other equipment.'],
  ['How do I customize just one table?', 'In the designer, add a table and select it. Choose Table details for a close-up with chair, seat-count and compatible linen controls.'],
  ['Are the people, flowers and place settings included?', 'Those scene details help you picture the atmosphere. They are decorative previews, not rental selections. Check the item list in Review & Quote for the equipment in your plan.'],
  ['Will the inflatable fit exactly as shown?', 'Inflatable models and animated children are illustrative. Confirm the rental’s dimensions and required setup clearance with our team before deciding where to install it.'],
  ['Do you offer customer pickup?', 'Our Riverdale location is delivery only. Our team confirms delivery and setup requirements for your event.'],
  ['Can I use it on my phone?', 'Yes, the designer opens in your browser. If 3D cannot load on your device, use the 2D option to continue planning. A larger screen gives you more space to arrange details.'],
]

export default function DesignYourEventPage() {
  const pageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Riverdale Free 2D & 3D Event Layout Planner',
    url: nycUrl('/design-your-event'),
    publisher: { '@id': NYC_BUSINESS_ID },
    about: {
      '@type': 'WebApplication',
      name: 'Friendly Party Rental NYC RentSketch Planner',
      url: rentSketchPlanningUrl('nyc_structured_data'),
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Web browser',
      description: 'Free 2D and 3D event planning with Riverdale rental equipment. Rental availability, delivery, installation and final pricing are confirmed separately.',
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
          <p className={styles.cinemaSubtitle}>Build your layout. Style the tables. Explore the whole celebration in 3D.</p>
        </div>
        <RentSketchBookingEntry />
        <div id="quick-demo"><EventDesignVideo /></div>
        <div className={styles.cinemaActions}>
          <a href="#quick-demo" className={styles.primary}>Watch the quick demo →</a>
          <a href="#explore-designs" className={styles.textLink}>Choose a rental to preview <ArrowUpRight size={17} /></a>
          <p className={styles.trust}>32-second walkthrough <span>·</span> <a href={rentSketchPlanningUrl("design_page_trust")}>Start planning free</a></p>
        </div>
        <div className={styles.capabilityStrip}><span><Layers3 size={19} /> 2D + 3D layouts</span><span><Tent size={19} /> Tents & receptions</span><span><PartyPopper size={19} /> Bounce house parties</span><span><Waves size={19} /> Waterslide days</span></div>
      </div>
    </section>

    <section id="explore-designs" className={`${styles.wrap} ${styles.section}`}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Choose your starting point</p><h2>What are we celebrating?</h2></div><p>See the real rental photo first. Choose a starting rental, then continue planning the full setup in RentSketch for free.</p></div>
      <div className={styles.starters}>
        {[
          { name: '20x20 Pole Tent', slug: '20x20-pole-tent', title: 'Under the tent', type: 'tent', tag: 'Receptions · graduations · gatherings', body: 'Start with a pole tent, then try a party setup or arrange tables, chairs and a dance floor your way.' },
          { name: 'Rainbow Castle Bounce House', slug: 'crayon-bounce-house', title: 'Big birthday energy', type: 'inflatable', tag: 'Birthdays · school events · family fun', body: 'Preview a bounce house with animated activity in an outdoor layout. Add a place for the grown-ups to sit, too.' },
          { name: 'Tidal Wave Inflatable Water Slide', slug: 'tidal-wave-inflatable-water-slide', title: 'Make a splash', type: 'inflatable', tag: 'Summer parties · backyard adventures', body: 'Explore a waterslide scene without a tent, then plan the seating and other rentals around the fun.' },
        ].map((item, index) => <article key={item.slug} className={styles.starter}>
          <div className={styles.starterImage}><span className={styles.number}>0{index + 1}</span><Image src={'/api/item-image/' + item.slug} alt={item.name + ' rental photo'} fill sizes="(max-width: 700px) calc(100vw - 40px), 390px" quality={65} /><span className={styles.photoLabel}>Rental photo</span></div>
          <div className={styles.starterCopy}><p className={styles.tag}>{item.tag}</p><h3>{item.title}</h3><p>{item.body}</p>{item.type === 'tent' ? <Link href={'/items/' + item.slug} className={styles.cardButton}>View tent details →</Link> : <DesignYourEventCTA source={'design_page_' + item.slug} label="Free event preview →" product={item.name} productSlug={item.slug} productType="inflatable" className={styles.cardButton} />}</div>
        </article>)}
      </div>
      <p className={styles.underCards}>Have a different rental in mind? <Link href="/category/tent-rentals">Browse tent photos</Link> or <Link href="/category/bounce-house-rentals">bounce houses & waterslides</Link>.</p>
    </section>

    <section id="pricing" className={styles.pricingSection} aria-labelledby="rentsketch-pricing-heading">
      <div className={styles.wrap}>
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>Friendly planning tool</p><h2 id="rentsketch-pricing-heading">Plan first. Quote the setup you actually want.</h2></div><p>No design fee. No card. RentSketch stays separate as a product, but Friendly customers use it as part of the rental-shopping experience.</p></div>
        <div className={styles.pricingGrid}>
          <article className={`${styles.pricingCard} ${styles.eventPassCard}`}>
            <p className={styles.priceLabel}>Planning with Friendly</p>
            <h3>Build your event before you book.</h3>
            <p className={styles.priceAmount}>Free</p>
            <p className={styles.priceTerms}>Friendly Party Rental NYC shoppers · No card required</p>
            <ul><li><Check size={18} aria-hidden="true" /> Arrange Friendly rentals in 2D &amp; 3D</li><li><Check size={18} aria-hidden="true" /> Save and revise the layout as your plan changes</li><li><Check size={18} aria-hidden="true" /> Send the exact setup to Friendly for a quote</li></ul>
            <a href={rentSketchPlanningUrl('design_page_free')} className={styles.goldButton}>Plan My Event — Free</a>
            <p className={styles.renewal}>Powered by RentSketch. Rental equipment, delivery, installation and availability are confirmed separately.</p>
          </article>

        </div>
        <p className={styles.pricingSeparation}>A RentSketch layout is a planning tool, not a reservation. Friendly confirms the final rental list, setup requirements, availability and price.</p>
      </div>
    </section>

    <section className={styles.tableSection}><div className={`${styles.wrap} ${styles.tableGrid}`}>
      <div className={styles.tableVisual}><span className={styles.tableNote}>One table. Your finishing touches.</span><img src="https://rentsketch.com/assets/equipment/round-linen.png" alt="RentSketch illustration of a round table with linen" width={640} height={480} loading="lazy" /><div className={styles.tableChips}><span>Chair style</span><span>Seat count</span><span>Linen & color</span></div></div>
      <div><p className={styles.eyebrow}>Get closer to the details</p><h2>The whole event.<br />Or <em>one beautiful table.</em></h2><p className={styles.bodyCopy}>Try a different chair. Adjust the seating. Find a linen that fits and a color that feels right. Table details lets you focus on one table while keeping it connected to your event.</p><ol className={styles.miniSteps}><li><span>1</span> Add a table to your layout.</li><li><span>2</span> Select it and choose <strong>Table details</strong>.</li><li><span>3</span> Customize, then return to your event.</li></ol></div>
    </div></section>

    <section className={`${styles.wrap} ${styles.section}`}>
      <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>More ways to make it yours</p><h2>See the space.<br />Feel the possibilities.</h2></div><p>A useful plan for the practical details. A visual scene for the atmosphere.</p></div>
      <div className={styles.features}>{possibilities.map(({ icon: Icon, title, body }) => <article key={title}><span className={styles.featureIcon}><Icon size={25} /></span><h3>{title}</h3><p>{body}</p></article>)}</div>
      <div className={styles.viewBand}><div><span className={styles.viewNumber}>2D</span><h3>Get the layout right.</h3><p>See placement and spacing from above. Move and rotate the pieces as your plan takes shape.</p></div><span className={styles.viewDivider}>↔</span><div><span className={styles.viewNumber}>3D</span><h3>Look around your idea.</h3><p>Explore the setting, preview people and try a different time of day from the Scene menu.</p></div></div>
    </section>

    <section className={styles.faqSection}><div className={`${styles.wrap} ${styles.faqGrid}`}><div><p className={styles.eyebrow}>A few helpful details</p><h2>Before you<br />start exploring.</h2><Link href="/contact_us" className={styles.textLink}>Ask our team <ArrowUpRight size={17} /></Link></div><div className={styles.faqs}>{questions.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>

    <section className={`${styles.wrap} ${styles.section}`}><div className={styles.finalCard}><div><p className={styles.eyebrow}>From your screen to your celebration</p><h2>Love the layout?<br /><em>Let’s plan the real thing.</em></h2><p>Use Review & Quote inside the designer to send your plan to Friendly Party Rental NYC. We’ll help confirm the rentals, site details, availability and final price.</p></div><div className={styles.finalAction}><a href={rentSketchPlanningUrl("design_page_final")} className={styles.finalBookingButton}>Plan my event free →</a></div></div><p className={styles.disclaimer}>Decorative people, weather, flowers and place settings are previews, not rental selections. Friendly Party Rental NYC uses <a href="https://rentsketch.com/party-rental-software/" target="_blank" rel="noopener">RentSketch party rental software</a> for this visual event-planning experience.</p></section>
  </main>
}
