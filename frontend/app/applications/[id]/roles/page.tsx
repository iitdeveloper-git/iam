"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  getApplication, 
  getApplicationRoles, 
  createApplicationRole, 
  updateRole, 
  getPermissions, 
  getRolePermissions, 
  updateRolePermissions,
  type Role, 
  type Permission,
  type Application
} from "@/lib/api/client";
import { DataTable } from "@/components/table";
import { Plus, X, ShieldAlert, Sparkles, Shield, ToggleLeft, ToggleRight } from "lucide-react";

export default function ApplicationRolesPage() {
  const { id } = useParams() as { id: string };
  const [app, setApp] = useState<Application | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [mappedPermIds, setMappedPermIds] = useState<string[]>([]);
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);

  const loadData = async () => {
    try {
      const [appData, rolesData, permsData] = await Promise.all([
        getApplication(id),
        getApplicationRoles(id),
        getPermissions(id)
      ]);
      setApp(appData);
      setRoles(rolesData);
      setPermissions(permsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles data");
    }
  };

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!app) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate key: lowercase alphanumeric, dots, underscores, dashes
    const keyRegex = /^[a-z0-9][a-z0-9._-]{0,118}[a-z0-9]$/;
    if (!keyRegex.test(newKey)) {
      setError("Role key must be lowercase alphanumeric, dots, underscores, and dashes, starting/ending with letter or number.");
      setLoading(false);
      return;
    }

    try {
      await createApplicationRole(app.id, {
        key: newKey.trim(),
        name: newName.trim(),
        description: newDesc.trim() || undefined
      });
      setSuccess(`Role '${newName}' created successfully.`);
      setIsCreateOpen(false);
      setNewKey("");
      setNewName("");
      setNewDesc("");
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create role");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (role: Role) => {
    if (!app) return;
    setError(null);
    setSuccess(null);

    try {
      const nextActive = !role.is_active;
      await updateRole(app.id, role.id, { is_active: nextActive });
      setSuccess(`Role '${role.name}' has been ${nextActive ? "enabled" : "disabled"}.`);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle role status");
    }
  };

  const openPermissionModal = async (role: Role) => {
    setError(null);
    setSelectedRole(role);
    try {
      const currentPerms = await getRolePermissions(id, role.id);
      setMappedPermIds(currentPerms.map((p) => p.id));
      setIsPermModalOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load role permissions");
    }
  };

  const handleSavePermissions = async () => {
    if (!app || !selectedRole) return;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await updateRolePermissions(app.id, selectedRole.id, mappedPermIds);
      setSuccess(`Permissions updated for role '${selectedRole.name}'.`);
      setIsPermModalOpen(false);
      setSelectedRole(null);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update permissions mapping");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermissionId = (pid: string) => {
    setMappedPermIds((prev) => 
      prev.includes(pid) ? prev.filter((id) => id !== pid) : [...prev, pid]
    );
  };

  // Group permissions by resource prefix e.g. gns.templates
  const groupPermissions = () => {
    const groups: Record<string, Permission[]> = {};
    permissions.forEach((perm) => {
      const parts = perm.key.split(".");
      const groupName = parts.length > 1 ? parts[0] + "." + parts[1] : parts[0] || "Global";
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(perm);
    });
    return groups;
  };

  const isReadOnly = app?.status === "suspended" || app?.status === "archived";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Application Roles</h2>
          <p className="text-xs text-slate-500">Configure roles and assign permission matrices scoped to this application.</p>
        </div>
        {!isReadOnly && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark transition"
          >
            <Plus className="h-4 w-4" />
            Create Role
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
        headers={["Name", "Key", "Description", "Status", "Scope", "Actions"]}
        rows={roles.map((role) => [
          <div key={`${role.id}-name`} className="font-semibold text-ink">{role.name}</div>,
          <code key={`${role.id}-key`} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800 font-mono">{role.key}</code>,
          <div key={`${role.id}-desc`} className="text-xs text-slate-500 max-w-xs truncate">{role.description || "—"}</div>,
          <span key={`${role.id}-active`} className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${
            role.is_active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-700"
          }`}>
            {role.is_active ? "Active" : "Disabled"}
          </span>,
          <span key={`${role.id}-scope`} className="text-xs uppercase font-medium text-slate-400">{role.scope}</span>,
          <div key={`${role.id}-actions`} className="flex items-center gap-3">
            {!isReadOnly && (
              <button
                onClick={() => handleToggleActive(role)}
                title={role.is_active ? "Disable Role" : "Enable Role"}
                className="text-slate-500 hover:text-slate-900 transition"
              >
                {role.is_active ? (
                  <ToggleRight className="h-5 w-5 text-brand" />
                ) : (
                  <ToggleLeft className="h-5 w-5" />
                )}
              </button>
            )}
            <button
              onClick={() => openPermissionModal(role)}
              className="text-xs font-semibold text-brand hover:underline"
            >
              Manage Permissions
            </button>
          </div>
        ])}
      />

      {/* Create Role Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="text-lg font-bold text-ink">Create Application Role</h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRole} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GNS Templates Manager"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Role Key</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. gns_templates_manager"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Key is immutable after creation. Lowecase, dots, dashes, underscores.</span>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Description</label>
                <textarea
                  placeholder="Describe role scope and permissions..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none h-16"
                />
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
                  disabled={loading}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Mapping Modal */}
      {isPermModalOpen && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-lg border border-line bg-white p-6 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="text-lg font-bold text-ink">Manage Permissions</h3>
                <p className="text-xs text-slate-500 font-medium">Mapping permissions to: <code className="text-slate-800">{selectedRole.key}</code></p>
              </div>
              <button onClick={() => setIsPermModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {Object.entries(groupPermissions()).map(([groupName, groupPerms]) => (
                <div key={groupName} className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">{groupName}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {groupPerms.map((perm) => {
                      const isChecked = mappedPermIds.includes(perm.id);
                      return (
                        <label
                          key={perm.id}
                          className={`flex items-start gap-2.5 rounded-md border p-3 cursor-pointer hover:bg-slate-50 transition ${
                            isChecked ? "border-brand bg-brand/5" : "border-line"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            disabled={isReadOnly}
                            onChange={() => handleTogglePermissionId(perm.id)}
                            className="mt-0.5 rounded border-line text-brand focus:ring-brand"
                          />
                          <div>
                            <div className="text-xs font-bold text-ink font-mono">{perm.key}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{perm.description}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setIsPermModalOpen(false)}
                className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleSavePermissions}
                  disabled={loading}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
                >
                  Save Changes
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
