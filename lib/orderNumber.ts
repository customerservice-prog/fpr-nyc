import { prisma } from '@/lib/prisma'

// Returns a permanent, sequential, never-reused order number as a plain string
// (e.g. "9001"). Uses an atomic DB counter so concurrent checkouts never collide.
export async function getNextOrderNumber(): Promise<string> {
    const counter = await prisma.orderCounter.upsert({
          where: { id: 'global' },
          update: { value: { increment: 1 } },
          create: { id: 'global', value: 9001 },
    })
    return String(counter.value)
}
