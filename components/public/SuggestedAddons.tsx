'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Heart, Moon, Music2, ShieldCheck, ShoppingCart, Sparkles, type LucideIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cartQuantityForItem, useCart } from './CartContext'
import { bookingDateKey } from '@/lib/rentsketchBooking'
import { nycCalendarDay } from '@/lib/nycCustomerHelp'
import { nycItemPath } from '@/lib/nycItemPath'
import { nycRentalPriceSuffix } from '@/lib/nycRentalPricing'
import toast from 'react-hot-toast'

export interface SuggestedAddon {
  id: string
  name: string
  slug: string
  description?: string | null
  cost: number
  picture?: string | null
  quantity: number
  categorySlug?: string
  pricingProfile?: string | null
  colorOptions?: string[]
  isPackage?: boolean
  oneTimeFee?: boolean
}

function photoboothLineKind(item: { name?: string; slug?: string | null }): 'self' | 'attended' | 'layout' | 'backdrop' | null {
  const slug = String(item.slug || '').toLowerCase()
  if (slug === 'photobooth-custom-image-layout-upgrade') return 'layout'
  if (slug === 'photobooth-custom-backdrop-upgrade') return 'backdrop'
  const name = String(item.name || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (name === 'photoboothcustomimagelayoutupgrade') return 'layout'
  if (name === 'photoboothcustombackdropupgrade') return 'backdrop'
  const rental = slug.match(/^photobooth-\d+-hour-(with|no)-attendant$/) || name.match(/^photobooth\d+hour(with|no)attendant$/)
  return rental ? (rental[1] === 'with' ? 'attended' : 'self') : null
}

type AddonPresentation = {
  badge: string
  benefit: string
  icon: LucideIcon
  badgeClass: string
  directAdd: boolean
  actionLabel: string
}

function addonPresentation(name: string, index: number): AddonPresentation {
  const normalized = name.toLowerCase()
  if (normalized.includes('side wall') || normalized.includes('sidewall')) {
    return {
      badge: 'Weather Upgrade',
      benefit: 'Add privacy and weather protection. Choose the number of panels needed for the sides you want enclosed.',
      icon: ShieldCheck,
      badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
      directAdd: false,
      actionLabel: 'Choose Sidewalls',
    }
  }
  if (normalized.includes('lighting') || normalized.includes('bistro') || normalized.includes('string light')) {
    return {
      badge: 'Evening Upgrade',
      benefit: 'Add lighting matched to this tent size so evening events stay bright and inviting.',
      icon: Moon,
      badgeClass: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
      directAdd: true,
      actionLabel: 'Add Lighting',
    }
  }
  if (normalized.includes('cocktail table') && !normalized.includes('cover')) {
    return {
      badge: 'Guest Favorite',
      benefit: 'Give guests an easy place to mingle, set down drinks, and gather outside the seated table layout.',
      icon: Heart,
      badgeClass: 'bg-rose-50 text-rose-700 ring-rose-100',
      directAdd: true,
      actionLabel: 'Add Table',
    }
  }
  if (normalized.includes('dance floor')) {
    return {
      badge: 'Celebration Upgrade',
      benefit: 'Build the right dance-floor size for your guest count instead of adding a single floor section by mistake.',
      icon: Music2,
      badgeClass: 'bg-violet-50 text-violet-700 ring-violet-100',
      directAdd: false,
      actionLabel: 'Plan Floor Size',
    }
  }
  return {
    badge: index === 0 ? 'Popular Add-On' : 'Event Upgrade',
    benefit: 'A useful upgrade that pairs naturally with this rental.',
    icon: Sparkles,
    badgeClass: 'bg-orange-50 text-orange-700 ring-orange-100',
    directAdd: true,
    actionLabel: 'Add to Cart',
  }
}

function AddonImage({ addon, premium = false }: { addon: SuggestedAddon; premium?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (!addon.picture || failed) {
    return <div className={premium
      ? "flex h-full min-h-0 items-center justify-center bg-gradient-to-br from-orange-50 via-white to-slate-100 text-orange-500"
      : "flex h-full w-full items-center justify-center bg-gradient-to-br from-amber-100 to-orange-100 text-4xl"
    }>{premium ? <Sparkles size={44} strokeWidth={1.5} /> : '🎉'}</div>
  }
  return <Image
    src={addon.picture}
    alt={addon.name}
    fill
    sizes={premium ? "(max-width: 639px) calc(100vw - 64px), (max-width: 1199px) 42vw, 240px" : "(max-width: 767px) calc(100vw - 80px), 210px"}
    loading="lazy"
    onError={() => setFailed(true)}
    className={premium ? "object-cover transition duration-500 group-hover:scale-[1.035]" : "h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"}
  />
}

function CompactAddons({ addons, onAdd, pendingId }: { addons: SuggestedAddon[]; onAdd: (addon: SuggestedAddon) => void; pendingId: string | null }) {
  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <span className="text-xl">✨</span> Frequently Added With This
        </h3>
        <p className="mt-1 text-sm text-gray-500">Popular add-ons that pair perfectly with this rental</p>
      </div>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        {addons.slice(0, 3).map((addon) => (
          <div
            key={addon.id}
            className="group flex flex-col rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-200 hover:shadow-xl"
          >
            <Link href={nycItemPath(addon.slug)} prefetch={false} className="relative block aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-amber-50">
              <AddonImage addon={addon} />
            </Link>
            <div className="flex flex-1 flex-col p-4">
              <Link href={nycItemPath(addon.slug)} prefetch={false} className="font-semibold text-gray-900 hover:text-amber-600">{addon.name}</Link>
              {addon.description && <p className="mt-1 line-clamp-2 flex-1 text-xs text-gray-500">{addon.description}</p>}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-base font-bold text-amber-700">${addon.cost.toFixed(2)}{addon.oneTimeFee ? ' one-time' : ''}</span>
                <button type="button" onClick={() => onAdd(addon)} disabled={pendingId !== null} className="shrink-0 whitespace-nowrap rounded-full bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-amber-600 hover:shadow-md">{pendingId === addon.id ? 'Checking…' : '+ Add'}</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function SuggestedAddons({
  addons,
  contextName,
  variant = 'compact',
  includedItems = [],
}: {
  addons: SuggestedAddon[]
  contextName?: string
  variant?: 'compact' | 'premium'
  includedItems?: string[]
}) {
  const { addItem, items, eventDate, loaded } = useCart()
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const requestInFlight = useRef(false)
  const latestDate = useRef(eventDate)
  const latestItems = useRef(items)
  latestDate.current = eventDate
  latestItems.current = items

  if (!addons || addons.length === 0) return null

  const handleAdd = async (addon: SuggestedAddon) => {
    if (!loaded || requestInFlight.current) return
    const date = bookingDateKey(eventDate)
    if (!date || date < nycCalendarDay()) {
      toast('Choose your event date to check this add-on.')
      router.push(addon.categorySlug ? `/category/${addon.categorySlug}` : '/order-by-date')
      return
    }
    const kind = photoboothLineKind(addon)
    if ((kind === 'layout' || kind === 'backdrop') && !items.some(item => {
      if (item.quantity <= 0) return false
      const booth = photoboothLineKind(item)
      return kind === 'backdrop' ? booth === 'attended' : booth === 'self' || booth === 'attended'
    })) {
      toast(kind === 'backdrop' ? 'Choose an attended Photo Booth rental, then add your custom backdrop.' : 'Choose your Photo Booth rental, then add your custom image layout.')
      router.push('/category/photobooth-rentals')
      return
    }
    if (addon.colorOptions?.length) {
      toast('Choose the color and quantity for this add-on.')
      router.push(addon.categorySlug ? `/category/${addon.categorySlug}` : nycItemPath(addon.slug))
      return
    }
    requestInFlight.current = true
    setPendingId(addon.id)
    try {
      const query = new URLSearchParams({ date, search: addon.name })
      const response = await fetch(`/api/items?${query}`, { cache: 'no-store' })
      if (!response.ok) throw new Error('Availability unavailable')
      const data = await response.json()
      const current = Array.isArray(data.items) ? data.items.find((item: { id?: string }) => item.id === addon.id) : null
      if (bookingDateKey(latestDate.current) !== date) {
        toast('Your event date changed. Please check this add-on again.')
        return
      }
      const available = current && Number(current.available)
      const price = current && Number(current.cost)
      if (!current || current.status !== 'Available' || !Number.isInteger(available) || available <= 0 || !Number.isFinite(price) || price <= 0) {
        toast.error('This add-on is unavailable for your date. Choose another option or contact our Riverdale team.')
        return
      }
      if (current.colorOptions?.length) {
        toast('Choose the color and quantity for this add-on.')
        router.push(`/category/${current.category.slug}`)
        return
      }
      const cap = addon.oneTimeFee ? Math.min(1, available) : available
      if (cartQuantityForItem(latestItems.current, addon.id) >= cap) {
        toast('The available quantity of this add-on is already in your cart.')
        return
      }
      const isPackage = current.type === 'Package'
      if (isPackage && latestItems.current.some(item => item.isPackage && item.id !== addon.id)) {
        toast.error('Only one package can be added per order. Remove the existing package before choosing another.')
        return
      }
      addItem({
        id: current.id,
        name: current.name,
        price,
        quantity: 1,
        maxQuantity: cap,
        picture: addon.picture || undefined,
        pricingProfile: current.category?.pricingProfile || addon.pricingProfile || 'standard',
        isPackage,
        eventDate,
      })
      toast.success(`${current.name} added to cart`)
    } catch {
      toast.error('We could not check this add-on. Please try again or contact our Riverdale team.')
    } finally {
      requestInFlight.current = false
      setPendingId(null)
    }
  }

  if (variant === 'compact') return <CompactAddons addons={addons} onAdd={handleAdd} pendingId={pendingId} />

  return (
    <section className="relative mx-auto mt-7 mb-14 max-w-5xl overflow-hidden rounded-[1.35rem] border border-slate-200 bg-slate-950 shadow-[0_18px_48px_-34px_rgba(15,23,42,0.68)] md:mb-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,0.16),transparent_32%)]" />

      <div className="relative flex flex-col gap-2.5 border-b border-white/10 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-orange-300">
            <Sparkles size={12} />
            Complete your setup
          </div>
          <h2 className="mt-1.5 text-lg font-black tracking-tight text-white sm:text-xl">Add the finishing touches.</h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-slate-300 sm:text-sm">
            Smart upgrades matched to this rental—only add what your event actually needs.
          </p>
        </div>

        {includedItems.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 backdrop-blur-sm">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">Already included</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {includedItems.map((item) => <span key={item} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white">{item}</span>)}
            </div>
          </div>
        )}
      </div>

      <div className="relative bg-gradient-to-b from-slate-50 to-white px-3.5 py-3.5 sm:px-4 lg:px-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-orange-600">Recommended add-ons</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-600">Current inventory • Real pricing</p>
          </div>
          <Link href="/contact_us" className="hidden text-xs font-bold text-slate-500 transition hover:text-orange-600 sm:inline">Need help choosing?</Link>
        </div>

        <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-4">
          {addons.slice(0, 4).map((addon, index) => {
            const presentation = addonPresentation(addon.name, index)
            const BadgeIcon = presentation.icon
            return (
              <article key={addon.id} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_8px_22px_-18px_rgba(15,23,42,0.5)] ring-1 ring-black/[0.015] transition duration-300 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-[0_16px_30px_-22px_rgba(15,23,42,0.48)]">
                <Link href={nycItemPath(addon.slug)} prefetch={false} className="relative block h-28 overflow-hidden bg-slate-100 sm:h-32 lg:h-28">
                  <AddonImage addon={addon} premium />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-slate-950/45 to-transparent" />
                  <div className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.06em] shadow-sm ring-1 backdrop-blur-sm ${presentation.badgeClass}`}>
                    <BadgeIcon size={11} />
                    {presentation.badge}
                  </div>
                  <span className="absolute bottom-2 right-2.5 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-black text-slate-900 shadow-sm">
                    ${addon.cost.toFixed(2)}{addon.oneTimeFee ? ' one-time' : nycRentalPriceSuffix(addon)}
                  </span>
                </Link>

                <div className="p-3">
                  <Link href={nycItemPath(addon.slug)} prefetch={false} className="block text-[13px] font-black leading-tight text-slate-950 transition hover:text-orange-600">{addon.name}</Link>
                  <p className="mt-1 line-clamp-2 min-h-[2.05rem] text-[10px] leading-[1.02rem] text-slate-600">{presentation.benefit}</p>

                  <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                    <Link href={nycItemPath(addon.slug)} prefetch={false} className="text-[10px] font-bold text-slate-500 transition hover:text-orange-600">
                      Details
                    </Link>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    {presentation.directAdd ? (
                      <button
                        type="button"
                        onClick={() => handleAdd(addon)}
                        disabled={!loaded || pendingId !== null}
                        className="ml-auto inline-flex min-h-7 items-center justify-center gap-1 rounded-lg bg-orange-500 px-2 py-1 text-[10px] font-black text-white shadow-sm transition hover:bg-orange-600"
                        aria-label={`${presentation.actionLabel}: ${addon.name}`}
                      >
                        <ShoppingCart size={14} />
                        {pendingId === addon.id ? 'Checking…' : presentation.actionLabel}
                      </button>
                    ) : (
                      <Link
                        href={nycItemPath(addon.slug)}
                        prefetch={false}
                        className="ml-auto inline-flex min-h-7 items-center justify-center rounded-lg bg-orange-50 px-2 py-1 text-[10px] font-black text-orange-700 ring-1 ring-inset ring-orange-200 transition hover:bg-orange-100"
                      >
                        {presentation.actionLabel}
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        <div className="mt-2.5 flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold text-slate-700">You can add or change upgrades later if your event plan changes.</p>
          <Link href="/contact_us" className="text-xs font-black text-slate-900 transition hover:text-orange-600">Ask us for help →</Link>
        </div>
      </div>
    </section>
  )
}
