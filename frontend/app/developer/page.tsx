import { Shell } from "@/components/shell";

const endpoints = [
  ["Issuer", "http://localhost:8080/realms/iitd"],
  ["Authorization", "http://localhost:8080/realms/iitd/protocol/openid-connect/auth"],
  ["Token", "http://localhost:8080/realms/iitd/protocol/openid-connect/token"],
  ["JWKS", "http://localhost:8080/realms/iitd/protocol/openid-connect/certs"],
  ["Logout", "http://localhost:8080/realms/iitd/protocol/openid-connect/logout"]
];

export default function DeveloperPage() {
  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Developer Integration</h1>
        <p className="mt-1 text-sm text-slate-600">OIDC configuration for applications using IITD IAM.</p>
      </div>
      <div className="rounded-md border border-line bg-white p-5">
        <dl className="space-y-4">
          {endpoints.map(([label, value]) => (
            <div key={label} className="grid gap-1 text-sm md:grid-cols-[160px_1fr]">
              <dt className="font-medium text-ink">{label}</dt>
              <dd className="break-all font-mono text-slate-600">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Shell>
  );
}
