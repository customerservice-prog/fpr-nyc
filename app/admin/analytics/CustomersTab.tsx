'use client';

import {
  AnalyticsData,
  Card,
  SectionHeader,
  MetricCard,
  DataTable,
  money,
  num,
  pct,
} from './AnalyticsUI';

function formatBookingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function CustomersTab({ data }: { data: AnalyticsData }) {
  const { totals, topCustomers, customerSegments, topCities, topStates } = data;

  const topCustomer = topCustomers[0];
  const avgCustomerValue = totals.totalCustomers > 0 ? totals.totalRevenue / totals.totalCustomers : 0;

  const rows = topCustomers.map((c, i) => ({
    ...c,
    rank: i + 1,
    outstanding: Math.max(0, c.revenue - c.collected),
  }));

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-[22px] font-bold text-slate-900'>Customers</h1>
        <p className='text-sm text-slate-500 mt-1'>Customer value and booking behavior.</p>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <MetricCard label='Unique Paying Customers' value={num(totals.totalCustomers)} />
        <MetricCard label='Average Customer Value' value={money(avgCustomerValue)} />
        <MetricCard label='Top Customer' value={topCustomer ? topCustomer.name : '—'} sub={topCustomer ? money(topCustomer.revenue) : undefined} />
        <MetricCard label='Total Revenue' value={money(totals.totalRevenue)} />
      </div>

      <div>
        <SectionHeader title='New vs. Returning' description='Based on unique customer email across all completed and active orders.' />
        <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
          <MetricCard label='New Customers' value={num(customerSegments.newCustomers)} />
          <MetricCard label='Returning Customers' value={num(customerSegments.returningCustomers)} />
          <MetricCard label='Repeat Rate' value={pct(customerSegments.repeatRate, 1)} />
        </div>
      </div>

      <div>
        <SectionHeader title='Customer Geography' description='Where paying customers are located, by booked orders.' />
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <Card>
            <h3 className='text-[15px] font-semibold text-slate-900 mb-3'>Top Cities</h3>
            <div className='divide-y divide-slate-100'>
              {topCities.slice(0, 8).map((c) => (
                <div key={c.name} className='flex items-center justify-between py-2 text-sm'>
                  <span className='text-slate-700'>{c.name}</span>
                  <span className='font-medium text-slate-900'>{num(c.orders)} orders · {money(c.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <h3 className='text-[15px] font-semibold text-slate-900 mb-3'>Top States</h3>
            <div className='divide-y divide-slate-100'>
              {topStates.slice(0, 8).map((s) => (
                <div key={s.name} className='flex items-center justify-between py-2 text-sm'>
                  <span className='text-slate-700'>{s.name}</span>
                  <span className='font-medium text-slate-900'>{num(s.orders)} orders · {money(s.revenue)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div>
        <SectionHeader title='Top Customers' description='Ranked by booked revenue.' />
        <Card padded={false}>
          <DataTable
            rowKey={(row) => row.name}
            rows={rows}
            columns={[
              { key: 'rank', header: 'Rank', render: (row) => row.rank },
              { key: 'customer', header: 'Customer', render: (row) => row.name },
              { key: 'orders', header: 'Orders', align: 'right', render: (row) => num(row.orders) },
              { key: 'revenue', header: 'Booked Revenue', align: 'right', render: (row) => money(row.revenue) },
              { key: 'collected', header: 'Collected', align: 'right', render: (row) => money(row.collected) },
              { key: 'outstanding', header: 'Outstanding', align: 'right', render: (row) => money(row.outstanding) },
              { key: 'lastBooking', header: 'Last Booking', align: 'right', render: (row) => formatBookingDate(row.lastBooking) },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
