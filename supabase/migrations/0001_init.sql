-- RocketSloth.Space — vetted home & trade services directory
-- Core schema: profiles, categories, companies (+ categories), applications,
-- reviews, review evidence. Includes RLS, rating rollup, and storage buckets.

create extension if not exists "pgcrypto";

-- ============================================================ profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  full_name text not null default '',
  role text not null default 'customer' check (role in ('customer','company_owner','admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile when an auth user signs up. Role is taken from signup
-- metadata but can NEVER be 'admin' here — admins are promoted manually.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when (new.raw_user_meta_data->>'role') = 'company_owner'
         then 'company_owner' else 'customer' end
  )
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Prevent a user from escalating their own role; only admins may change roles.
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role) and not public.is_admin() then
    new.role := old.role;
  end if;
  return new;
end; $$;

-- ============================================================ admin helper
-- security definer so it can read profiles without tripping profiles' own RLS.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

drop trigger if exists protect_profile_role_trg on public.profiles;
create trigger protect_profile_role_trg
  before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ============================================================ categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  icon text,
  sort_order int not null default 0
);

-- ============================================================ companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  slug text not null unique,
  name text not null,
  description text,
  phone text,
  email text,
  website text,
  address_line text,
  city text,
  state text,
  zip text,
  service_area text,
  license_number text,
  years_in_business int,
  logo_url text,
  cover_url text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','suspended')),
  rating_avg numeric(2,1) not null default 0,
  rating_count int not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists companies_status_idx on public.companies(status);
create index if not exists companies_slug_idx on public.companies(slug);

-- Non-admins can edit their company profile but never self-approve or fake ratings.
create or replace function public.protect_company_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.status := old.status;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.verified_at := old.verified_at;
    new.owner_id := old.owner_id;
  end if;
  return new;
end; $$;

drop trigger if exists protect_company_fields_trg on public.companies;
create trigger protect_company_fields_trg
  before update on public.companies
  for each row execute function public.protect_company_fields();

-- ============================================================ company_categories
create table if not exists public.company_categories (
  company_id uuid not null references public.companies(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (company_id, category_id)
);
create index if not exists company_categories_category_idx
  on public.company_categories(category_id);

-- ============================================================ company_applications
create table if not exists public.company_applications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  applicant_name text not null default '',
  applicant_email text not null default '',
  applicant_phone text,
  license_number text,
  doc_paths jsonb not null default '[]'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','under_review','approved','rejected')),
  admin_notes text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists company_applications_status_idx
  on public.company_applications(status);

-- ============================================================ reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default '',
  rating int not null check (rating between 1 and 5),
  title text not null default '',
  body text not null default '',
  job_type text,
  job_cost numeric(12,2),
  job_completed_on date,
  status text not null default 'pending'
    check (status in ('pending','published','rejected')),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  admin_notes text,
  created_at timestamptz not null default now(),
  unique (company_id, author_id)
);
create index if not exists reviews_company_idx on public.reviews(company_id);
create index if not exists reviews_status_idx on public.reviews(status);

-- A reviewer cannot self-publish; only admins flip status/verification.
create or replace function public.protect_review_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.status := old.status;
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
  end if;
  return new;
end; $$;

drop trigger if exists protect_review_fields_trg on public.reviews;
create trigger protect_review_fields_trg
  before update on public.reviews
  for each row execute function public.protect_review_fields();

-- ============================================================ review_evidence
create table if not exists public.review_evidence (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  kind text not null check (kind in ('receipt_invoice','before_photo','after_photo')),
  bucket text not null,
  path text not null,
  created_at timestamptz not null default now()
);
create index if not exists review_evidence_review_idx
  on public.review_evidence(review_id);

-- ============================================================ rating rollup
create or replace function public.refresh_company_rating(target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.companies c set
    rating_avg = coalesce(
      (select round(avg(r.rating)::numeric, 1)
         from public.reviews r
        where r.company_id = target and r.status = 'published'), 0),
    rating_count = (
      select count(*) from public.reviews r
       where r.company_id = target and r.status = 'published')
  where c.id = target;
end; $$;

create or replace function public.reviews_rating_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE') then
    perform public.refresh_company_rating(old.company_id);
    return old;
  end if;
  perform public.refresh_company_rating(new.company_id);
  if (tg_op = 'UPDATE' and old.company_id is distinct from new.company_id) then
    perform public.refresh_company_rating(old.company_id);
  end if;
  return new;
end; $$;

drop trigger if exists reviews_rating_rollup on public.reviews;
create trigger reviews_rating_rollup
  after insert or update or delete on public.reviews
  for each row execute function public.reviews_rating_trigger();

-- ============================================================ RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.companies enable row level security;
alter table public.company_categories enable row level security;
alter table public.company_applications enable row level security;
alter table public.reviews enable row level security;
alter table public.review_evidence enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id or public.is_admin());
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id or public.is_admin())
  with check (auth.uid() = id or public.is_admin());

