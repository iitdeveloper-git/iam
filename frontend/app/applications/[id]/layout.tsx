"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Shell } from "@/components/shell";
import { getApplication, updateApplication, type Application } from "@/lib/api/client";
import { AppWindow, ShieldAlert, Sparkles, ShieldCheck } from "lucide-react";

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams() as { id: string };
  const pathname = usePathname();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const loadApp = () => {
    getApplication(id)
      .then(setApp)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load application"));
  };

  useEffect(() => {
    if (id) {
      loadApp();
    }
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!app) return;
    
    // Confirmations
    if (newStatus === "archived" && !confirm("Warning: Archiving this application is a permanent action and cannot be undone. Do you wish to proceed?")) {
      return;
    }
    if (newStatus === "suspended" && !confirm("Are you sure you want to suspend this application? Access and mutations will be blocked.")) {
      return;
    }

    setStatusLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateApplication(app.id, { status: newStatus });
      setSuccess(`Application status updated to ${newStatus}`);
      loadApp();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update application status");
    } finally {
      setStatusLoading(false);
    }
  };

  if (error && !app) {
    return (
      <Shell>
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          {error}
        </div>
      </Shell>
    );
  }

  if (!app) {
    return (
      <Shell>
        <div className="text-center py-10 text-slate-500">Loading application details...</div>
      </Shell>
    );
  }

  const tabs = [
    { name: "Overview", href: `/applications/${app.id}` },
    { name: "Roles", href: `/applications/${app.id}/roles` },
    { name: "Permissions", href: `/applications/${app.id}/permissions` },
    { name: "Users & Access", href: `/applications/${app.id}/access` },
    { name: "Invitations", href: `/applications/${app.id}/invitations` },
    { name: "Audit", href: `/applications/${app.id}/audit` },
  ];

  return (
    <Shell>
      <div className="mb-6 flex flex-col gap-4 border-b border-line pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-md bg-brand/10 p-3 text-brand">
            <AppWindow className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-ink">{app.name}</h1>
              <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
                app.status === "active" ? "bg-emerald-50 text-emerald-700" :
                app.status === "suspended" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"
              }`}>
                {app.status.toUpperCase()}
              </span>
            </div>
            <code className="text-xs text-slate-500 font-mono">{app.key}</code>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600">Application Lifecycle Status:</label>
          <select
            value={app.status}
            disabled={statusLoading || app.status === "archived"}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs text-slate-700 focus:border-brand focus:outline-none disabled:opacity-50"
          >
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="archived">Archived (Immutable)</option>
          </select>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          {success}
        </div>
      ) : null}

      {/* Tabs Header */}
      <div className="mb-6 border-b border-line">
        <nav className="flex gap-6">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`pb-3 text-sm font-semibold transition-all border-b-2 -mb-px ${
                  isActive ? "border-brand text-brand font-bold" : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>{children}</div>
    </Shell>
  );
}
