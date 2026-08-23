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
      <Link href={href} className="relative block w-full overflow-hidden" style={{ paddingTop: '75%' }}>
        {image ? (
          <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-contain bg-gray-50" />
        ) : (
          <div className="absolute inset-0 bg-gray-200" />
        )}
      </Link>
    )
  }

  if (displayStyle === 'image-title') {
    return (
      <Link href={href} className="block">
        <div className="relative w-full overflow-hidden rounded" style={{ paddingTop: '75%' }}>
          {image ? (
            <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-contain bg-gray-50" />
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
      <Link href={href} className="flex flex-col items-center">
        <div className="relative w-32 h-32 rounded-full overflow-hidden border border-gray-200">
          {image ? (
            <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-cover" />
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
      <Link href={href} className="block">
        <div className="relative w-full overflow-hidden" style={{ paddingTop: '75%' }}>
          {image ? (
            <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-contain bg-gray-50" />
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
      className="relative block w-full overflow-hidden rounded-lg shadow hover:shadow-lg transition-shadow"
      style={{ paddingTop: '75%' }}
    >
      {image ? (
        <Image src={image} alt={name} fill sizes="(max-width: 768px) 50vw, 33vw" className="object-contain bg-gray-50" />
      ) : (
        <div className="absolute inset-0 bg-gray-200" />
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-white/90 px-2 py-1">
        <p className="text-xs md:text-sm font-medium text-center truncate" style={{ color: 'rgb(86,86,86)' }}>{name}</p>
      </div>
    </Link>
  )
}
