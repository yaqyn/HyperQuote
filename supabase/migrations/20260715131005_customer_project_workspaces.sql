alter type public.audit_event_type add value if not exists 'project_created';
alter type public.audit_event_type add value if not exists 'project_assignment_changed';

alter table public.projects
	add column if not exists last_activity_at timestamptz not null default now();

alter table public.customer_addresses
	add column if not exists source text not null default 'manual',
	add column if not exists location_name text,
	add column if not exists location_name_ar text,
	add column if not exists last_used_at timestamptz,
	add column if not exists use_count integer not null default 0;

alter table public.customer_addresses
	drop constraint if exists customer_addresses_source_check,
	add constraint customer_addresses_source_check
		check (source in ('manual', 'quote_submission')),
	drop constraint if exists customer_addresses_use_count_check,
	add constraint customer_addresses_use_count_check check (use_count >= 0),
	drop constraint if exists customer_addresses_recent_location_check,
	add constraint customer_addresses_recent_location_check check (
		source <> 'quote_submission'
		or (
			latitude between 21.7 and 31.8
			and longitude between 24.6 and 36.9
			and nullif(trim(location_name), '') is not null
			and nullif(trim(location_name_ar), '') is not null
			and last_used_at is not null
			and use_count > 0
		)
	);

select set_config('app.quote_map_location_write', 'true', true);

with latest_request as (
	select distinct on (qr.delivery_address_id)
		qr.delivery_address_id, qr.delivery_location_name,
		qr.delivery_location_name_ar, qr.delivery_address_text,
		qr.submitted_at, qr.updated_at, qr.created_at
	from public.quote_requests qr
	where qr.delivery_address_id is not null
	order by qr.delivery_address_id,
		coalesce(qr.submitted_at, qr.updated_at, qr.created_at) desc
)
update public.customer_addresses address
set
	source = 'quote_submission',
	location_name = coalesce(nullif(trim(request.delivery_location_name), ''), nullif(trim(request.delivery_address_text), ''), address.street),
	location_name_ar = coalesce(nullif(trim(request.delivery_location_name_ar), ''), nullif(trim(request.delivery_location_name), ''), nullif(trim(request.delivery_address_text), ''), address.street),
	last_used_at = coalesce(request.submitted_at, request.updated_at, request.created_at),
	use_count = greatest(address.use_count, 1)
from latest_request request
where address.label = 'Sales quote site'
	and request.delivery_address_id = address.id
	and address.latitude is not null
	and address.longitude is not null;

select set_config('app.quote_map_location_write', 'false', true);

create index if not exists projects_customer_activity_idx
	on public.projects (customer_id, archived, last_activity_at desc);

create index if not exists customer_addresses_recent_location_idx
	on public.customer_addresses (customer_id, last_used_at desc)
	where source = 'quote_submission';

comment on column public.projects.last_activity_at is
	'The latest draft, quote request, order, or assignment activity inside the customer project.';
comment on column public.customer_addresses.source is
	'Distinguishes editable profile addresses from immutable map-derived quote submission locations.';
comment on column public.customer_addresses.location_name is
	'English human-readable location derived from the exact map point.';
comment on column public.customer_addresses.location_name_ar is
	'Arabic human-readable location derived from the exact map point.';
comment on column public.customer_addresses.last_used_at is
	'Last successful quote submission using this exact map point.';
comment on column public.customer_addresses.use_count is
	'Number of successful quote submissions using this exact map point.';
