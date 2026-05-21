alter table public.quote_request_items
	add column if not exists price_range_min numeric,
	add column if not exists price_range_max numeric,
	add column if not exists currency text not null default 'EGP';

drop policy if exists customers_own_quote_requests on public.quote_requests;
drop policy if exists quote_request_items_follow_parent on public.quote_request_items;

create policy quote_requests_customer_employee_select
	on public.quote_requests for select
	to authenticated
	using (
		customer_id = public.current_customer_id()
		or public.can_access_panel('sales')
		or public.can_access_panel('finance')
		or public.can_access_panel('inventory')
		or public.can_access_panel('warehouse')
		or public.can_access_panel('dispatch')
		or public.is_employee_with_role('ceo')
	);

create policy quote_requests_customer_employee_insert
	on public.quote_requests for insert
	to authenticated
	with check (
		(customer_id = public.current_customer_id() and status = 'draft')
		or public.can_access_panel('sales', true)
		or public.can_access_panel('finance', true)
		or public.can_access_panel('inventory', true)
		or public.can_access_panel('warehouse', true)
		or public.can_access_panel('dispatch', true)
	);

create policy quote_requests_customer_employee_update
	on public.quote_requests for update
	to authenticated
	using (
		(customer_id = public.current_customer_id() and status = 'draft')
		or public.can_access_panel('sales', true)
		or public.can_access_panel('finance', true)
		or public.can_access_panel('inventory', true)
		or public.can_access_panel('warehouse', true)
		or public.can_access_panel('dispatch', true)
	)
	with check (
		(customer_id = public.current_customer_id() and status = 'draft')
		or public.can_access_panel('sales', true)
		or public.can_access_panel('finance', true)
		or public.can_access_panel('inventory', true)
		or public.can_access_panel('warehouse', true)
		or public.can_access_panel('dispatch', true)
	);

create policy quote_requests_customer_employee_delete
	on public.quote_requests for delete
	to authenticated
	using (
		(customer_id = public.current_customer_id() and status = 'draft')
		or public.can_access_panel('sales', true)
		or public.can_access_panel('admin', true)
	);

create policy quote_request_items_customer_employee_select
	on public.quote_request_items for select
	to authenticated
	using (exists (
		select 1 from public.quote_requests qr
		where qr.id = quote_request_id
		  and (
			qr.customer_id = public.current_customer_id()
			or public.can_access_panel('sales')
			or public.can_access_panel('inventory')
			or public.is_employee_with_role('ceo')
		  )
	));

create policy quote_request_items_customer_employee_insert
	on public.quote_request_items for insert
	to authenticated
	with check (exists (
		select 1 from public.quote_requests qr
		where qr.id = quote_request_id
		  and (
			(qr.customer_id = public.current_customer_id() and qr.status = 'draft')
			or public.can_access_panel('sales', true)
			or public.can_access_panel('inventory', true)
		  )
	));

create policy quote_request_items_customer_employee_update
	on public.quote_request_items for update
	to authenticated
	using (exists (
		select 1 from public.quote_requests qr
		where qr.id = quote_request_id
		  and (
			(qr.customer_id = public.current_customer_id() and qr.status = 'draft')
			or public.can_access_panel('sales', true)
			or public.can_access_panel('inventory', true)
		  )
	))
	with check (exists (
		select 1 from public.quote_requests qr
		where qr.id = quote_request_id
		  and (
			(qr.customer_id = public.current_customer_id() and qr.status = 'draft')
			or public.can_access_panel('sales', true)
			or public.can_access_panel('inventory', true)
		  )
	));

create policy quote_request_items_customer_employee_delete
	on public.quote_request_items for delete
	to authenticated
	using (exists (
		select 1 from public.quote_requests qr
		where qr.id = quote_request_id
		  and (
			(qr.customer_id = public.current_customer_id() and qr.status = 'draft')
			or public.can_access_panel('sales', true)
			or public.can_access_panel('inventory', true)
		  )
	));

