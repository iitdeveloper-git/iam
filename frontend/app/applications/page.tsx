"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { DataTable } from "@/components/table";
import { 
  type Application, 
  getApplications, 
  createApplication 
} from "@/lib/api/client";
import { Plus, X, Globe, ShieldAlert, Sparkles } from "lucide-react";

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newAuthMode, setNewAuthMode] = useState("authentication_only");
  const [loading, setLoading] = useState(false);

  const loadApplications = () => {
    getApplications()
      .then(setApplications)
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Could not load applications"));
  };

  useEffect(() => {
    loadApplications();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    // Validate key regex: ^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$
    const keyRegex = /^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/;
    if (!keyRegex.test(newKey)) {
      setError("Application key must be lowercase alphanumeric and dashes only, start/end with a letter or number, and be between 3 and 80 characters.");
      setLoading(false);
      return;
    }

    try {
      await createApplication({
        key: newKey.trim(),
        name: newName.trim(),
        description: newDesc.trim() || undefined,
        authorization_mode: newAuthMode
      });
      setSuccess(`Application '${newName}' registered successfully`);
      setIsModalOpen(false);
      // Reset form fields
      setNewKey("");
      setNewName("");
      setNewDesc("");
      setNewAuthMode("authentication_only");
      loadApplications();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register application");
    } finally {
      setLoading(false);
    }
  };

  const getAuthModeLabel = (mode: string) => {
    switch (mode) {
      case "authentication_only": return "Authentication Only";
      case "application_access": return "Application Access";
      case "direct_roles": return "Direct Roles Mapping";
      case "product_managed": return "Product Managed Policies";
      default: return mode;
    }
  };

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Applications</h1>
          <p className="mt-1 text-sm text-slate-600">Registry, environments, clients, redirect URIs and application access.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" />
          Register Application
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
          <Sparkles className="h-4 w-4 text-emerald-600" />
          {success}
        </div>
      ) : null}

      <DataTable
        headers={["Name", "Key", "Authorization Mode", "Status"]}
        rows={applications.map((app) => [
          <div key={`${app.id}-name`} className="font-semibold text-ink">{app.name}</div>,
          <code key={`${app.id}-key`} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800 font-mono">{app.key}</code>,
          getAuthModeLabel(app.authorization_mode),
          <span key={`${app.id}-status`} className="inline-flex rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Active</span>
        ])}
      />

      {/* Backdrop & Registration Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-xl transition-all scale-100">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2 className="text-lg font-bold text-ink">Register Application</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Learning Management System"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Application Key (Client ID)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. iitd-lms"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">Alphanumeric lowercase, dashes, 3-80 chars. Used as Keycloak client ID.</span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Description</label>
                <textarea
                  placeholder="Service description and context..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none h-16"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500">Authorization Mode</label>
                <select
                  value={newAuthMode}
                  onChange={(e) => setNewAuthMode(e.target.value)}
                  className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none"
                >
                  <option value="authentication_only">Authentication Only (SSO Only)</option>
                  <option value="application_access">Application Access Grants</option>
                  <option value="direct_roles">Direct Roles Mapping</option>
                  <option value="product_managed">Product Managed Policies</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-50"
                >
                  {loading ? "Registering..." : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Shell>
  );
}
