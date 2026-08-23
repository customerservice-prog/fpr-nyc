import type { Metadata, Viewport } from 'next'
import RegisterServiceWorker from './register-sw'
import DriverNav from '@/components/driver/DriverNav'

export const metadata: Metadata = {
    title: 'FPR Drivers',
    manifest: '/driver-manifest.webmanifest',
    appleWebApp: {
          capable: true,
          statusBarStyle: 'default',
          title: 'FPR Drivers',
    },
    icons: {
        apple: '/api/driver-icon-512',
        icon: '/api/driver-icon-512',
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
