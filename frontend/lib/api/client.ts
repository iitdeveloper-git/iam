const API_BASE = process.env.NEXT_PUBLIC_IAM_API_URL ?? "http://localhost:8000/api/v1";
const SESSION_REFRESH_SKEW_SECONDS = 30;
const SESSION_CACHE_TTL_MS = 30_000;
const PROFILE_CACHE_TTL_MS = 60_000;
const HEALTH_CACHE_TTL_MS = 60_000;

export type AuthProfile = {
  email: string | null;
  roles: string[];
  subject: string;
  issuer: string;
};

export type SystemHealth = {
  status: string;
  checks: {
    api: string;
    postgres: string;
    redis: string;
    keycloak: string;
  };
};

export function getStoredAccessToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem("iitd_iam_access_token");
}

export function setStoredAccessToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem("iitd_iam_access_token", token.trim());
}

export function clearStoredAccessToken() {
  cachedSessionToken = null;
  sessionTokenPromise = null;
  profileCache = null;
  profilePromise = null;
  if (typeof window === "undefined") {
    return;
  }
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
  window.location.replace(loginUrl.toString());
}

type AuthSession = {
  accessToken?: string;
  expiresAt?: number;
};

let sessionTokenPromise: Promise<string | null> | null = null;
let cachedSessionToken: { token: string; expiresAt?: number; cachedAt: number } | null = null;
let profilePromise: { token: string; promise: Promise<AuthProfile> } | null = null;
let profileCache: { token: string; value: AuthProfile; cachedAt: number } | null = null;
let healthPromise: Promise<SystemHealth> | null = null;
let healthCache: { value: SystemHealth; cachedAt: number } | null = null;

function isExpired(expiresAt?: number) {
  return typeof expiresAt === "number" && expiresAt <= Math.floor(Date.now() / 1000) + SESSION_REFRESH_SKEW_SECONDS;
}

export async function getSessionAccessToken(force = false) {
  if (typeof window === "undefined") {
    return null;
  }
  if (
    !force &&
    cachedSessionToken &&
    Date.now() - cachedSessionToken.cachedAt < SESSION_CACHE_TTL_MS &&
    !isExpired(cachedSessionToken.expiresAt)
  ) {
    return cachedSessionToken.token;
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
      cachedSessionToken = {
        token: session.accessToken,
        expiresAt: session.expiresAt,
        cachedAt: Date.now()
      };
      return session.accessToken;
    })
    .catch(() => null)
    .finally(() => {
      sessionTokenPromise = null;
    });
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
  return request<AuthProfile>("/me", token);
}

export async function getCurrentPrincipal(token?: string | null, force = false) {
  const accessToken = token ?? getStoredAccessToken() ?? (await getSessionAccessToken());
  if (!accessToken) {
    redirectToLogin("authentication_required");
    throw new Error("Authentication is required.");
  }
  if (
    !force &&
    profileCache?.token === accessToken &&
    Date.now() - profileCache.cachedAt < PROFILE_CACHE_TTL_MS
  ) {
    return profileCache.value;
  }
  if (!force && profilePromise?.token === accessToken) {
    return profilePromise.promise;
  }
  const promise = getMe(accessToken)
    .then((profile) => {
      profileCache = {
        token: accessToken,
        value: profile,
        cachedAt: Date.now()
      };
      return profile;
    })
    .finally(() => {
      profilePromise = null;
    });
  profilePromise = { token: accessToken, promise };
  return promise;
}

export async function getSystemHealth(force = false): Promise<SystemHealth> {
  if (!force && healthCache && Date.now() - healthCache.cachedAt < HEALTH_CACHE_TTL_MS) {
    return healthCache.value;
  }
  if (!force && healthPromise) {
    return healthPromise;
  }
  const readyUrl = API_BASE.replace("/api/v1", "/health/ready");
  healthPromise = fetch(readyUrl, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const health = (await response.json()) as SystemHealth;
      healthCache = { value: health, cachedAt: Date.now() };
      return health;
    })
    .finally(() => {
      healthPromise = null;
    });
  return healthPromise;
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
