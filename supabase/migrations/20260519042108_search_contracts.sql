create or replace function public.can_access_ceo_search()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.employees e
		left join public.employee_roles er on er.employee_id = e.id
		left join public.employee_panel_permissions ep on ep.employee_id = e.id
		where e.user_id = auth.uid()
		  and e.status = 'active'
		  and (
			e.is_ceo
			or er.role = 'ceo'
			or (ep.panel = 'search' and ep.can_read)
		  )
	)
$$;

drop view if exists public.ceo_search_index;
drop view if exists public.ceo_activity_summary;
drop view if exists public.ceo_supplier_summary;
drop view if exists public.ceo_support_summary;
drop view if exists public.ceo_driver_summary;
drop view if exists public.ceo_dispatch_summary;
drop view if exists public.ceo_warehouse_summary;
drop view if exists public.ceo_inventory_summary;
drop view if exists public.ceo_finance_summary;
drop view if exists public.ceo_customer_summary;
drop view if exists public.ceo_order_summary;

create or replace view public.ceo_order_summary
with (security_invoker = true)
as
select
	o.id,
	o.order_number,
	o.status::text as status,
	o.total_amount,
	c.company_name,
	o.created_at,
	o.delivered_at
from public.orders o
join public.customers c on c.id = o.customer_id
where public.can_access_ceo_search();

create or replace view public.ceo_customer_summary
with (security_invoker = true)
as
select
	c.id,
	c.company_name,
	c.contact_name,
	c.phone,
	c.email,
	c.status::text as status,
	c.trade_license_status::text as trade_license_status,
	c.created_at,
	c.updated_at
from public.customers c
where public.can_access_ceo_search();

create or replace view public.ceo_finance_summary
with (security_invoker = true)
as
select
	'customer_payment' as source,
	cp.id,
	cp.order_id as entity_id,
	cp.amount,
	cp.payment_fraction,
	cp.status::text as status,
	cp.created_at
from public.customer_payments cp
where public.can_access_ceo_search()
union all
select
	'supplier_payment' as source,
	sp.id,
	sp.refill_request_id as entity_id,
	sp.amount,
	sp.payment_fraction,
	sp.status::text as status,
	sp.created_at
from public.supplier_payments sp
where public.can_access_ceo_search();

create or replace view public.ceo_inventory_summary
with (security_invoker = true)
as
select
	p.id as product_id,
	p.name,
	p.category,
	s.on_hand_quantity,
	s.reserved_quantity,
	s.available_quantity,
	s.minimum_quantity,
	s.updated_at
from public.inventory_stock s
join public.products p on p.id = s.product_id
where public.can_access_ceo_search();

create or replace view public.ceo_warehouse_summary
with (security_invoker = true)
as
select
	lt.id,
	o.order_number,
	o.status::text as order_status,
	lt.status::text as loading_status,
	c.company_name,
	t.plate_number,
	lt.rejection_reason,
	lt.created_at,
	lt.updated_at
from public.loading_tasks lt
join public.orders o on o.id = lt.order_id
left join public.customers c on c.id = o.customer_id
left join public.trucks t on t.id = (
	select ltd.truck_id
	from public.loading_task_drivers ltd
	where ltd.loading_task_id = lt.id
	limit 1
)
where public.can_access_ceo_search();

create or replace view public.ceo_dispatch_summary
with (security_invoker = true)
as
select
	d.id,
	d.delivery_number,
	d.status::text as status,
	d.order_id,
	o.order_number,
	drivers.full_name as driver_name,
	t.plate_number,
	d.completed_at,
	d.updated_at
from public.deliveries d
left join public.orders o on o.id = d.order_id
left join public.drivers drivers on drivers.id = d.driver_id
left join public.trucks t on t.id = d.truck_id
where public.can_access_ceo_search();

create or replace view public.ceo_driver_summary
with (security_invoker = true)
as
select
	d.id,
	d.full_name,
	d.phone,
	d.status::text as driver_status,
	d.vehicle_label,
	dos.status::text as online_status,
	dos.last_seen_at,
	d.updated_at
from public.drivers d
left join public.driver_online_states dos on dos.driver_id = d.id
where public.can_access_ceo_search();

create or replace view public.ceo_support_summary
with (security_invoker = true)
as
select
	'ticket' as source,
	st.id,
	st.reference as reference,
	st.subject,
	st.status::text as status,
	st.requester_name as requester,
	st.requester_email as email,
	st.requester_phone as phone,
	st.created_at,
	st.updated_at
from public.support_tickets st
where public.can_access_ceo_search()
union all
select
	'conversation' as source,
	sc.id,
	sc.external_thread_id as reference,
	sc.channel::text as subject,
	sc.status::text as status,
	coalesce(c.company_name, sc.phone, sc.email) as requester,
	sc.email,
	sc.phone,
	sc.created_at,
	sc.updated_at
