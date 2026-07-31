import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that apply when you use VettedPages.",
};

const EFFECTIVE_DATE = "July 9, 2026";

export default function TermsPage() {
  return (
    <div className="container-page py-12">
      <header className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-extrabold">Terms of Service</h1>
        <p className="mt-3 text-sm text-ink-faint">Effective {EFFECTIVE_DATE}</p>
        <p className="mt-4 text-lg text-ink-dim">
          The short version: be honest, and understand that VettedPages is a
          directory — we vet businesses and verify reviews, but the work itself is
          between you and the business you hire.
        </p>
      </header>

      <div className="mx-auto mt-12 max-w-2xl space-y-10">
        <section>
          <h2 className="font-display text-xl font-bold">What VettedPages is</h2>
          <p className="mt-3 text-sm text-ink-dim">
            VettedPages is a directory of local businesses. Businesses apply and are
            screened before being listed, and reviews are verified before they count
            toward a rating. Right now we're in a pre-launch phase: joining the
            waitlist signs you up for launch updates for your area.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Honest information</h2>
          <p className="mt-3 text-sm text-ink-dim">
            When you sign up, recommend a business, apply to be listed, or write a
            review, the information you provide must be truthful and yours to share.
            Fake reviews, impersonation, and misrepresenting a business (including
            licensing or insurance status) are grounds for removal from the platform.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Vetting is not a guarantee</h2>
          <p className="mt-3 text-sm text-ink-dim">
            We screen businesses in good faith and verify reviews before they
            publish, but we are not a party to any work you hire a business to do.
            VettedPages does not guarantee the quality, safety, legality, or outcome
            of any service performed by a listed business. Always confirm current
            licensing and insurance directly with a business before hiring.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">For businesses</h2>
          <p className="mt-3 text-sm text-ink-dim">
            Requesting early access or applying to be listed doesn't guarantee a
            listing. We may decline or remove a listing at our discretion — for
            example, if application details can't be verified or platform rules are
            broken. Founding placement applies per category and area, as capacity
            allows.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">The service, as-is</h2>
          <p className="mt-3 text-sm text-ink-dim">
            VettedPages is provided "as is," without warranties of any kind. To the
            fullest extent allowed by law, VettedPages will not be liable for
            indirect, incidental, or consequential damages arising from your use of
            the site or from services performed by listed businesses.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-bold">Changes & governing law</h2>
          <p className="mt-3 text-sm text-ink-dim">
            We may update these terms as the platform grows; we'll update the
            effective date above when we do. These terms are governed by the laws of
            the State of Texas. Questions? Reply to any email from VettedPages.
          </p>
        </section>
      </div>
    </div>
  );
}
