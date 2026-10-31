/*
 * BrathaMatu demo engine — the client-side "backend" for demo mode.
 * Mirrors the Laravel services (InventoryService, SaleService, PaymentService).
 * All inventory changes go through applyMovement; all money state transitions
 * through evaluateSale. UI code never mutates balances directly.
 */
import { buildSeed } from "./seed";
import type {
  CashMovementType,
  Customer,
  DemoDB,
  Payment,
  PaymentMethod,
  PaymentStatus,
  Product,
  Sale,
  SaleItem,
  SellingMode,
  StockTake,
  UserProfile,
} from "./types";
import { round2, round3 } from "@/lib/money";

const DB_KEY = "brm_demo_db_v1";
const SESSION_KEY = "brm_demo_session_v1";

export interface Snap {
  db: DemoDB;
  user: UserProfile | null;
}

let snap: Snap | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function init() {
  if (typeof window === "undefined" || initialized) return;
  initialized = true;
  let db: DemoDB | null = null;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) db = JSON.parse(raw) as DemoDB;
    if (db && !db.settings) db = null;
  } catch {
    db = null;
  }
  if (!db) db = buildSeed();
  let user: UserProfile | null = null;
  try {
    const sid = localStorage.getItem(SESSION_KEY);
    if (sid) user = db.users.find((u) => u.id === sid && u.active) ?? null;
  } catch {
    user = null;
  }
  snap = { db, user };
  persist();
}

function persist() {
  try {
    if (snap) localStorage.setItem(DB_KEY, JSON.stringify(snap.db));
  } catch {
    // storage full/unavailable — keep in-memory state
  }
}

function notify() {
  listeners.forEach((l) => l());
}

export function subscribe(cb: () => void): () => void {
  init();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getSnapshot(): Snap | null {
  init();
  return snap;
}

export const getServerSnapshot = (): Snap | null => null;

/** Clone-mutate-commit. Validation errors thrown inside fn abort the change. */
function commit<T>(fn: (db: DemoDB) => T): T {
  init();
  if (!snap) throw new Error("Demo store unavailable");
  const next = structuredClone(snap.db) as DemoDB;
  const result = fn(next);
  const user = snap.user ? (next.users.find((u) => u.id === snap!.user!.id) ?? null) : null;
  snap = { db: next, user };
  persist();
  notify();
  return result;
}

function nowIso() {
  return new Date().toISOString();
}

function nextNum(db: DemoDB, key: string): number {
  db.counters[key] = (db.counters[key] ?? 0) + 1;
  return db.counters[key];
}

function pad(n: number, len = 6): string {
  return String(n).padStart(len, "0");
}

function requireUser(): UserProfile {
  const s = getSnapshot();
  if (!s?.user) throw new Error("Not signed in");
  return s.user;
}

function audit(db: DemoDB, action: string, detail: string, userId?: string) {
  db.auditLogs.push({ id: `log-${Date.now()}-${Math.floor(Math.random() * 1e6)}`, userId: userId ?? "system", action, detail, at: nowIso() });
}

// ---------- inventory core ----------

function ensureBalance(db: DemoDB, productId: string, branchId: string) {
  let bal = db.balances.find((b) => b.productId === productId && b.branchId === branchId);
  if (!bal) {
    bal = { productId, branchId, qty: 0 };
    db.balances.push(bal);
  }
  return bal;
}

export function applyMovement(
  db: DemoDB,
  productId: string,
  branchId: string,
  type: DemoDB["movements"][number]["type"],
  qtyChange: number,
  ref: string,
  userId: string,
) {
  const bal = ensureBalance(db, productId, branchId);
  const qtyBefore = bal.qty;
  const qtyAfter = round3(qtyBefore + qtyChange);
  if (qtyAfter < -1e-9) {
    const p = db.products.find((x) => x.id === productId);
    throw new Error(`Insufficient stock for ${p?.name ?? productId} (${round3(qtyBefore)} available, ${round3(Math.abs(qtyChange))} needed)`);
  }
  bal.qty = Math.max(0, qtyAfter);
  db.movements.push({
    id: `mv-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    productId,
    branchId,
    type,
    qtyBefore: round3(qtyBefore),
    qtyChange: round3(qtyChange),
    qtyAfter: round3(qtyAfter),
    ref,
    userId,
    at: nowIso(),
  });
}

/** Base-unit quantity a sale item deducts (negative). */
export function saleItemQtyChange(db: DemoDB, item: SaleItem): number {
  const p = db.products.find((x) => x.id === item.productId)!;
  if (item.mode === "piece") {
    return p.baseUnit === "KG" ? -round3((item.pieces ?? 0) * (p.pieceWeightKg ?? 0)) : -(item.pieces ?? 0);
  }
  return -round3(item.qtyKg ?? 0);
}

// ---------- auth ----------

export function login(email: string, password: string): UserProfile {
  return commit((db) => {
    const u = db.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u || u.password !== password || !u.active) throw new Error("Invalid email or password");
    localStorage.setItem(SESSION_KEY, u.id);
    audit(db, "LOGIN", `${u.name} signed in`, u.id);
    return u;
  });
}

export function logout() {
  init();
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
  if (snap) {
    snap = { ...snap, user: null };
    notify();
  }
}

// ---------- catalog ----------

export function upsertProduct(p: Partial<Product> & { id?: string; name: string }): Product {
  return commit((db) => {
    const user = requireUser();
    if (p.id) {
      const existing = db.products.find((x) => x.id === p.id);
      if (!existing) throw new Error("Product not found");
      Object.assign(existing, p);
      audit(db, "PRODUCT_UPDATED", `${existing.name} updated`, user.id);
      return existing;
    }
    const created: Product = {
      id: `p-${Date.now().toString(36)}`,
      name: p.name,
      sku: p.sku || `BRM-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      categoryId: p.categoryId ?? db.categories[0].id,
      emoji: p.emoji || "🍗",
      baseUnit: p.baseUnit ?? "KG",
      sellingModes: p.sellingModes ?? ["weight"],
      pricePerKg: p.pricePerKg,
      pricePerPiece: p.pricePerPiece,
      pieceWeightKg: p.pieceWeightKg,
      costPerKg: p.costPerKg,
      costPerPiece: p.costPerPiece,
      reorderLevel: p.reorderLevel ?? 0,
      active: p.active ?? true,
    };
    if (created.sellingModes.includes("weight") && !created.pricePerKg) throw new Error("Weight selling requires a price per KG");
    if (created.sellingModes.includes("piece") && !created.pricePerPiece) throw new Error("Piece selling requires a price per piece");
    if (created.sellingModes.includes("amount") && !created.pricePerKg && !created.pricePerPiece) throw new Error("Amount selling requires a price");
    db.products.push(created);
    audit(db, "PRODUCT_CREATED", `${created.name} created`, user.id);
    return created;
  });
}

