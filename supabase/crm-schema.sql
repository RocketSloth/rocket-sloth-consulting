-- Rocket Sloth CRM Platform: multi-tenant schema.
--
-- Each tenant = one customer company you've sold a CRM to.
-- Every row in every CRM table is scoped by tenant_id so a single
-- Supabase project can host many CRMs safely.

create extension if not exists "pgcrypto";

-- Tenants (your customers)
create table if not exists public.crm_tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  plan text not null default 'starter',
  status text not null default 'active',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_tenants_slug_idx on public.crm_tenants (slug);

-- Users of each tenant CRM (staff at the customer company)
create table if not exists public.crm_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.crm_tenants(id) on delete cascade,
  email text not null,
  full_name text not null default '',
  role text not null default 'member',
  password_hash text not null,
  last_login_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (tenant_id, email)
);

create index if not exists crm_users_tenant_idx on public.crm_users (tenant_id);

-- Session tokens
create table if not exists public.crm_sessions (
  token text primary key,
  tenant_id uuid not null references public.crm_tenants(id) on delete cascade,
  user_id uuid not null references public.crm_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_sessions_user_idx on public.crm_sessions (user_id);

-- Contacts (people / leads)
create table if not exists public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.crm_tenants(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text not null default '',
  company text not null default '',
  title text not null default '',
  status text not null default 'lead',
  owner_id uuid references public.crm_users(id) on delete set null,
  tags text[] not null default '{}',
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_contacts_tenant_idx on public.crm_contacts (tenant_id);
create index if not exists crm_contacts_email_idx on public.crm_contacts (tenant_id, email);

-- Deals (pipeline opportunities)
create table if not exists public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.crm_tenants(id) on delete cascade,
  title text not null,
  contact_id uuid references public.crm_contacts(id) on delete set null,
  owner_id uuid references public.crm_users(id) on delete set null,
  stage text not null default 'new',
  amount numeric(14,2) not null default 0,
  currency text not null default 'USD',
  probability int not null default 0,
  expected_close_date date,
  custom_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_deals_tenant_idx on public.crm_deals (tenant_id);
create index if not exists crm_deals_stage_idx on public.crm_deals (tenant_id, stage);

-- Activities / timeline events (calls, emails, notes, meetings)
create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.crm_tenants(id) on delete cascade,
  contact_id uuid references public.crm_contacts(id) on delete cascade,
  deal_id uuid references public.crm_deals(id) on delete cascade,
  user_id uuid references public.crm_users(id) on delete set null,
  type text not null default 'note',
  subject text not null default '',
  body text not null default '',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_activities_tenant_idx on public.crm_activities (tenant_id);
create index if not exists crm_activities_contact_idx on public.crm_activities (contact_id);
create index if not exists crm_activities_deal_idx on public.crm_activities (deal_id);
