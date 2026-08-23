'use client'

import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import Header from "@/components/public/Header"
import Footer from "@/components/public/Footer"
import StickyBar from "@/components/public/StickyBar"
import ChatWidget from "@/components/public/ChatWidget"

interface Page {
  id: string
  slug: string
  title: string
  content: string | null
  isPublished: boolean
}

type BlockType =
  | 'heading' | 'text' | 'image' | 'button' | 'html'
  | 'hero' | 'textImage' | 'testimonial' | 'threeCol' | 'cta'
  | 'videoFeature' | 'imageGrid' | 'faq' | 'table' | 'separator' | 'spacer'
  | "carousel" | "linkList" | "iconGrid" | "featureSection" | "productFeature"
  | "doubleImageBanner" | "flipCards" | "searchBar" | "contactForm" | "map" | "articleFloat" | "store"
  | "fourCol" | "columnLinks" | "headerButton"

interface Block {
  id: string
  type: BlockType
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

const TYPE_LABELS: Record<BlockType, string> = {
  heading: 'Heading',
  text: 'Text',
  image: 'Image',
  button: 'Button',
  html: 'Raw HTML',
  hero: 'Hero / Banner',
  textImage: 'Text + Image',
  testimonial: 'Testimonial',
  threeCol: '3-Column Feature',
  cta: 'Call To Action',
  videoFeature: 'Video Feature',
  imageGrid: 'Image Grid',
  faq: 'FAQ Accordion',
  table: 'Table',
  separator: 'Divider',
  spacer: 'Spacer',
  carousel: "Carousel",
  linkList: "Link List",
  iconGrid: "Icon Grid",
  featureSection: "Feature Section",
  productFeature: "Product Feature",
  doubleImageBanner: "Double Image Banner",
  flipCards: "Flip Cards",
  searchBar: "Search Bar",
  contactForm: "Contact Form",
  map: "Map Embed",
  articleFloat: "Article w/ Floated Image",
  store: "Store / Browse CTA",
  fourCol: "4-Column Boxes",
  columnLinks: "Link Columns",
  headerButton: "Header + Button Banner",
}

const TYPE_GROUPS: { label: string; types: BlockType[] }[] = [
  { label: 'Text & Media', types: ['heading', 'text', 'image', 'button', 'html'] },
  { label: 'Sections', types: ['hero', 'textImage', 'testimonial', 'threeCol', 'cta', 'videoFeature', 'imageGrid', 'faq'] },
  { label: 'Layout', types: ['table', 'separator', 'spacer'] },  { label: "More Sections", types: ["carousel", "featureSection", "productFeature", "doubleImageBanner", "flipCards", "articleFloat", "store", "fourCol", "columnLinks", "headerButton"] },
  { label: "Widgets", types: ["linkList", "iconGrid", "searchBar", "contactForm", "map"] },
]

function newBlock(type: BlockType): Block {
  const id = Math.random().toString(36).slice(2)
  switch (type) {
    case 'heading': return { id, type, headingText: 'New Heading', headingSize: 'h2' }
    case 'text': return { id, type, text: 'New paragraph text...' }
    case 'image': return { id, type, imageUrl: '', imageAlt: '' }
    case 'button': return { id, type, buttonLabel: 'Click Here', buttonUrl: '' }
    case 'html': return { id, type, html: '' }
    case 'hero': return { id, type, heroTitle: 'Title Here', heroSubtitle: 'Subtitle here', heroImageUrl: '', heroButtonLabel: 'Book Now', heroButtonUrl: '/contact_us', heroStyle: 'overlay' }
    case 'textImage': return { id, type, tiHeading: 'Heading', tiText: 'Description text...', tiImageUrl: '', tiImageSide: 'left' }
    case 'testimonial': return { id, type, quote: 'Great service!', author: 'Happy Customer', testimonialStyle: 'quote' }
    case 'threeCol': return { id, type, col1Title: 'Title 1', col1Text: 'Text 1', col2Title: 'Title 2', col2Text: 'Text 2', col3Title: 'Title 3', col3Text: 'Text 3' }
    case 'cta': return { id, type, ctaText: 'Ready to get started?', ctaButtonLabel: 'Contact Us', ctaButtonUrl: '/contact_us' }
    case 'videoFeature': return { id, type, videoUrl: '', videoCaption: '', videoSide: 'left', videoSize: 'normal', videoButtonLabel: '', videoButtonUrl: '' }
    case 'imageGrid': return { id, type, gridImage1: '', gridImage2: '', gridImage3: '', gridImage4: '', gridLayout: '4', gridLinkUrl: '' }
    case 'faq': return { id, type, faqQ1: 'Question 1?', faqA1: 'Answer 1', faqQ2: 'Question 2?', faqA2: 'Answer 2', faqQ3: 'Question 3?', faqA3: 'Answer 3' }
    case 'table': return { id, type, tableData: 'Header 1|Header 2\nRow 1A|Row 1B\nRow 2A|Row 2B', tableStyle: 'basic' }
    case 'separator': return { id, type }
    case 'spacer': return { id, type, spacerHeight: '40' }
    case "carousel": return { id, type, data: JSON.stringify({ mode: "images", item1Img: "", item1Cap: "Slide 1", item2Img: "", item2Cap: "Slide 2", item3Img: "", item3Cap: "Slide 3" }) }
    case "linkList": return { id, type, data: JSON.stringify({ heading: "Quick Links", link1Label: "Link 1", link1Url: "#", link2Label: "Link 2", link2Url: "#", link3Label: "Link 3", link3Url: "#", link4Label: "Link 4", link4Url: "#" }) }
    case "iconGrid": return { id, type, data: JSON.stringify({ item1Icon: "⭐", item1Title: "Feature 1", item1Text: "Description", item2Icon: "⭐", item2Title: "Feature 2", item2Text: "Description", item3Icon: "⭐", item3Title: "Feature 3", item3Text: "Description", item4Icon: "⭐", item4Title: "Feature 4", item4Text: "Description" }) }
    case "featureSection": return { id, type, data: JSON.stringify({ style: "main", heading: "Why Choose Us", subtext: "", col1Title: "Reason 1", col1Text: "Description", col2Title: "Reason 2", col2Text: "Description", col3Title: "Reason 3", col3Text: "Description" }) }
    case "productFeature": return { id, type, data: JSON.stringify({ image: "", title: "Product Name", description: "Product description...", price: "$0", buttonLabel: "View Details", buttonUrl: "#" }) }
    case "doubleImageBanner": return { id, type, data: JSON.stringify({ image1: "", caption1: "", image2: "", caption2: "" }) }
    case "flipCards": return { id, type, data: JSON.stringify({ card1Front: "Card 1", card1Back: "Details...", card2Front: "Card 2", card2Back: "Details...", card3Front: "Card 3", card3Back: "Details..." }) }
    case "searchBar": return { id, type, data: JSON.stringify({ placeholder: "Search rentals..." }) }
    case "contactForm": return { id, type, data: JSON.stringify({ heading: "Contact Us", buttonLabel: "Send Message" }) }
    case "map": return { id, type, data: JSON.stringify({ address: "330 Costello Parkway, Minoa, NY 13116", embedUrl: "" }) }
    case "articleFloat": return { id, type, data: JSON.stringify({ imageUrl: "", imageSide: "left", text: "Article text wraps around the image..." }) }
    case "store": return { id, type, data: JSON.stringify({ heading: "Browse Our Rentals", buttonLabel: "View All Rentals", buttonUrl: "/order-by-date" }) }
    case "fourCol": return { id, type, data: JSON.stringify({ col1Title: "Feature 1", col1Text: "Description", col2Title: "Feature 2", col2Text: "Description", col3Title: "Feature 3", col3Text: "Description", col4Title: "Feature 4", col4Text: "Description" }) }
    case "columnLinks": return { id, type, data: JSON.stringify({ col1Heading: "Quick Links", col1Links: "Home|/\nAbout|/about", col2Heading: "Resources", col2Links: "FAQ|/faq", col3Heading: "", col3Links: "" }) }
    case "headerButton": return { id, type, data: JSON.stringify({ heading: "Ready to Book?", subtext: "", buttonLabel: "Get a Quote", buttonUrl: "/contact_us", align: "center" }) }
  }
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

function RenderBlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case 'heading': {
      const Tag = (block.headingSize || 'h2') as any
      const sizeCls = block.headingSize === 'h1' ? 'text-4xl' : block.headingSize === 'h3' ? 'text-xl' : 'text-2xl'
      return <Tag className={sizeCls + ' font-bold text-dark'}>{block.headingText}</Tag>
    }
    case 'text':
      return <p className="text-body whitespace-pre-line">{block.text}</p>
    case 'image':
      return block.imageUrl ? <img src={block.imageUrl} alt={block.imageAlt || ''} className="rounded-lg max-w-full" /> : <div className="bg-gray-200 text-gray-400 text-sm rounded-lg p-8 text-center">Image (no URL set)</div>
    case 'button':
      return <a href={block.buttonUrl || '#'} className="btn-primary inline-block">{block.buttonLabel}</a>
    case 'html':
      return block.html ? <div dangerouslySetInnerHTML={{ __html: block.html }} /> : <div className="bg-gray-100 text-gray-400 text-sm rounded p-4">Raw HTML block (empty)</div>
    case 'hero': {
      const hs = block.heroStyle || "overlay"
      const solid = hs === "solid-blue" || hs === "solid-red"
      const bgClass = hs === "solid-blue" ? "bg-blue-600 text-white" : hs === "solid-red" ? "bg-red-600 text-white" : "bg-gray-800 text-white bg-cover bg-center"
      const alignClass = hs === "left-align" ? "text-left items-start" : "text-center items-center"
      return (
        <div className={"rounded-xl p-12 flex flex-col " + alignClass + " " + bgClass} style={(!solid && block.heroImageUrl) ? { backgroundImage: "linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.45)), url(" + block.heroImageUrl + ")" } : undefined}>
          <h2 className="text-4xl font-bold mb-3">{block.heroTitle}</h2>
          <p className="text-lg mb-6">{block.heroSubtitle}</p>
          <div className="flex gap-3">
            {block.heroButtonLabel && <span className="btn-primary inline-block">{block.heroButtonLabel}</span>}
            {hs === "two-button" && <span className="inline-block border border-white px-4 py-2 rounded">Learn More</span>}
          </div>
        </div>
      )
    }
    case 'textImage':
      return (
        <div className={'flex gap-8 flex-col md:flex-row items-center ' + (block.tiImageSide === 'right' ? 'md:flex-row-reverse' : '')}>
          {block.tiImageUrl && <img src={block.tiImageUrl} alt="" className="md:w-1/2 rounded-lg" />}
          <div className="md:w-1/2">
            <h3 className="text-2xl font-bold text-dark mb-2">{block.tiHeading}</h3>
            <p className="text-body whitespace-pre-line">{block.tiText}</p>
          </div>
        </div>
      )
    case 'testimonial': {
      const card = block.testimonialStyle === "card"
      return card ? (
        <div className="border rounded-xl p-6 shadow-sm bg-white text-center">
          <p className="italic text-body">"{block.quote}"</p>
          <p className="mt-3 font-bold text-dark">- {block.author}</p>
        </div>
      ) : (
        <blockquote className="border-l-4 border-primary pl-6 italic text-lg text-body">
          <p>"{block.quote}"</p>
          <footer className="mt-2 not-italic font-bold text-dark">- {block.author}</footer>
        </blockquote>
      )
    }
    case 'threeCol':
      return (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center"><h4 className="font-bold text-lg text-dark mb-1">{block.col1Title}</h4><p className="text-body text-sm">{block.col1Text}</p></div>
          <div className="text-center"><h4 className="font-bold text-lg text-dark mb-1">{block.col2Title}</h4><p className="text-body text-sm">{block.col2Text}</p></div>
          <div className="text-center"><h4 className="font-bold text-lg text-dark mb-1">{block.col3Title}</h4><p className="text-body text-sm">{block.col3Text}</p></div>
        </div>
      )
    case 'cta':
      return (
        <div className="bg-secondary text-white rounded-xl p-10 text-center">
          <p className="text-xl font-bold mb-4">{block.ctaText}</p>
          <span className="btn-gold inline-block">{block.ctaButtonLabel}</span>
        </div>
      )
    case 'videoFeature': {
      const sideClass = block.videoSide === "right" ? "md:flex-row-reverse" : ""
      const big = block.videoSize === "large"
      return (
        <div className={"flex flex-col md:flex-row gap-6 items-center " + sideClass}>
          <div className={big ? "md:w-2/3" : "md:w-1/2"}>
            {block.videoUrl ? <div className="aspect-video rounded-lg overflow-hidden"><iframe src={block.videoUrl} className="w-full h-full" allowFullScreen /></div> : <div className="bg-gray-200 text-gray-400 text-sm rounded-lg p-8 text-center">Video (no URL set)</div>}
          </div>
          <div className={big ? "md:w-1/3" : "md:w-1/2"}>
            {block.videoCaption && <p className="text-body">{block.videoCaption}</p>}
            {block.videoButtonLabel && <span className="btn-primary inline-block mt-3">{block.videoButtonLabel}</span>}
          </div>
        </div>
      )
    }
    case 'imageGrid': {
      const cols = block.gridLayout === "3" ? "md:grid-cols-3" : block.gridLayout === "6" ? "md:grid-cols-6" : "md:grid-cols-4"
      const imgs = [block.gridImage1, block.gridImage2, block.gridImage3, block.gridImage4]
      return (
        <div className={"grid grid-cols-2 " + cols + " gap-3"}>
          {imgs.map((src, i) => {
            const el = src ? <img src={src} alt="" className="rounded-lg aspect-square object-cover w-full" /> : <div className="bg-gray-200 rounded-lg aspect-square" />
            return block.gridLinkUrl ? <a key={i} href={block.gridLinkUrl}>{el}</a> : <div key={i}>{el}</div>
          })}
        </div>
      )
    }
    case 'faq':
      return (
        <div className="space-y-2">
          {[[block.faqQ1, block.faqA1], [block.faqQ2, block.faqA2], [block.faqQ3, block.faqA3]].map(([q, a], i) => q ? (
            <details key={i} className="border rounded-lg p-3">
              <summary className="font-bold text-dark cursor-pointer">{q}</summary>
              <p className="text-body text-sm mt-2">{a}</p>
            </details>
          ) : null)}
        </div>
      )
    case 'table': {
      const rows = (block.tableData || '').split('\n').filter(Boolean).map((r) => r.split('|'))
      const ts = block.tableStyle || "basic"
      const striped = ts === "striped" || ts === "borderedStriped"
      const bordered = ts === "bordered" || ts === "borderedStriped"
      return (
        <table className={"w-full border-collapse text-sm " + (bordered ? "border" : "")}>
          <tbody>
            {rows.map((cells, ri) => (
              <tr key={ri} className={striped && ri > 0 && ri % 2 === 0 ? "bg-gray-50" : ""}>
                {cells.map((c, ci) => ri === 0 ? <th key={ci} className={"p-2 bg-gray-100 text-left " + (bordered ? "border" : "border-b-2")}>{c}</th> : <td key={ci} className={"p-2 " + (bordered ? "border" : "border-b")}>{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }
    case 'separator':
      return <hr className="border-t-2 border-gray-200" />
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
              <div className="text-xs text-gray-400 mt-2">(flips on hover on live site)</div>
            </div>
          ))}
        </div>
      )
    }
    case "searchBar": {
      const d = block.data ? JSON.parse(block.data) : {}
      return (
        <div className="p-6 flex justify-center">
          <div className="flex w-full max-w-md">
            <input disabled placeholder={d.placeholder || "Search..."} className="flex-1 border border-gray-300 rounded-l-lg px-4 py-2" />
            <span className="btn-primary rounded-r-lg px-5 py-2">Go</span>
          </div>
        </div>
      )
    }
    case "contactForm": {
      const d = block.data ? JSON.parse(block.data) : {}
      return (
        <div className="p-6 max-w-md mx-auto bg-white rounded-xl border border-gray-100">
          <h3 className="text-xl font-bold mb-4">{d.heading}</h3>
          <div className="space-y-3">
            <input disabled placeholder="Name" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            <input disabled placeholder="Email" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
            <textarea disabled placeholder="Message" className="w-full border border-gray-300 rounded-lg px-3 py-2 h-20" />
            <span className="btn-primary inline-block px-5 py-2 rounded-lg">{d.buttonLabel}</span>
          </div>
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
          <span className="btn-primary inline-block px-6 py-3 rounded-lg">{d.buttonLabel}</span>
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
                {(links || "").split("\n").filter(Boolean).map((line: string, j: number) => {
                  const parts = line.split("|")
                  return <li key={j}><a href={parts[1] || "#"} className="text-primary hover:underline">{parts[0]}</a></li>
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
          {d.buttonLabel && <span className="btn-primary inline-block">{d.buttonLabel}</span>}
        </div>
      )
    }default:
      return null
  }
}

export default function VisualBuilderPage() {
  const [pages, setPages] = useState<Page[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [newSlug, setNewSlug] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addAt, setAddAt] = useState<number | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showPagesPanel, setShowPagesPanel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [navItems, setNavItems] = useState<{ label: string; url: string }[]>([])
  const [theme, setTheme] = useState<{ headerStyle: number; footerStyle: string; btnPrimaryColor: string; btnPrimaryColorBg: string } | null>(null)

  useEffect(() => {
    fetch("/api/admin/navigation-editor").then((r) => r.json()).then((d) => {
      const items = (d.items || []).filter((i: any) => i.isActive !== false).map((i: any) => ({ label: i.label, url: i.url }))
      setNavItems(items)
    }).catch(() => {})
    fetch("/api/admin/theme-settings").then((r) => r.json()).then((d) => setTheme(d.settings || null)).catch(() => {})
  }, [])

  const load = async () => {
    const res = await fetch('/api/admin/website-pages')
    const data = await res.json()
    setPages(data.items || [])
  }

  useEffect(() => { load() }, [])

  const selectPage = (id: string) => {
    setSelectedId(id)
    const page = pages.find((p) => p.id === id)
    setBlocks(page ? parseBlocks(page.content) : [])
    setEditingId(null)
  }

  const addBlockAt = (type: BlockType, index: number) => {
    const b = newBlock(type)
    setBlocks((prev) => {
      const copy = [...prev]
      copy.splice(index, 0, b)
      return copy
    })
    setAddAt(null)
    setEditingId(b.id)
  }

  const updateBlock = (id: string, patch: Partial<Block>) => {
    setBlocks((b) => b.map((blk) => (blk.id === id ? { ...blk, ...patch } : blk)))
  }

  const removeBlock = (id: string) => {
    setBlocks((b) => b.filter((blk) => blk.id !== id))
    if (editingId === id) setEditingId(null)
    setConfirmDeleteId(null)
  }

  const moveBlock = (index: number, dir: number) => {
    setBlocks((b) => {
      const target = index + dir
      if (target < 0 || target >= b.length) return b
      const copy = [...b]
      const tmp = copy[index]
      copy[index] = copy[target]
      copy[target] = tmp
      return copy
    })
  }

  const handleDragStart = (index: number) => setDragIndex(index)
  const handleDragOverBlock = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }
  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) { setDragIndex(null); setDragOverIndex(null); return }
    setBlocks((b) => {
      const copy = [...b]
      const [moved] = copy.splice(dragIndex, 1)
      const target = dragIndex < index ? index - 1 : index
      copy.splice(target, 0, moved)
      return copy
    })
    setDragIndex(null)
    setDragOverIndex(null)
  }

  const createPage = async () => {
    if (!newSlug || !newTitle) {
      toast.error('Slug and title are required')
      return
    }
    const res = await fetch('/api/admin/website-pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: newSlug, title: newTitle, content: JSON.stringify([]), isPublished: true }),
    })
    if (res.ok) {
      toast.success('Page created')
      setNewSlug('')
      setNewTitle('')
      await load()
    } else toast.error('Failed to create page')
  }

  const save = async () => {
    if (!selectedId) return
    setSaving(true)
    const res = await fetch('/api/admin/website-pages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selectedId, content: JSON.stringify(blocks) }),
    })
    setSaving(false)
    if (res.ok) {
      toast.success('Page saved')
      await load()
    } else toast.error('Failed to save')
  }

