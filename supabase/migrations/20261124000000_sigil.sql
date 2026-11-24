-- ElderMaps, step 8: the sigil. Each person picks a city's shield at sign-up (one of the crest cities); it is shown beside their name and drawn into their home's picture.
alter table public.profiles add column if not exists sigil_city text;
alter table public.profiles add column if not exists sigil_iso text;
