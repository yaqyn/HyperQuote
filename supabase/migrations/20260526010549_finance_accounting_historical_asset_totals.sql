do $$
declare
	fallback_employee_id uuid;
	source_row record;
begin
	select e.id into fallback_employee_id
	from public.employees e
	left join public.employee_roles er on er.employee_id = e.id
	left join public.employee_panel_permissions ep on ep.employee_id = e.id
	where e.status = 'active'
	  and (
		e.is_ceo
		or er.role in ('admin', 'finance')
		or (ep.panel = 'finance' and ep.can_write)
	  )
	order by
		case
			when er.role = 'finance' then 0
			when ep.panel = 'finance' and ep.can_write then 1
			when er.role = 'admin' then 2
			when e.is_ceo then 3
			else 4
		end,
		e.created_at
	limit 1;

	if fallback_employee_id is null and exists (
		select 1
		from public.customer_payments cp
		where cp.status = 'recorded'
		  and cp.recorded_by_employee_id is null
		union all
		select 1
		from public.supplier_payments sp
		where sp.status = 'recorded'
		  and sp.recorded_by_employee_id is null
	) then
		raise exception 'finance_accounting_backfill_employee_required' using errcode = '42501';
	end if;

	for source_row in
		select cp.id
		from public.customer_payments cp
		where cp.status = 'recorded'
		order by cp.created_at, cp.id
	loop
		perform app_private.finance_record_customer_payment_journal(
			source_row.id,
			fallback_employee_id
		);
	end loop;

	for source_row in
		select sp.id
		from public.supplier_payments sp
		where sp.status = 'recorded'
		order by sp.created_at, sp.id
	loop
		perform app_private.finance_record_supplier_payment_journal(
			source_row.id,
			fallback_employee_id
		);
	end loop;

	for source_row in
		select o.id
		from public.orders o
		where o.status in (
			'dispatch_ready',
			'dispatch_assigned',
			'out_for_delivery',
			'delivered'
		)
		order by o.updated_at, o.id
	loop
		perform app_private.finance_record_order_review_journal(
			source_row.id,
			fallback_employee_id
		);
	end loop;

	for source_row in
		select rr.id
		from public.refill_requests rr
		where rr.status = 'received'
		order by rr.updated_at, rr.id
	loop
		perform app_private.finance_record_refill_review_journal(
			source_row.id,
			fallback_employee_id
		);
	end loop;

	for source_row in
		select ec.employee_id
		from public.employee_compensation ec
		where coalesce(ec.base_salary, 0) > 0
		order by ec.updated_at, ec.employee_id
	loop
		perform app_private.finance_record_payroll_review_journal(
			source_row.employee_id,
			fallback_employee_id
		);
	end loop;
end $$;
