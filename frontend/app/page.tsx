import { ShieldCheck, UserCheck, AppWindow, AlertTriangle } from "lucide-react";
import { Shell } from "@/components/shell";

const metrics = [
  { label: "Active users", value: "0", icon: UserCheck },
  { label: "Applications", value: "0", icon: AppWindow },
  { label: "MFA adoption", value: "Pending", icon: ShieldCheck },
  { label: "Security events", value: "0", icon: AlertTriangle }
];

export default function DashboardPage() {
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
            <div key={metric.label} className="rounded-md border border-line bg-white p-4">
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
          <div className="mt-4 space-y-3 text-sm text-slate-600">
            <div className="flex justify-between"><span>IAM API</span><span className="text-brand">Ready endpoint configured</span></div>
            <div className="flex justify-between"><span>Keycloak</span><span className="text-accent">Requires local bootstrap</span></div>
            <div className="flex justify-between"><span>PostgreSQL</span><span className="text-accent">Requires migrations</span></div>
          </div>
        </div>
        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="text-base font-semibold text-ink">Recent security events</h2>
          <div className="mt-8 text-center text-sm text-slate-500">No audit events have been ingested yet</div>
        </div>
      </section>
    </Shell>
  );
}

