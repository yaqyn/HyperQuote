do $$
begin
	create type public.delivery_period as enum ('AM', 'PM');
exception
	when duplicate_object then null;
end $$;

alter table public.quote_requests
	add column if not exists delivery_hour smallint,
	add column if not exists delivery_period public.delivery_period;

alter table public.quote_requests
	drop constraint if exists quote_requests_delivery_time_check,
	add constraint quote_requests_delivery_time_check
	check (
		(delivery_hour is null and delivery_period is null)
		or (
			delivery_hour between 1 and 12
			and delivery_period is not null
		)
	);

create table if not exists public.quote_request_locations (
	id uuid primary key default gen_random_uuid(),
	quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
	client_id text,
	sort_order integer not null default 0,
	address_id uuid references public.customer_addresses(id) on delete set null,
	delivery_date date,
	delivery_hour smallint,
	delivery_period public.delivery_period,
	notes text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint quote_request_locations_delivery_time_check check (
		(delivery_hour is null and delivery_period is null)
		or (
			delivery_hour between 1 and 12
			and delivery_period is not null
		)
	),
	constraint quote_request_locations_id_quote_request_id_key unique (id, quote_request_id),
	constraint quote_request_locations_quote_sort_key unique (quote_request_id, sort_order)
);

create table if not exists public.quote_request_associates (
	id uuid primary key default gen_random_uuid(),
	quote_request_id uuid not null references public.quote_requests(id) on delete cascade,
	sort_order integer not null default 0,
	name text not null,
	country_code text not null,
	number text not null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint quote_request_associates_name_check check (btrim(name) <> ''),
	constraint quote_request_associates_country_code_check check (country_code ~ '^\+[1-9][0-9]{0,3}$'),
	constraint quote_request_associates_number_check check (btrim(number) <> '')
);

create table if not exists public.order_delivery_locations (
	id uuid primary key default gen_random_uuid(),
	order_id uuid not null references public.orders(id) on delete cascade,
	quote_request_location_id uuid not null references public.quote_request_locations(id) on delete restrict,
	address_id uuid references public.customer_addresses(id) on delete set null,
	sort_order integer not null default 0,
	delivery_date date,
	delivery_hour smallint,
	delivery_period public.delivery_period,
	status text not null default 'pending',
	completed_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint order_delivery_locations_delivery_time_check check (
		(delivery_hour is null and delivery_period is null)
		or (
			delivery_hour between 1 and 12
			and delivery_period is not null
		)
	),
	constraint order_delivery_locations_status_check check (
		status in ('pending', 'loading', 'out_for_delivery', 'completed', 'rejected')
	),
	constraint order_delivery_locations_order_location_key unique (order_id, quote_request_location_id)
);

alter table public.quote_request_items
	add column if not exists quote_request_location_id uuid;

alter table public.inventory_reservations
	add column if not exists quote_request_item_id uuid references public.quote_request_items(id) on delete set null,
	add column if not exists quote_request_location_id uuid references public.quote_request_locations(id) on delete set null;

alter table public.deliveries
	add column if not exists order_delivery_location_id uuid references public.order_delivery_locations(id) on delete set null;

create index if not exists quote_request_locations_quote_request_idx
	on public.quote_request_locations (quote_request_id, sort_order);
create index if not exists quote_request_associates_quote_request_idx
	on public.quote_request_associates (quote_request_id, sort_order);
create index if not exists order_delivery_locations_order_idx
	on public.order_delivery_locations (order_id, sort_order);
create index if not exists quote_request_items_location_idx
	on public.quote_request_items (quote_request_location_id, sort_order);
create index if not exists inventory_reservations_order_line_idx
	on public.inventory_reservations (order_id, quote_request_item_id, status)
	where quote_request_item_id is not null;
create index if not exists inventory_reservations_order_location_idx
	on public.inventory_reservations (order_id, quote_request_location_id, status)
	where quote_request_location_id is not null;
create index if not exists deliveries_order_location_idx
	on public.deliveries (order_delivery_location_id, status)
	where order_delivery_location_id is not null;

alter table public.inventory_reservations
	drop constraint if exists inventory_reservations_order_id_product_id_status_key;

create unique index if not exists inventory_reservations_order_line_status_key
	on public.inventory_reservations (order_id, quote_request_item_id, status)
	where quote_request_item_id is not null;

alter table public.quote_request_locations enable row level security;
alter table public.quote_request_associates enable row level security;
alter table public.order_delivery_locations enable row level security;

drop policy if exists service_role_all on public.quote_request_locations;
create policy service_role_all
	on public.quote_request_locations for all
	to service_role
	using (true)
	with check (true);

drop policy if exists service_role_all on public.quote_request_associates;
create policy service_role_all
	on public.quote_request_associates for all
	to service_role
	using (true)
	with check (true);

drop policy if exists service_role_all on public.order_delivery_locations;
create policy service_role_all
	on public.order_delivery_locations for all
	to service_role
	using (true)
	with check (true);

drop policy if exists quote_request_locations_follow_parent
	on public.quote_request_locations;
create policy quote_request_locations_follow_parent
	on public.quote_request_locations for all
	to authenticated
	using (exists (
		select 1
		from public.quote_requests qr
		where qr.id = quote_request_id
		  and (
			qr.customer_id = public.current_customer_id()
			or public.can_access_panel('sales')
			or public.can_access_panel('finance')
			or public.can_access_panel('inventory')
			or public.can_access_panel('warehouse')
			or public.can_access_panel('dispatch')
			or public.is_employee_with_role('ceo')
		  )
	))
	with check (exists (
		select 1
		from public.quote_requests qr
		where qr.id = quote_request_id
		  and (
			qr.customer_id = public.current_customer_id()
			or public.can_access_panel('sales', true)
			or public.can_access_panel('inventory', true)
			or public.can_access_panel('warehouse', true)
			or public.can_access_panel('dispatch', true)
		  )
	));

drop policy if exists quote_request_associates_follow_parent
	on public.quote_request_associates;
