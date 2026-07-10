"use client";

/** Shared chrome + field styles for the login and sign-up screens. */

export const authInputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";

export function AuthSubmit({
  busy,
  children,
}: {
  busy: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="w-full rounded-md bg-brand-purple px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy ? "Please wait…" : children}
    </button>
  );
}

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="text-2xl font-bold tracking-tight text-brand-navy">
            Prelegal
          </span>
          <p className="mt-1 text-sm text-brand-gray">
            AI-drafted legal agreements
          </p>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200/70">
          <div className="mb-6">
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
