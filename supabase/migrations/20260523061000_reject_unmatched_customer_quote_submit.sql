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
		where qri.quote_request_id = p_quote_request_id
			and (qri.product_id is null or qri.is_unmatched)
	) then
		raise exception 'product_not_orderable' using errcode = '23514';
	end if;

	if exists (
		select 1
		from public.quote_request_items qri
		left join public.products p on p.id = qri.product_id
		where qri.quote_request_id = p_quote_request_id
			and (
				p.id is null
				or not p.is_active
				or p.availability_status in ('hidden', 'out_of_stock')
			)
	) then
		raise exception 'product_not_orderable' using errcode = '23514';
	end if;

	update public.quote_request_items qri
	set
		customer_description = p.name,
		product_name_ar = coalesce(nullif(p.name_ar, ''), p.name),
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
end;
$$;

revoke all on function app_private.recompute_customer_quote_request_items_for_submit(uuid)
	from public;
