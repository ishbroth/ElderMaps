-- ElderMaps, step 9: which water feature a picture was given (waterwheel, bridge, rapids, sunken ruins, marsh, plain view), so the pictures made near each other do not repeat the same feature.
alter table public.renders add column if not exists water_flavour text;
