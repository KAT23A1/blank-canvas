ALTER TABLE public.plan_items
  ADD COLUMN IF NOT EXISTS effort text NOT NULL DEFAULT 'focused',
  ADD COLUMN IF NOT EXISTS blocked_by text;