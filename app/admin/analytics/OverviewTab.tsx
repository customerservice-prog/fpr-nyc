'use client';

import { useState } from 'react';
import {
  AnalyticsData,
  AnalyticsTabId,
  TrendRow,
  Card,
  SectionHeader,
  PrimaryMetricCard,
  MetricCard,
  MetricCell,
  ChartContainer,
  SegmentedControl,
  AlertRow,
  InsightRow,
  RankedBarRow,
  ProgressBar,
  useFetch,
  money,
  moneyCompact,
  num,
  isBrandedQuery,
} from './AnalyticsUI';

interface RealtimeData {
  activeNow: number;
}

interface GaData {
  connected: boolean;
  reason?: string;
  totals: {
    sessions: number;
    pageViews: number;
    activeUsers: number;
    newUsers: number;
  };
}

interface GscQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscData {
  connected: boolean;
  reason?: string;
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries: GscQuery[];
}

function findInsightPercent(data: AnalyticsData, match: RegExp): { direction: 'up' | 'down' | 'flat'; text: string } | undefined {
  const hit = data.insights.find((i) => match.test(i.text));
  if (!hit) return undefined;
  const pctMatch = hit.text.match(/(\d+(?:\.\d+)?%)/);
  if (!pctMatch) return undefined;
  return { direction: hit.direction, text: `${pctMatch[1]} vs same period last year` };
}

function formatMonthShort(month: string): string {
  const d = new Date(month + '-01T00:00:00');
  if (Number.isNaN(d.getTime())) return month;
  return d.toLocaleDateString('en-US', { month: 'short' });
}

