'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

/* ============================== Types ============================== */

export interface RankedItem {
  name: string;
  units: number;
  revenue: number;
  orders: number;
}

export interface GeoRow {
  name: string;
  orders: number;
  revenue: number;
}

export interface TrendRow {
  month: string;
  revenue: number;
  orders: number;
}

export interface CustomerRow {
  name: string;
  orders: number;
  revenue: number;
  collected: number;
  lastBooking: string;
}

export interface UpcomingBusiness {
  windowDays: number;
  bookings: number;
  bookedRevenue: number;
  collected: number;
  outstanding: number;
  deliveries: number;
  pickups: number;
  busiestDate: { date: string; orders: number } | null;
}

export interface AttentionItem {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  detail: string;
}

export interface BusinessInsight {
  id: string;
  direction: 'up' | 'down' | 'flat';
  text: string;
}

export interface AnalyticsData {
  generatedAt: string;
  totals: {
    totalRevenue: number;
    grossBookedRevenue: number;
    totalCollected: number;
    outstandingBalance: number;
    totalRefunds: number;
    totalOrders: number;
    orderCounts: {
      all: number;
      legitimate: number;
      completed: number;
      active: number;
      canceled: number;
      quote: number;
    };
    totalCustomers: number;
    totalItems: number;
    totalCatalogRecords: number;
    averageOrderValue: number;
  };
  rankedByUnits: RankedItem[];
  rankedByRevenue: RankedItem[];
  revenueTrend: TrendRow[];
  topCities: GeoRow[];
  topStates: GeoRow[];
  deliveryMix: Array<{ type: string; count: number }>;
  topCustomers: CustomerRow[];
  upcomingBusiness: UpcomingBusiness;
  needsAttention: AttentionItem[];
  insights: BusinessInsight[];
  bookingLeadTime: {
    averageDays: number;
    medianDays: number;
    buckets: Array<{ label: string; count: number }>;
  };
  customerSegments: {
    newCustomers: number;
    returningCustomers: number;
    repeatRate: number;
  };
  inventoryUtilization: Array<{
    itemId: string;
    name: string;
    owned: number;
    peakReserved: number;
    peakDate: string | null;
    available: number;
    utilizationPct: number;
    highDemand: boolean;
  }>;
  google: {
    measurementId: string;
    analyticsConnected: boolean;
    searchConsoleConnected: boolean;
    analyticsUrl: string;
    searchConsoleUrl: string;
  };
}

export type AnalyticsTabId =
  | 'overview'
  | 'revenue'
  | 'orders'
  | 'inventory'
  | 'customers'
  | 'website'
  | 'seo';

/* ============================== Formatters ============================== */

export function money(n: number | undefined | null): string {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return v < 0 ? `-$${Math.abs(Math.round(v)).toLocaleString('en-US')}` : `$${Math.round(v).toLocaleString('en-US')}`;
}

