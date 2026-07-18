"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { 
  getApplicationScopedPermissions, 
  createPermission, 
  updatePermission, 
  getPermissionRoles,
  type Permission,
  type Role 
} from "@/lib/api/client";
import { DataTable } from "@/components/table";
import { Search, ShieldAlert, Plus, Edit2, Users, Power, PowerOff, X } from "lucide-react";

export default function ApplicationPermissionsPage() {
  const { id } = useParams() as { id: string };
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRolesOpen, setIsRolesOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [assignedRoles, setAssignedRoles] = useState<Role[]>([]);

  // Form states
  const [formData, setFormData] = useState({ key: "", name: "", description: "", resource: "", action: "", is_active: true });

  const fetchPermissions = () => {
    if (id) {
      getApplicationScopedPermissions(id)
        .then(setPermissions)
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load permissions catalog"));
    }
  };

  useEffect(() => {
    fetchPermissions();
  }, [id]);

  const getResources = () => {
    const resources = new Set<string>();
    permissions.forEach((p) => {
      resources.add(p.resource || "unknown");
    });
    return Array.from(resources).filter(Boolean);
  };

  const filteredPermissions = permissions.filter((p) => {
    const matchesSearch = p.key.toLowerCase().includes(search.toLowerCase()) || 
      (p.name && p.name.toLowerCase().includes(search.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));
    const matchesResource = resourceFilter === "all" || p.resource === resourceFilter;
    return matchesSearch && matchesResource;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createPermission(id, formData);
      setSuccess(`Permission '${formData.name}' created successfully.`);
      setIsCreateOpen(false);
      setFormData({ key: "", name: "", description: "", resource: "", action: "", is_active: true });
      fetchPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create permission");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPermission) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await updatePermission(id, selectedPermission.id, {
        name: formData.name,
        description: formData.description,
        is_active: formData.is_active
      });
      setSuccess(`Permission '${formData.name}' updated successfully.`);
      setIsEditOpen(false);
      fetchPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update permission");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (perm: Permission) => {
    setError(null);
    setSuccess(null);
    try {
      await updatePermission(id, perm.id, { is_active: !perm.is_active });
      setSuccess(`Permission '${perm.name}' has been ${!perm.is_active ? "enabled" : "disabled"}.`);
      fetchPermissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to toggle status");
    }
  };

  const openEdit = (perm: Permission) => {
    setSelectedPermission(perm);
    setFormData({
      key: perm.key,
      name: perm.name,
      description: perm.description || "",
      resource: perm.resource,
      action: perm.action,
      is_active: perm.is_active
    });
    setIsEditOpen(true);
  };

  const openRoles = async (perm: Permission) => {
    setSelectedPermission(perm);
    setIsRolesOpen(true);
    setAssignedRoles([]);
    setError(null);
    try {
      const roles = await getPermissionRoles(id, perm.id);
      setAssignedRoles(roles);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assigned roles");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-ink">Application Permissions</h2>
          <p className="text-xs text-slate-500 font-medium">Manage dynamic permissions specific to this application.</p>
        </div>
        <button
          onClick={() => {
            setFormData({ key: "", name: "", description: "", resource: "", action: "", is_active: true });
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-brand/90"
        >
          <Plus className="h-4 w-4" /> Create Permission
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center">
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          {success}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search permissions by key, name, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-line bg-white pl-9 pr-3 py-2 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand focus:outline-none md:w-56"
        >
          <option value="all">All Resources</option>
          {getResources().map((res) => (
            <option key={res} value={res}>{res}</option>
          ))}
        </select>
      </div>

      <DataTable
        headers={["Permission Key", "Name", "Resource / Action", "Status", "Actions"]}
        rows={filteredPermissions.map((perm) => [
          <div key={`${perm.id}-key`} className="flex flex-col">
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800 font-mono font-bold w-max">{perm.key}</code>
            <span className="text-[10px] text-slate-400 mt-1">{perm.application_id ? "Application" : "Platform"}</span>
          </div>,
          <div key={`${perm.id}-name`}>
            <div className="font-semibold text-ink text-xs">{perm.name}</div>
            <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{perm.description || "—"}</div>
          </div>,
          <div key={`${perm.id}-res`} className="flex flex-col text-xs">
            <span className="text-slate-700"><span className="text-slate-400">Res:</span> {perm.resource}</span>
            <span className="text-slate-700"><span className="text-slate-400">Act:</span> {perm.action}</span>
          </div>,
          <span key={`${perm.id}-status`} className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            perm.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
          }`}>
            {perm.is_active ? "Active" : "Disabled"}
          </span>,
          <div key={`${perm.id}-actions`} className="flex gap-3">
            <button onClick={() => openEdit(perm)} className="text-slate-400 hover:text-brand transition-colors" title="Edit">
              <Edit2 className="h-4 w-4" />
            </button>
            <button onClick={() => openRoles(perm)} className="text-slate-400 hover:text-indigo-600 transition-colors" title="View Assigned Roles">
              <Users className="h-4 w-4" />
            </button>
            {perm.is_active ? (
              <button onClick={() => toggleStatus(perm)} className="text-slate-400 hover:text-red-600 transition-colors" title="Disable">
                <PowerOff className="h-4 w-4" />
              </button>
            ) : (
              <button onClick={() => toggleStatus(perm)} className="text-slate-400 hover:text-emerald-600 transition-colors" title="Enable">
                <Power className="h-4 w-4" />
              </button>
            )}
          </div>
        ])}
      />

      {/* Modals */}
      {(isCreateOpen || isEditOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{isCreateOpen ? "Create Permission" : "Edit Permission"}</h3>
                <p className="text-xs text-slate-500">{isCreateOpen ? "Define a new dynamic permission." : "Modify existing permission."}</p>
              </div>
              <button onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={isCreateOpen ? handleCreate : handleUpdate} className="p-6 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Key <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={isEditOpen}
                    value={formData.key}
                    onChange={(e) => setFormData({...formData, key: e.target.value})}
                    placeholder="e.g. users.manage"
                    pattern="^[a-z0-9][a-z0-9._-]*[a-z0-9]$"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  />
                  {isCreateOpen && <p className="mt-1 text-[10px] text-slate-500">Must be lowercase alphanumeric, dots, underscores, dashes.</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Resource <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={isEditOpen}
                    value={formData.resource}
                    onChange={(e) => setFormData({...formData, resource: e.target.value})}
                    placeholder="e.g. users"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Action <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    disabled={isEditOpen}
                    value={formData.action}
                    onChange={(e) => setFormData({...formData, action: e.target.value})}
                    placeholder="e.g. manage"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
                  />
                </div>

                {isEditOpen && (
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="rounded border-slate-300 text-brand focus:ring-brand"
                    />
                    <label htmlFor="is_active" className="text-sm font-medium text-slate-700">Permission is Active</label>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => { setIsCreateOpen(false); setIsEditOpen(false); }}
                  className="rounded-md px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand/90 disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRolesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Assigned Roles</h3>
                <p className="text-xs text-slate-500">Roles mapped to {selectedPermission?.name}</p>
              </div>
              <button onClick={() => setIsRolesOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {assignedRoles.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  No roles are currently assigned to this permission.
                </div>
              ) : (
                <ul className="space-y-3">
                  {assignedRoles.map(r => (
                    <li key={r.id} className="p-3 border border-slate-200 rounded-md bg-white shadow-sm flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-sm text-slate-900">{r.name}</div>
                        <code className="text-xs text-slate-500 font-mono">{r.key}</code>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${r.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                        {r.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
