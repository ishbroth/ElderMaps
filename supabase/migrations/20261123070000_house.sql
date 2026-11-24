-- ElderMaps, step 7: the home house (the building game): rooms, furniture and residents, built out of loot. The house is saved as one document per person (and, later, one per vacation hold),
-- with a version number so two devices cannot overwrite each other.

create table if not exists public.home_house (
  user_id uuid not null references auth.users (id) on delete cascade,
  house_key text not null default 'home',
  state jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  primary key (user_id, house_key)
);
alter table public.home_house enable row level security;
drop policy if exists "own house" on public.home_house;
create policy "own house" on public.home_house for select to authenticated using (user_id = auth.uid());

-- Saves a new state and takes the cost ({"wood": 2, "iron": 2}) out of the loot in one step. p_version is the version the new state was worked out from: if the house has changed since
-- (a second device), nothing happens. Returns { ok, version } or { ok: false, reason: 'loot' | 'stale' }.
create or replace function public.house_commit(p_user uuid, p_state jsonb, p_cost jsonb, p_version integer, p_key text default 'home') returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text; have integer; v integer;
begin
  select version into have from home_house where user_id = p_user and house_key = p_key for update;
  if have is null then
    if p_version <> 0 then return jsonb_build_object('ok', false, 'reason', 'stale'); end if;
  elsif have <> p_version then
    return jsonb_build_object('ok', false, 'reason', 'stale');
  end if;
  for k in select jsonb_object_keys(p_cost) loop
    if coalesce((select qty from loot_bag where user_id = p_user and loot_id = k), 0) < (p_cost ->> k)::integer then
      return jsonb_build_object('ok', false, 'reason', 'loot');
    end if;
  end loop;
  for k in select jsonb_object_keys(p_cost) loop
    update loot_bag set qty = qty - (p_cost ->> k)::integer where user_id = p_user and loot_id = k;
  end loop;
  v := coalesce(have, 0) + 1;
  insert into home_house (user_id, house_key, state, version) values (p_user, p_key, p_state, v)
    on conflict (user_id, house_key) do update set state = excluded.state, version = excluded.version, updated_at = now();
  return jsonb_build_object('ok', true, 'version', v);
end $$;

-- Demolishing a room: the house is saved without it and half of what it cost is paid back, in one step (the loot is kept to 99 of each kind).
create or replace function public.house_demolish(p_user uuid, p_state jsonb, p_refund jsonb, p_version integer, p_key text default 'home') returns jsonb
language plpgsql security definer set search_path = public as $$
declare k text; have integer; v integer;
begin
  select version into have from home_house where user_id = p_user and house_key = p_key for update;
  if have is null then
    if p_version <> 0 then return jsonb_build_object('ok', false, 'reason', 'stale'); end if;
  elsif have <> p_version then
    return jsonb_build_object('ok', false, 'reason', 'stale');
  end if;
  for k in select jsonb_object_keys(p_refund) loop
    insert into loot_bag (user_id, loot_id, qty) values (p_user, k, least(99, greatest(0, (p_refund ->> k)::integer)))
      on conflict (user_id, loot_id) do update set qty = least(99, loot_bag.qty + greatest(0, (p_refund ->> k)::integer));
  end loop;
  v := coalesce(have, 0) + 1;
  insert into home_house (user_id, house_key, state, version) values (p_user, p_key, p_state, v)
    on conflict (user_id, house_key) do update set state = excluded.state, version = excluded.version, updated_at = now();
  return jsonb_build_object('ok', true, 'version', v);
end $$;

revoke all on function public.house_commit(uuid, jsonb, jsonb, integer, text) from public, anon, authenticated;
revoke all on function public.house_demolish(uuid, jsonb, jsonb, integer, text) from public, anon, authenticated;
grant execute on function public.house_commit(uuid, jsonb, jsonb, integer, text) to service_role;
grant execute on function public.house_demolish(uuid, jsonb, jsonb, integer, text) to service_role;
