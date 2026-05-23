create table if not exists public.driver_location_place_cache (
	latitude_key numeric(9, 4) not null,
	longitude_key numeric(9, 4) not null,
	place_name text not null,
	provider text not null default 'nominatim',
	resolved_at timestamptz not null default now(),
	expires_at timestamptz not null default (now() + interval '30 days'),
	primary key (latitude_key, longitude_key),
	constraint driver_location_place_cache_place_name_present
		check (length(btrim(place_name)) > 0),
	constraint driver_location_place_cache_expiry_after_resolution
		check (expires_at > resolved_at)
);

alter table public.driver_location_place_cache enable row level security;

revoke all on table public.driver_location_place_cache
	from public, anon, authenticated;

create index if not exists driver_location_place_cache_expires_at_idx
	on public.driver_location_place_cache (expires_at);

comment on table public.driver_location_place_cache is
	'Server-owned reverse-geocode cache for customer-visible driver live pings.';
