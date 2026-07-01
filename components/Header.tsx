import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { RocketIcon } from "@/components/icons";
import { getCurrentProfile } from "@/lib/auth";
import { LAUNCHED } from "@/lib/env";

const NAV_LINKS = [
  { href: "/companies", label: "Browse" },
  { href: "/categories", label: "Categories" },
  { href: "/for-businesses", label: "For businesses" },
  { href: "/how-it-works", label: "How it works" },
];

function Wordmark() {
  return (
    <Link href="/" className="flex items-center gap-2 text-ink hover:text-ink">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/15 text-brand">
        <RocketIcon className="text-lg" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight">
        RocketSloth<span className="text-brand">.Space</span>
      </span>
    </Link>
  );
}

export async function Header() {
  const profile = await getCurrentProfile();

  // Pre-launch: minimal header — no public navigation, just the brand + admin access.
  if (!LAUNCHED) {
    return (
      <header className="sticky top-0 z-40 border-b border-line bg-bg-deep/85 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Wordmark />
          <div className="flex items-center gap-2">
            {profile?.role === "admin" ? (
              <>
                <Link href="/admin" className="btn-ghost">Admin</Link>
                <form action={signOut}>
                  <button type="submit" className="btn-outline">Sign out</button>
                </form>
              </>
            ) : profile ? (
              <form action={signOut}>
                <button type="submit" className="btn-ghost">Sign out</button>
              </form>
            ) : (
              <Link href="/auth/sign-in?next=/admin" className="btn-ghost text-sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg-deep/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Wordmark />

        <nav className="hidden items-center gap-6 text-sm font-medium text-ink-dim md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {profile ? (
            <>
              {profile.role === "admin" ? (
                <Link href="/admin" className="btn-ghost">
                  Admin
                </Link>
              ) : null}
              <Link href="/account" className="btn-ghost">
                Account
              </Link>
              <form action={signOut}>
                <button type="submit" className="btn-outline">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth/sign-in" className="btn-ghost">
                Sign in
              </Link>
              <Link href="/apply" className="btn-primary">
                List your business
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu — pure HTML <details>, no client JS */}
        <details className="relative md:hidden [&_summary::-webkit-details-marker]:hidden">
          <summary className="btn-ghost cursor-pointer list-none">Menu</summary>
          <div className="panel-strong absolute right-0 mt-2 flex w-56 flex-col gap-1 p-2">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="btn-ghost justify-start">
                {link.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-line" />
            {profile ? (
              <>
                {profile.role === "admin" ? (
                  <Link href="/admin" className="btn-ghost justify-start">
                    Admin
                  </Link>
                ) : null}
                <Link href="/account" className="btn-ghost justify-start">
                  Account
                </Link>
                <form action={signOut}>
                  <button type="submit" className="btn-ghost w-full justify-start">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/auth/sign-in" className="btn-ghost justify-start">
                  Sign in
                </Link>
                <Link href="/apply" className="btn-primary justify-start">
                  List your business
                </Link>
              </>
            )}
          </div>
        </details>
      </div>
    </header>
  );
}
