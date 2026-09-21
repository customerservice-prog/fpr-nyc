import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import {scPageMetadata} from '@/lib/scSeo'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

interface Block {
  id: string
  type: string
  headingText?: string
  headingSize?: 'h1' | 'h2' | 'h3'
  text?: string
  imageUrl?: string
  imageAlt?: string
  buttonLabel?: string
  buttonUrl?: string
  html?: string
  heroTitle?: string
  heroSubtitle?: string
  heroImageUrl?: string
  heroButtonLabel?: string
  heroButtonUrl?: string
  tiHeading?: string
  tiText?: string
  tiImageUrl?: string
  tiImageSide?: 'left' | 'right'
  quote?: string
  author?: string
  col1Title?: string
  col1Text?: string
  col2Title?: string
  col2Text?: string
  col3Title?: string
  col3Text?: string
  ctaText?: string
  ctaButtonLabel?: string
  ctaButtonUrl?: string
  videoUrl?: string
  videoCaption?: string
  gridImage1?: string
  gridImage2?: string
  gridImage3?: string
  gridImage4?: string
  faqQ1?: string
  faqA1?: string
  faqQ2?: string
  faqA2?: string
  faqQ3?: string
  faqA3?: string
  tableData?: string
  spacerHeight?: string
  data?: string
  variant?: string
  heroStyle?: string
  videoSide?: string
  videoSize?: string
  videoButtonLabel?: string
  videoButtonUrl?: string
  tableStyle?: string
  gridLayout?: string
  gridLinkUrl?: string
  testimonialStyle?: string
}

