import type { DemoDB, Sale, SaleItem, Payment } from "./types";
import { round2, round3 } from "@/lib/money";

const DAY = 24 * 60 * 60 * 1000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600_000).toISOString();

export const DEMO_PASSWORD = "demo1234";

let idc = 0;
const uid = (p: string) => `${p}-${(++idc).toString(36)}`;
const movId = () => uid("mv");

const movement = pushMov;


function pushMov(
  db: DemoDB,
  productId: string,
  branchId: string,
  type: DemoDB["movements"][number]["type"],
  qtyChange: number,
  ref: string,
  userId: string,
  at: string,
) {
  const bal = db.balances.find((b) => b.productId === productId && b.branchId === branchId);
  if (!bal) {
    db.balances.push({ productId, branchId, qty: 0 });
  }
  const b = db.balances.find((x) => x.productId === productId && x.branchId === branchId)!;
  const qtyBefore = b.qty;
  const qtyAfter = round3(qtyBefore + qtyChange);
  b.qty = qtyAfter;
  db.movements.push({
    id: movId(),
    productId,
    branchId,
    type,
    qtyBefore: round3(qtyBefore),
    qtyChange: round3(qtyChange),
    qtyAfter: round3(qtyAfter),
    ref,
    userId,
    at,
  });
}

function seedSale(
  db: DemoDB,
  opts: {
    receiptNo: string;
    userId: string;
    at: string;
    items: { productIdx: number; mode: SaleItem["mode"]; qtyKg?: number; pieces?: number; note?: string }[];
    payments: { method: Payment["method"]; amount: number }[];
  },
) {
  const mainBranch = db.branches[0].id;
  const items: SaleItem[] = opts.items.map((it) => {
    const p = db.products[it.productIdx];
    const unitPrice = it.mode === "piece" ? p.pricePerPiece ?? 0 : p.pricePerKg ?? 0;
    const total =
      it.mode === "piece"
        ? round2((it.pieces ?? 0) * unitPrice)
        : round2((it.qtyKg ?? 0) * unitPrice);
    const qtyLabel =
      it.mode === "piece"
        ? `${it.pieces} pcs`
        : (it.qtyKg ?? 0) < 1
          ? `${Math.round((it.qtyKg ?? 0) * 1000)} g`
          : `${round3(it.qtyKg ?? 0)} kg`;
    return {
      id: uid("si"),
      productId: p.id,
      productName: p.name,
      emoji: p.emoji,
      mode: it.mode,
      qtyKg: it.qtyKg,
      pieces: it.pieces,
      unitPrice,
      unitPriceLabel: it.mode === "piece" ? `KSh ${unitPrice} / pc` : `KSh ${unitPrice} / kg`,
      qtyLabel,
      total,
      note: it.note,
    };
  });
  const total = round2(items.reduce((s, i) => s + i.total, 0));
  const payments: Payment[] = opts.payments.map((pay) => ({
    id: uid("pay"),
    saleId: "",
    method: pay.method,
    amount: pay.amount,
    status: "SUCCESS",
    ref: `BRM-PAY-${(db.counters.payments = (db.counters.payments ?? 0) + 1)}`,
    mpesaRef: pay.method === "STK" ? `DEMO${Math.floor(100000 + Math.random() * 899999)}` : undefined,
    attempts: 1,
    demo: true,
    createdAt: opts.at,
    confirmedAt: opts.at,
  }));
  const sale: Sale = {
    id: uid("sale"),
    receiptNo: opts.receiptNo,
    branchId: mainBranch,
    customerId: null,
    userId: opts.userId,
    items,
    discount: 0,
    total,
    payments: payments.map((p) => ({ ...p, saleId: "" })),
    status: "COMPLETED",
    inventoryCommitted: true,
    createdAt: opts.at,
    completedAt: opts.at,
  };
  payments.forEach((p) => (p.saleId = sale.id));
  sale.payments = payments;
  db.sales.push(sale);
  for (const it of opts.items) {
    const p = db.products[it.productIdx];
    const qtyChange =
      it.mode === "piece"
        ? p.baseUnit === "KG"
          ? -round3((it.pieces ?? 0) * (p.pieceWeightKg ?? 0))
          : -(it.pieces ?? 0)
        : -round3(it.qtyKg ?? 0);
    movement(db, p.id, mainBranch, "SALE", qtyChange, opts.receiptNo, opts.userId, opts.at);
  }
}

