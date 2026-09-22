// Admin-session verification for marketing API routes, built directly on
// the signed next-auth JWT cookie via next-auth/jwt's getToken().
//
// Deliberately NOT using next-auth's getServerSession(authOptions) here.
// getServerSession's App-Router code path reads the incoming request
// through next/headers' ambient per-request context, which only exists
// when an actual Next.js server is dispatching the request. That makes a
// route handler that calls it impossible to invoke directly/in-process in
// a test without either running a full Next server or mocking a framework
// internal.
//
// getToken({ req, secret }) verifies the exact same signed/encrypted
// cookie, with the exact same secret, and returns the exact same role/
// username claims that were put on the token by lib/auth.ts's jwt()
// callback - it is not a weaker or different check, just one that takes
// the request object explicitly instead of relying on ambient framework
// state. This is next-auth's own documented mechanism for verifying a
// session inside middleware/route handlers, and it is what makes
// tests/marketing-launch-safety-http.test.ts able to call the real
// exported POST handler directly with a real signed cookie.
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export interface RequestAuth {
  isAuthenticated: boolean
  isCron: boolean
  isAdmin: boolean
  userId: string | null
  name: string | null
  username: string | null
}

export async function resolveRequestAuth(request: NextRequest): Promise<RequestAuth> {
  const authHeader = request.headers.get('authorization')
  const isCron = !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`

const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  const role = (token as { role?: string } | null)?.role ?? null
  const isAuthenticated = !!token

return {
  isAuthenticated,
  isCron,
  isAdmin: isAuthenticated && role === 'admin',
  userId: (token?.sub as string | undefined) ?? null,
  name: (token?.name as string | undefined) ?? null,
  username: (token as { username?: string } | null)?.username ?? null,
}
}
