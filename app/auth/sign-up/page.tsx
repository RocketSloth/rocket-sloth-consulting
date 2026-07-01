import type { Metadata } from "next";
import type { Role } from "@/lib/types";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") ? next : "/account";
  const defaultRole: Role = safeNext.startsWith("/apply") ? "company_owner" : "customer";

  return (
    <div className="container-page flex justify-center py-16">
      <div className="panel-strong w-full max-w-md p-8">
        <h1 className="font-display text-2xl font-bold">Create your account</h1>
        <p className="mt-1 mb-6 text-sm text-ink-dim">
          Join VettedPages to leave verified reviews or list your business.
        </p>
        <SignUpForm next={safeNext} defaultRole={defaultRole} />
      </div>
    </div>
  );
}
