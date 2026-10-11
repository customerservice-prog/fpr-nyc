import { nycRentSketchDesignerUrl } from '@/lib/nycRentSketch'
import styles from './RentSketchAccessOptions.module.css'

export default function RentSketchAccessOptions({
  source,
  showDetails = false,
  compact = false,
}: {
  source: string
  showDetails?: boolean
  compact?: boolean
}) {
  return <div className={`${styles.choices} ${compact ? styles.compact : ''}`} data-rentsketch-access="20261011-free-friendly-nyc-single-path" aria-label="Plan your Riverdale event with RentSketch">
    <div className={styles.grid}>
      <article className={`${styles.card} ${styles.paid}`}>
        <p className={styles.eyebrow}>Free Friendly NYC event planner</p>
        <h3>See what fits before you book</h3>
        <p className={styles.price}>FREE<span>for Friendly Party Rental NYC customers and shoppers</span></p>
        <p className={styles.term}>No design fee · No card · No order number required</p>
        <p className={styles.copy}>Enter your event address, confirm your usable space and guest count, then build the setup in 2D &amp; 3D. Use Review &amp; Quote to send it to our Riverdale team.</p>
        <a data-rentsketch-planner href={nycRentSketchDesignerUrl(source)} className={styles.buy}>Plan My Event — Free</a>
        <p className={styles.fine}>Already booked? Use the same free planner. Your rental order only changes after Friendly Party Rental NYC confirms any requested changes.</p>
      </article>
    </div>
    <div className={styles.links}>
      {!compact && <a href="/design-your-event#quick-demo" className={styles.preview}>Watch the quick RentSketch demo</a>}
      {showDetails && <a href="/design-your-event">See how Friendly NYC uses RentSketch</a>}
    </div>
    <p className={styles.separation}>Powered by RentSketch. Friendly Party Rental NYC uses it as a planning and quoting tool; your rental is not reserved or changed until our Riverdale team confirms it.</p>
  </div>
}
