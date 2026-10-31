import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import { matchPaybillInboxItem, receivePaybill } from "@/demo/engine";
import { PAYMENT_METHOD_LABELS } from "@/demo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, PageHeader, StatusPill } from "@/components/shared";
import { fmtDateTime, money } from "@/lib/money";

export const Route = createFileRoute("/_app/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const snap = useDemo();
  const navigate = useNavigate();
  const [simAccount, setSimAccount] = useState("");
  const [simAmount, setSimAmount] = useState("");

  useEffect(() => {
    if (snap && !can(snap.user?.role, "payments")) navigate({ to: "/dashboard", replace: true });
  }, [snap, navigate]);

  if (!snap?.db) return null;
  const db = snap.db;
  const allPayments = db.sales.flatMap((s) => s.payments.map((p) => ({ ...p, sale: s })));
  const pendingPaybill = allPayments.filter((p) => p.method === "PAYBILL" && p.status === "PENDING");

  function simulatePaybill() {
    if (!simAccount.trim() || !simAmount) { toast.error("Enter account and amount"); return; }
    const res = receivePaybill(simAccount.trim(), parseFloat(simAmount));
    if (res.matched) toast.success(res.message);
    else toast.error(res.message);
    setSimAccount(""); setSimAmount("");
  }

  return (
    <div className="pb-10">
      <PageHeader title="Payments" subtitle="Transactions, STK, PayBill and reconciliation" />
      <div className="px-4 py-5 md:px-6">
        <Tabs defaultValue="transactions">
          <TabsList className="mb-4">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="pending">Pending STK / PayBill</TabsTrigger>
            <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            {allPayments.length === 0 ? <EmptyState icon="💳" title="No payments yet" /> : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr><th className="p-3">Ref</th><th className="p-3">Method</th><th className="p-3 text-right">Amount</th><th className="p-3">Status</th><th className="p-3">M-Pesa Ref</th><th className="p-3">Date</th></tr>
                  </thead>
                  <tbody>
                    {[...allPayments].reverse().slice(0, 200).map((p) => (
                      <tr key={p.id} className="border-t">
                        <td className="p-3 font-medium">{p.ref}</td>
                        <td className="p-3">{PAYMENT_METHOD_LABELS[p.method]}</td>
                        <td className="p-3 text-right font-semibold">{money(p.amount)}</td>
                        <td className="p-3"><StatusPill status={p.status} /></td>
                        <td className="p-3 text-muted-foreground">{p.mpesaRef ?? "—"}</td>
                        <td className="p-3 text-muted-foreground">{fmtDateTime(p.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending">
            {pendingPaybill.length === 0 ? <EmptyState icon="✅" title="No pending PayBill payments" /> : (
              <div className="space-y-2">
                {pendingPaybill.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{p.ref} — {PAYMENT_METHOD_LABELS[p.method]}</p>
                      <p className="text-xs text-muted-foreground">Account: {p.paybillAccount} · {money(p.amount)}</p>
                    </div>
                    <StatusPill status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reconciliation">
            <div className="space-y-4">
              <div className="rounded-xl border-2 border-brand/40 bg-brand-soft p-4">
                <p className="font-display text-sm font-bold">Simulate PayBill Payment</p>
                <p className="mt-1 text-xs text-muted-foreground">Demo tool — simulate a customer sending payment via PayBill.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Input placeholder="Account e.g. BRM-SALE-000123" value={simAccount} onChange={(e) => setSimAccount(e.target.value)} className="flex-1" />
                  <Input placeholder="Amount" type="number" value={simAmount} onChange={(e) => setSimAmount(e.target.value)} className="w-32" />
                  <Button onClick={simulatePaybill}>Simulate</Button>
                </div>
              </div>

              {db.paybillInbox.length === 0 ? (
                <EmptyState icon="📭" title="No unmatched PayBill payments" />
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Unmatched PayBill Inbox</p>
                  {db.paybillInbox.filter((i) => i.status === "UNMATCHED").map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{item.account} — {money(item.amount)}</p>
                        <p className="text-xs text-muted-foreground">{fmtDateTime(item.at)}</p>
                      </div>
                      <Badge variant="secondary">UNMATCHED</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
