drop function if exists public.service_sales_confirm_order(uuid, text, uuid, uuid);
drop function if exists public.sales_confirm_order(uuid, uuid);

create or replace function public.sales_confirm_order(
	p_order_id uuid,
	p_quote_version_id uuid default null,
	p_approval jsonb default '{}'::jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	source_request public.quote_requests%rowtype;
	created_order public.orders%rowtype;
	confirmed_quote_version_id uuid;
	from_status text;
	quote_total numeric := 0;
	has_outdated_prices boolean := false;
	clean_manager_id text := nullif(btrim(coalesce(p_approval->>'manager_employee_id', p_approval->>'manager_id', '')), '');
	clean_manager_name text := nullif(btrim(coalesce(p_approval->>'manager_name', p_approval->>'approver_name', '')), '');
begin
	employee_id := public.require_panel('sales', true);
	perform app_private.allow_workflow_state_change();

	select * into source_request
	from public.quote_requests
	where id = p_order_id
	for update;

	if source_request.id is null then
		raise exception 'quote_request_not_found' using errcode = '02000';
	end if;

	if source_request.status not in ('assigned', 'submitted', 'saved') then
		raise exception 'invalid_sales_confirm_transition_%', source_request.status using errcode = '23514';
	end if;

	from_status := source_request.status::text;

	select id, total
	into confirmed_quote_version_id, quote_total
	from public.sales_quote_versions
	where quote_request_id = p_order_id
	  and (p_quote_version_id is null or id = p_quote_version_id)
	order by version_number desc
	limit 1;

	if p_quote_version_id is not null and confirmed_quote_version_id is null then
		raise exception 'sales_quote_version_not_found' using errcode = '02000';
	end if;

	if confirmed_quote_version_id is not null then
		has_outdated_prices := app_private.sales_quote_version_has_outdated_prices(
			confirmed_quote_version_id
		);
	else
		has_outdated_prices := app_private.quote_request_has_outdated_prices(p_order_id);
	end if;

	if has_outdated_prices then
		raise exception 'outdated_quote_prices' using
			errcode = '23514',
			hint = 'Request inventory price updates before confirming this order.';
	end if;

	if clean_manager_id is not null
		and clean_manager_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
	then
		raise exception 'invalid_sales_manager_approval' using errcode = '23514';
	end if;

	if confirmed_quote_version_id is not null then
		update public.sales_quote_versions
		set status = 'approved'
		where id = confirmed_quote_version_id;
	end if;

	update public.quote_requests
	set status = 'approved'
	where id = p_order_id
	returning * into source_request;

	insert into public.orders (quote_request_id, customer_id, status, total_amount)
	values (source_request.id, source_request.customer_id, 'confirmed_for_inventory', coalesce(quote_total, 0))
	on conflict (quote_request_id) do update
	set
		customer_id = excluded.customer_id,
		total_amount = excluded.total_amount
	where public.orders.status = 'confirmed_for_inventory'
	returning * into created_order;

	if created_order.id is null then
		select * into created_order
		from public.orders
		where quote_request_id = source_request.id;
	end if;

	perform public.log_activity(
		'quote_request',
		source_request.id,
		'sales_order_confirmed',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'quote_version_id', confirmed_quote_version_id,
			'from_status', from_status,
			'to_status', 'approved',
			'order_status', created_order.status,
			'total_amount', created_order.total_amount,
			'manager_employee_id', clean_manager_id,
			'manager_name', clean_manager_name,
			'approval', case
				when clean_manager_id is not null or clean_manager_name is not null
					then jsonb_build_object(
						'manager_employee_id', clean_manager_id,
						'manager_name', clean_manager_name,
						'source', 'sales_quote_approval'
					)
				else null
			end
		))
	);
	return created_order;
end;
$$;

revoke all on function public.sales_confirm_order(uuid, uuid, jsonb)
	from public, anon, authenticated;

