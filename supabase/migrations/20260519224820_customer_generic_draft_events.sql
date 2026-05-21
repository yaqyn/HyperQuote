create or replace function public.customer_record_quote_request_draft_saved(
	p_quote_request_id uuid,
	p_source text,
	p_context jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	request_customer_id uuid;
	request_row public.quote_requests%rowtype;
	normalized_source text;
	event_action public.audit_event_type;
	operation text;
	event_details jsonb;
begin
	request_customer_id := public.current_customer_id();
	if request_customer_id is null then
		raise exception 'not_authenticated' using errcode = '42501';
	end if;

	select *
	into request_row
	from public.quote_requests
	where id = p_quote_request_id
	  and customer_id = request_customer_id
	  and status = 'draft';

	if request_row.id is null then
		raise exception 'quote_request_not_found_or_not_draft' using errcode = 'P0002';
	end if;

	normalized_source := coalesce(nullif(btrim(p_source), ''), 'portal');
	event_action := case
		when normalized_source = 'website' then 'website_draft_saved'::public.audit_event_type
		else 'portal_draft_saved'::public.audit_event_type
	end;
	event_details := coalesce(p_context, '{}'::jsonb) ||
		jsonb_build_object(
			'source', normalized_source,
			'status', request_row.status,
			'request_number', request_row.request_number
		);
	operation := lower(coalesce(event_details->>'operation', ''));

	if operation = 'create' then
		perform public.log_activity(
			'quote_request',
			request_row.id,
			'draft_created',
			event_details
		);
	elsif operation = 'update' then
		perform public.log_activity(
			'quote_request',
			request_row.id,
			'draft_updated',
			event_details
		);
	end if;

	perform public.log_activity(
		'quote_request',
		request_row.id,
		'draft_saved',
		event_details
	);

	perform public.log_activity(
		'quote_request',
		request_row.id,
		event_action,
		event_details
	);
end;
$$;

create or replace function public.customer_record_order_saved_as_draft(
	p_source_quote_request_id uuid,
	p_draft_quote_request_id uuid,
	p_source_order_id uuid default null,
	p_source text default 'portal'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	request_customer_id uuid;
	source_request public.quote_requests%rowtype;
	draft_request public.quote_requests%rowtype;
	normalized_source text;
	event_details jsonb;
begin
	request_customer_id := public.current_customer_id();
	if request_customer_id is null then
		raise exception 'not_authenticated' using errcode = '42501';
	end if;

	select *
	into source_request
	from public.quote_requests
	where id = p_source_quote_request_id
	  and customer_id = request_customer_id
	  and status <> 'draft';

	if source_request.id is null then
		raise exception 'source_quote_request_not_found' using errcode = 'P0002';
	end if;

	select *
	into draft_request
	from public.quote_requests
	where id = p_draft_quote_request_id
	  and customer_id = request_customer_id
	  and status = 'draft';

	if draft_request.id is null then
		raise exception 'draft_quote_request_not_found' using errcode = 'P0002';
	end if;

	if not exists (
		select 1
		from public.quote_request_items
		where quote_request_id = draft_request.id
	) then
		raise exception 'draft_items_required' using errcode = '23514';
	end if;

	if p_source_order_id is not null and not exists (
		select 1
		from public.orders
		where id = p_source_order_id
		  and quote_request_id = source_request.id
		  and customer_id = request_customer_id
	) then
		raise exception 'source_order_not_found' using errcode = 'P0002';
	end if;

	normalized_source := coalesce(nullif(btrim(p_source), ''), 'portal');
	event_details := jsonb_build_object(
		'operation', 'create',
		'source', normalized_source,
		'source_quote_request_id', source_request.id,
		'source_order_id', p_source_order_id,
		'source_status', source_request.status,
		'source_request_number', source_request.request_number,
		'draft_request_number', draft_request.request_number
	);

	perform public.log_activity(
		'quote_request',
		draft_request.id,
		'draft_created',
		event_details
	);

	perform public.log_activity(
		'quote_request',
		draft_request.id,
		'draft_saved',
		event_details
	);

	perform public.log_activity(
		'quote_request',
		draft_request.id,
		'customer_order_saved_as_draft',
		event_details
	);
end;
$$;
