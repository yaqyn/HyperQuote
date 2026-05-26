create or replace function public.driver_submit_fuel_receipt(
	p_truck_id uuid default null,
	p_delivery_id uuid default null,
	p_expense_date date default null,
	p_amount numeric default null,
	p_fuel_liters numeric default null,
	p_odometer_km numeric default null,
	p_receipt_image_data_url text default null,
	p_receipt_file_name text default null,
	p_receipt_mime_type text default null,
	p_receipt_size_bytes integer default null,
	p_note text default null
)
returns public.truck_fuel_expenses
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	actor_driver_id uuid := public.current_driver_id();
	target_truck public.trucks%rowtype;
	target_delivery public.deliveries%rowtype;
	expense public.truck_fuel_expenses%rowtype;
	clean_receipt text := btrim(coalesce(p_receipt_image_data_url, ''));
	clean_file_name text := coalesce(nullif(btrim(coalesce(p_receipt_file_name, '')), ''), 'fuel-receipt.jpg');
	clean_mime_type text := coalesce(nullif(btrim(coalesce(p_receipt_mime_type, '')), ''), 'image/jpeg');
	clean_amount numeric := case when p_amount is null then null else round(p_amount, 2) end;
begin
	if actor_driver_id is null then
		raise exception 'driver_session_required' using errcode = '42501';
	end if;
	if clean_receipt = '' or clean_receipt not like 'data:image/%' then
		raise exception 'fuel_receipt_photo_required' using errcode = '23514';
	end if;
	if length(clean_receipt) > 1500000 then
		raise exception 'fuel_receipt_photo_too_large' using errcode = '23514';
	end if;
	if clean_mime_type not like 'image/%' then
		raise exception 'fuel_receipt_photo_type_required' using errcode = '23514';
	end if;
	if p_receipt_size_bytes is not null and (p_receipt_size_bytes < 1 or p_receipt_size_bytes > 1048576) then
		raise exception 'fuel_receipt_photo_size_invalid' using errcode = '23514';
	end if;
	if clean_amount is not null and clean_amount <= 0 then
		raise exception 'fuel_amount_must_be_positive' using errcode = '23514';
	end if;
	if p_fuel_liters is not null and p_fuel_liters <= 0 then
		raise exception 'fuel_liters_must_be_positive' using errcode = '23514';
	end if;
	if p_odometer_km is not null and p_odometer_km < 0 then
		raise exception 'fuel_odometer_invalid' using errcode = '23514';
	end if;

	if p_delivery_id is not null then
		select * into target_delivery
		from public.deliveries
		where id = p_delivery_id
		  and deliveries.driver_id = actor_driver_id;
		if target_delivery.id is null then
			raise exception 'driver_delivery_not_found_for_fuel' using errcode = '02000';
		end if;
	end if;

	if p_truck_id is not null then
		select * into target_truck
		from public.trucks
		where id = p_truck_id;
	elsif target_delivery.truck_id is not null then
		select * into target_truck
		from public.trucks
		where id = target_delivery.truck_id;
	else
		select * into target_truck
		from public.trucks
		where trucks.driver_id = actor_driver_id
		order by updated_at desc
		limit 1;
	end if;

	if target_truck.id is null then
		raise exception 'fuel_truck_required' using errcode = '23514';
	end if;

	if target_delivery.id is not null then
		if target_delivery.truck_id is not null and target_delivery.truck_id <> target_truck.id then
			raise exception 'fuel_truck_not_delivery_truck' using errcode = '42501';
		end if;
		if target_truck.driver_id is not null and target_truck.driver_id <> actor_driver_id then
			raise exception 'fuel_truck_not_assigned_to_driver' using errcode = '42501';
		end if;
	elsif target_truck.driver_id is null or target_truck.driver_id <> actor_driver_id then
		raise exception 'fuel_truck_not_assigned_to_driver' using errcode = '42501';
	end if;

	insert into public.truck_fuel_expenses (
		truck_id,
		driver_id,
		delivery_id,
		expense_date,
		amount,
		fuel_liters,
		odometer_km,
		receipt_image_data_url,
		receipt_file_name,
		receipt_mime_type,
		receipt_size_bytes,
		note
	)
	values (
		target_truck.id,
		actor_driver_id,
		target_delivery.id,
		coalesce(p_expense_date, (now() at time zone 'Africa/Cairo')::date),
		clean_amount,
		case when p_fuel_liters is null then null else round(p_fuel_liters, 3) end,
		case when p_odometer_km is null then null else round(p_odometer_km, 1) end,
		clean_receipt,
		clean_file_name,
		clean_mime_type,
		p_receipt_size_bytes,
		nullif(btrim(coalesce(p_note, '')), '')
	)
	returning * into expense;

	perform public.log_activity(
		'truck_fuel_expense',
		expense.id,
		'driver_fuel_receipt_submitted',
		jsonb_strip_nulls(jsonb_build_object(
			'driver_id', actor_driver_id,
			'truck_id', target_truck.id,
			'truck_plate', target_truck.plate_number,
			'delivery_id', target_delivery.id,
			'expense_date', expense.expense_date,
			'amount', expense.amount,
			'fuel_liters', expense.fuel_liters,
			'odometer_km', expense.odometer_km,
			'source', 'driver_app'
		))
	);

	return expense;
end;
$$;

drop function if exists public.service_internal_ai_search_documents(
	uuid,
	text,
	public.ai_agent_scope,
	text[],
	text[],
	integer
);

drop function if exists app_private.internal_ai_search_documents(
	public.ai_agent_scope,
	text[],
	text[],
	integer
);

