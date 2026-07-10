"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, logOut, Session } from "@/lib/auth";

/**
 * Authenticated app shell: a branded header/nav around the platform content.
 * Acts as a client-side route guard — if there is no fake session it redirects
 * to /login and renders nothing until the check completes (avoiding a flash of
 * protected content).
 */
export default function PlatformShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const current = getSession();
    if (!current) {
      router.replace("/login");
      return;
    }
    setSession(current);
    setChecked(true);
  }, [router]);

  const handleLogout = () => {
    logOut();
    router.replace("/login");
  };

  // Wait until the guard has confirmed a session before rendering content.
  if (!checked || !session) return null;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-brand-navy text-white print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-baseline gap-3">
            <span className="text-xl font-bold">Prelegal</span>
            <span className="text-sm text-slate-300">Legal agreements</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-slate-300 sm:inline">
              {session.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-white/30 px-3 py-1.5 text-sm font-medium transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}
