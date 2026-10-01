export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { STAFF_ROLES, normalizeStaffRole } from '@/lib/staffPermissions'

function isOwner(session: any) {
  return (session?.user as { role?: string } | undefined)?.role === 'admin'
}

function validAssignableRole(role: unknown) {
  return typeof role === 'string' && (STAFF_ROLES as readonly string[]).includes(role) && role !== 'employee'
}

const userSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
  driverProfileId: true,
  driverProfile: { select: { id: true, name: true, isActive: true } },
  createdAt: true,
} as const

async function validateDriverProfile(driverProfileId: string, excludeUserId?: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverProfileId },
    select: { id: true, name: true, isActive: true },
  })
  if (!driver?.isActive) return 'Choose an active driver profile.'
  const linked = await prisma.user.findFirst({
    where: {
      driverProfileId,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  })
  return linked ? 'That driver profile is already linked to another staff login.' : null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isOwner(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const users = await prisma.user.findMany({
    select: userSelect,
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json({ users: users.map((user) => ({ ...user, role: normalizeStaffRole(user.role) })) })
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isOwner(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const username = String(body.username || '').trim()
  const password = String(body.password || '')
  const name = String(body.name || '').trim()
  const role = String(body.role || '')
  const requestedDriverProfileId = String(body.driverProfileId || '').trim() || null

  if (!username || !password || !name) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  if (!validAssignableRole(role)) return NextResponse.json({ error: 'Choose a valid staff role.' }, { status: 400 })

  const existing = await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' } } })
  if (existing) return NextResponse.json({ error: 'Username already exists' }, { status: 400 })

  if (role === 'driver' && requestedDriverProfileId) {
    const error = await validateDriverProfile(requestedDriverProfileId)
    if (error) return NextResponse.json({ error }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 12)
  try {
    const user = await prisma.$transaction(async (tx) => {
      let driverProfileId = role === 'driver' ? requestedDriverProfileId : null
      if (role === 'driver' && !driverProfileId) {
        const matching = await tx.driver.findMany({
          where: {
            name: { equals: name, mode: 'insensitive' },
            isActive: true,
            staffUser: null,
          },
          select: { id: true },
          take: 2,
        })
        driverProfileId = matching.length === 1
          ? matching[0].id
          : (await tx.driver.create({ data: { name } })).id
      }

      return tx.user.create({
        data: { username, password: hashed, name, role, driverProfileId },
        select: userSelect,
      })
    })

    return NextResponse.json({ user })
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'P2002') return NextResponse.json({ error: 'That username or driver profile is already in use.' }, { status: 409 })
    console.error('Staff account create failed', { code: code || 'unknown' })
    return NextResponse.json({ error: 'Could not create staff account.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isOwner(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json()
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'User is required.' }, { status: 400 })
  const existing = await prisma.user.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'User not found.' }, { status: 404 })

  const data: { name?: string; role?: string; password?: string; driverProfileId?: string | null } = {}
  let nextName = existing.name
  if (body.name !== undefined) {
    const name = String(body.name || '').trim()
    if (!name) return NextResponse.json({ error: 'Name cannot be blank.' }, { status: 400 })
    data.name = name
    nextName = name
  }

  let nextRole = existing.role
  if (body.role !== undefined) {
    if (!validAssignableRole(body.role)) return NextResponse.json({ error: 'Choose a valid staff role.' }, { status: 400 })
    if (existing.role === 'admin' && body.role !== 'admin') {
      const owners = await prisma.user.count({ where: { role: 'admin' } })
      if (owners <= 1) return NextResponse.json({ error: 'You cannot remove the last Owner / Administrator.' }, { status: 400 })
    }
    nextRole = String(body.role)
    data.role = nextRole
  }

  let requestedDriverProfileId =
    body.driverProfileId !== undefined
      ? (String(body.driverProfileId || '').trim() || null)
      : existing.driverProfileId

  if (nextRole === 'driver' && requestedDriverProfileId) {
    const error = await validateDriverProfile(requestedDriverProfileId, id)
    if (error) return NextResponse.json({ error }, { status: 400 })
  }

  if (body.password !== undefined && String(body.password).length > 0) {
    const password = String(body.password)
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    data.password = await bcrypt.hash(password, 12)
  }

  try {
    const user = await prisma.$transaction(async (tx) => {
      if (nextRole === 'driver' && !requestedDriverProfileId) {
        const matching = await tx.driver.findMany({
          where: {
            name: { equals: nextName, mode: 'insensitive' },
            isActive: true,
            staffUser: null,
          },
          select: { id: true },
          take: 2,
        })
        requestedDriverProfileId = matching.length === 1
          ? matching[0].id
          : (await tx.driver.create({ data: { name: nextName } })).id
      }

      if (nextRole === 'driver') {
        data.driverProfileId = requestedDriverProfileId
      } else {
        data.driverProfileId = null
      }

      return tx.user.update({
        where: { id },
        data,
        select: userSelect,
      })
    })
    return NextResponse.json({ user })
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'P2002') return NextResponse.json({ error: 'That driver profile is already linked to another staff login.' }, { status: 409 })
    console.error('Staff account update failed', { code: code || 'unknown' })
    return NextResponse.json({ error: 'Could not update staff account.' }, { status: 500 })
  }
}
