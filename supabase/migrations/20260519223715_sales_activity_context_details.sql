create or replace function public.sales_save_quote_version(
	p_order_id uuid,
	p_items jsonb,
	p_notes text default null
)
returns public.sales_quote_versions
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	source_request public.quote_requests%rowtype;
	updated public.sales_quote_versions%rowtype;
	next_version integer;
	item_count integer;
	subtotal_amount numeric;
begin
	employee_id := public.require_panel('sales', true);

	select * into source_request
	from public.quote_requests
	where id = p_order_id
	for update;

	if source_request.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	if source_request.status not in ('assigned', 'submitted', 'saved', 'reviewing', 'quoting') then
		raise exception 'invalid_sales_quote_version_transition_%', source_request.status using errcode = '23514';
	end if;

	if source_request.assigned_employee_id is not null
		and source_request.assigned_employee_id <> employee_id
		and not public.is_employee_with_role('ceo')
	then
		raise exception 'quote_request_assigned_to_another_employee' using errcode = '42501';
	end if;

	if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
		raise exception 'quote_items_required' using errcode = '23514';
	end if;

	if exists (
		select 1
		from jsonb_array_elements(p_items) as item
		where coalesce((item->>'quantity')::numeric, 0) <= 0
			or coalesce((item->>'sellPrice')::numeric, (item->>'sell_price')::numeric, 0) < 0
	) then
		raise exception 'invalid_quote_item_values' using errcode = '23514';
	end if;

	select
		count(*),
		coalesce(sum((item->>'quantity')::numeric * coalesce((item->>'sellPrice')::numeric, (item->>'sell_price')::numeric, 0)), 0)
	into item_count, subtotal_amount
	from jsonb_array_elements(p_items) as item;

	select * into updated
	from public.sales_quote_versions
	where quote_request_id = p_order_id
		and status = 'draft'
	order by version_number desc
	limit 1
	for update;

	if updated.id is not null then
		update public.sales_quote_versions
		set
			subtotal = subtotal_amount,
			tax_amount = round(subtotal_amount * 0.14, 2),
			total = round(subtotal_amount * 1.14, 2),
			notes = jsonb_build_object('notes', p_notes, 'items', p_items)::text
		where id = updated.id
		returning * into updated;
	else
		select coalesce(max(version_number), 0) + 1
		into next_version
		from public.sales_quote_versions
		where quote_request_id = p_order_id;

		insert into public.sales_quote_versions (
			quote_request_id,
			version_number,
			created_by_employee_id,
			status,
			subtotal,
			tax_amount,
			total,
			notes
		)
		values (
			p_order_id,
			next_version,
			employee_id,
			'draft',
			subtotal_amount,
			round(subtotal_amount * 0.14, 2),
			round(subtotal_amount * 1.14, 2),
			jsonb_build_object('notes', p_notes, 'items', p_items)::text
		)
		returning * into updated;
	end if;

	perform public.log_activity(
		'quote_request',
		p_order_id,
		'sales_quote_draft_saved',
		jsonb_build_object(
			'employee_id', employee_id,
			'quote_version_id', updated.id,
			'item_count', item_count,
			'total', updated.total,
			'notes', p_notes
		)
	);

	return updated;
end;
$$;

create or replace function public.sales_reject_order(
	p_order_id uuid,
	p_reason text,
	p_proof jsonb
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	updated public.quote_requests%rowtype;
begin
	employee_id := public.require_panel('sales', true);
	perform public.require_rejection_proof(p_proof);
	perform app_private.allow_workflow_state_change();

	update public.quote_requests
	set status = 'rejected', rejected_reason = p_reason, rejected_proof = p_proof
	where id = p_order_id
	returning * into updated;

	if updated.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	perform public.log_activity(
		'quote_request',
		updated.id,
		'sales_order_rejected',
		jsonb_build_object(
			'employee_id', employee_id,
			'to_status', 'rejected',
			'reason', p_reason,
			'proof', p_proof
		)
	);
	return updated;
end;
$$;
