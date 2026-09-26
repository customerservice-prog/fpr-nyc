'use client';

import { useState } from 'react';
import {
  AnalyticsData,
  TrendRow,
  Card,
  SectionHeader,
  MetricCard,
  ChartContainer,
  Donut,
  ProgressBar,
  money,
  num,
  pct,
} from './AnalyticsUI';

function OrdersChart({ data }: { data: TrendRow[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 900;
  const height = 280;
  const padL = 40;
  const padR = 12;
  const padT = 16;
  const padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const values = data.map((d) => d.orders);
  const maxV = Math.max(1, ...values);
  const colWidth = data.length ? innerW / data.length : innerW;
  const barWidth = Math.min(28, colWidth * 0.55);

  return (
    <div className='relative'>
      <svg viewBox={`0 0 ${width} ${height}`} className='w-full h-[280px]'>
        {[0, 0.5, 1].map((g) => {
          const y = padT + innerH - g * innerH;
          return <line key={g} x1={padL} y1={y} x2={width - padR} y2={y} stroke='#EEF1F4' strokeWidth={1} />;
        })}
        {data.map((d, i) => {
          const x = padL + i * colWidth + (colWidth - barWidth) / 2;
          const h = (d.orders / maxV) * innerH;
          const y = padT + innerH - h;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(h, 1)}
              rx={4}
              fill={hover === i ? '#15803D' : '#16A34A'}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </svg>
      <div className='flex justify-between mt-1 px-1'>
        {data.map((d, i) => (
          <span key={i} className='text-[10px] text-slate-400'>{data.length > 8 && i % 2 !== 0 ? '' : d.month.slice(5)}</span>
        ))}
      </div>
      {hover !== null && data[hover] ? (
        <div className='absolute bg-slate-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg' style={{ left: padL + hover * (innerW / data.length), top: 8 }}>
          <p className='font-semibold mb-1'>{data[hover].month}</p>
          <p>Orders: {num(data[hover].orders)}</p>
          <p>Revenue: {money(data[hover].revenue)}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function OrdersTab({ data }: { data: AnalyticsData }) {
  const { totals, deliveryMix, upcomingBusiness, bookingLeadTime } = data;
  const deliveryTotal = deliveryMix.reduce((s, d) => s + d.count, 0) || 1;
  const deliveryColors = ['#16A34A', '#94A3B8', '#F59E0B', '#EF4444'];

  const statusRows = [
    { label: 'Completed', value: totals.orderCounts.completed, tone: 'green' as const },
    { label: 'Active', value: totals.orderCounts.active, tone: 'green' as const },
    { label: 'Quote', value: totals.orderCounts.quote, tone: 'amber' as const },
    { label: 'Canceled', value: totals.orderCounts.canceled, tone: 'red' as const },
  ];
  const maxStatus = Math.max(1, ...statusRows.map((s) => s.value));
  const maxLeadBucket = Math.max(1, ...bookingLeadTime.buckets.map((b) => b.count));

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-[22px] font-bold text-slate-900'>Orders</h1>
        <p className='text-sm text-slate-500 mt-1'>Booking volume, fulfillment and upcoming workload.</p>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
        <MetricCard label='Valid Orders' value={num(totals.orderCounts.legitimate)} />
        <MetricCard label='Upcoming' value={num(upcomingBusiness.bookings)} sub={`Next ${upcomingBusiness.windowDays} days`} />
        <MetricCard label='Completed' value={num(totals.orderCounts.completed)} />
        <MetricCard label='Canceled' value={num(totals.orderCounts.canceled)} />
        <MetricCard label='Quotes' value={num(totals.orderCounts.quote)} />
        <MetricCard label='Avg Booking Value' value={money(totals.averageOrderValue)} />
      </div>

      <ChartContainer title='Orders Over Time' description='Booking volume by month, last 12 months.'>
        <OrdersChart data={data.revenueTrend} />
      </ChartContainer>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <Card>
          <h3 className='text-[15px] font-semibold text-slate-900 mb-4'>Fulfillment</h3>
          <div className='flex items-center gap-6'>
            <Donut segments={deliveryMix.map((d, i) => ({ label: d.type, value: d.count, color: deliveryColors[i % deliveryColors.length] }))} />
            <div className='space-y-2'>
              {deliveryMix.map((d, i) => (
                <div key={d.type} className='flex items-center gap-2 text-sm'>
                  <span className='w-2.5 h-2.5 rounded-full' style={{ background: deliveryColors[i % deliveryColors.length] }} />
                  <span className='text-slate-700'>{d.type}</span>
                  <span className='font-semibold text-slate-900'>{pct((d.count / deliveryTotal) * 100, 1)}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <h3 className='text-[15px] font-semibold text-slate-900 mb-4'>Order Status</h3>
          <div className='space-y-3'>
            {statusRows.map((s) => (
              <div key={s.label}>
                <div className='flex items-center justify-between text-sm mb-1'>
                  <span className='text-slate-700'>{s.label}</span>
                  <span className='font-semibold text-slate-900'>{num(s.value)}</span>
                </div>
                <div className='h-1.5 w-full bg-slate-100 rounded-full overflow-hidden'>
                  <div
                    className={`h-full rounded-full ${s.tone === 'amber' ? 'bg-amber-500' : s.tone === 'red' ? 'bg-red-500' : 'bg-green-600'}`}
                    style={{ width: `${Math.round((s.value / maxStatus) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <SectionHeader title='Booking Lead Time' description='How far in advance orders are booked, based on completed and active orders.' />
        <Card>
          <div className='flex flex-wrap gap-8 mb-5 pb-5 border-b border-slate-100'>
            <div>
              <p className='text-2xl font-bold text-slate-900'>{bookingLeadTime.averageDays.toFixed(1)}</p>
              <p className='text-xs text-slate-500'>Average days ahead</p>
            </div>
            <div>
              <p className='text-2xl font-bold text-slate-900'>{bookingLeadTime.medianDays}</p>
              <p className='text-xs text-slate-500'>Median days ahead</p>
            </div>
          </div>
          <p className='text-xs text-slate-500 mb-4'>Measured from order creation to event date. A high share of 0-3 day results often reflects walk-in bookings or historical orders recorded without an original booking timestamp, not necessarily last-minute demand.</p>
          <div className='space-y-3'>
            {bookingLeadTime.buckets.map((b) => (
              <div key={b.label}>
                <div className='flex items-center justify-between text-sm mb-1'>
                  <span className='text-slate-700'>{b.label}</span>
                  <span className='font-semibold text-slate-900'>{num(b.count)}</span>
                </div>
                <ProgressBar value={b.count} max={maxLeadBucket} tone='green' />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <SectionHeader title='Upcoming Workload' description={`Next ${upcomingBusiness.windowDays} days`} />
        <Card>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <div>
              <p className='text-2xl font-bold text-slate-900'>{num(upcomingBusiness.bookings)}</p>
              <p className='text-xs text-slate-500'>Bookings</p>
            </div>
            <div>
              <p className='text-2xl font-bold text-slate-900'>{num(upcomingBusiness.deliveries)}</p>
              <p className='text-xs text-slate-500'>Deliveries</p>
            </div>
            <div>
              <p className='text-2xl font-bold text-slate-900'>{num(upcomingBusiness.pickups)}</p>
              <p className='text-xs text-slate-500'>Pickups</p>
            </div>
            <div>
              <p className='text-2xl font-bold text-slate-900'>{money(upcomingBusiness.bookedRevenue)}</p>
              <p className='text-xs text-slate-500'>Booked Revenue</p>
            </div>
          </div>
          {upcomingBusiness.busiestDate ? (
            <div className='mt-5 pt-4 border-t border-slate-100'>
              <p className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>Busiest Date</p>
              <p className='text-sm font-medium text-slate-900 mt-0.5'>{new Date(upcomingBusiness.busiestDate.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <p className='text-xs text-slate-500'>{num(upcomingBusiness.busiestDate.orders)} orders</p>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
