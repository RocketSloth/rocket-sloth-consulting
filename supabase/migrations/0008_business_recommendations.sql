-- Referral loop: residents recommend businesses they trust. Public insert,
-- admin-only read (same trust model as waitlist_signups). The owner works the
-- queue via status while inviting founding businesses.
create table if not exists public.business_recommendations (
  id uuid primary key default gen_random_uuid(),
  recommender_email text,
  business_name text not null,
  category text,
  city text,
  reason text,
  contact_info text,
  status text not null default 'new'
    check (status in ('new','contacted','invited','listed','dismissed')),
  created_at timestamptz not null default now()
);
create index if not exists business_recommendations_created_idx
  on public.business_recommendations (created_at desc);

alter table public.business_recommendations enable row level security;

drop policy if exists recommendations_insert on public.business_recommendations;
create policy recommendations_insert on public.business_recommendations
  for insert to anon, authenticated with check (true);
drop policy if exists recommendations_admin_read on public.business_recommendations;
create policy recommendations_admin_read on public.business_recommendations
  for select using (public.is_admin());
drop policy if exists recommendations_admin_update on public.business_recommendations;
create policy recommendations_admin_update on public.business_recommendations
  for update using (public.is_admin()) with check (public.is_admin());
