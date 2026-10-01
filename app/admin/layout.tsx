import type {Metadata} from 'next'
export const metadata:Metadata={robots:{index:false,follow:false},alternates:{canonical:null}}
import AdminNav from '@/components/admin/AdminNav'
import { SessionProvider } from '@/components/admin/SessionProvider'
import StaffIdleSessionGuard from '@/components/admin/StaffIdleSessionGuard'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
          <SessionProvider>
                <StaffIdleSessionGuard />
                <div className="min-h-screen bg-gray-100">
                        <AdminNav />
                        <main className="pt-20">{children}</main>
                </div>
          </SessionProvider>
        )
}
