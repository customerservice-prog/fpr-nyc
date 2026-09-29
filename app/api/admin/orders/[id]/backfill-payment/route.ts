export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// This route creates a Payment record for historical/audit-trail purposes ONLY.
// Unlike manual-payment, it does NOT modify the order's amountPaid/balanceDue/
// totalAmount and does NOT trigger any customer-facing receipt email. It exists
// solely to backfill missing Payment rows (e.g. refunds that were processed in
// the legacy ERS system but never imported) so the payment history is complete,
// without altering order totals that have already been verified as correct.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if ((session.user as any).role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { amount, method, notes, status, createdAt } = await request.json();

    if (typeof amount !== 'number' || amount === 0) {
      return NextResponse.json(
        { error: 'Enter a valid non-zero amount' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({ where: { id: (await params).id } });
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const payment = await prisma.payment.create({
      data: {
        orderId: (await params).id,
        amount,
        method: method || 'card',
        notes: notes || undefined,
        status: status || 'succeeded',
        recordedByName: session.user?.name
          ? `${session.user.name} (historical backfill)`
          : 'historical backfill',
        ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
      },
    });

    return NextResponse.json({ success: true, payment });
  } catch (error) {
    console.error('Backfill payment error:', error);
    return NextResponse.json(
      { error: 'Failed to backfill payment record' },
      { status: 500 }
    );
  }
}

        // DELETE handler: allows removing an incorrectly-entered historical backfill
// Payment row by id (audit-trail correction only, no order total changes).
export async function DELETE(
    request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
  ) {
    const session = await getServerSession(authOptions);
    if (!session) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if ((session.user as any).role !== 'admin') {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
          const { paymentId } = await request.json();
          if (!paymentId) {
                  return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
          }

          const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
          if (!payment || payment.orderId !== (await params).id) {
                  return NextResponse.json({ error: 'Payment not found for this order' }, { status: 404 });
          }

          await prisma.payment.delete({ where: { id: paymentId } });

          return NextResponse.json({ success: true });
    } catch (error) {
          console.error('Backfill payment delete error:', error);
          return NextResponse.json(
            { error: 'Failed to delete backfilled payment record' },
            { status: 500 }
                );
    }
}

