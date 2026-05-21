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
	event_details jsonb;
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

	perform app_private.recompute_customer_quote_request_items_for_submit(
		submitted_request.id
	);

	submit_source := coalesce(nullif(btrim(p_source), ''), 'portal');

	perform app_private.allow_workflow_state_change();

	update public.quote_requests
	set
		status = 'submitted',
		submitted_at = now(),
		submitted_by = auth.uid()
	where id = submitted_request.id
	returning * into submitted_request;

	event_details := jsonb_build_object(
		'from_status', 'draft',
		'to_status', 'submitted',
		'source', submit_source,
		'request_number', submitted_request.request_number
	);

	perform public.log_activity(
		'quote_request',
		submitted_request.id,
		'draft_submitted',
		event_details
	);

	perform public.log_activity(
		'quote_request',
		submitted_request.id,
		'order_submitted',
		event_details
	);

	perform public.log_activity(
		'quote_request',
		submitted_request.id,
		'quote_request_submitted',
		event_details
	);

	return submitted_request;
end;
$$;

create or replace function public.customer_submit_saved_quote_request(
	p_quote_request_id uuid
)
returns public.quote_requests
language sql
security definer
set search_path = public
as $$
	select public.customer_submit_saved_quote_request(p_quote_request_id, 'portal');
$$;

create or replace function public.claim_next_sales_order()
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	claimed public.quote_requests%rowtype;
	event_details jsonb;
begin
	employee_id := public.require_panel('sales', true);
	perform app_private.allow_workflow_state_change();

	update public.quote_requests qr
	set
		status = 'assigned',
		assigned_employee_id = employee_id,
		assigned_at = now()
	where qr.id = (
		select id
		from public.quote_requests
		where status = 'submitted'
		  and eligible_at <= now()
		order by created_at, id
		for update skip locked
		limit 1
	)
	returning * into claimed;

	if claimed.id is not null then
		event_details := jsonb_build_object(
			'employee_id', employee_id,
			'from_status', 'submitted',
			'to_status', 'assigned'
		);

		perform public.log_activity(
			'quote_request',
			claimed.id,
			'sales_order_claimed',
			event_details
		);

		perform public.log_activity(
			'quote_request',
			claimed.id,
			'sales_order_opened',
			event_details
		);
	end if;

	return claimed;
end;
$$;

create or replace function public.sales_claim_order(p_order_id uuid)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target public.quote_requests%rowtype;
	event_details jsonb;
begin
	employee_id := public.require_panel('sales', true);
	perform app_private.allow_workflow_state_change();

	select * into target
	from public.quote_requests
	where id = p_order_id
	for update;

	if target.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	if target.status = 'assigned' and target.assigned_employee_id = employee_id then
		perform public.log_activity(
			'quote_request',
			target.id,
			'sales_order_opened',
			jsonb_build_object(
				'employee_id', employee_id,
				'from_status', 'assigned',
				'to_status', 'assigned'
			)
		);
		return target;
	end if;

	if target.status <> 'submitted' or target.eligible_at > now() then
		raise exception 'invalid_sales_claim_transition_%', target.status using errcode = '23514';
	end if;

	update public.quote_requests
	set
		status = 'assigned',
		assigned_employee_id = employee_id,
		assigned_at = now()
	where id = target.id
	returning * into target;

	event_details := jsonb_build_object(
		'employee_id', employee_id,
		'from_status', 'submitted',
		'to_status', 'assigned'
	);

	perform public.log_activity(
		'quote_request',
		target.id,
		'sales_order_claimed',
		event_details
	);

	perform public.log_activity(
		'quote_request',
		target.id,
		'sales_order_opened',
		event_details
	);

	return target;
end;
$$;

create or replace function public.sales_record_call_note(
	p_order_id uuid,
	p_outcome text,
	p_notes text default null
)
returns public.sales_call_notes
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	created_note public.sales_call_notes%rowtype;
	event_details jsonb;
begin
	employee_id := public.require_panel('sales', true);

	insert into public.sales_call_notes (quote_request_id, employee_id, outcome, notes)
	values (p_order_id, employee_id, p_outcome, p_notes)
	returning * into created_note;

	event_details := jsonb_build_object(
		'employee_id', employee_id,
		'outcome', p_outcome,
		'notes', p_notes
	);

	perform public.log_activity(
		'quote_request',
		p_order_id,
		'sales_customer_called',
		event_details
	);

	perform public.log_activity(
		'quote_request',
		p_order_id,
		'sales_call_note_recorded',
		event_details
	);

	return created_note;
end;
$$;

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
	event_details jsonb;
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

	event_details := jsonb_build_object(
		'employee_id', employee_id,
		'quote_version_id', updated.id,
		'item_count', item_count,
		'total', updated.total,
		'notes', p_notes
	);

	perform public.log_activity(
		'quote_request',
		p_order_id,
		'sales_quote_edited',
		event_details
	);

	perform public.log_activity(
		'quote_request',
		p_order_id,
		'sales_quote_draft_saved',
		event_details
	);

	return updated;
end;
$$;
