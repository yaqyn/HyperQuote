create or replace function public.create_supplier_refill(
	p_product_id uuid,
	p_supplier_id uuid,
	p_quantity numeric,
	p_unit_cost numeric,
	p_proof jsonb default '{}'::jsonb
)
returns public.refill_requests
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	created_refill public.refill_requests%rowtype;
	old_price numeric;
	price_update_id uuid;
	proof_path text;
	target_product public.products%rowtype;
	target_supplier public.suppliers%rowtype;
begin
	employee_id := public.require_panel('inventory', true);

	if p_quantity is null or p_quantity <= 0 then
		raise exception 'invalid_refill_quantity' using errcode = '23514';
	end if;
	if p_unit_cost is null or p_unit_cost <= 0 then
		raise exception 'invalid_refill_unit_cost' using errcode = '23514';
	end if;
	if p_proof is null
		or p_proof = '{}'::jsonb
		or btrim(coalesce(p_proof->>'supplier_name', '')) = ''
		or btrim(coalesce(p_proof->>'proof_path', p_proof->>'proof_url', '')) = ''
	then
		raise exception 'supplier_refill_proof_required' using errcode = '23514';
	end if;

	proof_path := btrim(coalesce(p_proof->>'proof_path', p_proof->>'proof_url'));

	select * into target_product
	from public.products
	where id = p_product_id
	  and is_active
	  and is_stockable
	for update;

	if target_product.id is null then
		raise exception 'product_not_found_or_not_stockable' using errcode = '02000';
	end if;

	select * into target_supplier
	from public.suppliers
	where id = p_supplier_id
	  and status = 'active';

	if target_supplier.id is null then
		raise exception 'supplier_not_found_or_inactive' using errcode = '02000';
	end if;

	if not app_private.supplier_can_supply_product(p_supplier_id, p_product_id) then
		raise exception 'supplier_not_assigned_to_product' using errcode = '42501';
	end if;

	select raw_cost into old_price
	from public.supplier_product_links
	where product_id = p_product_id
	  and supplier_id = p_supplier_id;

	if old_price is null then
		old_price := target_product.price_range_min;
	end if;

	insert into public.refill_requests (
		product_id,
		supplier_id,
		requested_by_employee_id,
		quantity,
		unit_cost,
		proof
	)
	values (p_product_id, p_supplier_id, employee_id, p_quantity, p_unit_cost, p_proof)
	returning * into created_refill;

	perform set_config('app.audited_registry_write', 'on', true);

	update public.supplier_product_links
	set is_primary = false
	where product_id = p_product_id
	  and supplier_id <> p_supplier_id;

	insert into public.supplier_product_links (
		product_id,
		supplier_id,
		raw_cost,
		last_quoted_at,
		is_primary
	)
	values (p_product_id, p_supplier_id, p_unit_cost, now(), true)
	on conflict (supplier_id, product_id) do update
	set
		raw_cost = excluded.raw_cost,
		last_quoted_at = excluded.last_quoted_at,
		is_primary = true,
		updated_at = now();

	update public.products
	set
		price_range_min = p_unit_cost,
		price_range_max = p_unit_cost,
		updated_at = now()
	where id = p_product_id;

	insert into public.price_updates (
		product_id,
		supplier_id,
		updated_by_employee_id,
		old_price,
		new_price,
		proof_path,
		notes
	)
	values (
		p_product_id,
		p_supplier_id,
		employee_id,
		old_price,
		p_unit_cost,
		proof_path,
		coalesce(nullif(btrim(p_proof->>'notes'), ''), 'Supplier refill price update')
	)
	returning id into price_update_id;

	perform public.log_activity(
		'price_update',
		price_update_id,
		'inventory_price_updated',
		jsonb_build_object(
			'product_id', p_product_id,
			'supplier_id', p_supplier_id,
			'employee_id', employee_id,
			'old_price', old_price,
			'new_price', p_unit_cost,
			'proof_path', proof_path,
			'source', 'supplier_refill'
		)
	);

	perform public.log_activity(
		'refill_request',
		created_refill.id,
		'supplier_refill_created',
		jsonb_build_object(
			'product_id', p_product_id,
			'supplier_id', p_supplier_id,
			'employee_id', employee_id,
			'quantity', p_quantity,
			'unit_cost', p_unit_cost,
			'from_status', null,
			'to_status', 'finance_pending',
			'proof_path', proof_path
		)
	);
	return created_refill;