create or replace function app_private.internal_ai_search_documents(
	p_agent_scope public.ai_agent_scope,
	p_entity_types text[] default '{}',
	p_search_tokens text[] default '{}',
	p_limit_per_entity integer default 8,
	p_active_panel text default null
)
returns table (
	entity_type text,
	entity_id text,
	title text,
	subtitle text,
	metadata jsonb,
	sort_at timestamptz,
	search_text text
)
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
declare
	requested_limit integer := least(greatest(coalesce(p_limit_per_entity, 8), 1), 50);
	active_panel text := lower(nullif(btrim(coalesce(p_active_panel, '')), ''));
begin
	if p_agent_scope not in ('employee', 'search') then
		raise exception 'internal_ai_scope_required' using errcode = '42501';
	end if;

	if public.current_employee_id() is null then
		raise exception 'employee_required_for_internal_ai' using errcode = '42501';
	end if;

	if p_agent_scope = 'search' and not public.can_access_ceo_search() then
		raise exception 'ceo_search_required_for_internal_ai' using errcode = '42501';
	end if;

	if p_agent_scope = 'employee' and active_panel = 'finance' and not public.can_access_panel('finance') then
		raise exception 'finance_panel_required_for_internal_ai' using errcode = '42501';
	end if;

	return query
	with allowed_entities(entity_type) as (
		select unnest(
			case
				when p_agent_scope = 'search' then array[
					'order',
					'customer',
					'payment',
					'finance',
					'finance_payroll',
					'finance_payroll_payment',
					'finance_fuel_expense',
					'finance_company_asset',
					'approval',
					'inventory',
					'pricing',
					'category',
					'warehouse',
					'dispatch',
					'driver',
					'driver_location',
					'support',
					'support_message',
					'supplier',
					'sales_history',
					'document',
					'employee',
					'activity'
				]
				when active_panel = 'finance' then array[
					'order',
					'customer',
					'payment',
					'finance',
					'finance_payroll',
					'finance_payroll_payment',
					'finance_fuel_expense',
					'finance_company_asset',
					'approval',
					'inventory',
					'pricing',
					'category',
					'warehouse',
					'dispatch',
					'driver',
					'driver_location',
					'support',
					'support_message',
					'supplier',
					'sales_history',
					'document'
				]
				else array[
					'order',
					'customer',
					'approval',
					'inventory',
					'pricing',
					'category',
					'warehouse',
					'dispatch',
					'driver',
					'driver_location',
					'support',
					'support_message',
					'supplier',
					'sales_history',
					'document'
				]
			end
		)
	),
	requested_entities(entity_type) as (
		select distinct lower(btrim(requested_entity))
		from unnest(coalesce(p_entity_types, '{}')) requested_entity
		where btrim(requested_entity) <> ''
	),
	effective_entities(entity_type) as (
		select allowed_entities.entity_type
		from allowed_entities
		where not exists (select 1 from requested_entities)
		   or allowed_entities.entity_type in (select requested_entities.entity_type from requested_entities)
	),
	search_terms(term) as (
		select distinct lower(btrim(search_token))
		from unnest(coalesce(p_search_tokens, '{}')) search_token
		where btrim(search_token) <> ''
	),
	scoped_rows as (
		select documents.*
		from effective_entities
		join lateral (
			select
				d.entity_type,
				d.entity_id,
				d.title,
				d.subtitle,
				d.metadata,
				d.sort_at,
				d.search_text
			from public.ceo_search_documents d
			where d.entity_type = effective_entities.entity_type
			  and not exists (
				select 1
				from search_terms
				where d.search_text not ilike ('%' || search_terms.term || '%')
			  )
			order by d.sort_at desc nulls last, d.title asc
			limit requested_limit
		) documents on true
	)
	select
		scoped_rows.entity_type,
		scoped_rows.entity_id,
		scoped_rows.title,
		scoped_rows.subtitle,
		scoped_rows.metadata,
		scoped_rows.sort_at,
		scoped_rows.search_text
	from scoped_rows
	order by scoped_rows.sort_at desc nulls last, scoped_rows.title asc;
end;
$$;

revoke all privileges on function app_private.internal_ai_search_documents(
	public.ai_agent_scope,
	text[],
	text[],
	integer,
	text
) from anon, authenticated, public;

create or replace function public.service_internal_ai_search_documents(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_agent_scope public.ai_agent_scope,
	p_entity_types text[] default '{}',
	p_search_tokens text[] default '{}',
	p_limit_per_entity integer default 8,
	p_active_panel text default null
)
returns table (
	entity_type text,
	entity_id text,
	title text,
	subtitle text,
	metadata jsonb,
	sort_at timestamptz,
	search_text text
)
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	if p_actor_pool <> 'internal' then
		raise exception 'internal_actor_required_for_internal_ai' using errcode = '42501';
	end if;

	return query
	select *
	from app_private.internal_ai_search_documents(
		p_agent_scope,
		coalesce(p_entity_types, '{}'),
		coalesce(p_search_tokens, '{}'),
		p_limit_per_entity,
		p_active_panel
	);
end;
$$;

revoke all privileges on function public.service_internal_ai_search_documents(
	uuid,
	text,
	public.ai_agent_scope,
	text[],
	text[],
	integer,
	text
) from anon, authenticated, public;

grant execute on function public.service_internal_ai_search_documents(
	uuid,
	text,
	public.ai_agent_scope,
	text[],
	text[],
	integer,
	text
) to service_role;

insert into app_private.ceo_search_refresh_state (id, dirty, dirty_at)
values (true, true, now())
on conflict (id) do update set
	dirty = true,
	dirty_at = excluded.dirty_at;
