"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  FileClock,
  KeyRound,
  ListChecks,
  Settings2,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  MetricCard,
  StatusBadge,
  authModeLabel,
  formatDate
} from "@/components/ui";
import {
  getApplication,
  getApplicationAccessGrants,
  getApplicationRoles,
  getInvitations,
  getScopedAuditEvents,
  type AccessGrant,
  type Application,
  type AuditEvent,
  type Invitation,
  type Role
} from "@/lib/api/client";

export default function ApplicationOverviewPage() {
  const { id } = useParams() as { id: string };
  const [app, setApp] = useState<Application | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadOverview() {
      setLoading(true);
      setError(null);
      try {
        const [appData, rolesData, grantsData, invitationsData, auditData] = await Promise.all([
          getApplication(id),
          getApplicationRoles(id).catch(() => []),
          getApplicationAccessGrants(id).catch(() => []),
          getInvitations().catch(() => []),
          getScopedAuditEvents(id).catch(() => ({ items: [], total: 0 }))
        ]);
        setApp(appData);
        setRoles(rolesData);
        setGrants(grantsData);
        setInvitations(invitationsData.filter((invite) => invite.application_id === id));
        setEvents(auditData.items || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load application overview");
      } finally {
        setLoading(false);
      }
    }

    if (id) void loadOverview();
  }, [id]);

  if (loading) return <LoadingState label="Loading application overview" />;
  if (error) return <ErrorState message={error} />;
  if (!app) return <EmptyState title="Application not found" description="The requested application record could not be loaded." />;

  const activeGrants = grants.filter((grant) => grant.status === "active" || grant.status === "enabled").length;
  const activeRoles = roles.filter((role) => role.is_active).length;
  const pendingInvitations = invitations.filter((invite) => invite.status === "pending").length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Active users" value={activeGrants} icon={UsersRound} detail={`${grants.length} access grants`} />
        <MetricCard label="Roles" value={roles.length} icon={ShieldCheck} detail={`${activeRoles} active`} />
        <MetricCard label="Pending invitations" value={pendingInvitations} icon={FileClock} tone="amber" detail={`${invitations.length} application invitations`} />
        <MetricCard label="Audit events" value={events.length} icon={ListChecks} tone="blue" detail="Scoped to this application" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="space-y-6">
          <div className="rounded-md border border-line bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Recent activity</h2>
              <Link href={`/applications/${app.id}/audit`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-dark">
                View audit
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-line">
              {events.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="No scoped audit events" description="Application-specific audit events will appear here after activity is recorded." icon={ListChecks} />
                </div>
              ) : events.slice(0, 5).map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{event.action}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">{event.resource_type} {event.resource_id ? `- ${event.resource_id}` : ""}</div>
                  </div>
                  <div className="shrink-0 text-right">
                    <StatusBadge status={event.result} />
                    <div className="mt-1 text-xs text-slate-400">{formatDate(event.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-line bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Roles at a glance</h2>
              <Link href={`/applications/${app.id}/roles`} className="inline-flex items-center gap-1 text-sm font-semibold text-brand hover:text-brand-dark">
                Manage roles
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="divide-y divide-line">
              {roles.length === 0 ? (
                <div className="p-5">
                  <EmptyState title="No application roles" description="Create roles to model application-level permissions." icon={ShieldCheck} />
                </div>
              ) : roles.slice(0, 5).map((role) => (
                <div key={role.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-ink">{role.name}</div>
                    <div className="mt-1 truncate text-xs text-slate-500">{role.key}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{role.is_system ? "System" : "Custom"}</span>
                    <StatusBadge status={role.is_active ? "active" : "inactive"} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-md border border-line bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Application details</h2>
              <Settings2 className="h-4 w-4 text-slate-400" />
            </div>
            <dl className="divide-y divide-line px-5 text-sm">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">Authorization mode</dt>
                <dd className="text-right font-medium text-ink">{authModeLabel(app.authorization_mode)}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">Client key</dt>
                <dd className="max-w-[190px] truncate text-right font-mono text-xs text-ink">{app.key}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-slate-500">Status</dt>
                <dd><StatusBadge status={app.status} /></dd>
              </div>
              <div className="py-3">
                <dt className="text-slate-500">Description</dt>
                <dd className="mt-1 text-slate-700">{app.description || "No description provided."}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-md border border-line bg-white shadow-sm">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-base font-semibold text-ink">Quick actions</h2>
            </div>
            <div className="divide-y divide-line p-2">
              <Link href={`/applications/${app.id}/access`} className="flex items-center justify-between rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <span className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-slate-500" />Add user to application</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href={`/applications/${app.id}/invitations`} className="flex items-center justify-between rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <span className="flex items-center gap-2"><FileClock className="h-4 w-4 text-slate-500" />Create invitation</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
              <Link href={`/applications/${app.id}/permissions`} className="flex items-center justify-between rounded-md px-3 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                <span className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-slate-500" />Review permissions</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </div>

          <div className="rounded-md border border-line bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-ink">Security posture</h2>
            <p className="mt-2 text-sm text-slate-600">Detailed PKCE, MFA and secret-rotation signals require verified backend policy endpoints. This console does not display invented posture scores.</p>
          </div>
        </aside>
      </section>
    </div>
  );
}
