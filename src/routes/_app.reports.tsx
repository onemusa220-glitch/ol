import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import { salesReport, productPerformance, inventoryReport, wastageReport, varianceReport, paymentBreakdown } from "@/demo/selectors";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { EmptyState, PageHeader } from "@/components/shared";
import { fmtKg, money, moneyPlain } from "@/lib/money";

export const Route = createFileRoute("/_app/reports")({
  component: ReportsPage,
});

const DAY = 86_400_000;

function ReportsPage() {
  const snap = useDemo();
  const navigate = useNavigate();
  const [range, setRange] = useState<"today" | "yesterday" | "week" | "month">("week");
  const [branchId, setBranchId] = useState("all");

  useEffect(() => {
    if (snap && !can(snap.user?.role, "reports")) navigate({ to: "/dashboard", replace: true });
  }, [snap, navigate]);

  if (!snap?.db) return null;
  const db = snap.db;

  function getRange(): { from: number; to: number } {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    switch (range) {
      case "today": return { from: start.getTime(), to: now.getTime() };
      case "yesterday": return { from: start.getTime() - DAY, to: start.getTime() };
      case "week": return { from: start.getTime() - 7 * DAY, to: now.getTime() };
      case "month": return { from: start.getTime() - 30 * DAY, to: now.getTime() };
    }
  }

  const { from, to } = getRange();
  const sales = salesReport(db, from, to);
  const perf = productPerformance(db, from, to);
  const waste = wastageReport(db, from, to);
  const variances = varianceReport(db);
  const payments = paymentBreakdown(db, from, to);

  return (
    <div className="pb-10">
      <PageHeader title="Reports" subtitle="Sales, products, inventory, payments, wastage, profit and stock variance" />
      <div className="px-4 py-5 md:px-6">
        <div className="mb-4 flex flex-wrap gap-3">
          <div>
            <Label>Range</Label>
            <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
              <SelectTrigger className="mt-1 w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 days</SelectItem>
                <SelectItem value="month">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="sales">
          <TabsList className="mb-4">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="wastage">Wastage</TabsTrigger>
            <TabsTrigger value="variance">Variance</TabsTrigger>
          </TabsList>

          {/* Summary KPIs */}
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Total Sales</p><p className="font-display text-xl font-bold">{money(sales.total)}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Profit</p><p className="font-display text-xl font-bold text-success">{money(sales.profit)}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Transactions</p><p className="font-display text-xl font-bold">{sales.transactions}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Items Sold</p><p className="font-display text-xl font-bold">{sales.items}</p></div>
            <div className="rounded-xl border p-3"><p className="text-xs text-muted-foreground">Discounts</p><p className="font-display text-xl font-bold">{money(sales.discounts)}</p></div>
          </div>

          <TabsContent value="sales">
            {sales.byDay.length === 0 ? <EmptyState icon="📊" title="No sales in this range" /> : (
              <div className="rounded-xl border p-4">
                <p className="mb-3 font-semibold">Daily Sales</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sales.byDay}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                      <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={(v: number) => moneyPlain(v)} width={70} />
                      <Tooltip formatter={(v: number | string) => money(Number(v))} contentStyle={{ borderRadius: 12, border: "1px solid var(--color-border)" }} />
                      <Bar dataKey="total" fill="var(--color-brand)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="products">
            {perf.length === 0 ? <EmptyState icon="📦" title="No product data" /> : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr><th className="p-3">Product</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Revenue</th><th className="p-3 text-right">Cost</th><th className="p-3 text-right">Profit</th><th className="p-3 text-right">Txns</th></tr>
                  </thead>
                  <tbody>
                    {perf.map((p) => (
                      <tr key={p.productId} className="border-t">
                        <td className="p-3 font-medium">{p.emoji} {p.name}</td>
                        <td className="p-3 text-right">{p.qtyLabel}</td>
                        <td className="p-3 text-right">{money(p.revenue)}</td>
                        <td className="p-3 text-right text-muted-foreground">{money(p.cost)}</td>
                        <td className="p-3 text-right font-semibold text-success">{money(p.profit)}</td>
                        <td className="p-3 text-right">{p.transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="payments">
            {payments.length === 0 ? <EmptyState icon="💳" title="No payment data" /> : (
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.method} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                    <span className="font-medium">{p.method}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground">{p.count} txns</span>
                      <span className="font-display font-bold">{money(p.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="wastage">
            {waste.length === 0 ? <EmptyState icon="🗑️" title="No wastage in this range" /> : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr><th className="p-3">Product</th><th className="p-3 text-right">Qty</th><th className="p-3">Reason</th><th className="p-3 text-right">Value</th></tr>
                  </thead>
                  <tbody>
                    {waste.map((w) => (
                      <tr key={w.id} className="border-t">
                        <td className="p-3 font-medium">{w.productName}</td>
                        <td className="p-3 text-right">{w.qty} {w.unit === "KG" ? "kg" : "pcs"}</td>
                        <td className="p-3">{w.reason}</td>
                        <td className="p-3 text-right font-semibold text-destructive">{money(w.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="variance">
            {variances.length === 0 ? <EmptyState icon="✅" title="No stock variances recorded" /> : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr><th className="p-3">Ref</th><th className="p-3">Product</th><th className="p-3 text-right">Expected</th><th className="p-3 text-right">Actual</th><th className="p-3 text-right">Diff</th><th className="p-3">Status</th></tr>
                  </thead>
                  <tbody>
                    {variances.map((v, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3">{v.ref}</td>
                        <td className="p-3 font-medium">{v.productName}</td>
                        <td className="p-3 text-right">{v.expected} {v.unit === "KG" ? "kg" : "pcs"}</td>
                        <td className="p-3 text-right">{v.actual} {v.unit === "KG" ? "kg" : "pcs"}</td>
                        <td className={`p-3 text-right font-semibold ${v.diff < 0 ? "text-destructive" : "text-success"}`}>{v.diff > 0 ? "+" : ""}{v.diff}</td>
                        <td className="p-3">{v.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
