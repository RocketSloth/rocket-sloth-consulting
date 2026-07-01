-- Capture a business website (optional) on early-access signups.
alter table public.waitlist_signups add column if not exists website text;
