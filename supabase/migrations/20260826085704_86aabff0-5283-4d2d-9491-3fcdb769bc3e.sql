CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free',
  unmess_count integer NOT NULL DEFAULT 0,
  period_start date NOT NULL DEFAULT date_trunc('month', now())::date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_plan_check CHECK (plan IN ('free', 'pro'))
);
GRANT SELECT, UPDATE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own plan" ON public.subscriptions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_subscription AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

CREATE OR REPLACE FUNCTION public.consume_unmess(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub public.subscriptions%ROWTYPE;
  current_period date := date_trunc('month', now())::date;
  free_limit integer := 5;
BEGIN
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
GRANT EXECUTE ON FUNCTION public.consume_unmess(uuid) TO authenticated;