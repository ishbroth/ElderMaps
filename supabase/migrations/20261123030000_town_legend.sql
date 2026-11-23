-- ElderMaps, step 3: the Town Legend (the map of one whole city, bought once per metro) and what it needs.
--   metro_unlocks   which metros a person has bought the Town Legend of
--   renders.metro_id / renders.kind   which metro a finished picture belongs to and what kind of place it is, so a Town Legend can plot every place glimpsed in its city

alter table public.renders add column if not exists metro_id text;
alter table public.renders add column if not exists kind text;
create index if not exists renders_metro on public.renders (metro_id) where status = 'ready';

create table if not exists public.metro_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  metro_id text not null,
  cost integer not null default 48,
  created_at timestamptz not null default now(),
  primary key (user_id, metro_id)
);
alter table public.metro_unlocks enable row level security;
drop policy if exists "own metros" on public.metro_unlocks;
create policy "own metros" on public.metro_unlocks for select to authenticated using (user_id = auth.uid());

-- Buys a Town Legend: 'already' (nothing charged), 'spent', or 'no_credits'. One atomic step.
create or replace function public.unlock_metro(p_user uuid, p_metro text, p_cost integer) returns text
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from metro_unlocks where user_id = p_user and metro_id = p_metro) then return 'already'; end if;
  update credits set balance = balance - p_cost, updated_at = now() where user_id = p_user and balance >= p_cost;
  if not found then return 'no_credits'; end if;
  insert into metro_unlocks (user_id, metro_id, cost) values (p_user, p_metro, p_cost) on conflict do nothing;
  return 'spent';
end $$;
revoke all on function public.unlock_metro(uuid, text, integer) from public, anon, authenticated;
grant execute on function public.unlock_metro(uuid, text, integer) to service_role;
