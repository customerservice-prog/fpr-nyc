'use client'

import type { PageBuilderBlock, PageBuilderSettings } from '@/lib/pageBuilder'

const WIDTHS: Record<PageBuilderSettings['maxWidth'], string> = {
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-none',
}

function blockData(block: PageBuilderBlock): Record<string, string> {
  try {
    const parsed = JSON.parse(block.data || '{}')
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function BlockBody({ block, originalContent }: { block: PageBuilderBlock; originalContent?: React.ReactNode }) {
  switch (block.type) {
    case 'hero': {
      const style = block.heroStyle || 'overlay'
      const solid = style === 'solid-blue' || style === 'solid-red'
      const background = style === 'solid-blue' ? 'bg-blue-700' : style === 'solid-red' ? 'bg-red-700' : 'bg-slate-900 bg-cover bg-center'
      const align = style === 'left-align' ? 'items-start text-left' : 'items-center text-center'
      return (
        <section
          className={`flex min-h-[340px] flex-col justify-center rounded-3xl px-6 py-16 text-white shadow-sm sm:px-10 ${background} ${align}`}
          style={!solid && block.heroImageUrl ? { backgroundImage: `linear-gradient(rgba(0,0,0,.5),rgba(0,0,0,.5)),url("${block.heroImageUrl}")` } : undefined}
        >
          <h2 className="max-w-4xl text-4xl font-black tracking-tight sm:text-5xl">{block.heroTitle || 'Hero title'}</h2>
          {block.heroSubtitle ? <p className="mt-4 max-w-2xl text-base leading-7 text-white/90 sm:text-lg">{block.heroSubtitle}</p> : null}
          <div className="mt-7 flex flex-wrap gap-3">
            {block.heroButtonLabel ? <a href={block.heroButtonUrl || '#'} className="btn-primary inline-flex min-h-11 items-center rounded-xl px-5 font-black">{block.heroButtonLabel}</a> : null}
            {style === 'two-button' ? <a href="/contact_us" className="inline-flex min-h-11 items-center rounded-xl border border-white/70 px-5 font-black text-white">Contact Us</a> : null}
          </div>
        </section>
      )
    }
    case 'heading': {
      const Tag = block.headingSize || 'h2'
      const cls = Tag === 'h1' ? 'text-4xl sm:text-5xl' : Tag === 'h3' ? 'text-2xl' : 'text-3xl sm:text-4xl'
      return <Tag className={`${cls} font-black tracking-tight text-slate-950`}>{block.headingText || 'Heading'}</Tag>
    }
    case 'text':
      return <div className="whitespace-pre-line text-base leading-8 text-slate-700">{block.text}</div>
    case 'image':
      return block.imageUrl ? <img src={block.imageUrl} alt={block.imageAlt || ''} className="w-full rounded-3xl object-cover shadow-sm" /> : <div className="grid min-h-56 place-items-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-100 text-sm font-bold text-slate-400">Add image</div>
    case 'button':
      return <a href={block.buttonUrl || '#'} className="btn-primary inline-flex min-h-11 items-center rounded-xl px-5 font-black">{block.buttonLabel || 'Button'}</a>
    case 'html':
      return <div dangerouslySetInnerHTML={{ __html: block.html || '' }} />
    case 'originalContent':
      return originalContent
        ? <div data-original-page-content>{originalContent}</div>
        : <div className="grid min-h-56 place-items-center rounded-3xl border-2 border-dashed border-violet-300 bg-violet-50 px-6 text-center text-sm font-black text-violet-700">Original coded page content appears here on the live page.</div>
    case 'textImage':
      return (
        <section className={`grid items-center gap-8 lg:grid-cols-2 ${block.tiImageSide === 'right' ? 'lg:[&>*:first-child]:order-2' : ''}`}>
          {block.tiImageUrl ? <img src={block.tiImageUrl} alt="" className="min-h-72 w-full rounded-3xl object-cover shadow-sm" /> : <div className="grid min-h-72 place-items-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-100 text-sm font-bold text-slate-400">Add image</div>}
          <div>
            <h3 className="text-3xl font-black tracking-tight text-slate-950">{block.tiHeading}</h3>
            <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-700">{block.tiText}</p>
          </div>
        </section>
      )
    case 'cta':
      return (
        <section className="rounded-3xl bg-slate-950 px-6 py-10 text-center text-white shadow-sm sm:px-10">
          <h3 className="text-2xl font-black sm:text-3xl">{block.ctaText}</h3>
          {block.ctaButtonLabel ? <a href={block.ctaButtonUrl || '#'} className="btn-primary mt-6 inline-flex min-h-11 items-center rounded-xl px-5 font-black">{block.ctaButtonLabel}</a> : null}
        </section>
      )
    case 'imageGrid': {
      const images = [block.gridImage1, block.gridImage2, block.gridImage3, block.gridImage4]
      const cols = block.gridLayout === '3' ? 'md:grid-cols-3' : block.gridLayout === '6' ? 'md:grid-cols-4' : 'md:grid-cols-4'
      return (
        <section className={`grid grid-cols-2 gap-3 ${cols}`}>
          {images.map((src, index) => {
            const body = src ? <img src={src} alt="" className="aspect-square w-full rounded-2xl object-cover" /> : <div className="grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 text-xs font-bold text-slate-400">Image {index + 1}</div>
            return block.gridLinkUrl ? <a key={index} href={block.gridLinkUrl}>{body}</a> : <div key={index}>{body}</div>
          })}
        </section>
      )
    }
    case 'testimonial':
      return block.testimonialStyle === 'quote' ? (
        <blockquote className="border-l-4 border-amber-400 pl-6 text-xl italic leading-8 text-slate-700">
          “{block.quote}”
          <footer className="mt-3 text-sm font-black not-italic text-slate-950">— {block.author}</footer>
        </blockquote>
      ) : (
        <blockquote className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xl italic leading-8 text-slate-700">“{block.quote}”</p>
          <footer className="mt-4 text-sm font-black text-slate-950">— {block.author}</footer>
        </blockquote>
      )
    case 'faq': {
      const items = [[block.faqQ1, block.faqA1], [block.faqQ2, block.faqA2], [block.faqQ3, block.faqA3]]
      return (
        <section className="space-y-3">
          {items.filter(item => item[0]).map(([q, a], index) => (
            <details key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer font-black text-slate-950">{q}</summary>
              <p className="mt-3 leading-7 text-slate-700">{a}</p>
            </details>
          ))}
        </section>
      )
    }
    case 'videoFeature':
      return (
        <section className={`grid items-center gap-8 lg:grid-cols-2 ${block.videoSide === 'right' ? 'lg:[&>*:first-child]:order-2' : ''}`}>
          <div className="aspect-video overflow-hidden rounded-3xl bg-slate-950 shadow-sm">
            {block.videoUrl ? <iframe src={block.videoUrl} className="h-full w-full" allowFullScreen title="Video" /> : <div className="grid h-full place-items-center text-sm font-bold text-white/60">Add video URL</div>}
          </div>
          <div>
            <p className="whitespace-pre-line text-base leading-8 text-slate-700">{block.videoCaption}</p>
            {block.videoButtonLabel ? <a href={block.videoButtonUrl || '#'} className="btn-primary mt-5 inline-flex min-h-11 items-center rounded-xl px-5 font-black">{block.videoButtonLabel}</a> : null}
          </div>
        </section>
      )
    case 'spacer':
      return <div aria-hidden="true" style={{ height: Math.max(0, Math.min(320, Number(block.spacerHeight || 48))) }} />
    case 'separator':
      return <hr className="border-slate-200" />
    case 'threeCol':
      return (
        <section className="grid gap-4 md:grid-cols-3">
          {[[block.col1Title, block.col1Text], [block.col2Title, block.col2Text], [block.col3Title, block.col3Text]].map(([title, text], index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-black text-slate-950">{title}</h3>
              <p className="mt-2 leading-7 text-slate-600">{text}</p>
            </div>
          ))}
        </section>
      )

    case 'table': {
      const rows = (block.tableData || '').split('\n').filter(Boolean).map(row => row.split('|'))
      const style = block.tableStyle || 'basic'
      const striped = style === 'striped' || style === 'borderedStriped'
      const bordered = style === 'bordered' || style === 'borderedStriped'
      return (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-100 font-black text-slate-900' : striped && rowIndex % 2 === 0 ? 'bg-slate-50' : ''}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className={`p-3 text-slate-700 ${bordered ? 'border border-slate-200' : 'border-b border-slate-100'}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    case 'carousel': {
      const d = blockData(block)
      const slides = [[d.item1Img, d.item1Cap], [d.item2Img, d.item2Cap], [d.item3Img, d.item3Cap]]
      return (
        <section className="rounded-3xl bg-slate-50 p-6">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {slides.map(([src, caption], index) => (
              <div key={index} className="min-w-[230px] flex-1 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                {d.mode === 'quotes' ? (
                  <p className="text-lg italic leading-7 text-slate-700">“{caption || 'Quote text'}”</p>
                ) : (
                  <>
                    {src ? <img src={src} alt="" className="h-40 w-full rounded-xl object-cover" /> : <div className="grid h-40 place-items-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-100 text-xs font-bold text-slate-400">Slide image</div>}
                    <p className="mt-3 text-sm font-semibold text-slate-600">{caption}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )
    }
    case 'linkList': {
      const d = blockData(block)
      const links = [[d.link1Label, d.link1Url], [d.link2Label, d.link2Url], [d.link3Label, d.link3Url], [d.link4Label, d.link4Url]]
      return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {d.heading ? <h3 className="mb-5 text-2xl font-black text-slate-950">{d.heading}</h3> : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {links.filter(([name]) => name).map(([name, url], index) => <a key={index} href={url || '#'} className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-slate-700 hover:border-green-300 hover:bg-green-50">{name}</a>)}
          </div>
        </section>
      )
    }
    case 'iconGrid': {
      const d = blockData(block)
      const items = [
        [d.item1Icon, d.item1Title, d.item1Text],
        [d.item2Icon, d.item2Title, d.item2Text],
        [d.item3Icon, d.item3Title, d.item3Text],
        [d.item4Icon, d.item4Title, d.item4Text],
      ]
      return (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([icon, title, text], index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="text-4xl">{icon || '⭐'}</div>
              <h3 className="mt-3 font-black text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </section>
      )
    }
    case 'featureSection': {
      const d = blockData(block)
      const tone = d.style === 'red' ? 'bg-red-700 text-white' : d.style === 'gray' ? 'bg-slate-100 text-slate-950' : 'bg-blue-50 text-slate-950'
      const columns = [[d.col1Title, d.col1Text], [d.col2Title, d.col2Text], [d.col3Title, d.col3Text]]
      return (
        <section className={`rounded-3xl p-8 sm:p-10 ${tone}`}>
          <h3 className="text-center text-3xl font-black">{d.heading}</h3>
          {d.subtext ? <p className="mx-auto mt-3 max-w-2xl text-center opacity-80">{d.subtext}</p> : null}
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {columns.map(([title, text], index) => (
              <div key={index} className="rounded-2xl bg-white/70 p-5 text-slate-900 backdrop-blur-sm">
                <h4 className="font-black">{title}</h4>
                <p className="mt-2 text-sm leading-6 opacity-75">{text}</p>
              </div>
            ))}
          </div>
        </section>
      )
    }
    case 'productFeature': {
      const d = blockData(block)
      return (
        <section className="grid items-center gap-7 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]">
          {d.image ? <img src={d.image} alt="" className="h-72 w-full rounded-2xl object-cover" /> : <div className="grid h-72 place-items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 text-sm font-bold text-slate-400">Product image</div>}
          <div>
            <h3 className="text-3xl font-black text-slate-950">{d.title}</h3>
            <p className="mt-3 leading-7 text-slate-600">{d.description}</p>
            {d.price ? <p className="mt-4 text-2xl font-black text-green-700">{d.price}</p> : null}
            {d.buttonLabel ? <a href={d.buttonUrl || '#'} className="btn-primary mt-5 inline-flex min-h-11 items-center rounded-xl px-5 font-black">{d.buttonLabel}</a> : null}
          </div>
        </section>
      )
    }
    case 'doubleImageBanner': {
      const d = blockData(block)
      return (
        <section className="grid gap-3 sm:grid-cols-2">
          {[[d.image1, d.caption1], [d.image2, d.caption2]].map(([src, caption], index) => (
            <div key={index} className="relative min-h-64 overflow-hidden rounded-3xl bg-slate-100">
              {src ? <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <div className="grid h-64 place-items-center border-2 border-dashed border-slate-300 text-sm font-bold text-slate-400">Image {index + 1}</div>}
              {caption ? <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-5 pt-12 text-lg font-black text-white">{caption}</div> : null}
            </div>
          ))}
        </section>
      )
    }
    case 'flipCards': {
      const d = blockData(block)
      const cards = [[d.card1Front, d.card1Back], [d.card2Front, d.card2Back], [d.card3Front, d.card3Back]]
      return (
        <section className="grid gap-4 md:grid-cols-3">
          {cards.map(([front, back], index) => (
            <div key={index} className="group min-h-44 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h3 className="text-xl font-black text-slate-950">{front}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{back}</p>
            </div>
          ))}
        </section>
      )
    }
    case 'searchBar': {
      const d = blockData(block)
      return (
        <form action="/order-by-date" className="mx-auto flex w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
          <input name="q" placeholder={d.placeholder || 'Search rentals...'} className="min-h-12 min-w-0 flex-1 px-4 text-sm outline-none" />
          <button type="submit" className="btn-primary px-6 font-black">Search</button>
        </form>
      )
    }
    case 'contactForm': {
      const d = blockData(block)
      return (
        <section className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-7 shadow-sm">
          <h3 className="text-2xl font-black text-slate-950">{d.heading || 'Contact Us'}</h3>
          <form action="/contact_us/" method="post" className="mt-5 space-y-3">
            <input name="name" placeholder="Name" className="min-h-11 w-full rounded-xl border border-slate-300 px-3" />
            <input name="email" placeholder="Email" className="min-h-11 w-full rounded-xl border border-slate-300 px-3" />
            <textarea name="message" placeholder="Message" className="min-h-28 w-full rounded-xl border border-slate-300 px-3 py-2" />
            <button type="submit" className="btn-primary inline-flex min-h-11 items-center rounded-xl px-5 font-black">{d.buttonLabel || 'Send Message'}</button>
          </form>
        </section>
      )
    }
    case 'map': {
      const d = blockData(block)
      const src = d.embedUrl || ('https://www.google.com/maps?q=' + encodeURIComponent(d.address || '') + '&output=embed')
      return (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <iframe src={src} className="h-80 w-full" loading="lazy" title={d.address || 'Map'} />
          {d.address ? <p className="px-5 py-4 text-sm font-bold text-slate-600">{d.address}</p> : null}
        </section>
      )
    }
    case 'articleFloat': {
      const d = blockData(block)
      const side = d.imageSide === 'right' ? 'float-right ml-6' : 'float-left mr-6'
      return (
        <article className="rounded-3xl bg-white p-6 leading-8 text-slate-700">
          {d.imageUrl ? <img src={d.imageUrl} alt="" className={`mb-3 h-52 w-52 rounded-2xl object-cover ${side}`} /> : null}
          <p className="whitespace-pre-line">{d.text}</p>
          <div className="clear-both" />
        </article>
      )
    }
    case 'store': {
      const d = blockData(block)
      return (
        <section className="rounded-3xl bg-slate-100 p-9 text-center">
          <h3 className="text-3xl font-black text-slate-950">{d.heading || 'Browse Our Rentals'}</h3>
          <a href={d.buttonUrl || '/order-by-date'} className="btn-primary mt-6 inline-flex min-h-11 items-center rounded-xl px-6 font-black">{d.buttonLabel || 'View All Rentals'}</a>
        </section>
      )
    }
    case 'fourCol': {
      const d = blockData(block)
      const cols = [[d.col1Title, d.col1Text], [d.col2Title, d.col2Text], [d.col3Title, d.col3Text], [d.col4Title, d.col4Text]]
      return (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cols.map(([title, text], index) => (
            <div key={index} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-black text-slate-950">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </section>
      )
    }
    case 'columnLinks': {
      const d = blockData(block)
      const columns = [[d.col1Heading, d.col1Links], [d.col2Heading, d.col2Links], [d.col3Heading, d.col3Links]].filter(([heading, links]) => heading || links)
      return (
        <section className="grid gap-7 rounded-3xl border border-slate-200 bg-white p-7 md:grid-cols-3">
          {columns.map(([heading, links], index) => (
            <div key={index}>
              {heading ? <h3 className="font-black text-slate-950">{heading}</h3> : null}
              <ul className="mt-3 space-y-2">
                {(links || '').split('\n').filter(Boolean).map((line, lineIndex) => {
                  const [label, url] = line.split('|')
                  return <li key={lineIndex}><a href={url || '#'} className="text-sm font-bold text-green-700 hover:underline">{label}</a></li>
                })}
              </ul>
            </div>
          ))}
        </section>
      )
    }
    case 'headerButton': {
      const d = blockData(block)
      return (
        <section className={`rounded-3xl px-4 py-8 ${d.align === 'left' ? 'text-left' : 'text-center'}`}>
          <h2 className="text-3xl font-black text-slate-950">{d.heading}</h2>
          {d.subtext ? <p className="mt-3 text-base leading-7 text-slate-600">{d.subtext}</p> : null}
          {d.buttonLabel ? <a href={d.buttonUrl || '#'} className="btn-primary mt-5 inline-flex min-h-11 items-center rounded-xl px-5 font-black">{d.buttonLabel}</a> : null}
        </section>
      )
    }
  }
}

export default function PageBuilderContent({
  title,
  blocks,
  settings,
  editing = false,
  selectedId,
  onSelect,
  originalContent,
}: {
  title: string
  blocks: PageBuilderBlock[]
  settings: PageBuilderSettings
  editing?: boolean
  selectedId?: string | null
  onSelect?: (id: string) => void
  originalContent?: React.ReactNode
}) {
  const visible = editing ? blocks : blocks.filter(block => !block.hidden)
  return (
    <div style={{ backgroundColor: settings.backgroundColor }}>
      <div
        className={`mx-auto w-full px-4 sm:px-6 ${WIDTHS[settings.maxWidth]}`}
        style={{ paddingTop: settings.topPadding, paddingBottom: settings.bottomPadding }}
      >
        {settings.showPageTitle ? <h1 className="mb-10 text-center text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{title}</h1> : null}
        <div className="space-y-8">
          {visible.map((block, index) => (
            <div
              key={block.id}
              data-page-builder-block={block.id}
              className={`relative rounded-[28px] transition ${editing ? 'cursor-pointer' : ''} ${block.hidden ? 'opacity-35' : ''} ${selectedId === block.id ? 'outline outline-[3px] outline-emerald-500 outline-offset-4' : editing ? 'hover:outline hover:outline-2 hover:outline-emerald-300 hover:outline-offset-4' : ''}`}
              onClick={editing ? event => {
                event.preventDefault()
                event.stopPropagation()
                onSelect?.(block.id)
              } : undefined}
            >
              {editing ? (
                <span className="pointer-events-none absolute -top-3 left-4 z-20 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow">
                  {block.hidden ? 'Hidden · ' : ''}{index + 1} · {block.type}
                </span>
              ) : null}
              <BlockBody block={block} originalContent={originalContent} />
            </div>
          ))}
          {!visible.length ? (
            <div className="grid min-h-64 place-items-center rounded-3xl border-2 border-dashed border-slate-300 bg-white/70 px-6 text-center">
              <div>
                <p className="font-black text-slate-700">This page has no sections yet.</p>
                {editing ? <p className="mt-1 text-sm text-slate-400">Use Add section to start building it.</p> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
