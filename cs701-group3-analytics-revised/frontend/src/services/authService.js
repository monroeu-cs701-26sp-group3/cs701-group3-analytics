export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export async function loginUser(username, password) {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);

  const res = await fetch(`${API_BASE}/auth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Login failed");
  }

  const data = await res.json();
  // Persist token and user to sessionStorage
  sessionStorage.setItem("token", data.access_token);
  sessionStorage.setItem("user",  JSON.stringify({ username: data.username, role: data.role }));
  return data;
}

export function getStoredToken() {
  return sessionStorage.getItem("token");
}

export function getStoredUser() {
  const u = sessionStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

export function clearAuth() {
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("user");
}

export async function apiFetch(path, token, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${res.status}`);
  }
  return res.json();
}
