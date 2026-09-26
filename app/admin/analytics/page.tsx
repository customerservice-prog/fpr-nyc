'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AnalyticsData,
  AnalyticsTabId,
  AnalyticsPageHeader,
  AnalyticsTabs,
  ErrorState,
  money,
  num,
} from './AnalyticsUI';
import OverviewTab from './OverviewTab';
import RevenueTab from './RevenueTab';
import OrdersTab from './OrdersTab';
import InventoryTab from './InventoryTab';
import CustomersTab from './CustomersTab';
import WebsiteTab from './WebsiteTab';
import SeoTab from './SeoTab';

function AnalyticsSkeleton() {
  return (
    <div className='space-y-6 animate-pulse'>
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-4'>
        <div className='lg:col-span-5 h-48 rounded-2xl bg-slate-100' />
        <div className='lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-4'>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className='h-[88px] rounded-2xl bg-slate-100' />
          ))}
        </div>
      </div>
      <div className='grid grid-cols-1 lg:grid-cols-12 gap-4'>
        <div className='lg:col-span-8 h-[360px] rounded-2xl bg-slate-100' />
        <div className='lg:col-span-4 h-[360px] rounded-2xl bg-slate-100' />
      </div>
      <div className='h-40 rounded-2xl bg-slate-100' />
    </div>
  );
}

function exportOverviewCsv(data: AnalyticsData) {
  const t = data.totals;
  const rows = [
    ['Metric', 'Value'],
    ['Net Revenue', money(t.totalRevenue)],
    ['Gross Booked Revenue', money(t.grossBookedRevenue)],
    ['Collected', money(t.totalCollected)],
    ['Outstanding', money(t.outstandingBalance)],
    ['Refunds', money(t.totalRefunds)],
    ['Orders', num(t.orderCounts.legitimate)],
    ['Average Order Value', money(t.averageOrderValue)],
    ['Customers', num(t.totalCustomers)],
  ];
  const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'analytics-overview.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const [tab, setTab] = useState<AnalyticsTabId>('overview');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((isRefresh?: boolean) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    fetch('/api/admin/analytics')
      .then((r) => {
        if (!r.ok) throw new Error('Failed to load analytics');
        return r.json();
      })
      .then((json) => {
        setData(json);
        setError(null);
      })
      .catch((err) => {
        setError(err && err.message ? err.message : 'Failed to load analytics');
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className='min-h-screen bg-[#F6F7F8]'>
      <div className='max-w-[1500px] mx-auto px-7 md:px-9 pb-16'>
        <AnalyticsPageHeader
          generatedAt={data?.generatedAt}
          onRefresh={() => load(true)}
          refreshing={refreshing}
          onExport={data ? () => exportOverviewCsv(data) : undefined}
        />
        <AnalyticsTabs active={tab} onChange={setTab} />

        <div className='pt-7'>
          {loading ? (
            <AnalyticsSkeleton />
          ) : error || !data ? (
            <ErrorState message={error || 'No analytics data available.'} />
          ) : tab === 'overview' ? (
            <OverviewTab data={data} onNavigate={setTab} />
          ) : tab === 'revenue' ? (
            <RevenueTab data={data} />
          ) : tab === 'orders' ? (
            <OrdersTab data={data} />
          ) : tab === 'inventory' ? (
            <InventoryTab data={data} />
          ) : tab === 'customers' ? (
            <CustomersTab data={data} />
          ) : tab === 'website' ? (
            <WebsiteTab data={data} />
          ) : (
            <SeoTab data={data} />
          )}
        </div>
      </div>
    </div>
  );
}