  const inputCls = 'border rounded p-2 w-full text-sm'
  const selectedPage = pages.find((p) => p.id === selectedId)
  const editingBlock = blocks.find((b) => b.id === editingId) || null

  return (
    <div className="flex h-screen overflow-hidden">
      {showPagesPanel && (
        <div className="w-72 border-r bg-white overflow-y-auto p-4 fixed left-0 top-0 h-full z-40 shadow-2xl">
          <h1 className="text-lg font-bold text-dark mb-1">Visual Page Builder</h1>
          <p className="text-xs text-body mb-4">Edit pages exactly as they appear live. Click a section to edit, drag to reorder, hover for delete.</p>
          <div className="space-y-1 mb-4">
            {pages.map((p) => (
              <button key={p.id} onClick={() => selectPage(p.id)} className={'w-full text-left px-3 py-2 rounded text-sm ' + (selectedId === p.id ? 'bg-secondary text-white' : 'hover:bg-gray-100')}>
                {p.title}
                <div className={'text-xs ' + (selectedId === p.id ? 'text-blue-100' : 'text-gray-400')}>/{p.slug}</div>
              </button>
            ))}
          </div>
          <div className="border-t pt-4">
            <p className="text-xs font-bold text-dark mb-2">Create New Page</p>
            <input className={inputCls + ' mb-2'} placeholder="Title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <input className={inputCls + ' mb-2'} placeholder="slug-like-this" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
            <button onClick={createPage} className="btn-admin w-full text-sm">+ Create Page</button>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b bg-white/95 backdrop-blur px-4 py-2 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowPagesPanel((s) => !s)} className="text-sm border rounded px-2 py-1 hover:bg-gray-100">☰ Pages</button>
            {selectedPage && <span className="text-sm font-bold text-dark">{selectedPage.title}</span>}
          </div>
          <div className="flex items-center gap-2">
            {selectedPage && <a href={'/' + selectedPage.slug} target="_blank" rel="noreferrer" className="text-sm text-secondary hover:underline">View Live Page ↗</a>}
            <button onClick={save} disabled={!selectedId || saving} className="btn-admin text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Save Page'}</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {!selectedId ? (
            <div className="text-center text-gray-400 mt-20">Select or create a page to start editing</div>
          ) : (
            <div className="w-full bg-white">
              <style dangerouslySetInnerHTML={{ __html: `:root { --theme-btn-primary: ${theme?.btnPrimaryColor || "#F5A31B"}; --theme-btn-primary-bg: ${theme?.btnPrimaryColorBg || "#F5A31B"}; } .btn-primary { background-color: var(--theme-btn-primary-bg) !important; color: ${(theme?.btnPrimaryColor || "#F5A31B") === (theme?.btnPrimaryColorBg || "#F5A31B") ? "#fff" : (theme?.btnPrimaryColor || "#F5A31B")} !important; }` }} />
              <div onClickCapture={(e) => { e.preventDefault(); e.stopPropagation() }}><Header navItems={navItems} headerStyle={theme?.headerStyle ?? 1} /></div>
              <div className="p-8 space-y-2">
                <AddSectionBar onAdd={() => setAddAt(0)} />
                {blocks.length === 0 && <p className="text-center text-gray-400 py-8">No sections yet — click + Add Section above to start building this page.</p>}
                {blocks.map((block, index) => (
                  <div key={block.id}>
                    <div
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOverBlock(e, index)}
                      onDrop={() => handleDrop(index)}
                      className={'relative group border-2 rounded-lg p-4 transition-colors ' + (dragOverIndex === index ? 'border-secondary bg-blue-50' : 'border-transparent hover:border-gray-300')}
                    >
                      <div className="absolute top-2 right-2 hidden group-hover:flex gap-1 bg-white shadow rounded z-10">
                        <button title="Drag to reorder" className="cursor-move px-2 py-1 text-gray-500 hover:text-dark">⠿</button>
                        <button title="Move up" onClick={() => moveBlock(index, -1)} className="px-2 py-1 text-gray-500 hover:text-dark">▲</button>
                        <button title="Move down" onClick={() => moveBlock(index, 1)} className="px-2 py-1 text-gray-500 hover:text-dark">▼</button>
                        <button title="Edit section" onClick={() => setEditingId(block.id)} className="px-2 py-1 text-secondary hover:text-blue-700">✎</button>
                        <button title="Delete section" onClick={() => setConfirmDeleteId(block.id)} className="px-2 py-1 text-red-500 hover:text-red-700">🗑</button>
                      </div>
                      <div className="absolute top-2 left-2 hidden group-hover:block bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded">{TYPE_LABELS[block.type]}</div>
                      <RenderBlockPreview block={block} />
                    </div>
                    <AddSectionBar onAdd={() => setAddAt(index + 1)} />
                  </div>
                ))}
              </div>

              <div onClickCapture={(e) => { e.preventDefault(); e.stopPropagation() }}><Footer footerStyle={theme?.footerStyle ?? "dark"} /></div>
              <div onClickCapture={(e) => { e.preventDefault(); e.stopPropagation() }}><StickyBar /></div>
              <ChatWidget />
              
            </div>
          )}
        </div>
      </div>

      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-dark mb-2">Delete this section?</h2>
            <p className="text-sm text-body mb-6">This can't be undone once you save the page.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded text-sm border hover:bg-gray-50">Cancel</button>
              <button onClick={() => removeBlock(confirmDeleteId)} className="px-4 py-2 rounded text-sm bg-red-600 text-white hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {addAt !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setAddAt(null)}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-dark">Add a Section</h2>
              <button onClick={() => setAddAt(null)} className="text-gray-400 hover:text-dark text-xl leading-none">×</button>
            </div>
            {TYPE_GROUPS.map((group) => (
              <div key={group.label} className="mb-4">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">{group.label}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {group.types.map((t) => (
                    <button key={t} onClick={() => addBlockAt(t, addAt)} className="border rounded-lg p-3 text-sm text-left hover:border-secondary hover:bg-blue-50">
                      {TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editingBlock && (
        <div className="fixed inset-0 bg-black/40 flex justify-end z-50" onClick={() => setEditingId(null)}>
          <div className="bg-white w-full max-w-md h-full overflow-y-auto p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-dark">Edit: {TYPE_LABELS[editingBlock.type]}</h2>
              <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-dark text-xl leading-none">×</button>
            </div>
            <BlockEditForm block={editingBlock} inputCls={inputCls} onChange={(patch) => updateBlock(editingBlock.id, patch)} />
            <button onClick={() => setEditingId(null)} className="btn-admin w-full mt-6">Done</button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddSectionBar({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="group/add relative h-3 flex items-center justify-center">
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-transparent group-hover/add:border-gray-300" />
      <button onClick={onAdd} className="opacity-0 group-hover/add:opacity-100 transition-opacity bg-secondary text-white text-xs px-3 py-1 rounded-full shadow z-10">+ Add Section</button>
    </div>
  )
}

function BlockEditForm({ block, inputCls, onChange }: { block: Block; inputCls: string; onChange: (patch: Partial<Block>) => void }) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="space-y-2">
          <input className={inputCls} placeholder="Heading text" value={block.headingText || ''} onChange={(e) => onChange({ headingText: e.target.value })} />
          <select className={inputCls} value={block.headingSize || 'h2'} onChange={(e) => onChange({ headingSize: e.target.value as any })}>
            <option value="h1">H1 (largest)</option>
            <option value="h2">H2</option>
            <option value="h3">H3 (smallest)</option>
          </select>
        </div>
      )
    case 'text':
      return <textarea className={inputCls} rows={5} placeholder="Paragraph text" value={block.text || ''} onChange={(e) => onChange({ text: e.target.value })} />
    case 'image':
      return (
        <div className="space-y-2">
          <input className={inputCls} placeholder="Image URL" value={block.imageUrl || ''} onChange={(e) => onChange({ imageUrl: e.target.value })} />
          <input className={inputCls} placeholder="Alt text" value={block.imageAlt || ''} onChange={(e) => onChange({ imageAlt: e.target.value })} />
        </div>
      )
    case 'button':
      return (
        <div className="space-y-2">
          <input className={inputCls} placeholder="Button label" value={block.buttonLabel || ''} onChange={(e) => onChange({ buttonLabel: e.target.value })} />
          <input className={inputCls} placeholder="Link URL" value={block.buttonUrl || ''} onChange={(e) => onChange({ buttonUrl: e.target.value })} />
        </div>
      )
    case 'html':
      return <textarea className={inputCls} rows={8} placeholder="Raw HTML" value={block.html || ''} onChange={(e) => onChange({ html: e.target.value })} />
    case 'hero':
      return (
        <div className="space-y-2">
          <select className={inputCls} value={block.heroStyle || "overlay"} onChange={(e) => onChange({ heroStyle: e.target.value })}>
            <option value="overlay">Photo with dark overlay (Banner1)</option>
            <option value="solid-blue">Solid blue background (Banner2)</option>
            <option value="solid-red">Solid red background (Banner3)</option>
            <option value="left-align">Left-aligned text (Banner4)</option>
            <option value="two-button">Two buttons (Banner Swiper)</option>
          </select>
          <input className={inputCls} placeholder="Title" value={block.heroTitle || ''} onChange={(e) => onChange({ heroTitle: e.target.value })} />
          <input className={inputCls} placeholder="Subtitle" value={block.heroSubtitle || ''} onChange={(e) => onChange({ heroSubtitle: e.target.value })} />
          <input className={inputCls} placeholder="Background image URL" value={block.heroImageUrl || ''} onChange={(e) => onChange({ heroImageUrl: e.target.value })} />
          <input className={inputCls} placeholder="Button label" value={block.heroButtonLabel || ''} onChange={(e) => onChange({ heroButtonLabel: e.target.value })} />
          <input className={inputCls} placeholder="Button URL" value={block.heroButtonUrl || ''} onChange={(e) => onChange({ heroButtonUrl: e.target.value })} />
        </div>
      )
    case 'textImage':
      return (
        <div className="space-y-2">
          <input className={inputCls} placeholder="Heading" value={block.tiHeading || ''} onChange={(e) => onChange({ tiHeading: e.target.value })} />
          <textarea className={inputCls} rows={4} placeholder="Text" value={block.tiText || ''} onChange={(e) => onChange({ tiText: e.target.value })} />
          <input className={inputCls} placeholder="Image URL" value={block.tiImageUrl || ''} onChange={(e) => onChange({ tiImageUrl: e.target.value })} />
          <select className={inputCls} value={block.tiImageSide || 'left'} onChange={(e) => onChange({ tiImageSide: e.target.value as any })}>
            <option value="left">Image on left</option>
            <option value="right">Image on right</option>
          </select>
        </div>
      )
    case 'testimonial':
      return (
        <div className="space-y-2">
          <select className={inputCls} value={block.testimonialStyle || "quote"} onChange={(e) => onChange({ testimonialStyle: e.target.value })}>
            <option value="quote">Quote style (Testimonial1)</option>
            <option value="card">Card style (Testimonial2)</option>
          </select>
          <textarea className={inputCls} rows={3} placeholder="Quote" value={block.quote || ''} onChange={(e) => onChange({ quote: e.target.value })} />
          <input className={inputCls} placeholder="Author" value={block.author || ''} onChange={(e) => onChange({ author: e.target.value })} />
        </div>
      )
    case 'threeCol':
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="border rounded p-2 space-y-1">
              <input className={inputCls} placeholder={'Column ' + n + ' title'} value={(block as any)['col' + n + 'Title'] || ''} onChange={(e) => onChange({ ['col' + n + 'Title']: e.target.value } as any)} />
              <textarea className={inputCls} rows={2} placeholder={'Column ' + n + ' text'} value={(block as any)['col' + n + 'Text'] || ''} onChange={(e) => onChange({ ['col' + n + 'Text']: e.target.value } as any)} />
            </div>
          ))}
        </div>
      )
    case 'cta':
      return (
        <div className="space-y-2">
          <textarea className={inputCls} rows={2} placeholder="Call to action text" value={block.ctaText || ''} onChange={(e) => onChange({ ctaText: e.target.value })} />
          <input className={inputCls} placeholder="Button label" value={block.ctaButtonLabel || ''} onChange={(e) => onChange({ ctaButtonLabel: e.target.value })} />
          <input className={inputCls} placeholder="Button URL" value={block.ctaButtonUrl || ''} onChange={(e) => onChange({ ctaButtonUrl: e.target.value })} />
        </div>
      )
    case 'videoFeature':
      return (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select className={inputCls} value={block.videoSide || "left"} onChange={(e) => onChange({ videoSide: e.target.value })}>
              <option value="left">Video on left</option>
              <option value="right">Video on right</option>
            </select>
            <select className={inputCls} value={block.videoSize || "normal"} onChange={(e) => onChange({ videoSize: e.target.value })}>
              <option value="normal">Normal size</option>
              <option value="large">Larger video</option>
            </select>
          </div>
          <input className={inputCls} placeholder="Video embed URL" value={block.videoUrl || ''} onChange={(e) => onChange({ videoUrl: e.target.value })} />
          <input className={inputCls} placeholder="Caption" value={block.videoCaption || ''} onChange={(e) => onChange({ videoCaption: e.target.value })} />
          <input className={inputCls} placeholder="Button label (optional)" value={block.videoButtonLabel || ''} onChange={(e) => onChange({ videoButtonLabel: e.target.value })} />
          <input className={inputCls} placeholder="Button URL (optional)" value={block.videoButtonUrl || ''} onChange={(e) => onChange({ videoButtonUrl: e.target.value })} />
        </div>
      )
    case 'imageGrid':
      return (
        <div className="space-y-2">
          <select className={inputCls} value={block.gridLayout || "4"} onChange={(e) => onChange({ gridLayout: e.target.value })}>
            <option value="3">3 columns</option>
            <option value="4">4 columns</option>
            <option value="6">6 columns</option>
          </select>
          <input className={inputCls} placeholder="Link URL for all images (optional)" value={block.gridLinkUrl || ''} onChange={(e) => onChange({ gridLinkUrl: e.target.value })} />
          {[1, 2, 3, 4].map((n) => (
            <input key={n} className={inputCls} placeholder={'Image ' + n + ' URL'} value={(block as any)['gridImage' + n] || ''} onChange={(e) => onChange({ ['gridImage' + n]: e.target.value } as any)} />
          ))}
        </div>
      )
    case 'faq':
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="border rounded p-2 space-y-1">
              <input className={inputCls} placeholder={'Question ' + n} value={(block as any)['faqQ' + n] || ''} onChange={(e) => onChange({ ['faqQ' + n]: e.target.value } as any)} />
              <textarea className={inputCls} rows={2} placeholder={'Answer ' + n} value={(block as any)['faqA' + n] || ''} onChange={(e) => onChange({ ['faqA' + n]: e.target.value } as any)} />
            </div>
          ))}
        </div>
      )
    case 'table':
      return (
        <div className="space-y-2">
          <select className={inputCls} value={block.tableStyle || "basic"} onChange={(e) => onChange({ tableStyle: e.target.value })}>
            <option value="basic">Basic</option>
            <option value="striped">Basic Striped</option>
            <option value="bordered">Bordered</option>
            <option value="borderedStriped">Bordered Striped</option>
          </select>
          <p className="text-xs text-gray-400 mb-1">One row per line. Separate columns with | . First row is the header.</p>
          <textarea className={inputCls} rows={6} value={block.tableData || ''} onChange={(e) => onChange({ tableData: e.target.value })} />
        </div>
      )
    case 'separator':
      return <p className="text-sm text-gray-400">This is a plain horizontal divider line. No settings needed.</p>
    case 'spacer':
      return (
        <div>
          <label className="text-xs text-gray-400">Height (pixels)</label>
          <input type="number" className={inputCls} value={block.spacerHeight || '40'} onChange={(e) => onChange({ spacerHeight: e.target.value })} />
        </div>
      )
    
    case "carousel": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-2">
          <label className="text-xs text-gray-400">Mode</label>
          <select className={inputCls} value={d.mode || "images"} onChange={(e) => set({ mode: e.target.value })}>
            <option value="images">Images</option>
            <option value="quotes">Quotes</option>
          </select>
          <label className="text-xs text-gray-400">Slide 1</label>
          <input className={inputCls} placeholder="Image URL" value={d.item1Img || ""} onChange={(e) => set({ item1Img: e.target.value })} />
          <input className={inputCls} placeholder="Caption / Quote" value={d.item1Cap || ""} onChange={(e) => set({ item1Cap: e.target.value })} />
          <label className="text-xs text-gray-400">Slide 2</label>
          <input className={inputCls} placeholder="Image URL" value={d.item2Img || ""} onChange={(e) => set({ item2Img: e.target.value })} />
          <input className={inputCls} placeholder="Caption / Quote" value={d.item2Cap || ""} onChange={(e) => set({ item2Cap: e.target.value })} />
          <label className="text-xs text-gray-400">Slide 3</label>
          <input className={inputCls} placeholder="Image URL" value={d.item3Img || ""} onChange={(e) => set({ item3Img: e.target.value })} />
          <input className={inputCls} placeholder="Caption / Quote" value={d.item3Cap || ""} onChange={(e) => set({ item3Cap: e.target.value })} />
        </div>
      )
    }
    case "linkList": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-2">
          <label className="text-xs text-gray-400">Heading</label>
          <input className={inputCls} value={d.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
          <div className="flex gap-2"><input className={inputCls} placeholder="Link 1 label" value={d.link1Label || ""} onChange={(e) => set({ link1Label: e.target.value })} /><input className={inputCls} placeholder="Link 1 URL" value={d.link1Url || ""} onChange={(e) => set({ link1Url: e.target.value })} /></div>
          <div className="flex gap-2"><input className={inputCls} placeholder="Link 2 label" value={d.link2Label || ""} onChange={(e) => set({ link2Label: e.target.value })} /><input className={inputCls} placeholder="Link 2 URL" value={d.link2Url || ""} onChange={(e) => set({ link2Url: e.target.value })} /></div>
          <div className="flex gap-2"><input className={inputCls} placeholder="Link 3 label" value={d.link3Label || ""} onChange={(e) => set({ link3Label: e.target.value })} /><input className={inputCls} placeholder="Link 3 URL" value={d.link3Url || ""} onChange={(e) => set({ link3Url: e.target.value })} /></div>
          <div className="flex gap-2"><input className={inputCls} placeholder="Link 4 label" value={d.link4Label || ""} onChange={(e) => set({ link4Label: e.target.value })} /><input className={inputCls} placeholder="Link 4 URL" value={d.link4Url || ""} onChange={(e) => set({ link4Url: e.target.value })} /></div>
        </div>
      )
    }
    case "iconGrid": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-2">
          <div className="border-t pt-2"><input className={inputCls} placeholder="Icon (emoji)" value={d.item1Icon || ""} onChange={(e) => set({ item1Icon: e.target.value })} /><input className={inputCls} placeholder="Title" value={d.item1Title || ""} onChange={(e) => set({ item1Title: e.target.value })} /><input className={inputCls} placeholder="Text" value={d.item1Text || ""} onChange={(e) => set({ item1Text: e.target.value })} /></div>
          <div className="border-t pt-2"><input className={inputCls} placeholder="Icon (emoji)" value={d.item2Icon || ""} onChange={(e) => set({ item2Icon: e.target.value })} /><input className={inputCls} placeholder="Title" value={d.item2Title || ""} onChange={(e) => set({ item2Title: e.target.value })} /><input className={inputCls} placeholder="Text" value={d.item2Text || ""} onChange={(e) => set({ item2Text: e.target.value })} /></div>
          <div className="border-t pt-2"><input className={inputCls} placeholder="Icon (emoji)" value={d.item3Icon || ""} onChange={(e) => set({ item3Icon: e.target.value })} /><input className={inputCls} placeholder="Title" value={d.item3Title || ""} onChange={(e) => set({ item3Title: e.target.value })} /><input className={inputCls} placeholder="Text" value={d.item3Text || ""} onChange={(e) => set({ item3Text: e.target.value })} /></div>
          <div className="border-t pt-2"><input className={inputCls} placeholder="Icon (emoji)" value={d.item4Icon || ""} onChange={(e) => set({ item4Icon: e.target.value })} /><input className={inputCls} placeholder="Title" value={d.item4Title || ""} onChange={(e) => set({ item4Title: e.target.value })} /><input className={inputCls} placeholder="Text" value={d.item4Text || ""} onChange={(e) => set({ item4Text: e.target.value })} /></div>
        </div>
      )
    }
    case "featureSection": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-2">
          <label className="text-xs text-gray-400">Style</label>
          <select className={inputCls} value={d.style || "main"} onChange={(e) => set({ style: e.target.value })}>
            <option value="main">Light Blue</option>
            <option value="red">Red</option>
            <option value="gray">Gray</option>
          </select>
          <input className={inputCls} placeholder="Heading" value={d.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
          <input className={inputCls} placeholder="Subtext" value={d.subtext || ""} onChange={(e) => set({ subtext: e.target.value })} />
          <div className="border-t pt-2"><input className={inputCls} placeholder="Col 1 Title" value={d.col1Title || ""} onChange={(e) => set({ col1Title: e.target.value })} /><input className={inputCls} placeholder="Col 1 Text" value={d.col1Text || ""} onChange={(e) => set({ col1Text: e.target.value })} /></div>
          <div className="border-t pt-2"><input className={inputCls} placeholder="Col 2 Title" value={d.col2Title || ""} onChange={(e) => set({ col2Title: e.target.value })} /><input className={inputCls} placeholder="Col 2 Text" value={d.col2Text || ""} onChange={(e) => set({ col2Text: e.target.value })} /></div>
          <div className="border-t pt-2"><input className={inputCls} placeholder="Col 3 Title" value={d.col3Title || ""} onChange={(e) => set({ col3Title: e.target.value })} /><input className={inputCls} placeholder="Col 3 Text" value={d.col3Text || ""} onChange={(e) => set({ col3Text: e.target.value })} /></div>
        </div>
      )
    }
    case "productFeature": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-2">
          <input className={inputCls} placeholder="Image URL" value={d.image || ""} onChange={(e) => set({ image: e.target.value })} />
          <input className={inputCls} placeholder="Title" value={d.title || ""} onChange={(e) => set({ title: e.target.value })} />
          <textarea className={inputCls} placeholder="Description" value={d.description || ""} onChange={(e) => set({ description: e.target.value })} />
          <input className={inputCls} placeholder="Price" value={d.price || ""} onChange={(e) => set({ price: e.target.value })} />
          <input className={inputCls} placeholder="Button Label" value={d.buttonLabel || ""} onChange={(e) => set({ buttonLabel: e.target.value })} />
          <input className={inputCls} placeholder="Button URL" value={d.buttonUrl || ""} onChange={(e) => set({ buttonUrl: e.target.value })} />
        </div>
      )
    }
    case "doubleImageBanner": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-2">
          <input className={inputCls} placeholder="Image 1 URL" value={d.image1 || ""} onChange={(e) => set({ image1: e.target.value })} />
          <input className={inputCls} placeholder="Caption 1" value={d.caption1 || ""} onChange={(e) => set({ caption1: e.target.value })} />
          <input className={inputCls} placeholder="Image 2 URL" value={d.image2 || ""} onChange={(e) => set({ image2: e.target.value })} />
          <input className={inputCls} placeholder="Caption 2" value={d.caption2 || ""} onChange={(e) => set({ caption2: e.target.value })} />
        </div>
      )
    }
    case "flipCards": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-2">
          <div className="border-t pt-2"><input className={inputCls} placeholder="Card 1 Front" value={d.card1Front || ""} onChange={(e) => set({ card1Front: e.target.value })} /><input className={inputCls} placeholder="Card 1 Back" value={d.card1Back || ""} onChange={(e) => set({ card1Back: e.target.value })} /></div>
          <div className="border-t pt-2"><input className={inputCls} placeholder="Card 2 Front" value={d.card2Front || ""} onChange={(e) => set({ card2Front: e.target.value })} /><input className={inputCls} placeholder="Card 2 Back" value={d.card2Back || ""} onChange={(e) => set({ card2Back: e.target.value })} /></div>
          <div className="border-t pt-2"><input className={inputCls} placeholder="Card 3 Front" value={d.card3Front || ""} onChange={(e) => set({ card3Front: e.target.value })} /><input className={inputCls} placeholder="Card 3 Back" value={d.card3Back || ""} onChange={(e) => set({ card3Back: e.target.value })} /></div>
        </div>
      )
    }
    case "searchBar": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div>
          <label className="text-xs text-gray-400">Placeholder Text</label>
          <input className={inputCls} value={d.placeholder || ""} onChange={(e) => set({ placeholder: e.target.value })} />
        </div>
      )
    }
    case "contactForm": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-2">
          <input className={inputCls} placeholder="Heading" value={d.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
          <input className={inputCls} placeholder="Button Label" value={d.buttonLabel || ""} onChange={(e) => set({ buttonLabel: e.target.value })} />
        </div>
      )
    }
    case "map": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-2">
          <label className="text-xs text-gray-400">Address (used if Embed URL is blank)</label>
          <input className={inputCls} value={d.address || ""} onChange={(e) => set({ address: e.target.value })} />
          <label className="text-xs text-gray-400">Custom Embed URL (optional)</label>
          <input className={inputCls} value={d.embedUrl || ""} onChange={(e) => set({ embedUrl: e.target.value })} />
        </div>
      )
    }
    case "articleFloat": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-2">
          <input className={inputCls} placeholder="Image URL" value={d.imageUrl || ""} onChange={(e) => set({ imageUrl: e.target.value })} />
          <select className={inputCls} value={d.imageSide || "left"} onChange={(e) => set({ imageSide: e.target.value })}>
            <option value="left">Image Left</option>
            <option value="right">Image Right</option>
          </select>
          <textarea className={inputCls} placeholder="Article text" value={d.text || ""} onChange={(e) => set({ text: e.target.value })} />
        </div>
      )
    }
    case "store": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-2">
          <input className={inputCls} placeholder="Heading" value={d.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
          <input className={inputCls} placeholder="Button Label" value={d.buttonLabel || ""} onChange={(e) => set({ buttonLabel: e.target.value })} />
          <input className={inputCls} placeholder="Button URL" value={d.buttonUrl || ""} onChange={(e) => set({ buttonUrl: e.target.value })} />
        </div>
      )
    }
    case "fourCol": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="border rounded p-2 space-y-1">
              <input className={inputCls} placeholder={"Column " + n + " title"} value={d["col" + n + "Title"] || ""} onChange={(e) => set({ ["col" + n + "Title"]: e.target.value })} />
              <input className={inputCls} placeholder={"Column " + n + " text"} value={d["col" + n + "Text"] || ""} onChange={(e) => set({ ["col" + n + "Text"]: e.target.value })} />
            </div>
          ))}
        </div>
      )
    }
    case "columnLinks": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="border rounded p-2 space-y-1">
              <input className={inputCls} placeholder={"Column " + n + " heading"} value={d["col" + n + "Heading"] || ""} onChange={(e) => set({ ["col" + n + "Heading"]: e.target.value })} />
              <textarea className={inputCls} rows={3} placeholder="Links, one per line: Label|URL" value={d["col" + n + "Links"] || ""} onChange={(e) => set({ ["col" + n + "Links"]: e.target.value })} />
            </div>
          ))}
        </div>
      )
    }
    case "headerButton": {
      const d = block.data ? JSON.parse(block.data) : {}
      const set = (patch: any) => onChange({ data: JSON.stringify({ ...d, ...patch }) })
      return (
        <div className="space-y-2">
          <select className={inputCls} value={d.align || "center"} onChange={(e) => set({ align: e.target.value })}>
            <option value="center">Centered</option>
            <option value="left">Left Aligned</option>
          </select>
          <input className={inputCls} placeholder="Heading" value={d.heading || ""} onChange={(e) => set({ heading: e.target.value })} />
          <input className={inputCls} placeholder="Subtext" value={d.subtext || ""} onChange={(e) => set({ subtext: e.target.value })} />
          <input className={inputCls} placeholder="Button Label" value={d.buttonLabel || ""} onChange={(e) => set({ buttonLabel: e.target.value })} />
          <input className={inputCls} placeholder="Button URL" value={d.buttonUrl || ""} onChange={(e) => set({ buttonUrl: e.target.value })} />
        </div>
      )
    }default:
      return null
  }
}
