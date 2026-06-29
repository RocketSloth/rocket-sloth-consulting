"use client";

import { useActionState, useState } from "react";
import { EvidenceUploader } from "@/components/EvidenceUploader";
import { StarIcon } from "@/components/icons";
import { cn } from "@/lib/format";
import { submitReview, type ActionState } from "./actions";

const initialState: ActionState = {};

function StarPicker() {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const active = hover || rating;

  return (
    <div>
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            className={cn(
              "text-3xl transition-colors",
              n <= active ? "text-salmon" : "text-line-strong hover:text-salmon/60"
            )}
          >
            <StarIcon filled />
          </button>
        ))}
      </div>
    </div>
  );
}

export function ReviewForm({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [state, formAction, isPending] = useActionState(submitReview, initialState);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="company_id" value={companyId} />

      {state.error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      ) : null}

      <section className="panel p-6">
        <h2 className="font-display text-lg font-semibold">Your rating of {companyName}</h2>
        <div className="mt-3">
          <StarPicker />
        </div>
        <div className="mt-4 grid gap-4">
          <div>
            <label className="label" htmlFor="title">Headline *</label>
            <input id="title" name="title" required className="input" placeholder="Sum up your experience" />
          </div>
          <div>
            <label className="label" htmlFor="body">Your review *</label>
            <textarea
              id="body"
              name="body"
              required
              className="textarea"
              placeholder="What was the job? How did it go? Would you hire them again?"
            />
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-lg font-semibold">Job details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="job_type">Type of job</label>
            <input id="job_type" name="job_type" className="input" placeholder="e.g. Water heater" />
          </div>
          <div>
            <label className="label" htmlFor="job_cost">Approx. cost ($)</label>
            <input id="job_cost" name="job_cost" type="number" min="0" step="1" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="job_completed_on">Completed on</label>
            <input id="job_completed_on" name="job_completed_on" type="date" className="input" />
          </div>
        </div>
      </section>

      <section className="panel p-6">
        <h2 className="font-display text-lg font-semibold">Proof of work *</h2>
        <p className="mt-1 text-sm text-ink-faint">
          Required for a valid review. We verify this before your review publishes.
        </p>
        <div className="mt-4">
          <EvidenceUploader />
        </div>
      </section>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-ink-faint">
          Your review stays pending until our team verifies the evidence.
        </p>
        <button type="submit" disabled={isPending} className="btn-primary">
          {isPending ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </form>
  );
}
