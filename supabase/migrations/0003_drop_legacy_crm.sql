-- One-time cleanup of the dead multi-tenant CRM tables from the previous site.
-- They were empty, unreferenced, and had RLS disabled (a security advisory).
-- `if exists` makes this a harmless no-op on fresh databases.

drop table if exists public.crm_sessions cascade;
drop table if exists public.crm_activities cascade;
drop table if exists public.crm_deals cascade;
drop table if exists public.crm_contacts cascade;
drop table if exists public.crm_users cascade;
drop table if exists public.crm_tenants cascade;
