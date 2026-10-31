import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RotateCcw, Save } from "lucide-react";
import { useDemo } from "@/demo/hooks";
import { can } from "@/demo/permissions";
import { updateSettings, resetDemoData } from "@/demo/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const snap = useDemo();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState("");
  const [paybillNumber, setPaybillNumber] = useState("");
  const [stkAuto, setStkAuto] = useState("");

  useEffect(() => {
    if (snap && !can(snap.user?.role, "settings")) navigate({ to: "/dashboard", replace: true });
  }, [snap, navigate]);

  useEffect(() => {
    if (snap?.db.settings) {
      setBusinessName(snap.db.settings.businessName);
      setPaybillNumber(snap.db.settings.paybillNumber);
      setStkAuto(snap.db.settings.stkAutoApproveSeconds ? String(snap.db.settings.stkAutoApproveSeconds) : "");
    }
  }, [snap]);

  if (!snap?.db) return null;

  function save() {
    try {
      updateSettings({
        businessName,
        paybillNumber,
        stkAutoApproveSeconds: stkAuto ? parseInt(stkAuto) : null,
      });
      toast.success("Settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  function reset() {
    if (!confirm("Reset ALL demo data? This cannot be undone. You will stay logged in.")) return;
    resetDemoData();
    toast.success("Demo data reset to defaults");
  }

  return (
    <div className="pb-10">
      <PageHeader title="Settings" subtitle="Business settings and demo management" />
      <div className="max-w-md space-y-5 px-4 py-5 md:px-6">
        <div className="rounded-xl border p-5">
          <p className="mb-4 font-display text-sm font-bold">Business Settings</p>
          <div className="space-y-3">
            <div><Label>Business Name</Label><Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="mt-1" /></div>
            <div><Label>PayBill Number</Label><Input value={paybillNumber} onChange={(e) => setPaybillNumber(e.target.value)} className="mt-1" /></div>
            <div><Label>STK Auto-approve (seconds, 0 = manual)</Label><Input type="number" value={stkAuto} onChange={(e) => setStkAuto(e.target.value)} className="mt-1" placeholder="Leave blank for manual" /></div>
          </div>
          <Button className="mt-4" onClick={save}><Save className="mr-1 h-4 w-4" /> Save Settings</Button>
        </div>

        {can(snap.user?.role, "demo_reset") && (
          <div className="rounded-xl border-2 border-destructive/40 bg-destructive/5 p-5">
            <p className="font-display text-sm font-bold text-destructive">Danger Zone</p>
            <p className="mt-1 text-sm text-muted-foreground">Reset all demo data back to the seed state. Your login stays active.</p>
            <Button variant="destructive" className="mt-3" onClick={reset}><RotateCcw className="mr-1 h-4 w-4" /> Reset Demo Data</Button>
          </div>
        )}

        <div className="rounded-xl border border-brand/40 bg-brand-soft p-4">
          <p className="text-sm font-semibold">🟡 Demo Mode</p>
          <p className="mt-1 text-xs text-muted-foreground">
            All data is stored locally in your browser. Every payment is clearly marked as a demo transaction — not a real payment. No data leaves this device.
          </p>
        </div>
      </div>
    </div>
  );
}
