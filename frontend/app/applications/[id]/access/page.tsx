"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  getApplication,
  getApplicationAccessGrants,
  grantApplicationAccess,
  revokeApplicationAccess,
  getUsers,
  getApplicationRoles,
  assignRoleToUser,
  revokeUserRoleAssignment,
  getUserRoleAssignments,
  type AccessGrant,
  type User,
  type Role,
  type Application
} from "@/lib/api/client";
import { DataTable } from "@/components/table";
import { Plus, X, ShieldAlert, Sparkles, UserPlus, ShieldMinus, ShieldAlert as AlertIcon } from "lucide-react";

export default function ApplicationAccessPage() {
  const { id } = useParams() as { id: string };
  const [app, setApp] = useState<Application | null>(null);
  const [grants, setGrants] = useState<AccessGrant[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Grant Access Modal
  const [isGrantOpen, setIsGrantOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");

  // Assign Role Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [activeGrant, setActiveGrant] = useState<AccessGrant | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const loadData = async () => {
    try {
      const [appData, grantsData, rolesData, usersData] = await Promise.all([
        getApplication(id),
        getApplicationAccessGrants(id),
        getApplicationRoles(id),
        getUsers()
      ]);
      setApp(appData);
      setGrants(grantsData);
      setRoles(rolesData.filter((r) => r.is_active)); // Only active roles can be assigned
      setAllUsers(usersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load access page data");
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const handleGrantAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !selectedUserId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await grantApplicationAccess(app.id, { user_id: selectedUserId });
      setSuccess("Application access granted successfully.");
      setIsGrantOpen(false);
      setSelectedUserId("");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant access");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async (grant: AccessGrant) => {
    if (!app) return;
    if (!confirm(`Warning: Revoking access for '${grant.email}' will also revoke all active role assignments. Proceed?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await revokeApplicationAccess(app.id, grant.id);
      setSuccess(`Application access revoked for '${grant.email}'.`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke access");
    }
  };

  const openAssignModal = (grant: AccessGrant) => {
    setActiveGrant(grant);
    setSelectedRoleId("");
    setIsAssignOpen(true);
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !activeGrant || !selectedRoleId) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await assignRoleToUser(activeGrant.user_id, selectedRoleId);
      setSuccess("Role assigned successfully.");
      setIsAssignOpen(false);
      setActiveGrant(null);
      setSelectedRoleId("");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign role");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeRole = async (grant: AccessGrant, roleId: string) => {
    if (!app) return;
    setError(null);
    setSuccess(null);

    try {
      // Find role assignment ID for the user's role
      const userAssignments = await getUserRoleAssignments(grant.user_id);
      const targetAsgn = userAssignments.find((a) => a.role_id === roleId && a.status === "active" && a.application_id === app.id);
      
      if (!targetAsgn) {
        throw new Error("Active role assignment not found.");
      }

      await revokeUserRoleAssignment(grant.user_id, targetAsgn.id);
      setSuccess("Role assignment revoked.");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke role");
    }
  };

  // Get users who do not have access yet
  const getEligibleUsers = () => {
    const grantedUserIds = new Set(grants.filter((g) => g.status === "active").map((g) => g.user_id));
    return allUsers.filter((u) => !grantedUserIds.has(u.id));
  };

  const isReadOnly = app?.status === "suspended" || app?.status === "archived";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Users & Access Grants</h2>
          <p className="text-xs text-slate-500">Configure which users can access this application and manage their scoped role mappings.</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setIsGrantOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark transition"
          >
            <UserPlus className="h-4 w-4" />
            Grant Access
          </button>
        )}
      </div>

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          {success}
        </div>
      ) : null}

      <DataTable
        headers={["User", "Email", "Status", "Assigned Roles", "Granted At", "Actions"]}
        rows={grants.map((grant) => [
          <div key={`${grant.id}-user`} className="font-semibold text-ink">{grant.display_name || "—"}</div>,
          <code key={`${grant.id}-email`} className="text-xs text-slate-600 font-mono">{grant.email}</code>,
          <span key={`${grant.id}-status`} className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
            grant.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
          }`}>
            {grant.status === "active" ? "Active" : "Revoked"}
          </span>,
          <div key={`${grant.id}-roles`} className="flex flex-wrap gap-1.5 max-w-sm">
            {grant.status === "active" && grant.assigned_roles.map((rid) => {
              const roleObj = roles.find((r) => r.id === rid);
              if (!roleObj) return null;
              return (
                <span key={rid} className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-800">
                  {roleObj.name}
                  {!isReadOnly && (
                    <button
                      onClick={() => handleRevokeRole(grant, rid)}
                      className="ml-1 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              );
            })}
            {grant.status === "active" && grant.assigned_roles.length === 0 && (
              <span className="text-xs text-slate-400 italic">No roles mapped</span>
            )}
            {grant.status !== "active" && <span className="text-xs text-slate-400">—</span>}
          </div>,
          <div key={`${grant.id}-at`} className="text-xs text-slate-500">{new Date(grant.granted_at).toLocaleDateString()}</div>,
          <div key={`${grant.id}-actions`} className="flex items-center gap-3">
            {grant.status === "active" && !isReadOnly && (
              <>
                <button
                  onClick={() => openAssignModal(grant)}
                  className="text-xs font-semibold text-brand hover:underline"
                >
                  Assign Role
                </button>
                <button
                  onClick={() => handleRevokeAccess(grant)}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Revoke Access
                </button>
              </>
            )}
            {grant.status !== "active" && <span className="text-xs text-slate-400">—</span>}
          </div>
        ])}
      />

      {/* Grant Access Modal */}
      {isGrantOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-ink">Grant Application Access</h3>
              <button onClick={() => setIsGrantOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleGrantAccess} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Select User</label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">-- Choose User --</option>
                  {getEligibleUsers().map((u) => (
                    <option key={u.id} value={u.id}>{u.display_name || u.email} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setIsGrantOpen(false)}
                  className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedUserId}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
                >
                  Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Role Modal */}
      {isAssignOpen && activeGrant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-ink">Assign Application Role</h3>
              <button onClick={() => setIsAssignOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAssignRole} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">User</label>
                <input
                  type="text"
                  disabled
                  value={`${activeGrant.display_name || ""} (${activeGrant.email})`}
                  className="mt-1 w-full rounded-md border border-line bg-slate-100 px-3 py-2 text-sm text-slate-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Select Role</label>
                <select
                  required
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">-- Choose Role --</option>
                  {roles
                    .filter((r) => !activeGrant.assigned_roles.includes(r.id))
                    .map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.key})</option>
                    ))}
                </select>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setIsAssignOpen(false)}
                  className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedRoleId}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
                >
                  Assign Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
