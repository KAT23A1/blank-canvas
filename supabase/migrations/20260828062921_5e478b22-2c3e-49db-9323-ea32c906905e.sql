ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS ls_ends_at timestamptz;

CREATE TABLE IF NOT EXISTS public.system_errors (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  message text not null,
  detail jsonb,
  user_id uuid,
  created_at timestamptz not null default now()
);
GRANT ALL ON public.system_errors TO service_role;
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS system_errors_created_at_idx ON public.system_errors (created_at DESC);

CREATE OR REPLACE FUNCTION public.consume_unmess()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  sub public.subscriptions%ROWTYPE;
  current_period date := date_trunc('month', now())::date;
  free_limit integer := 5;
  effective_plan text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'plan', 'free', 'used', 0, 'limit', free_limit);
  END IF;

  INSERT INTO public.subscriptions (user_id, period_start)
  VALUES (_user_id, current_period)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO sub FROM public.subscriptions WHERE user_id = _user_id FOR UPDATE;

  IF sub.period_start < current_period THEN
    UPDATE public.subscriptions SET unmess_count = 0, period_start = current_period, updated_at = now()
    WHERE user_id = _user_id;
    sub.unmess_count := 0;
    sub.period_start := current_period;
  END IF;

  effective_plan := sub.plan;

  -- A cancelled-but-paid subscription keeps Pro until the paid period ends.
  IF effective_plan = 'pro' AND sub.ls_ends_at IS NOT NULL AND sub.ls_ends_at <= now() THEN
    UPDATE public.subscriptions SET plan = 'free', updated_at = now() WHERE user_id = _user_id;
    effective_plan := 'free';
  END IF;

  IF effective_plan = 'free' AND sub.unmess_count >= free_limit THEN
    RETURN jsonb_build_object('allowed', false, 'plan', effective_plan, 'used', sub.unmess_count, 'limit', free_limit);
  END IF;

  UPDATE public.subscriptions SET unmess_count = unmess_count + 1, updated_at = now()
  WHERE user_id = _user_id;

  RETURN jsonb_build_object('allowed', true, 'plan', effective_plan, 'used', sub.unmess_count + 1, 'limit', CASE WHEN effective_plan = 'pro' THEN NULL ELSE free_limit END);
END;
$function$;