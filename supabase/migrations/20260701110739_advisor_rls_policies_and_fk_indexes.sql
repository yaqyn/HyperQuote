drop policy if exists customer_quote_carts_api_boundary_deny_all
	on public.customer_quote_carts;
create policy customer_quote_carts_api_boundary_deny_all
	on public.customer_quote_carts
	for all
	to anon, authenticated
	using (false)
	with check (false);

drop policy if exists driver_app_sessions_api_boundary_deny_all
	on public.driver_app_sessions;
create policy driver_app_sessions_api_boundary_deny_all
	on public.driver_app_sessions
	for all
	to anon, authenticated
	using (false)
	with check (false);

drop policy if exists driver_location_place_cache_api_boundary_deny_all
	on public.driver_location_place_cache;
create policy driver_location_place_cache_api_boundary_deny_all
	on public.driver_location_place_cache
	for all
	to anon, authenticated
	using (false)
	with check (false);

drop policy if exists support_email_threads_api_boundary_deny_all
	on public.support_email_threads;
create policy support_email_threads_api_boundary_deny_all
	on public.support_email_threads
	for all
	to anon, authenticated
	using (false)
	with check (false);

create index if not exists company_assets_created_by_employee_id_idx
	on public.company_assets (created_by_employee_id);
create index if not exists company_assets_proof_document_id_idx
	on public.company_assets (proof_document_id);

create index if not exists employee_payroll_payments_created_by_employee_id_idx
	on public.employee_payroll_payments (created_by_employee_id);
create index if not exists employee_payroll_payments_proof_document_id_idx
	on public.employee_payroll_payments (proof_document_id);

create index if not exists finance_adjustments_created_by_employee_id_idx
	on public.finance_adjustments (created_by_employee_id);
create index if not exists finance_adjustments_posted_by_employee_id_idx
	on public.finance_adjustments (posted_by_employee_id);
create index if not exists finance_adjustments_proof_document_id_idx
	on public.finance_adjustments (proof_document_id);
create index if not exists finance_adjustments_voided_by_employee_id_idx
	on public.finance_adjustments (voided_by_employee_id);

create index if not exists finance_journal_entries_actor_employee_id_idx
	on public.finance_journal_entries (actor_employee_id);
create index if not exists finance_journal_entries_posted_by_employee_id_idx
	on public.finance_journal_entries (posted_by_employee_id);
create index if not exists finance_journal_entries_reversal_entry_id_idx
	on public.finance_journal_entries (reversal_entry_id);
create index if not exists finance_journal_entries_reversed_by_employee_id_idx
	on public.finance_journal_entries (reversed_by_employee_id);
create index if not exists finance_journal_entries_reversed_from_entry_id_idx
	on public.finance_journal_entries (reversed_from_entry_id);
create index if not exists finance_journal_entries_voided_by_employee_id_idx
	on public.finance_journal_entries (voided_by_employee_id);

create index if not exists finance_journal_proof_links_proof_document_id_idx
	on public.finance_journal_proof_links (proof_document_id);

create index if not exists inventory_damage_lots_proof_document_id_idx
	on public.inventory_damage_lots (proof_document_id);
create index if not exists inventory_damage_lots_recorded_by_employee_id_idx
	on public.inventory_damage_lots (recorded_by_employee_id);

create index if not exists inventory_damage_transactions_created_by_employee_id_idx
	on public.inventory_damage_transactions (created_by_employee_id);
create index if not exists inventory_damage_transactions_manager_employee_id_idx
	on public.inventory_damage_transactions (manager_employee_id);
create index if not exists inventory_damage_transactions_proof_document_id_idx
	on public.inventory_damage_transactions (proof_document_id);

create index if not exists truck_fuel_expenses_delivery_id_idx
	on public.truck_fuel_expenses (delivery_id);
create index if not exists truck_fuel_expenses_posted_by_employee_id_idx
	on public.truck_fuel_expenses (posted_by_employee_id);
create index if not exists truck_fuel_expenses_proof_document_id_idx
	on public.truck_fuel_expenses (proof_document_id);
