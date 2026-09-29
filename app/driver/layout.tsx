import type { Metadata, Viewport } from 'next'
import RegisterServiceWorker from './register-sw'
import DriverNav from '@/components/driver/DriverNav'
import { NYC_LOGO_PATH } from '@/lib/nycBrand'

export const metadata: Metadata = {
    robots:{index:false,follow:false},alternates:{canonical:null},
    title: 'FPR Drivers',
    manifest: '/driver-manifest.webmanifest',
    appleWebApp: {
          capable: true,
          statusBarStyle: 'default',
          title: 'FPR Drivers',
    },
    icons: {
        apple: NYC_LOGO_PATH,
        icon: NYC_LOGO_PATH,
    },
}

export const viewport: Viewport = {
    themeColor: '#15803d',
}

export default function DriverLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <RegisterServiceWorker />
            <DriverNav />
            {children}
        </>
    )
}
