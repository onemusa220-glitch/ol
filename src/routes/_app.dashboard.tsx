import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import { dashboardStats } from "@/demo/selectors";
import { PAYMENT_METHOD_LABELS } from "@/demo/types";
import { fmtDateTime, fmtKg, money, moneyPlain } from "@/lib/money";
import { EmptyState, PageHeader, StatCard, StatusPill } from "@/components/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const snap = useDemo();
  const navigate = useNavigate();

  useEffect(() => {
    if (snap && !can(snap.user?.role, "dashboard")) navigate({ to: "/pos", replace: true });
  }, [snap, navigate]);

  if (!snap?.db) return null;
  const stats = dashboardStats(snap.db);
  const branches = snap.db.branches;

  return (
    <div className="pb-10">
      <PageHeader title="Dashboard" subtitle="Today at a glance — live from demo data" />

      <div className="space-y-5 px-4 py-5 md:px-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard label="Today's Sales" value={money(stats.todaySales)} sub={stats.yestSales > 0 ? `Yesterday ${money(stats.yestSales)}` : undefined} tone="brand" icon="💰" />
          <StatCard label="Profit Estimate" value={money(stats.todayProfit)} sub="Sales minus product cost" icon="📈" />
          <StatCard label="Transactions" value={String(stats.todayTransactions)} sub="Completed sales today" icon="🧾" />
          <StatCard label="Items Sold" value={String(stats.todayItems)} sub="Line items today" icon="🍗" />
        </div>

        {/* Trend + payments */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sales trend — last 7 days</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trend} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-brand)" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="var(--color-brand)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v: number) => moneyPlain(v)} width={70} />
                  <Tooltip formatter={(v: number | string) => money(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }} />
                  <Area type="monotone" dataKey="sales" stroke="var(--color-brand-deep)" strokeWidth={2.5} fill="url(#salesFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Payments today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.paymentBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments yet today.</p>
              ) : (
                stats.paymentBreakdown.map((p) => (
                  <div key={p.method} className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{PAYMENT_METHOD_LABELS[p.method as keyof typeof PAYMENT_METHOD_LABELS] ?? p.method}</span>
                    <span className="font-display font-bold">{money(p.amount)}</span>
                  </div>
                ))
              )}
              <div className="border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Needs attention</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li className="flex justify-between"><span>Pending / partial sales</span><span className="font-semibold">{stats.pendingPayments.length}</span></li>
                  <li className="flex justify-between"><span>Unmatched PayBill</span><span className="font-semibold">{stats.unmatchedPaybill.length}</span></li>
                  <li className="flex justify-between"><span>Shifts under review</span><span className="font-semibold">{stats.shiftsUnderReview.length}</span></li>
                  <li className="flex justify-between"><span>Stock takes to review</span><span className="font-semibold">{stats.stockTakesToReview.length}</span></li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Best sellers + low stock */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Best sellers — 7 days</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.bestSellers.length === 0 ? (
                <EmptyState icon="🍗" title="No sales yet" body="Completed sales will show here." />
              ) : (
                stats.bestSellers.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-lg">{p.emoji}</span>
                      <span className="truncate font-medium">{p.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{p.qtyLabel}</span>
                    </span>
                    <span className="shrink-0 font-display font-bold">{money(p.revenue)}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Low stock alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.lowStock.length === 0 ? (
                <EmptyState icon="✅" title="Stock levels healthy" />
              ) : (
                stats.lowStock.slice(0, 6).map((l) => (
                  <div key={`${l.productId}-${l.branchId}`} className="flex items-center justify-between gap-3 rounded-lg border border-brand/40 bg-brand-soft px-3 py-2 text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="text-lg">{l.product.emoji}</span>
                      <span className="truncate font-medium">{l.product.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{branches.find((b) => b.id === l.branchId)?.name}</span>
                    </span>
                    <span className="shrink-0 font-display font-bold">{fmtKg(l.qty)}</span>
                  </div>
                ))
              )}
              <Link to="/inventory" className="inline-block text-sm font-medium text-brand-deep underline-offset-2 hover:underline">
                Open inventory →
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recent sales</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentSales.length === 0 ? (
              <EmptyState icon="🧾" title="No completed sales yet" body="Make your first sale in the POS." />
            ) : (
              <div className="space-y-2">
                {stats.recentSales.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                    <span className="font-medium">{s.receiptNo}</span>
                    <span className="text-muted-foreground">
                      {s.items.length} item{s.items.length === 1 ? "" : "s"} · {fmtDateTime(s.completedAt ?? s.createdAt)}
                    </span>
                    <span className="flex items-center gap-2">
                      <StatusPill status={s.status} />
                      <span className="font-display font-bold">{money(s.total)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
