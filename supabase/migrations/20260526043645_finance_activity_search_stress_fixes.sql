create or replace function public.finance_create_adjustment(
	p_adjustment_type text,
	p_category text,
	p_description text,
	p_amount numeric,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.finance_adjustments
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	created_adjustment public.finance_adjustments%rowtype;
	clean_type text := lower(btrim(coalesce(p_adjustment_type, '')));
	clean_category text := btrim(coalesce(p_category, ''));
	clean_description text := btrim(coalesce(p_description, ''));
	clean_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
begin
	employee_id := public.require_panel('finance', true);

	if clean_type not in (
		'company_expense',
		'damage',
		'refund',
		'write_off',
		'credit_adjustment',
		'debit_adjustment'
	) then
		raise exception 'invalid_finance_adjustment_type' using errcode = '23514';
	end if;
	if length(clean_category) < 2 then
		raise exception 'finance_adjustment_category_required' using errcode = '23514';
	end if;
	if length(clean_description) < 5 then
		raise exception 'finance_adjustment_description_required' using errcode = '23514';
	end if;
	if p_amount is null or p_amount <= 0 then
		raise exception 'finance_adjustment_amount_required' using errcode = '23514';
	end if;

	insert into public.finance_adjustments (
		adjustment_type,
		category,
		description,
		amount,
		proof_document_id,
		proof_path,
		created_by_employee_id
	)
	values (
		clean_type::public.finance_adjustment_type,
		clean_category,
		clean_description,
		round(p_amount, 2),
		p_proof_document_id,
		clean_proof_path,
		employee_id
	)
	returning * into created_adjustment;

	perform public.log_activity(
		'finance_adjustment',
		created_adjustment.id,
		'finance_adjustment_created',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'adjustment_type', created_adjustment.adjustment_type,
			'category', created_adjustment.category,
			'description', created_adjustment.description,
			'amount', created_adjustment.amount,
			'status', created_adjustment.status,
			'proof_document_id', p_proof_document_id,
			'proof_path', clean_proof_path
		))
	);

	return created_adjustment;
end;
$$;

create or replace function app_private.keep_only_business_activity_events()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if new.action in (
		'finance_adjustment_created',
		'finance_salary_updated',
		'finance_payroll_paid',
		'finance_bonus_paid',
		'driver_fuel_receipt_submitted',
		'finance_fuel_expense_posted',
		'finance_company_asset_recorded',
		'finance_company_asset_revalued',
		'finance_company_asset_disposed'
	) then
		return new;
	end if;

	if public.is_important_activity(new.action, new.entity_type, new.details) then
		return new;
	end if;

	return null;
end;
$$;