export function setProductActive(productId: string, active: boolean) {
  commit((db) => {
    const p = db.products.find((x) => x.id === productId);
    if (!p) throw new Error("Product not found");
    p.active = active;
    audit(db, active ? "PRODUCT_ENABLED" : "PRODUCT_DISABLED", p.name, requireUser().id);
  });
}

export function upsertCategory(cat: { id?: string; name: string; emoji: string }) {
  commit((db) => {
    if (cat.id) {
      const c = db.categories.find((x) => x.id === cat.id);
      if (!c) throw new Error("Category not found");
      c.name = cat.name;
      c.emoji = cat.emoji;
      return;
    }
    db.categories.push({ id: `c-${Date.now().toString(36)}`, name: cat.name, emoji: cat.emoji });
    audit(db, "CATEGORY_CREATED", cat.name, requireUser().id);
  });
}

export function upsertCustomer(c: { id?: string; name: string; phone: string }) {
  return commit((db): Customer => {
    if (c.id) {
      const existing = db.customers.find((x) => x.id === c.id);
      if (!existing) throw new Error("Customer not found");
      existing.name = c.name;
      existing.phone = c.phone;
      return existing;
    }
    const created: Customer = { id: `cust-${Date.now().toString(36)}`, name: c.name, phone: c.phone, createdAt: nowIso() };
    db.customers.push(created);
    return created;
  });
}

// ---------- settings / demo reset ----------

export function updateSettings(patch: Partial<DemoDB["settings"]>) {
  commit((db) => {
    Object.assign(db.settings, patch);
    audit(db, "SETTINGS_UPDATED", Object.keys(patch).join(", "), requireUser().id);
  });
}

/** Super Admin only (enforced in UI). Rebuilds the demo database from seed. */
export function resetDemoData() {
  init();
  if (!snap) return;
  const fresh = buildSeed();
  const keepUser = fresh.users.find((u) => u.id === snap!.user?.id) ?? null;
  snap = { db: fresh, user: keepUser };
  persist();
  notify();
}

// ---------- POS: cart / drafts ----------

export function startSale(customerId: string | null = null): Sale {
  const user = requireUser();
  return commit((db) => {
    const sale: Sale = {
      id: `sale-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`,
      receiptNo: "",
      branchId: db.branches[0].id,
      customerId,
      userId: user.id,
      items: [],
      discount: 0,
      total: 0,
      payments: [],
      status: "DRAFT",
      inventoryCommitted: false,
      createdAt: nowIso(),
    };
    db.sales.push(sale);
    return sale;
  });
}

export function setDraftCustomer(saleId: string, customerId: string | null) {
  commit((db) => {
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale || sale.status !== "DRAFT") throw new Error("Sale not editable");
    sale.customerId = customerId;
  });
}

export function addDraftItem(saleId: string, item: Omit<SaleItem, "id">): SaleItem {
  return commit((db) => {
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale || sale.status !== "DRAFT") throw new Error("Sale not editable");
    const created: SaleItem = { ...item, id: `si-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}` };
    sale.items.push(created);
    recomputeSaleTotals(sale);
    // soft stock warning check (hard check happens at commit)
    const p = db.products.find((x) => x.id === item.productId)!;
    const bal = db.balances.find((b) => b.productId === p.id && b.branchId === sale.branchId)?.qty ?? 0;
    const need = -saleItemQtyChange(db, created);
    if (need > bal + 1e-9) {
      throw new Error(`Only ${round3(bal)} ${p.baseUnit} of ${p.name} available`);
    }
    return created;
  });
}

