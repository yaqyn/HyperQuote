alter table public.quote_requests
	add column if not exists delivery_location_name text,
	add column if not exists delivery_location_name_ar text;

update public.quote_requests
set
	delivery_location_name = coalesce(nullif(trim(delivery_location_name), ''), delivery_address_text),
	delivery_location_name_ar = coalesce(nullif(trim(delivery_location_name_ar), ''), delivery_address_text)
where delivery_latitude is not null and delivery_longitude is not null;

alter table public.quote_requests
	drop constraint if exists quote_requests_delivery_location_names,
	add constraint quote_requests_delivery_location_names check (
		delivery_latitude is null
		or (
			nullif(trim(delivery_location_name), '') is not null
			and nullif(trim(delivery_location_name_ar), '') is not null
		)
	);

comment on column public.quote_requests.delivery_location_name is
	'Detailed English human-readable name derived from the exact map-selected point.';
comment on column public.quote_requests.delivery_location_name_ar is
	'Detailed Arabic human-readable name derived from the exact map-selected point.';

create or replace function app_private.sync_quote_delivery_location_names()
returns trigger
language plpgsql
set search_path = public, app_private
as $$
begin
	if new.delivery_latitude is not null and new.delivery_longitude is not null then
		if nullif(trim(new.delivery_location_name), '') is null
			or (tg_op = 'UPDATE'
				and new.delivery_address_text is distinct from old.delivery_address_text
				and new.delivery_location_name is not distinct from old.delivery_location_name) then
			new.delivery_location_name := new.delivery_address_text;
		end if;
		if nullif(trim(new.delivery_location_name_ar), '') is null
			or (tg_op = 'UPDATE'
				and new.delivery_address_text is distinct from old.delivery_address_text
				and new.delivery_location_name_ar is not distinct from old.delivery_location_name_ar) then
			new.delivery_location_name_ar := new.delivery_address_text;
		end if;
	end if;
	return new;
end;
$$;

drop trigger if exists quote_requests_sync_delivery_location_names
	on public.quote_requests;
create trigger quote_requests_sync_delivery_location_names
	before insert or update of delivery_address_text, delivery_latitude,
		delivery_longitude, delivery_location_name, delivery_location_name_ar
	on public.quote_requests
	for each row execute function app_private.sync_quote_delivery_location_names();
