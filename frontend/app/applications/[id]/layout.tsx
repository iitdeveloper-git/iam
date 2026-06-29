"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AppWindow,
  BookOpen,
  ChevronDown,
  Copy,
  MoreHorizontal,
  ShieldAlert,
  Sparkles
} from "lucide-react";
import { Shell } from "@/components/shell";
import { ErrorState, LoadingState, StatusBadge, authModeLabel } from "@/components/ui";
import { getApplication, updateApplication, type Application } from "@/lib/api/client";

export default function ApplicationLayout({ children }: { children: React.ReactNode }) {
  const { id } = useParams() as { id: string };
  const pathname = usePathname();
  const [app, setApp] = useState<Application | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const loadApp = () => {
    getApplication(id)
      .then(setApp)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load application"));
  };

  useEffect(() => {
    if (id) loadApp();
  }, [id]);

  const handleStatusChange = async (newStatus: string) => {
    if (!app || newStatus === app.status) return;
    if (newStatus === "archived" && !confirm("Archiving this application is permanent. Do you want to continue?")) return;
    if (newStatus === "suspended" && !confirm("Suspend this application? Access mutations will be blocked.")) return;

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
        <ErrorState message={error} />
      </Shell>
    );
  }

  if (!app) {
    return (
      <Shell>
        <LoadingState label="Loading application details" />
      </Shell>
    );
  }

  const tabs = [
    { name: "Overview", href: `/applications/${app.id}` },
    { name: "Roles", href: `/applications/${app.id}/roles` },
    { name: "Permissions", href: `/applications/${app.id}/permissions` },
    { name: "Users & Access", href: `/applications/${app.id}/access` },
    { name: "Invitations", href: `/applications/${app.id}/invitations` },
    { name: "Audit", href: `/applications/${app.id}/audit` }
  ];

  return (
    <Shell>
      <div className="mb-6">
        <div className="mb-4 text-sm text-slate-500">
          <Link href="/applications" className="font-semibold text-brand hover:text-brand-dark">Applications</Link>
          <span> / {app.name}</span>
        </div>

        <div className="flex flex-col gap-4 border-b border-line pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
              <AppWindow className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-ink">{app.name}</h1>
                <StatusBadge status={app.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  Client ID <code className="ml-1 text-slate-700">{app.id}</code>
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  Key <code className="ml-1 text-slate-700">{app.key}</code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(app.key)}
                    className="ml-2 align-middle text-slate-400 hover:text-brand"
                    aria-label="Copy application key"
                  >
                    <Copy className="inline h-3.5 w-3.5" />
                  </button>
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">Mode {authModeLabel(app.authorization_mode)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/developer" className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
              <BookOpen className="h-4 w-4" />
              Docs
            </Link>
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <MoreHorizontal className="h-4 w-4" />
                More
                <ChevronDown className="h-4 w-4" />
              </button>
              {menuOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-line bg-white p-2 shadow-xl">
                  {["active", "suspended", "archived"].map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={statusLoading || app.status === "archived"}
                      onClick={() => {
                        setMenuOpen(false);
                        void handleStatusChange(status);
                      }}
                      className="block w-full rounded-md px-3 py-2 text-left text-sm capitalize text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Set {status}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {success ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {success}
          </div>
        </div>
      ) : null}
      {app.status === "suspended" ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Application is suspended. Access and administrative mutations are restricted by lifecycle policy.
          </div>
        </div>
      ) : null}

      <div className="mb-6 overflow-x-auto border-b border-line">
        <nav className="flex min-w-max gap-7">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.name}
                href={tab.href}
                className={`-mb-px border-b-2 pb-3 text-sm font-semibold transition ${
                  active ? "border-brand text-brand" : "border-transparent text-slate-600 hover:text-ink"
                }`}
              >
                {tab.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {children}
    </Shell>
  );
}
