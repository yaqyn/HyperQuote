create or replace function public.create_manual_order(
	p_customer_id uuid,
	p_items jsonb,
	p_notes text default null
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	created_request public.quote_requests%rowtype;
	item jsonb;
	item_count integer;
begin
	employee_id := public.require_panel('sales', true);

	if p_customer_id is null then
		raise exception 'manual_order_customer_required' using errcode = '23514';
	end if;

	if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
		raise exception 'manual_order_items_must_be_array' using errcode = '23514';
	end if;

	item_count := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
	if item_count < 1 then
		raise exception 'manual_order_items_required' using errcode = '23514';
	end if;

	insert into public.quote_requests (
		customer_id,
		status,
		urgency,
		notes,
		submitted_at,
		assigned_employee_id,
		assigned_at
	)
	values (p_customer_id, 'assigned', 'standard', nullif(btrim(coalesce(p_notes, '')), ''), now(), employee_id, now())
	returning * into created_request;

	for item in select value from jsonb_array_elements(p_items)
	loop
		insert into public.quote_request_items (
			quote_request_id,
			product_id,
			customer_description,
			quantity,
			unit_of_measure,
			notes,
			sort_order,
			is_unmatched
		)
		values (
			created_request.id,
			nullif(item->>'product_id', '')::uuid,
			coalesce(item->>'customer_description', item->>'description', 'Manual item'),
			coalesce((item->>'quantity')::numeric, 1),
			coalesce(item->>'unit_of_measure', item->>'unit', 'unit'),
			nullif(btrim(coalesce(item->>'notes', '')), ''),
			coalesce((item->>'sort_order')::integer, 0),
			coalesce((item->>'is_unmatched')::boolean, false)
		);
	end loop;

	perform public.log_activity(
		'quote_request',
		created_request.id,
		'manual_order_created',
		jsonb_build_object(
			'employee_id', employee_id,
			'order_id', created_request.id,
			'customer_id', created_request.customer_id,
			'assigned_at', created_request.assigned_at,
			'item_count', item_count,
			'source', 'manual_phone_order'
		)
	);

	return created_request;
end;
$$;
