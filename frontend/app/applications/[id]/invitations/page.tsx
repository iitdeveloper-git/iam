"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  getApplication, 
  getInvitations, 
  createInvitation, 
  revokeInvitation, 
  getApplicationRoles,
  type Invitation, 
  type Role, 
  type Application
} from "@/lib/api/client";
import { DataTable } from "@/components/table";
import { Plus, X, ShieldAlert, Sparkles, FileClock } from "lucide-react";

export default function ApplicationInvitationsPage() {
  const { id } = useParams() as { id: string };
  const [app, setApp] = useState<Application | null>(null);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Create Invitation Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");

  const loadData = async () => {
    try {
      const [appData, invData, rolesData] = await Promise.all([
        getApplication(id),
        getInvitations(),
        getApplicationRoles(id)
      ]);
      setApp(appData);
      
      // Filter invitations for this application only
      const appInvitations = invData.filter((inv) => inv.application_id === id);
      setInvitations(appInvitations);
      
      // Only active roles from this application can be selected
      setRoles(rolesData.filter((r) => r.is_active));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invitations data");
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app || !inviteEmail) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload: { email: string; application_id: string; role_id?: string } = {
        email: inviteEmail.trim(),
        application_id: app.id
      };
      if (selectedRoleId) {
        payload.role_id = selectedRoleId;
      }

      await createInvitation(payload);
      setSuccess(`Invitation sent to '${inviteEmail}'.`);
      setIsCreateOpen(false);
      setInviteEmail("");
      setSelectedRoleId("");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeInvite = async (inv: Invitation) => {
    if (!app) return;
    if (!confirm(`Are you sure you want to revoke the invitation for '${inv.email}'?`)) {
      return;
    }

    setError(null);
    setSuccess(null);

    try {
      await revokeInvitation(inv.id);
      setSuccess(`Invitation revoked for '${inv.email}'.`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke invitation");
    }
  };

  const isReadOnly = app?.status === "suspended" || app?.status === "archived";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Application Invitations</h2>
          <p className="text-xs text-slate-500 font-medium">Manage pending user invitations and default role assignments for this application.</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark transition"
          >
            <Plus className="h-4 w-4" />
            Invite User
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
        headers={["Email", "Assigned Role", "Status", "Expires At", "Actions"]}
        rows={invitations.map((inv) => {
          const roleObj = roles.find((r) => r.id === inv.role_id);
          return [
            <code key={`${inv.id}-email`} className="text-xs text-slate-700 font-mono font-semibold">{inv.email}</code>,
            <span key={`${inv.id}-role`} className="text-xs text-slate-600">{roleObj ? roleObj.name : "— (Access Only)"}</span>,
            <span key={`${inv.id}-status`} className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
              inv.status === "pending" ? "bg-amber-50 text-amber-700" :
              inv.status === "accepted" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
            }`}>
              {inv.status.toUpperCase()}
            </span>,
            <div key={`${inv.id}-expires`} className="text-xs text-slate-500">{new Date(inv.expires_at).toLocaleDateString()}</div>,
            <div key={`${inv.id}-actions`} className="flex items-center gap-3">
              {inv.status === "pending" && !isReadOnly ? (
                <button
                  onClick={() => handleRevokeInvite(inv)}
                  className="text-xs font-semibold text-rose-600 hover:underline"
                >
                  Revoke
                </button>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </div>
          ];
        })}
      />

      {/* Invite User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-ink">Invite User to Application</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateInvite} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Default Application Role (Optional)</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="">-- No Default Role (Access Only) --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.key})</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">Only active scoped roles can be pre-assigned during invitation.</span>
              </div>
              <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !inviteEmail}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