end;
$$;

grant execute on function public.create_supplier_refill(uuid, uuid, numeric, numeric, jsonb) to authenticated;

create or replace view public.ceo_search_activity_vtable
with (security_invoker = true)
as
with base as (
	select
		ba.*,
		ae.details as event_details,
		coalesce(
			nullif(ae.details#>>'{proof,advisor_name}', ''),
			nullif(ae.details->>'advisor_name', ''),
			proof_advisor.full_name,
			direct_advisor.full_name
		) as advisor_label,
		proof_summary.proof_count,
		proof_summary.proof_titles,
		proof_summary.proof_types
	from public.ceo_business_activity_vtable ba
	join public.activity_events ae on ae.id = ba.id
	left join public.employees direct_advisor
		on direct_advisor.id = case
			when (ae.details->>'advisor_employee_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details->>'advisor_employee_id')::uuid
			else null
		end
	left join public.employees proof_advisor
		on proof_advisor.id = case
			when (ae.details#>>'{proof,advisor_id}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details#>>'{proof,advisor_id}')::uuid
			else null
		end
	left join lateral (
		select
			count(*)::integer as proof_count,
			string_agg(proof_label, ', ' order by proof_label) as proof_titles,
			string_agg(proof_type_label, ', ' order by proof_type_label) as proof_types
		from (
			select distinct
				coalesce(pd.title, pd.file_name) as proof_label,
				initcap(replace(pd.proof_type, '_', ' ')) as proof_type_label
			from public.activity_event_proofs aep
			join public.proof_documents pd on pd.id = aep.proof_document_id
			where aep.activity_event_id = ae.id
		) proofs
	) proof_summary on true
),
change_candidates as (
	select
		base.*,
		case
			when nullif(base.event_details->>'old_price', '') is not null
				or nullif(base.event_details->>'new_price', '') is not null
				or nullif(base.event_details->>'from_price', '') is not null
				or nullif(base.event_details->>'to_price', '') is not null
				or nullif(base.event_details->>'previous_price', '') is not null
				or nullif(base.event_details->>'updated_price', '') is not null
				then 'Price'
			when nullif(base.event_details->>'old_last_quoted_at', '') is not null
				or nullif(base.event_details->>'new_last_quoted_at', '') is not null
				then 'Price freshness'
			when nullif(base.from_status, '') is not null
				or nullif(base.to_status, '') is not null
				or nullif(base.event_details->>'old_status', '') is not null
				or nullif(base.event_details->>'new_status', '') is not null
				or nullif(base.event_details->>'from_status', '') is not null
				or nullif(base.event_details->>'to_status', '') is not null
				then 'Status'
			when nullif(base.event_details->>'old_quantity', '') is not null
				or nullif(base.event_details->>'new_quantity', '') is not null
				or nullif(base.event_details->>'from_quantity', '') is not null
				or nullif(base.event_details->>'to_quantity', '') is not null
				then 'Quantity'
			else null
		end as changed_field,
		coalesce(
			nullif(base.event_details->>'old_price', ''),
			nullif(base.event_details->>'from_price', ''),
			nullif(base.event_details->>'previous_price', ''),
			nullif(base.event_details->>'old_last_quoted_at', ''),
			nullif(base.event_details->>'old_status', ''),
			nullif(base.event_details->>'from_status', ''),
			nullif(base.from_status, ''),
			nullif(base.event_details->>'old_quantity', ''),
			nullif(base.event_details->>'from_quantity', '')
		) as raw_from_value,
		coalesce(
			nullif(base.event_details->>'new_price', ''),
			nullif(base.event_details->>'to_price', ''),
			nullif(base.event_details->>'updated_price', ''),
			nullif(base.event_details->>'new_last_quoted_at', ''),
			nullif(base.event_details->>'new_status', ''),
			nullif(base.event_details->>'to_status', ''),
			nullif(base.to_status, ''),
			nullif(base.event_details->>'new_quantity', ''),
			nullif(base.event_details->>'to_quantity', '')
		) as raw_to_value
	from base
),
formatted_changes as (
	select
		change_candidates.*,
		case
			when change_candidates.raw_from_value is null then null
			when change_candidates.raw_from_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then null
			when change_candidates.changed_field = 'Price'
				and change_candidates.raw_from_value ~ '^-?[0-9]+(\.[0-9]+)?$'
				then concat(to_char(change_candidates.raw_from_value::numeric, 'FM999G999G999G990D00'), ' LE')
			when change_candidates.changed_field = 'Price freshness'
				and change_candidates.raw_from_value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
				then to_char(change_candidates.raw_from_value::timestamptz at time zone 'Africa/Cairo', 'FMMonth FMDD, YYYY, HH12:MI AM')
			when change_candidates.changed_field = 'Status'
				then initcap(replace(change_candidates.raw_from_value, '_', ' '))
			else change_candidates.raw_from_value
		end as from_value,
		case
			when change_candidates.raw_to_value is null then null
			when change_candidates.raw_to_value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then null
			when change_candidates.changed_field = 'Price'
				and change_candidates.raw_to_value ~ '^-?[0-9]+(\.[0-9]+)?$'
				then concat(to_char(change_candidates.raw_to_value::numeric, 'FM999G999G999G990D00'), ' LE')
			when change_candidates.changed_field = 'Price freshness'
				and change_candidates.raw_to_value ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
				then to_char(change_candidates.raw_to_value::timestamptz at time zone 'Africa/Cairo', 'FMMonth FMDD, YYYY, HH12:MI AM')
			when change_candidates.changed_field = 'Status'
				then initcap(replace(change_candidates.raw_to_value, '_', ' '))
			else change_candidates.raw_to_value
		end as to_value
	from change_candidates
),
targets as (
	select
		formatted_changes.*,
		coalesce(
			nullif(formatted_changes.target, ''),
			nullif(formatted_changes.product_name, ''),
			nullif(formatted_changes.order_number, ''),
			nullif(formatted_changes.request_number, ''),
			nullif(formatted_changes.quote_number, ''),
			nullif(formatted_changes.delivery_number, ''),
			nullif(formatted_changes.customer_name, ''),
			nullif(formatted_changes.supplier_name, ''),
			nullif(initcap(replace(formatted_changes.source_entity_type, '_', ' ')), ''),
			'the record'
		) as target_label,
		to_char(formatted_changes.created_at at time zone 'Africa/Cairo', 'FMMonth FMDD, YYYY, HH12:MI AM') as when_label
	from formatted_changes
),
descriptions as (
	select
		targets.*,
		coalesce(
			case
				when targets.changed_field = 'Price'
					and targets.from_value is not null
					and targets.to_value is not null
					then concat('Changed price of ', targets.target_label, ' from ', targets.from_value, ' to ', targets.to_value)
				when targets.changed_field = 'Price freshness'
					and targets.from_value is not null
					and targets.to_value is not null
					then concat('Marked price freshness for ', targets.target_label, ' from ', targets.from_value, ' to ', targets.to_value)
				when targets.changed_field = 'Status'
					and targets.from_value is not null
					and targets.to_value is not null
					then concat('Changed status of ', targets.target_label, ' from ', targets.from_value, ' to ', targets.to_value)
				when targets.changed_field is not null
					and targets.from_value is not null
					and targets.to_value is not null
					then concat('Changed ', lower(targets.changed_field), ' of ', targets.target_label, ' from ', targets.from_value, ' to ', targets.to_value)
				when targets.action = 'price_update_requested'
					then concat('Requested a price update for ', targets.target_label)
				else null
			end,
			case
				when targets.actor_label is not null
					and left(targets.headline, char_length(targets.actor_label) + 1) = concat(targets.actor_label, ' ')
					then nullif(substr(targets.headline, char_length(targets.actor_label) + 2), '')
				else nullif(targets.headline, '')
			end,
			targets.action_label
		) as what_happened
	from targets
),
narratives as (
	select
		descriptions.*,
		concat_ws(
			' ',
			nullif(descriptions.actor_label, ''),
			case
				when descriptions.actor_type = 'Employee'
					and nullif(descriptions.area, '') is not null
					then concat('from ', descriptions.area)
				else null
			end,
			case
				when descriptions.what_happened is not null
					then concat(lower(left(descriptions.what_happened, 1)), substr(descriptions.what_happened, 2))
				else null
			end,
			case
				when descriptions.advisor_label is not null
					and descriptions.advisor_label is distinct from descriptions.actor_label
					then concat('with ', descriptions.advisor_label, ' as advisor')
				else null
			end,
			case
				when coalesce(descriptions.proof_count, 0) > 0
					then concat('with ', descriptions.proof_count::text, case when descriptions.proof_count = 1 then ' proof document' else ' proof documents' end)
				else null
			end,
			case when descriptions.when_label is not null then 'on' else null end,
			descriptions.when_label
		) as activity_sentence
	from descriptions
)
select
	'activity'::text as entity_type,
	n.id::text as entity_id,
	coalesce(nullif(n.activity_sentence, ''), n.headline) as title,
	n.area as subtitle,
	jsonb_strip_nulls(
		jsonb_build_object(
			'action', n.action,
			'action_label', n.action_label,
			'area', n.area,
			'department', case when n.actor_type = 'Employee' then n.area else null end,
			'headline', n.headline,
			'activity_sentence', n.activity_sentence,
			'who', n.actor_label,
			'what', n.what_happened,
			'when', n.when_label,
			'changed_field', n.changed_field,
			'from_value', n.from_value,
			'to_value', n.to_value,
			'advisor', n.advisor_label,
			'proofs', n.proof_titles,
			'proof_count', nullif(n.proof_count, 0),
			'proof_types', n.proof_types,
			'actor', n.actor_label,
			'actor_type', n.actor_type,
			'source', n.source,
			'target', n.target_label,
			'customer', n.customer_name,
			'contact', n.customer_contact,
			'phone', n.customer_phone,
			'email', n.customer_email
		) ||
		jsonb_build_object(
			'request_number', n.request_number,
			'order_number', n.order_number,
			'quote_number', n.quote_number,
			'delivery_number', n.delivery_number,
			'delivery_address', n.delivery_address,
			'items', n.item_summary,
			'product', n.product_name,
			'product_sku', n.product_sku,
			'product_category', n.product_category,
			'supplier', n.supplier_name,
			'driver', n.driver_name,
			'driver_phone', n.driver_phone,
			'truck', n.truck_plate,
			'truck_type', n.truck_type,
			'support_reference', n.support_reference,
			'support_subject', n.support_subject,
			'role', n.role,
			'scope', n.scope,
			'row_count', n.row_count,
			'contact_channel', n.contact_channel,
			'from_status', n.from_status,
			'to_status', n.to_status,
			'reason', n.reason,
			'outcome', n.outcome,
			'notes', n.notes,
			'follow_up_state', n.follow_up_state,
			'follow_up_due_at', n.follow_up_due_at,
			'amount', n.amount,
			'payment_fraction', n.payment_fraction,
			'total_amount', n.total_amount,
			'created_at', n.created_at
		)
	) as metadata,
	n.created_at as sort_at,
	concat_ws(
		' ',
		'activity',
		n.area,
		n.action,
		n.action_label,
		n.headline,
		n.activity_sentence,
		n.actor_label,
		n.actor_type,
		n.advisor_label,
		n.proof_titles,
		n.proof_types,
		n.what_happened,
		n.changed_field,
		n.from_value,
		n.to_value,
		n.source,
		n.target_label,
		n.customer_name,
		n.customer_contact,
		n.customer_phone,
		n.customer_email,
		n.request_number,
		n.order_number,
		n.quote_number,
		n.delivery_number,
		n.delivery_address,
		n.item_summary,
		n.product_name,
		n.product_sku,
		n.product_category,
		n.supplier_name,
		n.driver_name,
		n.driver_phone,
		n.truck_plate,
		n.truck_type,
		n.support_reference,
		n.support_subject,
		n.role,
		n.scope,
		n.row_count::text,
		n.contact_channel,
		n.from_status,
		n.to_status,
		n.reason,
		n.outcome,
		n.notes,
		n.follow_up_state,
		n.follow_up_due_at::text,
		n.amount::text,
		n.payment_fraction::text,
		n.total_amount::text,
		public.ceo_search_date_terms(n.created_at)
	) as search_text
from narratives n;

select app_private.refresh_ceo_search_documents_if_dirty(true);
