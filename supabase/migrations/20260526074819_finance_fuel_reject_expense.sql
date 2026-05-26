alter type public.audit_event_type
	add value if not exists 'finance_fuel_expense_rejected';

create or replace function public.finance_reject_truck_fuel_expense(
	p_expense_id uuid,
	p_reason text,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.truck_fuel_expenses
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	employee_id uuid;
	expense public.truck_fuel_expenses%rowtype;
	rejected_expense public.truck_fuel_expenses%rowtype;
	target_truck public.trucks%rowtype;
	target_driver public.drivers%rowtype;
	clean_reason text := nullif(btrim(coalesce(p_reason, '')), '');
	clean_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
begin
	employee_id := public.require_panel('finance', true);

	if clean_reason is null then
		raise exception 'fuel_expense_reject_reason_required' using errcode = '23514';
	end if;

	if clean_proof_path is null and p_proof_document_id is null then
		raise exception 'fuel_expense_reject_proof_required' using errcode = '23514';
	end if;

	select * into expense
	from public.truck_fuel_expenses
	where id = p_expense_id
	for update;
	if expense.id is null then
		raise exception 'fuel_expense_not_found' using errcode = '02000';
	end if;
	if expense.status <> 'submitted' then
		raise exception 'fuel_expense_not_submitted' using errcode = '23514';
	end if;

	select * into target_truck from public.trucks where id = expense.truck_id;
	select * into target_driver from public.drivers where id = expense.driver_id;

	update public.truck_fuel_expenses
	set
		status = 'rejected',
		posted_by_employee_id = employee_id,
		posted_at = now(),
		finance_note = clean_reason,
		proof_document_id = p_proof_document_id,
		proof_path = clean_proof_path
	where id = expense.id
	returning * into rejected_expense;

	perform public.log_activity(
		'truck_fuel_expense',
		rejected_expense.id,
		'finance_fuel_expense_rejected',
		jsonb_strip_nulls(jsonb_build_object(
			'employee_id', employee_id,
			'driver_id', rejected_expense.driver_id,
			'driver_name', target_driver.full_name,
			'truck_id', rejected_expense.truck_id,
			'truck_plate', target_truck.plate_number,
			'amount', rejected_expense.amount,
			'expense_date', rejected_expense.expense_date,
			'reason', clean_reason,
			'status', rejected_expense.status,
			'proof_document_id', p_proof_document_id,
			'proof_path', clean_proof_path
		))
	);

	return rejected_expense;
end;
$$;

create or replace function public.service_finance_reject_truck_fuel_expense(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_expense_id uuid,
	p_reason text,
	p_proof_path text default null,
	p_proof_document_id uuid default null
)
returns public.truck_fuel_expenses
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.finance_reject_truck_fuel_expense(
		p_expense_id,
		p_reason,
		p_proof_path,
		p_proof_document_id
	);
end;
$$;

revoke all on function public.finance_reject_truck_fuel_expense(uuid, text, text, uuid)
	from public, anon, authenticated;
revoke all on function public.service_finance_reject_truck_fuel_expense(uuid, text, uuid, text, text, uuid)
	from public, anon, authenticated;

grant execute on function public.service_finance_reject_truck_fuel_expense(uuid, text, uuid, text, text, uuid)
	to service_role;

create or replace function app_private.keep_only_business_activity_events()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if new.action::text in (
		'finance_adjustment_created',
		'finance_salary_updated',
		'finance_payroll_paid',
		'finance_bonus_paid',
		'driver_fuel_receipt_submitted',
		'finance_fuel_expense_posted',
		'finance_fuel_expense_rejected',
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

create or replace function public.ceo_activity_action_label(
	p_action public.audit_event_type
)
returns text
language sql
immutable
set search_path = public
as $$
	select case p_action::text
		when 'inventory_damage_recorded' then 'marked damaged stock'
		when 'inventory_damage_sold' then 'sold damaged stock'
		when 'inventory_damage_disposed' then 'disposed damaged stock'
		when 'inventory_damage_reversed' then 'restored damaged stock'
		when 'finance_salary_updated' then 'Employee salary updated'
		when 'finance_payroll_paid' then 'Employee salary paid'
		when 'finance_bonus_paid' then 'Employee bonus paid'
		when 'driver_fuel_receipt_submitted' then 'Driver submitted fuel receipt'
		when 'finance_fuel_expense_posted' then 'Fuel expense posted'
		when 'finance_fuel_expense_rejected' then 'Fuel expense rejected'
		when 'finance_company_asset_recorded' then 'Company asset recorded'
		when 'finance_company_asset_revalued' then 'Company asset revalued'
		when 'finance_company_asset_disposed' then 'Company asset disposed'
		when 'admin_record_created' then 'Admin record created'
		when 'admin_record_deactivated' then 'Admin record deactivated'
		when 'admin_record_updated' then 'Admin record updated'
		when 'admin_database_exported' then 'Database export created'
		when 'admin_role_assigned' then 'Admin role assigned'
		else initcap(replace(p_action::text, '_', ' '))
	end
$$;

grant execute on function public.ceo_activity_action_label(public.audit_event_type)
	to authenticated;

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
	  and ae.action::text in (
		'finance_adjustment_created',
		'finance_salary_updated',
		'finance_payroll_paid',
		'finance_bonus_paid',
		'driver_fuel_receipt_submitted',
		'finance_fuel_expense_posted',
		'finance_fuel_expense_rejected',
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
			when action = 'finance_fuel_expense_rejected' then concat_ws(
				' ',
				'Rejected fuel expense for',
				target_label,
				case when amount_label is not null then concat('amount ', amount_label) else null end,
				case when nullif(details->>'reason', '') is not null then concat('because ', details->>'reason') else null end
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
			'reason', details->>'reason',
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
		details->>'reason',
		details->>'amount',
		amount_label,
		details->>'entry_number',
		proof_label
	) as search_text
from narratives;

revoke all privileges on table public.ceo_search_finance_activity_vtable
	from anon, authenticated, public;
