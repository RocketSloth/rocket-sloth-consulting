import Link from "next/link";
import { RocketIcon } from "@/components/icons";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-bg-deep/60">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-brand">
              <RocketIcon />
            </span>
            <span className="font-display font-bold">RocketSloth.Space</span>
          </div>
          <p className="text-sm text-ink-faint">
            A vetted directory of local home & trade pros, with reviews backed by real
            proof of work.
          </p>
        </div>

        <div className="space-y-2 text-sm">
          <p className="label">Homeowners</p>
          <Link href="/companies" className="block link-muted">Browse pros</Link>
          <Link href="/categories" className="block link-muted">Categories</Link>
          <Link href="/how-it-works" className="block link-muted">How it works</Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="label">Businesses</p>
          <Link href="/for-businesses" className="block link-muted">Get listed</Link>
          <Link href="/apply" className="block link-muted">Apply to join</Link>
          <Link href="/account" className="block link-muted">Your account</Link>
        </div>

        <div className="space-y-2 text-sm">
          <p className="label">Trust</p>
          <Link href="/how-it-works" className="block link-muted">Our vetting</Link>
          <Link href="/how-it-works#evidence" className="block link-muted">Evidence policy</Link>
        </div>
      </div>
      <div className="border-t border-line py-6">
        <p className="container-page text-xs text-ink-faint">
          © {new Date().getFullYear()} RocketSloth.Space — recommendations you can trust.
        </p>
      </div>
    </footer>
  );
}