create policy quote_request_associates_follow_parent
	on public.quote_request_associates for all
	to authenticated
	using (exists (
		select 1
		from public.quote_requests qr
		where qr.id = quote_request_id
		  and (
			qr.customer_id = public.current_customer_id()
			or public.can_access_panel('sales')
			or public.can_access_panel('finance')
			or public.can_access_panel('inventory')
			or public.can_access_panel('warehouse')
			or public.can_access_panel('dispatch')
			or public.is_employee_with_role('ceo')
		  )
	))
	with check (exists (
		select 1
		from public.quote_requests qr
		where qr.id = quote_request_id
		  and (
			qr.customer_id = public.current_customer_id()
			or public.can_access_panel('sales', true)
		  )
	));

drop policy if exists order_delivery_locations_follow_order
	on public.order_delivery_locations;
create policy order_delivery_locations_follow_order
	on public.order_delivery_locations for all
	to authenticated
	using (exists (
		select 1
		from public.orders o
		where o.id = order_id
		  and (
			o.customer_id = public.current_customer_id()
			or public.can_access_panel('sales')
			or public.can_access_panel('finance')
			or public.can_access_panel('inventory')
			or public.can_access_panel('warehouse')
			or public.can_access_panel('dispatch')
			or public.is_employee_with_role('ceo')
		  )
	))
	with check (exists (
		select 1
		from public.orders o
		where o.id = order_id
		  and (
			public.can_access_panel('sales', true)
			or public.can_access_panel('inventory', true)
			or public.can_access_panel('warehouse', true)
			or public.can_access_panel('dispatch', true)
		  )
	));

revoke all on table public.quote_request_locations from public, anon, authenticated;
revoke all on table public.quote_request_associates from public, anon, authenticated;
revoke all on table public.order_delivery_locations from public, anon, authenticated;
grant all on table public.quote_request_locations to service_role;
grant all on table public.quote_request_associates to service_role;
grant all on table public.order_delivery_locations to service_role;

insert into public.quote_request_locations (
	quote_request_id,
	client_id,
	sort_order,
	address_id,
	delivery_date,
	delivery_hour,
	delivery_period
)
select
	qr.id,
	'legacy-default',
	0,
	qr.delivery_address_id,
	qr.delivery_date,
	qr.delivery_hour,
	qr.delivery_period
from public.quote_requests qr
where not exists (
	select 1
	from public.quote_request_locations qrl
	where qrl.quote_request_id = qr.id
);

update public.quote_request_items qri
set quote_request_location_id = qrl.id
from public.quote_request_locations qrl
where qri.quote_request_location_id is null
  and qrl.quote_request_id = qri.quote_request_id
  and qrl.sort_order = (
	select min(qrl2.sort_order)
	from public.quote_request_locations qrl2
	where qrl2.quote_request_id = qri.quote_request_id
);

alter table public.quote_request_items
	alter column quote_request_location_id set not null;

alter table public.quote_request_items
	drop constraint if exists quote_request_items_location_same_request_fkey,
	add constraint quote_request_items_location_same_request_fkey
	foreign key (quote_request_location_id, quote_request_id)
	references public.quote_request_locations(id, quote_request_id)
	on delete restrict;

insert into public.order_delivery_locations (
	order_id,
	quote_request_location_id,
	address_id,
	sort_order,
	delivery_date,
	delivery_hour,
	delivery_period
)
select
	o.id,
	qrl.id,
	qrl.address_id,
	qrl.sort_order,
	qrl.delivery_date,
	qrl.delivery_hour,
	qrl.delivery_period
from public.orders o
join public.quote_request_locations qrl
	on qrl.quote_request_id = o.quote_request_id
where o.quote_request_id is not null
on conflict (order_id, quote_request_location_id) do update
set address_id = excluded.address_id,
	sort_order = excluded.sort_order,
	delivery_date = excluded.delivery_date,
	delivery_hour = excluded.delivery_hour,
	delivery_period = excluded.delivery_period,
	updated_at = now();

update public.deliveries d
set order_delivery_location_id = odl.id
from public.order_delivery_locations odl
where d.order_delivery_location_id is null
  and odl.order_id = d.order_id
  and odl.sort_order = (
	select min(odl2.sort_order)
	from public.order_delivery_locations odl2
	where odl2.order_id = d.order_id
);

