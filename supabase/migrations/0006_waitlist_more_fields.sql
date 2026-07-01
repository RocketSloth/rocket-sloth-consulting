-- Capture more signup detail: ZIP (so demand can be gauged by area — the signal
-- for when to launch a market) and an optional business phone for follow-up.
alter table public.waitlist_signups add column if not exists zip text;
alter table public.waitlist_signups add column if not exists phone text;
