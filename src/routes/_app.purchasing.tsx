import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Truck, Package } from "lucide-react";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import {
  upsertSupplier,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receiveGoods,
} from "@/demo/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, PageHeader, StatusPill } from "@/components/shared";
import { fmtDateTime, money } from "@/lib/money";

export const Route = createFileRoute("/_app/purchasing")({
  component: PurchasingPage,
});

function PurchasingPage() {
  const snap = useDemo();
  const navigate = useNavigate();
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);
  const [receivePo, setReceivePo] = useState<string | null>(null);

  useEffect(() => {
    if (snap && !can(snap.user?.role, "purchasing")) navigate({ to: "/dashboard", replace: true });
  }, [snap, navigate]);

  if (!snap?.db) return null;
  const db = snap.db;

  return (
    <div className="pb-10">
      <PageHeader
        title="Purchasing"
        subtitle="Suppliers, purchase orders and goods receiving"
        actions={
          <>
            <Button variant="outline" onClick={() => setSupplierOpen(true)}><Plus className="mr-1 h-4 w-4" /> Supplier</Button>
            <Button onClick={() => setPoOpen(true)}><Plus className="mr-1 h-4 w-4" /> Purchase Order</Button>
          </>
        }
      />
      <div className="px-4 py-5 md:px-6">
        <Tabs defaultValue="suppliers">
          <TabsList className="mb-4">
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="receipts">Goods Receipts</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers">
            {db.suppliers.length === 0 ? <EmptyState icon="🚚" title="No suppliers yet" /> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {db.suppliers.map((s) => (
                  <div key={s.id} className="rounded-xl border p-4">
                    <div className="flex items-center gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-lg"><Truck className="h-5 w-5" /></span>
                      <div><p className="font-semibold">{s.name}</p><p className="text-xs text-muted-foreground">{s.location}</p></div>
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      <p className="text-muted-foreground">{s.phone}</p>
                      <p className="text-muted-foreground">{s.email}</p>
                      <div className="flex flex-wrap gap-1 pt-1">{s.productsSupplied.map((p, i) => <Badge key={i} variant="secondary" className="text-[10px]">{p}</Badge>)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders">
            {db.purchaseOrders.length === 0 ? <EmptyState icon="📋" title="No purchase orders" /> : (
              <div className="space-y-2">
                {db.purchaseOrders.map((po) => {
                  const supplier = db.suppliers.find((s) => s.id === po.supplierId);
                  const totalCost = po.items.reduce((sum, i) => sum + i.qty * i.unitCost, 0);
                  return (
                    <div key={po.id} className="rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{po.ref} — {supplier?.name}</p>
                          <p className="text-xs text-muted-foreground">{fmtDateTime(po.createdAt)} · {money(totalCost)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusPill status={po.status} />
                          {po.status === "DRAFT" && can(snap.user?.role, "purchasing") && (
                            <Button size="sm" onClick={() => { updatePurchaseOrderStatus(po.id, "ORDERED"); toast.success(`${po.ref} sent`); }}>Send</Button>
                          )}
                          {(po.status === "ORDERED" || po.status === "PARTIALLY_RECEIVED") && can(snap.user?.role, "inventory_receive") && (
                            <Button size="sm" variant="outline" onClick={() => setReceivePo(po.id)}><Package className="mr-1 h-3 w-3" /> Receive</Button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        {po.items.map((i, idx) => {
                          const p = db.products.find((x) => x.id === i.productId);
                          return <span key={idx}>{p?.name} {i.receivedQty}/{i.qty} {i.unit} @ {money(i.unitCost)}{idx < po.items.length - 1 ? " · " : ""}</span>;
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="receipts">
            {db.goodsReceipts.length === 0 ? <EmptyState icon="📥" title="No goods receipts" /> : (
              <div className="space-y-2">
                {db.goodsReceipts.map((gr) => (
                  <div key={gr.id} className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold">{gr.ref}</p>
                      <p className="text-xs text-muted-foreground">{gr.items.length} item(s) · {fmtDateTime(gr.at)}</p>
                    </div>
                    <Badge variant="secondary">{gr.ref}</Badge>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {supplierOpen && <SupplierDialog onClose={() => setSupplierOpen(false)} />}
      {poOpen && <PoDialog onClose={() => setPoOpen(false)} />}
      {receivePo && <ReceiveDialog poId={receivePo} onClose={() => setReceivePo(null)} />}
    </div>
  );
}

function SupplierDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [products, setProducts] = useState("");

  function save() {
    if (!name.trim()) { toast.error("Name required"); return; }
    try {
      upsertSupplier({ name: name.trim(), phone, email, location, productsSupplied: products.split(",").map((s) => s.trim()).filter(Boolean) });
      toast.success("Supplier created");
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>New Supplier</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" /></div>
          <div><Label>Email</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
          <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} className="mt-1" /></div>
          <div><Label>Products supplied (comma separated)</Label><Input value={products} onChange={(e) => setProducts(e.target.value)} className="mt-1" placeholder="Whole Chicken, Drumsticks" /></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Create</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function PoDialog({ onClose }: { onClose: () => void }) {
  const snap = useDemo();
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<Record<string, { qty: string; cost: string }>>({});
  const [notes, setNotes] = useState("");
  if (!snap) return null;

  function save() {
    const itemList = Object.entries(items).map(([productId, v]) => ({ productId, qty: parseFloat(v.qty), unitCost: parseFloat(v.cost) })).filter((x) => x.qty > 0 && x.unitCost > 0);
    if (!supplierId || itemList.length === 0) { toast.error("Select supplier and add items"); return; }
    try {
      const ref = createPurchaseOrder({ supplierId, items: itemList, notes: notes.trim() || undefined });
      toast.success(`Purchase order created — ${ref}`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>New Purchase Order</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>{snap.db.suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Items</p>
            {snap.db.products.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{p.emoji} {p.name}</span>
                <Input type="number" step="0.001" placeholder="Qty" value={items[p.id]?.qty ?? ""} onChange={(e) => setItems((s) => ({ ...s, [p.id]: { ...s[p.id], qty: e.target.value, cost: s[p.id]?.cost ?? "" } }))} className="w-20" />
                <Input type="number" placeholder="Cost" value={items[p.id]?.cost ?? ""} onChange={(e) => setItems((s) => ({ ...s, [p.id]: { ...s[p.id], cost: e.target.value, qty: s[p.id]?.qty ?? "" } }))} className="w-24" />
              </div>
            ))}
          </div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" /></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Create PO</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function ReceiveDialog({ poId, onClose }: { poId: string; onClose: () => void }) {
  const snap = useDemo();
  const [received, setReceived] = useState<Record<string, string>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  if (!snap) return null;
  const po = snap.db.purchaseOrders.find((p) => p.id === poId);
  if (!po) return null;

  function save() {
    const lines = po!.items.map((it) => ({ productId: it.productId, receivedQty: parseFloat(received[it.productId] ?? "0") || 0, reason: reasons[it.productId]?.trim() || undefined }));
    try {
      const ref = receiveGoods(poId, snap!.db.branches[0].id, lines);
      toast.success(`Goods received — ${ref}`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>Receive Goods — {po.ref}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {po.items.map((it) => {
            const p = snap.db.products.find((x) => x.id === it.productId);
            const remaining = it.qty - it.receivedQty;
            return (
              <div key={it.productId} className="rounded-lg border p-3">
                <p className="font-medium text-sm">{p?.emoji} {p?.name}</p>
                <p className="text-xs text-muted-foreground">Ordered {it.qty} · Received {it.receivedQty} · Remaining {remaining} {it.unit}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Receiving now</Label><Input type="number" step="0.001" value={received[it.productId] ?? ""} onChange={(e) => setReceived((s) => ({ ...s, [it.productId]: e.target.value }))} className="mt-1" placeholder="0" /></div>
                  <div><Label className="text-xs">Reason (if short)</Label><Input value={reasons[it.productId] ?? ""} onChange={(e) => setReasons((s) => ({ ...s, [it.productId]: e.target.value }))} className="mt-1" /></div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Confirm Receipt</Button></div>
      </DialogContent>
    </Dialog>
  );
}
