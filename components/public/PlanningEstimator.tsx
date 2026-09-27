'use client'

import Image from 'next/image'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, CheckCircle2, Clipboard, Heart, ImageOff, Loader2, MapPin, Minus, Plus, Printer, RotateCcw, Save, Search, Sparkles, Trash2, Users, Wand2 } from 'lucide-react'
import { planningServices } from '@/lib/eventPlanning'
import { fetchDeliveryEstimate, type DeliveryEstimate } from '@/lib/deliveryEstimate'
import { calculateEstimate, estimateInquiry, estimatePackages, initialEstimate, integer, money, normalizeEstimateItems, recommendedPackage, sanitizeEstimate, sanitizeSelections, ESTIMATE_EVENT, ESTIMATE_STORAGE_KEY, EXTRA_PLANNING_RATE, MAX_RENTAL_QUANTITY, MAX_RENTAL_SELECTIONS, type EstimateDetails, type EstimateItem, type PlanningProgress } from '@/lib/planningEstimator'
import styles from './PlanningEstimator.module.css'

const steps = ['Your event', 'Planning', 'Rentals', 'Your estimate']
const progressOptions: { value: PlanningProgress; title: string; description: string }[] = [
  { value: 'ready', title: 'Everything is booked', description: 'Help on the day itself' },
  { value: 'mostly', title: 'Mostly planned', description: 'Connect the final details' },
  { value: 'some', title: 'A few things booked', description: 'Help with the work ahead' },
  { value: 'starting', title: 'Starting from an idea', description: 'Support from the beginning' },
]
const priorityCategories = ['tent-rentals', 'table-chair-rentals', 'linen-rentals', 'event-lighting-rentals', 'dance-floor-stage-rentals', 'photobooth-rentals']
type SavedEstimate = { version: 1; savedAt: number; details: EstimateDetails; selections: Record<string, number> }
type DeliveryState = { status: 'idle' | 'loading' | 'ready' | 'error'; zip: string; estimate?: DeliveryEstimate; error?: string }

