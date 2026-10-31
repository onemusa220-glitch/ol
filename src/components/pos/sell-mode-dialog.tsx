import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmtKg, money, round2, round3 } from "@/lib/money";
import type { Product, SellingMode } from "@/demo/types";
import { useDemo } from "@/demo/hooks";

const MODE_META: Record<SellingMode, { label: string; emoji: string; hint: string }> = {
  weight: { label: "By Weight", emoji: "⚖️", hint: "KG or grams" },
  piece: { label: "By Piece", emoji: "🍗", hint: "Count pieces" },
  amount: { label: "By Amount", emoji: "💰", hint: "Customer budget" },
};

const QUICK_GRAMS = [100, 250, 500, 750, 1000];
const QUICK_AMOUNTS = [100, 200, 300, 500];

export interface DraftItemInput {
  productId: string;
  productName: string;
  emoji: string;
  mode: SellingMode;
  qtyKg?: number;
  pieces?: number;
  unitPrice: number;
  unitPriceLabel: string;
  qtyLabel: string;
  total: number;
  note?: string;
}

interface Props {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (item: DraftItemInput) => void;
  branchId: string;
}

export function SellModeDialog({ product, open, onOpenChange, onAdd, branchId }: Props) {
  const snap = useDemo();
  const [mode, setMode] = useState<SellingMode | null>(null);
  const [weightGrams, setWeightGrams] = useState<number>(500);
  const [weightUnit, setWeightUnit] = useState<"g" | "kg">("g");
  const [weightKgInput, setWeightKgInput] = useState<string>("0.5");
  const [pieces, setPieces] = useState(1);
  const [budget, setBudget] = useState<string>("");
  const [actualKg, setActualKg] = useState<string>("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open && product) {
      setMode(product.sellingModes.length === 1 ? product.sellingModes[0] : null);
      setWeightGrams(500);
      setWeightUnit("g");
      setWeightKgInput("0.5");
      setPieces(1);
      setBudget("");
      setActualKg("");
      setNote("");
    }
  }, [open, product]);

  const stockQty = useMemo(() => {
    if (!product || !snap) return 0;
    return snap.db.balances.find((b) => b.productId === product.id && b.branchId === branchId)?.qty ?? 0;
  }, [product, snap, branchId]);

  if (!product) return null;

  const kgPrice = product.pricePerKg ?? 0;
  const pcPrice = product.pricePerPiece ?? 0;
  const unitLabel = product.baseUnit === "KG" ? "KG" : "pcs";

  // --- weight mode ---
  const qtyKg =
    weightUnit === "g" ? round3(weightGrams / 1000) : round3(parseFloat(weightKgInput) || 0);
  const weightTotal = round2(qtyKg * kgPrice);
  const overStockWeight = product.baseUnit === "KG" && qtyKg > stockQty + 1e-9;

  // --- piece mode ---
  const pieceTotal = round2(pieces * pcPrice);
  const pieceWeight = round3(pieces * (product.pieceWeightKg ?? 0));
  const overStockPiece =
    product.baseUnit === "KG" ? pieceWeight > stockQty + 1e-9 : pieces > stockQty + 1e-9;

  // --- amount mode ---
  const budgetVal = parseFloat(budget) || 0;
  const isKgBased = product.baseUnit === "KG" || kgPrice > 0;
  const calcKg = isKgBased && kgPrice > 0 ? round3(budgetVal / kgPrice) : null;
  const calcPieces = !isKgBased ? Math.floor((budgetVal / pcPrice) * 100) / 100 : null;
  const actualVal = parseFloat(actualKg) || 0;
  const amountTotal = isKgBased ? round2(actualVal * kgPrice) : round2(actualVal * pcPrice);
  const overStockAmount =
    isKgBased && product.baseUnit === "KG" ? actualVal > stockQty + 1e-9 : actualVal > stockQty + 1e-9;

  function add() {
    if (!product || !mode) return;
    if (mode === "weight") {
      if (qtyKg <= 0 || overStockWeight) return;
      onAdd({
        productId: product.id,
        productName: product.name,
        emoji: product.emoji,
        mode: "weight",
        qtyKg,
        unitPrice: kgPrice,
        unitPriceLabel: `KSh ${kgPrice} / KG`,
        qtyLabel: fmtKg(qtyKg),
        total: weightTotal,
        note: note.trim() || undefined,
      });
    } else if (mode === "piece") {
      if (pieces <= 0 || overStockPiece) return;
      onAdd({
        productId: product.id,
        productName: product.name,
        emoji: product.emoji,
        mode: "piece",
        pieces,
        unitPrice: pcPrice,
        unitPriceLabel: `KSh ${pcPrice} / pc`,
        qtyLabel: `${pieces} ${pieces === 1 ? "piece" : "pieces"}`,
        total: pieceTotal,
        note: note.trim() || undefined,
      });
    } else {
      if (budgetVal <= 0) return;
      if (isKgBased) {
        const finalKg = actualKg === "" ? (calcKg ?? 0) : actualVal;
        if (finalKg <= 0 || overStockAmount) return;
        onAdd({
          productId: product.id,
          productName: product.name,
          emoji: product.emoji,
          mode: "amount",
          qtyKg: finalKg,
          unitPrice: kgPrice,
          unitPriceLabel: `KSh ${kgPrice} / KG`,
          qtyLabel: fmtKg(finalKg),
          total: round2(finalKg * kgPrice),
          note: note.trim() || undefined,
        });
      } else {
        const finalPieces = actualKg === "" ? (calcPieces ?? 0) : actualVal;
        if (finalPieces <= 0 || overStockAmount) return;
        onAdd({
          productId: product.id,
          productName: product.name,
          emoji: product.emoji,
          mode: "amount",
          pieces: finalPieces,
          unitPrice: pcPrice,
          unitPriceLabel: `KSh ${pcPrice} / pc`,
          qtyLabel: `${finalPieces} pcs`,
          total: round2(finalPieces * pcPrice),
          note: note.trim() || undefined,
        });
      }
    }
    onOpenChange(false);
  }

  const bigBtn = "h-16 text-base font-semibold rounded-xl";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl p-0 sm:max-w-md">
        <div className="sticky top-0 z-10 border-b bg-card/95 px-5 py-4 backdrop-blur">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="flex items-center gap-2 font-display text-lg">
              <span className="text-2xl">{product.emoji}</span> {product.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Stock: {product.baseUnit === "KG" ? fmtKg(stockQty) : `${round3(stockQty)} pcs`} ·{" "}
              {kgPrice > 0 && `KSh ${kgPrice}/KG `}{pcPrice > 0 && `· KSh ${pcPrice}/pc`}
            </p>
          </DialogHeader>
        </div>

        <div className="px-5 pb-5">
          {mode === null ? (
            <div className="space-y-2 py-2">
              <p className="text-sm font-semibold text-muted-foreground">How is the customer buying?</p>
              {product.sellingModes.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className="flex w-full items-center gap-4 rounded-xl border-2 bg-muted/40 px-4 py-4 text-left transition-colors hover:border-brand hover:bg-brand-soft"
                >
                  <span className="text-3xl">{MODE_META[m].emoji}</span>
                  <span>
                    <span className="block font-display text-lg font-bold">{MODE_META[m].label}</span>
                    <span className="block text-xs text-muted-foreground">{MODE_META[m].hint}</span>
                  </span>
                  <span className="ml-auto font-semibold text-muted-foreground">
                    {m === "piece" ? `KSh ${pcPrice} /pc` : `KSh ${kgPrice} /KG`}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <>
              {product.sellingModes.length > 1 && (
                <button
                  onClick={() => setMode(null)}
                  className="mb-3 text-xs font-semibold text-brand-deep underline-offset-2 hover:underline"
                >
                  ← Change selling mode
                </button>
              )}

              {mode === "weight" && (
                <div className="space-y-4 py-2">
                  <div className="flex gap-2">
                    <Button variant={weightUnit === "g" ? "default" : "outline"} size="sm" onClick={() => setWeightUnit("g")} className="flex-1">
                      GRAMS
                    </Button>
                    <Button variant={weightUnit === "kg" ? "default" : "outline"} size="sm" onClick={() => setWeightUnit("kg")} className="flex-1">
                      KILOGRAMS
                    </Button>
                  </div>
                  {weightUnit === "g" ? (
                    <>
                      <div>
                        <Label htmlFor="wgrams">Weight (grams)</Label>
                        <Input
                          id="wgrams"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          value={weightGrams || ""}
                          onChange={(e) => setWeightGrams(Math.max(0, parseInt(e.target.value) || 0))}
                          className="h-14 text-center font-display text-2xl font-bold"
                        />
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {QUICK_GRAMS.map((g) => (
                          <Button key={g} variant="outline" size="sm" onClick={() => setWeightGrams(g)} className="h-10 text-xs">
                            {g < 1000 ? `${g}g` : "1KG"}
                          </Button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label htmlFor="wkg">Weight (KG)</Label>
                      <Input
                        id="wkg"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min={0}
                        value={weightKgInput}
                        onChange={(e) => setWeightKgInput(e.target.value)}
                        className="h-14 text-center font-display text-2xl font-bold"
                      />
                    </div>
                  )}
                  {overStockWeight && (
                    <p className="text-sm font-semibold text-destructive">Only {fmtKg(stockQty)} available</p>
                  )}
                  <TotalBar label={`${fmtKg(qtyKg)} × KSh ${kgPrice}/KG`} total={weightTotal} disabled={qtyKg <= 0 || overStockWeight} onAdd={add} />
                </div>
              )}

              {mode === "piece" && (
                <div className="space-y-4 py-2">
                  <div>
                    <Label>Quantity (pieces)</Label>
                    <div className="mt-1 flex items-center gap-3">
                      <Button variant="outline" className="h-14 w-14 text-2xl" onClick={() => setPieces((p) => Math.max(1, p - 1))} aria-label="Decrease">−</Button>
                      <div className="flex-1 rounded-xl border bg-muted/40 py-2 text-center font-display text-3xl font-bold">{pieces}</div>
                      <Button variant="outline" className="h-14 w-14 text-2xl" onClick={() => setPieces((p) => p + 1)} aria-label="Increase">+</Button>
                    </div>
                  </div>
                  {product.pieceWeightKg ? (
                    <p className="text-xs text-muted-foreground">≈ {fmtKg(pieceWeight)} of stock will be deducted</p>
                  ) : null}
                  {overStockPiece && <p className="text-sm font-semibold text-destructive">Not enough stock for {pieces} pieces</p>}
                  <TotalBar label={`${pieces} × KSh ${pcPrice} / pc`} total={pieceTotal} disabled={pieces <= 0 || overStockPiece} onAdd={add} />
                </div>
              )}

              {mode === "amount" && (
                <div className="space-y-4 py-2">
                  <div>
                    <Label htmlFor="budget">Customer budget (KSh)</Label>
                    <Input
                      id="budget"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="e.g. 300"
                      value={budget}
                      onChange={(e) => {
                        setBudget(e.target.value);
                        setActualKg("");
                      }}
                      className="h-14 text-center font-display text-2xl font-bold"
                    />
                    <div className="mt-2 grid grid-cols-4 gap-2">
                      {QUICK_AMOUNTS.map((a) => (
                        <Button key={a} variant="outline" size="sm" onClick={() => { setBudget(String(a)); setActualKg(""); }} className="h-10 text-xs">
                          {a}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {budgetVal > 0 && (
                    <div className="rounded-xl border bg-muted/40 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer should receive</p>
                      <p className="font-display text-3xl font-bold text-brand-deep">
                        {isKgBased ? fmtKg(calcKg ?? 0) : `${calcPieces} pcs`}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        KSh {budgetVal} ÷ KSh {isKgBased ? kgPrice : pcPrice} {isKgBased ? "/ KG" : "/ pc"}
                      </p>
                      <div className="mt-3 border-t pt-3">
                        <Label htmlFor="actual">Confirm actual from scale ({isKgBased ? "KG" : "pcs"})</Label>
                        <Input
                          id="actual"
                          type="number"
                          inputMode="decimal"
                          step="0.001"
                          placeholder={String(isKgBased ? (calcKg ?? 0) : (calcPieces ?? 0))}
                          value={actualKg}
                          onChange={(e) => setActualKg(e.target.value)}
                          className="mt-1 h-12 text-center font-display text-xl font-bold"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          Leave empty to use exactly {isKgBased ? fmtKg(calcKg ?? 0) : `${calcPieces} pcs`} ·{" "}
                          <span className="font-semibold text-foreground">Total {money(amountTotal)}</span>
                        </p>
                      </div>
                    </div>
                  )}
                  {overStockAmount && <p className="text-sm font-semibold text-destructive">Only {fmtKg(stockQty)} available</p>}
                  <Button
                    className={`${bigBtn} w-full`}
                    disabled={budgetVal <= 0 || overStockAmount}
                    onClick={add}
                  >
                    ADD TO CART — {money(amountTotal)}
                  </Button>
                </div>
              )}

              {(mode === "weight" || mode === "piece") && (
                <div className="mt-3">
                  <Label htmlFor="note" className="text-xs">Note (optional)</Label>
                  <Textarea id="note" rows={2} placeholder="e.g. customer wants extra fresh" value={note} onChange={(e) => setNote(e.target.value)} className="text-sm" />
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TotalBar({ label, total, disabled, onAdd }: { label: string; total: number; disabled: boolean; onAdd: () => void }) {
  return (
    <div className="rounded-xl border bg-muted/40 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-bold">{money(total)}</p>
      </div>
      <Button className="mt-3 h-14 w-full text-base font-bold" disabled={disabled} onClick={onAdd}>
        ADD TO CART
      </Button>
    </div>
  );
}
