import { Shell } from "@/components/shell";
import { DataTable } from "@/components/table";
import { getUsers } from "@/lib/api/client";

export default async function UsersPage() {
  const users = await getUsers().catch(() => []);
  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Users</h1>
        <p className="mt-1 text-sm text-slate-600">Directory projection from Keycloak with lifecycle, access and session controls.</p>
      </div>
      <DataTable
        headers={["Email", "Name", "Status", "Verified"]}
        rows={users.map((user) => [user.email, user.display_name ?? "-", user.status, user.email_verified ? "Yes" : "No"])}
      />
    </Shell>
  );
}