-- categories: public read, admin write
drop policy if exists categories_read on public.categories;
create policy categories_read on public.categories for select using (true);
drop policy if exists categories_admin on public.categories;
create policy categories_admin on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- companies: public sees approved; owners see/manage their own; admins all
drop policy if exists companies_read on public.companies;
create policy companies_read on public.companies
  for select using (status = 'approved' or owner_id = auth.uid() or public.is_admin());
drop policy if exists companies_insert_own on public.companies;
create policy companies_insert_own on public.companies
  for insert with check (owner_id = auth.uid() and status = 'pending');
drop policy if exists companies_update_own on public.companies;
create policy companies_update_own on public.companies
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- company_categories: public read; owner/admin manage
drop policy if exists company_categories_read on public.company_categories;
create policy company_categories_read on public.company_categories
  for select using (true);
drop policy if exists company_categories_write on public.company_categories;
create policy company_categories_write on public.company_categories
  for all using (
    public.is_admin() or exists (
      select 1 from public.companies c
      where c.id = company_id and c.owner_id = auth.uid())
  ) with check (
    public.is_admin() or exists (
      select 1 from public.companies c
      where c.id = company_id and c.owner_id = auth.uid())
  );

-- applications: owner of the company or admin
drop policy if exists applications_select on public.company_applications;
create policy applications_select on public.company_applications
  for select using (
    public.is_admin() or exists (
      select 1 from public.companies c
      where c.id = company_id and c.owner_id = auth.uid())
  );
drop policy if exists applications_insert on public.company_applications;
create policy applications_insert on public.company_applications
  for insert with check (
    exists (select 1 from public.companies c
            where c.id = company_id and c.owner_id = auth.uid())
  );
drop policy if exists applications_admin_update on public.company_applications;
create policy applications_admin_update on public.company_applications
  for update using (public.is_admin()) with check (public.is_admin());

-- reviews: public sees published; authors see/manage own; admins all
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews
  for select using (status = 'published' or author_id = auth.uid() or public.is_admin());
drop policy if exists reviews_insert_own on public.reviews;
create policy reviews_insert_own on public.reviews
  for insert with check (author_id = auth.uid() and status = 'pending');
drop policy if exists reviews_update_own on public.reviews;
create policy reviews_update_own on public.reviews
  for update using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());
drop policy if exists reviews_delete_own on public.reviews;
create policy reviews_delete_own on public.reviews
  for delete using (author_id = auth.uid() or public.is_admin());

-- review_evidence: photos of published reviews are public; authors/admins see all
drop policy if exists review_evidence_read on public.review_evidence;
create policy review_evidence_read on public.review_evidence
  for select using (
    public.is_admin()
    or exists (select 1 from public.reviews r where r.id = review_id and r.author_id = auth.uid())
    or (
      bucket = 'review-photos'
      and exists (select 1 from public.reviews r where r.id = review_id and r.status = 'published')
    )
  );
drop policy if exists review_evidence_write on public.review_evidence;
create policy review_evidence_write on public.review_evidence
  for all using (
    public.is_admin() or exists (
      select 1 from public.reviews r where r.id = review_id and r.author_id = auth.uid())
  ) with check (
    public.is_admin() or exists (
      select 1 from public.reviews r where r.id = review_id and r.author_id = auth.uid())
  );

-- ============================================================ storage
insert into storage.buckets (id, name, public) values
  ('review-photos','review-photos', true),
  ('review-receipts','review-receipts', false),
  ('applications','applications', false),
  ('company-media','company-media', true)
on conflict (id) do nothing;

drop policy if exists storage_public_read on storage.objects;
create policy storage_public_read on storage.objects
  for select using (bucket_id in ('review-photos','company-media'));

drop policy if exists storage_private_read on storage.objects;
create policy storage_private_read on storage.objects
  for select using (
    bucket_id in ('review-receipts','applications')
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

drop policy if exists storage_user_insert on storage.objects;
create policy storage_user_insert on storage.objects
  for insert to authenticated with check (
    bucket_id in ('review-photos','review-receipts','applications','company-media')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists storage_user_update on storage.objects;
create policy storage_user_update on storage.objects
  for update to authenticated using (
    (storage.foldername(name))[1] = auth.uid()::text or public.is_admin()
  );

drop policy if exists storage_user_delete on storage.objects;
create policy storage_user_delete on storage.objects
  for delete to authenticated using (
    (storage.foldername(name))[1] = auth.uid()::text or public.is_admin()
  );
