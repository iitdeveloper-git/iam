import type React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  Search,
  SlidersHorizontal,
  XCircle
} from "lucide-react";

const statusStyles: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  enabled: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-700",
  healthy: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  suspended: "border-amber-200 bg-amber-50 text-amber-700",
  failed: "border-rose-200 bg-rose-50 text-rose-700",
  inactive: "border-rose-200 bg-rose-50 text-rose-700",
  archived: "border-slate-200 bg-slate-100 text-slate-600"
};

export function authModeLabel(mode: string) {
  switch (mode) {
    case "authentication_only":
      return "Authentication Only";
    case "application_access":
      return "Application Access";
    case "direct_roles":
      return "Direct Roles";
    case "product_managed":
      return "Product Managed";
    default:
      return mode.replaceAll("_", " ");
  }
}

export function formatDate(value?: string | null) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase();
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyles[key] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow ? <div className="mb-2 text-sm font-medium text-brand">{eyebrow}</div> : null}
        <h1 className="text-2xl font-semibold tracking-normal text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  detail,
  children
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "brand" | "blue" | "amber" | "rose" | "slate";
  detail?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const toneClass = {
    brand: "bg-emerald-50 text-brand",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-slate-100 text-slate-600"
  }[tone];
  return (
    <div className="rounded-md border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`rounded-md p-3 ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-600">{label}</div>
          <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
          {detail ? <div className="mt-1 text-xs text-slate-500">{detail}</div> : null}
        </div>
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
      />
    </label>
  );
}

export function FilterToolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-md border border-line bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="hidden rounded-md bg-slate-50 p-2 text-slate-500 lg:block">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        {children}
      </div>
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-normal text-slate-800 shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/10"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Info,
  action
}: {
  title: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-dashed border-line bg-white px-6 py-10 text-center">
      <Icon className="mx-auto h-6 w-6 text-slate-400" />
      <div className="mt-3 text-sm font-semibold text-ink">{title}</div>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="rounded-md border border-line bg-white px-6 py-10 text-center text-sm text-slate-500">
      <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-brand" />
      {label}
    </div>
  );
}

export function HealthIcon({ status }: { status: string }) {
  if (status === "ok") return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-rose-600" />;
  return <AlertTriangle className="h-4 w-4 text-amber-600" />;
}
