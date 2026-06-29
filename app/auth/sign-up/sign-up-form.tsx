"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/format";
import { isSupabaseConfigured } from "@/lib/env";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Role } from "@/lib/types";

export function SignUpForm({
  next,
  defaultRole,
}: {
  next: string;
  defaultRole: Role;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(defaultRole);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isSupabaseConfigured) {
      setError("Authentication isn't configured yet. Add Supabase keys to enable sign-up.");
      return;
    }
    setLoading(true);
    const supabase = createBrowserSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      router.push(next);
      router.refresh();
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <div className="rounded-xl border border-brand/30 bg-brand/10 p-5 text-sm text-ink-dim">
        <p className="font-semibold text-ink">Almost there — check your email.</p>
        <p className="mt-1">
          We sent a confirmation link to <strong>{email}</strong>. Click it to activate
          your account, then sign in.
        </p>
      </div>
    );
  }

  const roleOptions: { value: Role; label: string; desc: string }[] = [
    { value: "customer", label: "I'm a homeowner", desc: "Find pros and leave reviews" },
    { value: "company_owner", label: "I'm a business", desc: "List & manage my company" },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {roleOptions.map((opt) => (
          <button
            type="button"
            key={opt.value}
            onClick={() => setRole(opt.value)}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              role === opt.value
                ? "border-brand bg-brand/10"
                : "border-line-strong hover:border-brand/40"
            )}
          >
            <span className="block text-sm font-semibold text-ink">{opt.label}</span>
            <span className="block text-xs text-ink-faint">{opt.desc}</span>
          </button>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="fullName">Full name</label>
        <input
          id="fullName"
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">
        {loading ? "Creating account…" : "Create account"}
      </button>
      <p className="text-center text-sm text-ink-faint">
        Already have an account?{" "}
        <Link
          href={`/auth/sign-in?next=${encodeURIComponent(next)}`}
          className="text-brand hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
