import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import {
  addCashPayment,
  addCardPayment,
  cancelDraft,
  createPaybillExpectation,
  createStkPayment,
  normalizeKenyanPhone,
  paidAmount,
  receivePaybill,
  resolveStkPayment,
  saleBalance,
  startSale,
  addDraftItem,
} from "@/demo/engine";
import type { Payment, Sale, SaleItem, SellingMode } from "@/demo/types";
import { Cart } from "@/components/pos/cart";
import { SellModeDialog, type DraftItemInput } from "@/components/pos/sell-mode-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { money, round2, fmtKg } from "@/lib/money";
import { PAYMENT_METHOD_LABELS } from "@/demo/types";

export const Route = createFileRoute("/_app/pos")({
  component: PosScreen,
});

function PosScreen() {
  const snap = useDemo();
  const navigate = useNavigate();
  const [saleId, setSaleId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [checkout, setCheckout] = useState(false);

  useEffect(() => {
    if (snap && !can(snap.user?.role, "pos")) navigate({ to: "/dashboard", replace: true });
  }, [snap, navigate]);

  const sale = useMemo(
    () => snap?.db.sales.find((s) => s.id === saleId && s.status === "DRAFT") ?? null,
    [snap, saleId],
  );

  function ensureSale(): Sale {
    if (sale) return sale;
    const s = startSale(null);
    setSaleId(s.id);
    return s;
  }

  function newSale() {
    const s = startSale(null);
    setSaleId(s.id);
  }

  function suspend() {
    if (!sale) return;
    toast.success(`Sale suspended — find it under Suspended Sales`);
    setSaleId(null);
  }

  function clearSale() {
    if (!sale) return;
    if (sale.items.length === 0) {
      cancelDraft(sale.id);
      setSaleId(null);
      return;
    }
    if (confirm("Clear this sale? Draft will be cancelled.")) {
      cancelDraft(sale.id);
      setSaleId(null);
    }
  }

  function addItem(item: DraftItemInput) {
    const s = ensureSale();
    try {
      addDraftItem(s.id, item);
      toast.success(`${item.emoji} ${item.productName} added`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add item");
    }
  }

  if (!snap) return null;
  const db = snap.db;
  const products = db.products.filter(
    (p) => p.active && (activeCat === "all" || p.categoryId === activeCat),
  );
  const filtered = query.trim()
    ? products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()) || p.sku.toLowerCase().includes(query.toLowerCase()))
    : products;
  const branchId = db.branches[0]?.id ?? "";

  if (checkout && sale) {
    return <Checkout sale={sale} onClose={() => setCheckout(false)} onDone={() => { setSaleId(null); setCheckout(false); }} />;
  }

  return (
    <div className="flex h-screen flex-col lg:flex-row pos-theme">
      {/* LEFT — categories */}
      <aside className="hidden w-48 shrink-0 flex-col border-r border-pos-border bg-pos-surface lg:flex">
        <div className="border-b border-pos-border px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-pos-muted-foreground">Categories</p>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          <CategoryButton label="All" emoji="🍗" active={activeCat === "all"} onClick={() => setActiveCat("all")} />
          {db.categories.map((c) => (
            <CategoryButton key={c.id} label={c.name} emoji={c.emoji} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} />
          ))}
        </div>
      </aside>

      {/* CENTER — product grid */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-pos-border px-4 py-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pos-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search products by name or SKU…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 border-pos-border bg-pos-surface pl-10 text-pos-foreground placeholder:text-pos-muted-foreground"
            />
          </div>
          {/* Mobile category chips */}
          <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar lg:hidden">
            <CatChip label="All" active={activeCat === "all"} onClick={() => setActiveCat("all")} />
            {db.categories.map((c) => (
              <CatChip key={c.id} label={`${c.emoji} ${c.name}`} active={activeCat === c.id} onClick={() => setActiveCat(c.id)} />
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="text-4xl">🔍</span>
              <p className="mt-3 text-sm font-semibold text-pos-foreground">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filtered.map((p) => {
                const bal = db.balances.find((b) => b.productId === p.id && b.branchId === branchId)?.qty ?? 0;
                const out = bal <= 0;
                return (
                  <button
                    key={p.id}
                    disabled={out}
                    onClick={() => setSelectedProduct(p.id)}
                    className={`group flex flex-col rounded-2xl border bg-pos-surface p-3 text-left transition-all hover:border-brand hover:shadow-elegant disabled:cursor-not-allowed disabled:opacity-50 ${out ? "" : "active:scale-[0.97]"}`}
                  >
                    <div className="flex h-20 items-center justify-center rounded-xl bg-pos-surface-2 text-4xl">{p.emoji}</div>
                    <p className="mt-2 truncate text-sm font-bold text-pos-foreground">{p.name}</p>
                    <p className="text-[11px] text-pos-muted-foreground">
                      {p.pricePerKg && `KSh ${p.pricePerKg}/KG`}
                      {p.pricePerKg && p.pricePerPiece ? " · " : ""}
                      {p.pricePerPiece && `KSh ${p.pricePerPiece}/pc`}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className={`text-[11px] font-semibold ${out ? "text-destructive" : "text-pos-muted-foreground"}`}>
                        {out ? "Out of stock" : p.baseUnit === "KG" ? fmtKg(bal) : `${bal} pcs`}
                      </span>
                      <span className="flex gap-1">
                        {p.sellingModes.includes("weight") && <Badge variant="secondary" className="text-[9px] px-1 py-0">KG</Badge>}
                        {p.sellingModes.includes("piece") && <Badge variant="secondary" className="text-[9px] px-1 py-0">PC</Badge>}
                        {p.sellingModes.includes("amount") && <Badge variant="secondary" className="text-[9px] px-1 py-0">KSh</Badge>}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT — cart */}
      <div className="w-full shrink-0 border-t border-pos-border bg-pos-surface lg:w-96 lg:border-l lg:border-t-0">
        <Cart sale={sale} onCheckout={() => setCheckout(true)} onNewSale={clearSale} onSuspend={suspend} />
      </div>

      {/* Sell mode dialog */}
      <SellModeDialog
        product={db.products.find((p) => p.id === selectedProduct) ?? null}
        open={!!selectedProduct}
        onOpenChange={(o) => !o && setSelectedProduct(null)}
        onAdd={addItem}
        branchId={branchId}
      />
    </div>
  );
}

function CategoryButton({ label, emoji, active, onClick }: { label: string; emoji: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-brand text-pos-foreground" : "text-pos-muted-foreground hover:bg-pos-surface-2 hover:text-pos-foreground"}`}
    >
      <span className="text-lg">{emoji}</span>
      {label}
    </button>
  );
}

function CatChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${active ? "border-brand bg-brand text-pos-foreground" : "border-pos-border bg-pos-surface text-pos-muted-foreground"}`}>
      {label}
    </button>
  );
}

// ===================== CHECKOUT =====================

type PayMethod = "CASH" | "STK" | "PAYBILL" | "CARD";

function Checkout({ sale, onClose, onDone }: { sale: Sale; onClose: () => void; onDone: () => void }) {
  const snap = useDemo();
  const [method, setMethod] = useState<PayMethod | null>(null);
  const [cashReceived, setCashReceived] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [stkPhone, setStkPhone] = useState("");
  const [stkPayment, setStkPayment] = useState<Payment | null>(null);
  const [stkPolling, setStkPolling] = useState(false);
  const [paybillPayment, setPaybillPayment] = useState<Payment | null>(null);
  const [done, setDone] = useState(false);
  const [receipt, setReceipt] = useState<Sale | null>(null);

  if (!snap) return null;
  const total = sale.total;
  const paid = paidAmount(sale);
  const balance = round2(total - paid);

  if (done && receipt) {
    return <ReceiptView sale={receipt} onNewSale={onDone} />;
  }

  function completeSale() {
    const s = snap!.db.sales.find((x) => x.id === sale.id);
    if (!s) return;
    if (s.status !== "COMPLETED") {
      toast.error("Sale not fully paid yet");
      return;
    }
    setReceipt(s);
    setDone(true);
    toast.success(`Sale complete — ${s.receiptNo}`);
  }

  function handleCash() {
    const received = parseFloat(cashReceived) || 0;
    if (received < total) {
      toast.error(`Need at least ${money(total)}`);
      return;
    }
    try {
      addCashPayment(sale.id, total);
      const s = snap!.db.sales.find((x) => x.id === sale.id)!;
      setReceipt(s);
      setDone(true);
      toast.success(`Sale complete — ${s.receiptNo}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    }
  }

  function handleCard() {
    if (cardLast4.length !== 4) {
      toast.error("Enter last 4 digits");
      return;
    }
    try {
      addCardPayment(sale.id, total, cardLast4);
      const s = snap!.db.sales.find((x) => x.id === sale.id)!;
      setReceipt(s);
      setDone(true);
      toast.success(`Sale complete — ${s.receiptNo}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Payment failed");
    }
  }

  function handleStkSend() {
    const phone = stkPhone.trim();
    if (!normalizeKenyanPhone(phone)) {
      toast.error("Enter a valid Kenyan number e.g. 0712 345 678");
      return;
    }
    try {
      const pay = createStkPayment(sale.id, total, phone);
      setStkPayment(pay);
      setStkPolling(true);
      toast.info("STK push sent — customer should check their phone");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "STK failed");
    }
  }

  function handleStkSimulate(outcome: "SUCCESS" | "FAILED") {
    if (!stkPayment) return;
    resolveStkPayment(stkPayment.id, outcome);
    setStkPolling(false);
    if (outcome === "SUCCESS") {
      const s = snap!.db.sales.find((x) => x.id === sale.id)!;
      setReceipt(s);
      setDone(true);
      toast.success("Payment received — sale complete");
    } else {
      toast.error("Payment failed on customer phone");
    }
  }

  function handlePaybillAuto() {
    try {
      const pay = createPaybillExpectation(sale.id, total);
      setPaybillPayment(pay);
      toast.info(`Pay ${money(total)} to PayBill ${snap!.db.settings.paybillNumber}, account ${pay.paybillAccount}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create PayBill request");
    }
  }

  function handlePaybillConfirm() {
    if (!paybillPayment?.paybillAccount) return;
    const res = receivePaybill(paybillPayment.paybillAccount, total);
    if (res.matched) {
      const s = snap!.db.sales.find((x) => x.id === sale.id)!;
      setReceipt(s);
      setDone(true);
      toast.success("PayBill payment received — sale complete");
    } else {
      toast.error(res.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="font-display text-lg font-bold">Checkout</h2>
          <button onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">✕</button>
        </div>

        <div className="border-b bg-muted/50 px-5 py-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sale Total</p>
          <p className="font-display text-4xl font-extrabold text-brand-deep">{money(total)}</p>
          {paid > 0 && <p className="mt-1 text-sm text-muted-foreground">Paid {money(paid)} · Balance {money(balance)}</p>}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Method picker */}
          {!method && (
            <div className="grid grid-cols-2 gap-3">
              {(["CASH", "STK", "PAYBILL", "CARD"] as PayMethod[]).map((m) => (
                <button
                  key={m}
                  onClick={() => setMethod(m)}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 border-border bg-muted/30 p-6 transition-colors hover:border-brand hover:bg-brand-soft"
                >
                  <span className="text-3xl">{m === "CASH" ? "💵" : m === "STK" ? "📱" : m === "PAYBILL" ? "🏦" : "💳"}</span>
                  <span className="font-display text-sm font-bold">{PAYMENT_METHOD_LABELS[m]}</span>
                </button>
              ))}
            </div>
          )}

          {/* CASH */}
          {method === "CASH" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Amount Received</label>
                <Input
                  autoFocus
                  type="number"
                  inputMode="decimal"
                  placeholder={String(total)}
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="mt-1 h-14 text-center font-display text-2xl font-bold"
                />
              </div>
              {cashReceived && parseFloat(cashReceived) >= total && (
                <div className="rounded-xl border bg-muted/40 p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Change</p>
                  <p className="font-display text-2xl font-bold text-brand-deep">{money(round2(parseFloat(cashReceived) - total))}</p>
                </div>
              )}
              <div className="rounded-lg border border-brand/40 bg-brand-soft px-3 py-2 text-xs font-medium">
                🟡 DEMO TRANSACTION — NOT A REAL PAYMENT
              </div>
              <Button className="h-14 w-full text-base font-bold" disabled={!cashReceived || parseFloat(cashReceived) < total} onClick={handleCash}>
                COMPLETE PAYMENT
              </Button>
            </div>
          )}

          {/* STK */}
          {method === "STK" && (
            <div className="space-y-4">
              {!stkPayment && (
                <>
                  <div>
                    <label className="text-sm font-semibold">Customer Phone Number</label>
                    <Input
                      autoFocus
                      type="tel"
                      placeholder="0712 345 678"
                      value={stkPhone}
                      onChange={(e) => setStkPhone(e.target.value)}
                      className="mt-1 h-14 text-center font-display text-xl font-bold"
                    />
                  </div>
                  <div className="rounded-lg border border-brand/40 bg-brand-soft px-3 py-2 text-xs font-medium">
                    🟡 DEMO — STK push will be simulated, not sent to Safaricom
                  </div>
                  <Button className="h-14 w-full text-base font-bold" onClick={handleStkSend}>SEND STK PUSH — {money(total)}</Button>
                </>
              )}
              {stkPayment && stkPolling && (
                <div className="space-y-3 text-center">
                  <div className="rounded-xl border bg-muted/40 p-6">
                    <p className="text-3xl">⏳</p>
                    <p className="mt-2 font-display text-base font-bold">Waiting for payment</p>
                    <p className="mt-1 text-sm text-muted-foreground">Check your phone and enter M-Pesa PIN</p>
                    <p className="mt-2 text-xs text-muted-foreground">Ref: {stkPayment.ref}</p>
                  </div>
                  <div className="rounded-lg border border-brand/40 bg-brand-soft px-3 py-2 text-xs font-medium">
                    🟡 DEMO — simulate the customer's phone response:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" className="h-12 font-semibold text-destructive" onClick={() => handleStkSimulate("FAILED")}>
                      Simulate Decline
                    </Button>
                    <Button className="h-12 font-bold" onClick={() => handleStkSimulate("SUCCESS")}>
                      Simulate Approve
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PAYBILL */}
          {method === "PAYBILL" && (
            <div className="space-y-4">
              {!paybillPayment && (
                <>
                  <div className="rounded-xl border bg-muted/40 p-4 text-sm">
                    <p className="font-semibold">PayBill Instructions</p>
                    <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <li>1. Go to M-Pesa → Lipa na M-Pesa → PayBill</li>
                      <li>2. Business Number: <span className="font-bold text-foreground">{snap.db.settings.paybillNumber}</span></li>
                      <li>3. Account Number: will be generated</li>
                      <li>4. Amount: <span className="font-bold text-foreground">{money(total)}</span></li>
                      <li>5. Complete payment</li>
                    </ol>
                  </div>
                  <div className="rounded-lg border border-brand/40 bg-brand-soft px-3 py-2 text-xs font-medium">
                    🟡 DEMO — PayBill payment will be simulated
                  </div>
                  <Button className="h-14 w-full text-base font-bold" onClick={handlePaybillAuto}>
                    CONFIRM PAYBILL — {money(total)}
                  </Button>
                </>
              )}
              {paybillPayment && !done && (
                <div className="space-y-3">
                  <div className="rounded-xl border bg-muted/40 p-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pay To</p>
                    <p className="font-display text-xl font-bold">{snap.db.settings.paybillNumber}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Account: <span className="font-bold text-foreground">{paybillPayment.paybillAccount}</span></p>
                    <p className="mt-1 text-xs text-muted-foreground">Amount: <span className="font-bold text-foreground">{money(total)}</span></p>
                  </div>
                  <div className="rounded-xl border bg-brand-soft p-4 text-center">
                    <p className="text-2xl">📲</p>
                    <p className="mt-1 font-display text-sm font-bold">Customer received M-Pesa confirmation</p>
                    <p className="mt-1 text-xs text-muted-foreground">Confirm once the customer shows their payment message</p>
                  </div>
                  <div className="rounded-lg border border-brand/40 bg-brand-soft px-3 py-2 text-xs font-medium">
                    🟡 DEMO — simulate the customer's M-Pesa confirmation:
                  </div>
                  <Button className="h-12 w-full font-bold" onClick={handlePaybillConfirm}>
                    CONFIRM PAYMENT RECEIVED
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* CARD */}
          {method === "CARD" && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold">Card Last 4 Digits</label>
                <Input
                  autoFocus
                  type="text"
                  maxLength={4}
                  placeholder="1234"
                  value={cardLast4}
                  onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ""))}
                  className="mt-1 h-14 text-center font-display text-2xl font-bold tracking-[0.3em]"
                />
              </div>
              <div className="rounded-lg border border-brand/40 bg-brand-soft px-3 py-2 text-xs font-medium">
                🟡 DEMO TRANSACTION — NOT A REAL PAYMENT
              </div>
              <Button className="h-14 w-full text-base font-bold" disabled={cardLast4.length !== 4} onClick={handleCard}>
                COMPLETE CARD PAYMENT — {money(total)}
              </Button>
            </div>
          )}
        </div>

        {method && (
          <div className="border-t px-5 py-3">
            <button onClick={() => { setMethod(null); setStkPayment(null); setStkPolling(false); setPaybillPayment(null); }} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
              ← Back to payment methods
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ===================== RECEIPT =====================

function ReceiptView({ sale, onNewSale }: { sale: Sale; onNewSale: () => void }) {
  if (!sale) return null;
  const payments = sale.payments.filter((p) => p.status === "SUCCESS");
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border bg-card p-6 text-foreground shadow-elegant">
          <div className="text-center">
            <div className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-xl gradient-brand text-2xl">🐔</div>
            <p className="font-display text-xl font-bold tracking-wide">BRATHAMATU</p>
            <p className="text-xs text-muted-foreground">Kuku POS</p>
            <div className="my-3 border-t border-dashed" />
            <p className="text-xs text-muted-foreground">Receipt</p>
            <p className="font-display text-base font-bold">{sale.receiptNo}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{new Date(sale.completedAt ?? sale.createdAt).toLocaleString("en-GB")}</p>
          </div>
          <div className="my-3 border-t border-dashed" />
          <div className="space-y-2">
            {sale.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{item.emoji} {item.productName}</p>
                  <p className="text-[11px] text-muted-foreground">{item.qtyLabel} @ {item.unitPriceLabel}</p>
                </div>
                <p className="font-display font-bold">{money(item.total)}</p>
              </div>
            ))}
          </div>
          <div className="my-3 border-t border-dashed" />
          <div className="space-y-1 text-sm">
            {sale.discount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Discount</span>
                <span>−{money(sale.discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-display text-lg font-extrabold">
              <span>TOTAL</span>
              <span>{money(sale.total)}</span>
            </div>
          </div>
          <div className="my-3 border-t border-dashed" />
          <div className="space-y-1 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payments</p>
            {payments.map((p) => (
              <div key={p.id}>
                <div className="flex justify-between">
                  <span>{PAYMENT_METHOD_LABELS[p.method]}</span>
                  <span className="font-semibold">{money(p.amount)}</span>
                </div>
                {p.paybillAccount && <p className="text-[10px] text-muted-foreground">Acct: {p.paybillAccount}</p>}
                {p.mpesaRef && <p className="text-[10px] text-muted-foreground">Ref: {p.mpesaRef}</p>}
              </div>
            ))}
          </div>
          <div className="my-3 border-t border-dashed" />
          <div className="text-center">
            <p className="font-display text-sm font-bold">PAID</p>
            <p className="font-display text-xl font-extrabold text-brand-deep">{money(sale.total)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Asante! Thank you!</p>
          </div>
          <div className="mt-3 rounded-lg border border-brand/40 bg-brand-soft px-3 py-2 text-center text-[10px] font-semibold">
            🟡 DEMO TRANSACTION — NOT A REAL PAYMENT
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-12" onClick={() => window.print()}>Print</Button>
          <Button className="h-12 font-bold" onClick={onNewSale}>New Sale</Button>
        </div>
      </div>
    </div>
  );
}
