"use client";

import { useEffect, useState } from "react";
import { Shell } from "@/components/shell";
import { DataTable } from "@/components/table";
import { type AuditEvent, getAuditEvents } from "@/lib/api/client";
import { RefreshCw, ShieldAlert, CheckCircle, XCircle } from "lucide-react";

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAuditLogs = () => {
    getAuditEvents()
      .then((res) => {
        setEvents(res.items || []);
      })
      .catch((nextError) => setError(nextError instanceof Error ? nextError.message : "Could not load audit events"));
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const renderResultBadge = (result: string) => {
    if (result === "success") {
      return (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          <CheckCircle className="h-3 w-3" />
          Success
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">
        <XCircle className="h-3 w-3" />
        Failed
      </span>
    );
  };

  return (
    <Shell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Audit Logs</h1>
          <p className="mt-1 text-sm text-slate-600">Immutable administrative and security activity history.</p>
        </div>
        <button
          onClick={loadAuditLogs}
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

      <DataTable
        headers={["Time", "Action", "Resource Type", "Resource ID", "Result", "Request ID"]}
        rows={events.map((event) => [
          <div key={`${event.id}-time`} className="whitespace-nowrap text-slate-500">{new Date(event.created_at).toLocaleString()}</div>,
          <code key={`${event.id}-action`} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-slate-800 font-medium">{event.action}</code>,
          event.resource_type || "n/a",
          <code key={`${event.id}-resource`} className="text-slate-500 font-mono text-xs">{event.resource_id || "n/a"}</code>,
          renderResultBadge(event.result),
          <code key={`${event.id}-req`} className="text-slate-400 font-mono text-xs">{event.request_id}</code>
        ])}
      />
    </Shell>
  );
}
