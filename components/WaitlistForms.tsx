"use client";

import { useActionState } from "react";
import { ArrowRightIcon, CheckIcon } from "@/components/icons";
import type { Category } from "@/lib/types";
import { joinWaitlist, type WaitlistState } from "@/app/waitlist/actions";

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

/** Email + ZIP capture for homeowners who want launch updates. */
export function CustomerSignupForm() {
  const [state, formAction, isPending] = useActionState(joinWaitlist, initial);

  if (state.ok) {
    return (
      <SuccessNote>
        You're on the list! We'll email you the moment vetted pros go live in your area.
      </SuccessNote>
    );
  }

  return (
    <form action={formAction} className="mx-auto w-full max-w-lg">
      <input type="hidden" name="kind" value="customer" />
      <div className="panel-strong flex flex-col gap-2 p-2 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          placeholder="you@email.com"
          aria-label="Email address"
          className="input flex-1"
        />
        <input
          type="text"
          name="zip"
          required
          inputMode="numeric"
          placeholder="ZIP code"
          aria-label="ZIP code"
          className="input sm:w-32"
        />
        <button type="submit" disabled={isPending} className="btn-primary shrink-0">
          {isPending ? "Joining…" : "Notify me"}
          {!isPending && <ArrowRightIcon />}
        </button>
      </div>
      {state.error ? (
        <p className="mt-2 text-sm text-red-300">{state.error}</p>
      ) : (
        <p className="mt-2 text-center text-xs text-ink-faint">
          Your ZIP helps us launch in the busiest areas first. No spam — unsubscribe anytime.
        </p>
      )}
    </form>
  );
}

/** Early-access interest form for business owners. */
export function BusinessSignupForm({ categories }: { categories: Category[] }) {
  const [state, formAction, isPending] = useActionState(joinWaitlist, initial);

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
          <label className="label" htmlFor="w_name">Your name</label>
          <input id="w_name" name="name" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="w_email">Email *</label>
          <input id="w_email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="w_phone">Phone</label>
          <input id="w_phone" name="phone" type="tel" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="w_city">City</label>
          <input id="w_city" name="city" placeholder="e.g. Frisco" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="w_zip">ZIP code</label>
          <input id="w_zip" name="zip" inputMode="numeric" placeholder="e.g. 75034" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="w_category">Primary trade</label>
          <select id="w_category" name="category" defaultValue="" className="select">
            <option value="">Select a category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
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
