-- Pre-launch waitlist: capture customers who want updates and businesses who
-- want early access, so the owner can email the list while building.
create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  kind text not null default 'customer' check (kind in ('customer','business')),
  name text,
  business_name text,
  category text,
  city text,
  message text,
  created_at timestamptz not null default now(),
  unique (email, kind)
);
create index if not exists waitlist_signups_created_idx on public.waitlist_signups (created_at desc);

alter table public.waitlist_signups enable row level security;

-- Anyone can sign up; nobody but admins can read the list (RLS default-denies
-- select to anon, and admin tooling reads via the service-role key).
drop policy if exists waitlist_insert on public.waitlist_signups;
create policy waitlist_insert on public.waitlist_signups
  for insert to anon, authenticated with check (true);
drop policy if exists waitlist_admin_read on public.waitlist_signups;
create policy waitlist_admin_read on public.waitlist_signups
  for select using (public.is_admin());
