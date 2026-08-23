import AdminNav from '@/components/admin/AdminNav'
import { SessionProvider } from '@/components/admin/SessionProvider'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
          <SessionProvider>
                <div className="min-h-screen bg-gray-100">
                        <AdminNav />
                        <main className="pt-16">{children}</main>
                </div>
          </SessionProvider>
        )
}
