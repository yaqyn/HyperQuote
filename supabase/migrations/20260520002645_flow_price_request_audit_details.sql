alter table public.price_update_requests
	add column if not exists quote_request_item_id uuid
		references public.quote_request_items(id) on delete set null;

create index if not exists price_update_requests_quote_request_item_idx
	on public.price_update_requests (quote_request_item_id)
	where quote_request_item_id is not null;

create or replace function public.request_price_update(
	p_product_id uuid,
	p_order_id uuid,
	p_reason text
)
returns public.price_update_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	created_request public.price_update_requests%rowtype;
	reason_text text;
	request_item_id uuid;
	request_status public.quote_request_status;
begin
	employee_id := public.require_panel('sales', true);
	reason_text := nullif(btrim(coalesce(p_reason, '')), '');

	if p_product_id is null then
		raise exception 'price_request_product_required' using errcode = '23514';
	end if;
	if p_order_id is null then
		raise exception 'price_request_order_required' using errcode = '23514';
	end if;
	if reason_text is null then
		raise exception 'price_request_reason_required' using errcode = '23514';
	end if;
	if not exists (
		select 1
		from public.products
		where id = p_product_id
			and is_active
			and availability_status <> 'hidden'
	) then
		raise exception 'price_request_product_not_orderable' using errcode = '23514';
	end if;

	select status
	into request_status
	from public.quote_requests
	where id = p_order_id;

	if request_status is null then
		raise exception 'price_request_order_not_found' using errcode = 'P0002';
	end if;
	if request_status not in (
		'submitted',
		'assigned',
		'reviewing',
		'awaiting_clarification',
		'quoting'
	) then
		raise exception 'price_request_order_not_active' using errcode = '23514';
	end if;

	select id
	into request_item_id
	from public.quote_request_items
	where quote_request_id = p_order_id
		and product_id = p_product_id
	order by sort_order, created_at
	limit 1;

	select * into created_request
	from public.price_update_requests
	where product_id = p_product_id
	  and quote_request_id = p_order_id
	  and status = 'pending'
	limit 1;

	if created_request.id is not null then
		if created_request.quote_request_item_id is null and request_item_id is not null then
			update public.price_update_requests
			set quote_request_item_id = request_item_id
			where id = created_request.id
			returning * into created_request;
		end if;

		return created_request;
	end if;

	insert into public.price_update_requests (
		product_id,
		quote_request_id,
		quote_request_item_id,
		requested_by_employee_id,
		reason
	)
	values (
		p_product_id,
		p_order_id,
		request_item_id,
		employee_id,
		reason_text
	)
	returning * into created_request;

	perform public.log_activity(
		'price_update_request',
		created_request.id,
		'price_update_requested',
		jsonb_build_object(
			'employee_id', employee_id,
			'product_id', p_product_id,
			'quote_request_id', p_order_id,
			'quote_request_item_id', request_item_id,
			'reason', reason_text,
			'status', created_request.status
		)
	);

	return created_request;
end;
$$;
