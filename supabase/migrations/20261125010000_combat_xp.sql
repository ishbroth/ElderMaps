-- ElderMaps, step 10: experience from fighting. Discovering places still gives the main points (kept as they are); every foe vanquished gives a little, so a traveller can keep levelling (and the foes keep toughening) without always going out.
-- Kept in tenths of a point. Only the server writes it (the clear function works it out from the fight).
create table if not exists public.combat_xp (
  user_id uuid primary key references auth.users (id) on delete cascade,
  tenths integer not null default 0 check (tenths >= 0),
  updated_at timestamptz not null default now()
);
alter table public.combat_xp enable row level security;
drop policy if exists "own combat xp" on public.combat_xp;
create policy "own combat xp" on public.combat_xp for select to authenticated using (user_id = auth.uid());
create or replace function public.add_combat_xp(p_user uuid, p_tenths integer) returns integer
language plpgsql security definer set search_path = public as $$
declare t integer;
begin
  insert into combat_xp (user_id, tenths) values (p_user, greatest(0, p_tenths))
    on conflict (user_id) do update set tenths = combat_xp.tenths + greatest(0, p_tenths), updated_at = now()
    returning tenths into t;
  return t;
end $$;
revoke all on function public.add_combat_xp(uuid, integer) from public, anon, authenticated;
grant execute on function public.add_combat_xp(uuid, integer) to service_role;
