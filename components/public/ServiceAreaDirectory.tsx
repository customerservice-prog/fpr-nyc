'use client'
import {useState} from 'react'
import Link from 'next/link'
import {MapPin,Search,X} from 'lucide-react'
import {NYC_SERVICE_AREAS} from '@/lib/nycServiceAreas'
import styles from './ScServiceArea.module.css'
export default function ServiceAreaDirectory(){
 const [query,setQuery]=useState('');const term=query.trim().toLowerCase()
 const filtered=NYC_SERVICE_AREAS.filter(area=>(area.name+' '+area.zips.join(' ')).toLowerCase().includes(term))
 return <section id="communities" className={`${styles.wrap} ${styles.directory}`} data-nyc-service-directory aria-labelledby="communities-heading">
  <div className={styles.directoryHeader}><div><p className={styles.eyebrow}>Close to your event</p><h2 id="communities-heading">Find your community</h2><p>Search the current NYC / Lower Westchester delivery directory by community or ZIP code.</p></div><div className={styles.citySearch}><label htmlFor="service-area-search">Search community or ZIP code</label><div><Search size={18}/><input id="service-area-search" type="search" placeholder="Try Yonkers or 10701" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" onClick={()=>setQuery('')} aria-label="Clear community search"><X size={17}/></button>}</div></div></div>
  <p className={styles.directoryCount} role="status">{term?`${filtered.length} ${filtered.length===1?'community matches':'communities match'} your search`:`${NYC_SERVICE_AREAS.length} listed service areas`}</p>
  <ul className={styles.cityGrid}>{filtered.map(area=><li key={area.slug}><Link href={area.href} prefetch={false}><span className={styles.cityIcon}><MapPin size={17}/></span><span><strong>{area.name}, NY</strong><small>ZIP {area.zips.join(', ')}</small></span><span aria-hidden="true">→</span></Link></li>)}</ul>
  {!filtered.length&&<div className={styles.noResults}><h3>Don’t see your area?</h3><p>Contact the NYC team to confirm whether your event address is inside the current delivery area.</p><a href="tel:+13158841498">Call 315-884-1498</a><button type="button" onClick={()=>setQuery('')}>Show all service areas</button></div>}
 </section>
}
