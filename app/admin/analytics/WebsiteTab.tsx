'use client';

import {
  Card,
  SectionHeader,
  MetricCard,
  ChartContainer,
  useFetch,
  num,
  pct,
} from './AnalyticsUI';

interface GaData {
  connected: boolean;
  reason?: string;
  rangeDays: number;
  totals: {
    sessions: number;
    pageViews: number;
    activeUsers: number;
    newUsers: number;
    engagementRate: number;
    averageSessionDuration: number;
  };
  byCountry: Array<{ name: string; sessions: number }>;
  byCity: Array<{ name: string; sessions: number }>;
  bySource: Array<{ name: string; sessions: number }>;
  trend: Array<{ date: string; sessions: number; users: number }>;
}

interface RealtimeData {
  activeNow: number;
  pageviewsLast30Min: number;
  topPages: Array<{ path: string; users: number }>;
  byCity: Array<{ city: string; users: number }>;
  byDevice: Array<{ device: string; users: number }>;
  todayVisitors: number;
  todayPageviews: number;
}

function TrafficTrendChart({ data }: { data: GaData['trend'] }) {
  const width = 900;
  const height = 220;
  const padL = 40;
  const padR = 12;
  const padT = 12;
  const padB = 20;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const values = data.map((d) => d.sessions);
  const maxV = Math.max(1, ...values);
  const xFor = (i: number) => padL + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
  const yFor = (v: number) => padT + innerH - (v / maxV) * innerH;
  const points = values.map((v, i) => [xFor(i), yFor(v)]);
  const linePath = points.map((p, i) => (i === 0 ? 'M' : 'L') + ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className='w-full h-[220px]'>
      <line x1={padL} y1={padT + innerH} x2={width - padR} y2={padT + innerH} stroke='#EEF1F4' strokeWidth={1} />
      {linePath ? <path d={linePath} fill='none' stroke='#16A34A' strokeWidth={2.5} /> : null}
    </svg>
  );
}

export default function WebsiteTab(_props: { data?: unknown }) {
  const ga = useFetch<GaData>('/api/admin/google-analytics');
  const rt = useFetch<RealtimeData>('/api/admin/realtime');

  return (
    <div className='space-y-8'>
      <div>
        <h1 className='text-[22px] font-bold text-slate-900'>Website</h1>
        <p className='text-sm text-slate-500 mt-1'>Traffic and customer acquisition.</p>
      </div>

      <Card padded={false} className='px-5 py-3 bg-amber-50 border-amber-200'>
        <p className='text-xs text-amber-800'>Tracking configuration requires review. Some internal or additional-property traffic may be included in these figures.</p>
      </Card>

      {ga.loading ? (
        <p className='text-sm text-slate-400'>Loading website analytics...</p>
      ) : !ga.data || !ga.data.connected ? (
        <Card><p className='text-sm text-slate-500'>Website analytics is not connected.</p></Card>
      ) : (
        <>
          <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
            <MetricCard label='Sessions' value={num(ga.data.totals.sessions)} />
            <MetricCard label='Users' value={num(ga.data.totals.activeUsers)} />
            <MetricCard label='Page Views' value={num(ga.data.totals.pageViews)} />
            <MetricCard label='New Users' value={num(ga.data.totals.newUsers)} />
            <MetricCard label='Engagement' value={pct(ga.data.totals.engagementRate * 100, 1)} />
            <MetricCard label='Avg Session' value={`${Math.round(ga.data.totals.averageSessionDuration)}s`} />
          </div>

          <ChartContainer title='Traffic Trend' description={`Sessions over the last ${ga.data.rangeDays} days.`}>
            <TrafficTrendChart data={ga.data.trend} />
          </ChartContainer>

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            <Card>
              <h3 className='text-[15px] font-semibold text-slate-900 mb-3'>Traffic Sources</h3>
              <div className='divide-y divide-slate-100'>
                {ga.data.bySource.slice(0, 8).map((s) => (
                  <div key={s.name} className='flex items-center justify-between py-2 text-sm'>
                    <span className='text-slate-700'>{s.name}</span>
                    <span className='font-medium text-slate-900'>{num(s.sessions)}</span>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h3 className='text-[15px] font-semibold text-slate-900 mb-3'>Geography</h3>
              <div className='divide-y divide-slate-100'>
                {ga.data.byCity.slice(0, 8).map((c) => (
                  <div key={c.name} className='flex items-center justify-between py-2 text-sm'>
                    <span className='text-slate-700'>{c.name}</span>
                    <span className='font-medium text-slate-900'>{num(c.sessions)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}

      <div>
        <SectionHeader title='Live Right Now' />
        <Card>
          {rt.data ? (
            <div className='flex flex-wrap items-start gap-8'>
              <div>
                <p className='text-3xl font-bold text-slate-900'>{rt.data.activeNow}</p>
                <p className='text-xs text-slate-500'>Visitors</p>
              </div>
              <div className='flex-1 min-w-[200px]'>
                <p className='text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2'>Top Active Pages</p>
                {!rt.data.topPages.length && <p className='text-sm text-slate-400'>No active pages right now.</p>}
                <div className='space-y-1'>
                  {rt.data.topPages.slice(0, 5).map((p) => (
                    <div key={p.path} className='flex items-center justify-between text-sm'>
                      <span className='text-slate-700 truncate'>{p.path}</span>
                      <span className='text-slate-500'>{p.users}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className='min-w-[160px]'>
                <p className='text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2'>Devices</p>
                {!rt.data.byDevice.length && <p className='text-sm text-slate-400'>No device data right now.</p>}
                <div className='space-y-1'>
                  {rt.data.byDevice.map((d) => (
                    <div key={d.device} className='flex items-center justify-between text-sm'>
                      <span className='text-slate-700 capitalize'>{d.device}</span>
                      <span className='text-slate-500'>{d.users}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className='text-sm text-slate-400'>Loading live visitors...</p>
          )}
        </Card>
      </div>
    </div>
  );
}
