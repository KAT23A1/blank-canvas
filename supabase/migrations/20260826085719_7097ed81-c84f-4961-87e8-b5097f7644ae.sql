REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.consume_unmess(uuid) FROM anon, public;

CREATE OR REPLACE FUNCTION public.consume_unmess()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  sub public.subscriptions%ROWTYPE;
  current_period date := date_trunc('month', now())::date;
  free_limit integer := 5;
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

  IF sub.plan = 'free' AND sub.unmess_count >= free_limit THEN
    RETURN jsonb_build_object('allowed', false, 'plan', sub.plan, 'used', sub.unmess_count, 'limit', free_limit);
  END IF;

  UPDATE public.subscriptions SET unmess_count = unmess_count + 1, updated_at = now()
  WHERE user_id = _user_id;

  RETURN jsonb_build_object('allowed', true, 'plan', sub.plan, 'used', sub.unmess_count + 1, 'limit', CASE WHEN sub.plan = 'pro' THEN NULL ELSE free_limit END);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.consume_unmess() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.consume_unmess() TO authenticated;