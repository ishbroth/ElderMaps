-- ElderMaps, step 2: glimpses (the paid picture of a place, made once and shared with everyone who unlocks it after).
--   renders        one finished picture per place (the first person to pay makes it happen, and is remembered for the "Discovered by" line)
--   unlocks        what each person has paid for (their gallery)
--   bonus_given    the welcome gift, once per account
-- Money is in credits (1 credit = 100 septims). Only the server's own key touches renders; a person reads their own unlocks.

create table if not exists public.renders (
  place_id text primary key,
  place_name text,
  kit text,
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  storage_path text,
  -- where the photograph it was made from came from (shown under the picture; a free photo is credited to its photographer)
  credit jsonb,
  before_url text,
  lat double precision,
  lng double precision,
  discovered_by uuid references auth.users (id) on delete set null,
  started_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.renders enable row level security; -- no policies: only the server's own key reaches it

create table if not exists public.unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id text not null,
  cost integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);
alter table public.unlocks enable row level security;
drop policy if exists "own unlocks" on public.unlocks;
create policy "own unlocks" on public.unlocks for select to authenticated using (user_id = auth.uid());

-- Pays for a place: 'already' (nothing charged), 'spent', or 'no_credits'. One atomic step, so two quick taps cannot be charged twice or spend what is not there.
create or replace function public.unlock_place(p_user uuid, p_place text, p_cost integer) returns text
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from unlocks where user_id = p_user and place_id = p_place) then return 'already'; end if;
  update credits set balance = balance - p_cost, updated_at = now() where user_id = p_user and balance >= p_cost;
  if not found then return 'no_credits'; end if;
  insert into unlocks (user_id, place_id, cost) values (p_user, p_place, p_cost) on conflict do nothing;
  return 'spent';
end $$;

-- The picture could not be made: the unlock is taken back and the credits returned.
create or replace function public.refund_unlock(p_user uuid, p_place text) returns void
language plpgsql security definer set search_path = public as $$
declare paid integer;
begin
  delete from unlocks where user_id = p_user and place_id = p_place returning cost into paid;
  if paid is null then return; end if;
  insert into credits (user_id, balance) values (p_user, paid) on conflict (user_id) do update set balance = credits.balance + paid, updated_at = now();
end $$;

revoke all on function public.unlock_place(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.refund_unlock(uuid, text) from public, anon, authenticated;
grant execute on function public.unlock_place(uuid, text, integer) to service_role;
grant execute on function public.refund_unlock(uuid, text) to service_role;

-- the welcome gift: 500 septims (5 credits), once, when the home is first saved
create table if not exists public.bonus_given (user_id uuid primary key references auth.users (id) on delete cascade, given_at timestamptz not null default now());
alter table public.bonus_given enable row level security;

create or replace function public.give_welcome_bonus() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into bonus_given (user_id) values (new.user_id) on conflict do nothing;
  if found then
    insert into credits (user_id, balance) values (new.user_id, 5) on conflict (user_id) do update set balance = credits.balance + 5, updated_at = now();
  end if;
  return new;
end $$;
drop trigger if exists welcome_bonus on public.user_home;
create trigger welcome_bonus after insert on public.user_home for each row execute function public.give_welcome_bonus();

-- the pictures are kept in a private bucket and handed out as short-lived links
insert into storage.buckets (id, name, public) values ('renders', 'renders', false) on conflict (id) do nothing;
