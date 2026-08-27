'use client';

import {
  Card,
  SectionHeader,
  MetricCard,
  ChartContainer,
  DataTable,
  useFetch,
  isBrandedQuery,
  num,
  pct,
} from './AnalyticsUI';

interface GscQuery {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscTrendPoint {
  date: string;
  clicks: number;
  impressions: number;
}

interface GscData {
  connected: boolean;
  reason?: string;
  rangeDays: number;
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries: GscQuery[];
  trend: GscTrendPoint[];
}

function SeoTrendChart({ data }: { data: GscTrendPoint[] }) {
  const width = 900;
  const height = 220;
  const padL = 40;
  const padR = 12;
  const padT = 12;
  const padB = 20;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const clicksMax = Math.max(1, ...data.map((d) => d.clicks));
  const imprMax = Math.max(1, ...data.map((d) => d.impressions));
  const xFor = (i: number) => padL + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const yForClicks = (v: number) => padT + innerH - (v / clicksMax) * innerH;
  const yForImpr = (v: number) => padT + innerH - (v / imprMax) * innerH;
  const clicksPath = data.map((d, i) => (i === 0 ? 'M' : 'L') + ' ' + xFor(i).toFixed(1) + ' ' + yForClicks(d.clicks).toFixed(1)).join(' ');
  const imprPath = data.map((d, i) => (i === 0 ? 'M' : 'L') + ' ' + xFor(i).toFixed(1) + ' ' + yForImpr(d.impressions).toFixed(1)).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className='w-full h-[220px]'>
      <line x1={padL} y1={padT + innerH} x2={width - padR} y2={padT + innerH} stroke='#EEF1F4' strokeWidth={1} />
      {imprPath ? <path d={imprPath} fill='none' stroke='#CBD5E1' strokeWidth={1.5} strokeDasharray='4 3' /> : null}
      {clicksPath ? <path d={clicksPath} fill='none' stroke='#16A34A' strokeWidth={2.5} /> : null}
    </svg>
  );
}

export default function SeoTab(_props: { data?: unknown }) {
  const gsc = useFetch<GscData>('/api/admin/search-console');

  const branded = gsc.data ? gsc.data.topQueries.filter((q) => isBrandedQuery(q.query)) : [];
  const nonBranded = gsc.data ? gsc.data.topQueries.filter((q) => !isBrandedQuery(q.query)) : [];
  const brandedClicks = branded.reduce((s, q) => s + q.clicks, 0);
  const nonBrandedClicks = nonBranded.reduce((s, q) => s + q.clicks, 0);
  const totalQueryClicks = brandedClicks + nonBrandedClicks || 1;

  const commercialRows = nonBranded.slice(0, 15);

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-[22px] font-bold text-slate-900'>SEO</h1>
        <p className='text-sm text-slate-500 mt-1'>Google search visibility and organic performance.</p>
      </div>

      {gsc.loading ? (
        <p className='text-sm text-slate-400'>Loading search data...</p>
      ) : !gsc.data || !gsc.data.connected ? (
        <Card><p className='text-sm text-slate-500'>Search Console is not connected.</p></Card>
      ) : (
        <>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
            <MetricCard label='Clicks' value={num(gsc.data.totals.clicks)} />
            <MetricCard label='Impressions' value={num(gsc.data.totals.impressions)} />
            <MetricCard label='CTR' value={pct(gsc.data.totals.ctr * 100, 1)} />
            <MetricCard label='Avg Position' value={gsc.data.totals.position.toFixed(1)} />
          </div>

          <ChartContainer title='Organic Performance Trend' description={`Clicks and impressions over the last ${gsc.data.rangeDays} days.`}>
            <SeoTrendChart data={gsc.data.trend} />
          </ChartContainer>

          <div>
            <SectionHeader title='Branded vs Non-Branded' description='Share of clicks from top queries in this period.' />
            <Card>
              <div className='space-y-3'>
                <div>
                  <div className='flex items-center justify-between text-sm mb-1'>
                    <span className='text-slate-700'>Non-branded</span>
                    <span className='font-semibold text-slate-900'>{num(nonBrandedClicks)} clicks</span>
                  </div>
                  <div className='h-1.5 w-full bg-slate-100 rounded-full overflow-hidden'>
                    <div className='h-full rounded-full bg-green-600' style={{ width: `${Math.round((nonBrandedClicks / totalQueryClicks) * 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className='flex items-center justify-between text-sm mb-1'>
                    <span className='text-slate-700'>Branded</span>
                    <span className='font-semibold text-slate-900'>{num(brandedClicks)} clicks</span>
                  </div>
                  <div className='h-1.5 w-full bg-slate-100 rounded-full overflow-hidden'>
                    <div className='h-full rounded-full bg-slate-400' style={{ width: `${Math.round((brandedClicks / totalQueryClicks) * 100)}%` }} />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <SectionHeader title='Top Commercial Keywords' description='Non-branded queries ranked by clicks.' />
            <Card padded={false}>
              <DataTable
                rowKey={(row) => row.query}
                rows={commercialRows}
                columns={[
                  { key: 'query', header: 'Keyword', render: (row) => row.query },
                  { key: 'clicks', header: 'Clicks', align: 'right', render: (row) => num(row.clicks) },
                  { key: 'impr', header: 'Impressions', align: 'right', render: (row) => num(row.impressions) },
                  { key: 'ctr', header: 'CTR', align: 'right', render: (row) => pct(row.ctr * 100, 1) },
                  { key: 'pos', header: 'Avg Position', align: 'right', render: (row) => row.position.toFixed(1) },
                ]}
              />
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
