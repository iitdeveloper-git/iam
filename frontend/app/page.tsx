"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, UserCheck, AppWindow, AlertTriangle, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Shell } from "@/components/shell";
import { 
  getUsers, 
  getApplications, 
  getSystemHealth, 
  getAuditEvents, 
  type SystemHealth, 
  type AuditEvent 
} from "@/lib/api/client";

export default function DashboardPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [usersCount, setUsersCount] = useState<string>("0");
  const [appsCount, setAppsCount] = useState<string>("0");
  const [eventsCount, setEventsCount] = useState<string>("0");
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const healthData = await getSystemHealth();
        setHealth(healthData);
      } catch (err) {
        console.error("Failed to load health check", err);
      }

      try {
        const [users, apps, events] = await Promise.all([
          getUsers(),
          getApplications(),
          getAuditEvents()
        ]);
        setUsersCount(users.length.toString());
        setAppsCount(apps.length.toString());
        setEventsCount(events.total.toString());
        setAuditEvents(events.items || []);
      } catch (err) {
        // Silent catch since user might not be authenticated yet
        console.log("Authenticated dashboard data not available yet");
      }
    }

    void loadDashboardData();
    const interval = setInterval(() => {
      void loadDashboardData();
    }, 10000); // refresh every 10s

    return () => clearInterval(interval);
  }, []);

  const metrics = [
    { label: "Active users", value: usersCount, icon: UserCheck },
    { label: "Applications", value: appsCount, icon: AppWindow },
    { label: "MFA adoption", value: "Pending", icon: ShieldCheck },
    { label: "Security events", value: eventsCount, icon: AlertTriangle }
  ];

  const getHealthStatusDisplay = (service: "api" | "postgres" | "keycloak") => {
    if (!health) {
      return { text: "Checking...", className: "text-slate-500", icon: AlertCircle };
    }
    const val = health.checks[service];
    if (val === "ok") {
      if (service === "postgres") return { text: "Migrated", className: "text-emerald-600 font-semibold", icon: CheckCircle2 };
      if (service === "keycloak") return { text: "Connected", className: "text-emerald-600 font-semibold", icon: CheckCircle2 };
      return { text: "Ready", className: "text-emerald-600 font-semibold", icon: CheckCircle2 };
    }
    if (val === "failed") {
      if (service === "postgres") return { text: "Requires migrations", className: "text-rose-600 font-semibold", icon: XCircle };
      if (service === "keycloak") return { text: "Requires local bootstrap", className: "text-rose-600 font-semibold", icon: XCircle };
      return { text: "Offline", className: "text-rose-600 font-semibold", icon: XCircle };
    }
    return { text: "Unknown status", className: "text-amber-600 font-semibold", icon: AlertCircle };
  };

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Operations Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Health, access, invitations and security posture for IITDEVELOPER identity.</p>
      </div>
      
      <section className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="rounded-md border border-line bg-white p-4 transition-all hover:shadow-sm">
              <Icon className="mb-4 h-5 w-5 text-brand" />
              <div className="text-2xl font-semibold text-ink">{metric.value}</div>
              <div className="text-sm text-slate-500">{metric.label}</div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">System health</h2>
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            {(["api", "keycloak", "postgres"] as const).map((service) => {
              const display = getHealthStatusDisplay(service);
              const Icon = display.icon;
              const serviceLabel = service === "api" ? "IAM API" : service === "keycloak" ? "Keycloak" : "PostgreSQL";
              return (
                <div key={service} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                  <span className="font-medium text-slate-700">{serviceLabel}</span>
                  <div className="flex items-center gap-1.5">
                    <Icon className={`h-4 w-4 ${display.className}`} />
                    <span className={display.className}>{display.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">Recent security events</h2>
          <div className="mt-4 max-h-[160px] overflow-y-auto pr-1">
            {auditEvents.length === 0 ? (
              <div className="mt-8 text-center text-sm text-slate-500">No audit events have been ingested yet</div>
            ) : (
              <div className="space-y-3">
                {auditEvents.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex justify-between gap-4 border-b border-slate-50 pb-2 text-xs last:border-0 last:pb-0">
                    <div>
                      <div className="font-semibold text-ink">{event.action}</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">{event.resource_type}: {event.resource_id || "n/a"}</div>
                    </div>
                    <div className="text-right text-slate-400 text-[10px] whitespace-nowrap">
                      {new Date(event.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}