export function updateDraftItem(saleId: string, itemId: string, patch: Partial<SaleItem>) {
  commit((db) => {
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale || sale.status !== "DRAFT") throw new Error("Sale not editable");
    const item = sale.items.find((i) => i.id === itemId);
    if (!item) throw new Error("Item not found");
    Object.assign(item, patch);
    if (patch.qtyKg !== undefined || patch.pieces !== undefined || patch.unitPrice !== undefined) {
      const qty = item.mode === "piece" ? (item.pieces ?? 0) : (item.qtyKg ?? 0);
      item.total = round2(qty * item.unitPrice);
      item.qtyLabel =
        item.mode === "piece"
          ? `${item.pieces} ${item.pieces === 1 ? "piece" : "pieces"}`
          : (item.qtyKg ?? 0) < 1
            ? `${Math.round((item.qtyKg ?? 0) * 1000)} g`
            : `${round3(item.qtyKg ?? 0)} kg`;
    }
    recomputeSaleTotals(sale);
  });
}

export function removeDraftItem(saleId: string, itemId: string) {
  commit((db) => {
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale || sale.status !== "DRAFT") throw new Error("Sale not editable");
    sale.items = sale.items.filter((i) => i.id !== itemId);
    recomputeSaleTotals(sale);
  });
}

export function setDraftDiscount(saleId: string, discount: number) {
  commit((db) => {
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale || sale.status !== "DRAFT") throw new Error("Sale not editable");
    if (discount < 0) throw new Error("Discount cannot be negative");
    sale.discount = round2(discount);
    recomputeSaleTotals(sale);
  });
}

function recomputeSaleTotals(sale: Sale) {
  sale.total = round2(Math.max(0, sale.items.reduce((s, i) => s + i.total, 0) - sale.discount));
}

export function cancelDraft(saleId: string) {
  commit((db) => {
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale) throw new Error("Sale not found");
    if (!["DRAFT", "PENDING_PAYMENT", "PARTIALLY_PAID"].includes(sale.status)) throw new Error("Only unpaid sales can be cancelled");
    if (sale.payments.some((p) => p.status === "SUCCESS")) throw new Error("Sale has confirmed payments — use Returns instead");
    sale.status = "CANCELLED";
    audit(db, "SALE_CANCELLED", sale.id, requireUser().id);
  });
}

// ---------- payments ----------

export function paidAmount(sale: Sale): number {
  return round2(sale.payments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + p.amount, 0));
}

export function saleBalance(sale: Sale): number {
  return round2(Math.max(0, sale.total - paidAmount(sale)));
}

function pushPayment(db: DemoDB, sale: Sale, method: PaymentMethod, amount: number, extra?: Partial<Payment>): Payment {
  const pay: Payment = {
    id: `pay-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`,
    saleId: sale.id,
    method,
    amount: round2(amount),
    status: "PENDING",
    ref: `BRM-PAY-${pad(nextNum(db, "payment"), 5)}`,
    attempts: 0,
    demo: true,
    createdAt: nowIso(),
    ...extra,
  };
  sale.payments.push(pay);
  return pay;
}

export function addCashPayment(saleId: string, amount: number): void {
  commit((db) => {
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale || sale.status === "COMPLETED" || sale.status === "CANCELLED") throw new Error("Sale not payable");
    if (amount <= 0) throw new Error("Amount must be positive");
    const bal = saleBalance(sale);
    if (amount > bal + 1e-9) throw new Error(`Amount exceeds remaining balance (${round2(bal)})`);
    const pay = pushPayment(db, sale, "CASH", amount);
    pay.status = "SUCCESS";
    pay.confirmedAt = nowIso();
    pay.attempts = 1;
    evaluateSale(db, sale);
  });
}

export function addCardPayment(saleId: string, amount: number, last4: string): void {
  commit((db) => {
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale || sale.status === "COMPLETED" || sale.status === "CANCELLED") throw new Error("Sale not payable");
    if (amount <= 0) throw new Error("Amount must be positive");
    if (amount > saleBalance(sale) + 1e-9) throw new Error("Amount exceeds remaining balance");
    const pay = pushPayment(db, sale, "CARD", amount, { mpesaRef: undefined });
    pay.status = "SUCCESS";
    pay.ref = `BRM-CARD-${pad(nextNum(db, "payment"), 5)}`;
    pay.mpesaRef = `CARD****${last4}`;
    pay.confirmedAt = nowIso();
    pay.attempts = 1;
    evaluateSale(db, sale);
  });
}

export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "").replace(/^\+/, "");
  let n = digits;
  if (n.startsWith("0")) n = `254${n.slice(1)}`;
  if (/^(7|1)\d{8}$/.test(n)) n = `254${n}`;
  return /^254(7|1)\d{8}$/.test(n) ? n : null;
}

export function createStkPayment(saleId: string, amount: number, phone: string): Payment {
  return commit((db) => {
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale || sale.status === "COMPLETED" || sale.status === "CANCELLED") throw new Error("Sale not payable");
    const bal = saleBalance(sale);
    if (amount <= 0) throw new Error("Amount must be positive");
    if (amount > bal + 1e-9) throw new Error(`Amount exceeds remaining balance (${round2(bal)})`);
    const normalized = normalizeKenyanPhone(phone);
    if (!normalized) throw new Error("Enter a valid Safaricom/Kenyan number e.g. 0712 345 678");
    return pushPayment(db, sale, "STK", amount, {
      phone: normalized,
      checkoutId: `DEMO-CHK-${pad(Math.floor(Math.random() * 1e6), 6)}`,
    });
  });
}

