"use client";

import { useActionState } from "react";
import { ShieldCheckIcon } from "@/components/icons";
import type { Category } from "@/lib/types";
import { submitApplication, type ActionState } from "./actions";

const initialState: ActionState = {};

export function ApplyForm({ categories }: { categories: Category[] }) {
  const [state, formAction, isPending] = useActionState(submitApplication, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}

      {/* Business basics */}
      <section className="panel p-6">
        <h2 className="font-display text-lg font-semibold">Business details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">Business name *</label>
            <input id="name" name="name" required className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">What you do</label>
            <textarea
              id="description"
              name="description"
              className="textarea"
              placeholder="A short description homeowners will see on your profile."
            />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Public email</label>
            <input id="email" name="email" type="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="website">Website</label>
            <input id="website" name="website" placeholder="https://" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="years_in_business">Years in business</label>
            <input id="years_in_business" name="years_in_business" type="number" min="0" className="input" />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="panel p-6">
        <h2 className="font-display text-lg font-semibold">Categories *</h2>
        <p className="mt-1 text-sm text-ink-faint">Pick every trade you cover.</p>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border border-line-strong px-3 py-2 text-sm transition-colors hover:border-brand/40 has-[:checked]:border-brand has-[:checked]:bg-brand/10"
            >
              <input type="checkbox" name="categories" value={c.slug} className="accent-brand" />
              <span>{c.icon} {c.name}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Service area */}
      <section className="panel p-6">
        <h2 className="font-display text-lg font-semibold">Service area</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="address_line">Address</label>
            <input id="address_line" name="address_line" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="city">City</label>
            <input id="city" name="city" className="input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="state">State</label>
              <input id="state" name="state" maxLength={2} placeholder="WA" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="zip">ZIP</label>
              <input id="zip" name="zip" className="input" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="service_area">Areas you serve</label>
            <input
              id="service_area"
              name="service_area"
              placeholder="e.g. Portland metro & inner suburbs"
              className="input"
            />
          </div>
        </div>
      </section>

      {/* Vetting */}
      <section className="panel p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <ShieldCheckIcon className="text-brand" /> Vetting
        </h2>
        <p className="mt-1 text-sm text-ink-faint">
          We verify this before approving your listing. Documents are private.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="license_number">License number *</label>
            <input id="license_number" name="license_number" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="license_doc">License document</label>
            <input id="license_doc" name="license_doc" type="file" accept="image/*,application/pdf" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="insurance_doc">Proof of insurance</label>
            <input id="insurance_doc" name="insurance_doc" type="file" accept="image/*,application/pdf" className="input" />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-ink-faint">
          By applying you agree we may contact you to verify your business.
        </p>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </form>
  );
}
