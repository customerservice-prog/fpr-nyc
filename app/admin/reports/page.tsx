"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ALL_REPORTS,
  CATEGORY_ORDER,
  IMPLEMENTED_SLUGS,
  QUICK_REPORT_SLUGS,
  searchReports,
  type ReportItem,
} from "@/lib/reportsConfig";

interface Summary {
  totalRevenue: number;
  revenueThisMonth: number;
  outstandingBalance: number;
  outstandingOrderCount: number;
  totalOrders: number;
  ordersThisMonth: number;
  totalCustomers: number;
  newCustomersThisMonth: number;
  averageOrderValue: number;
  upcoming7: number;
  upcoming30: number;
  pendingPaymentsCount: number;
  pendingPaymentsAmount: number;
  ordersByStatus: Array<{ status: string; count: number }>;
  ordersByDeliveryType: Array<{ deliveryType: string; count: number }>;
  balanceDueOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    eventDate: string;
    totalAmount: number;
    amountPaid: number;
    balanceDue: number;
  }>;
}

function money(n: number) {
  return (
    "$" +
    (n ?? 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

const QUICK_REPORT_LABELS: Record<string, string> = {
  receivables: "Outstanding Balances",
  "sales-overview": "Sales Overview",
  "payment-list": "Payments",
  "order-list": "Orders",
  "inventory-usage-totals": "Inventory Usage",
  "customer-list-report": "Customers",
  tax: "Tax Report",
};

const QUICK_REPORT_ICONS: Record<string, string> = {
  receivables: "💰",
  "sales-overview": "📈",
  "payment-list": "💳",
  "order-list": "📦",
  "inventory-usage-totals": "🧰",
  "customer-list-report": "👥",
  tax: "🧾",
};

const RECENT_KEY = "fpr_admin_recent_reports";

function reportHref(slug: string) {
  return "/admin/reports/" + slug;
}

function recordRecent(slug: string) {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const next = [slug, ...list.filter((s) => s !== slug)].slice(0, 5);
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export default function ReportsPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All Reports");
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/admin/reports/summary")
      .then((r) => r.json())
      .then(setSummary)
      .catch(() => setSummary(null));
    try {
      const raw = window.localStorage.getItem(RECENT_KEY);
      if (raw) setRecentSlugs(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  const searchResults = useMemo(() => {
    if (!query.trim()) return null;
    return searchReports(query);
  }, [query]);

  const reportsByCategory = useMemo(() => {
    const map = new Map<string, ReportItem[]>();
    for (const cat of CATEGORY_ORDER) map.set(cat, []);
    for (const r of ALL_REPORTS) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    }
    return map;
  }, []);

  const recentReports = useMemo(
    () =>
      recentSlugs
        .map((slug) => ALL_REPORTS.find((r) => r.slug === slug))
        .filter(Boolean) as ReportItem[],
    [recentSlugs]
  );

  const visibleReports = useMemo(() => {
    if (activeCategory === "All Reports") return ALL_REPORTS;
    if (activeCategory === "Recent") return recentReports;
    return reportsByCategory.get(activeCategory) ?? [];
  }, [activeCategory, reportsByCategory, recentReports]);

  const topBalances = (summary?.balanceDueOrders ?? []).slice(0, 5);

  return (
    <div className="max-w-[1500px] mx-auto px-8 py-6">
      <div className="mb-6">
        <h1 className="text-[32px] font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">
          Find, run and export detailed business reports.
        </p>
      </div>

      <div className="mb-8">
        <div className="relative max-w-[600px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reports by name, task, or keyword..."
            className="w-full h-[44px] pl-11 pr-10 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-admin-green focus:border-admin-green"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
              type="button"
            >
              &#10005;
            </button>
          )}

          {searchResults && (
            <div className="absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg divide-y divide-gray-100 overflow-hidden">
              {searchResults.length === 0 && (
                <div className="p-4 text-sm text-gray-500">
                  No reports match &quot;{query}&quot;.
                </div>
              )}
              {searchResults.slice(0, 8).map((r) => (
                <Link
                  key={r.slug}
                  href={reportHref(r.slug)}
                  onClick={() => recordRecent(r.slug)}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900">{r.title}</div>
                    <div className="text-xs text-gray-500 truncate">{r.description}</div>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0 ml-3">{r.category}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Reports</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {QUICK_REPORT_SLUGS.map((slug) => {
            const r = ALL_REPORTS.find((x) => x.slug === slug);
            if (!r) return null;
            return (
              <Link
                key={slug}
                href={reportHref(slug)}
                onClick={() => recordRecent(slug)}
                className="admin-card p-4 flex flex-col justify-between h-[110px] hover:border-admin-green transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xl">{QUICK_REPORT_ICONS[slug] ?? "📄"}</span>
                  <span className="text-gray-300">&#8594;</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    {QUICK_REPORT_LABELS[slug] ?? r.title}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{r.description}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {summary && (
        <div className="mb-8 admin-card p-0 overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-gray-100">
            <SnapshotStat label="Revenue This Month" value={money(summary.revenueThisMonth)} />
            <SnapshotStat
              label="Outstanding"
              value={money(summary.outstandingBalance)}
              sub={summary.outstandingOrderCount + " orders"}
              tone="amber"
            />
            <SnapshotStat label="Upcoming (7 days)" value={String(summary.upcoming7)} />
            <SnapshotStat
              label="Pending Stripe Payments"
              value={String(summary.pendingPaymentsCount)}
              sub={summary.pendingPaymentsAmount ? money(summary.pendingPaymentsAmount) : undefined}
            />
            <SnapshotStat label="Orders This Month" value={String(summary.ordersThisMonth)} />
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          <div className="admin-card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              {summary.ordersByStatus.map((s) => (
                <div key={s.status} className="flex justify-between pr-4">
                  <span className="text-gray-500 capitalize">{s.status}</span>
                  <span className="font-medium text-gray-900">{s.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
              {summary.ordersByDeliveryType.map((d) => (
                <span key={d.deliveryType} className="capitalize">
                  {d.deliveryType}:{" "}
                  <span className="font-medium text-gray-700">{d.count}</span>
                </span>
              ))}
            </div>
            <Link
              href="/admin/reports/order-list"
              className="inline-block mt-3 text-xs font-medium text-admin-green hover:underline"
            >
              View all orders &#8594;
            </Link>
          </div>

          <div className="admin-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Outstanding Balances</h3>
              <span className="text-xs text-gray-500">
                {summary.outstandingOrderCount} orders &middot; {money(summary.outstandingBalance)}
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {topBalances.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-2 text-sm">
                  <div className="min-w-0">
                    <Link href={"/admin/orders/" + o.id} className="font-medium text-gray-900 hover:underline">
                      {o.orderNumber} &middot; {o.customerName}
                    </Link>
                    <div className="text-xs text-gray-500">
                      {new Date(o.eventDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="font-semibold text-amber-600 shrink-0 ml-3">
                    {money(o.balanceDue)}
                  </div>
                </div>
              ))}
              {topBalances.length === 0 && (
                <div className="py-4 text-sm text-gray-500">No outstanding balances.</div>
              )}
            </div>
            <Link
              href="/admin/reports/receivables"
              className="inline-block mt-3 text-xs font-medium text-admin-green hover:underline"
            >
              View all {summary.outstandingOrderCount} balances &#8594;
            </Link>
          </div>
        </div>
      )}

      {recentReports.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent Reports</h2>
          <div className="admin-card divide-y divide-gray-100">
            {recentReports.map((r) => (
              <Link
                key={r.slug}
                href={reportHref(r.slug)}
                onClick={() => recordRecent(r.slug)}
                className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-sm"
              >
                <span className="font-medium text-gray-900">{r.title}</span>
                <span className="text-gray-300">&#8594;</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Report Library</h2>

        <div className="md:hidden mb-4">
          <select
            value={activeCategory}
            onChange={(e) => setActiveCategory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option>All Reports</option>
            {recentReports.length > 0 && <option>Recent</option>}
            {CATEGORY_ORDER.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-6">
          <div className="hidden md:block w-[230px] shrink-0">
            <div className="space-y-1">
              <SidebarButton
                label="All Reports"
                count={ALL_REPORTS.length}
                active={activeCategory === "All Reports"}
                onClick={() => setActiveCategory("All Reports")}
              />
              {recentReports.length > 0 && (
                <SidebarButton
                  label="Recent"
                  count={recentReports.length}
                  active={activeCategory === "Recent"}
                  onClick={() => setActiveCategory("Recent")}
                />
              )}
              <div className="h-px bg-gray-100 my-2" />
              {CATEGORY_ORDER.map((c) => (
                <SidebarButton
                  key={c}
                  label={c}
                  count={reportsByCategory.get(c)?.length ?? 0}
                  active={activeCategory === c}
                  onClick={() => setActiveCategory(c)}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 admin-card divide-y divide-gray-100 overflow-hidden">
            {visibleReports.map((r) => (
              <Link
                key={r.slug}
                href={reportHref(r.slug)}
                onClick={() => recordRecent(r.slug)}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 group min-h-[64px]"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    {r.title}
                    {!IMPLEMENTED_SLUGS.has(r.slug) && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{r.description}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="hidden lg:inline text-xs text-gray-400">{r.category}</span>
                  <span className="text-gray-300 group-hover:text-admin-green">&#8594;</span>
                </div>
              </Link>
            ))}
            {visibleReports.length === 0 && (
              <div className="px-5 py-8 text-sm text-gray-500 text-center">
                No reports in this category yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="admin-card p-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-gray-900">Automatic Email Templates</div>
          <div className="text-xs text-gray-500">
            Manage scheduled and automated customer emails.
          </div>
        </div>
        <Link
          href="/admin/settings/automatic-messages"
          className="text-sm font-medium text-admin-green hover:underline shrink-0 ml-4"
        >
          Email Automation Settings &#8594;
        </Link>
      </div>
    </div>
  );
}

function SnapshotStat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "amber";
}) {
  return (
    <div className="p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={tone === "amber" ? "text-2xl font-bold mt-1 text-amber-600" : "text-2xl font-bold mt-1 text-gray-900"}>
        {value}
      </div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function SidebarButton({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors bg-green-50 text-gray-900 font-medium border-l-2 border-admin-green"
          : "w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors text-gray-600 hover:bg-gray-50"
      }
    >
      <span>{label}</span>
      <span className="text-xs text-gray-400">{count}</span>
    </button>
  );
}