/**
 * Demo payment provider callback. Out-of-band state transition — the UI never
 * decides success itself, it asks the provider (simulator) to resolve.
 * Duplicate callbacks are idempotent (no double payment, no double stock).
 */
export function resolveStkPayment(paymentId: string, outcome: PaymentStatus): void {
  commit((db) => {
    const sale = db.sales.find((s) => s.payments.some((p) => p.id === paymentId));
    const pay = sale?.payments.find((p) => p.id === paymentId);
    if (!sale || !pay) throw new Error("Payment not found");
    if (pay.status !== "PENDING") {
      audit(db, "DUPLICATE_CALLBACK_IGNORED", `${pay.ref} already ${pay.status}`, requireUser().id);
      return;
    }
    pay.attempts += 1;
    if (outcome === "SUCCESS") {
      pay.status = "SUCCESS";
      pay.mpesaRef = `DEMO${Math.floor(100000 + Math.random() * 899999)}`;
      pay.confirmedAt = nowIso();
    } else if (outcome === "FAILED" || outcome === "EXPIRED") {
      pay.status = outcome;
    } else throw new Error("Invalid outcome");
    evaluateSale(db, sale);
  });
}

export function createPaybillExpectation(saleId: string, amount: number): Payment {
  return commit((db) => {
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale || sale.status === "COMPLETED" || sale.status === "CANCELLED") throw new Error("Sale not payable");
    if (amount <= 0) throw new Error("Amount must be positive");
    if (amount > saleBalance(sale) + 1e-9) throw new Error("Amount exceeds remaining balance");
    return pushPayment(db, sale, "PAYBILL", amount, {
      paybillAccount: `BRM-SALE-${pad(nextNum(db, "paybillRef"))}`,
    });
  });
}

/** Demo C2B PayBill gateway — an incoming customer payment. */
export function receivePaybill(account: string, amount: number): { matched: boolean; message: string } {
  return commit((db) => {
    const pay = db.sales
      .flatMap((s) => s.payments)
      .find((p) => p.method === "PAYBILL" && p.status === "PENDING" && p.paybillAccount === account.trim().toUpperCase());
    if (pay && Math.abs(pay.amount - amount) < 0.01) {
      const sale = db.sales.find((s) => s.id === pay.saleId)!;
      pay.status = "SUCCESS";
      pay.mpesaRef = `DEMO${Math.floor(100000 + Math.random() * 899999)}`;
      pay.confirmedAt = nowIso();
      pay.attempts += 1;
      evaluateSale(db, sale);
      audit(db, "PAYBILL_MATCHED", `${account} KSh ${amount} matched ${pay.ref}`, requireUser().id);
      return { matched: true, message: `Payment matched to ${pay.ref}` };
    }
    db.paybillInbox.push({
      id: `pb-${Date.now().toString(36)}`,
      paybillNumber: db.settings.paybillNumber,
      account: account.trim().toUpperCase(),
      amount: round2(amount),
      status: "UNMATCHED",
      at: nowIso(),
    });
    audit(db, "PAYBILL_UNMATCHED", `${account} KSh ${amount}`, requireUser().id);
    return { matched: false, message: "No pending payment matched — sent to reconciliation queue" };
  });
}

export function matchPaybillInboxItem(inboxId: string, paymentId: string): void {
  commit((db) => {
    const inbox = db.paybillInbox.find((i) => i.id === inboxId);
    if (!inbox || inbox.status !== "UNMATCHED") throw new Error("Inbox item not found or already matched");
    const sale = db.sales.find((s) => s.payments.some((p) => p.id === paymentId));
    const pay = sale?.payments.find((p) => p.id === paymentId);
    if (!pay || pay.status !== "PENDING") throw new Error("Payment not pending");
    if (Math.abs(pay.amount - inbox.amount) > 0.01) throw new Error(`Amount mismatch: payment expects KSh ${pay.amount}, inbox received KSh ${inbox.amount}`);
    pay.status = "SUCCESS";
    pay.mpesaRef = `DEMO${Math.floor(100000 + Math.random() * 899999)}`;
    pay.confirmedAt = nowIso();
    pay.attempts += 1;
    inbox.status = "MATCHED";
    inbox.matchedPaymentId = pay.id;
    evaluateSale(db, sale!);
    audit(db, "PAYBILL_RECONCILED", `${inbox.account} → ${pay.ref}`, requireUser().id);
  });
}

function commitSaleInventory(db: DemoDB, sale: Sale) {
  if (sale.inventoryCommitted) return;
  for (const item of sale.items) {
    applyMovement(db, item.productId, sale.branchId, "SALE", saleItemQtyChange(db, item), sale.receiptNo, sale.userId);
  }
  sale.inventoryCommitted = true;
  audit(db, "SALE_COMPLETED", `${sale.receiptNo} — stock committed`, sale.userId);
}

