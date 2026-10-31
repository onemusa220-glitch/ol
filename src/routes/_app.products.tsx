import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Power } from "lucide-react";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import { upsertProduct, upsertCategory, setProductActive } from "@/demo/engine";
import type { BaseUnit, Product, SellingMode } from "@/demo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, StatusPill } from "@/components/shared";
import { fmtKg, money } from "@/lib/money";

export const Route = createFileRoute("/_app/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const snap = useDemo();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [catOpen, setCatOpen] = useState(false);

  useEffect(() => {
    if (snap && !can(snap.user?.role, "products")) navigate({ to: "/dashboard", replace: true });
  }, [snap, navigate]);

  if (!snap?.db) return null;
  const db = snap.db;

  return (
    <div className="pb-10">
      <PageHeader
        title="Products"
        subtitle={`${db.products.length} products · ${db.categories.length} categories`}
        actions={
          <>
            <Button variant="outline" onClick={() => setCatOpen(true)}><Plus className="mr-1 h-4 w-4" /> Category</Button>
            <Button onClick={() => setEditing("new")}><Plus className="mr-1 h-4 w-4" /> New Product</Button>
          </>
        }
      />
      <div className="space-y-3 px-4 py-5 md:px-6">
        {db.products.length === 0 ? (
          <EmptyState icon="📦" title="No products yet" body="Create your first product." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {db.products.map((p) => {
              const cat = db.categories.find((c) => c.id === p.categoryId);
              const bal = db.balances.find((b) => b.productId === p.id && b.branchId === db.branches[0].id)?.qty ?? 0;
              return (
                <div key={p.id} className={`rounded-xl border p-4 ${!p.active ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{p.emoji}</span>
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{cat?.name} · {p.sku}</p>
                      </div>
                    </div>
                    <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Active" : "Inactive"}</Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Base unit</span><span className="font-medium">{p.baseUnit}</span></div>
                    {p.pricePerKg && <div className="flex justify-between"><span className="text-muted-foreground">Price / KG</span><span className="font-medium">{money(p.pricePerKg)}</span></div>}
                    {p.pricePerPiece && <div className="flex justify-between"><span className="text-muted-foreground">Price / piece</span><span className="font-medium">{money(p.pricePerPiece)}</span></div>}
                    <div className="flex justify-between"><span className="text-muted-foreground">Stock</span><span className="font-medium">{p.baseUnit === "KG" ? fmtKg(bal) : `${bal} pcs`}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Reorder at</span><span className="font-medium">{p.reorderLevel} {p.baseUnit === "KG" ? "kg" : "pcs"}</span></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.sellingModes.map((m) => (
                      <Badge key={m} variant="secondary" className="text-[10px]">{m === "weight" ? "⚖️ Weight" : m === "piece" ? "🍗 Piece" : "💰 Amount"}</Badge>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(p)}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
                    {can(snap.user?.role, "products") && (
                      <Button size="sm" variant="ghost" onClick={() => { setProductActive(p.id, !p.active); toast.success(`${p.name} ${p.active ? "disabled" : "enabled"}`); }}>
                        <Power className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <ProductDialog product={editing === "new" ? null : editing} onClose={() => setEditing(null)} />
      )}
      {catOpen && <CategoryDialog onClose={() => setCatOpen(false)} />}
    </div>
  );
}

const EMOJIS = ["🐔", "🍗", "🫀", "🥚", "📦", "🦴", "🔥"];

function ProductDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const snap = useDemo();
  if (!snap) return null;
  const cats = snap.db.categories;

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [emoji, setEmoji] = useState(product?.emoji ?? "🍗");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? cats[0]?.id ?? "");
  const [baseUnit, setBaseUnit] = useState<BaseUnit>(product?.baseUnit ?? "KG");
  const [modes, setModes] = useState<SellingMode[]>(product?.sellingModes ?? ["weight"]);
  const [pricePerKg, setPricePerKg] = useState(String(product?.pricePerKg ?? ""));
  const [pricePerPiece, setPricePerPiece] = useState(String(product?.pricePerPiece ?? ""));
  const [pieceWeightKg, setPieceWeightKg] = useState(String(product?.pieceWeightKg ?? ""));
  const [costPerKg, setCostPerKg] = useState(String(product?.costPerKg ?? ""));
  const [costPerPiece, setCostPerPiece] = useState(String(product?.costPerPiece ?? ""));
  const [reorderLevel, setReorderLevel] = useState(String(product?.reorderLevel ?? "0"));

  function toggleMode(m: SellingMode) {
    setModes((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  }

  function save() {
    if (!name.trim()) { toast.error("Name required"); return; }
    if (modes.length === 0) { toast.error("Select at least one selling mode"); return; }
    try {
      upsertProduct({
        id: product?.id,
        name: name.trim(),
        sku: sku.trim(),
        emoji,
        categoryId,
        baseUnit,
        sellingModes: modes,
        pricePerKg: pricePerKg ? parseFloat(pricePerKg) : undefined,
        pricePerPiece: pricePerPiece ? parseFloat(pricePerPiece) : undefined,
        pieceWeightKg: pieceWeightKg ? parseFloat(pieceWeightKg) : undefined,
        costPerKg: costPerKg ? parseFloat(costPerKg) : undefined,
        costPerPiece: costPerPiece ? parseFloat(costPerPiece) : undefined,
        reorderLevel: parseInt(reorderLevel) || 0,
        active: product?.active ?? true,
      });
      toast.success(product ? "Product updated" : "Product created");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{product ? "Edit Product" : "New Product"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-20">
              <Label>Emoji</Label>
              <Select value={emoji} onValueChange={setEmoji}>
                <SelectTrigger className="mt-1 h-12 text-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>{EMOJIS.map((e) => <SelectItem key={e} value={e} className="text-2xl">{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" placeholder="e.g. Drumsticks" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="sku">SKU</Label><Input id="sku" value={sku} onChange={(e) => setSku(e.target.value)} className="mt-1" /></div>
            <div>
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Base Inventory Unit</Label>
            <Select value={baseUnit} onValueChange={(v) => setBaseUnit(v as BaseUnit)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="KG">KG (kilogram)</SelectItem>
                <SelectItem value="PIECE">PIECE (count)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Selling Modes</Label>
            <div className="mt-1 flex flex-wrap gap-4">
              {(["weight", "piece", "amount"] as SellingMode[]).map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={modes.includes(m)} onCheckedChange={() => toggleMode(m)} />
                  {m === "weight" ? "⚖️ Weight (KG/grams)" : m === "piece" ? "🍗 Piece" : "💰 Customer Amount"}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {modes.includes("weight") && (
              <div><Label htmlFor="pkg">Price / KG (KSh)</Label><Input id="pkg" type="number" value={pricePerKg} onChange={(e) => setPricePerKg(e.target.value)} className="mt-1" /></div>
            )}
            {modes.includes("piece") && (
              <div><Label htmlFor="ppp">Price / piece (KSh)</Label><Input id="ppp" type="number" value={pricePerPiece} onChange={(e) => setPricePerPiece(e.target.value)} className="mt-1" /></div>
            )}
            {modes.includes("piece") && baseUnit === "KG" && (
              <div><Label htmlFor="pwk">Piece weight (kg)</Label><Input id="pwk" type="number" step="0.01" value={pieceWeightKg} onChange={(e) => setPieceWeightKg(e.target.value)} className="mt-1" /></div>
            )}
            <div><Label htmlFor="ckg">Cost / KG (KSh)</Label><Input id="ckg" type="number" value={costPerKg} onChange={(e) => setCostPerKg(e.target.value)} className="mt-1" /></div>
            <div><Label htmlFor="cpc">Cost / piece (KSh)</Label><Input id="cpc" type="number" value={costPerPiece} onChange={(e) => setCostPerPiece(e.target.value)} className="mt-1" /></div>
            <div><Label htmlFor="rl">Reorder level</Label><Input id="rl" type="number" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className="mt-1" /></div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{product ? "Save Changes" : "Create Product"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategoryDialog({ onClose }: { onClose: () => void }) {
  const snap = useDemo();
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📦");
  if (!snap) return null;

  function save() {
    if (!name.trim()) { toast.error("Category name required"); return; }
    try {
      upsertCategory({ name: name.trim(), emoji });
      toast.success("Category created");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>New Category</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="w-20">
              <Label>Emoji</Label>
              <Select value={emoji} onValueChange={setEmoji}>
                <SelectTrigger className="mt-1 text-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>{["🐔","🍗","🫀","📦","🥚"].map((e) => <SelectItem key={e} value={e} className="text-2xl">{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="cn">Name</Label>
              <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
            </div>
          </div>
          {snap.db.categories.length > 0 && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Existing</p>
              <div className="flex flex-wrap gap-1.5">
                {snap.db.categories.map((c) => <Badge key={c.id} variant="secondary">{c.emoji} {c.name}</Badge>)}
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Create</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
