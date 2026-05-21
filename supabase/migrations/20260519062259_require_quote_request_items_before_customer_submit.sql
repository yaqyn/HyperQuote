create or replace function public.customer_submit_saved_quote_request(p_quote_request_id uuid)
returns public.quote_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	request_customer_id uuid;
	submitted_request public.quote_requests;
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
		jsonb_build_object('from_status', 'draft', 'to_status', 'submitted')
	);

	return submitted_request;
end;
$$;
