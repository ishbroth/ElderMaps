-- ElderMaps, step 11: how many times the home hearth has been set. The gentle dragon of the home city lasts for the first three.
alter table public.user_home add column if not exists home_changes integer not null default 0;
