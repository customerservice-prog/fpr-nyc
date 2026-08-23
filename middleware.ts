import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token as { role?: string } | null
    const path = req.nextUrl.pathname
    const ownerOnly = path.startsWith('/admin/settings') || path.startsWith('/admin/reports')
    if (ownerOnly && token?.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/scheduling', req.url))
    }
    return NextResponse.next()
  },
  {
    pages: { signIn: '/admin/login' },
  }
)

export const config = {
  matcher: ['/admin', '/admin/((?!login).*)'],
}