function formatMonthFull(month: string): string {
  const d = new Date(month + '-01T00:00:00');
  if (Number.isNaN(d.getTime())) return month;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function RevenueOrdersChart({ data }: { data: TrendRow[] }) {
  const [metric, setMetric] = useState<'revenue' | 'orders'>('revenue');
  const [hover, setHover] = useState<number | null>(null);

  const width = 760;
  const height = 300;
  const padL = 54;
  const padR = 12;
  const padT = 16;
  const padB = 24;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const values = data.map((d) => (metric === 'revenue' ? d.revenue : d.orders));
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
    <div>
      <div className='flex items-center justify-end mb-3'>
        <SegmentedControl
          options={[
            { id: 'revenue', label: 'Revenue' },
            { id: 'orders', label: 'Orders' },
          ]}
          value={metric}
          onChange={setMetric}
        />
      </div>
      <div className='relative' onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${width} ${height}`} className='w-full h-[300px]'>
          {gridSteps.map((g) => {
            const y = padT + innerH - g * innerH;
            const labelValue = g * maxV;
            return (
              <g key={g}>
                <line x1={padL} y1={y} x2={width - padR} y2={y} stroke='#EEF1F4' strokeWidth={1} />
                <text x={padL - 8} y={y + 4} textAnchor='end' fontSize='11' fill='#94A3B8'>
                  {metric === 'revenue' ? moneyCompact(labelValue) : Math.round(labelValue)}
                </text>
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
            <span key={i} className='text-[10px] text-slate-400'>{data.length > 8 && i % 2 !== 0 ? '' : formatMonthShort(d.month)}</span>
          ))}
        </div>
        {hover !== null && data[hover] ? (
          <div
            className='absolute bg-white text-slate-600 text-xs rounded-lg px-3 py-2.5 pointer-events-none shadow-lg border border-slate-200 z-10 whitespace-nowrap'
            style={{ left: Math.min(Math.max(xFor(hover) - 70, 0), width - 150), top: Math.max(yFor(values[hover]) - 92, 0) }}
          >
            <p className='font-semibold text-slate-900 mb-1'>{formatMonthFull(data[hover].month)}</p>
            <p>Revenue: {money(data[hover].revenue)}</p>
            <p>Orders: {num(data[hover].orders)}</p>
            {data[hover].orders > 0 ? <p>Avg Order: {money(data[hover].revenue / data[hover].orders)}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function OverviewTab({ data, onNavigate }: { data: AnalyticsData; onNavigate: (tab: AnalyticsTabId) => void }) {
  const { totals, upcomingBusiness, needsAttention, insights, rankedByRevenue, topCities } = data;

  const ga = useFetch<GaData>('/api/admin/google-analytics');
  const gscRes = useFetch<GscData>('/api/admin/search-console');
  const rt = useFetch<RealtimeData>('/api/admin/realtime');

  const revenueTrend = findInsightPercent(data, /revenue is/i);
  const aovTrend = findInsightPercent(data, /average (order|booking) value/i);

  const dueSoonItem = needsAttention.find((i) => /due/i.test(i.title) || /due/i.test(i.detail));
  const dueSoonAmount = dueSoonItem ? dueSoonItem.detail.match(/\$[\d,]+(?:\.\d+)?/)?.[0] : null;

  const topRentals = rankedByRevenue.slice(0, 5);
  const maxRentalRevenue = Math.max(1, ...topRentals.map((r) => r.revenue));

  const topAreas = topCities.slice(0, 5);
  const maxAreaRevenue = Math.max(1, ...topAreas.map((c) => c.revenue));

  const nonBrandedQuery = gscRes.data?.topQueries?.find((q) => !isBrandedQuery(q.query));

  return (
    <div className='space-y-8'>
      <Card padded={false} className='px-6 py-4'>
        <div className='flex flex-wrap items-center gap-x-8 gap-y-2 text-sm'>
          <span className='text-xs font-semibold tracking-wide text-slate-500 uppercase'>Today at a Glance</span>
          <span className='text-slate-700'><strong className='text-slate-900'>{num(upcomingBusiness.deliveries)}</strong> deliveries <span className='text-slate-400'>(next 30d)</span></span>
          <span className='text-slate-700'><strong className='text-slate-900'>{num(upcomingBusiness.pickups)}</strong> pickups <span className='text-slate-400'>(next 30d)</span></span>
          {dueSoonAmount ? (
            <span className='text-slate-700'><strong className='text-slate-900'>{dueSoonAmount}</strong> due <span className='text-slate-400'>(next 7d)</span></span>
          ) : null}
          <span className='text-slate-700'>
            <strong className={needsAttention.length ? 'text-amber-600' : 'text-slate-900'}>{needsAttention.length}</strong> {needsAttention.length === 1 ? 'issue' : 'issues'}
          </span>
          {rt.data ? (
            <span className='flex items-center gap-1.5 text-slate-700 ml-auto'>
              <span className='w-1.5 h-1.5 rounded-full bg-green-500' />
              <strong className='text-slate-900'>{rt.data.activeNow}</strong> live now
            </span>
          ) : null}
        </div>
      </Card>

      <section>
        <SectionHeader title='Business Pulse' description='Where the business stands right now.' />
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-4'>
          <div className='lg:col-span-5'>
            <PrimaryMetricCard
              label='Net Revenue'
              value={money(totals.totalRevenue)}
              trend={revenueTrend}
              rows={[
                { label: 'Gross booked', value: money(totals.grossBookedRevenue) },
                { label: 'Refunds', value: `-${money(totals.totalRefunds)}`, tone: 'negative' },
              ]}
            />
          </div>
          <Card padded={false} className='lg:col-span-7 h-full overflow-hidden'>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y divide-slate-100 md:divide-y-0 md:[&>*:nth-child(n+4)]:[border-top:1px_solid_#F1F5F9] md:[&>*:not(:nth-child(3n+1))]:[border-left:1px_solid_#F1F5F9]">
              <MetricCell label='Collected' value={money(totals.totalCollected)} />
              <MetricCell label='Outstanding' value={money(totals.outstandingBalance)} sub={dueSoonAmount ? `${dueSoonAmount} due in next 7 days` : undefined} onClick={() => onNavigate('orders')} />
              <MetricCell label='Orders' value={num(totals.orderCounts.legitimate)} sub={`${totals.orderCounts.quote} quotes, ${totals.orderCounts.canceled} canceled excluded`} />
              <MetricCell label='Average Order' value={money(totals.averageOrderValue)} trend={aovTrend} />
              <MetricCell label='Customers' value={num(totals.totalCustomers)} sub='Unique paying customers' onClick={() => onNavigate('customers')} />
              <MetricCell label='Upcoming' value={num(upcomingBusiness.bookings)} sub={`Next ${upcomingBusiness.windowDays} days`} onClick={() => onNavigate('orders')} />
            </div>
          </Card>
        </div>
      </section>

      <section>
        <SectionHeader title='Performance' description="Revenue trend and what's coming up." />
        <div className='grid grid-cols-1 lg:grid-cols-12 gap-4'>
          <div className='lg:col-span-8'>
            <ChartContainer title='Revenue Performance' description='Booked revenue and order volume over the last 12 months.'>
              <RevenueOrdersChart data={data.revenueTrend} />
            </ChartContainer>
          </div>
          <div className='lg:col-span-4'>
            <Card className='h-full flex flex-col'>
              <p className='text-[11px] font-semibold tracking-wide text-slate-500 uppercase'>Upcoming Business</p>
              <p className='text-xs text-slate-500 mt-1 mb-4'>Next {upcomingBusiness.windowDays} days</p>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-2xl font-bold text-slate-900'>{num(upcomingBusiness.bookings)}</p>
                  <p className='text-xs text-slate-500'>Bookings</p>
                </div>
                <div>
                  <p className='text-2xl font-bold text-slate-900'>{money(upcomingBusiness.bookedRevenue)}</p>
                  <p className='text-xs text-slate-500'>Booked Revenue</p>
                </div>
                <div>
                  <p className='text-2xl font-bold text-slate-900'>{money(upcomingBusiness.collected)}</p>
                  <p className='text-xs text-slate-500'>Collected</p>
                </div>
                <div>
                  <p className='text-2xl font-bold text-slate-900'>{money(upcomingBusiness.outstanding)}</p>
                  <p className='text-xs text-slate-500'>Outstanding</p>
                </div>
              </div>
              <div className='mt-5 pt-4 border-t border-slate-100'>
                <p className='text-xs text-slate-500'>{num(upcomingBusiness.deliveries)} deliveries &middot; {num(upcomingBusiness.pickups)} pickups</p>
                {upcomingBusiness.busiestDate ? (
                  <div className='mt-3'>
                    <p className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>Busiest Date</p>
                    <p className='text-sm font-medium text-slate-900 mt-0.5'>{new Date(upcomingBusiness.busiestDate.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                    <p className='text-xs text-slate-500'>{num(upcomingBusiness.busiestDate.orders)} orders</p>
                  </div>
                ) : null}
              </div>
              <button type='button' onClick={() => onNavigate('orders')} className='mt-4 text-sm font-medium text-green-700 hover:text-green-800 text-left'>View upcoming orders &rarr;</button>
            </Card>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader title='Needs Attention' />
        <Card>
          {needsAttention.length ? (
            needsAttention.map((item) => (
              <AlertRow
                key={item.id}
                severity={item.severity}
                title={item.title}
                detail={item.detail}
                action={{
                  label: /inventory|stock|item/i.test(item.title) ? 'View inventory' : /customer/i.test(item.title) ? 'View customers' : 'View orders',
                  onClick: () => onNavigate(/inventory|stock|item/i.test(item.title) ? 'inventory' : /customer/i.test(item.title) ? 'customers' : 'orders'),
                }}
              />
            ))
          ) : (
            <p className='text-sm text-slate-500 py-2'>No critical issues right now.</p>
          )}
        </Card>
      </section>

      <section>
        <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
          <Card>
            <h3 className='text-[15px] font-semibold text-slate-900 mb-1'>Top Rentals</h3>
            <p className='text-xs text-slate-500 mb-2'>By revenue, last 30 days.</p>
            <div className='divide-y divide-slate-100'>
              {topRentals.map((item, i) => (
                <RankedBarRow key={item.name} rank={i + 1} name={item.name} value={money(item.revenue)} share={(item.revenue / maxRentalRevenue) * 100} />
              ))}
            </div>
            <button type='button' onClick={() => onNavigate('inventory')} className='mt-3 text-sm font-medium text-green-700 hover:text-green-800 text-left'>View Inventory Analytics &rarr;</button>
          </Card>

          <Card>
            <h3 className='text-[15px] font-semibold text-slate-900 mb-1'>Top Service Areas</h3>
            <p className='text-xs text-slate-500 mb-2'>By revenue, last 30 days.</p>
            <div className='divide-y divide-slate-100'>
              {topAreas.map((area, i) => (
                <div key={area.name} className='py-2.5 first:pt-0'>
                  <div className='flex items-baseline justify-between gap-3'>
                    <div className='flex items-baseline gap-2 min-w-0'>
                      <span className='text-xs text-slate-400 w-4 shrink-0'>{i + 1}</span>
                      <span className='text-sm text-slate-800 truncate'>{area.name}</span>
                    </div>
                    <span className='text-sm font-semibold text-slate-900 shrink-0'>{money(area.revenue)}</span>
                  </div>
                  <div className='flex items-center justify-between mt-1 ml-6 gap-3'>
                    <div className='flex-1'><ProgressBar value={area.revenue} max={maxAreaRevenue} tone='green' /></div>
                    <span className='text-xs text-slate-400 shrink-0 whitespace-nowrap'>{num(area.orders)} orders</span>
                  </div>
                </div>
              ))}
            </div>
            <button type='button' onClick={() => onNavigate('orders')} className='mt-3 text-sm font-medium text-green-700 hover:text-green-800 text-left'>View Orders &rarr;</button>
          </Card>

          <Card>
            <h3 className='text-[15px] font-semibold text-slate-900 mb-2'>Business Insights</h3>
            <div className='divide-y divide-slate-100'>
              {insights.length ? insights.map((insight) => (
                <InsightRow key={insight.id} direction={insight.direction} text={insight.text} />
              )) : (
                <p className='text-sm text-slate-500 py-2'>Not enough data yet for insights.</p>
              )}
            </div>
          </Card>
        </div>
      </section>

      <section>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
          <Card>
            <div className='flex items-center justify-between mb-1'>
              <h3 className='text-[15px] font-semibold text-slate-900'>Website Performance</h3>
              {rt.data ? (
                <span className='flex items-center gap-1.5 text-xs text-slate-500'>
                  <span className='w-1.5 h-1.5 rounded-full bg-green-500' />
                  {rt.data.activeNow} live now
                </span>
              ) : null}
            </div>
            <p className='text-xs text-slate-500 mb-4'>Last 30 days</p>
            {ga.loading ? (
              <p className='text-sm text-slate-400 py-6 text-center'>Loading...</p>
            ) : !ga.data || !ga.data.connected ? (
              <p className='text-sm text-slate-400 py-6 text-center'>Website analytics is not connected.</p>
            ) : (
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <div>
                  <p className='text-lg font-semibold text-slate-600'>{num(ga.data.totals.sessions)}</p>
                  <p className='text-xs text-slate-500'>Sessions</p>
                </div>
                <div>
                  <p className='text-lg font-semibold text-slate-600'>{num(ga.data.totals.activeUsers)}</p>
                  <p className='text-xs text-slate-500'>Users</p>
                </div>
                <div>
                  <p className='text-lg font-semibold text-slate-600'>{num(ga.data.totals.pageViews)}</p>
                  <p className='text-xs text-slate-500'>Page Views</p>
                </div>
                <div>
                  <p className='text-lg font-semibold text-slate-600'>{num(ga.data.totals.newUsers)}</p>
                  <p className='text-xs text-slate-500'>New Users</p>
                </div>
              </div>
            )}
            <button type='button' onClick={() => onNavigate('website')} className='mt-4 text-sm font-medium text-green-700 hover:text-green-800 text-left'>View Website Analytics &rarr;</button>
          </Card>

          <Card>
            <h3 className='text-[15px] font-semibold text-slate-900 mb-1'>Search Visibility</h3>
            <p className='text-xs text-slate-500 mb-4'>Last 30 days</p>
            {gscRes.loading ? (
              <p className='text-sm text-slate-400 py-6 text-center'>Loading...</p>
            ) : !gscRes.data || !gscRes.data.connected ? (
              <p className='text-sm text-slate-400 py-6 text-center'>Search Console is not connected.</p>
            ) : (
              <>
                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  <div>
                    <p className='text-lg font-semibold text-slate-600'>{num(gscRes.data.totals.clicks)}</p>
                    <p className='text-xs text-slate-500'>Clicks</p>
                  </div>
                  <div>
                    <p className='text-lg font-semibold text-slate-600'>{num(gscRes.data.totals.impressions)}</p>
                    <p className='text-xs text-slate-500'>Impressions</p>
                  </div>
                  <div>
                <p className='text-lg font-semibold text-slate-600'>{(gscRes.data.totals.ctr * 100).toFixed(1)}%</p>
                    <p className='text-xs text-slate-500'>CTR</p>
                  </div>
                  <div>
                    <p className='text-lg font-semibold text-slate-600'>{gscRes.data.totals.position.toFixed(1)}</p>
                    <p className='text-xs text-slate-500'>Avg Position</p>
                  </div>
                </div>
                {nonBrandedQuery ? (
                  <div className='mt-4 pt-3 border-t border-slate-100'>
                    <p className='text-xs font-semibold text-slate-500 uppercase tracking-wide'>Top non-branded query</p>
                    <p className='text-sm font-medium text-slate-900 mt-0.5'>{nonBrandedQuery.query}</p>
                    <p className='text-xs text-slate-500'>Avg position {nonBrandedQuery.position.toFixed(1)}</p>
                  </div>
                ) : null}
              </>
            )}
            <button type='button' onClick={() => onNavigate('seo')} className='mt-4 text-sm font-medium text-green-700 hover:text-green-800 text-left'>View SEO Analytics &rarr;</button>
          </Card>
        </div>
      </section>
    </div>
  );
}
