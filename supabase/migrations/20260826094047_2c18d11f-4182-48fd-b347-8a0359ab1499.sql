-- Plan/usage changes must only happen via consume_unmess (security definer)
-- or the Lemon Squeezy webhook (service role). Users must not edit their own row.
drop policy if exists "Users can update their own plan" on public.subscriptions;
revoke update on public.subscriptions from authenticated;