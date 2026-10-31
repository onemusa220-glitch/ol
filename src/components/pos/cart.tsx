import { useState } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money, round2, round3 } from "@/lib/money";
import { addDraftItem, removeDraftItem, setDraftCustomer, setDraftDiscount, updateDraftItem } from "@/demo/engine";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import type { Customer, Sale, SaleItem, SellingMode } from "@/demo/types";
import { SellModeDialog, type DraftItemInput } from "./sell-mode-dialog";

const MODE_LABEL: Record<SellingMode, string> = {
  weight: "WEIGHT",
  piece: "PIECE",
  amount: "AMOUNT",
};

interface CartProps {
  sale: Sale | null;
  onCheckout: () => void;
  onNewSale: () => void;
  onSuspend: () => void;
}

export function Cart({ sale, onCheckout, onNewSale, onSuspend }: CartProps) {
  const snap = useDemo();
  const [discountOpen, setDiscountOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);

  if (!snap) return null;
  const items = sale?.items ?? [];
  const subtotal = round2(items.reduce((s, i) => s + i.total, 0));
  const discount = sale?.discount ?? 0;
  const total = round2(Math.max(0, subtotal - discount));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-pos-border px-4 py-3">
        <div>
          <h2 className="font-display text-base font-bold">CURRENT SALE</h2>
          <p className="text-[11px] text-pos-muted-foreground">
            {sale ? (sale.customerId ? snap.db.customers.find((c) => c.id === sale.customerId)?.name : "Walk-in customer") : "No items yet"}
          </p>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-8 text-xs text-pos-muted-foreground hover:text-pos-foreground" onClick={customerOpen ? undefined : () => setCustomerOpen(true)}>
            Customer
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3">
        {items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <span className="text-4xl">🛒</span>
            <p className="mt-3 text-sm font-semibold text-pos-foreground">Cart is empty</p>
            <p className="mt-1 text-xs text-pos-muted-foreground">Tap a product to start the sale</p>
          </div>
        ) : (
          items.map((item) => <CartRow key={item.id} saleId={sale!.id} item={item} />)
        )}
      </div>

      <div className="border-t border-pos-border px-4 py-3">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-pos-muted-foreground">
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="flex justify-between text-pos-muted-foreground">
            <button
              className="underline decoration-dotted underline-offset-2 hover:text-pos-foreground"
              onClick={() => setDiscountOpen(true)}
            >
              Discount {can(snap.user?.role, "pos_discount") ? "" : "(manager only)"}
            </button>
            <span>−{money(discount)}</span>
          </div>
          <div className="flex items-baseline justify-between border-t border-pos-border pt-2">
            <span className="font-display text-sm font-bold uppercase tracking-wider">Total</span>
            <span className="font-display text-3xl font-extrabold text-brand">{money(total)}</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11 border-pos-border text-pos-foreground hover:bg-pos-surface-2" onClick={onSuspend} disabled={!sale}>
            Suspend
          </Button>
          <Button
            variant="outline"
            className="h-11 border-pos-border text-pos-foreground hover:bg-pos-surface-2"
            onClick={onNewSale}
            disabled={!sale}
          >
            Clear
          </Button>
        </div>
        <Button
          className="mt-2 h-14 w-full font-display text-lg font-bold tracking-wide"
          disabled={!sale || items.length === 0}
          onClick={onCheckout}
        >
          CHECKOUT →
        </Button>
      </div>

      {discountOpen && sale && (
        <DiscountDialog
          sale={sale}
          canDiscount={can(snap.user.role, "pos_discount")}
          onClose={() => setDiscountOpen(false)}
        />
      )}
      {customerOpen && sale && <CustomerDialog sale={sale} onClose={() => setCustomerOpen(false)} />}
    </div>
  );
}

