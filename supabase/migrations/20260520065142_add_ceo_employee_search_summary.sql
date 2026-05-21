create or replace view public.ceo_employee_summary
with (security_invoker = true)
as
select
	e.id,
	e.full_name,
	e.email,
	e.phone,
	e.status::text as status,
	e.is_ceo,
	e.created_at,
	e.updated_at
from public.employees e
where public.can_access_ceo_search();

drop view if exists public.ceo_search_index;

create or replace view public.ceo_search_index
with (security_invoker = true)
as
select
	'order' as entity_type,
	id as entity_id,
	order_number as title,
	status as subtitle,
	jsonb_build_object(
		'total_amount', total_amount,
		'company_name', company_name,
		'created_at', created_at,
		'delivered_at', delivered_at
	) as metadata
from public.ceo_order_summary
union all
select
	'customer' as entity_type,
	id as entity_id,
	company_name as title,
	contact_name as subtitle,
	jsonb_build_object(
		'phone', phone,
		'email', email,
		'status', status,
		'trade_license_status', trade_license_status
	) as metadata
from public.ceo_customer_summary
union all
select
	'payment' as entity_type,
	id as entity_id,
	source as title,
	status as subtitle,
	jsonb_build_object(
		'entity_id', entity_id,
		'amount', amount,
		'payment_fraction', payment_fraction,
		'created_at', created_at
	) as metadata
from public.ceo_finance_summary
union all
select
	'inventory' as entity_type,
	product_id as entity_id,
	name as title,
	category as subtitle,
	jsonb_build_object(
		'on_hand_quantity', on_hand_quantity,
		'reserved_quantity', reserved_quantity,
		'available_quantity', available_quantity,
		'minimum_quantity', minimum_quantity,
		'updated_at', updated_at
	) as metadata
from public.ceo_inventory_summary
union all
select
	'warehouse' as entity_type,
	id as entity_id,
	order_number as title,
	loading_status as subtitle,
	jsonb_build_object(
		'order_status', order_status,
		'company_name', company_name,
		'plate_number', plate_number,
		'rejection_reason', rejection_reason,
		'updated_at', updated_at
	) as metadata
from public.ceo_warehouse_summary
union all
select
	'dispatch' as entity_type,
	id as entity_id,
	delivery_number as title,
	status as subtitle,
	jsonb_build_object(
		'order_number', order_number,
		'driver_name', driver_name,
		'plate_number', plate_number,
		'completed_at', completed_at,
		'updated_at', updated_at
	) as metadata
from public.ceo_dispatch_summary
union all
select
	'driver' as entity_type,
	id as entity_id,
	full_name as title,
	coalesce(online_status, driver_status) as subtitle,
	jsonb_build_object(
		'phone', phone,
		'driver_status', driver_status,
		'vehicle_label', vehicle_label,
		'last_seen_at', last_seen_at,
		'updated_at', updated_at
	) as metadata
from public.ceo_driver_summary
union all
select
	'support' as entity_type,
	id as entity_id,
	coalesce(reference, requester) as title,
	status as subtitle,
	jsonb_build_object(
		'source', source,
		'subject', subject,
		'requester', requester,
		'email', email,
		'phone', phone,
		'updated_at', updated_at
	) as metadata
from public.ceo_support_summary
union all
select
	'supplier' as entity_type,
	id as entity_id,
	name as title,
	status as subtitle,
	jsonb_build_object(
		'phone', phone,
		'email', email,
		'tier', tier,
		'payment_terms', payment_terms,
		'rating', rating,
		'updated_at', updated_at
	) as metadata
from public.ceo_supplier_summary
union all
select
	'employee' as entity_type,
	id as entity_id,
	full_name as title,
	status as subtitle,
	jsonb_build_object(
		'email', email,
		'phone', phone,
		'is_ceo', is_ceo,
		'updated_at', updated_at
	) as metadata
from public.ceo_employee_summary
union all
select
	'activity' as entity_type,
	id as entity_id,
	action as title,
	entity_type as subtitle,
	jsonb_build_object(
		'entity_id', entity_id,
		'details', details,
		'created_at', created_at
	) as metadata
from public.ceo_activity_summary;

grant select on public.ceo_employee_summary to authenticated;
grant select on public.ceo_search_index to authenticated;