/** Single source of truth for sale state transitions after payment changes. */
function evaluateSale(db: DemoDB, sale: Sale) {
  const paid = paidAmount(sale);
  if (paid + 1e-9 >= sale.total && sale.total > 0) {
    sale.status = "PAID";
    if (!sale.receiptNo) sale.receiptNo = `BRM-DEMO-${pad(nextNum(db, "sale"))}`;
    commitSaleInventory(db, sale);
    sale.status = "COMPLETED";
    sale.completedAt = nowIso();
  } else if (paid > 0) {
    sale.status = "PARTIALLY_PAID";
  } else {
    sale.status = "PENDING_PAYMENT";
  }
}

// ---------- returns ----------

export function processReturn(
  saleId: string,
  lines: { itemId: string; qtyKg?: number; pieces?: number }[],
): { ref: string; total: number } {
  return commit((db) => {
    const user = requireUser();
    const sale = db.sales.find((s) => s.id === saleId);
    if (!sale || sale.status !== "COMPLETED") throw new Error("Only completed sales can be returned");
    const retItems: SaleReturn["items"] = [];
    let total = 0;
    for (const line of lines) {
      const item = sale.items.find((i) => i.id === line.itemId);
      if (!item) continue;
      const qtyKg = line.qtyKg;
      const pieces = line.pieces;
      const qty = item.mode === "piece" ? (pieces ?? 0) : (qtyKg ?? 0);
      if (qty <= 0) continue;
      const refund = round2(qty * item.unitPrice);
      total += refund;
      retItems.push({ productId: item.productId, productName: item.productName, qtyKg, pieces, refund });
      const p = db.products.find((x) => x.id === item.productId)!;
      const change =
        item.mode === "piece"
          ? p.baseUnit === "KG"
            ? round3((pieces ?? 0) * (p.pieceWeightKg ?? 0))
            : (pieces ?? 0)
          : round3(qtyKg ?? 0);
      const ref = `RET-${pad(nextNum(db, "return"))}`;
      applyMovement(db, item.productId, sale.branchId, "SALE_RETURN", change, ref, user.id);
      db.returns.push({
        id: `ret-${Date.now().toString(36)}`,
        ref,
        saleId: sale.id,
        receiptNo: sale.receiptNo,
        items: retItems,
        total: round2(total),
        userId: user.id,
        at: nowIso(),
      });
      audit(db, "SALE_RETURN", `${ref} on ${sale.receiptNo} — KSh ${round2(total)}`, user.id);
    }
    if (total <= 0) throw new Error("Nothing to return");
    return { ref: db.returns[db.returns.length - 1].ref, total: round2(total) };
  });
}

// ---------- inventory operations ----------

export function receiveStock(input: { productId: string; branchId: string; qty: number; unitCost?: number; note?: string }): string {
  return commit((db) => {
    const user = requireUser();
    if (input.qty <= 0) throw new Error("Quantity must be positive");
    const ref = `GR-${pad(nextNum(db, "gr"))}`;
    applyMovement(db, input.productId, input.branchId, "PURCHASE_RECEIVED", round3(input.qty), ref, user.id);
    if (input.unitCost && input.unitCost > 0) {
      const p = db.products.find((x) => x.id === input.productId);
      if (p) {
        if (p.baseUnit === "KG") p.costPerKg = input.unitCost;
        else p.costPerPiece = input.unitCost;
      }
    }
    db.goodsReceipts.push({
      id: `gr-${Date.now().toString(36)}`,
      ref,
      poId: "",
      branchId: input.branchId,
      items: [{ productId: input.productId, expectedQty: round3(input.qty), receivedQty: round3(input.qty) }],
      userId: user.id,
      at: nowIso(),
    });
    audit(db, "STOCK_RECEIVED", `${ref} +${input.qty}`, user.id);
    return ref;
  });
}

export function recordWastage(input: { productId: string; branchId: string; qty: number; reason: "Spoilage" | "Damage" | "Expired" | "Other"; notes?: string }) {
  commit((db) => {
    const user = requireUser();
    if (input.qty <= 0) throw new Error("Quantity must be positive");
    const ref = `WST-${pad(nextNum(db, "wastage") + 1000, 5)}`;
    applyMovement(db, input.productId, input.branchId, "WASTAGE", -round3(input.qty), ref, user.id);
    db.wastage.push({ id: `wst-${Date.now().toString(36)}`, productId: input.productId, branchId: input.branchId, qty: round3(input.qty), reason: input.reason, notes: input.notes, userId: user.id, at: nowIso() });
    audit(db, "WASTAGE_RECORDED", `${ref} ${input.qty} ${input.reason}`, user.id);
  });
}

export function transferStock(input: { fromBranchId: string; toBranchId: string; items: { productId: string; qty: number }[] }): string {
  return commit((db) => {
    const user = requireUser();
    if (input.fromBranchId === input.toBranchId) throw new Error("Source and destination must differ");
    const ref = `TRF-${pad(nextNum(db, "transfer"))}`;
    for (const it of input.items) {
      if (it.qty <= 0) throw new Error("Quantities must be positive");
      applyMovement(db, it.productId, input.fromBranchId, "TRANSFER_OUT", -round3(it.qty), ref, user.id);
      applyMovement(db, it.productId, input.toBranchId, "TRANSFER_IN", round3(it.qty), ref, user.id);
    }
    db.transfers.push({ id: `trf-${Date.now().toString(36)}`, ref, fromBranchId: input.fromBranchId, toBranchId: input.toBranchId, items: input.items.map((i) => ({ productId: i.productId, qty: round3(i.qty) })), userId: user.id, at: nowIso() });
    audit(db, "STOCK_TRANSFER", `${ref}`, user.id);
    return ref;
  });
}

