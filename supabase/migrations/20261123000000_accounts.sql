-- ElderMaps, step 1: who a person is and what they hold.
--   credits        the balance (1 credit = 100 septims, the in-game money)
--   profiles       the character name and the character type (shown on the leaderboard and on "Discovered by")
--   user_home      the home: its address, the four-digit hearth number (the password), the metro and the district style it stands in
--   found_places   the places a person has discovered (kept so it follows them to any device)
--   discoveries    the server's own record of a discovery (XP and later the vacation holds trust this, never the phone)
--   vault_logins   wrong tries at the hearth number: five wrong tries lock it until it is reset by an emailed link
-- Every table has row-level security: a person reads (and where it is safe, writes) only their own rows. Money and discoveries are written by server functions only.

create table if not exists public.credits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);
alter table public.credits enable row level security;
drop policy if exists "own credits" on public.credits;
create policy "own credits" on public.credits for select to authenticated using (user_id = auth.uid());

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  character_name text check (character_name is null or char_length(character_name) between 2 and 20),
  character_type text check (character_type is null or character_type in ('frostkin', 'highmarcher', 'sunblade', 'maned', 'scalekin', 'emberkin', 'gilded', 'greenkin', 'tuskborn', 'aurelian')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_name_unique on public.profiles (lower(character_name)) where character_name is not null;
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists "make own profile" on public.profiles;
create policy "make own profile" on public.profiles for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "change own profile" on public.profiles;
create policy "change own profile" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.user_home (
  user_id uuid primary key references auth.users (id) on delete cascade,
  place_id text,
  name text,
  address text,
  lat double precision,
  lng double precision,
  skipped boolean not null default false,
  -- the four-digit hearth number: one home each, unique across everyone
  hearth_number integer unique check (hearth_number is null or hearth_number between 0 and 9999),
  home_metro text,
  -- the district of the metro the home stands in, which decides the style its picture is made in
  district text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_home enable row level security;
drop policy if exists "own home" on public.user_home;
create policy "own home" on public.user_home for select to authenticated using (user_id = auth.uid());
drop policy if exists "make own home" on public.user_home;
create policy "make own home" on public.user_home for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "change own home" on public.user_home;
create policy "change own home" on public.user_home for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.found_places (
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id text not null,
  name text not null,
  old_name text,
  metro_id text,
  city text,
  state text,
  country text,
  lat double precision not null,
  lng double precision not null,
  worth integer,
  found_at timestamptz not null default now(),
  primary key (user_id, place_id)
);
alter table public.found_places enable row level security;
drop policy if exists "own finds" on public.found_places;
create policy "own finds" on public.found_places for select to authenticated using (user_id = auth.uid());
drop policy if exists "record own finds" on public.found_places;
create policy "record own finds" on public.found_places for insert to authenticated with check (user_id = auth.uid());

create table if not exists public.discoveries (
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id text not null,
  points integer not null default 10,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);
alter table public.discoveries enable row level security;
drop policy if exists "own discoveries" on public.discoveries;
create policy "own discoveries" on public.discoveries for select to authenticated using (user_id = auth.uid());

-- wrong tries at the hearth number
create table if not exists public.vault_logins (
  email text primary key,
  fails integer not null default 0,
  locked boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.vault_logins enable row level security; -- no policies: only the server's own key reaches it

-- Counts one try BEFORE it is checked (so a burst of parallel guesses cannot sneak past the limit). allowed is false when the vault is already locked, or this try makes it so.
create or replace function public.vault_login_try(p_email text, p_max integer)
returns table (allowed boolean, fails integer)
language plpgsql security definer set search_path = public as $$
declare cur public.vault_logins;
begin
  insert into vault_logins (email, fails, locked) values (lower(p_email), 0, false) on conflict (email) do nothing;
  select * into cur from vault_logins where email = lower(p_email) for update;
  if cur.locked then return query select false, cur.fails; return; end if;
  update vault_logins set fails = vault_logins.fails + 1, locked = (vault_logins.fails + 1 >= p_max), updated_at = now() where email = lower(p_email) returning * into cur;
  -- this try is still checked (the fifth can be the right one: success resets the count); a wrong fifth leaves the vault locked for the next try
  return query select true, cur.fails;
end $$;

create or replace function public.vault_login_reset(p_email text) returns void
language sql security definer set search_path = public as $$
  update vault_logins set fails = 0, locked = false, updated_at = now() where email = lower(p_email);
$$;

create or replace function public.user_id_by_email(p_email text) returns uuid
language sql security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke all on function public.vault_login_try(text, integer) from public, anon, authenticated;
revoke all on function public.vault_login_reset(text) from public, anon, authenticated;
revoke all on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.vault_login_try(text, integer) to service_role;
grant execute on function public.vault_login_reset(text) to service_role;
grant execute on function public.user_id_by_email(text) to service_role;
