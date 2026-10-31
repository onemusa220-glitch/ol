import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  Banknote,
  BarChart3,
  Building2,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  UserCog,
  UserRound,
  Warehouse,
  X,
  type LucideIcon,
} from "lucide-react";
import { logout } from "@/demo/engine";
import { useDemo } from "@/demo/hooks";
import { can, type Permission } from "@/demo/permissions";
import { ROLE_LABELS } from "@/demo/types";
import { Button } from "@/components/ui/button";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  perm: Permission;
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Operations",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard" },
      { to: "/pos", label: "POS", icon: ShoppingCart, perm: "pos" },
      { to: "/cashier", label: "Cashier", icon: Banknote, perm: "cashier" },
    ],
  },
  {
    title: "Sales & Stock",
    items: [
      { to: "/products", label: "Products", icon: Package, perm: "products" },
      { to: "/inventory", label: "Inventory", icon: Warehouse, perm: "inventory" },
      { to: "/purchasing", label: "Purchasing", icon: Truck, perm: "purchasing" },
      { to: "/stock-taking", label: "Stock Taking", icon: ClipboardCheck, perm: "stock_take" },
      { to: "/customers", label: "Customers", icon: UserRound, perm: "customers" },
      { to: "/payments", label: "Payments", icon: CreditCard, perm: "payments" },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/reports", label: "Reports", icon: BarChart3, perm: "reports" },
      { to: "/users", label: "Users & Roles", icon: UserCog, perm: "users" },
      { to: "/branches", label: "Branches", icon: Building2, perm: "branches" },
      { to: "/settings", label: "Settings", icon: Settings, perm: "settings" },
    ],
  },
];

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-brand/40 bg-brand-soft px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground ${className}`}
      title="Demo environment — every payment is simulated and clearly marked"
    >
      🟡 Demo Mode
    </span>
  );
}

function AppLayout() {
  const snap = useDemo();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (snap && !snap.user) navigate({ to: "/login", replace: true });
  }, [snap, navigate]);

  if (!snap?.user) {
    return (
      <div className="pos-theme flex min-h-screen items-center justify-center">
        <p className="text-sm text-pos-muted-foreground">Loading…</p>
      </div>
    );
  }

  const user = snap.user;

  const nav = (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-3 pt-5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl gradient-brand text-xl shadow-elegant">🐔</span>
          <div>
            <p className="font-display text-base font-bold leading-tight tracking-wide">BRATHAMATU</p>
            <p className="text-[11px] text-muted-foreground">Kuku POS</p>
          </div>
        </div>
        <DemoBadge className="mt-3" />
      </div>
      <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((i) => can(user.role, i.perm));
          if (items.length === 0) return null;
          return (
            <div key={group.title}>
              <p className="px-2 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{group.title}</p>
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active = !!matchRoute({ to: item.to, fuzzy: true });
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                        active ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-accent"
                      }`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-muted/60 p-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
            {user.name.split(" ").map((n) => n[0]).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => logout()} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r bg-sidebar lg:block">{nav}</aside>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button aria-label="Close menu" className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-xl">
            <button className="absolute right-3 top-4 rounded-md p-1.5 hover:bg-accent" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
            {nav}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-bold tracking-wide">BRATHAMATU</p>
            <p className="truncate text-[11px] text-muted-foreground">{user.name} · {ROLE_LABELS[user.role]}</p>
          </div>
          <DemoBadge />
        </header>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