export function adjustStock(input: { productId: string; branchId: string; qty: number; reason: string }): string {
  return commit((db) => {
    const user = requireUser();
    if (input.qty === 0) throw new Error("Quantity cannot be zero");
    const ref = `ADJ-${pad(nextNum(db, "adjustment"))}`;
    applyMovement(db, input.productId, input.branchId, "ADJUSTMENT", round3(input.qty), ref, user.id);
    db.adjustments.push({ id: `adj-${Date.now().toString(36)}`, ref, productId: input.productId, branchId: input.branchId, qty: round3(input.qty), reason: input.reason, userId: user.id, at: nowIso() });
    audit(db, "STOCK_ADJUSTED", `${ref} ${input.qty > 0 ? "+" : ""}${input.qty} — ${input.reason}`, user.id);
    return ref;
  });
}

export function convertStock(input: { branchId: string; inputProductId: string; inputQty: number; outputs: { productId: string; qty: number }[]; wasteQty: number }): string {
  return commit((db) => {
    const user = requireUser();
    if (input.inputQty <= 0) throw new Error("Input quantity must be positive");
    const outputs = input.outputs.filter((o) => o.qty > 0);
    if (outputs.length === 0) throw new Error("Add at least one output product");
    const outTotal = round3(outputs.reduce((s, o) => s + o.qty, 0) + input.wasteQty);
    if (Math.abs(outTotal - input.inputQty) > 0.005) {
      throw new Error(`Outputs + waste (${outTotal}) must equal input (${input.inputQty})`);
    }
    const ref = `CNV-${pad(nextNum(db, "conversion"))}`;
    applyMovement(db, input.inputProductId, input.branchId, "CONVERSION_INPUT", -round3(input.inputQty), ref, user.id);
    for (const o of outputs) {
      applyMovement(db, o.productId, input.branchId, "CONVERSION_OUTPUT", round3(o.qty), ref, user.id);
    }
    if (input.wasteQty > 0) {
      applyMovement(db, input.inputProductId, input.branchId, "WASTAGE", -round3(input.wasteQty), `${ref} (cutting waste)`, user.id);
    }
    db.conversions.push({ id: `cnv-${Date.now().toString(36)}`, ref, branchId: input.branchId, input: { productId: input.inputProductId, qty: round3(input.inputQty) }, outputs: outputs.map((o) => ({ productId: o.productId, qty: round3(o.qty) })), wasteQty: round3(input.wasteQty), status: "COMPLETED", userId: user.id, at: nowIso() });
    audit(db, "STOCK_CONVERTED", `${ref}`, user.id);
    return ref;
  });
}

// ---------- purchasing ----------

export function upsertSupplier(s: { id?: string; name: string; phone: string; email: string; location: string; productsSupplied: string[] }) {
  commit((db) => {
    if (s.id) {
      const existing = db.suppliers.find((x) => x.id === s.id);
      if (!existing) throw new Error("Supplier not found");
      Object.assign(existing, s);
      return;
    }
    db.suppliers.push({ id: `s-${Date.now().toString(36)}`, ...s });
    audit(db, "SUPPLIER_CREATED", s.name, requireUser().id);
  });
}

export function createPurchaseOrder(input: { supplierId: string; items: { productId: string; qty: number; unitCost: number }[]; notes?: string }): string {
  return commit((db) => {
    const user = requireUser();
    if (input.items.length === 0) throw new Error("Add at least one item");
    const ref = `PO-${pad(nextNum(db, "po"))}`;
    db.purchaseOrders.push({
      id: `po-${Date.now().toString(36)}`,
      ref,
      supplierId: input.supplierId,
      status: "DRAFT",
      items: input.items.map((i) => ({ productId: i.productId, qty: round3(i.qty), unit: db.products.find((p) => p.id === i.productId)?.baseUnit ?? "KG", unitCost: i.unitCost, receivedQty: 0 })),
      createdAt: nowIso(),
      notes: input.notes,
    });
    audit(db, "PO_CREATED", ref, user.id);
    return ref;
  });
}

export function updatePurchaseOrderStatus(poId: string, status: "ORDERED" | "CANCELLED") {
  commit((db) => {
    const po = db.purchaseOrders.find((p) => p.id === poId);
    if (!po) throw new Error("Purchase order not found");
    if (po.status === "RECEIVED") throw new Error("Received orders cannot change status");
    po.status = status;
    audit(db, "PO_STATUS", `${po.ref} → ${status}`, requireUser().id);
  });
}

