"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { DataTable } from "@/components/table";
import { 
  type User, 
  getUsers, 
  suspendUser, 
  restoreUser, 
  revokeUserSessions 
} from "@/lib/api/client";
import { UserCheck, ShieldAlert, Ban, RefreshCw, LogOut } from "lucide-react";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  const loadUsers = () => {
    getUsers()
      .then(setUsers)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Could not load users"));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleSuspend = async (userId: string) => {
    setLoadingUserId(userId);
    setError(null);
    setSuccess(null);
    try {
      await suspendUser(userId);
      setSuccess("User suspended successfully");
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to suspend user");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleRestore = async (userId: string) => {
    setLoadingUserId(userId);
    setError(null);
    setSuccess(null);
    try {
      await restoreUser(userId);
      setSuccess("User restored successfully");
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to restore user");
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleRevokeSessions = async (userId: string) => {
    setLoadingUserId(userId);
    setError(null);
    setSuccess(null);
    try {
      await revokeUserSessions(userId);
      setSuccess("User sessions revoked successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke sessions");
    } finally {
      setLoadingUserId(null);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>;
      case "suspended":
        return <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">Suspended</span>;
      case "invited":
        return <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">Invited</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">{status}</span>;
    }
  };

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Users</h1>
          <p className="mt-1 text-sm text-slate-600">Directory projection from Keycloak with lifecycle, access and session controls.</p>
        </div>
        <button 
          onClick={loadUsers}
          className="flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          {success}
        </div>
      ) : null}

      <DataTable
        headers={["Email", "Name", "Status", "Verified", "Actions"]}
        rows={users.map((user) => [
          <div key={`${user.id}-email`} className="font-medium text-ink">{user.email}</div>,
          user.display_name ?? "-",
          renderStatusBadge(user.status),
          user.email_verified ? "Yes" : "No",
          <div key={`${user.id}-actions`} className="flex items-center gap-2">
            {user.status === "suspended" ? (
              <button
                disabled={loadingUserId !== null}
                onClick={() => handleRestore(user.id)}
                className="flex items-center gap-1 rounded bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition"
              >
                <UserCheck className="h-3 w-3" />
                Restore
              </button>
            ) : (
              <button
                disabled={loadingUserId !== null}
                onClick={() => handleSuspend(user.id)}
                className="flex items-center gap-1 rounded bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 transition"
              >
                <Ban className="h-3 w-3" />
                Suspend
              </button>
            )}

            <button
              disabled={loadingUserId !== null}
              onClick={() => handleRevokeSessions(user.id)}
              className="flex items-center gap-1 rounded bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition"
              title="Logout user from all active Keycloak sessions"
            >
              <LogOut className="h-3 w-3" />
              Revoke Sessions
            </button>
          </div>
        ])}
      />
    </Shell>
  );
}
