'use client';

import {
  AnalyticsData,
  Card,
  SectionHeader,
  MetricCard,
  ProgressBar,
  UtilizationRow,
  DataTable,
  formatDate,
  money,
  num,
  pct,
} from './AnalyticsUI';

export default function InventoryTab({ data }: { data: AnalyticsData }) {
  const { totals, rankedByUnits, rankedByRevenue, inventoryUtilization } = data;

  const totalUnitsRented = rankedByUnits.reduce((s, r) => s + r.units, 0);
  const topItem = rankedByUnits[0];
  const maxUnits = Math.max(1, ...rankedByUnits.map((r) => r.units));

  const rows = rankedByRevenue.map((item, i) => ({
    ...item,
    rank: i + 1,
    pctRevenue: totals.totalRevenue > 0 ? (item.revenue / totals.totalRevenue) * 100 : 0,
  }));

  const utilizationRows = [...inventoryUtilization]
    .filter((item) => item.peakReserved > 0)
    .sort((a, b) => b.utilizationPct - a.utilizationPct)
    .slice(0, 15);
  const highDemandCount = inventoryUtilization.filter((item) => item.highDemand).length;

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-[22px] font-bold text-slate-900'>Inventory</h1>
        <p className='text-sm text-slate-500 mt-1'>Demand and revenue performance across the rental catalog.</p>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <MetricCard label='Active Rental Items' value={num(totals.totalItems)} sub='With bookings in this period' />
        <MetricCard label='Catalog Records' value={num(totals.totalCatalogRecords)} sub='Total items in catalog' />
        <MetricCard label='Units Rented' value={num(totalUnitsRented)} sub='Last 30 days' />
        <MetricCard label='High Demand Risk' value={num(highDemandCount)} sub='80%+ booked on peak day, next 14 days' />
      </div>

      <div>
        <SectionHeader title='Inventory Utilization' description='Owned vs. reserved quantity over the next 14 days. Items booked 80% or more on their peak day are flagged as high demand.' />
        <Card>
          {utilizationRows.length ? (
            <div>
              {utilizationRows.map((item) => (
                <UtilizationRow
                  key={item.itemId}
                  name={item.name}
                  detail={item.peakDate ? `${item.available} available · peak ${formatDate(item.peakDate)}` : `${item.available} available`}
                  value={item.peakReserved}
                  max={item.owned}
                  tone={item.highDemand ? 'red' : item.utilizationPct >= 50 ? 'amber' : 'green'}
                />
              ))}
            </div>
          ) : (
            <p className='text-sm text-slate-400'>No reservations in the next 14 days.</p>
          )}
        </Card>
      </div>

      <div>
        <SectionHeader title='Demand by Item' description='Units rented, last 30 days. Highest-demand items are shown first.' />
        <Card>
          <div className='divide-y divide-slate-100'>
            {rankedByUnits.map((item) => (
              <div key={item.name} className='py-3 first:pt-0'>
                <div className='flex items-center justify-between text-sm mb-1.5'>
                  <span className='font-medium text-slate-800'>{item.name}</span>
                  <span className='text-slate-500'>{num(item.units)} units · {money(item.revenue)}</span>
                </div>
                <ProgressBar value={item.units} max={maxUnits} tone='green' />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div>
        <SectionHeader title='Items by Revenue' />
        <Card padded={false}>
          <DataTable
            rowKey={(row) => row.name}
            rows={rows}
            columns={[
              { key: 'rank', header: 'Rank', render: (row) => row.rank },
              { key: 'item', header: 'Item', render: (row) => <span className='block max-w-xs truncate' title={row.name}>{row.name}</span> },
              { key: 'orders', header: 'Orders', align: 'right', render: (row) => num(row.orders) },
              { key: 'units', header: 'Units', align: 'right', render: (row) => num(row.units) },
              { key: 'revenue', header: 'Revenue', align: 'right', render: (row) => money(row.revenue) },
              { key: 'pct', header: '% Revenue', align: 'right', render: (row) => pct(row.pctRevenue, 1) },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