function CartRow({ saleId, item }: { saleId: string; item: SaleItem }) {
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);

  function adjust(delta: number) {
    if (item.mode === "piece") {
      const next = Math.max(1, (item.pieces ?? 1) + delta);
      updateDraftItem(saleId, item.id, { pieces: next });
    } else {
      const next = round3(Math.max(0.01, (item.qtyKg ?? 0) + delta / 1000));
      updateDraftItem(saleId, item.id, { qtyKg: next });
    }
  }

  return (
    <div className="rounded-xl bg-pos-surface p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.emoji} {item.productName}</p>
          <p className="mt-0.5 text-[11px] font-bold tracking-wider text-brand">{MODE_LABEL[item.mode]}</p>
          <p className="text-xs text-pos-muted-foreground">{item.qtyLabel} · {item.unitPriceLabel}</p>
          {item.note && <p className="mt-1 text-[11px] italic text-pos-muted-foreground">“{item.note}”</p>}
        </div>
        <div className="text-right">
          <p className="font-display text-base font-bold">{money(item.total)}</p>
          <div className="mt-1 flex items-center justify-end gap-1">
            {confirming ? (
              <>
                <Button size="sm" variant="destructive" className="h-7 px-2 text-[11px]" onClick={() => removeDraftItem(saleId, item.id)}>
                  Remove?
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px] text-pos-muted-foreground" onClick={() => setConfirming(false)}>
                  No
                </Button>
              </>
            ) : (
              <button
                className="rounded-md p-1.5 text-pos-muted-foreground transition-colors hover:bg-pos-surface-2 hover:text-destructive"
                aria-label={`Remove ${item.productName}`}
                onClick={() => setConfirming(true)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg border border-pos-border text-pos-foreground" onClick={() => adjust(-1)} aria-label="Decrease">
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button size="sm" variant="ghost" className="h-8 flex-1 rounded-lg border border-pos-border text-xs text-pos-foreground" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 rounded-lg border border-pos-border text-pos-foreground" onClick={() => adjust(1)} aria-label="Increase">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      {editing && (
        <EditItemDialog
          saleId={saleId}
          item={item}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function EditItemDialog({ saleId, item, onClose }: { saleId: string; item: SaleItem; onClose: () => void }) {
  const isPiece = item.mode === "piece";
  const [value, setValue] = useState(String(isPiece ? (item.pieces ?? 1) : round3((item.qtyKg ?? 0) * 1000)));
  const [note, setNote] = useState(item.note ?? "");

  function save() {
    if (isPiece) {
      updateDraftItem(saleId, item.id, { pieces: Math.max(1, parseInt(value) || 1) });
    } else {
      const grams = parseFloat(value) || 0;
      updateDraftItem(saleId, item.id, { qtyKg: round3(grams / 1000) });
    }
    updateDraftItem(saleId, item.id, {});
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl bg-card p-5 text-foreground" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-base font-bold">{item.productName}</p>
        <p className="mb-3 text-xs text-muted-foreground">{item.unitPriceLabel}</p>
        <Input
          autoFocus
          type="number"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-14 text-center font-display text-2xl font-bold"
          aria-label={isPiece ? "Pieces" : "Weight in grams"}
        />
        <p className="mt-1 text-center text-xs text-muted-foreground">{isPiece ? "pieces" : "grams"}</p>
        <div className="mt-3">
          <Input
            placeholder="Note (optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => updateDraftItem(saleId, item.id, { note: note.trim() || undefined })}
            className="text-sm"
          />
        </div>
        <Button className="mt-4 h-12 w-full font-bold" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}

function DiscountDialog({ sale, canDiscount, onClose }: { sale: Sale; canDiscount: boolean; onClose: () => void }) {
  const [value, setValue] = useState(String(sale.discount || ""));
  const subtotal = round2(sale.items.reduce((s, i) => s + i.total, 0));

  function apply() {
    if (!canDiscount) return;
    const v = parseFloat(value) || 0;
    if (v > subtotal) {
      setDraftDiscount(sale.id, subtotal);
      onClose();
      return;
    }
    setDraftDiscount(sale.id, v);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-xs rounded-2xl bg-card p-5 text-foreground" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-base font-bold">Discount</p>
        <p className="mb-3 text-xs text-muted-foreground">Subtotal {money(subtotal)}</p>
        {!canDiscount ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">Only managers can apply discounts.</p>
        ) : (
          <Input
            autoFocus
            type="number"
            inputMode="decimal"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-14 text-center font-display text-2xl font-bold"
            aria-label="Discount amount in KSh"
          />
        )}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-12" onClick={onClose}>Cancel</Button>
          <Button className="h-12 font-bold" disabled={!canDiscount} onClick={apply}>Apply</Button>
        </div>
      </div>
    </div>
  );
}

function CustomerDialog({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const snap = useDemo();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  if (!snap) return null;

  function pick(customerId: string | null) {
    setDraftCustomer(sale.id, customerId);
    onClose();
  }

  function createAndPick() {
    if (!name.trim()) return;
    import("@/demo/engine").then(({ upsertCustomer }) => {
      const c = upsertCustomer({ name: name.trim(), phone: phone.trim() });
      setDraftCustomer(sale.id, c.id);
      onClose();
    });
  }

  const customers: Customer[] = snap.db.customers;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-card p-5 text-foreground" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-base font-bold">Customer</p>
        <Button variant="outline" className="mt-2 h-11 w-full justify-start" onClick={() => pick(null)}>
          🚶 Walk-in customer
        </Button>
        <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registered</p>
        <div className="space-y-1.5">
          {customers.length === 0 && <p className="text-sm text-muted-foreground">No registered customers yet.</p>}
          {customers.map((c) => (
            <button
              key={c.id}
              onClick={() => pick(c.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${sale.customerId === c.id ? "border-brand bg-brand-soft" : ""}`}
            >
              <span className="font-semibold">{c.name}</span>
              <span className="block text-xs text-muted-foreground">{c.phone}</span>
            </button>
          ))}
        </div>
        <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick add</p>
        <div className="flex gap-2">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="text-sm" aria-label="Customer name" />
          <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="text-sm" aria-label="Customer phone" />
        </div>
        <Button className="mt-2 h-11 w-full" disabled={!name.trim()} onClick={createAndPick}>Add customer</Button>
      </div>
    </div>
  );
}

export type { DraftItemInput };
export { addDraftItem };
