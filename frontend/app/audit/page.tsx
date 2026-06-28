import { Shell } from "@/components/shell";
import { DataTable } from "@/components/table";

export default function AuditPage() {
  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Audit Logs</h1>
        <p className="mt-1 text-sm text-slate-600">Immutable administrative and security activity history.</p>
      </div>
      <DataTable headers={["Time", "Actor", "Action", "Resource", "Result", "Request ID"]} rows={[]} />
    </Shell>
  );
}

