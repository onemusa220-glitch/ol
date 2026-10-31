import type { DemoDB, Sale, SaleItem } from "./types";
import { round2, round3 } from "@/lib/money";

const DAY = 86_400_000;

export function completedSales(db: DemoDB): Sale[] {
  return db.sales.filter((s) => s.status === "COMPLETED");
}

function itemCost(db: DemoDB, item: SaleItem): number {
  const p = db.products.find((x) => x.id === item.productId);
  if (!p) return 0;
  if (item.mode === "piece") {
    if (p.baseUnit === "KG") return (item.pieces ?? 0) * (p.pieceWeightKg ?? 0) * (p.costPerKg ?? 0);
    return (item.pieces ?? 0) * (p.costPerPiece ?? 0);
  }
  return (item.qtyKg ?? 0) * (p.costPerKg ?? 0);
}

export function saleProfit(db: DemoDB, sale: Sale): number {
  return round2(sale.items.reduce((sum, i) => sum + i.total - itemCost(db, i), 0));
}

function inRange(iso: string, from?: number, to?: number): boolean {
  const t = new Date(iso).getTime();
  if (from && t < from) return false;
  if (to && t > to) return false;
  return true;
}

export function salesInRange(db: DemoDB, from?: number, to?: number): Sale[] {
  return completedSales(db).filter((s) => inRange(s.completedAt ?? s.createdAt, from, to));
}

export interface DayPoint {
  label: string;
  sales: number;
  profit: number;
}

export function salesTrend(db: DemoDB, days = 7): DayPoint[] {
  const out: DayPoint[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = start.getTime() + DAY;
    const sales = salesInRange(db, start.getTime(), end);
    out.push({
      label: d.toLocaleDateString("en-GB", { weekday: "short" }),
      sales: round2(sales.reduce((s, x) => s + x.total, 0)),
      profit: round2(sales.reduce((s, x) => s + saleProfit(db, x), 0)),
    });
  }
  return out;
}

export function paymentBreakdown(db: DemoDB, from?: number, to?: number): { method: string; amount: number; count: number }[] {
  const map = new Map<string, { amount: number; count: number }>();
  for (const sale of salesInRange(db, from, to)) {
    for (const p of sale.payments) {
      if (p.status !== "SUCCESS") continue;
      const key = p.method;
      const cur = map.get(key) ?? { amount: 0, count: 0 };
      cur.amount += p.amount;
      cur.count += 1;
      map.set(key, cur);
    }
  }
  return [...map.entries()].map(([method, v]) => ({ method, ...v, amount: round2(v.amount) })).sort((a, b) => b.amount - a.amount);
}

export function itemsSoldCount(sales: Sale[]): number {
  return sales.reduce((sum, s) => sum + s.items.length, 0);
}

export function dashboardStats(db: DemoDB) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const yestStart = todayStart.getTime() - DAY;
  const today = salesInRange(db, todayStart.getTime(), Date.now());
  const yesterday = salesInRange(db, yestStart, todayStart.getTime());
  return {
    todaySales: round2(today.reduce((s, x) => s + x.total, 0)),
    todayProfit: round2(today.reduce((s, x) => s + saleProfit(db, x), 0)),
    todayTransactions: today.length,
    todayItems: itemsSoldCount(today),
    yestSales: round2(yesterday.reduce((s, x) => s + x.total, 0)),
    paymentBreakdown: paymentBreakdown(db, todayStart.getTime(), Date.now()),
    bestSellers: productPerformance(db, Date.now() - 7 * DAY, Date.now()).slice(0, 5),
    lowStock: lowStockProducts(db),
    recentSales: completedSales(db)
      .sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))
      .slice(0, 8),
    trend: salesTrend(db, 7),
    pendingPayments: db.sales
      .filter((s) => ["PENDING_PAYMENT", "PARTIALLY_PAID"].includes(s.status))
      .map((s) => ({ sale: s, balance: round2(s.total - s.payments.filter((p) => p.status === "SUCCESS").reduce((x, p) => x + p.amount, 0)) })),
    unmatchedPaybill: db.paybillInbox.filter((i) => i.status === "UNMATCHED"),
    shiftsUnderReview: db.shifts.filter((s) => s.status === "UNDER_REVIEW"),
    stockTakesToReview: db.stockTakes.filter((s) => s.status === "SUBMITTED"),
  };
}

export interface ProductPerfRow {
  productId: string;
  name: string;
  emoji: string;
  qtyLabel: string;
  revenue: number;
  cost: number;
  profit: number;
  transactions: number;
}

export function productPerformance(db: DemoDB, from?: number, to?: number): ProductPerfRow[] {
  const map = new Map<string, ProductPerfRow>();
  for (const sale of salesInRange(db, from, to)) {
    for (const item of sale.items) {
      const row = map.get(item.productId) ?? {
        productId: item.productId,
        name: item.productName,
        emoji: item.emoji,
        qtyLabel: "",
        revenue: 0,
        cost: 0,
        profit: 0,
        transactions: 0,
      };
      const cost = itemCost(db, item);
      row.revenue = round2(row.revenue + item.total);
      row.cost = round2(row.cost + cost);
      row.profit = round2(row.revenue - row.cost);
      row.transactions += 1;
      // quantity accumulation in base units
      const p = db.products.find((x) => x.id === item.productId)!;
      const baseQty = item.mode === "piece" ? (p.baseUnit === "KG" ? (item.pieces ?? 0) * (p.pieceWeightKg ?? 0) : item.pieces ?? 0) : item.qtyKg ?? 0;
      row.qtyLabel = `${round2((parseFloat(row.qtyLabel) || 0) + baseQty)} ${p.baseUnit}`;
      map.set(item.productId, row);
      void p;
    }
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue);
}

