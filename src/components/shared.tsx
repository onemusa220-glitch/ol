import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 border-b bg-background px-4 py-4 md:px-6">
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  tone?: "default" | "brand" | "success" | "warning";
}) {
  const toneClass =
    tone === "brand"
      ? "gradient-brand text-primary-foreground border-transparent"
      : tone === "success"
        ? "border-success/30 bg-success-soft"
        : tone === "warning"
          ? "border-brand/40 bg-brand-soft"
          : "";
  return (
    <Card className={`${toneClass} shadow-elegant`}>
      <CardContent className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wider ${tone === "brand" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{label}</p>
          <p className={`mt-1 truncate font-display text-2xl font-bold ${tone === "brand" ? "text-primary-foreground" : ""}`}>{value}</p>
          {sub && <p className={`mt-0.5 text-xs ${tone === "brand" ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{sub}</p>}
        </div>
        {icon && <div className="shrink-0 text-2xl">{icon}</div>}
      </CardContent>
    </Card>
  );
}

export function EmptyState({ icon, title, body }: { icon: string; title: string; body?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-12 text-center">
      <span className="text-4xl">{icon}</span>
      <p className="mt-3 font-semibold">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>}
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    SUCCESS: "bg-success-soft text-foreground border-success/40",
    PAID: "bg-success-soft text-foreground border-success/40",
    COMPLETED: "bg-success-soft text-foreground border-success/40",
    RECEIVED: "bg-success-soft text-foreground border-success/40",
    APPROVED: "bg-success-soft text-foreground border-success/40",
    CLOSED: "bg-success-soft text-foreground border-success/40",
    PENDING: "bg-brand-soft border-brand/40",
    PENDING_PAYMENT: "bg-brand-soft border-brand/40",
    PARTIALLY_PAID: "bg-brand-soft border-brand/40",
    PARTIALLY_RECEIVED: "bg-brand-soft border-brand/40",
    UNDER_REVIEW: "bg-brand-soft border-brand/40",
    SUBMITTED: "bg-brand-soft border-brand/40",
    IN_PROGRESS: "bg-brand-soft border-brand/40",
    ORDERED: "bg-brand-soft border-brand/40",
    DRAFT: "bg-muted border-border",
    UNMATCHED: "bg-muted border-border",
    FAILED: "bg-destructive/10 text-destructive border-destructive/40",
    EXPIRED: "bg-destructive/10 text-destructive border-destructive/40",
    REJECTED: "bg-destructive/10 text-destructive border-destructive/40",
    CANCELLED: "bg-destructive/10 text-destructive border-destructive/40",
    REFUNDED: "bg-destructive/10 text-destructive border-destructive/40",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${map[status] ?? "bg-muted border-border"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function DemoNote({ children }: { children?: ReactNode }) {
  return (
    <div className="rounded-lg border border-brand/40 bg-brand-soft px-3 py-2 text-xs font-medium text-foreground">
      🟡 DEMO TRANSACTION — NOT A REAL PAYMENT {children ? <span className="font-normal text-muted-foreground">· {children}</span> : null}
    </div>
  );
}
