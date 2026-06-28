import { Shell } from "@/components/shell";

const rows = [
  ["Authorization Code + PKCE", "Required"],
  ["Privileged MFA", "Production action"],
  ["Redirect wildcards", "Blocked"],
  ["Secret storage", "Reference only"],
  ["Keycloak admin credentials", "Server only"]
];

export default function SecurityPage() {
  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Security</h1>
        <p className="mt-1 text-sm text-slate-600">Policy projection, identity provider state, sessions and hardening checks.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between rounded-md border border-line bg-white p-4 text-sm">
            <span className="font-medium text-ink">{label}</span>
            <span className="text-slate-600">{value}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