create or replace function public.ceo_activity_money_label(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
	select case
		when nullif(btrim(coalesce(p_value, '')), '') is null then null
		when btrim(p_value) ~ '^-?[0-9]+(\.[0-9]+)?$'
			then concat('EGP ', to_char(btrim(p_value)::numeric, 'FM999G999G999G990D00'))
		else btrim(p_value)
	end
$$;

grant execute on function public.ceo_activity_money_label(text) to authenticated;

create or replace view public.ceo_search_finance_activity_vtable
with (security_invoker = true)
as
with finance_activity as (
	select
		ae.id,
		ae.entity_type as source_entity_type,
		ae.entity_id as source_entity_id,
		ae.action::text as action,
		ae.details,
		ae.created_at,
		coalesce(actor_employee.full_name, actor_driver.full_name, 'System') as actor_label,
		case
			when actor_employee.id is not null then 'Employee'
			when actor_driver.id is not null then 'Driver'
			else 'System'
		end as actor_type,
		coalesce(
			nullif(ae.details->>'paid_employee_name', ''),
			nullif(ae.details->>'employee_name', ''),
			nullif(ae.details->>'truck_plate', ''),
			nullif(ae.details->>'driver_name', ''),
			nullif(ae.details->>'name', ''),
			nullif(ae.details->>'asset_number', ''),
			nullif(ae.details->>'category', ''),
			initcap(replace(ae.entity_type, '_', ' '))
		) as target_label,
		case
			when ae.details->>'period_month' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
				then to_char((ae.details->>'period_month')::date, 'YYYY-MM')
			else nullif(ae.details->>'period_month', '')
		end as period_label,
		public.ceo_activity_money_label(ae.details->>'amount') as amount_label,
		public.ceo_activity_money_label(ae.details->>'old_base_salary') as old_base_salary_label,
		public.ceo_activity_money_label(ae.details->>'new_base_salary') as new_base_salary_label,
		public.ceo_activity_money_label(ae.details->>'acquisition_cost') as acquisition_cost_label,
		nullif(
			regexp_replace(
				coalesce(
					nullif(ae.details->>'proof_path', ''),
					nullif(ae.details->>'proof_url', ''),
					nullif(ae.details#>>'{proof,proof_path}', ''),
					nullif(ae.details#>>'{proof,proof_url}', ''),
					nullif(fuel_expense.receipt_file_name, '')
				),
				'^.*/',
				''
			),
			''
		) as proof_label
	from public.activity_events ae
	left join public.employees actor_employee on actor_employee.id = ae.actor_employee_id
	left join public.drivers actor_driver on actor_driver.id = ae.actor_driver_id
	left join public.truck_fuel_expenses fuel_expense
		on fuel_expense.id = case
			when ae.entity_type = 'truck_fuel_expense' then ae.entity_id
			else null
		end
	where public.can_access_ceo_search()
	  and ae.action in (
		'finance_adjustment_created',
		'finance_salary_updated',
		'finance_payroll_paid',
		'finance_bonus_paid',
		'driver_fuel_receipt_submitted',
		'finance_fuel_expense_posted',
		'finance_company_asset_recorded',
		'finance_company_asset_revalued',
		'finance_company_asset_disposed'
	  )
),
descriptions as (
	select
		finance_activity.*,
		case
			when action = 'finance_salary_updated' then concat_ws(
				' ',
				'Updated salary for',
				target_label,
				case
					when old_base_salary_label is not null and new_base_salary_label is not null
						then concat('from ', old_base_salary_label, ' to ', new_base_salary_label)
					when new_base_salary_label is not null
						then concat('to ', new_base_salary_label)
					else null
				end
			)
			when action = 'finance_payroll_paid' then concat_ws(
				' ',
				'Paid salary for',
				target_label,
				case when period_label is not null then concat('for ', period_label) else null end,
				case when amount_label is not null then concat('amount ', amount_label) else null end
			)
			when action = 'finance_bonus_paid' then concat_ws(
				' ',
				'Paid bonus for',
				target_label,
				case when period_label is not null then concat('for ', period_label) else null end,
				case when amount_label is not null then concat('amount ', amount_label) else null end,
				case when nullif(details->>'reason', '') is not null then concat('because ', details->>'reason') else null end
			)
			when action = 'driver_fuel_receipt_submitted' then concat_ws(
				' ',
				'Submitted fuel receipt for',
				target_label,
				case when amount_label is not null then concat('amount ', amount_label) else null end,
				case when nullif(details->>'fuel_liters', '') is not null then concat('for ', details->>'fuel_liters', ' L') else null end
			)
			when action = 'finance_fuel_expense_posted' then concat_ws(
				' ',
				'Posted fuel expense for',
				target_label,
				case when amount_label is not null then concat('amount ', amount_label) else null end,
				case when nullif(details->>'entry_number', '') is not null then concat('in ', details->>'entry_number') else null end
			)
			when action = 'finance_company_asset_recorded' then concat_ws(
				' ',
				'Recorded company asset',
				target_label,
				case when acquisition_cost_label is not null then concat('for ', acquisition_cost_label) else null end,
				case when nullif(details->>'asset_number', '') is not null then concat('as ', details->>'asset_number') else null end
			)
			when action = 'finance_company_asset_revalued' then concat('Revalued company asset ', target_label)
			when action = 'finance_company_asset_disposed' then concat('Disposed company asset ', target_label)
			when action = 'finance_adjustment_created' then concat_ws(
				' ',
				'Recorded',
				initcap(replace(coalesce(nullif(details->>'adjustment_type', ''), 'finance_adjustment'), '_', ' ')),
				'adjustment for',
				target_label,
				case when amount_label is not null then concat('amount ', amount_label) else null end
			)
			else concat(initcap(replace(action, '_', ' ')), ' ', target_label)
		end as what_happened,
		to_char(created_at at time zone 'Africa/Cairo', 'FMMonth FMDD, YYYY, HH12:MI AM') as when_label
	from finance_activity
),
narratives as (
	select
		descriptions.*,
		concat_ws(
			' ',
			actor_label,
			case when actor_type = 'Employee' then 'from Finance' else null end,
			lower(left(what_happened, 1)) || substr(what_happened, 2),
			case when proof_label is not null then 'with proof' else null end,
			'on',
			when_label
		) as activity_sentence
	from descriptions
)
select
	'activity'::text as entity_type,
	id::text as entity_id,
	activity_sentence as title,
	'Finance'::text as subtitle,
	jsonb_strip_nulls(
		jsonb_build_object(
			'action', action,
			'action_label', initcap(replace(action, '_', ' ')),
			'area', 'Finance',
			'department', case when actor_type = 'Employee' then 'Finance' else null end,
			'headline', activity_sentence,
			'activity_sentence', activity_sentence,
			'who', actor_label,
			'what', what_happened,
			'when', when_label,
			'actor', actor_label,
			'actor_type', actor_type,
			'source', 'activity_finance_operating',
			'target', target_label,
			'proofs', proof_label,
			'proof_count', case when proof_label is not null then 1 else null end,
			'employee', coalesce(details->>'paid_employee_name', details->>'employee_name'),
			'truck', details->>'truck_plate',
			'driver', details->>'driver_name',
			'asset_number', details->>'asset_number',
			'category', details->>'category',
			'description', details->>'description',
			'amount', details->>'amount',
			'amount_label', amount_label,
			'period_month', details->>'period_month',
			'entry_number', details->>'entry_number',
			'status', details->>'status',
			'receipt_file', case when action = 'driver_fuel_receipt_submitted' then proof_label else null end,
			'created_at', created_at
		)
	) as metadata,
	created_at as sort_at,
	concat_ws(
		' ',
		'activity finance payroll salary bonus fuel company asset adjustment',
		action,
		activity_sentence,
		what_happened,
		actor_label,
		target_label,
		details->>'paid_employee_name',
		details->>'employee_name',
		details->>'truck_plate',
		details->>'driver_name',
		details->>'name',
		details->>'asset_number',
		details->>'category',
		details->>'description',
		details->>'amount',
		amount_label,
		details->>'entry_number',
		proof_label
	) as search_text
from narratives;

revoke all privileges on table public.ceo_search_finance_activity_vtable
	from anon, authenticated, public;

alter function app_private.refresh_ceo_search_documents()
	rename to refresh_ceo_search_documents_without_finance_activity;

create or replace function app_private.refresh_ceo_search_documents()
returns integer
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	base_count integer := 0;
	finance_activity_count integer := 0;
	search_user_id uuid;
begin
	base_count := app_private.refresh_ceo_search_documents_without_finance_activity();

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

	perform set_config('app.actor_user_id', search_user_id::text, true);
	perform set_config('app.actor_pool', 'internal', true);
	perform set_config('request.jwt.claim.sub', search_user_id::text, true);
	perform set_config(
		'request.jwt.claims',
		jsonb_build_object('sub', search_user_id::text, 'role', 'authenticated', 'pool', 'internal')::text,
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
		from public.ceo_search_finance_activity_vtable source_candidates
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
		where documents.entity_type = 'activity'
		  and documents.metadata->>'source' = 'activity_finance_operating'
		  and not exists (
			select 1
			from source_rows
			where source_rows.entity_type = documents.entity_type
			  and source_rows.entity_id = documents.entity_id
		  )
		returning 1
	)
	select count(*)::integer into finance_activity_count
	from source_rows;

	return base_count + finance_activity_count;
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
		'ceo_search_finance_activity_vtable',
		'ceo_search_finance_payroll_vtable',
		'ceo_search_finance_payroll_payment_vtable',
		'ceo_search_finance_fuel_vtable',
		'ceo_search_finance_company_asset_vtable',
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
			if entity in (
				'ceo_search_finance_activity_vtable',
				'ceo_search_finance_payroll_vtable',
				'ceo_search_finance_payroll_payment_vtable',
				'finance_payroll',
				'finance_payroll_payment',
				'payroll',
				'salary',
				'salaries',
				'employee_salary',
				'social_insurance'
			) and not public.can_access_panel('finance') then
				raise exception 'employee_ai_finance_scope_denied' using errcode = '42501';
			end if;
			if entity like 'ceo_%' or entity like 'search_%' then
				if entity <> all(employee_allowed_vtables) then
					raise exception 'employee_ai_read_scope_denied' using errcode = '42501';
				end if;
			end if;
			if entity in (
				'finance',
				'customer_payments',
				'supplier_payments',
				'private_finance',
				'fuel_expenses',
				'company_assets'
			) and not public.can_access_panel('finance') then
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
