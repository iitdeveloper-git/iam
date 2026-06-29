"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AppWindow,
  Archive,
  CheckCircle2,
  Copy,
  MoreHorizontal,
  Plus,
  ShieldAlert,
  Sparkles,
  X
} from "lucide-react";
import { Shell } from "@/components/shell";
import {
  EmptyState,
  ErrorState,
  FilterToolbar,
  LoadingState,
  MetricCard,
  PageHeader,
  SearchInput,
  SelectField,
  StatusBadge,
  authModeLabel
} from "@/components/ui";
import { createApplication, getApplications, type Application } from "@/lib/api/client";

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [authFilter, setAuthFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAuthMode, setNewAuthMode] = useState("authentication_only");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const loadApplications = () => {
    setPageLoading(true);
    getApplications()
      .then(setApplications)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Could not load applications"))
      .finally(() => setPageLoading(false));
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const filteredApplications = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return applications.filter((app) => {
      const matchesQuery = !normalized || [app.name, app.key, app.description ?? ""].some((value) => value.toLowerCase().includes(normalized));
      const matchesStatus = statusFilter === "all" || app.status === statusFilter;
      const matchesAuth = authFilter === "all" || app.authorization_mode === authFilter;
      return matchesQuery && matchesStatus && matchesAuth;
    });
  }, [applications, authFilter, query, statusFilter]);

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const keyRegex = /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/;
    if (!keyRegex.test(newKey)) {
      setError("Application key must be lowercase alphanumeric and dashes only, start and end with a letter or number, and be between 3 and 80 characters.");
      setLoading(false);
      return;
    }

    try {
      await createApplication({
        key: newKey.trim(),
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        authorization_mode: newAuthMode
      });
      setSuccess(`Application "${newName}" registered successfully`);
      setIsModalOpen(false);
      setNewKey("");
      setNewName("");
      setNewDesc("");
      setNewAuthMode("authentication_only");
      loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register application");
    } finally {
      setLoading(false);
    }
  };

  const copyKey = async (event: React.MouseEvent, key: string) => {
    event.stopPropagation();
    await navigator.clipboard.writeText(key);
    setSuccess(`Copied client ID "${key}"`);
  };

  const counts = {
    active: applications.filter((app) => app.status === "active").length,
    suspended: applications.filter((app) => app.status === "suspended").length,
    archived: applications.filter((app) => app.status === "archived").length
  };

  return (
    <Shell>
      <PageHeader
        eyebrow="Home / Applications"
        title="Applications"
        description="Manage application registration, access mode and lifecycle status."
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" />
            Register Application
          </button>
        }
      />

      {error ? <div className="mb-4"><ErrorState message={error} /></div> : null}
      {success ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {success}
          </div>
        </div>
      ) : null}

      <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total applications" value={applications.length} icon={AppWindow} detail="Across IAM registry" />
        <MetricCard label="Active" value={counts.active} icon={CheckCircle2} detail="Currently available" />
        <MetricCard label="Suspended" value={counts.suspended} icon={ShieldAlert} tone="amber" detail="Administrative mutations blocked" />
        <MetricCard label="Archived" value={counts.archived} icon={Archive} tone="slate" detail="Immutable records" />
      </section>

      <FilterToolbar>
        <div className="min-w-[260px] flex-[2]">
          <SearchInput value={query} onChange={setQuery} placeholder="Search applications by name, key or description..." />
        </div>
        <SelectField
          label="Status"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Active", value: "active" },
            { label: "Suspended", value: "suspended" },
            { label: "Archived", value: "archived" }
          ]}
        />
        <SelectField
          label="Authorization mode"
          value={authFilter}
          onChange={setAuthFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Authentication Only", value: "authentication_only" },
            { label: "Application Access", value: "application_access" },
            { label: "Direct Roles", value: "direct_roles" },
            { label: "Product Managed", value: "product_managed" }
          ]}
        />
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setStatusFilter("all");
            setAuthFilter("all");
          }}
          className="h-10 rounded-md border border-line px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Clear Filters
        </button>
      </FilterToolbar>

      {pageLoading ? <LoadingState label="Loading applications" /> : null}

      {!pageLoading && filteredApplications.length === 0 ? (
        <EmptyState
          title={applications.length === 0 ? "No applications registered" : "No applications match the filters"}
          description={applications.length === 0 ? "Register the first application to start managing client access." : "Adjust the search or filters to return application records."}
          icon={AppWindow}
          action={
            applications.length === 0 ? (
              <button type="button" onClick={() => setIsModalOpen(true)} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                Register Application
              </button>
            ) : null
          }
        />
      ) : null}

      {!pageLoading && filteredApplications.length > 0 ? (
        <div className="overflow-hidden rounded-md border border-line bg-white shadow-sm">
          <div className="grid grid-cols-[minmax(300px,1.5fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)_minmax(130px,0.4fr)_88px] border-b border-line bg-slate-50 px-5 py-3 text-xs font-semibold uppercase text-slate-500 max-xl:hidden">
            <div>Application</div>
            <div>Key</div>
            <div>Authorization mode</div>
            <div>Status</div>
            <div className="text-right">Actions</div>
          </div>
          <div className="divide-y divide-line">
            {filteredApplications.map((app) => (
              <button
                type="button"
                key={app.id}
                onClick={() => router.push(`/applications/${app.id}`)}
                className="grid w-full grid-cols-1 gap-4 px-5 py-5 text-left transition hover:bg-slate-50 xl:grid-cols-[minmax(300px,1.5fr)_minmax(220px,0.8fr)_minmax(220px,0.8fr)_minmax(130px,0.4fr)_88px] xl:items-center"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-line bg-brand/10 text-lg font-bold text-brand">
                    {app.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{app.name}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-slate-500">{app.description || "No description provided."}</div>
                  </div>
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <code className="truncate rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">{app.key}</code>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => copyKey(event, app.key)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") void copyKey(event as unknown as React.MouseEvent, app.key);
                    }}
                    className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-brand"
                    aria-label={`Copy ${app.key}`}
                  >
                    <Copy className="h-4 w-4" />
                  </span>
                </div>
                <div className="text-sm text-slate-700">{authModeLabel(app.authorization_mode)}</div>
                <div><StatusBadge status={app.status} /></div>
                <div className="text-right text-slate-400">
                  <MoreHorizontal className="ml-auto h-5 w-5" />
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-line px-5 py-4 text-sm text-slate-500">
            <span>Showing {filteredApplications.length} of {applications.length} applications</span>
            <span className="rounded-md border border-brand/30 px-3 py-1 font-semibold text-brand">1</span>
          </div>
        </div>
      ) : null}

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-md border border-line bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Register Application</h2>
                <p className="mt-1 text-sm text-slate-500">Create a managed IAM application record.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="rounded-md p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 px-6 py-5">
              <label className="block text-sm font-semibold text-slate-700">
                Name
                <input
                  type="text"
                  required
                  placeholder="Learning Management System"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Application key
                <input
                  type="text"
                  required
                  placeholder="iitd-lms"
                  value={newKey}
                  onChange={(event) => setNewKey(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">Lowercase letters, numbers and dashes. Used as the client ID.</span>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Description
                <textarea
                  placeholder="Service description and owner context..."
                  value={newDesc}
                  onChange={(event) => setNewDesc(event.target.value)}
                  className="mt-1 min-h-20 w-full rounded-md border border-line px-3 py-2 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Authorization mode
                <select
                  value={newAuthMode}
                  onChange={(event) => setNewAuthMode(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm font-normal outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
                >
                  <option value="authentication_only">Authentication Only</option>
                  <option value="application_access">Application Access</option>
                  <option value="direct_roles">Direct Roles</option>
                  <option value="product_managed">Product Managed</option>
                </select>
              </label>
              <div className="flex justify-end gap-3 border-t border-line pt-5">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60">
                  {loading ? "Registering..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}
