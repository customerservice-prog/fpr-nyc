import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CalendarDays, MapPin, MessageCircle, Phone, Truck } from 'lucide-react'
import DeliveryFeeChecker from '@/components/public/DeliveryFeeChecker'
import ServiceAreaDirectory from '@/components/public/ServiceAreaDirectory'
import {scPageMetadata,scBreadcrumbs,SC_BUSINESS_ID,scUrl} from '@/lib/nycSeo'
import {SC_PRIORITY_AREAS,NYC_SERVICE_AREAS} from '@/lib/nycServiceAreas'
import {safeJsonLd} from '@/lib/jsonLd'
import styles from '@/components/public/NycServiceArea.module.css'

export const metadata=scPageMetadata('/service-area','Party Rental Delivery Areas & Fee Checker — Greenville, SC','Check your delivery fee and explore Friendly Party Rental service areas across Greenville and 34 nearby Upstate South Carolina communities.')

export default function ServiceAreaPage(){
 const schema={'@context':'https://schema.org','@type':'Service','@id':scUrl('/service-area')+'#delivery',name:'Party rental delivery in Greenville and Upstate South Carolina',serviceType:'Party and event equipment rental delivery',provider:{'@id':SC_BUSINESS_ID},areaServed:NYC_SERVICE_AREAS.map(a=>({'@type':'Place',name:a.name+', SC'})),url:scUrl('/service-area')}
 const priority=SC_PRIORITY_AREAS.map(slug=>NYC_SERVICE_AREAS.find(area=>area.slug===slug)).filter(Boolean) as typeof NYC_SERVICE_AREAS
 return <div className={styles.page}>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(schema)}}/>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:safeJsonLd(scBreadcrumbs([{name:'Home',path:'/'},{name:'South Carolina Delivery Areas',path:'/service-area'}]))}}/>
  <DeliveryFeeChecker/>

  <section className={`${styles.wrap} ${styles.hero}`} aria-labelledby="service-area-heading">
   <div>
    <p className={styles.eyebrow}>Greenville &amp; Upstate South Carolina</p>
    <h1 id="service-area-heading">Your party rentals.<br/><span>Delivered to your event.</span></h1>
    <p className={styles.heroCopy}>Friendly Party Rental delivers tents, tables, chairs, inflatables, linens and event equipment throughout Greenville and nearby Upstate communities. Check your travel fee first, then shop the rentals available for your event date.</p>
    <div className={styles.heroActions}>
     <Link href="/order-by-date" prefetch={false} className={styles.primaryLink}><CalendarDays size={18}/> Check your event date</Link>
     <a href="#communities" className={styles.secondaryLink}>See all service areas <ArrowRight size={16}/></a>
    </div>
   </div>
   <div className={styles.heroPhoto}>
    <Image src="/images/event-planning/tent-patio-setup/image.png" alt="Shared Friendly Party Rental tent and event setup inspiration" fill sizes="(max-width: 767px) 100vw, 45vw"/>
    <div className={styles.photoShade}/>
    <div className={styles.photoCaption}><MapPin size={24}/><div><strong>Greenville-area delivery</strong><span>Shared Friendly Party Rental event inspiration; not presented as a Greenville event.</span></div></div>
   </div>
  </section>

  <div className={styles.facts}><div className={`${styles.wrap} ${styles.factsInner}`}>
   <div className={styles.fact}><Truck size={22}/><div><strong>Delivery-only storefront</strong><span>No customer warehouse pickup.</span></div></div>
   <div className={styles.fact}><MapPin size={22}/><div><strong>35 listed communities</strong><span>Greenville plus 34 nearby Upstate areas.</span></div></div>
   <div className={styles.fact}><MessageCircle size={22}/><div><strong>Check the travel fee first</strong><span>ZIP-based estimate before checkout.</span></div></div>
  </div></div>

  <ServiceAreaDirectory/>

  <section className={styles.guidesBand}><div className={`${styles.wrap} ${styles.guides}`}>
   <p className={styles.eyebrow}>Popular nearby areas</p>
   <h2>Start with a local rental guide</h2>
   <p className={styles.sectionIntro}>These are delivery-area guides for the Greenville operation—not separate storefronts or warehouse locations.</p>
   <div className={styles.guideGrid}>{priority.map(area=><Link key={area.slug} href={area.href} prefetch={false} className={styles.guideLink}>{area.name}, SC <ArrowRight size={15}/></Link>)}</div>
  </div></section>

  <section className={`${styles.wrap} ${styles.contact}`}>
   <div><h2>Don’t see your town?</h2><p>We may still be able to deliver. Share your event ZIP, date and equipment list and our Greenville team can confirm whether the location is within the current delivery area and what travel fee applies.</p></div>
   <div className={styles.contactActions}><a href="tel:+18646105324" className={styles.secondaryLink}><Phone size={17}/> 864-610-5324</a><a href="sms:+18646105324" className={styles.secondaryLink}><MessageCircle size={17}/> Text us</a></div>
  </section>

  <section className={`${styles.wrap} ${styles.bookingWrap}`}><div className={styles.booking}>
   <div><p className={styles.goldEyebrow}>Ready to plan?</p><h2>Check your date, then build the order.</h2><p>Browse the same Greenville catalog used at checkout. Travel fees, tax, availability and any optional services are confirmed before payment.</p></div>
   <div className={styles.bookingActions}><Link href="/order-by-date" prefetch={false} className={styles.primaryLink}>Check my date <ArrowRight size={17}/></Link><Link href="/category/tent-rentals" prefetch={false} className={styles.secondaryLink}>Browse tents</Link><Link href="/category/table-chair-rentals" prefetch={false} className={styles.secondaryLink}>Tables &amp; chairs</Link></div>
  </div></section>
 </div>
}
