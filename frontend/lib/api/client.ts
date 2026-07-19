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

function redirectToLogin(error = "authentication_failed") {
  if (typeof window === "undefined") {
    return;
  }
  const callbackUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  const loginUrl = new URL("/login", window.location.origin);
  loginUrl.searchParams.set("error", error);
  loginUrl.searchParams.set("callbackUrl", callbackUrl || "/");
  window.location.href = loginUrl.toString();
}

type AuthSession = {
  accessToken?: string;
  expiresAt?: number;
};

let sessionTokenPromise: Promise<string | null> | null = null;

function isExpired(expiresAt?: number) {
  return typeof expiresAt === "number" && expiresAt <= Math.floor(Date.now() / 1000) + 30;
}

async function getSessionAccessToken(force = false) {
  if (typeof window === "undefined") {
    return null;
  }
  if (!force && sessionTokenPromise) {
    return sessionTokenPromise;
  }
  sessionTokenPromise = fetch("/api/auth/session", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return null;
      const session = (await response.json()) as AuthSession;
      if (!session.accessToken || isExpired(session.expiresAt)) {
        clearStoredAccessToken();
        return null;
      }
      setStoredAccessToken(session.accessToken);
      return session.accessToken;
    })
    .catch(() => null);
  return sessionTokenPromise;
}

async function request<T>(path: string, token?: string | null, options?: RequestInit): Promise<T> {
  let accessToken = token ?? getStoredAccessToken();
  if (!accessToken) {
    accessToken = await getSessionAccessToken();
  }
  if (!accessToken) {
    redirectToLogin("authentication_required");
    throw new Error("Authentication is required.");
  }
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
  if (response.status === 401 && !token && typeof window !== "undefined") {
    clearStoredAccessToken();
    const refreshedToken = await getSessionAccessToken(true);
    if (refreshedToken && refreshedToken !== accessToken) {
      return request<T>(path, refreshedToken, options);
    }
  }
  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    let errorCode: string | undefined;
    try {
      const body = await response.json();
      errorCode = body?.error?.code;
      message = body?.error?.message ?? message;
    } catch {
      // Keep the status-based message when the response is not JSON.
    }
    if (response.status === 401) {
      clearStoredAccessToken();
      redirectToLogin(errorCode === "AUTHENTICATION_REQUIRED" ? "authentication_required" : "authentication_failed");
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
  description?: string;
  logo_url?: string;
  homepage_url?: string;
  privacy_policy_url?: string;
  terms_url?: string;
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

export async function getApplication(appId: string, token?: string | null) {
  return request<Application>(`/applications/${appId}`, token);
}

export async function updateApplication(
  appId: string,
  payload: { name?: string; description?: string; status?: string },
  token?: string | null
) {
  return request<Application>(`/applications/${appId}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export type Role = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  scope: string;
  application_id: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
};

export async function getApplicationRoles(appId: string, token?: string | null) {
  return request<Role[]>(`/applications/${appId}/roles`, token);
}

export async function createApplicationRole(
  appId: string,
  payload: { key: string; name: string; description?: string },
  token?: string | null
) {
  return request<Role>(`/applications/${appId}/roles`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function updateRole(
  appId: string,
  roleId: string,
  payload: { name?: string; description?: string; is_active?: boolean },
  token?: string | null
) {
  return request<Role>(`/applications/${appId}/roles/${roleId}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export type Permission = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  resource: string;
  action: string;
  is_active: boolean;
  application_id: string | null;
  created_at: string;
  updated_at: string;
};

export async function getApplicationScopedPermissions(appId: string, token?: string | null) {
  return request<Permission[]>(`/applications/${appId}/permissions`, token);
}

export async function createPermission(
  appId: string,
  payload: { key: string; name: string; description?: string; resource: string; action: string },
  token?: string | null
) {
  return request<Permission>(`/applications/${appId}/permissions`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function getPermission(appId: string, permissionId: string, token?: string | null) {
  return request<Permission>(`/applications/${appId}/permissions/${permissionId}`, token);
}

export async function updatePermission(
  appId: string,
  permissionId: string,
  payload: { name?: string; description?: string; is_active?: boolean },
  token?: string | null
) {
  return request<Permission>(`/applications/${appId}/permissions/${permissionId}`, token, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function getPermissionRoles(appId: string, permissionId: string, token?: string | null) {
  return request<Role[]>(`/applications/${appId}/permissions/${permissionId}/roles`, token);
}

export async function getRolePermissions(appId: string, roleId: string, token?: string | null) {
  return request<Permission[]>(`/applications/${appId}/roles/${roleId}/permissions`, token);
}

export async function updateRolePermissions(
  appId: string,
  roleId: string,
  permissionIds: string[],
  token?: string | null
) {
  return request<{ status: string }>(`/applications/${appId}/roles/${roleId}/permissions`, token, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(permissionIds)
  });
}

export type AccessGrant = {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  status: string;
  granted_at: string;
  assigned_roles: string[];
};

export async function getApplicationAccessGrants(appId: string, token?: string | null) {
  return request<AccessGrant[]>(`/applications/${appId}/access-grants`, token);
}

export async function grantApplicationAccess(
  appId: string,
  payload: { user_id: string; status?: string },
  token?: string | null
) {
  return request<{ id: string; status: string }>(`/applications/${appId}/access-grants`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function revokeApplicationAccess(appId: string, grantId: string, token?: string | null) {
  return request<{ status: string }>(`/applications/${appId}/access-grants/${grantId}`, token, {
    method: "DELETE"
  });
}

export async function getPermissions(applicationId?: string, token?: string | null) {
  const path = applicationId ? `/permissions?application_id=${applicationId}` : "/permissions";
  return request<Permission[]>(path, token);
}

export async function getScopedAuditEvents(applicationId?: string, token?: string | null) {
  const path = applicationId ? `/audit-events?application_id=${applicationId}` : "/audit-events";
  return request<AuditEventsResponse>(path, token);
}

export type RoleAssignment = {
  id: string;
  user_id: string;
  role_id: string;
  application_id: string | null;
  status: string;
  source: string;
  created_at: string;
};

export async function getUserRoleAssignments(userId: string, token?: string | null) {
  return request<RoleAssignment[]>(`/users/${userId}/role-assignments`, token);
}

export async function assignRoleToUser(userId: string, roleId: string, token?: string | null) {
  return request<RoleAssignment>(`/users/${userId}/role-assignments`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role_id: roleId })
  });
}

export async function revokeUserRoleAssignment(userId: string, assignmentId: string, token?: string | null) {
  return request<{ status: string }>(`/users/${userId}/role-assignments/${assignmentId}`, token, {
    method: "DELETE"
  });
}

export type Invitation = {
  id: string;
  email: string;
  status: string;
  expires_at: string;
  application_id?: string | null;
  role_id?: string | null;
};

export async function getInvitations(token?: string | null) {
  return request<Invitation[]>("/invitations", token);
}

export async function createInvitation(
  payload: { email: string; application_id?: string; role_id?: string },
  token?: string | null
) {
  return request<{ id: string; status: string; acceptance_token?: string }>("/invitations", token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export async function revokeInvitation(invitationId: string, token?: string | null) {
  return request<{ status: string }>(`/invitations/${invitationId}/revoke`, token, {
    method: "POST"
  });
}
