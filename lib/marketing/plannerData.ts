import { marketingAddonAvailability } from './availability'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { getSuppressedEmails, isTestRecord, isValidEmailFormat, normalizeEmail } from './eligibility'
import { buildAutomationPlan, type AutomationContact, type AutomationOpportunity } from './planner'

const customerSelect = {
  id: true, email: true, firstName: true, lastName: true, company: true,
  orders: {
    where: {
      status: { notIn: ['canceled','cancelled','quote','draft','incomplete'] },
    },
    select: {
      id: true, eventDate: true, eventEndDate: true, createdAt: true, source: true, notes: true, amountPaid: true,
      items: { select: { itemName: true, item: { select: { category: { select: { name: true, slug: true } } } } } },
    },
  },
} satisfies Prisma.CustomerSelect

export async function getAutomationContacts(email?: string, now = new Date()): Promise<AutomationContact[]> {
  const normalized = email ? normalizeEmail(email) : null
  const [customers, suppressed, catalog] = await Promise.all([
    prisma.customer.findMany({
      ...(normalized ? { where: { email: { contains: normalized, mode: 'insensitive' as const } } } : {}),
      select: customerSelect,
    }),
    getSuppressedEmails(),
    prisma.item.findMany({ where:{ displayToCustomer:true, status:'Available', quantity:{gt:0}, category:{ displayToCustomer:true } }, select:{ id:true, name:true, quantity:true, bookableAfter:true, category:{ select:{slug:true,name:true,bookableAfter:true} } } }),
  ])
  const upcoming = customers.flatMap(c => c.orders).filter(o => o.amountPaid > 0 && o.eventDate >= new Date(now.getTime() - 86400000))
  const available = await marketingAddonAvailability(upcoming, catalog, now)
  const contacts = new Map<string, AutomationContact>()
  for (const customer of customers) {
    if (normalized && normalizeEmail(customer.email) !== normalized) continue
    const address = normalizeEmail(customer.email)
    const eligible = isValidEmailFormat(address) && !isTestRecord(address,customer.firstName,customer.lastName) && !suppressed.has(address)
    const key = address || `invalid:${customer.id}`
    let contact = contacts.get(key)
    if (!contact) {
      contact = { email:address, eligible, company:customer.company || '', orders:[], customerRecords:0 }
      contacts.set(key,contact)
    } else {
      // A duplicate identity cannot bypass a restriction or test-record check.
      contact.eligible &&= eligible
      if (!contact.company.trim() && customer.company) contact.company = customer.company
    }
    contact.customerRecords = (contact.customerRecords || 0) + 1
    contact.orders.push(...customer.orders.map(order => ({
      id:order.id, eventDate:order.eventDate, createdAt:order.createdAt, source:order.source, notes:order.notes,
      // The legacy unpaid-approval flag was backfilled on imported records, so
      // it cannot prove a rental or a deliberate staff approval. Automatic
      // offers require recorded payment; unpaid future orders still remain in
      // the contact's history to suppress acquisition/rebooking messages.
      confirmed: order.amountPaid > 0, availableAddonSlugs: available.get(order.id) || [],
      items:order.items.map(line => ({ itemName:line.itemName, categorySlug:line.item?.category.slug || '', categoryName:line.item?.category.name || '' })),
    })))
  }
  return [...contacts.values()]
}

export async function getAutomationPlan(now = new Date()) {
  return buildAutomationPlan(await getAutomationContacts(undefined, now),now)
}

/** Rebuild immediately before delivery: no cached audience survives a new
 * booking, item change, unsubscribe, or active Do Not Rent restriction. */
export async function refreshRecipientOpportunity(email: string, slug: string, occurrenceKey: string, now = new Date()): Promise<AutomationOpportunity | null> {
  const plan = buildAutomationPlan(await getAutomationContacts(email, now),now)
  return plan.opportunities.find(opportunity => opportunity.email === normalizeEmail(email) && opportunity.slug === slug && opportunity.occurrenceKey === occurrenceKey) || null
}

