ALTER TABLE public.plan_items
  ADD COLUMN IF NOT EXISTS occurrence_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurring boolean NOT NULL DEFAULT false;