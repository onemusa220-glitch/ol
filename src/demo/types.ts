// BrathaMatu demo domain types — mirrors the Laravel backend schema (see
// API_CONTRACT_MATRIX.md in the delivered backend source).

export type Role =
  | "super_admin"
  | "manager"
  | "cashier"
  | "storekeeper"
  | "procurement"
  | "stock_take_agent";

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  manager: "Owner / Manager",
  cashier: "Cashier",
  storekeeper: "Storekeeper",
  procurement: "Procurement",
  stock_take_agent: "Stock Take Agent",
};

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  password: string; // demo only — Laravel backend stores bcrypt hashes
  active: boolean;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
}

export type SellingMode = "weight" | "piece" | "amount";
export type BaseUnit = "KG" | "PIECE";

export interface Product {
  id: string;
  name: string;
  sku: string;
  categoryId: string;
  emoji: string;
  baseUnit: BaseUnit;
  sellingModes: SellingMode[];
  pricePerKg?: number;
  pricePerPiece?: number;
  pieceWeightKg?: number; // kg per piece for KG-based products sold by piece
  costPerKg?: number;
  costPerPiece?: number;
  reorderLevel: number; // in base units
  active: boolean;
}

export interface InventoryBalance {
  productId: string;
  branchId: string;
  qty: number; // in base units
}

export type MovementType =
  | "PURCHASE_RECEIVED"
  | "SALE"
  | "SALE_RETURN"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "WASTAGE"
  | "ADJUSTMENT"
  | "STOCK_TAKE"
  | "CONVERSION_INPUT"
  | "CONVERSION_OUTPUT";

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  PURCHASE_RECEIVED: "Purchase Received",
  SALE: "Sale",
  SALE_RETURN: "Sale Return",
  TRANSFER_OUT: "Transfer Out",
  TRANSFER_IN: "Transfer In",
  WASTAGE: "Wastage",
  ADJUSTMENT: "Adjustment",
  STOCK_TAKE: "Stock Take",
  CONVERSION_INPUT: "Conversion Input",
  CONVERSION_OUTPUT: "Conversion Output",
};

export interface Movement {
  id: string;
  productId: string;
  branchId: string;
  type: MovementType;
  qtyBefore: number;
  qtyChange: number;
  qtyAfter: number;
  ref: string;
  userId: string;
  at: string;
}

export type SaleStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "PARTIALLY_PAID"
  | "PAID"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export type CartMode = SellingMode;

export interface SaleItem {
  id: string;
  productId: string;
  productName: string;
  emoji: string;
  mode: CartMode;
  qtyKg?: number; // weight / amount modes (actual confirmed kg)
  pieces?: number; // piece mode
  unitPrice: number; // per kg or per piece depending on mode
  unitPriceLabel: string; // "KSh 450 / KG" or "KSh 80 / piece"
  qtyLabel: string; // "500 g", "1.2 kg", "3 pieces"
  total: number;
  note?: string;
}

export type PaymentMethod = "CASH" | "STK" | "PAYBILL" | "CARD";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  STK: "M-Pesa STK",
  PAYBILL: "PayBill",
  CARD: "Card",
};

export interface Payment {
  id: string;
  saleId: string;
  method: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  ref: string; // internal reference BRM-PAY-xxxxx
  phone?: string; // STK
  checkoutId?: string; // demo STK checkout request id
  mpesaRef?: string; // confirmed provider transaction id
  paybillAccount?: string; // BRM-SALE-xxxxx account to pay into
  attempts: number; // provider callbacks received (duplicate protection)
  demo: true;
  createdAt: string;
  confirmedAt?: string;
}

export interface Sale {
  id: string;
  receiptNo: string; // assigned when completed; drafts hold BRM-DRAFT-xxxx
  branchId: string;
  customerId: string | null; // null = walk-in
  userId: string;
  items: SaleItem[];
  discount: number;
  total: number; // items total - discount
  payments: Payment[];
  status: SaleStatus;
  inventoryCommitted: boolean; // idempotency guard for stock deduction
  createdAt: string;
  completedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  location: string;
  productsSupplied: string[];
}