export function buildSeed(): DemoDB {
  idc = 0;
  const users: DemoDB["users"] = [
    { id: "u-admin", name: "Grace Njeri", email: "admin@brathamatu.demo", phone: "0722 000 001", role: "super_admin", password: DEMO_PASSWORD, active: true },
    { id: "u-manager", name: "Peter Mwangi", email: "manager@brathamatu.demo", phone: "0722 000 002", role: "manager", password: DEMO_PASSWORD, active: true },
    { id: "u-cashier", name: "Faith Achieng", email: "cashier@brathamatu.demo", phone: "0722 000 003", role: "cashier", password: DEMO_PASSWORD, active: true },
    { id: "u-store", name: "John Otieno", email: "store@brathamatu.demo", phone: "0722 000 004", role: "storekeeper", password: DEMO_PASSWORD, active: true },
    { id: "u-proc", name: "Mary Wambui", email: "procurement@brathamatu.demo", phone: "0722 000 005", role: "procurement", password: DEMO_PASSWORD, active: true },
    { id: "u-agent", name: "Samuel Kariuki", email: "stocktake@brathamatu.demo", phone: "0722 000 006", role: "stock_take_agent", password: DEMO_PASSWORD, active: true },
  ];

  const branches: DemoDB["branches"] = [
    { id: "b-main", name: "Main Branch", location: "Nairobi CBD" },
    { id: "b-kasarani", name: "Kasarani Outlet", location: "Kasarani" },
  ];

  const categories: DemoDB["categories"] = [
    { id: "c-whole", name: "Whole Chicken", emoji: "🐔" },
    { id: "c-cuts", name: "Chicken Cuts", emoji: "🍗" },
    { id: "c-organs", name: "Organs", emoji: "🫀" },
    { id: "c-other", name: "Other Products", emoji: "📦" },
  ];

  const products: DemoDB["products"] = [
    { id: "p-whole", name: "Whole Chicken", sku: "BRM-WHOLE", categoryId: "c-whole", emoji: "🐔", baseUnit: "KG", sellingModes: ["weight", "amount"], pricePerKg: 420, costPerKg: 280, reorderLevel: 20, active: true },
    { id: "p-drum", name: "Drumsticks", sku: "BRM-DRUM", categoryId: "c-cuts", emoji: "🍗", baseUnit: "KG", sellingModes: ["weight", "piece", "amount"], pricePerKg: 450, pricePerPiece: 80, pieceWeightKg: 0.2, costPerKg: 300, reorderLevel: 15, active: true },
    { id: "p-wing", name: "Wings", sku: "BRM-WING", categoryId: "c-cuts", emoji: "🍗", baseUnit: "KG", sellingModes: ["weight", "amount"], pricePerKg: 400, costPerKg: 260, reorderLevel: 15, active: true },
    { id: "p-breast", name: "Breast", sku: "BRM-BREAST", categoryId: "c-cuts", emoji: "🍗", baseUnit: "KG", sellingModes: ["weight", "piece", "amount"], pricePerKg: 520, pricePerPiece: 110, pieceWeightKg: 0.3, costPerKg: 340, reorderLevel: 12, active: true },
    { id: "p-liver", name: "Liver", sku: "BRM-LIVER", categoryId: "c-organs", emoji: "🫀", baseUnit: "KG", sellingModes: ["weight", "amount"], pricePerKg: 600, costPerKg: 380, reorderLevel: 8, active: true },
    { id: "p-gizzard", name: "Gizzards", sku: "BRM-GIZ", categoryId: "c-organs", emoji: "🫀", baseUnit: "KG", sellingModes: ["weight", "amount"], pricePerKg: 550, costPerKg: 350, reorderLevel: 8, active: true },
    { id: "p-feed", name: "Kuku Feed 2kg Pack", sku: "BRM-FEED2", categoryId: "c-other", emoji: "📦", baseUnit: "PIECE", sellingModes: ["piece"], pricePerPiece: 350, costPerPiece: 260, reorderLevel: 10, active: true },
    { id: "p-eggs", name: "Tray of Eggs (30)", sku: "BRM-EGGS", categoryId: "c-other", emoji: "🥚", baseUnit: "PIECE", sellingModes: ["piece"], pricePerPiece: 420, costPerPiece: 330, reorderLevel: 10, active: true },
  ];

  const db: DemoDB = {
    users,
    branches,
    categories,
    products,
    balances: [],
    movements: [],
    customers: [
      { id: "c-1", name: "Mama Otis Bistro", phone: "0733 111 222", createdAt: ago(9) },
      { id: "c-2", name: "Kasarani Hotel", phone: "0733 333 444", createdAt: ago(6) },
    ],
    sales: [],
    returns: [],
    suppliers: [
      { id: "s-1", name: "Wakulima Poultry Suppliers", phone: "0712 345 678", email: "sales@wakulima.demo", location: "Limuru", productsSupplied: ["Whole Chicken"] },
      { id: "s-2", name: "Kikuyu Fresh Farms", phone: "0734 987 654", email: "orders@kikuyufresh.demo", location: "Kikuyu", productsSupplied: ["Whole Chicken", "Kuku Feed 2kg Pack"] },
    ],
    purchaseOrders: [],
    goodsReceipts: [],
    wastage: [],
    transfers: [],
    adjustments: [],
    conversions: [],
    stockTakes: [],
    shifts: [],
    paybillInbox: [],
    auditLogs: [],
    counters: { sale: 0, payment: 0, po: 0, gr: 0, transfer: 0, adjustment: 0, conversion: 0, stocktake: 0, shift: 0, return: 0 },
    settings: { businessName: "BRATHAMATU", paybillNumber: "247247", stkAutoApproveSeconds: null },
  };

  // Opening stock via purchase receipts (4 days ago)
  const opening: [number, number, number, number][] = [
    // [productIdx, mainQty, kasaraniQty, unitCost]
    [0, 130, 30, 280],
    [1, 70, 12, 300],
    [2, 44, 8, 260],
    [3, 33, 0, 340],
    [4, 19, 0, 380],
    [5, 26, 0, 350],
    [6, 42, 10, 260],
    [7, 26, 0, 330],
  ];
  const admin = users[0].id;
  const store = users[3].id;
  for (const [pi, mainQty, kasQty, cost] of opening) {
    const p = products[pi];
    if (mainQty > 0) movement(db, p.id, "b-main", "PURCHASE_RECEIVED", mainQty, "GR-SEED-0001", store, ago(4));
    if (kasQty > 0) movement(db, p.id, "b-kasarani", "PURCHASE_RECEIVED", kasQty, "GR-SEED-0001", store, ago(4));
    if (p.baseUnit === "KG") p.costPerKg = cost;
    else p.costPerPiece = cost;
  }

  // A little trading history so dashboards/reports have real (demo) data
  const cashier = users[2].id;
  seedSale(db, {
    receiptNo: "BRM-DEMO-000001",
    userId: cashier,
    at: ago(3, 2),
    items: [
      { productIdx: 1, mode: "weight", qtyKg: 0.5 },
      { productIdx: 0, mode: "weight", qtyKg: 1.2 },
    ],
    payments: [{ method: "CASH", amount: 729 }],
  });
  seedSale(db, {
    receiptNo: "BRM-DEMO-000002",
    userId: cashier,
    at: ago(2, 5),
    items: [
      { productIdx: 4, mode: "weight", qtyKg: 0.4 },
      { productIdx: 2, mode: "weight", qtyKg: 1 },
    ],
    payments: [
      { method: "STK", amount: 240 },
      { method: "CASH", amount: 400 },
    ],
  });
  seedSale(db, {
    receiptNo: "BRM-DEMO-000003",
    userId: cashier,
    at: ago(1, 3),
    items: [
      { productIdx: 1, mode: "piece", pieces: 3 },
      { productIdx: 6, mode: "piece", pieces: 2 },
    ],
    payments: [
      { method: "CASH", amount: 300 },
      { method: "STK", amount: 640 },
    ],
  });
  seedSale(db, {
    receiptNo: "BRM-DEMO-000004",
    userId: cashier,
    at: ago(0, 2),
    items: [{ productIdx: 7, mode: "piece", pieces: 1 }],
    payments: [{ method: "CASH", amount: 420 }],
  });
  db.counters.sale = 4;

  // One purchase order already received
  db.purchaseOrders.push({
    id: uid("po"),
    ref: "PO-000001",
    supplierId: "s-1",
    status: "RECEIVED",
    items: [
      { productId: "p-whole", qty: 100, unit: "KG", unitCost: 280, receivedQty: 98 },
      { productId: "p-drum", qty: 50, unit: "KG", unitCost: 300, receivedQty: 50 },
    ],
    createdAt: ago(4),
  });
  db.goodsReceipts.push({
    id: uid("gr"),
    ref: "GR-SEED-0001",
    poId: db.purchaseOrders[0].id,
    branchId: "b-main",
    items: [
      { productId: "p-whole", expectedQty: 100, receivedQty: 98, reason: "Supplier shortage" },
      { productId: "p-drum", expectedQty: 50, receivedQty: 50 },
    ],
    userId: store,
    at: ago(4),
  });

  db.auditLogs.push(
    { id: uid("log"), userId: admin, action: "DEMO_SEEDED", detail: "Demo database seeded with opening stock and 4 sample sales", at: ago(4) },
  );

  return db;
}
