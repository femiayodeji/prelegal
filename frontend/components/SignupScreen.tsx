"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signUp } from "@/lib/auth";
import AuthLayout, { authInputClass, AuthSubmit } from "@/components/AuthLayout";

/** Sign-up screen: registers a new account and enters the platform. */
export default function SignupScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signUp(email, password, displayName);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed.");
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start drafting agreements in minutes."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-1">
          <span className="block text-sm font-medium text-slate-700">
            Name <span className="text-slate-400">(optional)</span>
          </span>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Ada Lovelace"
            className={authInputClass}
          />
        </label>

        <label className="block space-y-1">
          <span className="block text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className={authInputClass}
          />
        </label>

        <label className="block space-y-1">
          <span className="block text-sm font-medium text-slate-700">
            Password
          </span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className={authInputClass}
          />
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <AuthSubmit busy={busy}>Create account</AuthSubmit>
      </form>

      <p className="mt-6 text-center text-sm text-brand-gray">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-blue hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
