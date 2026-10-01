'use client'

import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import {
  ArrowRight,
  BriefcaseBusiness,
  Check,
  Clock3,
  Copy,
  CreditCard,
  Eye,
  EyeOff,
  GraduationCap,
  Hammer,
  Headphones,
  KeyRound,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import {
  STAFF_PERMISSION_LABELS,
  STAFF_ROLE_OPTIONS,
  canProcessPayments,
  staffRoleLabel,
  staffRolePermissions,
} from '@/lib/staffPermissions'
import {
  STAFF_ABSOLUTE_SESSION_SECONDS,
  STAFF_IDLE_TIMEOUT_MS,
} from '@/lib/staffSessionSecurity'

type UserRow = {
  id: string
  username: string
  name: string
  role: string
  driverProfileId?: string | null
  driverProfile?: { id: string; name: string; isActive: boolean } | null
  createdAt?: string
}

type DriverRow = {
  id: string
  name: string
  isActive: boolean
}

type RoleOption = {
  value: string
  label: string
  description: string
}

const ROLE_VISUALS: Record<string, {
  icon: typeof Users
  badge: string
  soft: string
  iconBox: string
  dot: string
}> = {
  admin: {
    icon: ShieldCheck,
    badge: 'border-violet-200 bg-violet-50 text-violet-800',
    soft: 'border-violet-200 bg-violet-50/70',
    iconBox: 'bg-violet-100 text-violet-700',
    dot: 'bg-violet-500',
  },
  manager: {
    icon: BriefcaseBusiness,
    badge: 'border-blue-200 bg-blue-50 text-blue-800',
    soft: 'border-blue-200 bg-blue-50/70',
    iconBox: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
  office: {
    icon: Headphones,
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    soft: 'border-emerald-200 bg-emerald-50/70',
    iconBox: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  employee: {
    icon: Headphones,
    badge: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    soft: 'border-emerald-200 bg-emerald-50/70',
    iconBox: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
  },
  office_training: {
    icon: GraduationCap,
    badge: 'border-amber-200 bg-amber-50 text-amber-900',
    soft: 'border-amber-200 bg-amber-50/70',
    iconBox: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
  },
  crew: {
    icon: Hammer,
    badge: 'border-slate-200 bg-slate-100 text-slate-800',
    soft: 'border-slate-200 bg-slate-50',
    iconBox: 'bg-slate-200 text-slate-700',
    dot: 'bg-slate-500',
  },
  driver: {
    icon: Truck,
    badge: 'border-cyan-200 bg-cyan-50 text-cyan-900',
    soft: 'border-cyan-200 bg-cyan-50/70',
    iconBox: 'bg-cyan-100 text-cyan-800',
    dot: 'bg-cyan-500',
  },
}

function visualFor(role: string) {
  return ROLE_VISUALS[role] || ROLE_VISUALS.office_training
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?'
}

function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&'
  const bytes = new Uint32Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (value) => chars[value % chars.length]).join('')
}

const IDLE_MINUTES = Math.round(STAFF_IDLE_TIMEOUT_MS / 60000)
const MAX_SESSION_HOURS = Math.round(STAFF_ABSOLUTE_SESSION_SECONDS / 3600)

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [drivers, setDrivers] = useState<DriverRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)
  const [manageUser, setManageUser] = useState<UserRow | null>(null)
  const [form, setForm] = useState({ username: '', name: '', password: '', role: 'office', driverProfileId: '' })
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [passwordReset, setPasswordReset] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)

  const roleOptions = useMemo<RoleOption[]>(() => [
    {
      value: 'admin',
      label: 'Owner / Administrator',
      description: 'Full system control, security, website, reporting, staff and financial access.',
    },
    ...STAFF_ROLE_OPTIONS,
  ], [])

  const createRoleOptions = roleOptions.filter((role) => role.value !== 'admin')

  const loadUsers = async () => {
    setLoading(true)
    try {
      const [usersRes, driversRes] = await Promise.all([
        fetch('/api/admin/settings/users', { cache: 'no-store' }),
        fetch('/api/admin/drivers?activeOnly=true', { cache: 'no-store' }),
      ])
      const [usersData, driversData] = await Promise.all([usersRes.json(), driversRes.json()])
      if (!usersRes.ok) throw new Error(usersData.error || 'Could not load staff users')
      if (!driversRes.ok) throw new Error(driversData.error || 'Could not load driver profiles')
      setUsers(usersData.users || [])
      setDrivers(driversData.drivers || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load staff users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadUsers() }, [])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()
    return users.filter((user) => {
      const normalized = user.role === 'employee' ? 'office' : user.role
      const matchesRole = roleFilter === 'all' || normalized === roleFilter
      const matchesSearch = !query || [user.name, user.username, staffRoleLabel(user.role), user.driverProfile?.name || '']
        .join(' ')
        .toLowerCase()
        .includes(query)
      return matchesRole && matchesSearch
    })
  }, [users, search, roleFilter])

  const countForRole = (role: string) => users.filter((user) => {
    const normalized = user.role === 'employee' ? 'office' : user.role
    return normalized === role
  }).length

  const officeCount = users.filter((user) => ['office', 'employee', 'office_training'].includes(user.role)).length
  const fieldCount = users.filter((user) => ['crew', 'driver'].includes(user.role)).length
  const paymentEnabledCount = users.filter((user) => canProcessPayments(user.role)).length
  const restrictedPaymentCount = users.length - paymentEnabledCount
  const linkedDriverIds = useMemo(() => new Set(users.map((user) => user.driverProfileId).filter(Boolean)), [users])

  const selectedCreateRole = roleOptions.find((role) => role.value === form.role) || roleOptions[2]
  const selectedCreatePermissions = staffRolePermissions(form.role)
  const selectedManagePermissions = manageUser ? staffRolePermissions(manageUser.role) : []

  const closeCreate = () => {
    if (submitting) return
    setAddOpen(false)
    setShowCreatePassword(false)
    setForm({ username: '', name: '', password: '', role: 'office', driverProfileId: '' })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.username || !form.name || !form.password) {
      toast.error('Enter a name, username, and temporary password')
      return
    }
    if (form.password.length < 8) {
      toast.error('Temporary password must be at least 8 characters')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Failed to create staff account')
      toast.success(data.user.name + ' added as ' + staffRoleLabel(data.user.role))
      setAddOpen(false)
      setShowCreatePassword(false)
      setForm({ username: '', name: '', password: '', role: 'office', driverProfileId: '' })
      await loadUsers()
    } catch {
      toast.error('Failed to create staff account')
    } finally {
      setSubmitting(false)
    }
  }

  const updateRole = async (user: UserRow, role: string) => {
    if (role === user.role || (user.role === 'employee' && role === 'office')) return
    setSavingId(user.id)
    try {
      const res = await fetch('/api/admin/settings/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, role }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Could not update role')
      setUsers((prev) => prev.map((row) => row.id === user.id ? { ...row, ...data.user } : row))
      setManageUser((current) => current?.id === user.id ? { ...current, ...data.user } : current)
      toast.success(user.name + ' is now ' + staffRoleLabel(data.user.role))
    } catch {
      toast.error('Could not update role')
    } finally {
      setSavingId(null)
    }
  }

  const updateDriverProfile = async (user: UserRow, driverProfileId: string) => {
    setSavingId(user.id)
    try {
      const res = await fetch('/api/admin/settings/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, driverProfileId }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Could not link driver route')
      setUsers((prev) => prev.map((row) => row.id === user.id ? { ...row, ...data.user } : row))
      setManageUser((current) => current?.id === user.id ? { ...current, ...data.user } : current)
      toast.success('Driver route linked to ' + (data.user.driverProfile?.name || user.name))
    } catch {
      toast.error('Could not link driver route')
    } finally {
      setSavingId(null)
    }
  }

  const resetPassword = async () => {
    if (!manageUser) return
    if (passwordReset.length < 8) return toast.error('Temporary password must be at least 8 characters')
    setSavingId(manageUser.id)
    try {
      const res = await fetch('/api/admin/settings/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: manageUser.id, password: passwordReset }),
      })
      const data = await res.json()
      if (!res.ok) return toast.error(data.error || 'Could not reset password')
      setPasswordReset('')
      setShowResetPassword(false)
      toast.success('Temporary password reset for ' + manageUser.name)
    } catch {
      toast.error('Could not reset password')
    } finally {
      setSavingId(null)
    }
  }

  const copyText = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(label + ' copied')
    } catch {
      toast.error('Could not copy automatically')
    }
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[#eef1f4]">
      <div className="mx-auto max-w-[1550px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <header className="overflow-hidden rounded-[30px] border border-amber-300/30 bg-[#0b1220] text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
          <div className="relative px-5 py-6 sm:px-7 lg:px-9 lg:py-8">
            <div className="absolute -right-24 -top-32 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
            <div className="absolute bottom-[-120px] left-[30%] h-56 w-96 rounded-full bg-cyan-300/5 blur-3xl" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-amber-200">
                  <ShieldCheck size={14} /> Security Hub 3.0
                </div>
                <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Staff Security Hub</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                  One place to control every staff login, role, payment permission, driver route, password, and automatic session lock.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:-translate-y-0.5 hover:bg-amber-200 hover:shadow-xl"
              >
                <UserPlus size={18} /> Add employee
              </button>
            </div>
          </div>

          <div className="relative mx-5 mb-5 flex flex-col gap-3 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 sm:mx-7 sm:flex-row sm:items-center sm:justify-between lg:mx-9">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300 text-slate-950"><LockKeyhole size={18} /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">Automatic security lock is active</p>
                <p className="text-sm text-slate-300">Inactive staff sessions sign out after {IDLE_MINUTES} minutes.</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs font-black tracking-[0.12em] text-white">
              NEW SECURITY CONSOLE
            </div>
          </div>

          <div className="grid border-t border-white/10 bg-black/10 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: Clock3, title: IDLE_MINUTES + ' min', helper: 'Automatic inactivity logout' },
              { icon: ShieldCheck, title: MAX_SESSION_HOURS + ' hours', helper: 'Maximum staff session' },
              { icon: LockKeyhole, title: restrictedPaymentCount + ' protected', helper: 'Accounts without payment access' },
              { icon: Truck, title: countForRole('driver') + ' drivers', helper: 'Assigned-route access only' },
            ].map(({ icon: Icon, title, helper }) => (
              <div key={helper} className="flex items-center gap-3 border-white/10 px-5 py-4 sm:border-r last:border-r-0 lg:px-7">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-amber-200"><Icon size={19} /></div>
                <div>
                  <p className="font-black">{title}</p>
                  <p className="text-xs text-slate-400">{helper}</p>
                </div>
              </div>
            ))}
          </div>
        </header>

        <div className="mt-6 grid gap-5 lg:grid-cols-[270px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-4 py-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Access groups</p>
                <p className="mt-1 text-sm text-slate-500">Filter by the job each person performs.</p>
              </div>
              <div className="p-2">
                <button
                  type="button"
                  onClick={() => setRoleFilter('all')}
                  className={'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ' + (roleFilter === 'all' ? 'bg-[#edf6ef] text-[#1f6032]' : 'text-slate-700 hover:bg-slate-50')}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100"><Users size={17} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black">Everyone</span>
                    <span className="block text-xs text-slate-400">All staff accounts</span>
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-black tabular-nums shadow-sm">{users.length}</span>
                </button>

                {createRoleOptions.map((role) => {
                  const visual = visualFor(role.value)
                  const Icon = visual.icon
                  const active = roleFilter === role.value
                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => setRoleFilter(active ? 'all' : role.value)}
                      className={'mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition ' + (active ? 'bg-[#edf6ef] text-[#1f6032]' : 'text-slate-700 hover:bg-slate-50')}
                    >
                      <span className={'grid h-9 w-9 place-items-center rounded-xl ' + visual.iconBox}><Icon size={17} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-black">{role.label}</span>
                        <span className="block text-[11px] text-slate-400">{canProcessPayments(role.value) ? 'Payments enabled' : 'Payments blocked'}</span>
                      </span>
                      <span className="rounded-full bg-white px-2 py-1 text-xs font-black tabular-nums shadow-sm">{countForRole(role.value)}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2 text-emerald-900"><ShieldCheck size={18} /><p className="text-sm font-black">Session protection on</p></div>
              <p className="mt-2 text-xs leading-5 text-emerald-800/80">
                Staff are warned before automatic logout. Real activity resets the timer across open tabs; leaving the system untouched does not.
              </p>
            </section>
          </aside>

          <main className="min-w-0">
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Total staff', value: users.length, icon: Users },
                { label: 'Office team', value: officeCount, icon: Headphones },
                { label: 'Field team', value: fieldCount, icon: Truck },
                { label: 'Payment access', value: paymentEnabledCount, icon: CreditCard },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600"><Icon size={18} /></span>
                    <strong className="text-2xl font-black tabular-nums text-slate-900">{value}</strong>
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-500">{label}</p>
                </div>
              ))}
            </section>

            <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Staff roster</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {filteredUsers.length} account{filteredUsers.length === 1 ? '' : 's'} shown
                    {roleFilter !== 'all' ? ' · ' + (createRoleOptions.find((role) => role.value === roleFilter)?.label || roleFilter) : ''}
                  </p>
                </div>
                <div className="relative w-full lg:w-[360px]">
                  <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search staff, username, role, driver…"
                    className="min-h-11 w-full rounded-2xl border border-slate-300 bg-slate-50 pl-10 pr-4 text-sm outline-none transition focus:border-[#2d6a2d] focus:bg-white focus:ring-4 focus:ring-green-100"
                  />
                </div>
              </div>

              {loading ? (
                <div className="grid min-h-64 place-items-center px-6 py-14 text-sm font-semibold text-slate-400">Loading secure staff access…</div>
              ) : filteredUsers.length === 0 ? (
                <div className="grid min-h-64 place-items-center px-6 py-14 text-center">
                  <div>
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Search size={23} /></div>
                    <p className="mt-3 font-black text-slate-900">No staff match this view</p>
                    <p className="mt-1 text-sm text-slate-500">Clear the role filter or try a different search.</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => {
                    const visual = visualFor(user.role)
                    const RoleIcon = visual.icon
                    const permissions = staffRolePermissions(user.role)
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => { setManageUser(user); setPasswordReset(''); setShowResetPassword(false) }}
                        className="group grid w-full gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5 xl:grid-cols-[minmax(230px,1.05fr)_190px_minmax(260px,1fr)_130px] xl:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#173a24] text-sm font-black text-white shadow-sm">{initials(user.name)}</div>
                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-900">{user.name}</p>
                            <p className="truncate text-sm text-slate-500">@{user.username}</p>
                            {user.role === 'driver' && (
                              <p className="mt-1 truncate text-xs font-semibold text-cyan-700">{user.driverProfile ? 'Route: ' + user.driverProfile.name : 'Driver route not linked'}</p>
                            )}
                          </div>
                        </div>

                        <div>
                          <span className={'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ' + visual.badge}>
                            <RoleIcon size={13} /> {staffRoleLabel(user.role)}
                          </span>
                          <p className={'mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold ' + (canProcessPayments(user.role) ? 'text-emerald-700' : 'text-amber-700')}>
                            {canProcessPayments(user.role) ? <CreditCard size={12} /> : <LockKeyhole size={12} />}
                            {canProcessPayments(user.role) ? 'Payment access' : 'Payments blocked'}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {permissions.slice(0, 4).map((permission) => (
                            <span key={permission} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
                              {STAFF_PERMISSION_LABELS[permission]}
                            </span>
                          ))}
                          {permissions.length > 4 && (
                            <span className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">+{permissions.length - 4}</span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-3 xl:justify-end">
                          <span className="text-xs font-bold text-slate-400 xl:hidden">Manage access</span>
                          <span className="inline-flex items-center gap-1 text-sm font-black text-[#2d6a2d]">Manage <ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </main>
        </div>
      </div>

      {addOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-950/55 backdrop-blur-sm" onMouseDown={(e) => { if (e.currentTarget === e.target) closeCreate() }}>
          <div className="ml-auto flex h-full w-full max-w-[760px] flex-col bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-7">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#2d6a2d]"><UserPlus size={15} /> New staff access</div>
                <h2 className="mt-1 text-2xl font-black text-slate-900">Add a team member</h2>
                <p className="mt-1 text-sm text-slate-500">Create one secure login and assign the access that matches the job.</p>
              </div>
              <button type="button" onClick={closeCreate} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Close"><X size={19} /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-black text-slate-800">Full name</span>
                    <input autoFocus type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Employee name" className="mt-1.5 min-h-12 w-full rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-[#2d6a2d] focus:ring-4 focus:ring-green-100" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-black text-slate-800">Username</span>
                    <input type="text" autoCapitalize="none" autoCorrect="off" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s+/g, '') })} placeholder="firstname" className="mt-1.5 min-h-12 w-full rounded-2xl border border-slate-300 px-3 text-sm outline-none focus:border-[#2d6a2d] focus:ring-4 focus:ring-green-100" />
                  </label>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-sm font-black text-slate-800">Temporary password</label>
                    <button type="button" onClick={() => { const next = generateTemporaryPassword(); setForm({ ...form, password: next }); setShowCreatePassword(true) }} className="text-xs font-black text-[#2d6a2d] hover:underline">Generate strong password</button>
                  </div>
                  <div className="relative mt-1.5">
                    <input type={showCreatePassword ? 'text' : 'password'} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" className="min-h-12 w-full rounded-2xl border border-slate-300 px-3 pr-24 text-sm outline-none focus:border-[#2d6a2d] focus:ring-4 focus:ring-green-100" />
                    <div className="absolute inset-y-0 right-1 flex items-center gap-1">
                      {form.password && <button type="button" onClick={() => void copyText(form.password, 'Password')} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title="Copy password"><Copy size={16} /></button>}
                      <button type="button" onClick={() => setShowCreatePassword((value) => !value)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" title={showCreatePassword ? 'Hide password' : 'Show password'}>{showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                    </div>
                  </div>
                </div>

                <div className="mt-7">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-900">Choose the job</p>
                      <p className="mt-0.5 text-xs text-slate-500">Access is assigned by role and enforced on the server.</p>
                    </div>
                    <span className={'rounded-full border px-2.5 py-1 text-[11px] font-black ' + (canProcessPayments(form.role) ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900')}>
                      {canProcessPayments(form.role) ? 'Payments on' : 'Payments off'}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {createRoleOptions.map((role) => {
                      const visual = visualFor(role.value)
                      const Icon = visual.icon
                      const selected = form.role === role.value
                      return (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => setForm({ ...form, role: role.value, driverProfileId: role.value === 'driver' ? form.driverProfileId : '' })}
                          className={'rounded-2xl border p-3.5 text-left transition ' + (selected ? 'border-[#2d6a2d] bg-[#edf6ef] ring-2 ring-green-100' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50')}
                        >
                          <div className="flex items-start gap-3">
                            <span className={'grid h-10 w-10 shrink-0 place-items-center rounded-xl ' + visual.iconBox}><Icon size={18} /></span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-black text-slate-900">{role.label}</span>
                              <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{role.description}</span>
                            </span>
                            {selected && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#2d6a2d] text-white"><Check size={14} /></span>}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {form.role === 'driver' && (
                  <div className="mt-5 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-100 text-cyan-800"><Truck size={18} /></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black text-cyan-950">Link the driver route</p>
                        <p className="mt-1 text-xs leading-5 text-cyan-800">Choose the existing driver profile that receives this person’s assigned deliveries and pickups.</p>
                        <select value={form.driverProfileId} onChange={(e) => setForm({ ...form, driverProfileId: e.target.value })} className="mt-3 min-h-11 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100">
                          <option value="">Automatic — exact-name match or create new profile</option>
                          {drivers.map((driver) => (
                            <option key={driver.id} value={driver.id} disabled={linkedDriverIds.has(driver.id)}>
                              {driver.name}{linkedDriverIds.has(driver.id) ? ' — already linked' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2"><Sparkles size={16} className="text-[#2d6a2d]" /><p className="text-sm font-black text-slate-900">{selectedCreateRole.label} access preview</p></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedCreatePermissions.map((permission) => (
                      <span key={permission} className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700">{STAFF_PERMISSION_LABELS[permission]}</span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
                <button type="button" onClick={closeCreate} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-black text-slate-700">Cancel</button>
                <button type="submit" disabled={submitting} className="min-h-11 rounded-xl bg-[#26733a] px-6 text-sm font-black text-white shadow-sm hover:bg-[#1f6130] disabled:opacity-50">{submitting ? 'Creating account…' : 'Create secure login'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {manageUser && (
        <div className="fixed inset-0 z-[150] bg-slate-950/55 backdrop-blur-sm" onMouseDown={(e) => { if (e.currentTarget === e.target) setManageUser(null) }}>
          <div className="ml-auto flex h-full w-full max-w-[790px] flex-col bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
              <div className="flex items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#173a24] text-base font-black text-white">{initials(manageUser.name)}</div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Staff account</p>
                  <h2 className="truncate text-2xl font-black text-slate-900">{manageUser.name}</h2>
                  <p className="truncate text-sm text-slate-500">@{manageUser.username}</p>
                </div>
                <button type="button" onClick={() => setManageUser(null)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" aria-label="Close"><X size={19} /></button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Current role</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{staffRoleLabel(manageUser.role)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Payments</p>
                  <p className={'mt-1 text-sm font-black ' + (canProcessPayments(manageUser.role) ? 'text-emerald-700' : 'text-amber-700')}>{canProcessPayments(manageUser.role) ? 'Allowed' : 'Blocked'}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-400">Session security</p>
                  <p className="mt-1 text-sm font-black text-slate-900">{IDLE_MINUTES}-min idle logout</p>
                </div>
              </div>

              <section className="mt-6">
                <p className="text-sm font-black text-slate-900">Change job role</p>
                <p className="mt-1 text-xs text-slate-500">Permissions update on the next authenticated request; payment restrictions are enforced server-side.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {roleOptions.map((role) => {
                    const visual = visualFor(role.value)
                    const Icon = visual.icon
                    const selected = manageUser.role === role.value || (manageUser.role === 'employee' && role.value === 'office')
                    return (
                      <button
                        key={role.value}
                        type="button"
                        disabled={savingId === manageUser.id}
                        onClick={() => void updateRole(manageUser, role.value)}
                        className={'rounded-2xl border p-3.5 text-left transition disabled:opacity-50 ' + (selected ? 'border-[#2d6a2d] bg-[#edf6ef] ring-2 ring-green-100' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50')}
                      >
                        <div className="flex items-center gap-3">
                          <span className={'grid h-9 w-9 shrink-0 place-items-center rounded-xl ' + visual.iconBox}><Icon size={16} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black text-slate-900">{role.label}</span>
                            <span className="block text-[11px] text-slate-500">{canProcessPayments(role.value) ? 'Payment access included' : 'No payment processing'}</span>
                          </span>
                          {selected && <Check size={16} className="shrink-0 text-green-700" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              {manageUser.role === 'driver' && (
                <section className="mt-6 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-100 text-cyan-800"><Truck size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-cyan-950">Assigned driver route</p>
                      <p className="mt-1 text-xs leading-5 text-cyan-800">This staff login can see only the stops assigned to the linked Driver profile.</p>
                      <select
                        value={manageUser.driverProfileId || ''}
                        disabled={savingId === manageUser.id}
                        onChange={(e) => void updateDriverProfile(manageUser, e.target.value)}
                        className="mt-3 min-h-11 w-full rounded-xl border border-cyan-200 bg-white px-3 text-sm font-semibold text-slate-800 outline-none disabled:opacity-50"
                      >
                        <option value="">Automatic profile</option>
                        {drivers.map((driver) => (
                          <option key={driver.id} value={driver.id} disabled={linkedDriverIds.has(driver.id) && driver.id !== manageUser.driverProfileId}>
                            {driver.name}{linkedDriverIds.has(driver.id) && driver.id !== manageUser.driverProfileId ? ' — already linked' : ''}
                          </option>
                        ))}
                      </select>
                      {manageUser.driverProfile && <p className="mt-2 text-xs font-black text-cyan-900">Currently linked: {manageUser.driverProfile.name}</p>}
                    </div>
                  </div>
                </section>
              )}

              <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_310px]">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-sm font-black text-slate-900">Effective access</p>
                  <p className="mt-1 text-xs text-slate-500">What this account is allowed to use right now.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedManagePermissions.map((permission) => (
                      <span key={permission} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700"><Check size={12} className="text-green-700" />{STAFF_PERMISSION_LABELS[permission]}</span>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center gap-2"><KeyRound size={16} className="text-slate-500" /><p className="text-sm font-black text-slate-900">Reset password</p></div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Set a temporary password if this employee cannot sign in.</p>
                  <div className="relative mt-3">
                    <input type={showResetPassword ? 'text' : 'password'} autoComplete="new-password" value={passwordReset} onChange={(e) => setPasswordReset(e.target.value)} placeholder="New temporary password" className="min-h-11 w-full rounded-xl border border-slate-300 px-3 pr-20 text-sm outline-none focus:border-[#2d6a2d] focus:ring-4 focus:ring-green-100" />
                    <div className="absolute inset-y-0 right-1 flex items-center gap-1">
                      <button type="button" onClick={() => { const next = generateTemporaryPassword(); setPasswordReset(next); setShowResetPassword(true) }} className="rounded-lg px-2 py-1 text-[10px] font-black text-[#2d6a2d] hover:bg-slate-100">Generate</button>
                      <button type="button" onClick={() => setShowResetPassword((value) => !value)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">{showResetPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    </div>
                  </div>
                  {passwordReset && (
                    <button type="button" onClick={() => void copyText(passwordReset, 'Password')} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-[#2d6a2d]"><Copy size={13} /> Copy temporary password</button>
                  )}
                  <button type="button" onClick={() => void resetPassword()} disabled={savingId === manageUser.id || passwordReset.length < 8} className="mt-3 min-h-11 w-full rounded-xl bg-slate-900 px-4 text-sm font-black text-white disabled:opacity-40">Save new password</button>
                </div>
              </section>

              {manageUser.createdAt && <p className="mt-6 text-xs text-slate-400">Staff account created {new Date(manageUser.createdAt).toLocaleDateString()}.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
