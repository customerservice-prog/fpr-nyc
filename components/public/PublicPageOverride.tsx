'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import PageBuilderContent from '@/components/public/PageBuilderContent'
import { isBuilderOverrideAllowed, type PageBuilderBlock, type PageBuilderSettings } from '@/lib/pageBuilder'

interface PublishedPage {
  path: string
  title: string
  blocks: PageBuilderBlock[]
  settings: PageBuilderSettings
}

export default function PublicPageOverride({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [page, setPage] = useState<PublishedPage | null | undefined>(undefined)

  useEffect(() => {
    const path = pathname || '/'
    const draftPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('websiteDraftPreview') === '1'
    if (!isBuilderOverrideAllowed(path)) {
      setPage(null)
      return
    }

    const controller = new AbortController()
    setPage(undefined)
    fetch('/api/public/page-builder?path=' + encodeURIComponent(path) + (draftPreview ? '&draft=1' : ''), {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error('Could not load page override')
        return response.json()
      })
      .then(data => setPage(data.page || null))
      .catch(error => {
        if (error?.name !== 'AbortError') setPage(null)
      })

    return () => controller.abort()
  }, [pathname])

  if (page) {
    return <PageBuilderContent title={page.title} blocks={page.blocks} settings={page.settings} originalContent={children} />
  }

  return <>{children}</>
}