export function lowStockProducts(db: DemoDB, branchId?: string): { product: DemoDB["products"][number]; qty: number; branchId: string }[] {
  const out: { product: DemoDB["products"][number]; qty: number; branchId: string }[] = [];
  for (const bal of db.balances) {
    if (branchId && bal.branchId !== branchId) continue;
    const p = db.products.find((x) => x.id === bal.productId);
    if (!p || !p.active) continue;
    if (bal.qty <= p.reorderLevel) out.push({ product: p, qty: round3(bal.qty), branchId: bal.branchId });
  }
  return out.sort((a, b) => a.qty - b.qty);
}

export function salesReport(db: DemoDB, from?: number, to?: number) {
  const sales = salesInRange(db, from, to);
  const byDay = new Map<string, number>();
  for (const s of sales) {
    const key = new Date(s.completedAt ?? s.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
    byDay.set(key, round2((byDay.get(key) ?? 0) + s.total));
  }
  const discounts = sales.reduce((sum, s) => sum + s.discount, 0);
  return {
    sales,
    total: round2(sales.reduce((s, x) => s + x.total, 0)),
    profit: round2(sales.reduce((s, x) => s + saleProfit(db, x), 0)),
    transactions: sales.length,
    items: itemsSoldCount(sales),
    avgSale: sales.length ? round2(sales.reduce((s, x) => s + x.total, 0) / sales.length) : 0,
    discounts: round2(discounts),
    byDay: [...byDay.entries()].map(([label, total]) => ({ label, total })),
    byPayment: paymentBreakdown(db, from, to),
  };
}

export interface InventoryReportRow {
  productId: string;
  name: string;
  unit: string;
  opening: number;
  received: number;
  sold: number;
  wasted: number;
  adjusted: number;
  closing: number;
}

export function inventoryReport(db: DemoDB, from: number, branchId: string): InventoryReportRow[] {
  const rows: InventoryReportRow[] = [];
  for (const p of db.products) {
    const movs = db.movements.filter((m) => m.productId === p.id && m.branchId === branchId && new Date(m.at).getTime() >= from);
    const openingBal = db.balances.find((b) => b.productId === p.id && b.branchId === branchId)?.qty ?? 0;
    const sum = (t: string) => movs.filter((m) => m.type === t).reduce((s, m) => s + m.qtyChange, 0);
    const received = sum("PURCHASE_RECEIVED");
    const sold = -sum("SALE");
    const returned = sum("SALE_RETURN");
    const wasted = -sum("WASTAGE");
    const convertedIn = sum("CONVERSION_INPUT");
    const convertedOut = sum("CONVERSION_OUTPUT");
    const adjusted = movs.filter((m) => ["ADJUSTMENT", "STOCK_TAKE"].includes(m.type)).reduce((s, m) => s + m.qtyChange, 0);
    const transferredOut = -sum("TRANSFER_OUT");
    const transferredIn = sum("TRANSFER_IN");
    const opening = round3(openingBal - (received + returned + convertedOut + transferredIn + adjusted) + (sold + wasted + convertedIn + transferredOut));
    rows.push({
      productId: p.id,
      name: p.name,
      unit: p.baseUnit,
      opening: round3(opening),
      received: round3(received),
      sold: round3(sold),
      wasted: round3(wasted),
      adjusted: round3(adjusted + returned + convertedOut - convertedIn + transferredIn - transferredOut),
      closing: round3(openingBal),
    });
  }
  return rows;
}

export function wastageReport(db: DemoDB, from?: number, to?: number) {
  const rows = db.wastage.filter((w) => inRange(w.at, from, to));
  return rows.map((w) => {
    const p = db.products.find((x) => x.id === w.productId);
    const unitCost = p?.baseUnit === "KG" ? (p.costPerKg ?? 0) : (p?.costPerPiece ?? 0);
    return { ...w, productName: p?.name ?? w.productId, unit: p?.baseUnit ?? "KG", value: round2(w.qty * unitCost) };
  });
}

export function varianceReport(db: DemoDB) {
  return db.stockTakes
    .filter((s) => ["APPROVED", "UNDER_REVIEW", "SUBMITTED"].includes(s.status))
    .flatMap((st) =>
      st.items
        .filter((i) => i.countedQty !== undefined && Math.abs((i.countedQty ?? 0) - i.systemQty) > 1e-9)
        .map((i) => ({
          ref: st.ref,
          status: st.status,
          productId: i.productId,
          productName: db.products.find((p) => p.id === i.productId)?.name ?? i.productId,
          unit: db.products.find((p) => p.id === i.productId)?.baseUnit ?? "KG",
          expected: i.systemQty,
          actual: i.countedQty ?? 0,
          diff: round3((i.countedQty ?? 0) - i.systemQty),
        })),
    );
}
