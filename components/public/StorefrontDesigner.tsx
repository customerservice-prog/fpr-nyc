import Link from 'next/link'
import { Armchair, LayoutGrid, Send } from 'lucide-react'
import RentSketchAccessOptions from './RentSketchAccessOptions'
import styles from './StorefrontDesigner.module.css'

const features = [
  { icon: LayoutGrid, title: 'Plan the space', body: 'Work through placement, seating and room to move.' },
  { icon: Armchair, title: 'Picture the details', body: 'Explore the look of tents, furniture, linens and lighting.' },
  { icon: Send, title: 'Review & Quote', body: 'Send your layout to our Riverdale team to confirm rentals, availability and final pricing.' },
]

export default function StorefrontDesigner() {
  return <section className={styles.section} id="design-your-event" aria-labelledby="home-designer-heading" data-home-section="designer">
    <div className={styles.container}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}><span>RentSketch</span> See it before you book</p>
        <h2 id="home-designer-heading" className={styles.heading}>Not Sure What Fits Your Event?</h2>
        <p className={styles.body}>Preview RentSketch below, then use the free planner to build your Riverdale rental setup in 2D and 3D and send it to our team for a quote.</p>
        <div className={styles.quickProof} aria-label="RentSketch demo highlights"><span>2D floor plan</span><span>3D event preview</span><span>Evening lighting</span><span>Reception setup</span></div>
      </div>

      <div className={styles.productStage}>
        <div className={styles.livePreview} data-rentsketch-live-home-preview>
          <iframe title="Public RentSketch wedding reception build demonstration" src="https://rentsketch.com/embed/wedding-build/" loading="lazy" allow="fullscreen" referrerPolicy="strict-origin-when-cross-origin" />
          <div className={styles.livePreviewFooter}>
            <p>A public RentSketch demonstration of a reception build, 2D layout and evening lighting. The scene illustrates the software; our team confirms your NYC rentals and site requirements.</p>
            <a href="https://rentsketch.com/demo/" target="_blank" rel="noopener noreferrer">Open full RentSketch demo ↗</a>
          </div>
        </div>
      </div>

      <div className={styles.accessWrap}>
        <RentSketchAccessOptions source="home_designer_section" compact showDetails />
      </div>

      <div className={styles.features}>{features.map(({ icon: Icon, title, body }) => <div key={title} className={styles.feature}><span className={styles.icon}><Icon size={22} aria-hidden="true" /></span><div><h3>{title}</h3><p>{body}</p></div></div>)}</div>
      <p className={styles.note}>A preview is a starting point. Friendly Party Rental NYC confirms availability, delivery, setup requirements and final pricing. <Link href="/design-your-event">Explore event planning →</Link></p>
    </div>
  </section>
}
