-- ElderMaps, step 4: clearing a place (the combat game), the loot it pays and what the traveller carries.
--   raid_runs   each fight: who, where, whether it was won, what it paid, and whether that has been paid yet (a place cleared before it has been visited holds its loot until it is discovered)
--   loot_bag    the loot held, by kind
--   pack        potions and shouts (Legendary Time) carried
-- All written by the server's own key; a person reads only their own rows.

create table if not exists public.raid_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  won boolean,
  paid boolean not null default false,
  loot jsonb
);
create index if not exists raid_runs_user_place on public.raid_runs (user_id, place_id);
alter table public.raid_runs enable row level security;
drop policy if exists "own runs" on public.raid_runs;
create policy "own runs" on public.raid_runs for select to authenticated using (user_id = auth.uid());

create table if not exists public.loot_bag (
  user_id uuid not null references auth.users (id) on delete cascade,
  loot_id text not null,
  qty integer not null default 0 check (qty >= 0),
  primary key (user_id, loot_id)
);
alter table public.loot_bag enable row level security;
drop policy if exists "own loot" on public.loot_bag;
create policy "own loot" on public.loot_bag for select to authenticated using (user_id = auth.uid());

create table if not exists public.pack (
  user_id uuid primary key references auth.users (id) on delete cascade,
  potions integer not null default 0 check (potions >= 0),
  shouts integer not null default 0 check (shouts >= 0)
);
alter table public.pack enable row level security;
drop policy if exists "own pack" on public.pack;
create policy "own pack" on public.pack for select to authenticated using (user_id = auth.uid());

-- Adds loot ({"iron": 2, "wood": 1}) to a person's bag.
create or replace function public.add_loot(p_user uuid, p_loot jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare k text; v integer;
begin
  for k, v in select key, (value)::integer from jsonb_each_text(p_loot) loop
    if v > 0 then
      insert into loot_bag (user_id, loot_id, qty) values (p_user, k, v) on conflict (user_id, loot_id) do update set qty = loot_bag.qty + v;
    end if;
  end loop;
end $$;

-- Pays the loot of a place that was cleared before it was visited, now that it has been discovered. Returns what was paid (or null).
create or replace function public.claim_loot(p_user uuid, p_place text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; total jsonb := '{}'::jsonb; k text; v integer;
begin
  if not exists (select 1 from discoveries where user_id = p_user and place_id = p_place) then return null; end if;
  for r in select id, loot from raid_runs where user_id = p_user and place_id = p_place and won and not paid for update loop
    perform add_loot(p_user, r.loot);
    update raid_runs set paid = true where id = r.id;
    for k, v in select key, (value)::integer from jsonb_each_text(r.loot) loop
      total := jsonb_set(total, array[k], to_jsonb(coalesce((total ->> k)::integer, 0) + v));
    end loop;
  end loop;
  return case when total = '{}'::jsonb then null else total end;
end $$;

revoke all on function public.add_loot(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.claim_loot(uuid, text) from public, anon, authenticated;
grant execute on function public.add_loot(uuid, jsonb) to service_role;
grant execute on function public.claim_loot(uuid, text) to service_role;