from public.support_conversations sc
left join public.customers c on c.id = sc.customer_id
where public.can_access_ceo_search();

create or replace view public.ceo_supplier_summary
with (security_invoker = true)
as
select
	s.id,
	s.name,
	s.phone,
	s.email,
	s.status::text as status,
	s.tier,
	s.payment_terms,
	s.rating,
	s.created_at,
	s.updated_at
from public.suppliers s
where public.can_access_ceo_search();

create or replace view public.ceo_activity_summary
with (security_invoker = true)
as
select
	ae.id,
	ae.entity_type,
	ae.entity_id,
	ae.action::text as action,
	ae.details,
	ae.created_at
from public.activity_events ae
where public.can_access_ceo_search();

create or replace view public.ceo_search_index
with (security_invoker = true)
as
select
	'order' as entity_type,
	id as entity_id,
	order_number as title,
	status as subtitle,
	jsonb_build_object('total_amount', total_amount, 'company_name', company_name, 'created_at', created_at, 'delivered_at', delivered_at) as metadata
from public.ceo_order_summary
union all
select
	'customer' as entity_type,
	id as entity_id,
	company_name as title,
	contact_name as subtitle,
	jsonb_build_object('phone', phone, 'email', email, 'status', status, 'trade_license_status', trade_license_status) as metadata
from public.ceo_customer_summary
union all
select
	'payment' as entity_type,
	id as entity_id,
	source as title,
	status as subtitle,
	jsonb_build_object('entity_id', entity_id, 'amount', amount, 'payment_fraction', payment_fraction, 'created_at', created_at) as metadata
from public.ceo_finance_summary
union all
select
	'inventory' as entity_type,
	product_id as entity_id,
	name as title,
	category as subtitle,
	jsonb_build_object('on_hand_quantity', on_hand_quantity, 'reserved_quantity', reserved_quantity, 'available_quantity', available_quantity, 'minimum_quantity', minimum_quantity, 'updated_at', updated_at) as metadata
from public.ceo_inventory_summary
union all
select
	'warehouse' as entity_type,
	id as entity_id,
	order_number as title,
	loading_status as subtitle,
	jsonb_build_object('order_status', order_status, 'company_name', company_name, 'plate_number', plate_number, 'rejection_reason', rejection_reason, 'updated_at', updated_at) as metadata
from public.ceo_warehouse_summary
union all
select
	'dispatch' as entity_type,
	id as entity_id,
	delivery_number as title,
	status as subtitle,
	jsonb_build_object('order_number', order_number, 'driver_name', driver_name, 'plate_number', plate_number, 'completed_at', completed_at, 'updated_at', updated_at) as metadata
from public.ceo_dispatch_summary
union all
select
	'driver' as entity_type,
	id as entity_id,
	full_name as title,
	coalesce(online_status, driver_status) as subtitle,
	jsonb_build_object('phone', phone, 'driver_status', driver_status, 'vehicle_label', vehicle_label, 'last_seen_at', last_seen_at, 'updated_at', updated_at) as metadata
from public.ceo_driver_summary
union all
select
	'support' as entity_type,
	id as entity_id,
	coalesce(reference, requester) as title,
	status as subtitle,
	jsonb_build_object('source', source, 'subject', subject, 'requester', requester, 'email', email, 'phone', phone, 'updated_at', updated_at) as metadata
from public.ceo_support_summary
union all
select
	'supplier' as entity_type,
	id as entity_id,
	name as title,
	status as subtitle,
	jsonb_build_object('phone', phone, 'email', email, 'tier', tier, 'payment_terms', payment_terms, 'rating', rating, 'updated_at', updated_at) as metadata
from public.ceo_supplier_summary
union all
select
	'activity' as entity_type,
	id as entity_id,
	action as title,
	entity_type as subtitle,
	jsonb_build_object('entity_id', entity_id, 'details', details, 'created_at', created_at) as metadata
from public.ceo_activity_summary;

grant execute on function public.can_access_ceo_search() to authenticated;
grant select on public.ceo_customer_summary to authenticated;
grant select on public.ceo_warehouse_summary to authenticated;
grant select on public.ceo_driver_summary to authenticated;
grant select on public.ceo_support_summary to authenticated;
grant select on public.ceo_supplier_summary to authenticated;
grant select on public.ceo_activity_summary to authenticated;
grant select on public.ceo_order_summary to authenticated;
grant select on public.ceo_finance_summary to authenticated;
grant select on public.ceo_inventory_summary to authenticated;
grant select on public.ceo_dispatch_summary to authenticated;
grant select on public.ceo_search_index to authenticated;
