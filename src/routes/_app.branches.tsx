import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Building2 } from "lucide-react";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import { PageHeader } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { fmtKg } from "@/lib/money";

export const Route = createFileRoute("/_app/branches")({
  component: BranchesPage,
});

function BranchesPage() {
  const snap = useDemo();
  const navigate = useNavigate();

  useEffect(() => {
    if (snap && !can(snap.user?.role, "branches")) navigate({ to: "/dashboard", replace: true });
  }, [snap, navigate]);

  if (!snap?.db) return null;
  const db = snap.db;

  return (
    <div className="pb-10">
      <PageHeader title="Branches" subtitle={`${db.branches.length} locations`} />
      <div className="grid gap-3 p-4 sm:grid-cols-2 md:px-6">
        {db.branches.map((b) => {
          const branchProducts = db.balances.filter((bal) => bal.branchId === b.id);
          const productCount = branchProducts.filter((bal) => bal.qty > 0).length;
          return (
            <div key={b.id} className="rounded-xl border p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl"><Building2 className="h-6 w-6" /></span>
                <div>
                  <p className="font-display text-base font-bold">{b.name}</p>
                  <p className="text-sm text-muted-foreground">{b.location}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Products in stock</p>
                  <p className="font-display text-lg font-bold">{productCount}</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Total SKUs</p>
                  <p className="font-display text-lg font-bold">{branchProducts.length}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
