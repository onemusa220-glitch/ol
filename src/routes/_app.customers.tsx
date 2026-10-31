import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, UserRound } from "lucide-react";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import { upsertCustomer, deleteCustomer } from "@/demo/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, PageHeader } from "@/components/shared";
import { fmtDateTime, money } from "@/lib/money";

export const Route = createFileRoute("/_app/customers")({
  component: CustomersPage,
});

function CustomersPage() {
  const snap = useDemo();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (snap && !can(snap.user?.role, "customers")) navigate({ to: "/dashboard", replace: true });
  }, [snap, navigate]);

  if (!snap?.db) return null;
  const db = snap.db;
  const filtered = query.trim()
    ? db.customers.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query))
    : db.customers;

  return (
    <div className="pb-10">
      <PageHeader
        title="Customers"
        subtitle={`${db.customers.length} registered customers`}
        actions={<Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> New Customer</Button>}
      />
      <div className="space-y-4 px-4 py-5 md:px-6">
        <Input placeholder="Search by name or phone…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-sm" />
        {filtered.length === 0 ? (
          <EmptyState icon="👤" title="No customers found" body="Walk-in customers don't need to be registered." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => {
              const sales = db.sales.filter((s) => s.customerId === c.id && s.status === "COMPLETED");
              const totalSpent = sales.reduce((sum, s) => sum + s.total, 0);
              return (
                <div key={c.id} className="rounded-xl border p-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted"><UserRound className="h-5 w-5" /></span>
                    <div><p className="font-semibold">{c.name}</p><p className="text-xs text-muted-foreground">{c.phone}</p></div>
                  </div>
                  <div className="mt-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Sales</span><span className="font-medium">{sales.length}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total spent</span><span className="font-medium">{money(totalSpent)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Since</span><span className="font-medium">{fmtDateTime(c.createdAt)}</span></div>
                  </div>
                  {can(snap.user?.role, "customers") && sales.length === 0 && (
                    <Button size="sm" variant="ghost" className="mt-2 w-full text-destructive" onClick={() => { try { deleteCustomer(c.id); toast.success("Customer deleted"); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }}>Delete</Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {open && <CustomerDialog onClose={() => setOpen(false)} />}
    </div>
  );
}

function CustomerDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  function save() {
    if (!name.trim()) { toast.error("Name required"); return; }
    try {
      upsertCustomer({ name: name.trim(), phone: phone.trim() });
      toast.success("Customer added");
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" /></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Add</Button></div>
      </DialogContent>
    </Dialog>
  );
}
