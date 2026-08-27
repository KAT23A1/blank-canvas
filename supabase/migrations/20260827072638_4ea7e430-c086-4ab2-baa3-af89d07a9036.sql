CREATE OR REPLACE VIEW public.pro_subscribers
WITH (security_invoker = true) AS
SELECT
  s.user_id,
  s.plan,
  s.ls_status,
  s.ls_subscription_id,
  s.ls_customer_id,
  s.ls_renews_at,
  s.unmess_count,
  s.period_start,
  s.created_at,
  s.updated_at
FROM public.subscriptions s
WHERE s.plan = 'pro';

CREATE OR REPLACE VIEW public.free_users
WITH (security_invoker = true) AS
SELECT
  s.user_id,
  s.plan,
  s.unmess_count,
  s.period_start,
  s.created_at,
  s.updated_at
FROM public.subscriptions s
WHERE s.plan <> 'pro';

GRANT SELECT ON public.pro_subscribers TO authenticated;
GRANT SELECT ON public.free_users TO authenticated;
GRANT ALL ON public.pro_subscribers TO service_role;
GRANT ALL ON public.free_users TO service_role;