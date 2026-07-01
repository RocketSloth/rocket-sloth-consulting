import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CheckIcon, ShieldCheckIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "List your business",
  description:
    "Apply to be a vetted pro on VettedPages and reach homeowners ready to hire.",
};

const STEPS = [
  { title: "Apply", body: "Tell us about your business, the trades you cover, and your service area." },
  { title: "Get vetted", body: "We verify your license, contact details, and category fit before you go live." },
  { title: "Win work", body: "Earn the vetted badge and collect reviews backed by real proof of work." },
];

const BENEFITS = [
  "Stand out with a vetted badge homeowners trust",
  "Compete on real, verified reviews — not fake ratings",
  "Show up in category and location searches",
  "A clean profile with your services, area, and contact info",
];

export default function ForBusinessesPage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-20%] h-[400px] w-[700px] -translate-x-1/2 rounded-full bg-brand/15 blur-[120px]" />
        </div>
        <div className="container-page py-16 text-center sm:py-20">
          <span className="badge mx-auto mb-5 border border-line-strong bg-panel text-ink-dim">
            <ShieldCheckIcon className="text-brand" /> For home & trade businesses
          </span>
          <h1 className="mx-auto max-w-3xl font-display text-4xl font-extrabold sm:text-5xl">
            Get found by homeowners who are ready to hire.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-dim">
            VettedPages lists only vetted pros. Apply once, pass our screening, and
            let evidence-backed reviews do the selling.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/apply" className="btn-primary">
              Apply to be listed <ArrowRightIcon />
            </Link>
            <Link href="/companies" className="btn-outline">
              See the directory
            </Link>
          </div>
        </div>
      </section>

      <section className="container-page py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="panel p-6">
              <span className="font-mono text-sm text-brand">0{i + 1}</span>
              <h3 className="mt-2 font-display text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-ink-dim">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-12">
        <div className="panel-strong grid items-center gap-8 p-8 md:grid-cols-2 md:p-12">
          <div>
            <h2 className="font-display text-3xl font-bold">Why join the list</h2>
            <ul className="mt-5 space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex gap-3 text-ink-dim">
                  <CheckIcon className="mt-0.5 shrink-0 text-brand" /> {b}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-6">
            <h3 className="font-display text-lg font-semibold">What we'll ask for</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-dim">
              <li className="flex gap-2"><CheckIcon className="mt-0.5 shrink-0 text-brand" /> Business name, contact, and website</li>
              <li className="flex gap-2"><CheckIcon className="mt-0.5 shrink-0 text-brand" /> The categories &amp; area you serve</li>
              <li className="flex gap-2"><CheckIcon className="mt-0.5 shrink-0 text-brand" /> License number &amp; proof (license / insurance)</li>
              <li className="flex gap-2"><CheckIcon className="mt-0.5 shrink-0 text-brand" /> A short description of what you do</li>
            </ul>
            <Link href="/apply" className="btn-primary mt-6 w-full">
              Start your application
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
