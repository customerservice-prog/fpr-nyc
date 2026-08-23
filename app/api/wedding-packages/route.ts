export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Wedding packages are advertised on the public marketing page with a
// price stored on the WeddingPackage row, but the actual chargeable item
// lives in the real inventory (synced from ERS) as an Item named
// "Wedding Package - <name>". To make sure the marketing price never
// drifts out of sync with what a customer is actually charged, we look
// up the matching live Item cost here and use it as the source of truth
// whenever a match exists.
export async function GET() {
        const packages = await prisma.weddingPackage.findMany({
                    where: { isActive: true },
                    orderBy: { sortOrder: 'asc' },
        })

    const items = await prisma.item.findMany({
                where: { name: { in: packages.map((p) => `Wedding Package - ${p.name}`) } },
                select: { name: true, cost: true },
    })
        const costByName = new Map(items.map((i) => [i.name, i.cost]))

    const synced = packages.map((p) => {
                const liveCost = costByName.get(`Wedding Package - ${p.name}`)
                return liveCost !== undefined && liveCost !== null ? { ...p, price: liveCost } : p
    })

    return NextResponse.json(synced)
}