export function moneyPrecise(n: number | undefined | null): string {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function num(n: number | undefined | null): string {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.round(v).toLocaleString('en-US');
}

export function pct(n: number | undefined | null, digits = 0): string {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return `${v.toFixed(digits)}%`;
}

export function compact(n: number | undefined | null): string {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v < 0 ? '-' : ''}${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}K`;
  return Math.round(v).toLocaleString('en-US');
}

export function moneyCompact(n: number | undefined | null): string {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  const abs = Math.abs(v);
  if (abs >= 1000) return `${v < 0 ? '-' : ''}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}K`;
  return money(v);
}

export function formatDate(input: string | undefined | null): string {
  if (!input) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

export function isBrandedQuery(query: string): boolean {
  const q = query.toLowerCase();
  return q.includes('friendly party') || q.includes('friendlypartyrental');
}

/* ============================== Data fetch hook ============================== */

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useFetch<T>(url: string | null): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ data: null, loading: !!url, error: null });

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Request failed');
        return r.json();
      })
      .then((json) => {
        if (!cancelled) setState({ data: json, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: err && err.message ? err.message : 'Failed to load' });
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}

/* ============================== Icons ============================== */

function CalendarIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <rect x='3' y='4' width='18' height='18' rx='2' />
      <path d='M16 2v4M8 2v4M3 10h18' />
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' className={spinning ? 'animate-spin' : ''}>
      <path d='M21 12a9 9 0 1 1-3-6.7' />
      <path d='M21 3v6h-6' />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
      <path d='M12 3v12' />
      <path d='M7 8l5-5 5 5' />
      <path d='M4 21h16' />
    </svg>
  );
}
/* ============================== Layout primitives ============================== */

export function Card({ children, className = '', padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${padded ? 'p-6' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className='flex flex-wrap items-end justify-between gap-3 mb-4'>
      <div>
        <h2 className='text-[20px] font-bold text-slate-900'>{title}</h2>
        {description ? <p className='text-sm text-slate-500 mt-1'>{description}</p> : null}
      </div>
      {action ? <div className='shrink-0'>{action}</div> : null}
    </div>
  );
}

export function TrendTag({ direction, text, className = '' }: { direction: 'up' | 'down' | 'flat'; text: string; className?: string }) {
  const color = direction === 'up' ? 'text-green-700' : direction === 'down' ? 'text-red-600' : 'text-slate-500';
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→';
  return <p className={`text-sm font-medium ${color} ${className}`}>{arrow} {text}</p>;
}

/* ============================== Page header ============================== */

export function AnalyticsPageHeader({ generatedAt, onRefresh, refreshing, onExport }: { generatedAt?: string; onRefresh: () => void; refreshing?: boolean; onExport?: () => void }) {
  const updated = generatedAt ? new Date(generatedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : null;

  return (
    <div className='pt-6 pb-5'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-[32px] leading-tight font-bold text-slate-900'>Analytics</h1>
          <p className='text-sm text-slate-500 mt-1.5'>Business performance, bookings and operational insights.</p>
        </div>
        <div className='flex items-center gap-2 flex-wrap'>
          <span title='Business figures currently reflect the last 30 days' className='flex items-center gap-2 h-10 px-3.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700'>
            <CalendarIcon />
            Last 30 Days
          </span>
          <span title='Comparisons are calculated against the same period last year' className='hidden sm:flex items-center gap-2 h-10 px-3.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700'>
            Compare: Last Year
          </span>
          <button type='button' onClick={onRefresh} className='flex items-center gap-2 h-10 px-3.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors'>
            <RefreshIcon spinning={!!refreshing} />
            Refresh
          </button>
          {onExport ? (
            <button type='button' onClick={onExport} className='flex items-center gap-2 h-10 px-3.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors'>
              <ExportIcon />
              Export
            </button>
          ) : null}
        </div>
      </div>
      {updated ? <p className='text-xs text-slate-400 mt-3'>Business data updated {updated}</p> : null}
    </div>
  );
}

const TAB_LABELS: Record<AnalyticsTabId, string> = {
  overview: 'Overview',
  revenue: 'Revenue',
  orders: 'Orders',
  inventory: 'Inventory',
  customers: 'Customers',
  website: 'Website',
  seo: 'SEO',
};

export function AnalyticsTabs({ active, onChange }: { active: AnalyticsTabId; onChange: (tab: AnalyticsTabId) => void }) {
  const tabs = Object.keys(TAB_LABELS) as AnalyticsTabId[];
  return (
    <div className='border-b border-slate-200 overflow-x-auto'>
      <div className='flex gap-6 min-w-max'>
        {tabs.map((id) => {
          const isActive = id === active;
          return (
            <button key={id} type='button' onClick={() => onChange(id)} className={`relative h-11 text-sm font-medium whitespace-nowrap transition-colors ${isActive ? 'text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
              {TAB_LABELS[id]}
              {isActive ? <span className='absolute left-0 right-0 -bottom-px h-0.5 bg-green-600 rounded-full' /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== Metric cards ============================== */

export function MetricCard({ label, value, sub, trend, href, onClick }: { label: string; value: ReactNode; sub?: ReactNode; trend?: { direction: 'up' | 'down' | 'flat'; text: string }; href?: string; onClick?: () => void }) {
  const content = (
    <Card className='h-full'>
      <p className='text-[11px] font-semibold tracking-wide text-slate-500 uppercase'>{label}</p>
      <p className='text-[28px] leading-tight font-bold text-slate-900 mt-2'>{value}</p>
      {sub ? <p className='text-xs text-slate-500 mt-1.5'>{sub}</p> : null}
      {trend ? <TrendTag direction={trend.direction} text={trend.text} className='mt-2' /> : null}
    </Card>
  );

  if (href) {
    return <Link href={href} className='block h-full'>{content}</Link>;
  }
  if (onClick) {
    return <button type='button' onClick={onClick} className='block w-full h-full text-left'>{content}</button>;
  }
  return content;
}

export function MetricCell({ label, value, sub, trend, onClick }: { label: string; value: ReactNode; sub?: ReactNode; trend?: { direction: 'up' | 'down' | 'flat'; text: string }; onClick?: () => void }) {
  const content = (
    <div className='p-5'>
      <p className='text-[11px] font-semibold tracking-wide text-slate-500 uppercase'>{label}</p>
      <p className='text-[26px] leading-tight font-bold text-slate-900 mt-2'>{value}</p>
      {sub ? <p className='text-xs text-slate-500 mt-1.5'>{sub}</p> : null}
      {trend ? <TrendTag direction={trend.direction} text={trend.text} className='mt-2' /> : null}
    </div>
  );
  if (onClick) {
    return <button type='button' onClick={onClick} className='block w-full h-full text-left hover:bg-slate-50 transition-colors'>{content}</button>;
  }
  return content;
}

export function PrimaryMetricCard({ label, value, trend, rows }: { label: string; value: ReactNode; trend?: { direction: 'up' | 'down' | 'flat'; text: string }; rows?: Array<{ label: string; value: ReactNode; tone?: 'default' | 'negative' }> }) {
  return (
    <Card className='h-full flex flex-col justify-between'>
      <div>
        <div className='flex items-start justify-between'>
          <p className='text-[11px] font-semibold tracking-wide text-slate-500 uppercase'>{label}</p>
          
        </div>
        <p className='text-[44px] leading-tight font-extrabold text-slate-900 mt-2'>{value}</p>
        {trend ? <TrendTag direction={trend.direction} text={trend.text} className='mt-2' /> : null}
      </div>
      {rows && rows.length ? (
        <div className='mt-5 pt-4 border-t border-slate-100 space-y-1.5'>
          {rows.map((r) => (
            <div key={r.label} className='flex items-center justify-between text-sm'>
              <span className='text-slate-500'>{r.label}</span>
              <span className={`font-medium ${r.tone === 'negative' ? 'text-red-600' : 'text-slate-800'}`}>{r.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export function ChartContainer({ title, description, action, children, height }: { title: string; description?: string; action?: ReactNode; children: ReactNode; height?: number }) {
  return (
    <Card>
      <div className='flex flex-wrap items-start justify-between gap-3 mb-4'>
        <div>
          <h3 className='text-[15px] font-semibold text-slate-900'>{title}</h3>
          {description ? <p className='text-xs text-slate-500 mt-0.5'>{description}</p> : null}
        </div>
        {action ? <div className='shrink-0'>{action}</div> : null}
      </div>
      <div style={height ? { height } : undefined}>{children}</div>
    </Card>
  );
}

export function SegmentedControl<T extends string>({ options, value, onChange }: { options: Array<{ id: T; label: string }>; value: T; onChange: (v: T) => void }) {
  return (
    <div className='inline-flex items-center bg-slate-100 rounded-lg p-0.5'>
      {options.map((opt) => (
        <button key={opt.id} type='button' onClick={() => onChange(opt.id)} className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${value === opt.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ============================== States ============================== */

export function EmptyState({ message }: { message: string }) {
  return <div className='py-10 text-center text-sm text-slate-400'>{message}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className='text-center'>
      <p className='text-sm text-red-600 font-medium'>{message}</p>
    </Card>
  );
}

/* ============================== Rows ============================== */

export function AlertRow({ severity, title, detail, action }: { severity: 'info' | 'warning' | 'critical'; title: string; detail: string; action?: { label: string; href?: string; onClick?: () => void } }) {
  const styles = severity === 'critical' ? { icon: '⚠', bg: 'bg-red-100', text: 'text-red-700' } : severity === 'warning' ? { icon: '⚠', bg: 'bg-amber-100', text: 'text-amber-700' } : { icon: 'ℹ', bg: 'bg-slate-100', text: 'text-slate-600' };
  return (
    <div className='flex items-start gap-3 py-3 first:pt-0 last:pb-0 border-b last:border-b-0 border-slate-100'>
      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${styles.bg} ${styles.text}`}>{styles.icon}</span>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium text-slate-900'>{title}</p>
        <p className='text-sm text-slate-500 mt-0.5'>{detail}</p>
      </div>
      {action ? (
        action.href ? (
          <Link href={action.href} className='text-sm font-medium text-green-700 hover:text-green-800 shrink-0 whitespace-nowrap'>{action.label} →</Link>
        ) : (
          <button type='button' onClick={action.onClick} className='text-sm font-medium text-green-700 hover:text-green-800 shrink-0 whitespace-nowrap'>{action.label} →</button>
        )
      ) : null}
    </div>
  );
}

export function InsightRow({ direction, text }: { direction: 'up' | 'down' | 'flat'; text: string }) {
  const icon = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '★';
  const color = direction === 'up' ? 'text-green-600' : direction === 'down' ? 'text-red-500' : 'text-amber-500';
  return (
    <div className='flex items-start gap-3 py-2.5 first:pt-0 last:pb-0'>
      <span className={`text-base leading-none mt-0.5 shrink-0 ${color}`}>{icon}</span>
      <p className='text-sm text-slate-700'>{text}</p>
    </div>
  );
}

/* ============================== Bars & charts ============================== */

export function ProgressBar({ value, max, tone = 'green' }: { value: number; max: number; tone?: 'green' | 'amber' | 'red' | 'slate' }) {
  const pctValue = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  const color = tone === 'amber' ? 'bg-amber-500' : tone === 'red' ? 'bg-red-500' : tone === 'slate' ? 'bg-slate-400' : 'bg-green-600';
  return (
    <div className='h-1.5 w-full bg-slate-100 rounded-full overflow-hidden'>
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pctValue}%` }} />
    </div>
  );
}

export function RankedBarRow({ rank, name, value, share }: { rank: number; name: string; value: string; share: number }) {
  return (
    <div className='py-2.5 first:pt-0'>
      <div className='flex items-baseline justify-between gap-3'>
        <div className='flex items-baseline gap-2 min-w-0'>
          <span className='text-xs text-slate-400 w-4 shrink-0'>{rank}</span>
          <span className='text-sm text-slate-800 truncate'>{name}</span>
        </div>
        <span className='text-sm font-semibold text-slate-900 shrink-0'>{value}</span>
      </div>
      <div className='mt-1.5 ml-6'>
        <ProgressBar value={share} max={100} tone='green' />
      </div>
    </div>
  );
}

export function UtilizationRow({ name, detail, value, max, tone = 'green' }: { name: string; detail: string; value: number; max: number; tone?: 'green' | 'amber' | 'red' }) {
  const pctValue = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className='py-3 first:pt-0 border-b last:border-b-0 border-slate-100'>
      <div className='flex items-center justify-between text-sm'>
        <span className='font-medium text-slate-800'>{name}</span>
        <span className='text-slate-500'>{detail}</span>
      </div>
      <div className='mt-2'><ProgressBar value={value} max={max} tone={tone} /></div>
      <p className='text-xs text-slate-400 mt-1'>{pctValue}% booked on peak day</p>
    </div>
  );
}

export function Donut({ segments, size = 120, thickness = 16 }: { segments: Array<{ label: string; value: number; color: string }>; size?: number; thickness?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((s) => {
          const fraction = s.value / total;
          const dash = fraction * circumference;
          const el = (
            <circle key={s.label} cx={size / 2} cy={size / 2} r={radius} fill='none' stroke={s.color} strokeWidth={thickness} strokeDasharray={`${dash} ${circumference - dash}`} strokeDashoffset={-offset} />
          );
          offset += dash;
          return el;
        })}
      </g>
    </svg>
  );
}

/* ============================== Table & badge ============================== */

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey }: { columns: Array<DataTableColumn<T>>; rows: T[]; rowKey: (row: T) => string }) {
  return (
    <div className='overflow-x-auto -mx-6'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='border-b border-slate-200'>
            {columns.map((col) => (
              <th key={col.key} className={`px-6 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap ${col.align === 'right' ? 'text-right' : 'text-left'}`}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className='border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60'>
              {columns.map((col) => (
                <td key={col.key} className={`px-6 py-3 text-slate-700 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>{col.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Badge({ tone, children }: { tone: 'green' | 'amber' | 'red' | 'slate'; children: ReactNode }) {
  const styles = tone === 'amber' ? 'bg-amber-50 text-amber-700' : tone === 'red' ? 'bg-red-50 text-red-700' : tone === 'slate' ? 'bg-slate-100 text-slate-600' : 'bg-green-50 text-green-700';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles}`}>{children}</span>;
}
