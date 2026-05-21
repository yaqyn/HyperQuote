create or replace function public.claim_next_sales_order()
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_id uuid;
	claimed public.quote_requests%rowtype;
	source_queue_position integer;
	event_details jsonb;
begin
	employee_id := public.require_panel('sales', true);
	perform app_private.allow_workflow_state_change();

	select qr.id, queued.source_queue_position
	into target_id, source_queue_position
	from public.quote_requests qr
	join (
		select
			id,
			row_number() over (
				order by greatest(created_at, coalesce(submitted_at, created_at), eligible_at), id
			)::integer as source_queue_position
		from public.quote_requests
		where status = 'submitted'
		  and eligible_at <= now()
	) queued on queued.id = qr.id
	where qr.status = 'submitted'
	  and qr.eligible_at <= now()
	order by queued.source_queue_position
	for update of qr skip locked
	limit 1;

	if target_id is null then
		return null;
	end if;

	update public.quote_requests
	set
		status = 'assigned',
		assigned_employee_id = employee_id,
		assigned_at = now()
	where id = target_id
	returning * into claimed;

	event_details := jsonb_build_object(
		'employee_id', employee_id,
		'order_id', claimed.id,
		'assigned_at', claimed.assigned_at,
		'from_status', 'submitted',
		'to_status', 'assigned',
		'source_queue_position', source_queue_position
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
	source_queue_position integer;
	target_queue_entered_at timestamptz;
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
				'order_id', target.id,
				'assigned_at', target.assigned_at,
				'from_status', 'assigned',
				'to_status', 'assigned',
				'source_queue_position', null
			)
		);
		return target;
	end if;

	if target.status <> 'submitted' or target.eligible_at > now() then
		raise exception 'invalid_sales_claim_transition_%', target.status using errcode = '23514';
	end if;

	target_queue_entered_at := greatest(
		target.created_at,
		coalesce(target.submitted_at, target.created_at),
		target.eligible_at
	);

	select count(*)::integer + 1
	into source_queue_position
	from public.quote_requests queued
	where queued.status = 'submitted'
	  and queued.eligible_at <= now()
	  and (
		greatest(
			queued.created_at,
			coalesce(queued.submitted_at, queued.created_at),
			queued.eligible_at
		) < target_queue_entered_at
		or (
			greatest(
				queued.created_at,
				coalesce(queued.submitted_at, queued.created_at),
				queued.eligible_at
			) = target_queue_entered_at
			and queued.id < target.id
		)
	  );

	update public.quote_requests
	set
		status = 'assigned',
		assigned_employee_id = employee_id,
		assigned_at = now()
	where id = target.id
	returning * into target;

	event_details := jsonb_build_object(
		'employee_id', employee_id,
		'order_id', target.id,
		'assigned_at', target.assigned_at,
		'from_status', 'submitted',
		'to_status', 'assigned',
		'source_queue_position', source_queue_position
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

create or replace function public.sales_save_and_requeue(
	p_order_id uuid,
	p_note text default null,
	p_return_minutes integer default 10
)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	updated public.quote_requests%rowtype;
	source_request public.quote_requests%rowtype;
	hold_minutes integer;
begin
	employee_id := public.require_panel('sales', true);
	perform app_private.allow_workflow_state_change();
	hold_minutes := greatest(1, least(coalesce(p_return_minutes, 10), 1440));

	select * into source_request
	from public.quote_requests
	where id = p_order_id
	for update;

	if source_request.id is null then
		raise exception 'quote_request_not_found_or_not_assigned' using errcode = '02000';
	end if;

	if source_request.status not in ('assigned', 'submitted', 'saved') then
		raise exception 'invalid_sales_requeue_transition_%', source_request.status using errcode = '23514';
	end if;

	if source_request.assigned_employee_id is not null
		and source_request.assigned_employee_id <> employee_id
		and not public.is_employee_with_role('ceo')
	then
		raise exception 'quote_request_assigned_to_another_employee' using errcode = '42501';
	end if;

	update public.quote_requests
	set
		status = 'submitted',
		assigned_employee_id = null,
		assigned_at = null,
		eligible_at = now() + (hold_minutes * interval '1 minute'),
		notes = coalesce(notes || E'\n', '') || coalesce(p_note, '')
	where id = p_order_id
	returning * into updated;

	if updated.id is null then
		raise exception 'quote_request_not_found_or_not_assigned' using errcode = '02000';
	end if;

	perform public.log_activity(
		'quote_request',
		updated.id,
		'sales_order_requeued',
		jsonb_build_object(
			'employee_id', employee_id,
			'order_id', updated.id,
			'from_status', source_request.status,
			'to_status', 'submitted',
			'note', p_note,
			'return_minutes', hold_minutes,
			'eligible_at', updated.eligible_at
		)
	);

	return updated;
end;
$$;
