"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  AppWindow,
  ArrowRight,
  CheckCircle2,
  FileClock,
  LockKeyhole,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { Shell } from "@/components/shell";
import {
  EmptyState,
  ErrorState,
  HealthIcon,
  LoadingState,
  MetricCard,
  PageHeader,
  StatusBadge,
  authModeLabel,
  formatDate
} from "@/components/ui";
import {
  getApplications,
  getAuditEvents,
  getInvitations,
  getSystemHealth,
  getUsers,
  type Application,
  type AuditEvent,
  type Invitation,
  type SystemHealth,
  type User
} from "@/lib/api/client";

export default function DashboardPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      setError(null);
      try {
        const [healthData, usersData, appsData, invitationsData, eventsData] = await Promise.all([
          getSystemHealth().catch(() => null),
          getUsers(),
          getApplications(),
          getInvitations().catch(() => []),
          getAuditEvents()
        ]);
        setHealth(healthData);
        setUsers(usersData);
        setApplications(appsData);
        setInvitations(invitationsData);
        setAuditEvents(eventsData.items || []);
        setAuditTotal(eventsData.total);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load IAM dashboard data");
      } finally {
        setLoading(false);
      }
    }

    void loadDashboardData();
  }, []);

  const activeUsers = users.filter((user) => user.status === "active" || user.status === "enabled").length;
  const pendingInvitations = invitations.filter((invite) => invite.status === "pending").length;
  const activeApplications = applications.filter((app) => app.status === "active").length;

  const healthRows = useMemo(() => {
    const checks = health?.checks;
    return [
      { label: "IAM Core Services", detail: "Authentication and authorization API", status: checks?.api ?? "unknown" },
      { label: "Identity Provider", detail: "Keycloak integration", status: checks?.keycloak ?? "unknown" },
      { label: "Database", detail: "Primary PostgreSQL store", status: checks?.postgres ?? "unknown" }
    ];
  }, [health]);

  return (
    <Shell>
      <PageHeader title="Overview" description="IAM operations, application access and security activity at a glance." />

      {error ? <div className="mb-6"><ErrorState message={error} /></div> : null}
      {loading ? <LoadingState label="Loading IAM operations" /> : null}

      {!loading ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Applications" value={applications.length} icon={AppWindow} detail={`${activeApplications} active`} />
            <MetricCard label="Active users" value={activeUsers} icon={UserCheck} detail={`${users.length} total users`} />
            <MetricCard label="Pending invitations" value={pendingInvitations} icon={FileClock} tone="amber" detail={`${invitations.length} total invitations`} />
            <MetricCard label="Security events" value={auditTotal} icon={AlertTriangle} tone="rose" detail="From audit event stream" />
            <MetricCard label="MFA adoption" value="Unavailable" icon={LockKeyhole} tone="slate" detail="No verified adoption endpoint" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
            <div className="rounded-md border border-line bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div className="flex items-center gap-2">
                  <AppWindow className="h-5 w-5 text-brand" />
                  <h2 className="text-base font-semibold text-ink">Recent applications</h2>
                </div>
                <Link href="/applications" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-dark">
                  View all applications
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              {applications.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="No applications registered" description="Register an application to start managing IAM access." icon={AppWindow} />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-line bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Application</th>
                        <th className="px-5 py-3 font-semibold">Client ID</th>
                        <th className="px-5 py-3 font-semibold">Authorization</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {applications.slice(0, 5).map((app) => (
                        <tr key={app.id} className="border-b border-line last:border-0 hover:bg-slate-50">
                          <td className="px-5 py-4">
                            <Link href={`/applications/${app.id}`} className="font-semibold text-ink hover:text-brand">{app.name}</Link>
                            <div className="mt-1 text-xs text-slate-500">{app.description || app.key}</div>
                          </td>
                          <td className="px-5 py-4">
                            <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{app.key}</code>
                          </td>
                          <td className="px-5 py-4 text-slate-700">{authModeLabel(app.authorization_mode)}</td>
                          <td className="px-5 py-4"><StatusBadge status={app.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-md border border-line bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-brand" />
                    <h2 className="text-base font-semibold text-ink">Recent security events</h2>
                  </div>
                  <Link href="/audit" className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-dark">
                    View all
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="divide-y divide-line">
                  {auditEvents.length === 0 ? (
                    <div className="p-5 text-sm text-slate-500">No audit events have been ingested yet.</div>
                  ) : auditEvents.slice(0, 5).map((event) => (
                    <Link key={event.id} href="/audit" className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">{event.action}</div>
                        <div className="mt-1 truncate text-xs text-slate-500">{event.resource_type} {event.resource_id ? `- ${event.resource_id}` : ""}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <StatusBadge status={event.result} />
                        <div className="mt-1 text-xs text-slate-400">{formatDate(event.created_at)}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-line bg-white shadow-sm">
                <div className="border-b border-line px-5 py-4">
                  <h2 className="text-base font-semibold text-ink">System health</h2>
                </div>
                <div className="divide-y divide-line p-2">
                  {healthRows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-4 rounded-md px-3 py-3">
                      <div className="flex items-center gap-3">
                        <HealthIcon status={row.status} />
                        <div>
                          <div className="text-sm font-semibold text-ink">{row.label}</div>
                          <div className="text-xs text-slate-500">{row.detail}</div>
                        </div>
                      </div>
                      <span className="text-sm font-semibold capitalize text-slate-700">{row.status}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-sm text-slate-600">
                  <CheckCircle2 className={`h-4 w-4 ${health?.status === "ok" ? "text-emerald-600" : "text-amber-600"}`} />
                  {health ? `Overall status: ${health.status}` : "Health check unavailable"}
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </Shell>
  );
}
