alter type public.audit_event_type add value if not exists 'finance_salary_updated';
alter type public.audit_event_type add value if not exists 'finance_payroll_paid';
alter type public.audit_event_type add value if not exists 'finance_bonus_paid';
alter type public.audit_event_type add value if not exists 'driver_fuel_receipt_submitted';
alter type public.audit_event_type add value if not exists 'finance_fuel_expense_posted';
alter type public.audit_event_type add value if not exists 'finance_company_asset_recorded';
alter type public.audit_event_type add value if not exists 'finance_company_asset_revalued';
alter type public.audit_event_type add value if not exists 'finance_company_asset_disposed';

alter type public.finance_journal_source_type add value if not exists 'employee_payroll_payment';
alter type public.finance_journal_source_type add value if not exists 'truck_fuel_expense';
alter type public.finance_journal_source_type add value if not exists 'company_asset';
