import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import heroImg from "@/assets/brand-hero.jpg";
import { login } from "@/demo/engine";
import { useDemo } from "@/demo/hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/login")({
  component: Login,
});

const DEMO_ACCOUNTS = [
  { email: "admin@brathamatu.demo", label: "Super Admin" },
  { email: "manager@brathamatu.demo", label: "Manager" },
  { email: "cashier@brathamatu.demo", label: "Cashier" },
  { email: "store@brathamatu.demo", label: "Storekeeper" },
  { email: "procurement@brathamatu.demo", label: "Procurement" },
  { email: "stocktake@brathamatu.demo", label: "Stock Take Agent" },
];

function Login() {
  const navigate = useNavigate();
  const snap = useDemo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (snap?.user) navigate({ to: snap.user.role === "cashier" || snap.user.role === "stock_take_agent" ? "/pos" : "/dashboard", replace: true });
  }, [snap, navigate]);

  function signIn(e?: React.FormEvent, asEmail?: string) {
    e?.preventDefault();
    const useEmail = asEmail ?? email;
    if (!useEmail || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setBusy(true);
    try {
      const user = login(useEmail, password);
      toast.success(`Karibu, ${user.name}`);
      navigate({ to: user.role === "cashier" || user.role === "stock_take_agent" ? "/pos" : "/dashboard", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="relative hidden lg:flex lg:w-[45%] flex-col justify-end overflow-hidden pos-theme">
        <img src={heroImg} alt="Fresh BrathaMatu poultry" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-pos-bg via-pos-bg/40 to-transparent" />
        <div className="relative z-10 p-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-pos-border bg-pos-surface/80 px-3 py-1 text-xs font-semibold tracking-widest text-brand">
            🟡 DEMO MODE — NOT REAL PAYMENTS
          </div>
          <h1 className="font-display text-4xl font-bold tracking-tight text-pos-foreground">BRATHAMATU</h1>
          <p className="mt-2 max-w-sm text-sm text-pos-muted-foreground">
            Premium poultry POS, inventory and business management. Fresh stock, fast sales, honest books.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl gradient-brand text-3xl shadow-elegant">🐔</div>
            <h2 className="font-display text-2xl font-bold">Sign in to BrathaMatu</h2>
            <p className="mt-1 text-sm text-muted-foreground">Kuku POS · Demo environment</p>
          </div>

          <form onSubmit={signIn} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="username" placeholder="you@brathamatu.demo" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="current-password" placeholder="demo1234" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12" />
            </div>
            <Button type="submit" disabled={busy} className="h-12 w-full text-base font-semibold">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-8">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Demo accounts — password demo1234</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.email}
                  type="button"
                  onClick={() => signIn(undefined, a.email)}
                  className="rounded-lg border bg-card px-3 py-2 text-left text-xs transition-colors hover:bg-accent"
                >
                  <span className="block font-semibold">{a.label}</span>
                  <span className="block truncate text-muted-foreground">{a.email}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              Demo mode only. All data lives in this browser and every payment is clearly marked “DEMO TRANSACTION — NOT A REAL PAYMENT”.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
