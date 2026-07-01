import { ReactNode } from "react";
import { useSanadak } from "@/lib/sanadak-context";

export function PanelHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  const { lang } = useSanadak();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
      <div>
        <h2 className={`text-xl font-bold ${lang === "ar" ? "font-arabic" : ""}`}>{title}</h2>
        {subtitle && <p className={`text-sm text-muted-foreground mt-1 ${lang === "ar" ? "font-arabic" : ""}`}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  const { lang } = useSanadak();
  return (
    <div className={`glass-card rounded-2xl p-8 text-center text-sm text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>
      {text}
    </div>
  );
}

export function StatusPill({ status, map }: { status: string; map: Record<string, string> }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${map[status] ?? "bg-foreground/10 text-foreground/70"}`}>
      {status}
    </span>
  );
}

export function StatCard({ label, value, icon }: { label: string; value: string | number; icon?: ReactNode }) {
  const { lang } = useSanadak();
  return (
    <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
      {icon && <div className="h-11 w-11 rounded-xl bg-gradient-brand grid place-items-center text-primary-foreground shrink-0">{icon}</div>}
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className={`text-xs text-muted-foreground ${lang === "ar" ? "font-arabic" : ""}`}>{label}</div>
      </div>
    </div>
  );
}
