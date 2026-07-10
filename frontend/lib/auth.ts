// Authentication client (PL-7).
//
// Real sign up / sign in against the FastAPI backend. The server keeps the
// session in an HttpOnly cookie, so there is no token for JavaScript to store or
// read — every request just needs to be same-origin (which it is, since FastAPI
// serves this app). We only model the current user for the UI.

export interface User {
  email: string;
  displayName: string | null;
}

/** Extract the backend's error message from a failed auth/API response. */
async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.detail === "string") return body.detail;
  } catch {
    /* no JSON body */
  }
  return fallback;
}

/** The signed-in user, or null if there is no valid session. */
export async function getCurrentUser(): Promise<User | null> {
  const res = await fetch("/api/auth/me", { credentials: "same-origin" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await errorMessage(res, "Failed to load session."));
  return (await res.json()) as User;
}

export async function signUp(
  email: string,
  password: string,
  displayName?: string,
): Promise<User> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ email, password, displayName: displayName || null }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Sign up failed."));
  return (await res.json()) as User;
}

export async function logIn(email: string, password: string): Promise<User> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, "Sign in failed."));
  return (await res.json()) as User;
}

export async function logOut(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });
}
