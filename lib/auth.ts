import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { STAFF_ABSOLUTE_SESSION_SECONDS } from './staffSessionSecurity'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        const username = credentials.username.trim()
        const adminUsername = process.env.ADMIN_USERNAME?.trim() || 'bryanp315'
        const adminPassword = process.env.ADMIN_PASSWORD

        // Production recovery path: Railway's ADMIN_PASSWORD is the source of
        // truth for the owner account. This keeps admin access working even if
        // the database was restored/cloned without re-running prisma/seed.js.
        // ADMIN_PASSWORD must be explicitly configured; there is no hard-coded
        // production password fallback here.
        if (
          adminPassword &&
          username === adminUsername &&
          credentials.password === adminPassword
        ) {
          return {
            id: `env-admin:${adminUsername}`,
            name: 'Bryan P',
            email: adminUsername,
            role: 'admin',
          }
        }

        // Normal database-backed login remains available for the owner and any
        // additional staff accounts.
        const user = await prisma.user.findUnique({
          where: { username },
        })

        if (!user) return null

        const isValid = await bcrypt.compare(credentials.password, user.password)
        if (!isValid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.username,
          role: user.role,
        }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: STAFF_ABSOLUTE_SESSION_SECONDS },
  jwt: { maxAge: STAFF_ABSOLUTE_SESSION_SECONDS },
  pages: {
    signIn: '/admin/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role
        token.username = user.email || undefined
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string
        (session.user as { username?: string }).username = token.username as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
