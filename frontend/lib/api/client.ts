const API_BASE = process.env.NEXT_PUBLIC_IAM_API_URL ?? "http://localhost:8000/api/v1";

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem("iitd_iam_access_token");
}

export function setStoredAccessToken(token: string) {
  window.sessionStorage.setItem("iitd_iam_access_token", token.trim());
}

export function clearStoredAccessToken() {
  window.sessionStorage.removeItem("iitd_iam_access_token");
}

async function request<T>(path: string, token?: string | null, options?: RequestInit): Promise<T> {
  const accessToken = token ?? getStoredAccessToken();
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }
  if (options?.headers) {
    Object.assign(headers, options.headers);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    cache: "no-store"
  });
  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    try {
      const body = await response.json();
      message = body?.error?.message ?? message;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export type User = {
  id: string;
  email: string;
  display_name: string | null;
  status: string;
  email_verified: boolean;
};

export type Application = {
  id: string;
  key: string;
  name: string;
  authorization_mode: string;
  status: string;
};

export async function getUsers(token?: string | null) {
  return request<User[]>("/users", token);
}

export async function getApplications(token?: string | null) {
  return request<Application[]>("/applications", token);
}

export async function getMe(token?: string | null) {
  return request<{ email: string | null; roles: string[]; subject: string; issuer: string }>("/me", token);
}

export type SystemHealth = {
  status: string;
  checks: {
    api: string;
    postgres: string;
    redis: string;
    keycloak: string;
  };
};

export async function getSystemHealth(): Promise<SystemHealth> {
  const readyUrl = API_BASE.replace("/api/v1", "/health/ready");
  const response = await fetch(readyUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`);
  }
  return response.json();
}

export type AuditEvent = {
  id: string;
  actor_type: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  application_id: string | null;
  request_id: string;
  source_ip: string | null;
  user_agent: string | null;
  result: string;
  created_at: string;
};

export type AuditEventsResponse = {
  items: AuditEvent[];
  total: number;
};

export async function getAuditEvents(token?: string | null): Promise<AuditEventsResponse> {
  return request<AuditEventsResponse>("/audit-events", token);
}

export async function suspendUser(userId: string, token?: string | null) {
  return request<{ status: string }>(`/users/${userId}/suspend`, token, {
    method: "POST"
  });
}

export async function restoreUser(userId: string, token?: string | null) {
  return request<{ status: string }>(`/users/${userId}/restore`, token, {
    method: "POST"
  });
}

export async function revokeUserSessions(userId: string, token?: string | null) {
  return request<{ status: string }>(`/users/${userId}/sessions/revoke`, token, {
    method: "POST"
  });
}

export async function getUserSessions(userId: string, token?: string | null) {
  return request<any[]>(`/users/${userId}/sessions`, token);
}

export async function createApplication(
  payload: { key: string; name: string; authorization_mode: string; description?: string },
  token?: string | null
) {
  return request<Application>("/applications", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}
