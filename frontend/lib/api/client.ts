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

async function request<T>(path: string, token?: string | null): Promise<T> {
  const accessToken = token ?? getStoredAccessToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
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
