'use client';

import { useState } from 'react';
import {
  AnalyticsData,
  TrendRow,
  Card,
  SectionHeader,
  MetricCard,
  MetricCell,
  PrimaryMetricCard,
  ChartContainer,
  DataTable,
  money,
  num,
  pct,
  moneyCompact,
} from './AnalyticsUI';

function RevenueChart({ data }: { data: TrendRow[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const width = 900;
  const height = 300;
  const padL = 54;
  const padR = 12;
  const padT = 16;
  const padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const values = data.map((d) => d.revenue);
  const maxV = Math.max(1, ...values);
  const xFor = (i: number) => padL + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const yFor = (v: number) => padT + innerH - (v / maxV) * innerH;
  const points = values.map((v, i) => [xFor(i), yFor(v)] as const);
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const floorY = (padT + innerH).toFixed(1);
  const areaPath = points.length ? `${linePath} L ${points[points.length - 1][0].toFixed(1)} ${floorY} L ${points[0][0].toFixed(1)} ${floorY} Z` : '';
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];
  const colWidth = data.length ? innerW / data.length : innerW;

  return (
    <div className='relative' onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} className='w-full h-[300px]'>
        {gridSteps.map((g) => {
          const y = padT + innerH - g * innerH;
          return (
            <g key={g}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke='#EEF1F4' strokeWidth={1} />
              <text x={padL - 8} y={y + 4} textAnchor='end' fontSize='11' fill='#94A3B8'>{moneyCompact(g * maxV)}</text>
            </g>
          );
        })}
        {areaPath ? <path d={areaPath} fill='rgba(22,163,74,0.08)' stroke='none' /> : null}
        {linePath ? <path d={linePath} fill='none' stroke='#16A34A' strokeWidth={2.5} /> : null}
        {points.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 4 : 0} fill='#16A34A' stroke='#fff' strokeWidth={1.5} />
        ))}
        {data.map((d, i) => (
          <rect key={i} x={xFor(i) - colWidth / 2} y={padT} width={colWidth} height={innerH} fill='transparent' onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      <div className='flex justify-between mt-1 px-1'>
        {data.map((d, i) => (
          <span key={i} className='text-[10px] text-slate-400'>{data.length > 8 && i % 2 !== 0 ? '' : d.month.slice(5)}</span>
        ))}
      </div>
      {hover !== null && data[hover] ? (
        <div className='absolute bg-slate-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-lg z-10 whitespace-nowrap' style={{ left: Math.min(Math.max(xFor(hover) - 70, 0), width - 150), top: Math.max(yFor(values[hover]) - 80, 0) }}>
          <p className='font-semibold mb-1'>{data[hover].month}</p>
          <p>Revenue: {money(data[hover].revenue)}</p>
          <p>Orders: {num(data[hover].orders)}</p>
        </div>
      ) : null}
    </div>
  );
}

export default function RevenueTab({ data }: { data: AnalyticsData }) {
  const { totals, rankedByRevenue, topCities } = data;

  const productRows = rankedByRevenue.slice(0, 10).map((item, i) => ({
    ...item,
    rank: i + 1,
    pctRevenue: totals.totalRevenue > 0 ? (item.revenue / totals.totalRevenue) * 100 : 0,
  }));

  const areaRows = topCities.map((c, i) => ({ ...c, rank: i + 1 }));

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-[22px] font-bold text-slate-900'>Revenue</h1>
        <p className='text-sm text-slate-500 mt-1'>Understand booked, collected and outstanding revenue.</p>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-4'>
        <div className='lg:col-span-5'>
          <PrimaryMetricCard
            label='Net Revenue'
            value={money(totals.totalRevenue)}
            rows={[
              { label: 'Gross Booked', value: money(totals.grossBookedRevenue) },
              { label: 'Refunds', value: `-${money(totals.totalRefunds)}`, tone: 'negative' },
            ]}
          />
        </div>
        <Card padded={false} className='lg:col-span-7 h-full overflow-hidden'>
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y divide-slate-100 sm:divide-y-0 sm:divide-x sm:divide-slate-100">
            <MetricCell label='Collected' value={money(totals.totalCollected)} />
            <MetricCell label='Outstanding' value={money(totals.outstandingBalance)} />
            <MetricCell label='Average Order' value={money(totals.averageOrderValue)} />
          </div>
        </Card>
      </div>

      <ChartContainer title='Revenue Performance' description='Booked revenue and order volume, last 12 months.'>
        <RevenueChart data={data.revenueTrend} />
      </ChartContainer>

      <Card>
        <h3 className='text-[15px] font-semibold text-slate-900 mb-4'>Revenue Breakdown</h3>
        <div className='space-y-2.5 text-sm max-w-md'>
          <div className='flex justify-between'>
            <span className='text-slate-500'>Gross Booked Revenue</span>
            <span className='font-medium text-slate-800'>{money(totals.grossBookedRevenue)}</span>
          </div>
          <div className='flex justify-between'>
            <span className='text-slate-500'>Refunds</span>
            <span className='font-medium text-red-600'>-{money(totals.totalRefunds)}</span>
          </div>
          <div className='flex justify-between pt-3 mt-1 border-t border-slate-200'>
            <span className='font-semibold text-slate-900'>Net Revenue</span>
            <span className='font-bold text-slate-900'>{money(totals.totalRevenue)}</span>
          </div>
        </div>
      </Card>

      <div>
        <SectionHeader title='Top Products by Revenue' />
        <Card padded={false}>
          <DataTable
            rowKey={(row) => row.name}
            rows={productRows}
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

      <div>
        <SectionHeader title='Revenue by Service Area' />
        <Card padded={false}>
          <DataTable
            rowKey={(row) => row.name}
            rows={areaRows}
            columns={[
              { key: 'rank', header: 'Rank', render: (row) => row.rank },
              { key: 'city', header: 'City', render: (row) => row.name },
              { key: 'orders', header: 'Orders', align: 'right', render: (row) => num(row.orders) },
              { key: 'revenue', header: 'Revenue', align: 'right', render: (row) => money(row.revenue) },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
