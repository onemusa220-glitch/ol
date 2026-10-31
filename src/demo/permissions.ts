import type { Role } from "./types";

export type Permission =
  | "dashboard"
  | "pos"
  | "pos_discount"
  | "pos_void"
  | "returns"
  | "products"
  | "inventory"
  | "inventory_receive"
  | "wastage"
  | "purchasing"
  | "stock_take"
  | "stock_take_approve"
  | "customers"
  | "payments"
  | "cashier"
  | "reports"
  | "users"
  | "branches"
  | "settings"
  | "demo_reset";

const ALL: Permission[] = [
  "dashboard", "pos", "pos_discount", "pos_void", "returns", "products", "inventory",
  "inventory_receive", "wastage", "purchasing", "stock_take", "stock_take_approve",
  "customers", "payments", "cashier", "reports", "users", "branches", "settings", "demo_reset",
];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  super_admin: ALL,
  manager: [
    "dashboard", "pos", "pos_discount", "pos_void", "returns", "products", "inventory",
    "inventory_receive", "wastage", "purchasing", "stock_take", "stock_take_approve",
    "customers", "payments", "cashier", "reports", "branches",
  ],
  cashier: ["pos", "customers", "cashier", "returns"],
  storekeeper: ["inventory", "inventory_receive", "wastage", "stock_take", "products", "purchasing"],
  procurement: ["purchasing", "products", "inventory"],
  stock_take_agent: ["stock_take"],
};

export function can(role: Role | undefined | null, perm: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(perm);
}
