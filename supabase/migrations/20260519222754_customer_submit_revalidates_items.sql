create or replace function app_private.recompute_customer_quote_request_items_for_submit(
	p_quote_request_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if not exists (
		select 1
		from public.quote_request_items
		where quote_request_id = p_quote_request_id
	) then
		raise exception 'quote_request_items_required' using errcode = '23514';
	end if;

	if exists (
		select 1
		from public.quote_request_items qri
		left join public.products p on p.id = qri.product_id
		where qri.quote_request_id = p_quote_request_id
			and qri.product_id is not null
			and (
				p.id is null
				or not p.is_active
				or p.availability_status in ('hidden', 'out_of_stock')
			)
	) then
		raise exception 'product_not_orderable' using errcode = '23514';
	end if;

	if exists (
		select 1
		from public.quote_request_items qri
		where qri.quote_request_id = p_quote_request_id
			and qri.product_id is null
			and btrim(coalesce(qri.customer_description, '')) = ''
	) then
		raise exception 'customer_description_required' using errcode = '23514';
	end if;

	update public.quote_request_items qri
	set
		customer_description = p.name,
		unit_of_measure = p.unit_of_measure,
		unit_of_measure_ar = p.unit_of_measure_ar,
		price_range_min = p.price_range_min,
		price_range_max = p.price_range_max,
		currency = 'EGP',
		match_confidence = 1,
		is_unmatched = false
	from public.products p
	where qri.quote_request_id = p_quote_request_id
		and qri.product_id = p.id;

	update public.quote_request_items qri
	set
		customer_description = left(btrim(coalesce(qri.customer_description, '')), 500),
		unit_of_measure = coalesce(nullif(left(btrim(coalesce(qri.unit_of_measure, '')), 80), ''), 'unit'),
		unit_of_measure_ar = coalesce(
			nullif(left(btrim(coalesce(qri.unit_of_measure_ar, qri.unit_of_measure, '')), 80), ''),
			coalesce(nullif(left(btrim(coalesce(qri.unit_of_measure, '')), 80), ''), 'unit')
		),
		price_range_min = null,
		price_range_max = null,
		currency = 'EGP',
		match_confidence = null,
		is_unmatched = true
	where qri.quote_request_id = p_quote_request_id
		and qri.product_id is null;
end;
$$;

revoke all on function app_private.recompute_customer_quote_request_items_for_submit(uuid)
	from public;

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

revoke all on function public.customer_submit_saved_quote_request(uuid, text)
	from public;
revoke all on function public.customer_submit_saved_quote_request(uuid)
	from public;
grant execute on function public.customer_submit_saved_quote_request(uuid, text)
	to authenticated;
grant execute on function public.customer_submit_saved_quote_request(uuid)
	to authenticated;
