import type { Metadata } from "next";
import Link from "next/link";
import { CameraIcon, CheckIcon, ReceiptIcon, ShieldCheckIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How RocketSloth.Space vets businesses and why every review requires proof of work.",
};

export default function HowItWorksPage() {
  return (
    <div className="container-page py-12">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-extrabold">How RocketSloth.Space works</h1>
        <p className="mt-4 text-lg text-ink-dim">
          Two promises make this directory different: every business is vetted, and every
          review is backed by evidence.
        </p>
      </header>

      {/* For homeowners */}
      <section className="mt-14">
        <h2 className="font-display text-2xl font-bold">For homeowners</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            ["Search", "Browse by trade and location. Only vetted companies appear."],
            ["Hire", "Compare verified ratings and reach out with confidence."],
            ["Review with proof", "Share your experience — with a receipt and before/after photos."],
          ].map(([title, body], i) => (
            <div key={title} className="panel p-6">
              <span className="font-mono text-sm text-brand">Step {i + 1}</span>
              <h3 className="mt-1 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-ink-dim">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vetting */}
      <section id="vetting" className="mt-16 scroll-mt-20">
        <div className="panel-strong p-8 md:p-10">
          <span className="badge bg-brand/15 text-brand">
            <ShieldCheckIcon /> Our vetting
          </span>
          <h2 className="mt-4 font-display text-2xl font-bold">
            How a business earns the vetted badge
          </h2>
          <p className="mt-3 max-w-2xl text-ink-dim">
            When a company applies, it doesn't appear in the directory right away. Our
            team reviews each application before approving it.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              "We confirm the business name and contact details are real",
              "We check the license number and any uploaded license/insurance proof",
              "We make sure the categories and service area are accurate",
              "Only then is the company approved and made public",
            ].map((item) => (
              <li key={item} className="flex gap-3 text-sm text-ink-dim">
                <CheckIcon className="mt-0.5 shrink-0 text-brand" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Evidence */}
      <section id="evidence" className="mt-16 scroll-mt-20">
        <h2 className="font-display text-2xl font-bold">Our evidence policy</h2>
        <p className="mt-3 max-w-2xl text-ink-dim">
          On most sites, anyone can post a glowing — or fake — review. Here, a review
          isn't valid until you prove the work happened. We require two things:
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="panel p-6">
            <ReceiptIcon className="text-3xl text-brand" />
            <h3 className="mt-3 font-display text-lg font-semibold">A receipt or invoice</h3>
            <p className="mt-2 text-sm text-ink-dim">
              Proof you actually hired and paid the company. This stays private — we use it
              only to verify the job, and it's never shown publicly.
            </p>
          </div>
          <div className="panel p-6">
            <CameraIcon className="text-3xl text-brand" />
            <h3 className="mt-3 font-display text-lg font-semibold">Before &amp; after photos</h3>
            <p className="mt-2 text-sm text-ink-dim">
              Photos of the work that was done. These may appear on your published review so
              other homeowners can see real results.
            </p>
          </div>
        </div>
        <p className="mt-6 text-sm text-ink-faint">
          Every review is checked by our team before it publishes. Until the evidence is
          verified, a review stays pending and doesn't affect a company's rating.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/companies" className="btn-primary">
            Browse vetted pros
          </Link>
          <Link href="/for-businesses" className="btn-outline">
            List your business
          </Link>
        </div>
      </section>
    </div>
  );
}
