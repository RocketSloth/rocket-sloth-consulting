-- Admin allowlist: emails listed here are granted the admin role automatically
-- when they sign up (so the first admin doesn't need a manual UPDATE).

create table if not exists public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.admin_emails enable row level security;
drop policy if exists admin_emails_admin on public.admin_emails;
create policy admin_emails_admin on public.admin_emails
  for all using (public.is_admin()) with check (public.is_admin());

-- Replace the signup handler so role assignment also honors the allowlist.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case
      when exists (select 1 from public.admin_emails a where lower(a.email) = lower(coalesce(new.email, '')))
        then 'admin'
      when (new.raw_user_meta_data->>'role') = 'company_owner'
        then 'company_owner'
      else 'customer'
    end
  )
  on conflict (id) do nothing;
  return new;
end; $$;

-- Add admin emails per environment, e.g.:
--   insert into public.admin_emails (email) values ('you@example.com') on conflict do nothing;
