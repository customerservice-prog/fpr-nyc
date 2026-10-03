'use client'
import Link from 'next/link'
import Image from 'next/image'

interface CategoryCardProps {
  name: string
  href: string
  image?: string
  displayStyle?: string
}

export default function CategoryCard({ name, href, image, displayStyle = 'boxed' }: CategoryCardProps) {
  if (displayStyle === 'image-only') {
    return (
      <Link href={href} prefetch={false} className="relative block w-full overflow-hidden" style={{ paddingTop: '75%' }}>
        {image ? (
          <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 33vw" quality={60} className="object-contain bg-gray-50" />
        ) : (
          <div className="absolute inset-0 bg-gray-200" />
        )}
      </Link>
    )
  }

  if (displayStyle === 'image-title') {
    return (
      <Link href={href} prefetch={false} className="block">
        <div className="relative w-full overflow-hidden rounded" style={{ paddingTop: '75%' }}>
          {image ? (
            <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 33vw" quality={60} className="object-contain bg-gray-50" />
          ) : (
            <div className="absolute inset-0 bg-gray-200" />
          )}
        </div>
        <p className="text-center font-medium mt-2">{name}</p>
      </Link>
    )
  }

  if (displayStyle === 'circled') {
    return (
      <Link href={href} prefetch={false} className="flex flex-col items-center">
        <div className="relative w-32 h-32 rounded-full overflow-hidden border border-gray-200">
          {image ? (
            <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 33vw" quality={60} className="object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gray-200" />
          )}
        </div>
        <p className="text-center text-sm font-medium mt-2">{name}</p>
      </Link>
    )
  }

  if (displayStyle === 'minimal' || displayStyle === 'minimal-no-gutter') {
    return (
      <Link href={href} prefetch={false} className="block">
        <div className="relative w-full overflow-hidden" style={{ paddingTop: '75%' }}>
          {image ? (
            <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 33vw" quality={60} className="object-contain bg-gray-50" />
          ) : (
            <div className="absolute inset-0 bg-gray-100" />
          )}
        </div>
        <p className="text-sm text-gray-700 mt-1">{name}</p>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      prefetch={false}
      data-category-card="boxed"
      className="relative block w-full overflow-hidden rounded-2xl border border-gray-100 shadow-[0_8px_28px_rgba(11,31,58,.10)] transition-shadow hover:shadow-lg md:rounded-lg"
      style={{ paddingTop: 'var(--category-card-padding, 75%)' }}
    >
      <div data-category-image className="absolute inset-0">
        {image ? (
          <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 33vw" quality={60} className="object-contain bg-gray-50" />
        ) : (
          <div className="absolute inset-0 bg-gray-200" />
        )}
      </div>
      <div data-category-caption className="absolute bottom-0 left-0 right-0 bg-white/95 px-3 py-2.5 backdrop-blur-sm md:px-2 md:py-1">
        <p className="line-clamp-2 text-center text-sm font-extrabold leading-tight md:text-sm md:font-medium" style={{ color: 'rgb(50,50,50)' }}>{name}</p>
      </div>
    </Link>
  )
}
