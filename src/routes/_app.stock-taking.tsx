import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import {
  startStockTake,
  setStockTakeCount,
  submitStockTake,
  beginStockTakeReview,
  approveStockTake,
  rejectStockTake,
} from "@/demo/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, StatusPill } from "@/components/shared";
import { fmtDateTime, fmtKg } from "@/lib/money";

export const Route = createFileRoute("/_app/stock-taking")({
  component: StockTakingPage,
});

function StockTakingPage() {
  const snap = useDemo();
  const navigate = useNavigate();
  const [startDlg, setStartDlg] = useState(false);
  const [activeSt, setActiveSt] = useState<string | null>(null);
  const [rejectDlg, setRejectDlg] = useState<string | null>(null);

  useEffect(() => {
    if (snap && !can(snap.user?.role, "stock_take")) navigate({ to: "/dashboard", replace: true });
  }, [snap, navigate]);

  if (!snap?.db) return null;
  const db = snap.db;

  return (
    <div className="pb-10">
      <PageHeader
        title="Stock Taking"
        subtitle="Sessions, counting, variances and approval workflow"
        actions={<Button onClick={() => setStartDlg(true)}>New Stock Take</Button>}
      />
      <div className="space-y-4 px-4 py-5 md:px-6">
        {db.stockTakes.length === 0 ? (
          <EmptyState icon="🔎" title="No stock takes yet" body="Start a session to count physical stock." />
        ) : (
          [...db.stockTakes].reverse().map((st) => {
            const branch = db.branches.find((b) => b.id === st.branchId);
            const agent = db.users.find((u) => u.id === st.agentId);
            const variances = st.items.filter((i) => i.countedQty !== undefined && Math.abs((i.countedQty ?? 0) - i.systemQty) > 0.001);
            return (
              <div key={st.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-base font-bold">{st.ref}</p>
                    <p className="text-sm text-muted-foreground">{branch?.name} · Agent: {agent?.name} · Started {fmtDateTime(st.startedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill status={st.status} />
                    {variances.length > 0 && <Badge variant="secondary">{variances.length} variance(s)</Badge>}
                  </div>
                </div>
                {st.status === "IN_PROGRESS" && (
                  <Button size="sm" className="mt-3" onClick={() => setActiveSt(st.id)}>Count Stock</Button>
                )}
                {st.status === "IN_PROGRESS" && can(snap.user?.role, "stock_take") && (
                  <Button size="sm" variant="outline" className="mt-3 ml-2" onClick={() => { submitStockTake(st.id); toast.success("Stock take submitted for review"); }}>Submit</Button>
                )}
                {st.status === "SUBMITTED" && can(snap.user?.role, "stock_take_approve") && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => { beginStockTakeReview(st.id); setActiveSt(st.id); }}>Review</Button>
                  </div>
                )}
                {st.status === "UNDER_REVIEW" && can(snap.user?.role, "stock_take_approve") && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => { const n = approveStockTake(st.id); toast.success(`Approved — ${n} variance(s) adjusted`); }}>Approve & Adjust</Button>
                    <Button size="sm" variant="destructive" onClick={() => setRejectDlg(st.id)}>Reject</Button>
                  </div>
                )}
                {st.status === "IN_PROGRESS" && (
                  <Button size="sm" variant="outline" className="mt-3 ml-2" onClick={() => setActiveSt(st.id)}>Continue Counting</Button>
                )}
              </div>
            );
          })
        )}
      </div>

      {startDlg && <StartDialog onClose={() => setStartDlg(false)} />}
      {activeSt && <CountDialog stId={activeSt} onClose={() => setActiveSt(null)} />}
      {rejectDlg && <RejectDialog stId={rejectDlg} onClose={() => setRejectDlg(null)} />}
    </div>
  );
}

function StartDialog({ onClose }: { onClose: () => void }) {
  const snap = useDemo();
  const [branchId, setBranchId] = useState("");
  const [agentId, setAgentId] = useState("");
  if (!snap) return null;

  function save() {
    if (!branchId || !agentId) { toast.error("Select branch and agent"); return; }
    try {
      const ref = startStockTake(branchId, agentId);
      toast.success(`Stock take started — ${ref}`);
      onClose();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Start Stock Take</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Branch</Label>
            <Select value={branchId} onValueChange={setBranchId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>{snap.db.branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Assigned Agent</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Select agent" /></SelectTrigger>
              <SelectContent>{snap.db.users.filter((u) => u.active).map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Start</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function CountDialog({ stId, onClose }: { stId: string; onClose: () => void }) {
  const snap = useDemo();
  if (!snap) return null;
  const st = snap.db.stockTakes.find((s) => s.id === stId);
  if (!st) return null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Count Stock — {st.ref}</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {st.items.map((item) => {
            const p = snap.db.products.find((x) => x.id === item.productId);
            if (!p) return null;
            const variance = (item.countedQty ?? 0) - item.systemQty;
            return (
              <div key={item.productId} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{p.emoji} {p.name}</span>
                  <span className="text-xs text-muted-foreground">System: {p.baseUnit === "KG" ? fmtKg(item.systemQty) : `${item.systemQty} pcs`}</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="Actual count"
                    value={item.countedQty ?? ""}
                    onChange={(e) => setStockTakeCount(stId, item.productId, e.target.value === "" ? null : parseFloat(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-8 text-xs text-muted-foreground">{p.baseUnit}</span>
                  {item.countedQty !== undefined && Math.abs(variance) > 0.001 && (
                    <Badge variant={variance < 0 ? "destructive" : "secondary"} className="whitespace-nowrap">{variance > 0 ? "+" : ""}{variance.toFixed(3)}</Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {st.status === "IN_PROGRESS" && can(snap.user?.role, "stock_take") && (
            <Button onClick={() => { try { submitStockTake(stId); toast.success("Submitted for review"); onClose(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } }}>Submit for Review</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ stId, onClose }: { stId: string; onClose: () => void }) {
  const [notes, setNotes] = useState("");
  function save() {
    try { rejectStockTake(stId, notes.trim() || "Rejected by reviewer"); toast.success("Stock take rejected"); onClose(); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Reject Stock Take</DialogTitle></DialogHeader>
        <div><Label>Reason</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" /></div>
        <div className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="destructive" onClick={save}>Reject</Button></div>
      </DialogContent>
    </Dialog>
  );
}
