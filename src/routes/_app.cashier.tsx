import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import { openShift, closeShift, addCashMovement, getOpenShift, computeExpectedCash } from "@/demo/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, StatusPill } from "@/components/shared";
import { fmtDateTime, money } from "@/lib/money";

export const Route = createFileRoute("/_app/cashier")({
  component: CashierPage,
});

function CashierPage() {
  const snap = useDemo();
  const navigate = useNavigate();
  const [openDlg, setOpenDlg] = useState(false);
  const [closeDlg, setCloseDlg] = useState<string | null>(null);
  const [moveDlg, setMoveDlg] = useState(false);

  useEffect(() => {
    if (snap && !can(snap.user?.role, "cashier")) navigate({ to: "/dashboard", replace: true });
  }, [snap, navigate]);

  if (!snap?.db) return null;
  const db = snap.db;
  const openInfo = getOpenShift();
  const myShifts = db.shifts.filter((s) => s.userId === snap.user?.id);
  const allShifts = can(snap.user?.role, "reports") ? db.shifts : myShifts;

  return (
    <div className="pb-10">
      <PageHeader
        title="Cashier Shifts"
        subtitle="Open and close shifts, record cash movements, reconcile"
        actions={
          openInfo?.shiftId ? (
            <>
              <Button variant="outline" onClick={() => setMoveDlg(true)}>Cash Movement</Button>
              <Button variant="destructive" onClick={() => setCloseDlg(openInfo.shiftId!)}>Close Shift</Button>
            </>
          ) : (
            <Button onClick={() => setOpenDlg(true)}>Open Shift</Button>
          )
        }
      />
      <div className="space-y-4 px-4 py-5 md:px-6">
        {openInfo?.shiftId && (() => {
          const shift = db.shifts.find((s) => s.id === openInfo.shiftId);
          if (!shift) return null;
          const expected = computeExpectedCash(db, shift.id);
          return (
            <div className="rounded-xl border-2 border-brand/40 bg-brand-soft p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-lg font-bold">Shift Open — {shift.ref}</p>
                  <p className="text-sm text-muted-foreground">Opened {fmtDateTime(shift.openedAt)} · Float {money(shift.openingFloat)}</p>
                </div>
                <StatusPill status="OPEN" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div><p className="text-xs text-muted-foreground">Expected cash</p><p className="font-display text-xl font-bold">{money(expected)}</p></div>
                <div><p className="text-xs text-muted-foreground">Cash movements</p><p className="font-display text-xl font-bold">{shift.cashMovements.length}</p></div>
                <div><p className="text-xs text-muted-foreground">Float</p><p className="font-display text-xl font-bold">{money(shift.openingFloat)}</p></div>
              </div>
            </div>
          );
        })()}

        {allShifts.length === 0 ? (
          <EmptyState icon="💰" title="No shifts yet" body="Open your first shift to start selling." />
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="p-3">Ref</th><th className="p-3">Cashier</th><th className="p-3">Opened</th><th className="p-3">Closed</th><th className="p-3 text-right">Float</th><th className="p-3 text-right">Expected</th><th className="p-3 text-right">Actual</th><th className="p-3 text-right">Variance</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody>
                {[...allShifts].reverse().map((s) => {
                  const user = db.users.find((u) => u.id === s.userId);
                  const exp = s.expectedCash ?? computeExpectedCash(db, s.id);
                  return (
                    <tr key={s.id} className="border-t">
                      <td className="p-3 font-medium">{s.ref}</td>
                      <td className="p-3">{user?.name}</td>
                      <td className="p-3 text-muted-foreground">{fmtDateTime(s.openedAt)}</td>
                      <td className="p-3 text-muted-foreground">{s.closedAt ? fmtDateTime(s.closedAt) : "—"}</td>
                      <td className="p-3 text-right">{money(s.openingFloat)}</td>
                      <td className="p-3 text-right">{money(exp)}</td>
                      <td className="p-3 text-right">{s.actualCash !== undefined ? money(s.actualCash) : "—"}</td>
                      <td className={`p-3 text-right font-semibold ${s.variance !== undefined && Math.abs(s.variance) > 0.01 ? "text-destructive" : ""}`}>{s.variance !== undefined ? money(s.variance) : "—"}</td>
                      <td className="p-3"><StatusPill status={s.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {openDlg && <OpenDialog onClose={() => setOpenDlg(false)} />}
      {closeDlg && <CloseDialog shiftId={closeDlg} onClose={() => setCloseDlg(null)} />}
      {moveDlg && <MoveDialog onClose={() => setMoveDlg(false)} />}
    </div>
  );
}

function OpenDialog({ onClose }: { onClose: () => void }) {
  const [float, setFloat] = useState("5000");
  function save() {
    try {
      const ref = openShift(parseFloat(float) || 0);
      toast.success(`Shift opened — ${ref}`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Open Cashier Shift</DialogTitle></DialogHeader>
        <div><Label>Opening Float (KSh)</Label><Input type="number" value={float} onChange={(e) => setFloat(e.target.value)} className="mt-1 h-14 text-center font-display text-2xl font-bold" /></div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Open Shift</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({ shiftId, onClose }: { shiftId: string; onClose: () => void }) {
  const snap = useDemo();
  if (!snap) return null;
  const shift = snap.db.shifts.find((s) => s.id === shiftId);
  const expected = shift ? computeExpectedCash(snap.db, shiftId) : 0;
  const [actual, setActual] = useState(String(expected));
  const [reason, setReason] = useState("");

  function save() {
    try {
      closeShift(shiftId, parseFloat(actual) || 0, reason.trim() || undefined);
      toast.success("Shift closed");
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  const variance = (parseFloat(actual) || 0) - expected;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Close Shift — {shift?.ref}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Expected cash</span><span className="font-bold">{money(expected)}</span></div>
          </div>
          <div><Label>Actual Cash (KSh)</Label><Input type="number" value={actual} onChange={(e) => setActual(e.target.value)} className="mt-1 h-14 text-center font-display text-2xl font-bold" /></div>
          <div className={`rounded-lg border p-3 text-sm ${Math.abs(variance) > 0.01 ? "border-destructive/40 bg-destructive/5" : "border-success/40 bg-success-soft"}`}>
            <div className="flex justify-between"><span className="text-muted-foreground">Variance</span><span className="font-bold">{money(variance)}</span></div>
          </div>
          {Math.abs(variance) > 0.01 && <div><Label>Reason for variance</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" /></div>}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="destructive" onClick={save}>Close Shift</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({ onClose }: { onClose: () => void }) {
  const snap = useDemo();
  const openInfo = getOpenShift();
  const [type, setType] = useState<"IN" | "OUT">("OUT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  if (!snap || !openInfo?.shiftId) return null;

  function save() {
    try {
      addCashMovement(openInfo!.shiftId!, type, parseFloat(amount) || 0, reason.trim());
      toast.success("Cash movement recorded");
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Cash Movement</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as "IN" | "OUT")}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="IN">Cash In (add)</SelectItem><SelectItem value="OUT">Cash Out (remove)</SelectItem></SelectContent>
            </Select>
          </div>
          <div><Label>Amount (KSh)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1" /></div>
          <div><Label>Reason</Label><Input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1" placeholder="e.g. Petty cash, banking" /></div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!amount || !reason.trim()}>Record</Button></div>
      </DialogContent>
    </Dialog>
  );
}