function parseBlocks(content: string | null): Block[] {
  if (!content) return []
  try {
    const parsed = JSON.parse(content)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
function RenderBlock({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading': {
      const Tag = (block.headingSize || 'h2') as any
      return <Tag className="text-3xl font-bold text-dark">{block.headingText}</Tag>
    }
    case 'text':
      return <p>{block.text}</p>
    case 'image':
      return block.imageUrl ? <img src={block.imageUrl} alt={block.imageAlt || ''} className="rounded-lg w-full" /> : null
    case 'button':
      return <a href={block.buttonUrl || '#'} className="btn-primary inline-block">{block.buttonLabel}</a>
    case 'html':
      return <div dangerouslySetInnerHTML={{ __html: block.html || '' }} />
    case 'hero': {
      const hs = block.heroStyle || "overlay"
      const solid = hs === "solid-blue" || hs === "solid-red"
      const bgClass = hs === "solid-blue" ? "bg-blue-600 text-white" : hs === "solid-red" ? "bg-red-600 text-white" : "bg-gray-800 text-white bg-cover bg-center"
      const alignClass = hs === "left-align" ? "text-left items-start" : "text-center items-center"
      return (
        <div
          className={"rounded-xl p-12 flex flex-col " + alignClass + " " + bgClass}
          style={(!solid && block.heroImageUrl) ? { backgroundImage: "linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(" + block.heroImageUrl + ")" } : undefined}
        >
          <h2 className="text-4xl font-bold mb-3">{block.heroTitle}</h2>
          <p className="text-lg mb-6">{block.heroSubtitle}</p>
          <div className="flex gap-3">
            {block.heroButtonLabel && <a href={block.heroButtonUrl || "#"} className="btn-primary inline-block">{block.heroButtonLabel}</a>}
            {hs === "two-button" && <a href="/contact_us" className="inline-block border border-white px-4 py-2 rounded">Learn More</a>}
          </div>
        </div>
      )
    }
    case 'textImage':
      return (
        <div className={'flex gap-8 flex-col md:flex-row items-center ' + (block.tiImageSide === 'right' ? 'md:flex-row-reverse' : '')}>
          {block.tiImageUrl && <img src={block.tiImageUrl} alt="" className="md:w-1/2 rounded-lg" />}
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold mb-3 text-dark">{block.tiHeading}</h3>
            <p className="text-body">{block.tiText}</p>
          </div>
        </div>
      )
    case 'testimonial': {
      const card = block.testimonialStyle === "card"
      return card ? (
        <div className="border rounded-xl p-6 shadow-sm bg-white text-center">
          <p className="italic">{'"' + block.quote + '"'}</p>
          <p className="mt-3 font-semibold text-dark">{'- ' + block.author}</p>
        </div>
      ) : (
        <blockquote className="border-l-4 border-secondary pl-6 italic text-lg">
          {'"' + block.quote + '"'}
          <footer className="mt-3 not-italic font-semibold text-dark">{'- ' + block.author}</footer>
        </blockquote>
      )
    }
    case 'threeCol':
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div><h4 className="font-bold text-lg mb-2 text-dark">{block.col1Title}</h4><p className="text-body">{block.col1Text}</p></div>
          <div><h4 className="font-bold text-lg mb-2 text-dark">{block.col2Title}</h4><p className="text-body">{block.col2Text}</p></div>
          <div><h4 className="font-bold text-lg mb-2 text-dark">{block.col3Title}</h4><p className="text-body">{block.col3Text}</p></div>
        </div>
      )
    case 'cta':
      return (
        <div className="bg-yellow-400 rounded-xl p-8 text-center">
          <p className="font-bold text-xl mb-4 text-dark">{block.ctaText}</p>
          <a href={block.ctaButtonUrl || '#'} className="btn-primary inline-block">{block.ctaButtonLabel}</a>
        </div>
      )
    case 'videoFeature': {
      const sideClass = block.videoSide === "right" ? "md:flex-row-reverse" : ""
      const big = block.videoSize === "large"
      return (
        <div className={"flex flex-col md:flex-row gap-6 items-center " + sideClass}>
          <div className={big ? "md:w-2/3" : "md:w-1/2"}>
            {block.videoUrl && (
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe src={block.videoUrl} className="w-full h-full" allowFullScreen />
              </div>
            )}
          </div>
          <div className={big ? "md:w-1/3" : "md:w-1/2"}>
            {block.videoCaption && <p className="text-body">{block.videoCaption}</p>}
            {block.videoButtonLabel && <a href={block.videoButtonUrl || "#"} className="btn-primary inline-block mt-3">{block.videoButtonLabel}</a>}
          </div>
        </div>
      )
    }
    case 'imageGrid': {
      const imgs = [block.gridImage1, block.gridImage2, block.gridImage3, block.gridImage4].filter(Boolean)
      const cols = block.gridLayout === "3" ? "md:grid-cols-3" : block.gridLayout === "6" ? "md:grid-cols-6" : "md:grid-cols-4"
      return (
        <div className={"grid grid-cols-2 " + cols + " gap-4"}>
          {imgs.map((src, i) => {
            const el = <img src={src} alt="" className="rounded-lg w-full h-32 object-cover" />
            return block.gridLinkUrl ? <a key={i} href={block.gridLinkUrl}>{el}</a> : <div key={i}>{el}</div>
          })}
        </div>
      )
    }
    case 'faq': {
      const items = [[block.faqQ1, block.faqA1], [block.faqQ2, block.faqA2], [block.faqQ3, block.faqA3]].filter((pair) => pair[0])
      return (
        <div className="space-y-3">
          {items.map((pair, i) => (
            <details key={i} className="border rounded-lg p-4">
              <summary className="font-semibold cursor-pointer text-dark">{pair[0]}</summary>
              <p className="mt-2 text-body">{pair[1]}</p>
            </details>
          ))}
        </div>
      )
    }
    case 'table': {
      const rows = (block.tableData || '').split(String.fromCharCode(10)).filter(Boolean).map((r) => r.split('|'))
      const ts = block.tableStyle || "basic"
      const striped = ts === "striped" || ts === "borderedStriped"
      const bordered = ts === "bordered" || ts === "borderedStriped"
      return (
        <table className={"w-full border-collapse " + (bordered ? "border" : "")}>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i === 0 ? "font-bold bg-gray-100" : (striped && i % 2 === 0 ? "bg-gray-50" : "")}>
                {row.map((cell, j) => (
                  <td key={j} className={"p-3 " + (bordered ? "border" : "border-b")}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    case 'separator':
      return <hr className="border-t-2 my-4" />
    case 'spacer':
      return <div style={{ height: (block.spacerHeight || '40') + 'px' }} />
    
    case "carousel": {
      const d = block.data ? JSON.parse(block.data) : {}
      const slides = [[d.item1Img, d.item1Cap], [d.item2Img, d.item2Cap], [d.item3Img, d.item3Cap]]
      return (
        <div className="p-6 bg-gray-50 rounded-xl">
          <div className="flex gap-4 overflow-x-auto">
            {slides.map((s: any, i: number) => (
              <div key={i} className="min-w-[200px] bg-white rounded-lg shadow p-4 text-center">
                {d.mode === "quotes" ? (
                  <p className="italic text-gray-600">"{s[1] || "Quote text"}"</p>
                ) : (
                  <>
                    {s[0] ? <img src={s[0]} alt="" className="w-full h-28 object-cover rounded mb-2" /> : <div className="w-full h-28 bg-gray-200 rounded mb-2" />}
                    <p className="text-sm text-gray-600">{s[1]}</p>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-1 mt-3">
            <span className="w-2 h-2 rounded-full bg-gray-400" /><span className="w-2 h-2 rounded-full bg-gray-300" /><span className="w-2 h-2 rounded-full bg-gray-300" />
          </div>
        </div>
      )
    }
    case "linkList": {
      const d = block.data ? JSON.parse(block.data) : {}
      const links = [[d.link1Label, d.link1Url], [d.link2Label, d.link2Url], [d.link3Label, d.link3Url], [d.link4Label, d.link4Url]]
      return (
        <div className="p-6">
          {d.heading && <h3 className="text-xl font-bold mb-4">{d.heading}</h3>}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {links.map((l: any, i: number) => (
              <a key={i} href={l[1] || "#"} className="block text-center py-2 px-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm">{l[0]}</a>
            ))}
          </div>
        </div>
      )
    }
    case "iconGrid": {
      const d = block.data ? JSON.parse(block.data) : {}
      const items = [[d.item1Icon, d.item1Title, d.item1Text], [d.item2Icon, d.item2Title, d.item2Text], [d.item3Icon, d.item3Title, d.item3Text], [d.item4Icon, d.item4Title, d.item4Text]]
      return (
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {items.map((it: any, i: number) => (
            <div key={i} className="text-center">
              <div className="text-3xl mb-2">{it[0]}</div>
              <div className="font-bold">{it[1]}</div>
              <div className="text-sm text-gray-500">{it[2]}</div>
            </div>
          ))}
        </div>
      )
    }
    case "featureSection": {
      const d = block.data ? JSON.parse(block.data) : {}
      const bg = d.style === "red" ? "bg-red-600 text-white" : d.style === "gray" ? "bg-gray-100" : "bg-blue-50"
      const cols = [[d.col1Title, d.col1Text], [d.col2Title, d.col2Text], [d.col3Title, d.col3Text]]
      return (
        <div className={"p-8 rounded-xl " + bg}>
          <h3 className="text-2xl font-bold text-center mb-2">{d.heading}</h3>
          {d.subtext && <p className="text-center opacity-80 mb-6">{d.subtext}</p>}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cols.map((c: any, i: number) => (
              <div key={i}>
                <div className="font-bold mb-1">{c[0]}</div>
                <div className="text-sm opacity-80">{c[1]}</div>
              </div>
            ))}
          </div>
        </div>
      )
    }
    case "productFeature": {
      const d = block.data ? JSON.parse(block.data) : {}
      return (
        <div className="p-6 flex flex-col md:flex-row gap-6 items-center bg-white rounded-xl border border-gray-100">
          {d.image ? <img src={d.image} alt="" className="w-full md:w-1/3 rounded-lg object-cover h-48" /> : <div className="w-full md:w-1/3 h-48 bg-gray-200 rounded-lg" />}
          <div className="flex-1">
            <h3 className="text-xl font-bold">{d.title}</h3>
            <p className="text-gray-600 my-2">{d.description}</p>
            <div className="text-2xl font-bold text-secondary mb-3">{d.price}</div>
            <span className="btn-primary inline-block px-5 py-2 rounded-lg">{d.buttonLabel}</span>
          </div>
        </div>
      )
    }
    case "doubleImageBanner": {
      const d = block.data ? JSON.parse(block.data) : {}
      return (
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            {d.image1 ? <img src={d.image1} alt="" className="w-full h-48 object-cover rounded-lg" /> : <div className="w-full h-48 bg-gray-200 rounded-lg" />}
            {d.caption1 && <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">{d.caption1}</div>}
          </div>
          <div className="relative">
            {d.image2 ? <img src={d.image2} alt="" className="w-full h-48 object-cover rounded-lg" /> : <div className="w-full h-48 bg-gray-200 rounded-lg" />}
            {d.caption2 && <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">{d.caption2}</div>}
          </div>
        </div>
      )
    }
    case "flipCards": {
      const d = block.data ? JSON.parse(block.data) : {}
      const cards = [[d.card1Front, d.card1Back], [d.card2Front, d.card2Back], [d.card3Front, d.card3Back]]
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          {cards.map((c: any, i: number) => (
            <div key={i} className="bg-white rounded-xl shadow p-5 text-center border border-gray-100">
              <div className="font-bold text-lg mb-2">{c[0]}</div>
              <div className="text-sm text-gray-500">{c[1]}</div>
            </div>
          ))}
        </div>
      )
    }
    case "searchBar": {
      const d = block.data ? JSON.parse(block.data) : {}
      return (
        <form action="/order-by-date" className="p-6 flex justify-center">
          <div className="flex w-full max-w-md">
            <input name="q" placeholder={d.placeholder || "Search..."} className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2" />
            <button type="submit" className="btn-primary rounded-r-lg px-5 py-2">Go</button>
          </div>
        </form>
      )
    }
    case "contactForm": {
      const d = block.data ? JSON.parse(block.data) : {}
      return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-xl border border-gray-100">
          <h3 className="text-xl font-bold mb-4">{d.heading}</h3>
          <form action="/contact_us/" method="post" className="space-y-3">
            <input name="name" placeholder="Name" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            <input name="email" placeholder="Email" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            <textarea name="message" placeholder="Message" className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20" />
            <button type="submit" className="btn-primary inline-block px-5 py-2 rounded-lg">{d.buttonLabel}</button>
          </form>
        </div>
      )
    }
    case "map": {
      const d = block.data ? JSON.parse(block.data) : {}
      const src = d.embedUrl || ("https://www.google.com/maps?q=" + encodeURIComponent(d.address || "") + "&output=embed")
      return (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <iframe src={src} className="w-full h-64" loading="lazy" />
        </div>
      )
    }
    case "articleFloat": {
      const d = block.data ? JSON.parse(block.data) : {}
      const side = d.imageSide === "right" ? "float-right ml-4" : "float-left mr-4"
      return (
        <div className="p-6">
          {d.imageUrl && <img src={d.imageUrl} alt="" className={"w-48 h-48 object-cover rounded-lg mb-2 " + side} />}
          <p className="text-gray-700 leading-relaxed">{d.text}</p>
          <div className="clear-both" />
        </div>
      )
    }
    case "store": {
      const d = block.data ? JSON.parse(block.data) : {}
      return (
        <div className="p-8 text-center bg-gray-50 rounded-xl">
          <h3 className="text-2xl font-bold mb-4">{d.heading}</h3>
          <a href={d.buttonUrl || "/order-by-date"} className="btn-primary inline-block px-6 py-3 rounded-lg">{d.buttonLabel}</a>
        </div>
      )
    }
    case "fourCol": {
      const d = block.data ? JSON.parse(block.data) : {}
      const cols = [[d.col1Title, d.col1Text], [d.col2Title, d.col2Text], [d.col3Title, d.col3Text], [d.col4Title, d.col4Text]]
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {cols.map(([t, x], i) => (
            <div key={i} className="text-center"><h4 className="font-bold text-dark mb-1">{t}</h4><p className="text-body text-sm">{x}</p></div>
          ))}
        </div>
      )
    }
    case "columnLinks": {
      const d = block.data ? JSON.parse(block.data) : {}
      const cols = [[d.col1Heading, d.col1Links], [d.col2Heading, d.col2Links], [d.col3Heading, d.col3Links]].filter((c) => c[0] || c[1])
      return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cols.map(([h, links], i) => (
            <div key={i}>
              {h && <h4 className="font-bold text-dark mb-2">{h}</h4>}
              <ul className="space-y-1">
                {(links || "").split(String.fromCharCode(10)).filter(Boolean).map((line: string, li: number) => {
                  const parts = line.split("|")
                  return <li key={li}><a href={parts[1] || "#"} className="text-primary hover:underline">{parts[0]}</a></li>
                })}
              </ul>
            </div>
          ))}
        </div>
      )
    }
    case "headerButton": {
      const d = block.data ? JSON.parse(block.data) : {}
      const align = d.align === "left" ? "text-left" : "text-center"
      return (
        <div className={"py-8 " + align}>
          <h2 className="text-3xl font-bold text-dark mb-2">{d.heading}</h2>
          {d.subtext && <p className="text-body mb-4">{d.subtext}</p>}
          {d.buttonLabel && <a href={d.buttonUrl || "#"} className="btn-primary inline-block">{d.buttonLabel}</a>}
        </div>
      )
    }default:
      return null
  }
}

export async function generateMetadata({params}:PageProps){
 const {slug}=await params
 const page=await prisma.websitePage.findUnique({where:{slug}})
 if(!page||!page.isPublished)return {title:'Page not found',robots:{index:false,follow:true}}
 const blocks=parseBlocks(page.content)
 const text=blocks.flatMap(block=>[block.text,block.headingText,block.heroSubtitle,block.ctaText]).filter(Boolean).join(' ')
 return scPageMetadata('/'+encodeURIComponent(slug),page.title,text||`${page.title} — Friendly Party Rental in Greenville and Upstate South Carolina.`,blocks.length>0)
}

export default async function CustomWebsitePage({ params }: PageProps) {
  const { slug } = await params
  const page = await prisma.websitePage.findUnique({ where: { slug } })
  if (!page || !page.isPublished) {
    notFound()
  }

  const blocks = parseBlocks(page!.content)

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-dark mb-3">{page!.title}</h1>
      </div>
      <div className="space-y-8 text-body">
        {blocks.map((block) => (
          <div key={block.id}>
            <RenderBlock block={block} />
          </div>
        ))}
      </div>
    </div>
  )
}
