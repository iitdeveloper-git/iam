"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getScopedAuditEvents, type AuditEvent } from "@/lib/api/client";
import { DataTable } from "@/components/table";
import { ShieldAlert, RefreshCw } from "lucide-react";

export default function ApplicationAuditPage() {
  const { id } = useParams() as { id: string };
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getScopedAuditEvents(id);
      setEvents(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadAudit();
    }
  }, [id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-ink">Application Audit Trails</h2>
          <p className="text-xs text-slate-500 font-medium">Historical logs of administrative actions, access grants, and status changes for this application.</p>
        </div>
        <button
          onClick={loadAudit}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-50 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      <DataTable
        headers={["Timestamp", "Actor", "Action", "Resource Type", "Details / Summary"]}
        rows={events.map((evt) => [
          <div key={`${evt.id}-time`} className="text-xs text-slate-500 font-mono">{new Date(evt.created_at).toLocaleString()}</div>,
          <div key={`${evt.id}-actor`} className="font-semibold text-ink text-xs">{evt.actor_type === "user" ? "Admin User" : evt.actor_type}</div>,
          <code key={`${evt.id}-action`} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-mono text-slate-800 font-bold">{evt.action}</code>,
          <span key={`${evt.id}-res`} className="text-xs uppercase font-medium text-slate-400">{evt.resource_type}</span>,
          <div key={`${evt.id}-summary`} className="text-xs text-slate-700 max-w-md truncate">
            ID: <code className="text-[10px] font-mono">{evt.resource_id}</code> | Result: <span className="font-semibold text-emerald-600">{evt.result}</span>
          </div>
        ])}
      />
    </div>
  );
}