export function receiveGoods(poId: string, branchId: string, lines: { productId: string; receivedQty: number; reason?: string }[]): string {
  return commit((db) => {
    const user = requireUser();
    const po = db.purchaseOrders.find((p) => p.id === poId);
    if (!po) throw new Error("Purchase order not found");
    if (!["ORDERED", "PARTIALLY_RECEIVED"].includes(po.status)) throw new Error("Only ordered purchase orders can be received");
    const ref = `GR-${pad(nextNum(db, "gr"))}`;
    const grItems: DemoDB["goodsReceipts"][number]["items"] = [];
    for (const line of lines) {
      const poItem = po.items.find((i) => i.productId === line.productId);
      if (!poItem) continue;
      if (line.receivedQty < 0) throw new Error("Received quantity cannot be negative");
      if (poItem.receivedQty + line.receivedQty > poItem.qty + 1e-9) {
        throw new Error(`Received exceeds ordered quantity for ${db.products.find((p) => p.id === line.productId)?.name}`);
      }
      if (line.receivedQty > 0) {
        applyMovement(db, line.productId, branchId, "PURCHASE_RECEIVED", round3(line.receivedQty), ref, user.id);
        const p = db.products.find((x) => x.id === line.productId);
        if (p) {
          if (p.baseUnit === "KG") p.costPerKg = poItem.unitCost;
          else p.costPerPiece = poItem.unitCost;
        }
      }
      poItem.receivedQty = round3(poItem.receivedQty + line.receivedQty);
      grItems.push({ productId: line.productId, expectedQty: poItem.qty, receivedQty: poItem.receivedQty, reason: line.reason });
    }
    if (grItems.length === 0) throw new Error("Nothing received");
    db.goodsReceipts.push({ id: `gr-${Date.now().toString(36)}`, ref, poId, branchId, items: grItems, userId: user.id, at: nowIso() });
    const fully = po.items.every((i) => i.receivedQty >= i.qty - 1e-9);
    const partly = po.items.some((i) => i.receivedQty > 0);
    po.status = fully ? "RECEIVED" : partly ? "PARTIALLY_RECEIVED" : po.status;
    audit(db, "GOODS_RECEIVED", `${ref} for ${po.ref}`, user.id);
    return ref;
  });
}

// ---------- stock taking ----------

export function startStockTake(branchId: string, agentId: string): string {
  return commit((db) => {
    const user = requireUser();
    const ref = `ST-${pad(nextNum(db, "stocktake"))}`;
    const items = db.products
      .filter((p) => p.active)
      .map((p) => ({ productId: p.id, systemQty: db.balances.find((b) => b.productId === p.id && b.branchId === branchId)?.qty ?? 0 }));
    db.stockTakes.push({ id: `stk-${Date.now().toString(36)}`, ref, branchId, agentId, status: "IN_PROGRESS", startedAt: nowIso(), items });
    audit(db, "STOCK_TAKE_STARTED", ref, user.id);
    return ref;
  });
}

export function setStockTakeCount(stId: string, productId: string, countedQty: number | null, reason?: string) {
  commit((db) => {
    const st = db.stockTakes.find((s) => s.id === stId);
    if (!st || !["IN_PROGRESS", "SUBMITTED"].includes(st.status)) throw new Error("Stock take not editable");
    const item = st.items.find((i) => i.productId === productId);
    if (!item) throw new Error("Product not in stock take");
    item.countedQty = countedQty === null ? undefined : round3(countedQty);
    item.reason = reason;
  });
}

export function submitStockTake(stId: string) {
  commit((db) => {
    const st = db.stockTakes.find((s) => s.id === stId);
    if (!st || st.status !== "IN_PROGRESS") throw new Error("Only in-progress sessions can be submitted");
    if (st.items.some((i) => i.countedQty === undefined)) throw new Error("Count every product before submitting");
    st.status = "SUBMITTED";
    st.submittedAt = nowIso();
    audit(db, "STOCK_TAKE_SUBMITTED", st.ref, requireUser().id);
  });
}

export function beginStockTakeReview(stId: string) {
  commit((db) => {
    const st = db.stockTakes.find((s) => s.id === stId);
    if (!st || st.status !== "SUBMITTED") throw new Error("Session not submitted");
    st.status = "UNDER_REVIEW";
  });
}

export function approveStockTake(stId: string): number {
  return commit((db) => {
    const user = requireUser();
    const st = db.stockTakes.find((s) => s.id === stId);
    if (!st || st.status !== "UNDER_REVIEW") throw new Error("Session must be under review");
    let variances = 0;
    for (const item of st.items) {
      if (item.countedQty === undefined) continue;
      const diff = round3(item.countedQty - item.systemQty);
      if (Math.abs(diff) > 1e-9) {
        applyMovement(db, item.productId, st.branchId, "STOCK_TAKE", diff, st.ref, user.id);
        db.adjustments.push({ id: `adj-${Date.now().toString(36)}-${variances}`, ref: st.ref, productId: item.productId, branchId: st.branchId, qty: diff, reason: `Stock take ${st.ref} variance`, userId: user.id, at: nowIso() });
        variances++;
      }
    }
    st.status = "APPROVED";
    st.reviewedAt = nowIso();
    st.reviewedBy = user.id;
    audit(db, "STOCK_TAKE_APPROVED", `${st.ref} — ${variances} variance(s) adjusted`, user.id);
    return variances;
  });
}

export function rejectStockTake(stId: string, notes: string) {
  commit((db) => {
    const st = db.stockTakes.find((s) => s.id === stId);
    if (!st || st.status !== "UNDER_REVIEW") throw new Error("Session must be under review");
    st.status = "REJECTED";
    st.reviewedAt = nowIso();
    st.reviewedBy = requireUser().id;
    st.reviewNotes = notes;
    audit(db, "STOCK_TAKE_REJECTED", st.ref, requireUser().id);
  });
}

