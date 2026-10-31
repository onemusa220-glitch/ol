import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useDemo } from "@/demo/hooks";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const snap = useDemo();

  useEffect(() => {
    if (snap) navigate({ to: snap.user ? "/dashboard" : "/login", replace: true });
  }, [snap, navigate]);

  return (
    <div className="pos-theme flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="text-5xl">🐔</div>
        <p className="mt-3 font-display text-lg tracking-wide text-pos-foreground">BRATHAMATU</p>
        <p className="mt-1 text-sm text-pos-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
