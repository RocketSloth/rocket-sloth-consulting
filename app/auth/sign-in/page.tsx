import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/account";

  return (
    <div className="container-page flex justify-center py-16">
      <div className="panel-strong w-full max-w-md p-8">
        <h1 className="font-display text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 mb-6 text-sm text-ink-dim">
          Sign in to write reviews or manage your business listing.
        </p>
        <SignInForm next={safeNext} />
      </div>
    </div>
  );
}
