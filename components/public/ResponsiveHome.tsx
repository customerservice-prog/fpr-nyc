'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { MobileHomeProps } from './MobileHome'

const DesktopHome = dynamic(() => import('./DesktopHome'))
const MobileHome = dynamic(() => import('./MobileHome'))
import type { HomeDevice } from '@/lib/homeDevice'

interface Props extends MobileHomeProps { initialDevice?: HomeDevice }

export default function ResponsiveHome({ initialDevice = 'desktop', ...props }: Props) {
  const [viewportDevice, setViewportDevice] = useState<HomeDevice>(initialDevice)

  useEffect(() => {
    if (props.device) return
    const viewport = window.matchMedia('(min-width: 768px)')
    const update = () => setViewportDevice(viewport.matches ? 'desktop' : 'mobile')
    update()
    viewport.addEventListener('change', update)
    return () => viewport.removeEventListener('change', update)
  }, [props.device])

  const device = props.device ? (props.device === 'mobile' ? 'mobile' : 'desktop') : viewportDevice
  return device === 'desktop' ? <DesktopHome {...props} /> : <MobileHome {...props} />
}
