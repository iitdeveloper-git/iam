"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { DataTable } from "@/components/table";
import { type User, getUsers } from "@/lib/api/client";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUsers()
      .then(setUsers)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Could not load users"));
  }, []);

  return (
    <Shell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Users</h1>
        <p className="mt-1 text-sm text-slate-600">Directory projection from Keycloak with lifecycle, access and session controls.</p>
      </div>
      {error ? <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</div> : null}
      <DataTable
        headers={["Email", "Name", "Status", "Verified"]}
        rows={users.map((user) => [user.email, user.display_name ?? "-", user.status, user.email_verified ? "Yes" : "No"])}
      />
    </Shell>
  );
}
