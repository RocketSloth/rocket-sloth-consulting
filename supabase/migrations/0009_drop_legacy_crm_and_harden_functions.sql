-- Two cleanups flagged by the Supabase security advisors:
--
-- 1. The RocketSloth-era CRM left 15 unprefixed tables behind (migration 0003
--    only dropped the crm_* ones). All were empty (verified 2026-07-09) and
--    unused by the app, but several carried USING(true) write policies for any
--    authenticated user — drop them, plus the helper functions only they used.
--
-- 2. Internal SECURITY DEFINER trigger functions were executable by anon /
--    authenticated via PostgREST RPC (/rest/v1/rpc/...). Trigger firing never
--    checks the caller's EXECUTE privilege (only trigger creation does), so
--    revoking is safe. is_admin() intentionally stays executable — RLS
--    policies evaluate it as the querying role, which needs EXECUTE.

-- Legacy CRM tables (all empty at time of drop).
drop table if exists
  public.signups,
  public.roles,
  public.app_users,
  public.customers,
  public.customer_contacts,
  public.projects,
  public.turnover_packages,
  public.turnover_checklist_items,
  public.fulfillment_risks,
  public.change_orders,
  public.change_order_approvals,
  public.comments,
  public.activity_log,
  public.notifications,
  public.settings
  cascade;

-- Legacy helper functions (only referenced by the tables above).
drop function if exists public.touch_updated_at() cascade;
drop function if exists public.current_app_user_id() cascade;
drop function if exists public.current_role_code() cascade;

-- Internal functions off the public RPC surface. The app never calls these via
-- .rpc(); they run only as triggers (or from other definer functions).
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.protect_profile_role() from public, anon, authenticated;
revoke execute on function public.protect_company_fields() from public, anon, authenticated;
revoke execute on function public.protect_review_fields() from public, anon, authenticated;
revoke execute on function public.reviews_rating_trigger() from public, anon, authenticated;
revoke execute on function public.refresh_company_rating(uuid) from public, anon, authenticated;
