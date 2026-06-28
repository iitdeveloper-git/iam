"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { DataTable } from "@/components/table";
import { type Application, getApplications } from "@/lib/api/client";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getApplications()
      .then(setApplications)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Could not load applications"));
  }, []);

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Applications</h1>
          <p className="mt-1 text-sm text-slate-600">Registry, environments, clients, redirect URIs and application access.</p>
        </div>
      </div>
      {error ? <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}
      <DataTable
        headers={["Name", "Key", "Authorization", "Status"]}
        rows={applications.map((app) => [app.name, app.key, app.authorization_mode, app.status])}
      />
    </Shell>
  );
}
