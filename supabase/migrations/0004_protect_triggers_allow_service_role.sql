-- The field-guard triggers must only revert protected columns for real end-user
-- requests (anon / authenticated non-admins). The admin dashboard writes via the
-- service-role key, and earlier the guard wrongly reverted those approvals/verifies
-- (they checked is_admin(), which is JWT/user based and false for service-role).
--
-- This keys the guard off the PostgREST request role so service-role (admin backend),
-- admin users, the rating rollup (bypass flag), and direct DB/migrations all pass,
-- while owners/authors still can't self-approve or fake ratings.

create or replace function public.protect_company_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  req_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json->>'role', '');
begin
  if req_role in ('anon', 'authenticated')
     and not public.is_admin()
     and coalesce(current_setting('app.bypass_company_guard', true), '') <> '1' then
    new.status := old.status;
    new.rating_avg := old.rating_avg;
    new.rating_count := old.rating_count;
    new.verified_at := old.verified_at;
    new.owner_id := old.owner_id;
  end if;
  return new;
end; $$;

create or replace function public.protect_review_fields()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  req_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::json->>'role', '');
begin
  if req_role in ('anon', 'authenticated') and not public.is_admin() then
    new.status := old.status;
    new.verified_at := old.verified_at;
    new.verified_by := old.verified_by;
  end if;
  return new;
end; $$;
