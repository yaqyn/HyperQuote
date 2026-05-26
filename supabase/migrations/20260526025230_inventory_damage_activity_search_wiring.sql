create or replace view public.ceo_search_inventory_damage_activity_vtable
with (security_invoker = true)
as
with damage_activity as (
	select
		ae.id,
		ae.action::text as action,
		ae.details,
		ae.created_at,
		coalesce(actor.full_name, 'Employee') as actor_label,
		coalesce(manager_from_details.full_name, manager_from_tx.full_name) as manager_label,
		coalesce(lot.id, lot_from_details.id) as lot_id,
		coalesce(lot.damage_number, lot_from_details.damage_number, ae.details->>'damage_number') as damage_number,
		coalesce(product.name, product_from_details.name, ae.details->>'product_name', 'damaged stock') as product_name,
		coalesce(product.sku, product_from_details.sku, ae.details->>'product_sku') as product_sku,
		coalesce(product.category, product_from_details.category) as product_category,
		coalesce(product.unit_of_measure, product_from_details.unit_of_measure, ae.details->>'unit', 'unit') as unit_label,
		case
			when nullif(ae.details->>'quantity', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
				then (ae.details->>'quantity')::numeric
			else tx.quantity
		end as quantity,
		coalesce(
			case
				when nullif(ae.details->>'original_unit_cost', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
					then (ae.details->>'original_unit_cost')::numeric
				else null
			end,
			lot.original_unit_cost,
			lot_from_details.original_unit_cost
		) as original_unit_cost,
		coalesce(
			case
				when nullif(ae.details->>'recovery_unit_value', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
					then (ae.details->>'recovery_unit_value')::numeric
				else null
			end,
			lot.recovery_unit_value,
			lot_from_details.recovery_unit_value
		) as recovery_unit_value,
		coalesce(
			case
				when nullif(ae.details->>'carrying_value', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
					then (ae.details->>'carrying_value')::numeric
				else null
			end,
			tx.carrying_amount
		) as carrying_value,
		case
			when nullif(ae.details->>'original_value', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
				then (ae.details->>'original_value')::numeric
			else null
		end as original_value,
		case
			when nullif(ae.details->>'write_down_amount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
				then (ae.details->>'write_down_amount')::numeric
			else null
		end as write_down_amount,
		case
			when nullif(ae.details->>'write_down_reversal_amount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
				then (ae.details->>'write_down_reversal_amount')::numeric
			else tx.write_down_reversal_amount
		end as write_down_reversal_amount,
		coalesce(
			case
				when nullif(ae.details->>'amount', '') ~ '^-?[0-9]+(\.[0-9]+)?$'
					then (ae.details->>'amount')::numeric
				else null
			end,
			tx.amount
		) as amount,
		coalesce(ae.details->>'counterparty_name', tx.counterparty_name) as counterparty_name,
		coalesce(ae.details->>'payment_status', tx.payment_status) as payment_status,
		coalesce(ae.details->>'reason', tx.reason, lot.reason, lot_from_details.reason) as reason,
		coalesce(ae.details->>'proof_path', tx.proof_path, lot.proof_path, lot_from_details.proof_path) as proof_path,
		coalesce(ae.details->>'proof_document_id', tx.proof_document_id::text, lot.proof_document_id::text, lot_from_details.proof_document_id::text) as proof_document_id
	from public.activity_events ae
	left join public.employees actor on actor.id = ae.actor_employee_id
	left join public.inventory_damage_transactions tx
		on ae.entity_type = 'inventory_damage_transaction'
		and tx.id = ae.entity_id
	left join public.inventory_damage_lots lot
		on lot.id = coalesce(
			case when ae.entity_type = 'inventory_damage_lot' then ae.entity_id else null end,
			tx.lot_id
		)
	left join public.inventory_damage_lots lot_from_details
		on lot_from_details.id = case
			when (ae.details->>'lot_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details->>'lot_id')::uuid
			else null
		end
	left join public.products product on product.id = coalesce(lot.product_id, lot_from_details.product_id)
	left join public.products product_from_details
		on product_from_details.id = case
			when (ae.details->>'product_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details->>'product_id')::uuid
			else null
		end
	left join public.employees manager_from_tx on manager_from_tx.id = tx.manager_employee_id
	left join public.employees manager_from_details
		on manager_from_details.id = case
			when coalesce(
				ae.details#>>'{approval,manager_employee_id}',
				ae.details->>'manager_employee_id'
			) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then coalesce(
					ae.details#>>'{approval,manager_employee_id}',
					ae.details->>'manager_employee_id'
				)::uuid
			else null
		end
	where public.can_access_ceo_search()
	  and ae.action in (
		'inventory_damage_recorded',
		'inventory_damage_sold',
		'inventory_damage_disposed',
		'inventory_damage_reversed'
	  )
),
formatted as (
	select
		damage_activity.*,
		case
			when quantity is null then null
			else concat(
				regexp_replace(
					regexp_replace(
						trim(to_char(quantity, 'FM999G999G999G990D999')),
						'0+$',
						''
					),
					'[.,]$',
					''
				),
				' ',
				unit_label
			)
		end as quantity_label,
		case
			when original_unit_cost is null then null
			else concat(to_char(original_unit_cost, 'FM999G999G999G990D00'), ' EGP')
		end as original_unit_cost_label,
		case
			when recovery_unit_value is null then null
			else concat(to_char(recovery_unit_value, 'FM999G999G999G990D00'), ' EGP')
		end as recovery_unit_value_label,
		case
			when original_value is null then null
			else concat(to_char(original_value, 'FM999G999G999G990D00'), ' EGP')
		end as original_value_label,
		case
			when carrying_value is null then null
			else concat(to_char(carrying_value, 'FM999G999G999G990D00'), ' EGP')
		end as carrying_value_label,
		case
			when write_down_amount is null then null
			else concat(to_char(write_down_amount, 'FM999G999G999G990D00'), ' EGP')
		end as write_down_amount_label,
		case
			when write_down_reversal_amount is null or write_down_reversal_amount = 0 then null
			else concat(to_char(write_down_reversal_amount, 'FM999G999G999G990D00'), ' EGP')
		end as write_down_reversal_amount_label,
		case
			when amount is null then null
			else concat(to_char(amount, 'FM999G999G999G990D00'), ' EGP')
		end as amount_label,
		to_char(created_at at time zone 'Africa/Cairo', 'FMMonth FMDD, YYYY, HH12:MI AM') as when_label
	from damage_activity
),
descriptions as (
	select
		formatted.*,
		case action
			when 'inventory_damage_recorded' then concat_ws(
				' ',
				'Marked',
				quantity_label,
				'of',
				product_name,
				'as damaged',
				case when damage_number is not null then concat('under ', damage_number) else null end,
				case when write_down_amount_label is not null then concat('with ', write_down_amount_label, ' write-down') else null end
			)
			when 'inventory_damage_sold' then concat_ws(
				' ',
				'Sold',
				quantity_label,
				'of damaged',
				product_name,
				case when damage_number is not null then concat('from ', damage_number) else null end,
				case when counterparty_name is not null then concat('to ', counterparty_name) else null end,
				case when amount_label is not null then concat('for ', amount_label) else null end
			)
			when 'inventory_damage_disposed' then concat_ws(
				' ',
				'Disposed',
				quantity_label,
				'of damaged',
				product_name,
				case when damage_number is not null then concat('from ', damage_number) else null end,
				case when carrying_value_label is not null then concat('removing ', carrying_value_label, ' NRV') else null end
			)
			when 'inventory_damage_reversed' then concat_ws(
				' ',
				'Restored',
				quantity_label,
				'of',
				product_name,
				'from damaged stock',
				case when damage_number is not null then concat('under ', damage_number) else null end,
				case when write_down_reversal_amount_label is not null then concat('reversing ', write_down_reversal_amount_label, ' write-down') else null end
			)
			else public.ceo_activity_action_label(action::public.audit_event_type)
		end as what_happened
	from formatted
),
narratives as (
	select
		descriptions.*,
		concat_ws(
			' ',
			actor_label,
			'from Inventory',
			lower(left(what_happened, 1)) || substr(what_happened, 2),
			case
				when manager_label is not null and manager_label is distinct from actor_label
					then concat('with ', manager_label, ' as manager')
				else null
			end,
			case when proof_path is not null or proof_document_id is not null then 'with proof' else null end,
			'on',
			when_label
		) as activity_sentence
	from descriptions
)
select
	'activity'::text as entity_type,
	n.id::text as entity_id,
	n.activity_sentence as title,
	'Inventory'::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'action', n.action,
		'action_label', public.ceo_activity_action_label(n.action::public.audit_event_type),
		'area', 'Inventory',
		'department', 'Inventory',
		'headline', n.activity_sentence,
		'activity_sentence', n.activity_sentence,
		'who', n.actor_label,
		'what', n.what_happened,
		'when', n.when_label,
		'actor', n.actor_label,
		'actor_type', 'Employee',
		'source', 'activity_inventory_damage',
		'target', n.product_name,
		'product', n.product_name,
		'product_sku', n.product_sku,
		'product_category', n.product_category,
		'damage_number', n.damage_number,
		'lot_id', n.lot_id,
		'quantity', n.quantity_label,
		'unit', n.unit_label,
		'original_unit_cost', n.original_unit_cost,
		'recovery_unit_value', n.recovery_unit_value,
		'original_value', n.original_value,
		'carrying_value', n.carrying_value,
		'write_down_amount', n.write_down_amount,
		'write_down_reversal_amount', nullif(n.write_down_reversal_amount, 0),
		'amount', n.amount,
		'buyer', n.counterparty_name,
		'counterparty_name', n.counterparty_name,
		'payment_status', n.payment_status,
		'manager', n.manager_label,
		'reason', n.reason,
		'proof_path', n.proof_path,
		'proof_document_id', n.proof_document_id,
		'proofs', case when n.proof_path is not null then n.proof_path else null end,
		'proof_count', case when n.proof_path is not null or n.proof_document_id is not null then 1 else null end,
		'created_at', n.created_at
	)) as metadata,
	n.created_at as sort_at,
	concat_ws(
		' ',
		'activity inventory damaged stock damage write down nrv asset proof',
		n.action,
		n.activity_sentence,
		n.actor_label,
		n.manager_label,
		n.damage_number,
		n.product_name,
		n.product_sku,
		n.product_category,
		n.quantity_label,
		n.original_unit_cost_label,
		n.recovery_unit_value_label,
		n.original_value_label,
		n.carrying_value_label,
		n.write_down_amount_label,
		n.write_down_reversal_amount_label,
		n.amount_label,
		n.counterparty_name,
		n.payment_status,
		n.reason,
		n.proof_path,
		public.ceo_search_date_terms(n.created_at)
	) as search_text
from narratives n;

revoke all privileges on public.ceo_search_inventory_damage_activity_vtable
	from anon, authenticated, public;

create or replace function app_private.refresh_ceo_search_documents()
returns integer
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
declare
	base_count integer := 0;
	damage_count integer := 0;
	search_user_id uuid;
begin
	base_count := app_private.refresh_ceo_search_documents_without_damage();

	select e.user_id into search_user_id
	from public.employees e
	where e.status = 'active'
	  and e.user_id is not null
	  and (
		e.is_ceo
		or exists (
			select 1
			from public.employee_roles er
			where er.employee_id = e.id
			  and er.role in ('ceo', 'admin')
		)
	  )
	order by e.is_ceo desc, e.created_at
	limit 1;

	if search_user_id is null then
		return base_count;
	end if;

	perform set_config('request.jwt.claim.sub', search_user_id::text, true);
	perform set_config(
		'request.jwt.claims',
		jsonb_build_object('sub', search_user_id::text, 'role', 'authenticated')::text,
		true
	);

	with source_rows as materialized (
		select
			source_candidates.entity_type,
			source_candidates.entity_id,
			coalesce(source_candidates.title, source_candidates.entity_type) as title,
			source_candidates.subtitle,
			coalesce(source_candidates.metadata, '{}'::jsonb) as metadata,
			source_candidates.sort_at,
			coalesce(source_candidates.search_text, '') as search_text,
			to_tsvector(
				'simple'::regconfig,
				concat_ws(
					' ',
					source_candidates.entity_type,
					source_candidates.entity_id,
					source_candidates.title,
					source_candidates.subtitle,
					source_candidates.search_text,
					source_candidates.metadata::text
				)
			) as search_vector
		from (
			select * from public.ceo_search_finance_damage_vtable
			union all
			select * from public.ceo_search_inventory_damage_activity_vtable
		) source_candidates
	),
	upserted as (
		insert into public.ceo_search_documents (
			entity_type,
			entity_id,
			title,
			subtitle,
			metadata,
			sort_at,
			search_text,
			search_vector,
			refreshed_at
		)
		select
			entity_type,
			entity_id,
			title,
			subtitle,
			metadata,
			sort_at,
			search_text,
			search_vector,
			now()
		from source_rows
		on conflict (entity_type, entity_id) do update set
			title = excluded.title,
			subtitle = excluded.subtitle,
			metadata = excluded.metadata,
			sort_at = excluded.sort_at,
			search_text = excluded.search_text,
			search_vector = excluded.search_vector,
			refreshed_at = excluded.refreshed_at
		where public.ceo_search_documents.title is distinct from excluded.title
		   or public.ceo_search_documents.subtitle is distinct from excluded.subtitle
		   or public.ceo_search_documents.metadata is distinct from excluded.metadata
		   or public.ceo_search_documents.sort_at is distinct from excluded.sort_at
		   or public.ceo_search_documents.search_text is distinct from excluded.search_text
		   or public.ceo_search_documents.search_vector is distinct from excluded.search_vector
		returning 1
	),
	deleted as (
		delete from public.ceo_search_documents documents
		where (
			(
				documents.entity_type = 'finance'
				and documents.metadata->>'source' in (
					'finance_inventory_damage_lot',
					'finance_inventory_damage_transaction'
				)
			)
			or (
				documents.entity_type = 'activity'
				and documents.metadata->>'source' = 'activity_inventory_damage'
			)
		)
		  and not exists (
			select 1
			from source_rows
			where source_rows.entity_type = documents.entity_type
			  and source_rows.entity_id = documents.entity_id
		  )
		returning 1
	)
	select count(*)::integer into damage_count
	from source_rows;

	return base_count + damage_count;
end;
$$;

revoke all privileges on function app_private.refresh_ceo_search_documents()
	from anon, authenticated, public;

create or replace function app_private.assert_ai_read_scope(
	p_agent_scope public.ai_agent_scope,
	p_read_entities text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
	read_entity text;
	entity text;
	employee_allowed_vtables text[] := array[
		'ceo_search_order_vtable',
		'ceo_search_quote_request_vtable',
		'ceo_search_customer_vtable',
		'ceo_search_payment_vtable',
		'ceo_search_finance_vtable',
		'ceo_search_finance_damage_vtable',
		'ceo_search_inventory_damage_activity_vtable',
		'ceo_search_approval_vtable',
		'ceo_search_inventory_vtable',
		'ceo_search_pricing_vtable',
		'ceo_search_category_vtable',
		'ceo_search_warehouse_vtable',
		'ceo_search_receiving_vtable',
		'ceo_search_dispatch_vtable',
		'ceo_search_driver_vtable',
		'ceo_search_driver_location_vtable',
		'ceo_search_support_vtable',
		'ceo_search_support_message_vtable',
		'ceo_search_supplier_vtable',
		'ceo_search_sales_history_vtable',
		'ceo_search_document_vtable'
	];
begin
	foreach read_entity in array coalesce(p_read_entities, '{}')
	loop
		entity := lower(btrim(read_entity));
		if entity = '' then
			continue;
		end if;

		if p_agent_scope = 'website' and entity not in ('website_index', 'public_docs', 'published_catalog') then
			raise exception 'website_ai_read_scope_denied' using errcode = '42501';
		end if;

		if p_agent_scope = 'portal' and entity not in (
			'active_draft',
			'activity_events',
			'customer_addresses',
			'customer_delivery_tracking',
			'customer_docs',
			'customer_documents',
			'customer_drafts',
			'customer_orders',
			'customer_profile',
			'customer_quote_requests',
			'projects',
			'public_docs',
			'published_products'
		) then
			raise exception 'portal_ai_read_scope_denied' using errcode = '42501';
		end if;

		if p_agent_scope = 'employee' then
			if entity in (
				'ceo_search_employee_vtable',
				'ceo_employee_summary',
				'employee',
				'employees',
				'staff',
				'team',
				'salary',
				'salaries',
				'employee_salary',
				'ceo_search_finance_payroll_vtable',
				'finance_payroll',
				'payroll',
				'social_insurance',
				'ceo_search_activity_vtable',
				'ceo_activity_summary',
				'activity',
				'activities',
				'audit_activity',
				'activity_history',
				'ceo_search_index',
				'raw_export',
				'secrets',
				'tokens'
			) then
				raise exception 'employee_ai_read_scope_denied' using errcode = '42501';
			end if;
			if entity like 'ceo_%' or entity like 'search_%' then
				if entity <> all(employee_allowed_vtables) then
					raise exception 'employee_ai_read_scope_denied' using errcode = '42501';
				end if;
			end if;
			if entity in ('finance', 'customer_payments', 'supplier_payments', 'private_finance') and not public.can_access_panel('finance') then
				raise exception 'employee_ai_finance_scope_denied' using errcode = '42501';
			end if;
			if entity in ('inventory', 'inventory_stock', 'supplier_costs') and not public.can_access_panel('inventory') then
				raise exception 'employee_ai_inventory_scope_denied' using errcode = '42501';
			end if;
			if entity in ('warehouse', 'loading_tasks', 'receiving_tasks') and not public.can_access_panel('warehouse') then
				raise exception 'employee_ai_warehouse_scope_denied' using errcode = '42501';
			end if;
			if entity in ('dispatch', 'deliveries', 'driver_locations') and not public.can_access_panel('dispatch') then
				raise exception 'employee_ai_dispatch_scope_denied' using errcode = '42501';
			end if;
			if entity in ('admin', 'employees', 'roles', 'exports') and not public.can_access_panel('admin') then
				raise exception 'employee_ai_admin_scope_denied' using errcode = '42501';
			end if;
		end if;

		if p_agent_scope = 'search' and entity not like 'ceo_%' and entity <> 'ceo_search_index' then
			raise exception 'search_ai_read_scope_denied' using errcode = '42501';
		end if;
	end loop;
end;
$$;

revoke all on function app_private.assert_ai_read_scope(public.ai_agent_scope, text[]) from public;

insert into app_private.ceo_search_refresh_state (id, dirty, dirty_at)
values (true, true, now())
on conflict (id) do update set
	dirty = true,
	dirty_at = excluded.dirty_at;
