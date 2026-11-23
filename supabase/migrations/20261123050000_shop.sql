-- ElderMaps, step 5: the forge and the alchemist: what loot buys.
--   arsenal   the best tier each person owns of each weapon or spell
--   pack.dual whether they have bought the use of both hands at once (magic and a weapon, two spells, or two one-handed weapons)

create table if not exists public.arsenal (
  user_id uuid not null references auth.users (id) on delete cascade,
  cls text not null check (cls in ('onehand', 'twohand', 'bow', 'shock', 'frost', 'fire', 'drain')),
  tier integer not null check (tier between 1 and 4),
  primary key (user_id, cls)
);
alter table public.arsenal enable row level security;
drop policy if exists "own arsenal" on public.arsenal;
create policy "own arsenal" on public.arsenal for select to authenticated using (user_id = auth.uid());

alter table public.pack add column if not exists dual boolean not null default false;

-- Takes loot out of a person's bag in one atomic step: every kind in p_cost must be there, and p_herbs more pieces of any of the herb kinds p_herb_ids (the most plentiful first).
-- Answers false (and takes nothing) if they cannot pay.
create or replace function public.spend_loot(p_user uuid, p_cost jsonb, p_herbs integer, p_herb_ids text[]) returns boolean
language plpgsql security definer set search_path = public as $$
declare k text; v integer; need integer; r record;
begin
  for k, v in select key, (value)::integer from jsonb_each_text(coalesce(p_cost, '{}'::jsonb)) loop
    if coalesce((select qty from loot_bag where user_id = p_user and loot_id = k for update), 0) < v then return false; end if;
  end loop;
  if p_herbs > 0 then
    if coalesce((select sum(qty) from loot_bag where user_id = p_user and loot_id = any (p_herb_ids)), 0) < p_herbs then return false; end if;
  end if;
  for k, v in select key, (value)::integer from jsonb_each_text(coalesce(p_cost, '{}'::jsonb)) loop
    update loot_bag set qty = qty - v where user_id = p_user and loot_id = k;
  end loop;
  need := coalesce(p_herbs, 0);
  if need > 0 then
    for r in select loot_id, qty from loot_bag where user_id = p_user and loot_id = any (p_herb_ids) and qty > 0 order by qty desc for update loop
      exit when need <= 0;
      update loot_bag set qty = qty - least(r.qty, need) where user_id = p_user and loot_id = r.loot_id;
      need := need - least(r.qty, need);
    end loop;
  end if;
  return true;
end $$;
revoke all on function public.spend_loot(uuid, jsonb, integer, text[]) from public, anon, authenticated;
grant execute on function public.spend_loot(uuid, jsonb, integer, text[]) to service_role;