create or replace function app_private.normalize_customer_quote_request_item()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	parent_request record;
	catalog_product record;
	customer_id uuid;
begin
	select qr.customer_id, qr.status
	into parent_request
	from public.quote_requests qr
	where qr.id = new.quote_request_id;

	if parent_request.customer_id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	customer_id := public.current_customer_id();

	if customer_id is not null
		and parent_request.customer_id = customer_id
		and not (
			public.can_access_panel('sales', true)
			or public.can_access_panel('admin', true)
			or public.can_access_panel('inventory', true)
		)
	then
		if parent_request.status <> 'draft' then
			raise exception 'customer_quote_items_are_draft_only' using errcode = '42501';
		end if;

		if new.product_id is not null then
			select
				p.name,
				p.unit_of_measure,
				p.price_range_min,
				p.price_range_max,
				p.is_active,
				p.availability_status::text as availability_status
			into catalog_product
			from public.products p
			where p.id = new.product_id;

			if catalog_product.name is null
				or not catalog_product.is_active
				or catalog_product.availability_status in ('hidden', 'out_of_stock')
			then
				raise exception 'product_not_orderable' using errcode = '23514';
			end if;

			new.customer_description := catalog_product.name;
			new.unit_of_measure := catalog_product.unit_of_measure;
			new.price_range_min := catalog_product.price_range_min;
			new.price_range_max := catalog_product.price_range_max;
			new.currency := 'EGP';
			new.match_confidence := 1;
			new.is_unmatched := false;
		else
			new.customer_description := left(btrim(coalesce(new.customer_description, '')), 500);
			new.unit_of_measure := left(btrim(coalesce(new.unit_of_measure, 'unit')), 80);
			if new.customer_description = '' then
				raise exception 'customer_description_required' using errcode = '23514';
			end if;
			if new.unit_of_measure = '' then
				new.unit_of_measure := 'unit';
			end if;
			new.price_range_min := null;
			new.price_range_max := null;
			new.currency := 'EGP';
			new.match_confidence := null;
			new.is_unmatched := true;
		end if;
	end if;

	return new;
end;
$$;

drop trigger if exists quote_request_items_customer_normalize on public.quote_request_items;
create trigger quote_request_items_customer_normalize
	before insert or update of product_id, customer_description, unit_of_measure, price_range_min, price_range_max, currency
	on public.quote_request_items
	for each row
	execute function app_private.normalize_customer_quote_request_item();

create or replace function public.customer_submit_saved_quote_request(
	p_quote_request_id uuid,
	p_source text
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	request_customer_id uuid;
	submitted_request public.quote_requests;
	submit_source text;
begin
	request_customer_id := public.current_customer_id();
	if request_customer_id is null then
		raise exception 'not_authenticated' using errcode = '42501';
	end if;

	select *
	into submitted_request
	from public.quote_requests
	where id = p_quote_request_id
	  and customer_id = request_customer_id
	  and status = 'draft'
	for update;

	if submitted_request.id is null then
		raise exception 'quote_request_not_found_or_not_draft' using errcode = 'P0002';
	end if;

	if not exists (
		select 1
		from public.quote_request_items
		where quote_request_id = submitted_request.id
	) then
		raise exception 'quote_request_items_required' using errcode = '23514';
	end if;

	submit_source := coalesce(nullif(btrim(p_source), ''), 'portal');

	perform app_private.allow_workflow_state_change();

	update public.quote_requests
	set
		status = 'submitted',
		submitted_at = now(),
		submitted_by = auth.uid()
	where id = submitted_request.id
	returning * into submitted_request;

	perform public.log_activity(
		'quote_request',
		submitted_request.id,
		'quote_request_submitted',
		jsonb_build_object(
			'from_status', 'draft',
			'to_status', 'submitted',
			'source', submit_source
		)
	);

	return submitted_request;
end;
$$;

create or replace function public.customer_submit_saved_quote_request(p_quote_request_id uuid)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
begin
	return public.customer_submit_saved_quote_request(p_quote_request_id, 'portal');
end;
$$;