// ---------- cashier shifts ----------

export function openShift(openingFloat: number): string {
  return commit((db) => {
    const user = requireUser();
    if (db.shifts.some((s) => s.userId === user.id && s.status === "OPEN")) throw new Error("You already have an open shift");
    if (openingFloat < 0) throw new Error("Opening float cannot be negative");
    const ref = `SHF-${pad(nextNum(db, "shift"))}`;
    db.shifts.push({ id: `shf-${Date.now().toString(36)}`, ref, userId: user.id, branchId: db.branches[0].id, openingFloat: round2(openingFloat), openedAt: nowIso(), status: "OPEN", cashMovements: [] });
    audit(db, "SHIFT_OPENED", `${ref} float KSh ${round2(openingFloat)}`, user.id);
    return ref;
  });
}

export function getOpenShift(): { db: DemoDB; shiftId: string | null } | null {
  const s = getSnapshot();
  if (!s?.user) return null;
  const open = s.db.shifts.find((x) => x.userId === s.user!.id && x.status === "OPEN");
  return { db: s.db, shiftId: open?.id ?? null };
}

export function addCashMovement(shiftId: string, type: CashMovementType, amount: number, reason: string) {
  commit((db) => {
    const shift = db.shifts.find((x) => x.id === shiftId);
    if (!shift || shift.status !== "OPEN") throw new Error("Shift not open");
    if (amount <= 0) throw new Error("Amount must be positive");
    shift.cashMovements.push({ id: `cm-${Date.now().toString(36)}`, type, amount: round2(amount), reason, userId: requireUser().id, at: nowIso() });
  });
}

export function computeExpectedCash(db: DemoDB, shiftId: string): number {
  const shift = db.shifts.find((x) => x.id === shiftId);
  if (!shift) return 0;
  const cashSales = db.sales
    .filter((s) => s.userId === shift.userId && s.status === "COMPLETED" && s.completedAt && s.completedAt >= shift.openedAt && (!shift.closedAt || s.completedAt <= shift.closedAt))
    .flatMap((s) => s.payments)
    .filter((p) => p.method === "CASH" && p.status === "SUCCESS")
    .reduce((sum, p) => sum + p.amount, 0);
  const moves = shift.cashMovements.reduce((sum, m) => sum + (m.type === "IN" ? m.amount : -m.amount), 0);
  return round2(shift.openingFloat + cashSales + moves);
}

export function closeShift(shiftId: string, actualCash: number, reason?: string) {
  commit((db) => {
    const shift = db.shifts.find((x) => x.id === shiftId);
    if (!shift || shift.status !== "OPEN") throw new Error("Shift not open");
    if (actualCash < 0) throw new Error("Actual cash cannot be negative");
    shift.closedAt = nowIso();
    shift.expectedCash = computeExpectedCash(db, shiftId);
    shift.actualCash = round2(actualCash);
    shift.variance = round2(actualCash - shift.expectedCash);
    shift.reason = reason;
    shift.status = Math.abs(shift.variance) > 0.009 ? "UNDER_REVIEW" : "CLOSED";
    audit(db, "SHIFT_CLOSED", `${shift.ref} variance ${shift.variance}`, requireUser().id);
  });
}

export function reviewShift(shiftId: string, approve: boolean) {
  commit((db) => {
    const shift = db.shifts.find((x) => x.id === shiftId);
    if (!shift || shift.status !== "UNDER_REVIEW") throw new Error("Shift not awaiting review");
    if (!approve) throw new Error("Use reopen instead");
    shift.status = "CLOSED";
    audit(db, "SHIFT_VARIANCE_APPROVED", shift.ref, requireUser().id);
  });
}

// ---------- users (super admin) ----------

export function upsertUser(u: { id?: string; name: string; email: string; phone: string; role: UserProfile["role"]; password?: string; active?: boolean }) {
  commit((db) => {
    const actor = requireUser();
    if (u.id) {
      const existing = db.users.find((x) => x.id === u.id);
      if (!existing) throw new Error("User not found");
      if (db.users.some((x) => x.email.toLowerCase() === u.email.toLowerCase() && x.id !== u.id)) throw new Error("Email already in use");
      existing.name = u.name;
      existing.email = u.email;
      existing.phone = u.phone;
      existing.role = u.role;
      if (u.password) existing.password = u.password;
      if (u.active !== undefined && existing.id !== actor.id) existing.active = u.active;
      audit(db, "USER_UPDATED", existing.email, actor.id);
      return;
    }
    if (db.users.some((x) => x.email.toLowerCase() === u.email.toLowerCase())) throw new Error("Email already in use");
    db.users.push({ id: `u-${Date.now().toString(36)}`, name: u.name, email: u.email, phone: u.phone, role: u.role, password: u.password || "demo1234", active: u.active ?? true });
    audit(db, "USER_CREATED", u.email, actor.id);
  });
}

export function deleteCustomer(customerId: string) {
  commit((db) => {
    const used = db.sales.some((s) => s.customerId === customerId && s.status === "COMPLETED");
    if (used) throw new Error("Customer has sales history — deactivate instead");
    db.customers = db.customers.filter((c) => c.id !== customerId);
  });
}

export function getStockTake(db: DemoDB, id: string): StockTake | undefined {
  return db.stockTakes.find((s) => s.id === id);
}
