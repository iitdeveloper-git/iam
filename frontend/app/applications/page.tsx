import { Shell } from "@/components/shell";
import { DataTable } from "@/components/table";
import { getApplications } from "@/lib/api/client";

export default async function ApplicationsPage() {
  const applications = await getApplications().catch(() => []);
  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Applications</h1>
          <p className="mt-1 text-sm text-slate-600">Registry, environments, clients, redirect URIs and application access.</p>
        </div>
      </div>
      <DataTable
        headers={["Name", "Key", "Authorization", "Status"]}
        rows={applications.map((app) => [app.name, app.key, app.authorization_mode, app.status])}
      />
    </Shell>
  );
}