create or replace function app_private.ensure_quote_request_default_location(
	p_quote_request_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	target_request public.quote_requests%rowtype;
	location_id uuid;
begin
	select id into location_id
	from public.quote_request_locations
	where quote_request_id = p_quote_request_id
	order by sort_order, created_at, id
	limit 1;

	if location_id is not null then
		return location_id;
	end if;

	select * into target_request
	from public.quote_requests
	where id = p_quote_request_id;

	if target_request.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	insert into public.quote_request_locations (
		quote_request_id,
		client_id,
		sort_order,
		address_id,
		delivery_date,
		delivery_hour,
		delivery_period
	)
	values (
		target_request.id,
		'legacy-default',
		0,
		target_request.delivery_address_id,
		target_request.delivery_date,
		target_request.delivery_hour,
		target_request.delivery_period
	)
	on conflict (quote_request_id, sort_order) do update
	set address_id = excluded.address_id,
		delivery_date = excluded.delivery_date,
		delivery_hour = excluded.delivery_hour,
		delivery_period = excluded.delivery_period,
		updated_at = now()
	returning id into location_id;

	return location_id;
end;
$$;

create or replace function app_private.quote_request_items_set_default_location()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if new.quote_request_location_id is null then
		new.quote_request_location_id :=
			app_private.ensure_quote_request_default_location(new.quote_request_id);
	end if;

	return new;
end;
$$;

drop trigger if exists quote_request_items_set_default_location
	on public.quote_request_items;
create trigger quote_request_items_set_default_location
	before insert or update of quote_request_id, quote_request_location_id
	on public.quote_request_items
	for each row
	execute function app_private.quote_request_items_set_default_location();

create or replace function app_private.sync_quote_request_location_summary()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	target_quote_request_id uuid;
	first_location public.quote_request_locations%rowtype;
begin
	target_quote_request_id := coalesce(new.quote_request_id, old.quote_request_id);

	select * into first_location
	from public.quote_request_locations
	where quote_request_id = target_quote_request_id
	order by sort_order, created_at, id
	limit 1;

	if first_location.id is null then
		return null;
	end if;

	update public.quote_requests qr
	set delivery_address_id = first_location.address_id,
		delivery_date = first_location.delivery_date,
		delivery_hour = first_location.delivery_hour,
		delivery_period = first_location.delivery_period
	where qr.id = target_quote_request_id
	  and (
		qr.delivery_address_id is distinct from first_location.address_id
		or qr.delivery_date is distinct from first_location.delivery_date
		or qr.delivery_hour is distinct from first_location.delivery_hour
		or qr.delivery_period is distinct from first_location.delivery_period
	  );

	return null;
end;
$$;

drop trigger if exists quote_request_locations_sync_summary
	on public.quote_request_locations;
create trigger quote_request_locations_sync_summary
	after insert or update or delete
	on public.quote_request_locations
	for each row
	execute function app_private.sync_quote_request_location_summary();

create or replace function app_private.sync_quote_request_default_location()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	location_id uuid;
begin
	location_id := app_private.ensure_quote_request_default_location(new.id);

	update public.quote_request_locations qrl
	set address_id = new.delivery_address_id,
		delivery_date = new.delivery_date,
		delivery_hour = new.delivery_hour,
		delivery_period = new.delivery_period,
		updated_at = now()
	where qrl.id = location_id
	  and (
		qrl.address_id is distinct from new.delivery_address_id
		or qrl.delivery_date is distinct from new.delivery_date
		or qrl.delivery_hour is distinct from new.delivery_hour
		or qrl.delivery_period is distinct from new.delivery_period
	  );

	return new;
end;
$$;

drop trigger if exists quote_requests_sync_default_location
	on public.quote_requests;
create trigger quote_requests_sync_default_location
	after insert or update of delivery_address_id, delivery_date, delivery_hour, delivery_period
	on public.quote_requests
	for each row
	execute function app_private.sync_quote_request_default_location();

create or replace function app_private.ensure_order_delivery_locations(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	target_order public.orders%rowtype;
	location_count integer := 0;
begin
	select * into target_order
	from public.orders
	where id = p_order_id;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.quote_request_id is null then
		return 0;
	end if;

	perform app_private.ensure_quote_request_default_location(target_order.quote_request_id);

	insert into public.order_delivery_locations (
		order_id,
		quote_request_location_id,
		address_id,
		sort_order,
		delivery_date,
		delivery_hour,
		delivery_period
	)
	select
		target_order.id,
		qrl.id,
		qrl.address_id,
		qrl.sort_order,
		qrl.delivery_date,
		qrl.delivery_hour,
		qrl.delivery_period
	from public.quote_request_locations qrl
	where qrl.quote_request_id = target_order.quote_request_id
	on conflict (order_id, quote_request_location_id) do update
	set address_id = excluded.address_id,
		sort_order = excluded.sort_order,
		delivery_date = excluded.delivery_date,
		delivery_hour = excluded.delivery_hour,
		delivery_period = excluded.delivery_period,
		updated_at = now();

	get diagnostics location_count = row_count;
	return location_count;
end;
$$;

create or replace function app_private.orders_sync_delivery_locations()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.ensure_order_delivery_locations(new.id);
	return new;
end;
$$;

drop trigger if exists orders_sync_delivery_locations
	on public.orders;
create trigger orders_sync_delivery_locations
	after insert or update of quote_request_id
	on public.orders
	for each row
	execute function app_private.orders_sync_delivery_locations();

select app_private.ensure_order_delivery_locations(id)
from public.orders
where quote_request_id is not null;

create or replace function app_private.loading_item_quote_request_item_id(p_item jsonb)
returns uuid
language plpgsql
immutable
set search_path = public, app_private
as $$
declare
	raw_value text;
begin
	if jsonb_typeof(p_item) <> 'object' then
		return null;
	end if;

	raw_value := coalesce(
		p_item->>'quoteRequestItemId',
		p_item->>'quote_request_item_id'
	);

	if raw_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
		return raw_value::uuid;
	end if;

	return null;
end;
$$;

create or replace function app_private.loading_item_slug(p_item jsonb)
returns text
language sql
immutable
set search_path = public, app_private
as $$
	select case jsonb_typeof(p_item)
		when 'string' then p_item #>> '{}'
		when 'object' then p_item->>'productSlug'
		else null
	end;
$$;

create or replace function app_private.loading_item_quantity(
	p_item jsonb,
	p_order_quantity numeric
)
returns numeric
language sql
immutable
set search_path = public, app_private
as $$
	select case
		when jsonb_typeof(p_item) = 'string' then p_order_quantity
		when jsonb_typeof(p_item) = 'object'
			and jsonb_typeof(p_item->'quantity') = 'number'
			then greatest(0, (p_item->>'quantity')::numeric)
		else 0
	end;
$$;

create or replace function app_private.loading_line_total_quantity(
	p_loading_task_id uuid,
	p_quote_request_item_id uuid,
	p_order_quantity numeric
)
returns numeric
language sql
stable
set search_path = public, app_private
as $$
	select coalesce(sum(app_private.loading_item_quantity(item, p_order_quantity)), 0)
	from public.loading_task_drivers ltd
	cross join lateral jsonb_array_elements(coalesce(ltd.assigned_items, '[]'::jsonb)) as entries(item)
	where ltd.loading_task_id = p_loading_task_id
	  and app_private.loading_item_quote_request_item_id(item) = p_quote_request_item_id;
$$;

create or replace function app_private.loading_assignment_has_quantity(
	p_assigned_items jsonb
)
returns boolean
language sql
immutable
set search_path = public, app_private
as $$
	select exists (
		select 1
		from jsonb_array_elements(coalesce(p_assigned_items, '[]'::jsonb)) as entries(item)
		where case jsonb_typeof(item)
			when 'string' then true
			when 'object' then jsonb_typeof(item->'quantity') = 'number'
				and (item->>'quantity')::numeric > 0
			else false
		end
	);
$$;

create or replace function app_private.consume_order_location_reservations(
	p_order_id uuid,
	p_quote_request_location_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	line record;
begin
	for line in
		select product_id, sum(quantity) as quantity
		from public.inventory_reservations
		where order_id = p_order_id
		  and quote_request_location_id = p_quote_request_location_id
		  and status = 'reserved'
		group by product_id
	loop
		update public.inventory_stock
		set reserved_quantity = reserved_quantity - line.quantity,
			on_hand_quantity = on_hand_quantity - line.quantity
		where product_id = line.product_id
		  and reserved_quantity >= line.quantity
		  and on_hand_quantity >= line.quantity;

		if not found then
			raise exception 'reserved_stock_consume_failed_for_product_%', line.product_id using errcode = '23514';
		end if;
	end loop;

	update public.inventory_reservations
	set status = 'consumed'
	where order_id = p_order_id
	  and quote_request_location_id = p_quote_request_location_id
	  and status = 'reserved';
end;
$$;

create or replace function app_private.consume_order_reservations(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	line record;
begin
	for line in
		select product_id, sum(quantity) as quantity
		from public.inventory_reservations
		where order_id = p_order_id
		  and status = 'reserved'
		group by product_id
	loop
		update public.inventory_stock
		set reserved_quantity = reserved_quantity - line.quantity,
			on_hand_quantity = on_hand_quantity - line.quantity
		where product_id = line.product_id
		  and reserved_quantity >= line.quantity
		  and on_hand_quantity >= line.quantity;

		if not found then
			raise exception 'reserved_stock_consume_failed_for_product_%', line.product_id using errcode = '23514';
		end if;
	end loop;

	update public.inventory_reservations
	set status = 'consumed'
	where order_id = p_order_id
	  and status = 'reserved';
end;
$$;

create or replace function app_private.complete_order_delivery_location_for_delivery(
	p_delivery_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	target_delivery public.deliveries%rowtype;
	target_location public.order_delivery_locations%rowtype;
begin
	select * into target_delivery
	from public.deliveries
	where id = p_delivery_id;

	if target_delivery.id is null or target_delivery.order_delivery_location_id is null then
		return;
	end if;

	select * into target_location
	from public.order_delivery_locations
	where id = target_delivery.order_delivery_location_id
	for update;

	if target_location.id is null then
		return;
	end if;

	if target_location.status = 'completed' then
		return;
	end if;

	if exists (
		select 1
		from public.deliveries d
		where d.order_delivery_location_id = target_location.id
		  and d.status in ('assigned', 'accepted', 'in_transit', 'arrived')
	) then
		return;
	end if;

	update public.order_delivery_locations
	set status = 'completed',
		completed_at = coalesce(completed_at, now()),
		updated_at = now()
	where id = target_location.id;

	perform app_private.consume_order_location_reservations(
		target_delivery.order_id,
		target_location.quote_request_location_id
	);
end;
$$;

drop function if exists app_private.finalize_delivered_order_if_ready(uuid, jsonb);

create or replace function app_private.finalize_delivered_order_if_ready(
	p_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	target_order public.orders%rowtype;
	open_delivery_count integer;
	incomplete_location_count integer;
	completed_location_count integer;
	completed_delivery_count integer;
begin
	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status = 'delivered' then
		return true;
	end if;

	select count(*) into open_delivery_count
	from public.deliveries
	where order_id = p_order_id
	  and status in ('assigned', 'accepted', 'in_transit', 'arrived');

	if open_delivery_count > 0 then
		return false;
	end if;

	select count(*) into completed_delivery_count
	from public.deliveries
	where order_id = p_order_id
	  and status = 'completed';

	if completed_delivery_count = 0 then
		return false;
	end if;

	select
		count(*) filter (where status <> 'completed'),
		count(*) filter (where status = 'completed')
	into incomplete_location_count, completed_location_count
	from public.order_delivery_locations
	where order_id = p_order_id;

	if completed_location_count > 0 and incomplete_location_count > 0 then
		return false;
	end if;

	perform app_private.consume_order_reservations(p_order_id);

	update public.orders
	set status = 'delivered',
		delivered_at = coalesce(delivered_at, now())
	where id = p_order_id;

	return true;
end;
$$;

create or replace function app_private.finalize_delivered_order_if_ready(
	p_order_id uuid,
	p_proof jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform p_proof;
	return app_private.finalize_delivered_order_if_ready(p_order_id);
end;
$$;

create or replace function public.reserve_order_stock(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_order public.orders%rowtype;
	line record;
begin
	employee_id := public.require_panel('inventory', true);
	perform app_private.allow_workflow_state_change();

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'confirmed_for_inventory' then
		raise exception 'invalid_inventory_transition_%', target_order.status using errcode = '23514';
	end if;

	if not exists (
		select 1
		from public.customer_payments cp
		where cp.order_id = p_order_id
		  and cp.status = 'recorded'
	) then
		raise exception 'customer_payment_required_before_inventory' using errcode = '23514';
	end if;

	perform app_private.ensure_order_delivery_locations(p_order_id);

	for line in
		select
			qi.id as quote_request_item_id,
			qi.quote_request_location_id,
			qi.product_id,
			qi.quantity
		from public.quote_request_items qi
		where qi.quote_request_id = target_order.quote_request_id
		  and qi.product_id is not null
		order by qi.sort_order, qi.id
	loop
		update public.inventory_stock
		set reserved_quantity = reserved_quantity + line.quantity
		where product_id = line.product_id
		  and available_quantity >= line.quantity;

		if not found then
			raise exception 'insufficient_stock_for_product_%', line.product_id using errcode = '23514';
		end if;

		insert into public.inventory_reservations (
			order_id,
			product_id,
			quote_request_item_id,
			quote_request_location_id,
			quantity,
			created_by_employee_id
		)
		values (
			p_order_id,
			line.product_id,
			line.quote_request_item_id,
			line.quote_request_location_id,
			line.quantity,
			employee_id
		)
		on conflict (order_id, quote_request_item_id, status)
		where quote_request_item_id is not null
		do update
		set quantity = public.inventory_reservations.quantity + excluded.quantity;
	end loop;

	update public.orders
	set status = 'inventory_reserved', reserved_at = now()
	where id = p_order_id
	returning * into target_order;

	insert into public.loading_tasks (order_id)
	values (p_order_id)
	on conflict do nothing;

	perform public.log_activity(
		'order',
		p_order_id,
		'order_stock_reserved',
		jsonb_build_object(
			'employee_id', employee_id,
			'from_status', 'confirmed_for_inventory',
			'to_status', 'inventory_reserved'
		)
	);
	return target_order;
end;
$$;

drop function if exists public.service_warehouse_set_loading_item_quantity(
	uuid,
	text,
	uuid,
	uuid,
	text,
	numeric,
	boolean
);
drop function if exists public.warehouse_set_loading_item_quantity(
	uuid,
	uuid,
	text,
	numeric,
	boolean
);
drop function if exists public.warehouse_toggle_loading_item(uuid, uuid, text);

create or replace function public.warehouse_set_loading_item_quantity(
	p_order_id uuid,
	p_truck_id uuid,
	p_quote_request_item_id uuid,
	p_quantity numeric,
	p_exclusive boolean default false
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	task public.loading_tasks%rowtype;
	target_order public.orders%rowtype;
	line record;
	total_quantity numeric;
	clean_quantity numeric;
begin
	perform public.require_panel('warehouse', true);
	perform app_private.allow_workflow_state_change();

	clean_quantity := greatest(0, coalesce(p_quantity, 0));

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'warehouse_loading' then
		raise exception 'invalid_warehouse_item_quantity_transition_%', target_order.status using errcode = '23514';
	end if;

	select * into task
	from public.loading_tasks
	where order_id = p_order_id
	for update;

	if task.id is null or task.status not in ('loading', 'rejected') then
		raise exception 'loading_task_not_ready' using errcode = '23514';
	end if;

	select
		qi.id,
		qi.quantity,
		qi.quote_request_location_id,
		qi.customer_description,
		p.slug as product_slug
	into line
	from public.quote_request_items qi
	join public.products p on p.id = qi.product_id
	where qi.id = p_quote_request_item_id
	  and qi.quote_request_id = target_order.quote_request_id;

	if line.id is null then
		raise exception 'loading_item_not_on_order' using errcode = '23514';
	end if;

	if clean_quantity > line.quantity then
		raise exception 'loaded_quantity_exceeds_order_line' using errcode = '23514';
	end if;

	if not exists (
		select 1
		from public.loading_task_drivers
		where loading_task_id = task.id
		  and truck_id = p_truck_id
	) then
		raise exception 'truck_not_assigned_to_loading_task' using errcode = '23514';
	end if;

	update public.loading_task_drivers ltd
	set assigned_items = coalesce(
		(
			select jsonb_agg(item)
			from jsonb_array_elements(coalesce(ltd.assigned_items, '[]'::jsonb)) as entries(item)
			where app_private.loading_item_quote_request_item_id(item) is distinct from p_quote_request_item_id
		),
		'[]'::jsonb
	)
	where ltd.loading_task_id = task.id
	  and (p_exclusive or ltd.truck_id = p_truck_id);

	if clean_quantity > 0 then
		update public.loading_task_drivers
		set assigned_items = assigned_items || jsonb_build_array(
			jsonb_build_object(
				'quoteRequestItemId', p_quote_request_item_id,
				'locationId', line.quote_request_location_id,
				'productSlug', line.product_slug,
				'quantity', clean_quantity
			)
		)
		where loading_task_id = task.id
		  and truck_id = p_truck_id;
	end if;

	select app_private.loading_line_total_quantity(
		task.id,
		p_quote_request_item_id,
		line.quantity
	) into total_quantity;

	if total_quantity > line.quantity then
		raise exception 'loaded_quantity_exceeds_order_line' using errcode = '23514';
	end if;

	update public.loading_tasks
	set status = 'loading',
		proof = proof - 'advisor_marked_ready',
		updated_at = now()
	where id = task.id
	returning * into task;

	perform public.log_activity(
		'loading_task',
		task.id,
		'warehouse_loading_item_toggled',
		jsonb_build_object(
			'order_id', p_order_id,
			'truck_id', p_truck_id,
			'quote_request_item_id', p_quote_request_item_id,
			'quote_request_location_id', line.quote_request_location_id,
			'product_slug', line.product_slug,
			'quantity', clean_quantity,
			'exclusive', p_exclusive,
			'loaded', clean_quantity > 0
		)
	);

	return task;
end;
$$;

create or replace function public.warehouse_toggle_loading_item(
	p_order_id uuid,
	p_truck_id uuid,
	p_quote_request_item_id uuid
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	task public.loading_tasks%rowtype;
	target_order public.orders%rowtype;
	order_quantity numeric;
	already_here boolean;
begin
	select * into target_order
	from public.orders
	where id = p_order_id;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	select * into task
	from public.loading_tasks
	where order_id = p_order_id;

	if task.id is null then
		raise exception 'loading_task_not_ready' using errcode = '23514';
	end if;

	select qi.quantity into order_quantity
	from public.quote_request_items qi
	where qi.id = p_quote_request_item_id
	  and qi.quote_request_id = target_order.quote_request_id;

	if order_quantity is null then
		raise exception 'loading_item_not_on_order' using errcode = '23514';
	end if;

	select exists (
		select 1
		from public.loading_task_drivers ltd
		cross join lateral jsonb_array_elements(coalesce(ltd.assigned_items, '[]'::jsonb)) as entries(item)
		where ltd.loading_task_id = task.id
		  and ltd.truck_id = p_truck_id
		  and app_private.loading_item_quote_request_item_id(item) = p_quote_request_item_id
		  and app_private.loading_item_quantity(item, order_quantity) > 0
	) into already_here;

	return public.warehouse_set_loading_item_quantity(
		p_order_id,
		p_truck_id,
		p_quote_request_item_id,
		case when already_here then 0 else order_quantity end,
		true
	);
end;
$$;

create or replace function public.warehouse_mark_loading_ready(p_order_id uuid)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	task public.loading_tasks%rowtype;
	target_order public.orders%rowtype;
begin
	perform public.require_panel('warehouse', true);
	perform app_private.allow_workflow_state_change();

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'warehouse_loading' then
		raise exception 'invalid_warehouse_ready_transition_%', target_order.status using errcode = '23514';
	end if;

	select * into task
	from public.loading_tasks
	where order_id = p_order_id
	for update;

	if task.id is null or task.status not in ('loading', 'rejected') then
		raise exception 'loading_task_not_ready' using errcode = '23514';
	end if;

	if exists (
		select 1
		from public.loading_task_drivers ltd
		where ltd.loading_task_id = task.id
		  and not app_private.loading_assignment_has_quantity(ltd.assigned_items)
	) then
		raise exception 'assigned_truck_has_no_items' using errcode = '23514';
	end if;

	if exists (
		select 1
		from public.quote_request_items qi
		left join public.products p on p.id = qi.product_id
		where qi.quote_request_id = target_order.quote_request_id
		  and (
			p.id is null
			or app_private.loading_line_total_quantity(
				task.id,
				qi.id,
				qi.quantity
			) <> qi.quantity
		  )
	) then
		raise exception 'not_every_item_loaded' using errcode = '23514';
	end if;

	update public.loading_tasks
	set status = 'loading',
		proof = jsonb_set(coalesce(proof, '{}'::jsonb), '{advisor_marked_ready}', 'true'::jsonb, true),
		updated_at = now()
	where id = task.id
	returning * into task;

	perform public.log_activity(
		'loading_task',
		task.id,
		'warehouse_loading_marked_ready',
		jsonb_build_object('order_id', p_order_id)
	);

	return task;
end;
$$;

create or replace function app_private.assigned_location_ids_for_loading_assignment(
	p_assigned_items jsonb
)
returns table(quote_request_location_id uuid)
language sql
stable
set search_path = public, app_private
as $$
	select distinct qi.quote_request_location_id
	from jsonb_array_elements(coalesce(p_assigned_items, '[]'::jsonb)) as entries(item)
	join public.quote_request_items qi
		on qi.id = app_private.loading_item_quote_request_item_id(item)
	where qi.quote_request_location_id is not null;
$$;

create or replace function app_private.ensure_loading_task_active_deliveries(
	p_loading_task_id uuid,
	p_employee_id uuid default null,
	p_source_action text default 'warehouse_approve_loading'
)
returns integer
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	target_task public.loading_tasks%rowtype;
	assignment public.loading_task_drivers%rowtype;
	target_location_id uuid;
	target_order_location public.order_delivery_locations%rowtype;
	existing_delivery public.deliveries%rowtype;
	active_delivery public.deliveries%rowtype;
	started_delivery_count integer := 0;
	from_delivery_status text;
begin
	select * into target_task
	from public.loading_tasks
	where id = p_loading_task_id;

	if target_task.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	perform app_private.ensure_order_delivery_locations(target_task.order_id);

	for assignment in
		select *
		from public.loading_task_drivers
		where loading_task_id = target_task.id
		  and driver_id is not null
		order by created_at
	loop
		for target_location_id in
			select quote_request_location_id
			from app_private.assigned_location_ids_for_loading_assignment(
				assignment.assigned_items
			)
		loop
			existing_delivery := null;
			active_delivery := null;
			from_delivery_status := null;

			select * into target_order_location
			from public.order_delivery_locations
			where order_id = target_task.order_id
			  and quote_request_location_id = target_location_id
			for update;

			if target_order_location.id is null then
				raise exception 'order_delivery_location_not_found' using errcode = '02000';
			end if;

			update public.order_delivery_locations
			set status = 'out_for_delivery',
				updated_at = now()
			where id = target_order_location.id
			  and status <> 'completed';

			select * into existing_delivery
			from public.deliveries existing
			where existing.order_id = target_task.order_id
			  and existing.loading_task_id = target_task.id
			  and existing.order_delivery_location_id = target_order_location.id
			  and existing.driver_id = assignment.driver_id
			  and existing.truck_id is not distinct from assignment.truck_id
			  and existing.status in (
				'assigned',
				'accepted',
				'in_transit',
				'arrived',
				'completed'
			  )
			order by
				case existing.status
					when 'assigned' then 1
					when 'accepted' then 2
					when 'in_transit' then 3
					when 'arrived' then 4
					else 5
				end,
				existing.created_at
			limit 1
			for update;

			if existing_delivery.id is null then
				insert into public.deliveries (
					order_id,
					loading_task_id,
					order_delivery_location_id,
					driver_id,
					truck_id,
					status,
					started_at
				)
				values (
					target_task.order_id,
					target_task.id,
					target_order_location.id,
					assignment.driver_id,
					assignment.truck_id,
					'in_transit',
					now()
				)
				returning * into active_delivery;

				from_delivery_status := 'warehouse_signoff';

				perform public.log_activity(
					'delivery',
					active_delivery.id,
					'driver_assigned_delivery',
					jsonb_build_object(
						'employee_id', p_employee_id,
						'order_id', target_task.order_id,
						'loading_task_id', target_task.id,
						'order_delivery_location_id', target_order_location.id,
						'quote_request_location_id', target_location_id,
						'driver_id', active_delivery.driver_id,
						'truck_id', active_delivery.truck_id,
						'source_action', p_source_action,
						'auto_started', true
					)
				);
			elsif existing_delivery.status in ('assigned', 'accepted') then
				from_delivery_status := existing_delivery.status::text;

				update public.deliveries
				set status = 'in_transit',
					started_at = coalesce(started_at, now())
				where id = existing_delivery.id
				returning * into active_delivery;
			else
				active_delivery := existing_delivery;
			end if;

			update public.drivers
			set status = 'on_delivery'
			where id = assignment.driver_id;

			if from_delivery_status is not null then
				started_delivery_count := started_delivery_count + 1;

				perform public.log_activity(
					'delivery',
					active_delivery.id,
					'driver_delivery_started',
					jsonb_build_object(
						'driver_id', active_delivery.driver_id,
						'employee_id', p_employee_id,
						'from_status', from_delivery_status,
						'to_status', 'in_transit',
						'order_status', 'out_for_delivery',
						'source_action', p_source_action
					)
				);
			end if;
		end loop;
	end loop;

	return started_delivery_count;
end;
$$;

create or replace function public.warehouse_approve_loading(
	p_loading_task_id uuid,
	p_proof jsonb
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	updated public.loading_tasks%rowtype;
	target_order public.orders%rowtype;
	started_delivery_count integer;
begin
	employee_id := public.require_panel('warehouse', true);
	perform app_private.allow_workflow_state_change();

	select o.* into target_order
	from public.orders o
	join public.loading_tasks lt on lt.order_id = o.id
	where lt.id = p_loading_task_id
	for update of o;

	if target_order.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	if target_order.status <> 'warehouse_loading' then
		raise exception 'invalid_warehouse_approve_transition_%', target_order.status using errcode = '23514';
	end if;

	if not exists (
		select 1
		from public.loading_tasks
		where id = p_loading_task_id
		  and status = 'loading'
		  and proof->>'advisor_marked_ready' = 'true'
	) then
		raise exception 'loading_not_marked_ready' using errcode = '23514';
	end if;

	if exists (
		select 1
		from public.quote_request_items qi
		left join public.products p on p.id = qi.product_id
		where qi.quote_request_id = target_order.quote_request_id
		  and (
			p.id is null
			or app_private.loading_line_total_quantity(
				p_loading_task_id,
				qi.id,
				qi.quantity
			) <> qi.quantity
		  )
	) then
		raise exception 'not_every_item_loaded' using errcode = '23514';
	end if;

	perform 1
	from public.drivers d
	where d.id in (
		select ltd.driver_id
		from public.loading_task_drivers ltd
		where ltd.loading_task_id = p_loading_task_id
	)
	for update;

	perform 1
	from public.trucks t
	where t.id in (
		select ltd.truck_id
		from public.loading_task_drivers ltd
		where ltd.loading_task_id = p_loading_task_id
		  and ltd.truck_id is not null
	)
	for update;

	if exists (
		select 1
		from public.loading_task_drivers ltd
		join public.drivers d on d.id = ltd.driver_id
		left join public.trucks t on t.id = ltd.truck_id
		left join public.driver_online_states online on online.driver_id = ltd.driver_id
		where ltd.loading_task_id = p_loading_task_id
		  and (
			d.status <> 'available'
			or ltd.truck_id is null
			or t.id is null
			or t.driver_id is distinct from d.id
			or t.status <> 'loading'
			or online.driver_id is null
			or online.status <> 'online'
			or online.last_seen_at < now() - interval '15 minutes'
			or exists (
				select 1
				from public.loading_task_drivers other_ltd
				join public.loading_tasks other_lt on other_lt.id = other_ltd.loading_task_id
				join public.orders other_order on other_order.id = other_lt.order_id
				where other_ltd.id <> ltd.id
				  and (
					other_ltd.driver_id = ltd.driver_id
					or other_ltd.truck_id is not distinct from ltd.truck_id
				  )
				  and other_order.status in (
					'warehouse_loading',
					'dispatch_ready',
					'dispatch_assigned',
					'out_for_delivery'
				  )
			)
		  )
	) then
		raise exception 'assigned_driver_unavailable' using errcode = '23514';
	end if;

	update public.loading_tasks
	set status = 'approved',
		proof = coalesce(proof, '{}'::jsonb) || coalesce(p_proof, '{}'::jsonb),
		rejection_reason = null
	where id = p_loading_task_id
	returning * into updated;

	if updated.id is null then
		raise exception 'loading_task_not_found' using errcode = '02000';
	end if;

	update public.orders
	set status = 'out_for_delivery'
	where id = updated.order_id;

	started_delivery_count := app_private.ensure_loading_task_active_deliveries(
		updated.id,
		employee_id,
		'warehouse_approve_loading'
	);

	perform app_private.ensure_delivery_secret_for_order(updated.order_id);

	update public.trucks
	set status = 'dispatched'
	where id in (
		select truck_id
		from public.loading_task_drivers
		where loading_task_id = updated.id
		  and truck_id is not null
	);

	perform public.log_activity(
		'loading_task',
		updated.id,
		'warehouse_loading_approved',
		jsonb_build_object(
			'from_status', 'warehouse_loading',
			'to_status', 'out_for_delivery',
			'proof', coalesce(p_proof, '{}'::jsonb),
			'started_delivery_count', started_delivery_count
		)
	);

	return updated;
end;
$$;

create or replace function public.dispatch_complete_loaded_order(
	p_order_id uuid,
	p_proof jsonb
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	target_order public.orders%rowtype;
	task public.loading_tasks%rowtype;
	updated_delivery public.deliveries%rowtype;
	first_delivery public.deliveries%rowtype;
	finalized boolean;
begin
	employee_id := public.require_panel('dispatch', true);
	perform app_private.allow_workflow_state_change();

	select * into target_order
	from public.orders
	where id = p_order_id
	for update;

	if target_order.id is null then
		raise exception 'order_not_found' using errcode = '02000';
	end if;

	if target_order.status not in ('dispatch_ready', 'dispatch_assigned', 'out_for_delivery') then
		raise exception 'invalid_dispatch_complete_transition_%', target_order.status using errcode = '23514';
	end if;

	select * into task
	from public.loading_tasks
	where order_id = p_order_id
	  and status = 'approved'
	for update;

	if task.id is null then
		raise exception 'approved_loading_task_required' using errcode = '23514';
	end if;

	if not exists (
		select 1
		from public.loading_task_drivers
		where loading_task_id = task.id
		  and driver_id is not null
	) then
		raise exception 'loaded_driver_required' using errcode = '23514';
	end if;

	perform app_private.ensure_loading_task_active_deliveries(
		task.id,
		employee_id,
		'dispatch_complete_loaded_order'
	);

	for updated_delivery in
		update public.deliveries
		set status = 'completed',
			completed_at = now()
		where order_id = p_order_id
		  and loading_task_id = task.id
		  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
		returning *
	loop
		if first_delivery.id is null then
			first_delivery := updated_delivery;
		end if;

		perform app_private.complete_order_delivery_location_for_delivery(
			updated_delivery.id
		);

		perform public.log_activity(
			'delivery',
			updated_delivery.id,
			'dispatch_delivery_completed',
			jsonb_build_object(
				'employee_id', employee_id,
				'order_id', p_order_id,
				'loading_task_id', task.id,
				'order_delivery_location_id', updated_delivery.order_delivery_location_id,
				'driver_id', updated_delivery.driver_id,
				'truck_id', updated_delivery.truck_id,
				'proof', coalesce(p_proof, '{}'::jsonb)
			)
		);
	end loop;

	if first_delivery.id is null then
		select * into first_delivery
		from public.deliveries
		where order_id = p_order_id
		  and loading_task_id = task.id
		  and status = 'completed'
		order by completed_at desc nulls last, updated_at desc
		limit 1;
	end if;

	if first_delivery.id is null then
		raise exception 'active_delivery_required' using errcode = '23514';
	end if;

	update public.drivers
	set status = 'available'
	where id in (
		select driver_id
		from public.loading_task_drivers
		where loading_task_id = task.id
	);

	update public.trucks
	set status = 'available'
	where id in (
		select truck_id
		from public.loading_task_drivers
		where loading_task_id = task.id
		  and truck_id is not null
	);

	finalized := app_private.finalize_delivered_order_if_ready(p_order_id);
	if not finalized then
		raise exception 'dispatch_completion_did_not_finalize_order' using errcode = '23514';
	end if;

	return first_delivery;
end;
$$;

create or replace function public.dispatch_complete_delivery(
	p_delivery_id uuid,
	p_proof jsonb
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	updated public.deliveries%rowtype;
begin
	employee_id := public.require_panel('dispatch', true);
	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'completed',
		completed_at = now()
	where id = p_delivery_id
	  and status in ('assigned', 'accepted', 'in_transit', 'arrived')
	returning * into updated;

	if updated.id is null then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	perform app_private.complete_order_delivery_location_for_delivery(updated.id);

	update public.drivers
	set status = 'available'
	where id = updated.driver_id;

	update public.trucks
	set status = 'available'
	where id = updated.truck_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'dispatch_delivery_completed',
		jsonb_build_object(
			'employee_id', employee_id,
			'order_id', updated.order_id,
			'loading_task_id', updated.loading_task_id,
			'order_delivery_location_id', updated.order_delivery_location_id,
			'driver_id', updated.driver_id,
			'truck_id', updated.truck_id,
			'proof', coalesce(p_proof, '{}'::jsonb)
		)
	);

	perform app_private.finalize_delivered_order_if_ready(updated.order_id);
	return updated;
end;
$$;

create or replace function public.driver_confirm_delivery(
	p_delivery_id uuid,
	p_signature_path text,
	p_signer_name text,
	p_latitude numeric,
	p_longitude numeric,
	p_code text
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	v_driver_id uuid;
	target_delivery public.deliveries%rowtype;
	secret_row app_private.order_delivery_secrets%rowtype;
	submitted_code text;
	updated public.deliveries%rowtype;
	target_order public.orders%rowtype;
begin
	v_driver_id := public.current_driver_id();
	if v_driver_id is null then
		raise exception 'driver_required' using errcode = '42501';
	end if;
	perform p_signature_path, p_signer_name;

	submitted_code := app_private.extract_delivery_secret_code(p_code);
	if submitted_code is null then
		raise exception 'invalid_delivery_secret' using errcode = '23514';
	end if;

	select * into target_delivery
	from public.deliveries
	where id = p_delivery_id
	  and driver_id = v_driver_id
	for update;

	if target_delivery.id is null or target_delivery.status <> 'arrived' then
		raise exception 'delivery_not_found_or_invalid_transition' using errcode = '02000';
	end if;

	select * into secret_row
	from app_private.order_delivery_secrets
	where order_id = target_delivery.order_id
	for update;

	if secret_row.order_id is null or secret_row.code <> submitted_code then
		raise exception 'invalid_delivery_secret' using errcode = '23514';
	end if;

	if secret_row.verified_delivery_id is distinct from target_delivery.id
		or secret_row.verified_by_driver_id is distinct from v_driver_id
		or secret_row.verified_at is null then
		raise exception 'delivery_secret_not_verified' using errcode = '23514';
	end if;

	perform app_private.allow_workflow_state_change();

	update public.deliveries
	set status = 'completed',
		completed_at = now()
	where id = p_delivery_id
	returning * into updated;

	select * into target_order
	from public.orders
	where id = updated.order_id;

	perform app_private.complete_order_delivery_location_for_delivery(updated.id);

	update public.drivers
	set status = 'available'
	where id = v_driver_id;

	update public.trucks
	set status = 'available'
	where id = updated.truck_id;

	perform public.log_activity(
		'delivery',
		updated.id,
		'driver_delivery_confirmed',
		jsonb_build_object(
			'driver_id', v_driver_id,
			'order_id', updated.order_id,
			'customer_id', target_order.customer_id,
			'order_delivery_location_id', updated.order_delivery_location_id,
			'truck_id', updated.truck_id,
			'proof_type', 'delivery_secret',
			'latitude', p_latitude,
			'longitude', p_longitude,
			'to_status', 'completed'
		)
	);

	perform app_private.finalize_delivered_order_if_ready(updated.order_id);
	return updated;
end;
$$;

create or replace function public.service_warehouse_set_loading_item_quantity(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_truck_id uuid,
	p_quote_request_item_id uuid,
	p_quantity numeric,
	p_exclusive boolean default false
)
returns public.loading_tasks
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.warehouse_set_loading_item_quantity(
		p_order_id,
		p_truck_id,
		p_quote_request_item_id,
		p_quantity,
		p_exclusive
	);
end;
$$;

create or replace function public.service_driver_confirm_delivery(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_delivery_id uuid,
	p_signature_path text,
	p_signer_name text,
	p_latitude numeric,
	p_longitude numeric,
	p_code text
)
returns public.deliveries
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.driver_confirm_delivery(
		p_delivery_id,
		p_signature_path,
		p_signer_name,
		p_latitude,
		p_longitude,
		p_code
	);
end;
$$;

revoke execute on function public.warehouse_set_loading_item_quantity(
	uuid,
	uuid,
	uuid,
	numeric,
	boolean
) from public, anon, authenticated;
revoke execute on function public.warehouse_toggle_loading_item(
	uuid,
	uuid,
	uuid
) from public, anon, authenticated;
revoke execute on function public.service_warehouse_set_loading_item_quantity(
	uuid,
	text,
	uuid,
	uuid,
	uuid,
	numeric,
	boolean
) from public, anon, authenticated;
revoke execute on function public.driver_confirm_delivery(
	uuid,
	text,
	text,
	numeric,
	numeric,
	text
) from public, anon, authenticated;
revoke execute on function public.service_driver_confirm_delivery(
	uuid,
	text,
	uuid,
	text,
	text,
	numeric,
	numeric,
	text
) from public, anon, authenticated;

grant execute on function public.warehouse_set_loading_item_quantity(
	uuid,
	uuid,
	uuid,
	numeric,
	boolean
) to service_role;
grant execute on function public.warehouse_toggle_loading_item(
	uuid,
	uuid,
	uuid
) to service_role;
grant execute on function public.service_warehouse_set_loading_item_quantity(
	uuid,
	text,
	uuid,
	uuid,
	uuid,
	numeric,
	boolean
) to service_role;
grant execute on function public.driver_confirm_delivery(
	uuid,
	text,
	text,
	numeric,
	numeric,
	text
) to service_role;
grant execute on function public.service_driver_confirm_delivery(
	uuid,
	text,
	uuid,
	text,
	text,
	numeric,
	numeric,
	text
) to service_role;
