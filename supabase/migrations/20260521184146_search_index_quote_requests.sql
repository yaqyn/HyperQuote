create or replace view public.ceo_quote_request_summary
with (security_invoker = true)
as
select
	qr.id,
	qr.request_number,
	qr.status::text as status,
	qr.urgency::text as urgency,
	qr.draft_name,
	qr.notes,
	qr.delivery_date,
	qr.approval_required,
	qr.created_at,
	qr.submitted_at,
	qr.updated_at,
	qr.eligible_at,
	c.company_name,
	c.contact_name,
	count(qri.id)::integer as item_count
from public.quote_requests qr
left join public.customers c on c.id = qr.customer_id
left join public.quote_request_items qri on qri.quote_request_id = qr.id
where public.can_access_ceo_search()
  and qr.status <> 'draft'
group by
	qr.id,
	qr.request_number,
	qr.status,
	qr.urgency,
	qr.draft_name,
	qr.notes,
	qr.delivery_date,
	qr.approval_required,
	qr.created_at,
	qr.submitted_at,
	qr.updated_at,
	qr.eligible_at,
	c.company_name,
	c.contact_name;

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
		'source', 'customer_order',
		'order_number', order_number,
		'total_amount', total_amount,
		'company_name', company_name,
		'created_at', created_at,
		'delivered_at', delivered_at
	) as metadata,
	coalesce(delivered_at, created_at) as sort_at,
	concat_ws(
		' ',
		'order',
		'customer order',
		order_number,
		status,
		total_amount::text,
		company_name,
		created_at::text,
		delivered_at::text
	) as search_text
from public.ceo_order_summary
union all
select
	'order' as entity_type,
	id as entity_id,
	request_number as title,
	status as subtitle,
	jsonb_build_object(
		'source', 'quote_request',
		'request_number', request_number,
		'company_name', company_name,
		'contact_name', contact_name,
		'item_count', item_count,
		'urgency', urgency,
		'delivery_date', delivery_date,
		'approval_required', approval_required,
		'draft_name', draft_name,
		'notes', notes,
		'created_at', created_at,
		'submitted_at', submitted_at,
		'updated_at', updated_at
	) as metadata,
	coalesce(submitted_at, updated_at, created_at) as sort_at,
	concat_ws(
		' ',
		'order',
		'submitted order',
		'quote request',
		request_number,
		status,
		urgency,
		company_name,
		contact_name,
		item_count::text,
		delivery_date::text,
		draft_name,
		notes,
		created_at::text,
		submitted_at::text,
		updated_at::text
	) as search_text
from public.ceo_quote_request_summary
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
	) as metadata,
	updated_at as sort_at,
	concat_ws(
		' ',
		'customer',
		company_name,
		contact_name,
		phone,
		email,
		status,
		trade_license_status,
		created_at::text,
		updated_at::text
	) as search_text
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
	) as metadata,
	created_at as sort_at,
	concat_ws(
		' ',
		'payment',
		source,
		status,
		entity_id::text,
		amount::text,
		payment_fraction::text,
		created_at::text
	) as search_text
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
	) as metadata,
	updated_at as sort_at,
	concat_ws(
		' ',
		'inventory',
		name,
		category,
		on_hand_quantity::text,
		reserved_quantity::text,
		available_quantity::text,
		minimum_quantity::text,
		updated_at::text
	) as search_text
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
	) as metadata,
	updated_at as sort_at,
	concat_ws(
		' ',
		'warehouse',
		order_number,
		order_status,
		loading_status,
		company_name,
		plate_number,
		rejection_reason,
		created_at::text,
		updated_at::text
	) as search_text
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
	) as metadata,
	updated_at as sort_at,
	concat_ws(
		' ',
		'dispatch',
		'delivery',
		delivery_number,
		status,
		order_number,
		driver_name,
		plate_number,
		completed_at::text,
		updated_at::text
	) as search_text
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
	) as metadata,
	updated_at as sort_at,
	concat_ws(
		' ',
		'driver',
		full_name,
		phone,
		driver_status,
		online_status,
		vehicle_label,
		last_seen_at::text,
		updated_at::text
	) as search_text
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
	) as metadata,
	updated_at as sort_at,
	concat_ws(
		' ',
		'support',
		source,
		reference,
		subject,
		status,
		requester,
		email,
		phone,
		created_at::text,
		updated_at::text
	) as search_text
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
	) as metadata,
	updated_at as sort_at,
	concat_ws(
		' ',
		'supplier',
		name,
		phone,
		email,
		status,
		tier,
		payment_terms,
		rating::text,
		created_at::text,
		updated_at::text
	) as search_text
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
	) as metadata,
	updated_at as sort_at,
	concat_ws(
		' ',
		'employee',
		full_name,
		status,
		email,
		phone,
		is_ceo::text,
		created_at::text,
		updated_at::text
	) as search_text
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
	) as metadata,
	created_at as sort_at,
	concat_ws(
		' ',
		'activity',
		action,
		entity_type,
		entity_id::text,
		details::text,
		created_at::text
	) as search_text
from public.ceo_activity_summary;

grant select on public.ceo_quote_request_summary to authenticated;
grant select on public.ceo_search_index to authenticated;
