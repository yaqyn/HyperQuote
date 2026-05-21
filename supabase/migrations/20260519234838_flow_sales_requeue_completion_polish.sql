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
	note_text text;
begin
	employee_id := public.require_panel('sales', true);
	perform app_private.allow_workflow_state_change();
	hold_minutes := greatest(1, least(coalesce(p_return_minutes, 10), 1440));
	note_text := nullif(btrim(coalesce(p_note, '')), '');

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
		notes = case
			when note_text is null then notes
			when nullif(notes, '') is null then note_text
			else notes || E'\n' || note_text
		end
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
			'note', note_text,
			'return_minutes', hold_minutes,
			'eligible_at', updated.eligible_at
		)
	);

	return updated;
end;
$$;
