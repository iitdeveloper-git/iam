const API_BASE = process.env.NEXT_PUBLIC_IAM_API_URL ?? "http://localhost:8000/api/v1";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "X-Dev-User": "admin@iitdeveloper.com",
      "X-Dev-Roles": "super_admin"
    },
    cache: "no-store"
  });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
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

export async function getUsers() {
  return request<User[]>("/users");
}

export async function getApplications() {
  return request<Application[]>("/applications");
}

export async function getMe() {
  return request<{ email: string | null; roles: string[] }>("/me");
}

