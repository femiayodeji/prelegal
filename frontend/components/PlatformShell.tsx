"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getCurrentUser, logOut, User } from "@/lib/auth";

/**
 * Authenticated app shell: a branded header/nav around the platform content.
 * Acts as a route guard — it checks the real session via `/api/auth/me` and, if
 * there's none, redirects to /login and renders nothing until the check
 * completes (avoiding a flash of protected content).
 */
export default function PlatformShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then((current) => {
        if (!active) return;
        if (!current) {
          router.replace("/login");
          return;
        }
        setUser(current);
        setChecked(true);
      })
      .catch(() => {
        if (active) router.replace("/login");
      });
    return () => {
      active = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await logOut();
    router.replace("/login");
  };

  // Wait until the guard has confirmed a session before rendering content.
  if (!checked || !user) return null;

  const navLink = (href: string, label: string) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
          active
            ? "bg-white/15 text-white"
            : "text-slate-300 hover:bg-white/10 hover:text-white"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-brand-navy text-white shadow-sm print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-xl font-bold tracking-tight">Prelegal</span>
              <span className="hidden text-xs text-slate-300 sm:inline">
                Legal agreements, drafted with AI
              </span>
            </Link>
            <nav className="flex items-center gap-1">
              {navLink("/", "New document")}
              {navLink("/documents", "My documents")}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-300 md:inline">
              {user.displayName || user.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-white/25 px-3 py-1.5 text-sm font-medium transition hover:bg-white/10"
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
