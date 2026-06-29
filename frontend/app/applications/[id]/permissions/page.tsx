"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getPermissions, type Permission } from "@/lib/api/client";
import { DataTable } from "@/components/table";
import { Search, ShieldAlert } from "lucide-react";

export default function ApplicationPermissionsPage() {
  const { id } = useParams() as { id: string };
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [search, setSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      getPermissions(id)
        .then(setPermissions)
        .catch((err) => setError(err instanceof Error ? err.message : "Failed to load permissions catalog"));
    }
  }, [id]);

  // Extract unique resources for filtering
  const getResources = () => {
    const resources = new Set<string>();
    permissions.forEach((p) => {
      const parts = p.key.split(".");
      if (parts.length > 1) {
        resources.add(parts[0] + "." + parts[1]);
      } else {
        resources.add(parts[0]);
      }
    });
    return Array.from(resources);
  };

  const filteredPermissions = permissions.filter((p) => {
    const matchesSearch = p.key.toLowerCase().includes(search.toLowerCase()) || 
      (p.name && p.name.toLowerCase().includes(search.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

    const matchesResource = resourceFilter === "all" || p.key.startsWith(resourceFilter);

    return matchesSearch && matchesResource;
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-ink">Permissions Catalogue</h2>
        <p className="text-xs text-slate-500 font-medium">Catalogue of platform-defined and application-specific permissions assignable to roles.</p>
      </div>

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          {error}
        </div>
      ) : null}

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
        headers={["Permission Key", "Name", "Description", "Type"]}
        rows={filteredPermissions.map((perm) => [
          <code key={`${perm.id}-key`} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-800 font-mono font-bold">{perm.key}</code>,
          <div key={`${perm.id}-name`} className="font-semibold text-ink text-xs">{perm.name}</div>,
          <div key={`${perm.id}-desc`} className="text-xs text-slate-500 max-w-sm">{perm.description || "—"}</div>,
          <span key={`${perm.id}-type`} className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            perm.application_id ? "bg-indigo-50 text-indigo-700" : "bg-emerald-50 text-emerald-700"
          }`}>
            {perm.application_id ? "Application" : "Platform"}
          </span>
        ])}
      />
    </div>
  );
}
