import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'
import { hasStaffPermission, normalizeStaffRole, roleHome } from '@/lib/staffPermissions'

export default withAuth(
  function proxy(req) {
    const token = req.nextauth.token as { role?: string } | null
    const role = normalizeStaffRole(token?.role)
    const path = req.nextUrl.pathname
    const redirect = (to: string) => NextResponse.redirect(new URL(to, req.url))

    // Probationary office accounts are deliberately fenced at the edge.
    // They can only view/search orders plus a few harmless lookup lists.
    if (role === 'office_training') {
      if (path.startsWith('/api/admin/')) {
        const method = req.method.toUpperCase()
        const allowedRead =
          method === 'GET' && (
            path === '/api/admin/orders' ||
            /^\/api\/admin\/orders\/[^/]+$/.test(path) ||
            /^\/api\/admin\/orders\/[^/]+\/contacts$/.test(path) ||
            path === '/api/admin/setup-surfaces' ||
            path === '/api/admin/references'
          )
        if (!allowedRead) {
          return NextResponse.json(
            { error: 'Office Training accounts are read-only and cannot perform this action.' },
            { status: 403 }
          )
        }
      } else if (path.startsWith('/admin/')) {
        const allowedPage =
          path === '/admin/orders' ||
          /^\/admin\/orders\/[^/]+$/.test(path)
        if (!allowedPage) return redirect('/admin/orders')
      } else if (path === '/admin') {
        return redirect('/admin/orders')
      }
    }

    if ((role === 'driver' || role === 'crew') && path === '/admin') return redirect(roleHome(role))
    if (path.startsWith('/admin/settings') && !hasStaffPermission(role, 'owner_settings')) return redirect(roleHome(role))
    if (path.startsWith('/admin/reports') && !hasStaffPermission(role, 'reports')) return redirect(roleHome(role))
    if (path.startsWith('/admin/analytics') && !hasStaffPermission(role, 'analytics')) return redirect(roleHome(role))
    if (path.startsWith('/admin/planning-inquiries') && !hasStaffPermission(role, 'planning')) return redirect(roleHome(role))
    if (path.startsWith('/admin/website') && !hasStaffPermission(role, 'website')) return redirect(roleHome(role))
    if (path.startsWith('/admin/orders') && !hasStaffPermission(role, 'orders')) return redirect(roleHome(role))
    if (path.startsWith('/admin/customers') && !hasStaffPermission(role, 'customers')) return redirect(roleHome(role))
    if (path.startsWith('/admin/do-not-rent') && !hasStaffPermission(role, 'customers')) return redirect(roleHome(role))
    if (path.startsWith('/admin/scheduling') && !hasStaffPermission(role, 'scheduling')) return redirect(roleHome(role))
    if (path.startsWith('/admin/delivery') && !hasStaffPermission(role, 'delivery')) return redirect(roleHome(role))
    if (path.startsWith('/admin/marketing') && !hasStaffPermission(role, 'marketing')) return redirect(roleHome(role))
    if (path.startsWith('/admin/orders/') && path.endsWith('/checkout') && !hasStaffPermission(role, 'payments')) {
      const orderPath = path.replace(/\/checkout$/, '')
      return redirect(orderPath)
    }

    return NextResponse.next()
  },
  { pages: { signIn: '/admin/login' } }
)

export const config = {
  matcher: ['/admin', '/admin/((?!login).*)', '/api/admin/:path*'],
}
