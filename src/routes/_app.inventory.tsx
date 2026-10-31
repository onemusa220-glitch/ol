import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Package, Trash2, Scissors, Sliders } from "lucide-react";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import {
  receiveStock,
  recordWastage,
  transferStock,
  adjustStock,
  convertStock,
} from "@/demo/engine";
import { MOVEMENT_LABELS } from "@/demo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, PageHeader, StatusPill } from "@/components/shared";
import { fmtKg, fmtDateTime, money } from "@/lib/money";

export const Route = createFileRoute("/_app/inventory")({
  component: InventoryPage,
});

type ModalKind = "receive" | "wastage" | "transfer" | "adjust" | "convert" | null;

function InventoryPage() {
  const snap = useDemo();
  const navigate = useNavigate();
  const [modal, setModal] = useState<ModalKind>(null);

  useEffect(() => {
    if (snap && !can(snap.user?.role, "inventory")) navigate({ to: "/dashboard", replace: true });
  }, [snap, navigate]);

  if (!snap?.db) return null;
  const db = snap.db;

  return (
    <div className="pb-10">
      <PageHeader
        title="Inventory"
        subtitle="Stock overview, movements, transfers, wastage, adjustments and conversions"
        actions={
          <>
            {can(snap.user?.role, "inventory_receive") && <Button variant="outline" onClick={() => setModal("receive")}><Package className="mr-1 h-4 w-4" /> Receive</Button>}
            <Button variant="outline" onClick={() => setModal("transfer")}><ArrowLeftRight className="mr-1 h-4 w-4" /> Transfer</Button>
            {can(snap.user?.role, "wastage") && <Button variant="outline" onClick={() => setModal("wastage")}><Trash2 className="mr-1 h-4 w-4" /> Wastage</Button>}
            <Button variant="outline" onClick={() => setModal("adjust")}><Sliders className="mr-1 h-4 w-4" /> Adjust</Button>
            <Button variant="outline" onClick={() => setModal("convert")}><Scissors className="mr-1 h-4 w-4" /> Convert</Button>
          </>
        }
      />
      <div className="px-4 py-5 md:px-6">
        <Tabs defaultValue="overview">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="movements">Movements</TabsTrigger>
            <TabsTrigger value="wastage">Wastage</TabsTrigger>
            <TabsTrigger value="transfers">Transfers</TabsTrigger>
            <TabsTrigger value="conversions">Conversions</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview">
            {db.balances.length === 0 ? (
              <EmptyState icon="📦" title="No stock data" />
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Branch</th>
                      <th className="p-3 text-right">Available</th>
                      <th className="p-3 text-right">Reorder Level</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {db.balances.map((b, i) => {
                      const p = db.products.find((x) => x.id === b.productId);
                      if (!p) return null;
                      const br = db.branches.find((x) => x.id === b.branchId);
                      const low = b.qty <= p.reorderLevel;
                      return (
                        <tr key={i} className="border-t">
                          <td className="p-3 font-medium">{p.emoji} {p.name}</td>
                          <td className="p-3 text-muted-foreground">{br?.name}</td>
                          <td className="p-3 text-right font-display font-bold">{p.baseUnit === "KG" ? fmtKg(b.qty) : `${b.qty} pcs`}</td>
                          <td className="p-3 text-right text-muted-foreground">{p.reorderLevel}</td>
                          <td className="p-3">{low ? <StatusPill status="PENDING" /> : <StatusPill status="COMPLETED" />}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Movements */}
          <TabsContent value="movements">
            {db.movements.length === 0 ? (
              <EmptyState icon="📜" title="No movements yet" />
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="p-3">Type</th><th className="p-3">Product</th><th className="p-3">Before</th>
                      <th className="p-3">Change</th><th className="p-3">After</th><th className="p-3">Ref</th><th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...db.movements].reverse().slice(0, 100).map((m) => {
                      const p = db.products.find((x) => x.id === m.productId);
                      return (
                        <tr key={m.id} className="border-t">
                          <td className="p-3"><Badge variant="secondary">{MOVEMENT_LABELS[m.type]}</Badge></td>
                          <td className="p-3 font-medium">{p?.emoji} {p?.name}</td>
                          <td className="p-3 text-right">{m.qtyBefore}</td>
                          <td className={`p-3 text-right font-semibold ${m.qtyChange > 0 ? "text-success" : "text-destructive"}`}>{m.qtyChange > 0 ? "+" : ""}{m.qtyChange}</td>
                          <td className="p-3 text-right">{m.qtyAfter}</td>
                          <td className="p-3 text-muted-foreground">{m.ref}</td>
                          <td className="p-3 text-muted-foreground">{fmtDateTime(m.at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* Wastage */}
          <TabsContent value="wastage">
            {db.wastage.length === 0 ? <EmptyState icon="🗑️" title="No wastage recorded" /> : (
              <div className="space-y-2">
                {db.wastage.map((w) => {
                  const p = db.products.find((x) => x.id === w.productId);
                  return (
                    <div key={w.id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                      <span className="font-medium">{p?.emoji} {p?.name} — {w.qty} {p?.baseUnit === "KG" ? "kg" : "pcs"}</span>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Badge variant="secondary">{w.reason}</Badge>
                        <span>{fmtDateTime(w.at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Transfers */}
          <TabsContent value="transfers">
            {db.transfers.length === 0 ? <EmptyState icon="🚚" title="No transfers yet" /> : (
              <div className="space-y-2">
                {db.transfers.map((t) => {
                  const from = db.branches.find((b) => b.id === t.fromBranchId);
                  const to = db.branches.find((b) => b.id === t.toBranchId);
                  return (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                      <div>
                        <span className="font-semibold">{t.ref}</span>
                        <span className="ml-2 text-muted-foreground">{from?.name} → {to?.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-muted-foreground">{t.items.length} item(s) · {fmtDateTime(t.at)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Conversions */}
          <TabsContent value="conversions">
            {db.conversions.length === 0 ? <EmptyState icon="✂️" title="No conversions yet" body="Cut whole chicken into parts." /> : (
              <div className="space-y-2">
                {db.conversions.map((c) => {
                  const inp = db.products.find((p) => p.id === c.input.productId);
                  return (
                    <div key={c.id} className="rounded-lg border px-4 py-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{c.ref}</span>
                        <Badge variant="secondary">{c.status}</Badge>
                      </div>
                      <div className="mt-2 text-muted-foreground">
                        Input: {inp?.emoji} {inp?.name} {c.input.qty} kg → Outputs: {c.outputs.map((o) => `${db.products.find((p) => p.id === o.productId)?.name} ${o.qty}kg`).join(", ")} · Waste: {c.wasteQty} kg
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {modal === "receive" && <ReceiveDialog onClose={() => setModal(null)} />}
      {modal === "wastage" && <WastageDialog onClose={() => setModal(null)} />}
      {modal === "transfer" && <TransferDialog onClose={() => setModal(null)} />}
      {modal === "adjust" && <AdjustDialog onClose={() => setModal(null)} />}
      {modal === "convert" && <ConvertDialog onClose={() => setModal(null)} />}
    </div>
  );
}

import { Badge } from "@/components/ui/badge";

function ReceiveDialog({ onClose }: { onClose: () => void }) {
  const snap = useDemo();
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  if (!snap) return null;

  function save() {
    try {
      const ref = receiveStock({
        productId,
        branchId: snap!.db.branches[0].id,
        qty: parseFloat(qty),
        unitCost: unitCost ? parseFloat(unitCost) : undefined,
      });
      toast.success(`Stock received — ${ref}`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Receive Stock</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>{snap.db.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.emoji} {p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Quantity ({productId ? snap.db.products.find((p) => p.id === productId)?.baseUnit : "units"})</Label><Input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1" /></div>
          <div><Label>Unit Cost (KSh, optional)</Label><Input type="number" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="mt-1" /></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!productId || !qty}>Receive</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function WastageDialog({ onClose }: { onClose: () => void }) {
  const snap = useDemo();
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState<"Spoilage" | "Damage" | "Expired" | "Other">("Spoilage");
  const [notes, setNotes] = useState("");
  if (!snap) return null;

  function save() {
    try {
      recordWastage({ productId, branchId: snap!.db.branches[0].id, qty: parseFloat(qty), reason, notes: notes.trim() || undefined });
      toast.success("Wastage recorded");
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Record Wastage</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{snap.db.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.emoji} {p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Quantity</Label><Input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1" /></div>
          <div><Label>Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{["Spoilage", "Damage", "Expired", "Other"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" /></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!productId || !qty}>Record</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({ onClose }: { onClose: () => void }) {
  const snap = useDemo();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [items, setItems] = useState<Record<string, string>>({});
  if (!snap) return null;

  function save() {
    const itemList = Object.entries(items).map(([productId, q]) => ({ productId, qty: parseFloat(q) })).filter((x) => x.qty > 0);
    if (itemList.length === 0) { toast.error("Add at least one item"); return; }
    try {
      const ref = transferStock({ fromBranchId: from, toBranchId: to, items: itemList });
      toast.success(`Transfer created — ${ref}`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>Stock Transfer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>From</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Branch" /></SelectTrigger>
                <SelectContent>{snap.db.branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>To</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Branch" /></SelectTrigger>
                <SelectContent>{snap.db.branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</p>
            {snap.db.products.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{p.emoji} {p.name}</span>
                <Input type="number" step="0.001" placeholder="0" value={items[p.id] ?? ""} onChange={(e) => setItems((s) => ({ ...s, [p.id]: e.target.value }))} className="w-24" />
                <span className="w-8 text-xs text-muted-foreground">{p.baseUnit}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!from || !to || from === to}>Transfer</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function AdjustDialog({ onClose }: { onClose: () => void }) {
  const snap = useDemo();
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  if (!snap) return null;

  function save() {
    try {
      const ref = adjustStock({ productId, branchId: snap!.db.branches[0].id, qty: parseFloat(qty), reason });
      toast.success(`Adjustment recorded — ${ref}`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Stock Adjustment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{snap.db.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.emoji} {p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Quantity (+/-)</Label><Input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} className="mt-1" placeholder="e.g. -2 or +5" /></div>
          <div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" /></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!productId || !qty || !reason.trim()}>Adjust</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function ConvertDialog({ onClose }: { onClose: () => void }) {
  const snap = useDemo();
  const [inputProductId, setInputProductId] = useState("");
  const [inputQty, setInputQty] = useState("");
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [wasteQty, setWasteQty] = useState("0");
  if (!snap) return null;

  function save() {
    const outs = Object.entries(outputs).map(([productId, q]) => ({ productId, qty: parseFloat(q) })).filter((x) => x.qty > 0);
    try {
      const ref = convertStock({ branchId: snap!.db.branches[0].id, inputProductId, inputQty: parseFloat(inputQty), outputs: outs, wasteQty: parseFloat(wasteQty) || 0 });
      toast.success(`Conversion complete — ${ref}`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  const inputP = snap.db.products.find((p) => p.id === inputProductId);
  const outputProducts = snap.db.products.filter((p) => p.id !== inputProductId && p.baseUnit === "KG");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>Stock Conversion / Cutting</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Input Product (whole chicken)</Label>
            <Select value={inputProductId} onValueChange={setInputProductId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{snap.db.products.filter((p) => p.baseUnit === "KG").map((p) => <SelectItem key={p.id} value={p.id}>{p.emoji} {p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Input Quantity (kg)</Label><Input type="number" step="0.001" value={inputQty} onChange={(e) => setInputQty(e.target.value)} className="mt-1" /></div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Output Products</p>
            {outputProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{p.emoji} {p.name}</span>
                <Input type="number" step="0.001" placeholder="0" value={outputs[p.id] ?? ""} onChange={(e) => setOutputs((s) => ({ ...s, [p.id]: e.target.value }))} className="w-24" />
                <span className="w-8 text-xs text-muted-foreground">kg</span>
              </div>
            ))}
          </div>
          <div><Label>Waste (kg)</Label><Input type="number" step="0.001" value={wasteQty} onChange={(e) => setWasteQty(e.target.value)} className="mt-1" /></div>
          <p className="text-xs text-muted-foreground">Outputs + waste must equal input quantity.</p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!inputProductId || !inputQty}>Convert</Button></div>
      </DialogContent>
    </Dialog>
  );
}
