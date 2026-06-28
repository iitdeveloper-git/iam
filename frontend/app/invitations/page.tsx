import { Shell } from "@/components/shell";
import { DataTable } from "@/components/table";

export default function InvitationsPage() {
  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Invitations</h1>
        <p className="mt-1 text-sm text-slate-600">Single-use invitations with expiration, resend, revoke and audit controls.</p>
      </div>
      <DataTable headers={["Email", "Application", "Role", "Status", "Expiry"]} rows={[]} />
    </Shell>
  );
}

