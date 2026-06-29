import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="font-mono text-sm text-brand">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold">We couldn't find that page</h1>
      <p className="mt-2 max-w-md text-ink-dim">
        The page may have moved, or the company you're looking for isn't listed yet.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="btn-outline">Go home</Link>
        <Link href="/companies" className="btn-primary">Browse pros</Link>
      </div>
    </div>
  );
}