function Photo({ src, alt, contain = false, sizes = '(max-width: 767px) 42vw, 260px' }: { src: string; alt: string; contain?: boolean; sizes?: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  return <div className={styles.photo}>{failed ? <span><ImageOff size={16} aria-hidden="true"/> Photo unavailable</span> : <Image src={src} alt={alt} fill sizes={sizes} className={contain ? 'object-contain' : 'object-cover'} onError={() => setFailed(true)}/>}</div>
}
function NumberInput({ value, onChange, label, min = 0, max = 10000, className = '' }: { value: number; onChange: (value: number) => void; label: string; min?: number; max?: number; className?: string }) {
  const [raw, setRaw] = useState(String(value))
  useEffect(() => setRaw(String(value)), [value])
  return <input aria-label={label} className={className} type="number" inputMode="numeric" min={min} max={max} step="1" value={raw} onChange={event => {
    const next = event.target.value; setRaw(next)
    if (/^\d+$/.test(next) && Number(next) >= min && Number(next) <= max) onChange(Number(next))
  }} onBlur={() => { const next = integer(raw, value, min, max); setRaw(String(next)); onChange(next) }}/>
}

export default function PlanningEstimator({ initialType = '' }: { initialType?: string }) {
  const [details, setDetails] = useState<EstimateDetails>(() => ({ ...initialEstimate(initialType), ...(initialType === 'Festival / fundraiser' ? { packageNumber: 0 } : {}) }))
  const [step, setStep] = useState(0)
  const [selections, setSelections] = useState<Record<string, number>>({})
  const [items, setItems] = useState<EstimateItem[]>([])
  const [catalogDate, setCatalogDate] = useState<string | null>(null)
  const [catalogStatus, setCatalogStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [catalogError, setCatalogError] = useState('')
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('all')
  const [visibleCount, setVisibleCount] = useState(12)
  const [chairId, setChairId] = useState('')
  const [tableId, setTableId] = useState('')
  const [delivery, setDelivery] = useState<DeliveryState>({ status: 'idle', zip: '' })
  const [saved, setSaved] = useState<SavedEstimate | null>(null)
  const [message, setMessage] = useState('')
  const [resetRequested, setResetRequested] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const deliveryAbort = useRef<AbortController | null>(null)
  const catalogRequested = step >= 2 || Object.keys(selections).length > 0
  const currentItems = catalogDate === details.eventDate ? items : []
  const currentDelivery = delivery.zip === details.zip ? delivery : { status: 'idle' as const, zip: details.zip }
  const deliveryFee = currentDelivery.status === 'ready' && !currentDelivery.estimate?.needsConfirmation ? currentDelivery.estimate?.fee ?? null : null
  const estimate = useMemo(() => calculateEstimate(details, currentItems, selections, deliveryFee), [details, currentItems, selections, deliveryFee])
  const recommendation = recommendedPackage(details)
  const selectedEvent = planningServices.find(s => s.type === details.eventType) || planningServices[0]
  const inquiry = estimateInquiry(details, estimate)
  const isCheckingCatalog = catalogRequested && (catalogStatus === 'loading' || catalogDate !== details.eventDate) && catalogStatus !== 'error'
  const missingPrices = estimate.unpriced.length > 0
  const subtotalLabel = isCheckingCatalog && Object.keys(selections).length ? 'Rechecking rental prices…' : money(estimate.subtotalCents / 100)
  const categories = Array.from(new Map(currentItems.map(item => [item.categorySlug, item.category])).entries())
  const filtered = currentItems.filter(item => (category === 'all' || item.categorySlug === category) && (!search.trim() || (item.name + ' ' + item.category).toLowerCase().includes(search.trim().toLowerCase()))).sort((a, b) => {
    const rank = (slug: string) => priorityCategories.includes(slug) ? priorityCategories.indexOf(slug) : 99
    return rank(a.categorySlug) - rank(b.categorySlug)
  })
  const chairOptions = currentItems.filter(item => /\bchair\b/i.test(item.name) && !/cover|sash|package|table|throne/i.test(item.name))
  const tableOptions = currentItems.filter(item => /\btable\b/i.test(item.name) && !/cocktail|cover|linen|package|chill|chair/i.test(item.name))

  function update<K extends keyof EstimateDetails>(key: K, value: EstimateDetails[K]) {
    setDetails(previous => ({ ...previous, [key]: value }))
    setMessage(''); setResetRequested(false)
  }
  function go(next: number) {
    setStep(Math.max(0, Math.min(3, next)))
    setMessage('')
    requestAnimationFrame(() => { headingRef.current?.focus({ preventScroll: true }); headingRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' }) })
  }
  function changeQuantity(id: string, quantity: number) {
    const nextQuantity = integer(quantity, 0, 0, MAX_RENTAL_QUANTITY)
    if (!selections[id] && nextQuantity && Object.keys(selections).length >= MAX_RENTAL_SELECTIONS) { setMessage('You can include up to 24 different rentals. Mention additional items in your consultation notes.'); return }
    setSelections(previous => { const next = { ...previous }; if (nextQuantity) next[id] = nextQuantity; else delete next[id]; return next })
    setMessage('')
  }
  useEffect(() => {
    try {
      const raw = localStorage.getItem(ESTIMATE_STORAGE_KEY)
      if (!raw) return
      const value = JSON.parse(raw)
      if (value?.version === 1 && typeof value.savedAt === 'number' && value.savedAt <= Date.now() && Date.now() - value.savedAt < 30 * 86400000) setSaved({ version: 1, savedAt: value.savedAt, details: sanitizeEstimate(value.details, initialType), selections: sanitizeSelections(value.selections) })
    } catch { /* Storage is optional, including private browsing. */ }
    return () => deliveryAbort.current?.abort()
  }, [initialType])
  useEffect(() => {
    if (!catalogRequested) return
    const controller = new AbortController()
    let active = true
    const date = details.eventDate
    setCatalogStatus('loading'); setCatalogError('')
    const timeout = setTimeout(() => controller.abort(), 20000)
    fetch('/api/items' + (date ? '?date=' + encodeURIComponent(date + 'T12:00:00') : ''), { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error('The rental catalog is unavailable. Try again or continue with planning only.')
      const data = await response.json()
      if (!Array.isArray(data?.items)) throw new Error('Rental prices could not be confirmed. Please try again.')
      if (active) { setItems(normalizeEstimateItems(data.items)); setCatalogDate(date); setCatalogStatus('ready') }
    }).catch(error => {
      if (active) { setItems([]); setCatalogDate(date); setCatalogStatus('error'); setCatalogError(error?.name === 'AbortError' ? 'The rental catalog took too long to respond. Please try again.' : error.message) }
    }).finally(() => clearTimeout(timeout))
    return () => { active = false; clearTimeout(timeout); controller.abort() }
  }, [catalogRequested, details.eventDate, catalogAttempt])
  useEffect(() => { setVisibleCount(12) }, [search, category])
  useEffect(() => { deliveryAbort.current?.abort(); setDelivery({ status: 'idle', zip: details.zip }) }, [details.zip])

  async function checkDelivery() {
    const zip = details.zip.trim()
    if (!/^\d{5}$/.test(zip)) { setDelivery({ status: 'error', zip: details.zip, error: 'Enter your five-digit event ZIP code.' }); return }
    deliveryAbort.current?.abort()
    const controller = new AbortController(); deliveryAbort.current = controller
    setDelivery({ status: 'loading', zip })
    const timeout = setTimeout(() => controller.abort(), 15000)
    try {
      const value = await fetchDeliveryEstimate(zip, controller.signal)
      if (!controller.signal.aborted) setDelivery({ status: 'ready', zip, estimate: value })
    } catch (error) {
      if (deliveryAbort.current === controller) setDelivery({ status: 'error', zip, error: error instanceof Error && error.name !== 'AbortError' ? error.message : 'Delivery pricing is taking longer than expected. Please try again.' })
    } finally { clearTimeout(timeout) }
  }
  function saveProgress() {
    try {
      localStorage.setItem(ESTIMATE_STORAGE_KEY, JSON.stringify({ version: 1, savedAt: Date.now(), details: sanitizeEstimate(details), selections: sanitizeSelections(selections) }))
      setMessage('Saved on this device for 30 days. Prices and availability are checked again when you resume.')
    } catch { setMessage('This browser could not save your progress. Use Copy estimate on the last step instead.') }
  }
  function reset() {
    if (!resetRequested) { setResetRequested(true); setMessage('Start over? Press Confirm reset to clear this estimate and its saved copy.'); return }
    setDetails(initialEstimate(initialType)); setSelections({}); setStep(0); setSaved(null); setResetRequested(false); setMessage('Estimate cleared.')
    try { localStorage.removeItem(ESTIMATE_STORAGE_KEY) } catch { /* Optional storage. */ }
  }
  async function copyEstimate() {
    try { await navigator.clipboard.writeText(inquiry.summary); setMessage('Estimate copied. It is a planning reference, not a confirmed quote.') }
    catch { setMessage('Clipboard access is unavailable. Use Print estimate or send the details to our team below.') }
  }
  function sendToConsultation() {
    window.dispatchEvent(new CustomEvent(ESTIMATE_EVENT, { detail: inquiry }))
    const target = document.getElementById('planning-inquiry')
    target?.scrollIntoView({ behavior: 'auto', block: 'start' })
    const name = target?.querySelector<HTMLInputElement>('[name="name"]')
    name?.focus({ preventScroll: true })
    setMessage('Your estimate was added to the consultation form. Complete your contact details to send it.')
  }

  return <section id="event-estimator" data-planning-estimator className={styles.studio} aria-labelledby="event-estimator-title">
    <header className={styles.banner}>
      <div className={styles.bannerText}><p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true"/> Your event, brought together</p><h2 id="event-estimator-title">Picture it.<br/>Plan it. Price it.</h2><p>Build a realistic starting estimate using your event details, planning package, real rental photos and current base catalog prices. We’ll show what is included, what is still an estimate, and what our office must confirm before booking.</p></div>
      <div className={styles.bannerPhotos} aria-hidden="true"><Photo src="/images/event-planning/ceremony-deck/image.png" alt=""/><Photo src="/images/event-planning/tent-patio-setup/image.png" alt=""/><Photo src="/images/event-planning/outdoor-tent-setup/image.png" alt=""/></div>
    </header>
    {saved && <div className={styles.savedBar}><Save size={15}/><span>You have a saved event estimate on this device.</span><button onClick={() => { setDetails(saved.details); setSelections(saved.selections); setSaved(null); setMessage('Saved choices restored. Current prices are being checked.'); }}>Resume estimate</button><button onClick={() => setSaved(null)}>Not now</button></div>}
    <div className={styles.topline}>
      <nav className={styles.steps} aria-label="Estimate steps">{steps.map((label, index) => <Fragment key={label}>{index > 0 && <span className={styles.stepLine} aria-hidden="true"/>}<button type="button" className={styles.step} aria-current={step === index ? 'step' : undefined} onClick={() => go(index)}><span>{index < step ? <Check size={13} aria-hidden="true"/> : index + 1}</span>{label}</button></Fragment>)}</nav>
      <p className={styles.topPrice}>{subtotalLabel}<small>Estimated known charges<br/>Not your final quote</small></p>
    </div>
    <div className={styles.body}>
      <div className={styles.main}>
        <div className={styles.panel} data-estimator-step={step}>
          <p className={styles.eyebrow}>Step {step + 1} of 4 · {steps[step]}</p>
          <h3 ref={headingRef} tabIndex={-1} style={{ scrollMarginTop: 110 }}>{['What are we celebrating?', 'The right support for your day.', 'Make the space your own.', 'Your event, at a glance.'][step]}</h3>
          {step === 0 && <>
            <p className={styles.intro}>Start with your vision. Your choices stay with you as you explore planning and rentals.</p><div className={styles.infoGrid}><div className={styles.infoCard}><Users size={18}/><strong>Guest count drives quantities</strong><span>We use it to suggest seating and tables. It does not raise your planning-package price by itself.</span></div><div className={styles.infoCard}><CalendarDays size={18}/><strong>Your date checks inventory</strong><span>Add a date to see date-based availability context for rentals. Nothing is held until an order is booked.</span></div><div className={styles.infoCard}><MapPin size={18}/><strong>Location affects logistics</strong><span>Your ZIP can estimate delivery/travel. Exact site access, setup and pickup still need office confirmation.</span></div></div>
            <div className={styles.eventGrid}>{planningServices.map(service => <button key={service.slug} type="button" className={styles.eventCard} aria-pressed={details.eventType === service.type} onClick={() => { update('eventType', service.type); if (service.type === 'Festival / fundraiser') update('packageNumber', 0) }}>
              <Photo src={service.image} alt={service.alt}/>{details.eventType === service.type && <span className={styles.selectedCheck}><Check size={15}/></span>}<strong>{service.label}</strong>
            </button>)}</div>
            <p className={styles.photoNote}>Gallery images are inspiration, not a promise of included equipment or a particular event style.</p>
            <div className={styles.fields}>
              <div className={`${styles.field} ${styles.wide}`}><span><Users size={15}/> How many guests?</span><div className={styles.guests}><input aria-label="Guest count slider" type="range" min="10" max="500" step="10" value={Math.min(500, Math.max(10, details.guests))} onChange={e => update('guests', Number(e.target.value))}/><NumberInput label="Guest count" value={details.guests} onChange={v => update('guests', v)} min={1} max={10000} className={`${styles.input} ${styles.guestNumber}`}/></div><div className={styles.pills}>{[30, 50, 80, 150, 200].map(n => <button key={n} type="button" className={styles.pill} aria-pressed={details.guests === n} onClick={() => update('guests', n)}>{n} guests</button>)}</div><small>Guest count helps with quantities. It does not change your published planning package price.</small></div>
              <label className={styles.field}><span><CalendarDays size={15}/> Event date</span><input type="date" aria-label="Estimate event date" className={styles.input} value={details.eventDate} onChange={e => update('eventDate', e.target.value)}/><small>Undecided? You can leave this blank.</small></label>
              <label className={styles.field}><span>Event setting</span><select className={styles.select} value={details.setting} onChange={e => update('setting', e.target.value)}><option>Outdoor</option><option>Indoor</option><option>Both / unsure</option></select></label>
              <label className={`${styles.field} ${styles.wide}`}><span><MapPin size={15}/> Venue or city</span><input className={styles.input} value={details.location} onChange={e => update('location', e.target.value)} placeholder="Your venue, backyard or city" maxLength={200} autoComplete="address-level2"/></label>
              <label className={styles.field}><span>Venue status</span><select className={styles.select} value={details.venueStatus} onChange={e => update('venueStatus', e.target.value)}><option>Still deciding</option><option>Yes, booked</option><option>Have a venue in mind</option><option>Hosting at home</option></select></label>
              <div className={styles.field}><span>Planning + rental budget</span><NumberInput label="Planning and rental budget" className={styles.input} value={details.budget} onChange={v => update('budget', v)} max={1000000}/><small>Optional. Enter 0 to leave undecided. Exclude any catering or vendor budget.</small></div>
            </div>
          </>}
          {step === 1 && <>
            <p className={styles.intro}>Tell us where you are in the process, then compare all five published planning packages. You stay in control of the choice.</p><div className={styles.infoCallout}><strong>How to choose:</strong><span><b>Day-of</b> is for events you already planned. <b>Month-of</b> helps connect vendors, timeline and final details. <b>Partial / Full Planning</b> adds earlier, deeper support. The written quote controls the final scope.</span></div>
            <div className={styles.progressChoices}>{progressOptions.map(option => <button key={option.value} type="button" className={styles.progressChoice} aria-pressed={details.progress === option.value} onClick={() => update('progress', option.value)}><strong>{option.title}</strong><small>{option.description}</small></button>)}</div>
            <label className={styles.checkLabel}><input type="checkbox" checked={details.styling} onChange={e => update('styling', e.target.checked)}/> I would also like hands-on decor setup / styling help.</label>
            <div className={styles.recommend}><Wand2 size={17}/><div><strong>{recommendation ? `Suggested starting point: ${estimatePackages.find(p => p.number === recommendation)?.name}` : 'A custom scope is the best starting point for this event.'}</strong>{recommendation ? 'Based on how much you have already planned. Select it below or choose a different package.' : 'Festival staffing, vendor areas and schedules need individual review. Published packages remain available for comparison.'}</div></div>
            <div className={styles.packageGrid}>{estimatePackages.map(pkg => <button key={pkg.number} type="button" data-package={pkg.number} className={styles.packageCard} aria-pressed={details.packageNumber === pkg.number} onClick={() => update('packageNumber', pkg.number)}>
              <Photo src={pkg.image} alt={`${pkg.name} — gallery inspiration`}/>{details.packageNumber === pkg.number && <span className={styles.selectedCheck}><Check size={15}/></span>}<span className={styles.packageCopy}>{recommendation === pkg.number && <span className={styles.badge}>Suggested for you</span>}<strong>{pkg.name}</strong><small>{pkg.caption}</small><span className={styles.packagePrice}>{money(pkg.amount)}{pkg.startingAt && <em> starting</em>}</span><small>Up to {pkg.hours} on-site hours</small></span>
            </button>)}<button type="button" className={`${styles.packageCard} ${styles.customCard}`} aria-pressed={details.packageNumber === 0} onClick={() => update('packageNumber', 0)}><Sparkles size={24}/><strong>Let’s build a custom plan</strong><small>Not sure, rentals only, a multi-day event, or something beyond a standard package? Request a personal quote.</small><span className={styles.packagePrice}>Custom quote</span></button></div>
            {estimate.pkg && <details className={styles.scope} key={estimate.pkg.number}><summary>Everything included in {estimate.pkg.name}</summary><ul>{estimate.pkg.items.map(item => <li key={item}>{item}</li>)}</ul><p>Inherited package inclusions are listed in the complete package comparison below this estimator.</p></details>}
            <div className={styles.fields}>
              <div className={styles.field}><span>Requested on-site hours</span><NumberInput label="Requested on-site hours" value={details.onsiteHours} min={1} max={24} onChange={v => update('onsiteHours', v)} className={styles.input}/><small>{estimate.pkg ? `${estimate.pkg.hours} included. Extra time: ${money(EXTRA_PLANNING_RATE)} / hour.` : 'Hours and staffing will be quoted individually.'}</small></div>
              <div className={styles.field}><span>Extra preparation hours</span><NumberInput label="Extra preparation hours" value={details.extraPrepHours} min={0} max={30} onChange={v => update('extraPrepHours', v)} className={styles.input}/><small>Optional work beyond included services. Not extra staff.</small></div>
            </div>
            <p className={styles.hoursNotice}>{estimate.pkg ? `${estimate.extraOnsiteHours} extra on-site + ${details.extraPrepHours} extra preparation hours = ${money(estimate.extraCents / 100)} in additional planning time.` : 'Custom planning is not priced as $0. Its amount is still to be confirmed and is excluded from the known-charge subtotal.'}</p>
            {details.styling && details.packageNumber !== 2 && <p className={styles.photoNote}>Styling is a request, not an automatic inclusion. Discuss its scope and price with our team.</p>}
          </>}
          {step === 2 && <>
            <p className={styles.intro}>Browse real catalog photos and add only what you need. These are base rental prices, separate from your planning service.</p><div className={styles.infoGrid}><div className={styles.infoCard}><CheckCircle2 size={18}/><strong>What is counted</strong><span>Selected rental quantity × current base catalog rate, plus the planning package and any extra planning hours you choose.</span></div><div className={styles.infoCard}><Sparkles size={18}/><strong>What is not automatic</strong><span>Tax, damage waiver, setup/installation, exact-time service, special site conditions and third-party vendors are not silently added.</span></div><div className={styles.infoCard}><Save size={18}/><strong>No reservation yet</strong><span>This estimator helps you plan. Inventory, staffing, site fit and final fees are confirmed before an order is booked.</span></div></div>
            <div className={styles.deliveryRow}><label className={styles.field}><span>Event ZIP code</span><input aria-label="Event ZIP code" className={styles.input} type="text" inputMode="numeric" autoComplete="postal-code" maxLength={5} placeholder="e.g. 13116" value={details.zip} onChange={e => update('zip', e.target.value.replace(/\D/g, ''))}/></label><button className={styles.secondary} type="button" disabled={currentDelivery.status === 'loading'} onClick={checkDelivery}>{currentDelivery.status === 'loading' ? <Loader2 size={14} className={styles.spinner}/> : <MapPin size={14}/>}Check delivery</button></div>
            <div aria-live="polite">{currentDelivery.status === 'error' && <p className={styles.error}>{currentDelivery.error}</p>}{currentDelivery.status === 'ready' && <p className={currentDelivery.estimate?.needsConfirmation ? styles.notice : styles.status}>{currentDelivery.estimate?.needsConfirmation ? 'This ZIP is outside the usual service range. Delivery needs office confirmation and is not included in the subtotal.' : `${money(currentDelivery.estimate?.fee || 0)} estimated delivery / travel fee added.`}</p>}</div>
            <p className={styles.photoNote}>Uses the same ZIP-based rates as checkout, not exact street-address driving mileage. Pickup and special delivery arrangements must be confirmed separately.</p>
            <div className={styles.helper}><strong><Users size={15}/> A starting point for your seating</strong><p>{details.guests} guests → {details.guests} chairs + {estimate.tableCount} tables at {details.seatsPerTable} guests per table.</p><div className={styles.helperActions}>{[6, 8, 10].map(n => <button type="button" key={n} aria-pressed={details.seatsPerTable === n} onClick={() => update('seatsPerTable', n)}>{details.seatsPerTable === n ? '✓ ' : ''}{n} per table</button>)}</div>
              {currentItems.length > 0 && <><select aria-label="Seating helper chair" className={styles.select} value={chairId} onChange={e => setChairId(e.target.value)}><option value="">Choose a chair from the catalog</option>{chairOptions.map(i => <option key={i.id} value={i.id}>{i.name} — {money(i.cost)}</option>)}</select><select aria-label="Seating helper table" className={styles.select} value={tableId} onChange={e => setTableId(e.target.value)}><option value="">Choose a table from the catalog</option>{tableOptions.map(i => <option key={i.id} value={i.id}>{i.name} — {money(i.cost)}</option>)}</select><div className={styles.helperActions}><button type="button" disabled={!chairId} onClick={() => changeQuantity(chairId, details.guests)}>Set {details.guests} chairs</button><button type="button" disabled={!tableId} onClick={() => changeQuantity(tableId, estimate.tableCount)}>Set {estimate.tableCount} tables</button></div></>}
              <small>Seats per table is your planning assumption, not a certified capacity. Check the selected table dimensions and layout. Serving tables and ceremony seating may be additional.</small>
            </div>
            <div className={styles.toolbar}><label className={styles.search}><Search size={17}/><input className={styles.input} aria-label="Search rental photos" type="search" placeholder="Search tents, chairs, lights…" value={search} maxLength={100} onChange={e => setSearch(e.target.value)}/></label><select className={`${styles.select} ${styles.categoryFilter}`} aria-label="Rental category" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All rental categories</option>{categories.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}</select></div>
            {isCheckingCatalog && <div className={styles.loading} role="status"><Loader2 size={20} className={styles.spinner}/>Loading photos and current catalog prices…</div>}
            {catalogStatus === 'error' && <div className={styles.error} role="alert">{catalogError}<button type="button" className={styles.textButton} onClick={() => setCatalogAttempt(n => n + 1)}>Retry catalog</button></div>}
            {catalogStatus === 'ready' && !filtered.length && <div className={styles.empty}>No matching rentals are available in this view. Try another category or continue to request a custom quote.</div>}
            <div className={styles.catalog}>{filtered.slice(0, visibleCount).map(item => <article key={item.id} className={styles.rentalCard} data-selected={!!selections[item.id]}>
              <a className={styles.rentalPhoto} href={'/items/' + item.slug} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true"><Photo src={item.image} alt={item.name} contain sizes="(max-width: 767px) 40vw, 210px"/></a>
              <div className={styles.rentalCopy}><a href={'/items/' + item.slug} target="_blank" rel="noreferrer">{item.name}</a><p>{item.cost > 0 ? money(item.cost) : 'Confirm price'}</p><small>{item.available !== null ? `${item.available} available for selected date · not reserved` : 'Base rental rate · choose a date to check stock'}</small>
                {selections[item.id] ? <div className={styles.quantity}><button type="button" aria-label={'Remove one ' + item.name} onClick={() => changeQuantity(item.id, selections[item.id] - 1)}><Minus size={14}/></button><NumberInput label={item.name + ' quantity'} value={selections[item.id]} max={MAX_RENTAL_QUANTITY} onChange={n => changeQuantity(item.id, n)}/><button type="button" aria-label={'Add one ' + item.name} onClick={() => changeQuantity(item.id, selections[item.id] + 1)}><Plus size={14}/></button></div> : <button type="button" className={styles.addButton} aria-label={'Add ' + item.name} disabled={item.available === 0} onClick={() => changeQuantity(item.id, 1)}>{item.available === 0 ? 'Unavailable for this date' : '+ Add to estimate'}</button>}
              </div>
            </article>)}</div>
            {filtered.length > visibleCount && <button className={styles.loadMore} type="button" onClick={() => setVisibleCount(n => n + 12)}>Show more photos ({filtered.length - visibleCount} more rentals)</button>}
            <p className={styles.photoNote}>No equipment is reserved here. Final rental pricing may vary with duration, package rules, installation, setup, timing, taxes and applicable fees.</p>
          </>}
          {step === 3 && <>
            <p className={styles.intro}>A clear starting point for your conversation with our team. Review the details, then send your choices without starting over.</p><div className={styles.nextSteps}><div><span>1</span><strong>Review</strong><small>Check your event, planning package, rentals and known-charge subtotal.</small></div><div><span>2</span><strong>Send</strong><small>Your choices attach to the consultation form. Nothing is submitted until you complete it.</small></div><div><span>3</span><strong>Confirm</strong><small>Our office verifies availability, site needs, fees and scope before anything becomes a booking.</small></div></div>
            <p className={styles.printOnly}>Friendly Party Rental NYC · 315-884-1498 · fpr-nyc-production.up.railway.app/event-planning</p>
            <div className={styles.reviewPhoto}><Photo src={selectedEvent.image} alt={selectedEvent.alt} sizes="(max-width: 767px) 80vw, 700px"/></div>
            <dl className={styles.reviewDetails}><div><dt>Your event</dt><dd>{selectedEvent.label}</dd></div><div><dt>Guest count</dt><dd>{details.guests} guests · {details.setting}</dd></div><div><dt>Date</dt><dd>{details.eventDate || 'Still deciding'}</dd></div><div><dt>Venue / city</dt><dd>{details.location || 'To be confirmed'}</dd></div></dl>
            <h4 className={styles.subheading}>Your estimate breakdown</h4>
            <div className={styles.reviewLine}><span>{estimate.pkg?.name || 'Custom planning scope'}<small>{estimate.pkg ? `Up to ${estimate.pkg.hours} included on-site hours${estimate.pkg.startingAt ? ' · starting price' : ''}` : 'Not included in the subtotal — personal quote required'}</small></span><strong>{estimate.pkg ? money(estimate.planningCents / 100) : 'To confirm'}</strong></div>
            {estimate.extraHours > 0 && <div className={styles.reviewLine}><span>Additional planning time<small>{estimate.extraOnsiteHours} on-site + {details.extraPrepHours} preparation hours × {money(EXTRA_PLANNING_RATE)}</small></span><strong>{money(estimate.extraCents / 100)}</strong></div>}
            {estimate.lines.map(line => <div key={line.item.id} className={styles.reviewLine}><span>{line.quantity} × {line.item.name}<small>{line.item.cost > 0 ? money(line.item.cost) + ' per unit · base catalog rate' : 'Price not included — confirm with office'}</small></span><strong>{line.item.cost > 0 ? money(line.cents / 100) : 'To confirm'}</strong></div>)}
            <div className={styles.reviewLine}><span>Delivery / travel<small>{estimate.deliveryCents !== null ? `Estimated using ZIP ${details.zip}` : 'Not included — ZIP estimate or office confirmation needed'}</small></span><strong>{estimate.deliveryCents !== null ? money(estimate.deliveryCents / 100) : 'To confirm'}</strong></div>
            <div className={styles.reviewTotal}><span>Known-charge subtotal</span><strong data-estimate-review-total>{subtotalLabel}</strong></div>
            <p className={styles.notice}>This is not your final event total. Tax, damage waiver, installation/setup, special timing, catering and third-party vendors are not included. {estimate.custom ? 'Your planning scope also needs an individual quote. ' : ''}Our office confirms your date, services, equipment, quantities and all fees before booking.</p>
            <div className={styles.reviewActions}><button type="button" className={styles.primary} disabled={isCheckingCatalog || missingPrices} onClick={sendToConsultation}>Send these choices to our team <ArrowRight size={16}/></button><button type="button" className={styles.secondary} disabled={isCheckingCatalog || missingPrices} onClick={copyEstimate}><Clipboard size={14}/>Copy estimate</button><button type="button" className={styles.secondary} disabled={isCheckingCatalog || missingPrices} onClick={() => window.print()}><Printer size={14}/>Print estimate</button></div>
            <p className={styles.photoNote}>Next: review your prefilled event details and enter your contact information below. Nothing is sent until you submit the consultation form.</p>
          </>}
          {estimate.unavailable.length > 0 && <p className={styles.notice} role="status">Some selected quantities exceed the current stock shown for your date: {estimate.unavailable.join(', ')}. Adjust quantities or ask the office about alternatives. Nothing has been reserved.</p>}
          {missingPrices && !isCheckingCatalog && <div className={styles.error}>Some selected items need a confirmed price before this estimate can be sent. Remove them below or retry the catalog.<button className={styles.textButton} type="button" onClick={() => { const ids = new Set(estimate.lines.filter(l => l.item.cost > 0).map(l => l.item.id)); setSelections(previous => Object.fromEntries(Object.entries(previous).filter(([id]) => ids.has(id)))); }}>Remove unpriced / missing selections</button></div>}
          <div className={styles.footer}><button type="button" className={styles.secondary} disabled={step === 0} onClick={() => go(step - 1)}><ArrowLeft size={14}/>Back</button>{step < 3 ? <button type="button" className={styles.primary} onClick={() => go(step + 1)}>{['Explore planning support', 'Choose rental photos', 'Review my estimate'][step]}<ArrowRight size={15}/></button> : <button type="button" className={styles.secondary} onClick={() => go(0)}>Edit event details</button>}</div>
        </div>
      </div>
      <aside className={styles.sidebar} aria-label="Running event estimate">
        <div className={styles.summaryImage}><Photo src={selectedEvent.image} alt="" sizes="335px"/><span>{selectedEvent.label} · {details.guests} guests</span></div>
        <div className={styles.summaryContent}><p className={styles.summaryLabel}>Your event estimate</p><p className={styles.summaryAmount} data-estimate-total aria-live="polite" aria-atomic="true">{subtotalLabel}</p><p className={styles.summaryCaption}>{estimate.custom || missingPrices ? 'Known charges shown so far. Some services or prices still need confirmation.' : 'Known-charge subtotal from the choices above. This is not the final invoice total.'}</p>
          <div className={styles.summaryRows}><div className={styles.summaryRow}><span>Planning support{estimate.pkg?.startingAt && <small>Starting price</small>}</span><strong>{estimate.pkg ? money(estimate.planningCents / 100) : 'Custom quote'}</strong></div><div className={styles.summaryRow}><span>Additional planning time</span><strong>{estimate.pkg ? money(estimate.extraCents / 100) : 'To confirm'}</strong></div><div className={styles.summaryRow}><span>Selected rentals</span><strong>{isCheckingCatalog && Object.keys(selections).length ? 'Checking…' : money(estimate.rentalCents / 100)}</strong></div><div className={styles.summaryRow}><span>Delivery / travel</span><strong>{estimate.deliveryCents !== null ? money(estimate.deliveryCents / 100) : 'Not included'}</strong></div></div>
          <div className={styles.summaryMeta}><span>Known charges / guest</span><strong>{money(estimate.perGuest)}</strong></div>
          {estimate.lines.length > 0 && <div className={styles.summaryItems}>{estimate.lines.map(line => <div className={styles.summaryItem} key={line.item.id}><Photo src={line.item.image} alt="" contain sizes="40px"/><span>{line.quantity} × {line.item.name}</span><button type="button" aria-label={'Remove ' + line.item.name + ' from estimate'} onClick={() => changeQuantity(line.item.id, 0)}><Trash2 size={13}/></button></div>)}</div>}
          {details.budget > 0 && <div className={styles.budget} data-over={estimate.subtotalCents / 100 > details.budget}><div className={styles.summaryRow}><span>Your planning + rental budget</span><strong>{money(details.budget)}</strong></div><div className={styles.budgetTrack}><span style={{ width: `${Math.min(100, estimate.subtotalCents / 100 / details.budget * 100)}%` }}/></div><p>{estimate.subtotalCents / 100 > details.budget ? `${money(estimate.subtotalCents / 100 - details.budget)} above your budget before remaining fees. Try another package or adjust your rentals.` : `${money(details.budget - estimate.subtotalCents / 100)} not allocated yet. Leave room for all unpriced services and fees.`}</p></div>}
          <p className={styles.fine}>Published planning prices + base rental catalog rates. Excludes tax, damage waiver, setup/installation, special timing and third-party vendors. Availability and final quote require confirmation.</p>
          <button type="button" className={styles.primary} style={{ width: '100%', marginTop: 16 }} onClick={() => go(3)}>Review estimate <ArrowRight size={14}/></button>
          <a className={styles.textButton} style={{ width: '100%', justifyContent: 'center', marginTop: 5 }} href="tel:+13158841498">Prefer to talk? 315-884-1498</a>
        </div>
      </aside>
    </div>
    <div className={styles.toolActions}><span><Heart size={11} aria-hidden="true" style={{ display: 'inline', marginRight: 4 }}/> No account. No payment. No reservation.</span><button type="button" className={styles.textButton} onClick={saveProgress}><Save size={13}/>Save on this device</button><button type="button" className={styles.textButton} onClick={reset}><RotateCcw size={13}/>{resetRequested ? 'Confirm reset' : 'Start over'}</button></div>
    {message && <p role="status" className={styles.status} style={{ padding: '0 25px 22px', margin: 0 }}>{message}</p>}
  </section>
}
