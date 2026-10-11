import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function PayNowPage({
  searchParams,
}: {
  searchParams: Promise<{ on?: string; ln?: string }>
}) {
  const { on: orderNumber, ln: lastName } = await searchParams

  if (orderNumber && lastName) {
    const order = await prisma.order.findFirst({
      where: { orderNumber },
      include: { customer: true },
    })

    if (
      order &&
      order.customer &&
      order.customer.lastName.trim().toLowerCase() === lastName.trim().toLowerCase()
    ) {
      redirect('/pay/' + order.id)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <h1 className="text-2xl font-bold text-dark mb-4">Link Not Found</h1>
      <p className="text-body">
        This payment link is invalid or has expired. Please contact us at <a href="tel:7182834593" className="text-secondary underline">718-283-4593</a>.
      </p>
    </div>
  )
}
