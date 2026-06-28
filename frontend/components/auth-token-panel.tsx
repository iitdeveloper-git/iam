"use client";

import { useEffect, useState } from "react";
import { KeyRound, LogOut, Save } from "lucide-react";
import { clearStoredAccessToken, getMe, getStoredAccessToken, setStoredAccessToken } from "@/lib/api/client";

export function AuthTokenPanel() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("No access token configured");
  const [principal, setPrincipal] = useState<string | null>(null);

  async function verify(nextToken: string | null) {
    if (!nextToken) {
      setStatus("No access token configured");
      setPrincipal(null);
      return;
    }
    try {
      const me = await getMe(nextToken);
      setStatus("Connected");
      setPrincipal(me.email ?? me.subject);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Token verification failed");
      setPrincipal(null);
    }
  }

  useEffect(() => {
    const stored = getStoredAccessToken();
    if (stored) {
      setToken(stored);
    }
    void verify(stored);
  }, []);

  function saveToken() {
    setStoredAccessToken(token);
    void verify(token);
  }

  function clearToken() {
    clearStoredAccessToken();
    setToken("");
    setStatus("No access token configured");
    setPrincipal(null);
  }

  return (
    <section className="mb-5 rounded-md border border-line bg-white p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
        <KeyRound className="h-4 w-4 text-brand" />
        IAM API Session
      </div>
      <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
        <input
          className="min-h-10 rounded-md border border-line px-3 text-sm outline-none focus:border-brand"
          type="password"
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder="Paste an OIDC access token from IITD IAM / Keycloak"
          aria-label="OIDC access token"
        />
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-medium text-white" type="button" onClick={saveToken}>
          <Save className="h-4 w-4" />
          Save
        </button>
        <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-line px-4 text-sm font-medium text-slate-700" type="button" onClick={clearToken}>
          <LogOut className="h-4 w-4" />
          Clear
        </button>
      </div>
      <div className="mt-3 text-sm text-slate-600">
        {status}
        {principal ? <span className="ml-2 text-slate-400">as {principal}</span> : null}
      </div>
    </section>
  );
}
