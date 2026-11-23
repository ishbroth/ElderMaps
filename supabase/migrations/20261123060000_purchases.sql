-- ElderMaps, step 6: buying septims. Each paid checkout is recorded once, so a payment that Stripe reports twice adds septims only once.
create table if not exists public.credit_purchases (
  session_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  credits integer not null,
  created_at timestamptz not null default now()
);
alter table public.credit_purchases enable row level security; -- no policies: only the server's own key reaches it

-- Adds credits for a paid checkout session, once. Answers true when it added them, false when this session was already counted.
create or replace function public.add_credits(p_user uuid, p_amount integer, p_session text) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  insert into credit_purchases (session_id, user_id, credits) values (p_session, p_user, p_amount) on conflict do nothing;
  if not found then return false; end if;
  insert into credits (user_id, balance) values (p_user, p_amount) on conflict (user_id) do update set balance = credits.balance + p_amount, updated_at = now();
  return true;
end $$;
revoke all on function public.add_credits(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.add_credits(uuid, integer, text) to service_role;
