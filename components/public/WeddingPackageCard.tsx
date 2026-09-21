import Link from 'next/link'
import Image from 'next/image'
import { formatCurrency } from '@/lib/utils'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'], weight: ['600', '700'], display: 'swap' })

interface WeddingPackageCardProps {
  id: string
  name: string
  price: number
  guests: number
  items: string[]
  popular?: boolean
  signature?: boolean
  packageNumber?: number
  image?: string
}

export default function WeddingPackageCard({
  id,
  name,
  price,
  guests,
  items,
  popular,
  signature,
  packageNumber,
  image,
}: WeddingPackageCardProps) {
  return (
    <div
      className={`group relative bg-white rounded-xl shadow-lg border overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
        signature ? 'border-primary' : popular ? 'border-secondary/60' : 'border-gray-200'
      }`}
    >
      {(popular || signature) && (
        <div
          className={`absolute top-3 right-3 z-10 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-md ${
            signature ? 'bg-primary text-dark' : 'bg-secondary text-white'
          }`}
        >
          {signature ? 'Signature' : 'Most Popular'}
        </div>
      )}
      {image && (
        <div className="relative w-full h-64 overflow-hidden">
          <Image
            src={image}
            alt={`${name}: illustrative event setting; included equipment is listed below`}
            fill
            sizes="(max-width: 768px) 100vw, 400px"
            className="object-cover bg-gray-50 group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      <div className="p-6"><p className="mb-3 text-[11px] leading-4 text-gray-500">Event imagery is illustrative. The included equipment and price below define this Greenville package.</p>
        {packageNumber && !signature && (
          <p className="text-xs text-primary font-bold uppercase tracking-[0.2em] mb-2">Package {packageNumber}</p>
        )}
        <h3 className={`${playfair.className} text-2xl font-bold text-dark mb-1`}>{name}</h3>
        <p className="text-3xl font-bold text-secondary mb-1">{formatCurrency(price)}</p>
        <p className="text-body text-sm mb-4">Up to {guests} guests</p>
        <div className="h-px bg-primary/30 mb-4" />
        <ul className="space-y-2 mb-6">
          {items.map((item) => (
            <li key={item} className="text-sm text-body flex items-start gap-2">
              <span className="text-primary mt-0.5">✓</span>
              {item}
            </li>
          ))}
        </ul>
        <Link
          href={`/wedding-packages?package=${id}`}
          prefetch={false}
          className="btn-primary block text-center uppercase text-sm tracking-wide"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}
