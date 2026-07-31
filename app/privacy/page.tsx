import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How VettedPages collects, uses, and protects your information.",
};

const EFFECTIVE_DATE = "July 9, 2026";

export default function PrivacyPage() {
  return (
    <div className="container-page py-12">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-extrabold">Privacy Policy</h1>
        <p className="mt-3 text-sm text-ink-faint">Effective {EFFECTIVE_DATE}</p>
        <p className="mt-4 text-lg text-ink-dim">
          VettedPages exists to help neighbors find local businesses they can trust.
          That only works if you can trust us with your information too. Here's the
          plain-English version of what we collect and what we do with it.
        </p>
      </header>

      <div className="mx-auto mt-12 max-w-2xl space-y-10">
        <section>
          <h2 className="font-display text-xl font-bold">What we collect</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-dim">
            <li>
              <strong className="text-ink">Waitlist signups.</strong> If you join as a
              resident, we collect your email address, ZIP code, and the service you
              need most. If you request early access as a business, we also collect
              your business name, your name, phone number, city, business type,
              website, and any message you send.
            </li>
            <li>
              <strong className="text-ink">Business recommendations.</strong> If you
              recommend a business, we collect the business details you share and,
              optionally, your email.
            </li>
            <li>
              <strong className="text-ink">Accounts.</strong> If you create an account
              (once the directory opens), we store your email and profile details.
            </li>
            <li>
              <strong className="text-ink">Analytics.</strong> We use privacy-friendly,
              aggregate analytics (page views, visit counts) to understand how the
              site is used. We don't run third-party ad trackers on this site.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">How we use it</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-dim">
            <li>To let you know when vetted pros go live in your area.</li>
            <li>
              To decide which neighborhoods and service categories we open first —
              your ZIP code and most-needed service directly shape that.
            </li>
            <li>
              To contact businesses that requested early access or were recommended
              by a neighbor.
            </li>
            <li>To operate, secure, and improve the site.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">What we don't do</h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-dim">
            <li>We do not sell your personal information.</li>
            <li>We do not share your contact details with listed businesses without your action.</li>
            <li>We do not send spam — you can opt out of our emails at any time.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Where your data lives</h2>
          <p className="mt-3 text-sm text-ink-dim">
            Your information is stored with our database provider (Supabase) in the
            United States, protected by access controls so that only VettedPages
            administrators can read it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Your choices</h2>
          <p className="mt-3 text-sm text-ink-dim">
            Want off the list, or want your information deleted? Reply to any email
            you've received from VettedPages, or use the contact details in our
            messages, and we'll take care of it.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Children</h2>
          <p className="mt-3 text-sm text-ink-dim">
            VettedPages is not directed to children under 13, and we don't knowingly
            collect their information.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Changes & contact</h2>
          <p className="mt-3 text-sm text-ink-dim">
            If this policy changes, we'll update this page and the effective date
            above. VettedPages is operated from Frisco, Texas. Questions about this
            policy? Reply to any email from VettedPages and we'll get back to you.
          </p>
        </section>
      </div>
    </div>
  );
}
