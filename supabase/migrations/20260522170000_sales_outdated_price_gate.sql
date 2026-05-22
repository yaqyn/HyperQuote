create or replace function app_private.product_price_is_outdated(p_product_id uuid)
returns boolean
language sql
stable
set search_path = public, app_private
as $$
	select coalesce((
		select
			coalesce(link.raw_cost, p.price_range_min, p.price_range_max, 0) <= 0
			or coalesce(link.last_quoted_at, p.updated_at, '-infinity'::timestamptz) < now() - interval '24 hours'
		from public.products p
		left join lateral (
			select spl.raw_cost, spl.last_quoted_at
			from public.supplier_product_links spl
			where spl.product_id = p.id
			order by spl.is_primary desc, spl.updated_at desc
			limit 1
		) link on true
		where p.id = p_product_id
	), true);
$$;

create or replace function app_private.sales_quote_version_has_outdated_prices(
	p_quote_version_id uuid
)
returns boolean
language plpgsql
stable
set search_path = public, app_private
as $$
declare
	quote_notes_text text;
	quote_notes jsonb;
begin
	select sqv.notes
	into quote_notes_text
	from public.sales_quote_versions sqv
	where sqv.id = p_quote_version_id;

	if quote_notes_text is null or btrim(quote_notes_text) = '' then
		return false;
	end if;

	begin
		quote_notes := quote_notes_text::jsonb;
	exception
		when others then
			return false;
	end;

	if jsonb_typeof(quote_notes->'items') <> 'array' then
		return false;
	end if;

	return (
		with raw_items as (
			select value as item
			from jsonb_array_elements(quote_notes->'items')
		),
		matched_products as (
			select distinct p.id
			from raw_items ri
			join public.products p
				on p.slug = coalesce(
					ri.item->>'productSlug',
					ri.item->>'product_slug',
					ri.item->>'id'
				)
				or p.id::text = coalesce(
					ri.item->>'productId',
					ri.item->>'product_id'
				)
		)
		select exists (
			select 1
			from matched_products mp
			where app_private.product_price_is_outdated(mp.id)
		)
	);
end;
$$;

create or replace function app_private.quote_request_has_outdated_prices(
	p_quote_request_id uuid
)
returns boolean
language sql
stable
set search_path = public, app_private
as $$
	select exists (
		select 1
		from public.quote_request_items qri
		where qri.quote_request_id = p_quote_request_id
			and qri.product_id is not null
			and app_private.product_price_is_outdated(qri.product_id)
	);
$$;

create or replace function public.sales_confirm_order(p_order_id uuid, p_quote_version_id uuid default null)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	source_request public.quote_requests%rowtype;
	created_order public.orders%rowtype;
	confirmed_quote_version_id uuid;
	from_status text;
	quote_total numeric := 0;
	has_outdated_prices boolean := false;
begin
	employee_id := public.require_panel('sales', true);
	perform app_private.allow_workflow_state_change();

	select * into source_request
	from public.quote_requests
	where id = p_order_id
	for update;

	if source_request.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	if source_request.status not in ('assigned', 'submitted', 'saved') then
		raise exception 'invalid_sales_confirm_transition_%', source_request.status using errcode = '23514';
	end if;

	from_status := source_request.status::text;

	select id, total
	into confirmed_quote_version_id, quote_total
	from public.sales_quote_versions
	where quote_request_id = p_order_id
	  and (p_quote_version_id is null or id = p_quote_version_id)
	order by version_number desc
	limit 1;

	if p_quote_version_id is not null and confirmed_quote_version_id is null then
		raise exception 'sales_quote_version_not_found' using errcode = '02000';
	end if;

	if confirmed_quote_version_id is not null then
		has_outdated_prices := app_private.sales_quote_version_has_outdated_prices(
			confirmed_quote_version_id
		);
	else
		has_outdated_prices := app_private.quote_request_has_outdated_prices(p_order_id);
	end if;

	if has_outdated_prices then
		raise exception 'outdated_quote_prices' using
			errcode = '23514',
			hint = 'Request inventory price updates before confirming this order.';
	end if;

	if confirmed_quote_version_id is not null then
		update public.sales_quote_versions
		set status = 'approved'
		where id = confirmed_quote_version_id;
	end if;

	update public.quote_requests
	set status = 'approved'
	where id = p_order_id
	returning * into source_request;

	insert into public.orders (quote_request_id, customer_id, status, total_amount)
	values (source_request.id, source_request.customer_id, 'confirmed_for_inventory', coalesce(quote_total, 0))
	on conflict (quote_request_id) do update
	set
		customer_id = excluded.customer_id,
		total_amount = excluded.total_amount
	where public.orders.status = 'confirmed_for_inventory'
	returning * into created_order;

	if created_order.id is null then
		select * into created_order
		from public.orders
		where quote_request_id = source_request.id;
	end if;

	perform public.log_activity(
		'quote_request',
		source_request.id,
		'sales_order_confirmed',
		jsonb_build_object(
			'employee_id', employee_id,
			'quote_version_id', confirmed_quote_version_id,
			'from_status', from_status,
			'to_status', 'approved',
			'order_status', created_order.status,
			'total_amount', created_order.total_amount
		)
	);
	return created_order;
end;
$$;
