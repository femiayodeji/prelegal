// Client-side "fake" authentication for the V1 foundation (PL-4).
//
// There is no real authentication yet: the login screen simply records that a
// user has entered the platform in localStorage so the app shell can gate its
// routes. This is deliberately a placeholder to be replaced by real sign
// up / sign in against the backend `users` table later.

const STORAGE_KEY = "prelegal.session";

export interface Session {
  email: string;
}

/** Returns the current fake session, or null if the user hasn't "logged in". */
export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

/** Records a fake session and returns it. Any email is accepted. */
export function logIn(email: string): Session {
  const session: Session = { email: email.trim() || "guest@prelegal.app" };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

/** Clears the fake session. */
export function logOut(): void {
  window.localStorage.removeItem(STORAGE_KEY);
}
