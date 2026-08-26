ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS ls_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS ls_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS ls_status TEXT,
  ADD COLUMN IF NOT EXISTS ls_portal_url TEXT,
  ADD COLUMN IF NOT EXISTS ls_renews_at TIMESTAMPTZ;