export type POStatus = "DRAFT" | "ORDERED" | "PARTIALLY_RECEIVED" | "RECEIVED" | "CANCELLED";

export interface PurchaseOrderItem {
  productId: string;
  qty: number;
  unit: BaseUnit;
  unitCost: number;
  receivedQty: number;
}

export interface PurchaseOrder {
  id: string;
  ref: string;
  supplierId: string;
  status: POStatus;
  items: PurchaseOrderItem[];
  createdAt: string;
  notes?: string;
}

export interface GoodsReceipt {
  id: string;
  ref: string;
  poId: string;
  branchId: string;
  items: { productId: string; expectedQty: number; receivedQty: number; reason?: string }[];
  userId: string;
  at: string;
}

export interface WastageRecord {
  id: string;
  productId: string;
  branchId: string;
  qty: number;
  reason: "Spoilage" | "Damage" | "Expired" | "Other";
  notes?: string;
  userId: string;
  at: string;
}

export interface StockTransfer {
  id: string;
  ref: string;
  fromBranchId: string;
  toBranchId: string;
  items: { productId: string; qty: number }[];
  userId: string;
  at: string;
}

export interface StockAdjustment {
  id: string;
  ref: string;
  productId: string;
  branchId: string;
  qty: number; // + or -
  reason: string;
  userId: string;
  at: string;
}

export interface Conversion {
  id: string;
  ref: string;
  branchId: string;
  input: { productId: string; qty: number };
  outputs: { productId: string; qty: number }[];
  wasteQty: number;
  status: "COMPLETED";
  userId: string;
  at: string;
}

export type StockTakeStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED";

export interface StockTakeItem {
  productId: string;
  systemQty: number;
  countedQty?: number;
  reason?: string;
}

export interface StockTake {
  id: string;
  ref: string;
  branchId: string;
  agentId: string;
  status: StockTakeStatus;
  startedAt: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  items: StockTakeItem[];
}

export type CashMovementType = "IN" | "OUT";
export interface CashMovement {
  id: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  userId: string;
  at: string;
}

export type ShiftStatus = "OPEN" | "CLOSED" | "UNDER_REVIEW";

export interface CashierShift {
  id: string;
  ref: string;
  userId: string;
  branchId: string;
  openingFloat: number;
  openedAt: string;
  status: ShiftStatus;
  closedAt?: string;
  expectedCash?: number;
  actualCash?: number;
  variance?: number;
  reason?: string;
  cashMovements: CashMovement[];
}

export interface SaleReturn {
  id: string;
  ref: string;
  saleId: string;
  receiptNo: string;
  items: { productId: string; productName: string; qtyKg?: number; pieces?: number; refund: number }[];
  total: number;
  userId: string;
  at: string;
}

export interface PaybillInboxItem {
  id: string;
  paybillNumber: string;
  account: string;
  amount: number;
  status: "UNMATCHED" | "MATCHED";
  matchedPaymentId?: string;
  at: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  detail: string;
  at: string;
}

export interface DemoSettings {
  businessName: string;
  paybillNumber: string;
  stkAutoApproveSeconds: number | null; // null = manual simulator only
}

export interface DemoDB {
  users: UserProfile[];
  branches: Branch[];
  categories: Category[];
  products: Product[];
  balances: InventoryBalance[];
  movements: Movement[];
  customers: Customer[];
  sales: Sale[];
  returns: SaleReturn[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  wastage: WastageRecord[];
  transfers: StockTransfer[];
  adjustments: StockAdjustment[];
  conversions: Conversion[];
  stockTakes: StockTake[];
  shifts: CashierShift[];
  paybillInbox: PaybillInboxItem[];
  auditLogs: AuditLog[];
  counters: Record<string, number>;
  settings: DemoSettings;
}