create or replace function public.service_sales_confirm_order(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_quote_version_id uuid default null,
	p_approval jsonb default '{}'::jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_confirm_order(p_order_id, p_quote_version_id, p_approval);
end;
$$;

revoke all on function public.service_sales_confirm_order(uuid, text, uuid, uuid, jsonb)
	from public, anon, authenticated;
grant execute on function public.service_sales_confirm_order(uuid, text, uuid, uuid, jsonb)
	to service_role;

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
		coalesce(
			nullif(ae.details#>>'{approval,manager_name}', ''),
			nullif(ae.details#>>'{manager,manager_name}', ''),
			nullif(ae.details->>'manager_name', ''),
			nullif(ae.details->>'approver_name', ''),
			manager_employee.full_name
		) as manager_label,
		proof_summary.proof_count,
		proof_summary.proof_titles,
		proof_summary.proof_types
	from public.ceo_business_activity_vtable ba
	join public.activity_events ae on ae.id = ba.id
	left join public.employees direct_advisor
		on direct_advisor.id = case
			when coalesce(ae.details->>'advisor_employee_id', ae.details->>'advisor_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then coalesce(ae.details->>'advisor_employee_id', ae.details->>'advisor_id')::uuid
			else null
		end
	left join public.employees proof_advisor
		on proof_advisor.id = case
			when (ae.details#>>'{proof,advisor_id}') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details#>>'{proof,advisor_id}')::uuid
			else null
		end
	left join public.employees manager_employee
		on manager_employee.id = case
			when coalesce(
				ae.details#>>'{approval,manager_employee_id}',
				ae.details#>>'{approval,manager_id}',
				ae.details#>>'{manager,manager_employee_id}',
				ae.details#>>'{manager,manager_id}',
				ae.details->>'manager_employee_id',
				ae.details->>'manager_id',
				ae.details->>'approver_employee_id',
				ae.details->>'approver_id'
			) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then coalesce(
					ae.details#>>'{approval,manager_employee_id}',
					ae.details#>>'{approval,manager_id}',
					ae.details#>>'{manager,manager_employee_id}',
					ae.details#>>'{manager,manager_id}',
					ae.details->>'manager_employee_id',
					ae.details->>'manager_id',
					ae.details->>'approver_employee_id',
					ae.details->>'approver_id'
				)::uuid
			else null
		end
	left join lateral (
		with canonical as (
			select distinct
				pd.id::text as proof_id,
				pd.storage_path,
				coalesce(pd.title, pd.file_name) as proof_label,
				initcap(replace(pd.proof_type, '_', ' ')) as proof_type_label
			from public.activity_event_proofs aep
			join public.proof_documents pd on pd.id = aep.proof_document_id
			where aep.activity_event_id = ae.id
		),
		canonical_refs as (
			select proof_id as reference_value from canonical
			union all
			select storage_path from canonical
			union all
			select concat('proofs/', storage_path) from canonical
			union all
			select concat('storage://proofs/', storage_path) from canonical
		),
		raw_legacy_refs as (
			select nullif(ae.details->>'proof_document_id', '') as reference_value
			union all
			select nullif(ae.details->>'proof_path', '')
			union all
			select nullif(ae.details->>'proof_url', '')
			union all
			select nullif(ae.details#>>'{proof,proof_document_id}', '')
			union all
			select nullif(ae.details#>>'{proof,proof_path}', '')
			union all
			select nullif(ae.details#>>'{proof,proof_url}', '')
			union all
			select nullif(proof_id.value, '')
			from jsonb_array_elements_text(
				case
					when jsonb_typeof(ae.details->'proof_document_ids') = 'array'
						then ae.details->'proof_document_ids'
					else '[]'::jsonb
				end
			) proof_id(value)
			union all
			select nullif(coalesce(
				proof_item.value->>'proof_document_id',
				proof_item.value->>'proof_path',
				proof_item.value->>'proof_url',
				proof_item.value->>'storage_path'
			), '')
			from jsonb_array_elements(
				case
					when jsonb_typeof(ae.details->'proofs') = 'array'
						then ae.details->'proofs'
					else '[]'::jsonb
				end
			) proof_item(value)
		),
		legacy as (
			select distinct
				coalesce(
					nullif(regexp_replace(reference_value, '^.*/', ''), ''),
					reference_value
				) as proof_label,
				'Legacy reference' as proof_type_label
			from raw_legacy_refs
			where reference_value is not null
				and not exists (
					select 1
					from canonical_refs
					where canonical_refs.reference_value = raw_legacy_refs.reference_value
				)
		),
		proofs as (
			select proof_label, proof_type_label from canonical
			union
			select proof_label, proof_type_label from legacy
		)
		select
			count(*)::integer as proof_count,
			string_agg(proof_label, ', ' order by proof_label) as proof_titles,
			string_agg(proof_type_label, ', ' order by proof_type_label) as proof_types
		from proofs
	) proof_summary on true
),
change_candidates as (
	select
		base.*,
		case
			when base.action = 'inventory_price_updated'
				and base.event_details->>'source' = 'supplier_refill'
				then null
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
		case
			when base.action = 'inventory_price_updated'
				and base.event_details->>'source' = 'supplier_refill'
				then null
			else coalesce(
				nullif(base.event_details->>'old_price', ''),
				nullif(base.event_details->>'from_price', ''),
				nullif(base.event_details->>'previous_price', ''),
				nullif(base.event_details->>'old_last_quoted_at', ''),
				nullif(base.event_details->>'old_status', ''),
				nullif(base.event_details->>'from_status', ''),
				nullif(base.from_status, ''),
				nullif(base.event_details->>'old_quantity', ''),
				nullif(base.event_details->>'from_quantity', '')
			)
		end as raw_from_value,
		case
			when base.action = 'inventory_price_updated'
				and base.event_details->>'source' = 'supplier_refill'
				then null
			else coalesce(
				nullif(base.event_details->>'new_price', ''),
				nullif(base.event_details->>'to_price', ''),
				nullif(base.event_details->>'updated_price', ''),
				nullif(base.event_details->>'new_last_quoted_at', ''),
				nullif(base.event_details->>'new_status', ''),
				nullif(base.event_details->>'to_status', ''),
				nullif(base.to_status, ''),
				nullif(base.event_details->>'new_quantity', ''),
				nullif(base.event_details->>'to_quantity', '')
			)
		end as raw_to_value,
		nullif(base.event_details->>'quantity', '') as refill_quantity,
		coalesce(
			nullif(base.event_details->>'unit_cost', ''),
			case
				when base.action = 'inventory_price_updated'
					and base.event_details->>'source' = 'supplier_refill'
					then nullif(base.event_details->>'new_price', '')
				else null
			end
		) as refill_unit_cost
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
		end as to_value,
		case
			when change_candidates.refill_unit_cost ~ '^-?[0-9]+(\.[0-9]+)?$'
				then concat(to_char(change_candidates.refill_unit_cost::numeric, 'FM999G999G999G990D00'), ' LE')
			else null
		end as refill_unit_cost_label
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
				when targets.action = 'supplier_refill_created'
					then concat_ws(
						' ',
						'Started a refill attempt for',
						targets.target_label,
						case
							when targets.refill_quantity is not null then concat('for ', targets.refill_quantity, ' units')
							else null
						end,
						case
							when targets.refill_unit_cost_label is not null then concat('at ', targets.refill_unit_cost_label)
							else null
						end,
						'and sent it to Finance'
					)
				when targets.action = 'inventory_price_updated'
					and targets.event_details->>'source' = 'supplier_refill'
					then concat_ws(
						' ',
						'Recorded refill pricing for',
						targets.target_label,
						case
							when targets.refill_quantity is not null then concat('for ', targets.refill_quantity, ' units')
							else null
						end,
						case
							when targets.refill_unit_cost_label is not null then concat('at ', targets.refill_unit_cost_label)
							else null
						end,
						'before Finance review'
					)
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
				when descriptions.manager_label is not null
					and descriptions.manager_label is distinct from descriptions.actor_label
					and descriptions.manager_label is distinct from descriptions.advisor_label
					then concat('with ', descriptions.manager_label, ' as manager')
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
			'manager', n.manager_label,
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
			'quantity', n.refill_quantity,
			'unit_cost', n.refill_unit_cost,
			'unit_cost_label', n.refill_unit_cost_label,
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
		n.manager_label,
		n.proof_titles,
		n.proof_types,
		n.what_happened,
		n.changed_field,
		n.from_value,
		n.to_value,
		n.refill_quantity,
		n.refill_unit_cost,
		n.refill_unit_cost_label,
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

insert into app_private.ceo_search_refresh_state (id, dirty, dirty_at)
values (true, true, now())
on conflict (id) do update set
	dirty = true,
	dirty_at = excluded.dirty_at;
