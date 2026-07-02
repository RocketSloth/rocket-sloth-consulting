"use client";

import { useActionState, useState } from "react";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import { BUSINESS_TYPE_GROUPS, LAUNCH_CATEGORIES } from "@/lib/constants";
import {
  joinWaitlist,
  recommendBusiness,
  type WaitlistState,
} from "@/app/waitlist/actions";

const initial: WaitlistState = {};

function SuccessNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/10 p-4 text-sm text-ink">
      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/20 text-brand">
        <CheckIcon />
      </span>
      <p>{children}</p>
    </div>
  );
}

/**
 * Referral loop: shown after a resident joins, and reusable anywhere.
 * Lets neighbors build the supply side by recommending businesses they trust.
 */
export function RecommendBusinessForm({
  recommenderEmail,
}: {
  recommenderEmail?: string;
}) {
  const [state, formAction, isPending] = useActionState(recommendBusiness, initial);

  if (state.ok) {
    return (
      <SuccessNote>
        Thank you! We'll invite them to apply as a founding vetted business.
      </SuccessNote>
    );
  }

  return (
    <form action={formAction} className="space-y-3 text-left">
      <input type="hidden" name="recommender_email" value={recommenderEmail ?? ""} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="r_business">Business name *</label>
          <input id="r_business" name="business_name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="r_city">City *</label>
          <input id="r_city" name="city" required placeholder="e.g. Little Elm" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="r_category">What do they do? *</label>
          <select id="r_category" name="category" required defaultValue="" className="select">
            <option value="" disabled>
              Select a category
            </option>
            {BUSINESS_TYPE_GROUPS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="r_reason">Why do you recommend them?</label>
          <textarea
            id="r_reason"
            name="reason"
            className="textarea min-h-[70px]"
            placeholder="They re-roofed our house after the hailstorm — fair price, spotless cleanup."
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="r_contact">Their phone or website (if you know it)</label>
          <input id="r_contact" name="contact_info" className="input" />
        </div>
      </div>
      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Sending…" : "Recommend this business"}
      </button>
    </form>
  );
}

/** Resident signup: email + ZIP + most-needed service, then the referral loop. */
export function CustomerSignupForm() {
  const [state, formAction, isPending] = useActionState(joinWaitlist, initial);
  const [email, setEmail] = useState("");

  if (state.ok) {
    return (
      <div className="mx-auto w-full max-w-lg space-y-4 text-left">
        <SuccessNote>
          You're on the list! We'll email you the moment vetted pros go live in your area.
        </SuccessNote>
        <div className="panel-strong p-5">
          <h3 className="font-display text-lg font-semibold">
            Know a business your neighbors should trust?
          </h3>
          <p className="mb-4 mt-1 text-sm text-ink-dim">
            Recommend them and we'll invite them to get vetted before launch.
          </p>
          <RecommendBusinessForm recommenderEmail={email} />
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="mx-auto w-full max-w-lg">
      <input type="hidden" name="kind" value="customer" />
      <div className="panel-strong grid gap-2 p-2 sm:grid-cols-[1.3fr_0.7fr]">
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          aria-label="Email address"
          className="input"
        />
        <input
          type="text"
          name="zip"
          required
          inputMode="numeric"
          placeholder="ZIP code"
          aria-label="ZIP code"
          className="input"
        />
        <select
          name="category"
          required
          defaultValue=""
          aria-label="What service do you need most?"
          className="select sm:col-span-2"
        >
          <option value="" disabled>
            What service do you need most?
          </option>
          {LAUNCH_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.name}>
              {c.icon} {c.name}
            </option>
          ))}
          <option value="Something else">Something else</option>
        </select>
        <button type="submit" disabled={isPending} className="btn-primary sm:col-span-2">
          {isPending ? "Joining…" : "Join the local list"}
          {!isPending && <ArrowRightIcon />}
        </button>
      </div>
      {state.error ? (
        <p className="mt-2 text-sm text-red-300">{state.error}</p>
      ) : (
        <p className="mt-2 text-center text-xs text-ink-faint">
          Your ZIP and most-needed service decide which areas we open first. No spam —
          unsubscribe anytime.
        </p>
      )}
    </form>
  );
}

/** Early-access interest form for business owners. All fields are required. */
export function BusinessSignupForm() {
  const [state, formAction, isPending] = useActionState(joinWaitlist, initial);
  const [noWebsite, setNoWebsite] = useState(false);

  if (state.ok) {
    return (
      <SuccessNote>
        Thanks — you're on the early-access list. We'll reach out as we open up vetting for
        new businesses.
      </SuccessNote>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="kind" value="business" />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="w_business">Business name *</label>
          <input id="w_business" name="business_name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="w_name">Your name *</label>
          <input id="w_name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="w_email">Email *</label>
          <input id="w_email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="w_phone">Phone *</label>
          <input id="w_phone" name="phone" type="tel" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="w_city">City *</label>
          <input id="w_city" name="city" required placeholder="e.g. Frisco" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="w_zip">ZIP code *</label>
          <input
            id="w_zip"
            name="zip"
            required
            inputMode="numeric"
            placeholder="e.g. 75034"
            className="input"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="w_category">Type of business *</label>
          <select id="w_category" name="category" required defaultValue="" className="select">
            <option value="" disabled>
              Select your business type
            </option>
            {BUSINESS_TYPE_GROUPS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="w_website">Website *</label>
          <input
            id="w_website"
            name="website"
            type="text"
            placeholder="yourbusiness.com"
            required={!noWebsite}
            disabled={noWebsite}
            className="input disabled:opacity-50"
          />
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-ink-dim">
            <input
              type="checkbox"
              name="no_website"
              value="1"
              checked={noWebsite}
              onChange={(e) => setNoWebsite(e.target.checked)}
              className="accent-brand"
            />
            I don't have a website yet
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="w_message">Anything else? (optional)</label>
          <textarea
            id="w_message"
            name="message"
            className="textarea min-h-[80px]"
            placeholder="Tell us a bit about your business."
          />
        </div>
      </div>
      {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
      <button type="submit" disabled={isPending} className="btn-primary w-full">
        {isPending ? "Submitting…" : "Request early access"}
      </button>
    </form>
  );
}
