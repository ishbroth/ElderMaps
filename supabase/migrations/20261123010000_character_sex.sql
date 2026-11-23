-- The character's sex (a man or a woman), chosen with the character type: it decides which portrait is shown.
alter table public.profiles add column if not exists character_sex text check (character_sex is null or character_sex in ('m', 'f'));
