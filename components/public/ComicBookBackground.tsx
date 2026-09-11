interface ComicBookBackgroundProps {
  children: React.ReactNode
  className?: string
}

export default function ComicBookBackground({ children, className = '' }: ComicBookBackgroundProps) {
  return (
    <div
      className={`relative overflow-hidden bg-cover bg-center bg-no-repeat ${className}`}
      style={{
                backgroundImage: `url('/_next/image?url=${encodeURIComponent('https://files.sysers.com/cp/upload/default_design/gallery/full/comic_book_background.jpg')}&w=1920&q=75')`,
      }}
    >
      <div className="relative z-10">{children}</div>
    </div>
  )
}
