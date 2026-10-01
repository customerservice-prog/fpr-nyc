export const STAFF_ROLES = ['admin','manager','office','office_training','crew','driver','employee'] as const
export type StaffRole = typeof STAFF_ROLES[number]

export type StaffPermission =
  | 'owner_settings'
  | 'reports'
  | 'analytics'
  | 'planning'
  | 'website'
  | 'orders'
  | 'customers'
  | 'scheduling'
  | 'delivery'
  | 'driver_route'
  | 'marketing'
  | 'payments'
  | 'refunds'
  | 'manage_staff'
  | 'manage_drivers'
  | 'delete_orders'
  | 'override_restrictions'
  | 'edit_order_financials'

const ROLE_LABELS: Record<StaffRole,string> = {
  admin: 'Owner / Administrator',
  manager: 'Manager',
  office: 'Office',
  office_training: 'Office Training',
  crew: 'Crew Member',
  driver: 'Driver',
  employee: 'Office',
}

const ROLE_PERMISSIONS: Record<StaffRole, ReadonlySet<StaffPermission>> = {
  admin: new Set<StaffPermission>([
    'owner_settings','reports','analytics','planning','website','orders','customers','scheduling','delivery','driver_route','marketing',
    'payments','refunds','manage_staff','manage_drivers','delete_orders','override_restrictions','edit_order_financials',
  ]),
  manager: new Set<StaffPermission>([
    'planning','orders','customers','scheduling','delivery','marketing',
    'payments','refunds','manage_drivers','delete_orders','override_restrictions','edit_order_financials',
  ]),
  office: new Set<StaffPermission>([
    'planning','orders','customers','scheduling','delivery','marketing','payments','refunds','edit_order_financials',
  ]),
  // New-hire / probationary office role: intentionally read-mostly.
  // Live mutations are additionally blocked at the admin API boundary.
  office_training: new Set<StaffPermission>([
    'orders',
  ]),
  crew: new Set<StaffPermission>([
    'orders','scheduling','delivery',
  ]),
  driver: new Set<StaffPermission>([
    'driver_route',
  ]),
  employee: new Set<StaffPermission>([
    'planning','orders','customers','scheduling','delivery','marketing','payments','refunds','edit_order_financials',
  ]),
}

export function normalizeStaffRole(role?: string | null): StaffRole {
  if (role && (STAFF_ROLES as readonly string[]).includes(role)) return role as StaffRole
  return role === 'employee' ? 'employee' : 'office_training'
}

export function staffRoleLabel(role?: string | null) {
  return ROLE_LABELS[normalizeStaffRole(role)]
}

export function hasStaffPermission(role: string | null | undefined, permission: StaffPermission) {
  return ROLE_PERMISSIONS[normalizeStaffRole(role)].has(permission)
}

export function canProcessPayments(role?: string | null) {
  return hasStaffPermission(role, 'payments')
}

export function canIssueRefunds(role?: string | null) {
  return hasStaffPermission(role, 'refunds')
}

export function roleHome(role?: string | null) {
  const normalized = normalizeStaffRole(role)
  if (normalized === 'driver') return '/driver'
  if (normalized === 'crew') return '/admin/delivery'
  if (normalized === 'office_training') return '/admin/orders'
  return '/admin'
}

export const STAFF_ROLE_OPTIONS = [
  { value: 'manager', label: 'Manager', description: 'Day-to-day operations, order overrides, delivery management, payments and refunds; owner-only system/security settings remain restricted.' },
  { value: 'office', label: 'Office', description: 'Orders, customers, scheduling, delivery, marketing, payments and refunds.' },
  { value: 'office_training', label: 'Office Training', description: 'Probationary read-only order access. Cannot create/edit orders, browse customers, schedule deliveries, send marketing, process payments/refunds, or change pricing/settings.' },
  { value: 'crew', label: 'Crew Member', description: 'Operational order, scheduling and delivery access only.' },
  { value: 'driver', label: 'Driver', description: 'Assigned route only. Staff sign-in opens the driver route and does not expose dispatcher or office screens.' },
] as const


export const STAFF_PERMISSION_LABELS: Record<StaffPermission, string> = {
  owner_settings: 'Owner & system settings',
  reports: 'Reports',
  analytics: 'Analytics',
  planning: 'Planning inquiries',
  website: 'Website editor',
  orders: 'Orders',
  customers: 'Customers',
  scheduling: 'Scheduling',
  delivery: 'Delivery dispatch',
  driver_route: 'Assigned driver route',
  marketing: 'Marketing',
  payments: 'Take & record payments',
  refunds: 'Issue refunds',
  manage_staff: 'Manage staff accounts',
  manage_drivers: 'Manage drivers',
  delete_orders: 'Delete orders',
  override_restrictions: 'Override Do Not Rent',
  edit_order_financials: 'Edit quote/order pricing',
}

export function staffRolePermissions(role?: string | null) {
  return Array.from(ROLE_PERMISSIONS[normalizeStaffRole(role)])
}
