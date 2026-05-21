create or replace function app_private.normalize_customer_quote_request_item()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
	parent_request record;
	current_customer_id uuid;
	catalog_product record;
begin
	select id, customer_id, status
	into parent_request
	from public.quote_requests
	where id = new.quote_request_id;

	if parent_request.customer_id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	current_customer_id := public.current_customer_id();

	if current_customer_id is not null
		and parent_request.customer_id = current_customer_id
		and not (
			public.can_access_panel('sales', true)
			or public.can_access_panel('admin', true)
			or public.can_access_panel('inventory', true)
		)
	then
		if parent_request.status <> 'draft' then
			raise exception 'customer_quote_items_are_draft_only' using errcode = '42501';
		end if;

		if new.product_id is not null then
			select
				p.name,
				p.name_ar,
				p.unit_of_measure,
				p.unit_of_measure_ar,
				p.price_range_min,
				p.price_range_max,
				p.is_active,
				p.availability_status::text as availability_status
			into catalog_product
			from public.products p
			where p.id = new.product_id;

			if catalog_product.name is null
				or not catalog_product.is_active
				or catalog_product.availability_status in ('hidden', 'out_of_stock')
			then
				raise exception 'product_not_orderable' using errcode = '23514';
			end if;

			new.customer_description := catalog_product.name;
			new.product_name_ar := coalesce(
				nullif(catalog_product.name_ar, ''),
				catalog_product.name
			);
			new.unit_of_measure := catalog_product.unit_of_measure;
			new.unit_of_measure_ar := catalog_product.unit_of_measure_ar;
			new.price_range_min := catalog_product.price_range_min;
			new.price_range_max := catalog_product.price_range_max;
			new.currency := 'EGP';
			new.match_confidence := 1;
			new.is_unmatched := false;
		else
			new.customer_description := left(btrim(coalesce(new.customer_description, '')), 500);
			new.product_name_ar := left(
				btrim(coalesce(new.product_name_ar, new.customer_description)),
				500
			);
			new.unit_of_measure := left(btrim(coalesce(new.unit_of_measure, 'unit')), 80);
			new.unit_of_measure_ar := left(btrim(coalesce(new.unit_of_measure_ar, new.unit_of_measure)), 80);
			if new.customer_description = '' then
				raise exception 'customer_description_required' using errcode = '23514';
			end if;
			if new.product_name_ar = '' then
				new.product_name_ar := new.customer_description;
			end if;
			if new.unit_of_measure = '' then
				new.unit_of_measure := 'unit';
			end if;
			if new.unit_of_measure_ar = '' then
				new.unit_of_measure_ar := new.unit_of_measure;
			end if;
			new.price_range_min := null;
			new.price_range_max := null;
			new.currency := 'EGP';
			new.match_confidence := null;
			new.is_unmatched := true;
		end if;
	end if;

	if btrim(coalesce(new.product_name_ar, '')) = '' then
		new.product_name_ar := new.customer_description;
	end if;

	if btrim(coalesce(new.unit_of_measure_ar, '')) = '' then
		new.unit_of_measure_ar := new.unit_of_measure;
	end if;

	return new;
end;
$$;
