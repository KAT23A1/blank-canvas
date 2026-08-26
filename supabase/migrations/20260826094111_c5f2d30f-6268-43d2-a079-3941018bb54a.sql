-- reminder_sends is written/read only by the reminders endpoint via the service role;
-- make the lock-down explicit so RLS has a documented deny policy.
create policy "No direct client access" on public.reminder_sends
  for all to authenticated using (false) with check (false);

-- Drop the unused consume_unmess(user_id) overload; the app only uses the
-- variant that acts on the caller (auth.uid()).
drop function if exists public.consume_unmess(uuid);

-- Trigger function runs from the auth trigger only; clients never call it.
revoke execute on function public.handle_new_user_subscription() from anon, authenticated;