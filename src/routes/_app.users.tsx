import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Power, ShieldCheck } from "lucide-react";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import { upsertUser } from "@/demo/engine";
import { ROLE_LABELS, type Role } from "@/demo/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader } from "@/components/shared";

export const Route = createFileRoute("/_app/users")({
  component: UsersPage,
});

const ROLES: Role[] = ["super_admin", "manager", "cashier", "storekeeper", "procurement", "stock_take_agent"];

function UsersPage() {
  const snap = useDemo();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<string | "new" | null>(null);

  useEffect(() => {
    if (snap && !can(snap.user?.role, "users")) navigate({ to: "/dashboard", replace: true });
  }, [snap, navigate]);

  if (!snap?.db) return null;
  const db = snap.db;

  return (
    <div className="pb-10">
      <PageHeader
        title="Users & Roles"
        subtitle={`${db.users.length} users`}
        actions={<Button onClick={() => setEditing("new")}><Plus className="mr-1 h-4 w-4" /> New User</Button>}
      />
      <div className="space-y-3 px-4 py-5 md:px-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {db.users.map((u) => (
            <div key={u.id} className={`rounded-xl border p-4 ${!u.active ? "opacity-50" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {u.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                  <div>
                    <p className="font-semibold">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
                <Badge variant={u.role === "super_admin" ? "default" : "secondary"}>{ROLE_LABELS[u.role]}</Badge>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                <p className="text-muted-foreground">{u.phone}</p>
                <p className={u.active ? "text-success" : "text-destructive"}>{u.active ? "Active" : "Disabled"}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditing(u.id)}><Pencil className="mr-1 h-3 w-3" /> Edit</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {editing && <UserDialog userId={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function UserDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const snap = useDemo();
  const existing = userId ? snap?.db.users.find((u) => u.id === userId) : null;
  const [name, setName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [role, setRole] = useState<Role>(existing?.role ?? "cashier");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(existing?.active ?? true);
  const isSelf = snap?.user?.id === userId;
  const isSuperAdmin = existing?.role === "super_admin";

  function save() {
    if (!name.trim() || !email.trim()) { toast.error("Name and email required"); return; }
    try {
      upsertUser({ id: userId ?? undefined, name: name.trim(), email: email.trim(), phone, role, password: password || undefined, active });
      toast.success(existing ? "User updated" : "User created");
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>{existing ? "Edit User" : "New User"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" /></div>
          <div><Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={isSuperAdmin}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Password (leave blank to keep)</Label><Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" placeholder="demo1234" /></div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={active} onCheckedChange={(v) => setActive(v === true)} disabled={isSelf} />
            Active account
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>{existing ? "Save" : "Create"}</Button></div>
      </DialogContent>
    </Dialog>
  );
}
