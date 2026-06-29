"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApplication, type Application } from "@/lib/api/client";
import { ShieldAlert, Info } from "lucide-react";

export default function ApplicationOverviewPage() {
  const { id } = useParams() as { id: string };
  const [app, setApp] = useState<Application | null>(null);

  useEffect(() => {
    if (id) {
      getApplication(id).then(setApp).catch(console.error);
    }
  }, [id]);

  if (!app) return <div className="text-sm text-slate-500">Loading overview...</div>;

  return (
    <div className="space-y-6">
      {app.status === "suspended" && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">Application Suspended:</span> This application is currently in read-only administrative mode. All modifications (creating roles, modifying mappings, invitations, and access grants) are blocked.
          </div>
        </div>
      )}

      {app.status === "archived" && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 flex items-start gap-2">
          <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
          <div>
            <span className="font-bold">Application Archived:</span> This application is fully immutable. No administrative mutations are permitted.
          </div>
        </div>
      )}

      <div className="rounded-md border border-line bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ink mb-4">Application Details</h2>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold uppercase text-slate-500">Application Key / Client ID</dt>
            <dd className="mt-1 text-sm font-mono text-ink">{app.key}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase text-slate-500">Authorization Mode</dt>
            <dd className="mt-1 text-sm text-ink">
              {app.authorization_mode === "authentication_only" ? "Authentication Only (SSO)" :
               app.authorization_mode === "application_access" ? "Application Access Grants" :
               app.authorization_mode === "direct_roles" ? "Direct Roles Mapping" : "Product Managed Policies"}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase text-slate-500">Description</dt>
            <dd className="mt-1 text-sm text-slate-700">{app.description || "No description provided."}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 p-6">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-slate-600" />
          Administrative Policies
        </h3>
        <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
          <li>Platform permissions cannot be created or modified by application administrators.</li>
          <li>Role keys must be alphanumeric lowercase, dots, underscores, or dashes, and are immutable after creation.</li>
          <li>Revoking application access automatically revokes all role assignments for that user in this application.</li>
        </ul>
      </div>
    </div>
  );
}
