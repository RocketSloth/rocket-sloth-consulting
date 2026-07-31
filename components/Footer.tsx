import Link from "next/link";
import { ShieldCheckIcon } from "@/components/icons";
import { LAUNCHED } from "@/lib/env";

function FooterMark() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-brand">
        <ShieldCheckIcon />
      </span>
      <span className="font-display font-bold">
        Vetted<span className="text-brand">Pages</span>
      </span>
    </div>
  );
}

export function Footer() {
  if (!LAUNCHED) {
    return (
      <footer className="mt-20 border-t border-line bg-bg-deep/60">
        <div className="container-page flex flex-col items-center gap-2 py-10 text-center">
          <FooterMark />
          <p className="text-sm text-ink-faint">
            A vetted directory of local home &amp; trade pros — launching soon.
          </p>
          <p className="text-xs text-ink-faint">
            © {new Date().getFullYear()} VettedPages ·{" "}
            <Link href="/privacy" className="link-muted">Privacy</Link> ·{" "}
            <Link href="/terms" className="link-muted">Terms</Link>
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-20 border-t border-line bg-bg-deep/60">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-3">
          <FooterMark />
          <p className="text-sm text-ink-faint">
            A vetted directory of local home &amp; trade pros, with reviews backed by real
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
          © {new Date().getFullYear()} VettedPages — recommendations you can trust. ·{" "}
          <Link href="/privacy" className="link-muted">Privacy</Link> ·{" "}
          <Link href="/terms" className="link-muted">Terms</Link>
        </p>
      </div>
    </footer>
  );
}
