create table if not exists public.employee_compensation (
	employee_id uuid primary key references public.employees(id) on delete cascade,
	department text,
	title text,
	hire_date date,
	base_salary numeric(12, 2),
	social_insurance_salary numeric(12, 2),
	salary_currency text not null default 'EGP',
	updated_by_employee_id uuid references public.employees(id) on delete set null,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint employee_compensation_base_salary_nonnegative
		check (base_salary is null or base_salary >= 0),
	constraint employee_compensation_social_salary_nonnegative
		check (social_insurance_salary is null or social_insurance_salary >= 0),
	constraint employee_compensation_currency_present
		check (length(btrim(salary_currency)) between 3 and 8)
);

drop trigger if exists employee_compensation_set_updated_at
	on public.employee_compensation;
create trigger employee_compensation_set_updated_at
	before update on public.employee_compensation
	for each row execute function public.set_updated_at();

alter table public.employee_compensation enable row level security;

drop policy if exists employee_compensation_admin_select
	on public.employee_compensation;
drop policy if exists employee_compensation_admin_insert
	on public.employee_compensation;
drop policy if exists employee_compensation_admin_update
	on public.employee_compensation;
drop policy if exists employee_compensation_admin_delete
	on public.employee_compensation;

create policy employee_compensation_admin_select
	on public.employee_compensation for select
	using (public.can_access_panel('admin') or public.is_employee_with_role('ceo'));

create policy employee_compensation_admin_insert
	on public.employee_compensation for insert
	with check (public.can_access_panel('admin') or public.is_employee_with_role('ceo'));

create policy employee_compensation_admin_update
	on public.employee_compensation for update
	using (public.can_access_panel('admin') or public.is_employee_with_role('ceo'))
	with check (public.can_access_panel('admin') or public.is_employee_with_role('ceo'));

create policy employee_compensation_admin_delete
	on public.employee_compensation for delete
	using (public.can_access_panel('admin') or public.is_employee_with_role('ceo'));

revoke all privileges on table public.employee_compensation
	from anon, authenticated, public;
grant select, insert, update, delete on table public.employee_compensation
	to authenticated;

create or replace function public.ceo_search_date_terms(p_value timestamptz)
returns text
language sql
stable
set search_path = public
as $$
	select case
		when p_value is null then null
		else concat_ws(
			' ',
			to_char(p_value at time zone 'Africa/Cairo', 'YYYY-MM-DD'),
			to_char(p_value at time zone 'Africa/Cairo', 'YYYY'),
			to_char(p_value at time zone 'Africa/Cairo', 'Mon'),
			to_char(p_value at time zone 'Africa/Cairo', 'FMMonth'),
			to_char(p_value at time zone 'Africa/Cairo', 'FMDD'),
			to_char(p_value at time zone 'Africa/Cairo', 'FMDD FMMonth'),
			to_char(p_value at time zone 'Africa/Cairo', 'FMMonth FMDD'),
			to_char(p_value at time zone 'Africa/Cairo', 'FMDD FMMonth YYYY'),
			to_char(p_value at time zone 'Africa/Cairo', 'FMMonth FMDD YYYY')
		)
	end
$$;

create or replace function public.ceo_search_date_terms(p_value date)
returns text
language sql
stable
set search_path = public
as $$
	select case
		when p_value is null then null
		else concat_ws(
			' ',
			to_char(p_value, 'YYYY-MM-DD'),
			to_char(p_value, 'YYYY'),
			to_char(p_value, 'Mon'),
			to_char(p_value, 'FMMonth'),
			to_char(p_value, 'FMDD'),
			to_char(p_value, 'FMDD FMMonth'),
			to_char(p_value, 'FMMonth FMDD'),
			to_char(p_value, 'FMDD FMMonth YYYY'),
			to_char(p_value, 'FMMonth FMDD YYYY')
		)
	end
$$;

grant execute on function public.ceo_search_date_terms(timestamptz)
	to authenticated;
grant execute on function public.ceo_search_date_terms(date)
	to authenticated;

create or replace view public.ceo_search_order_vtable
with (security_invoker = true)
as
select
	'order'::text as entity_type,
	o.id::text as entity_id,
	o.order_number as title,
	o.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'customer_order',
		'order_number', o.order_number,
		'request_number', qr.request_number,
		'quote_number', q.quote_number,
		'total_amount', o.total_amount,
		'company_name', c.company_name,
		'contact_name', c.contact_name,
		'phone', c.phone,
		'email', c.email,
		'project_name', pr.name,
		'delivery_address', concat_ws(', ', ca.street, ca.area, ca.city, ca.governorate, ca.landmark),
		'submitted_by', coalesce(submitter.display_name, c.contact_name),
		'assigned_employee', assigned.full_name,
		'request_items', request_items.item_summary,
		'quote_items', quote_items.item_summary,
		'request_item_count', request_items.item_count,
		'quote_item_count', quote_items.item_count,
		'created_at', o.created_at,
		'reserved_at', o.reserved_at,
		'delivered_at', o.delivered_at,
		'updated_at', o.updated_at
	)) as metadata,
	coalesce(o.delivered_at, o.updated_at, o.created_at) as sort_at,
	concat_ws(
		' ',
		'order',
		'customer order',
		o.order_number,
		qr.request_number,
		q.quote_number,
		o.status::text,
		qr.status::text,
		q.status::text,
		o.total_amount::text,
		c.company_name,
		c.contact_name,
		c.phone,
		c.email,
		c.tier::text,
		pr.name,
		pr.description,
		ca.label,
		ca.street,
		ca.area,
		ca.city,
		ca.governorate,
		ca.landmark,
		ca.postal_code,
		coalesce(submitter.display_name, c.contact_name),
		assigned.full_name,
		request_items.item_summary,
		request_items.item_search_text,
		quote_items.item_summary,
		quote_items.item_search_text,
		public.ceo_search_date_terms(o.created_at),
		public.ceo_search_date_terms(o.reserved_at),
		public.ceo_search_date_terms(o.delivered_at),
		public.ceo_search_date_terms(o.updated_at),
		public.ceo_search_date_terms(qr.submitted_at),
		public.ceo_search_date_terms(qr.delivery_date)
	) as search_text
from public.orders o
left join public.customers c on c.id = o.customer_id
left join public.quote_requests qr on qr.id = o.quote_request_id
left join public.quotes q on q.id = o.quote_id
left join public.projects pr on pr.id = coalesce(q.project_id, qr.project_id)
left join public.customer_addresses ca on ca.id = qr.delivery_address_id
left join public.user_profiles submitter on submitter.user_id = qr.submitted_by
left join public.employees assigned on assigned.id = qr.assigned_employee_id
left join lateral (
	select
		count(qri.id)::integer as item_count,
		string_agg(
			concat_ws(' ', qri.quantity::text, coalesce(p.name, qri.customer_description), qri.unit_of_measure),
			', '
			order by qri.sort_order, qri.created_at
		) as item_summary,
		string_agg(
			concat_ws(
				' ',
				qri.quantity::text,
				qri.unit_of_measure,
				qri.unit_of_measure_ar,
				qri.customer_description,
				qri.product_name_ar,
				qri.notes,
				qri.price_range_min::text,
				qri.price_range_max::text,
				qri.currency,
				p.sku,
				p.slug,
				p.name,
				p.name_ar,
				p.category,
				p.subcategory,
				p.subcategory_ar,
				p.brand,
				p.manufacturer,
				p.tags::text,
				p.specifications::text
			),
			' '
			order by qri.sort_order, qri.created_at
		) as item_search_text
	from public.quote_request_items qri
	left join public.products p on p.id = qri.product_id
	where qri.quote_request_id = qr.id
) request_items on true
left join lateral (
	select
		count(qi.id)::integer as item_count,
		string_agg(
			concat_ws(' ', qi.quantity::text, qi.product_name, qi.unit_of_measure),
			', '
			order by qi.sort_order, qi.created_at
		) as item_summary,
		string_agg(
			concat_ws(
				' ',
				qi.quantity::text,
				qi.unit_of_measure,
				qi.unit_of_measure_ar,
				qi.product_name,
				qi.product_name_ar,
				qi.unit_price::text,
				qi.line_total::text,
				qi.margin_percent::text,
				qi.customer_counter_price::text,
				qi.line_status::text,
				qi.reject_reason,
				p.sku,
				p.slug,
				p.category,
				p.subcategory,
				p.brand,
				p.manufacturer
			),
			' '
			order by qi.sort_order, qi.created_at
		) as item_search_text
	from public.quote_items qi
	left join public.products p on p.id = qi.product_id
	where qi.quote_id = q.id
) quote_items on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_quote_request_vtable
with (security_invoker = true)
as
select
	'order'::text as entity_type,
	qr.id::text as entity_id,
	qr.request_number as title,
	qr.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'quote_request',
		'request_number', qr.request_number,
		'company_name', c.company_name,
		'contact_name', c.contact_name,
		'phone', c.phone,
		'email', c.email,
		'customer_status', c.status,
		'customer_tier', c.tier,
		'project_name', pr.name,
		'delivery_address', concat_ws(', ', ca.street, ca.area, ca.city, ca.governorate, ca.landmark),
		'item_count', coalesce(items.item_count, 0),
		'item_summary', items.item_summary,
		'urgency', qr.urgency,
		'delivery_date', qr.delivery_date,
		'approval_required', qr.approval_required,
		'draft_name', qr.draft_name,
		'notes', qr.notes,
		'submitted_by', coalesce(submitter.display_name, c.contact_name),
		'assigned_employee', assigned.full_name,
		'rejected_reason', qr.rejected_reason,
		'attachment_count', cardinality(qr.attachment_urls),
		'created_at', qr.created_at,
		'submitted_at', qr.submitted_at,
		'assigned_at', qr.assigned_at,
		'updated_at', qr.updated_at
	)) as metadata,
	coalesce(qr.submitted_at, qr.updated_at, qr.created_at) as sort_at,
	concat_ws(
		' ',
		'order',
		'submitted order',
		'quote request',
		qr.request_number,
		qr.status::text,
		qr.urgency::text,
		qr.draft_name,
		qr.notes,
		qr.rejected_reason,
		cardinality(qr.attachment_urls)::text,
		c.company_name,
		c.contact_name,
		c.phone,
		c.email,
		c.status::text,
		c.tier::text,
		c.credit_limit::text,
		c.payment_history::text,
		pr.name,
		pr.description,
		ca.label,
		ca.street,
		ca.area,
		ca.city,
		ca.governorate,
		ca.landmark,
		ca.phone,
		ca.postal_code,
		coalesce(submitter.display_name, c.contact_name),
		assigned.full_name,
		items.item_count::text,
		items.item_summary,
		items.item_search_text,
		public.ceo_search_date_terms(qr.delivery_date),
		public.ceo_search_date_terms(qr.created_at),
		public.ceo_search_date_terms(qr.submitted_at),
		public.ceo_search_date_terms(qr.assigned_at),
		public.ceo_search_date_terms(qr.updated_at)
	) as search_text
from public.quote_requests qr
left join public.customers c on c.id = qr.customer_id
left join public.projects pr on pr.id = qr.project_id
left join public.customer_addresses ca on ca.id = qr.delivery_address_id
left join public.user_profiles submitter on submitter.user_id = qr.submitted_by
left join public.employees assigned on assigned.id = qr.assigned_employee_id
left join lateral (
	select
		count(qri.id)::integer as item_count,
		string_agg(
			concat_ws(' ', qri.quantity::text, coalesce(p.name, qri.customer_description), qri.unit_of_measure),
			', '
			order by qri.sort_order, qri.created_at
		) as item_summary,
		string_agg(
			concat_ws(
				' ',
				qri.quantity::text,
				qri.unit_of_measure,
				qri.unit_of_measure_ar,
				qri.customer_description,
				qri.product_name_ar,
				qri.notes,
				qri.price_range_min::text,
				qri.price_range_max::text,
				qri.currency,
				p.sku,
				p.slug,
				p.name,
				p.name_ar,
				p.category,
				p.subcategory,
				p.subcategory_ar,
				p.brand,
				p.manufacturer,
				p.tags::text,
				p.specifications::text
			),
			' '
			order by qri.sort_order, qri.created_at
		) as item_search_text
	from public.quote_request_items qri
	left join public.products p on p.id = qri.product_id
	where qri.quote_request_id = qr.id
) items on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_customer_vtable
with (security_invoker = true)
as
select
	'customer'::text as entity_type,
	c.id::text as entity_id,
	c.company_name as title,
	c.contact_name as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'phone', c.phone,
		'email', c.email,
		'status', c.status,
		'trade_license_status', c.trade_license_status,
		'tier', c.tier,
		'credit_limit', c.credit_limit,
		'payment_history', c.payment_history,
		'assigned_sales_rep', sales_rep.full_name,
		'default_address', concat_ws(', ', addr.street, addr.area, addr.city, addr.governorate),
		'order_count', metrics.order_count,
		'lifetime_value', metrics.lifetime_value,
		'current_exposure', metrics.current_exposure,
		'created_at', c.created_at,
		'updated_at', c.updated_at
	)) as metadata,
	c.updated_at as sort_at,
	concat_ws(
		' ',
		'customer',
		c.company_name,
		c.contact_name,
		c.phone,
		c.email,
		c.status::text,
		c.trade_license_status::text,
		c.tier::text,
		c.credit_limit::text,
		c.payment_history::text,
		sales_rep.full_name,
		addr.label,
		addr.street,
		addr.area,
		addr.city,
		addr.governorate,
		addr.landmark,
		addr.phone,
		addr.postal_code,
		metrics.order_count::text,
		metrics.lifetime_value::text,
		metrics.current_exposure::text,
		public.ceo_search_date_terms(c.created_at),
		public.ceo_search_date_terms(c.updated_at)
	) as search_text
from public.customers c
left join public.employees sales_rep on sales_rep.id = c.assigned_sales_rep_id
left join lateral (
	select ca.*
	from public.customer_addresses ca
	where ca.customer_id = c.id
	order by ca.is_default desc, ca.updated_at desc
	limit 1
) addr on true
left join lateral (
	select
		count(o.id)::integer as order_count,
		coalesce(sum(o.total_amount), 0) as lifetime_value,
		coalesce(sum(o.total_amount) filter (
			where o.status::text not in ('delivered', 'canceled', 'returned')
		), 0) as current_exposure
	from public.orders o
	where o.customer_id = c.id
) metrics on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_payment_vtable
with (security_invoker = true)
as
select
	'payment'::text as entity_type,
	cp.id::text as entity_id,
	'customer_payment'::text as title,
	cp.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'customer_payment',
		'amount', cp.amount,
		'payment_fraction', cp.payment_fraction,
		'status', cp.status,
		'order_number', o.order_number,
		'company_name', c.company_name,
		'contact_name', c.contact_name,
		'recorded_by', recorder.full_name,
		'proof_path', cp.proof_path,
		'created_at', cp.created_at
	)) as metadata,
	cp.created_at as sort_at,
	concat_ws(
		' ',
		'payment',
		'customer payment',
		'customer receipt',
		cp.status::text,
		cp.amount::text,
		cp.payment_fraction::text,
		cp.proof_path,
		o.order_number,
		o.status::text,
		c.company_name,
		c.contact_name,
		c.phone,
		c.email,
		recorder.full_name,
		public.ceo_search_date_terms(cp.created_at)
	) as search_text
from public.customer_payments cp
left join public.orders o on o.id = cp.order_id
left join public.customers c on c.id = o.customer_id
left join public.employees recorder on recorder.id = cp.recorded_by_employee_id
where public.can_access_ceo_search()
union all
select
	'payment'::text as entity_type,
	sp.id::text as entity_id,
	'supplier_payment'::text as title,
	sp.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'supplier_payment',
		'amount', sp.amount,
		'payment_fraction', sp.payment_fraction,
		'status', sp.status,
		'supplier_name', s.name,
		'product_name', p.name,
		'refill_status', rr.status,
		'requested_by', requester.full_name,
		'recorded_by', recorder.full_name,
		'proof_path', sp.proof_path,
		'created_at', sp.created_at
	)) as metadata,
	sp.created_at as sort_at,
	concat_ws(
		' ',
		'payment',
		'supplier payment',
		'supplier payable',
		sp.status::text,
		sp.amount::text,
		sp.payment_fraction::text,
		sp.proof_path,
		rr.status::text,
		rr.quantity::text,
		rr.unit_cost::text,
		s.name,
		s.phone,
		s.email,
		p.sku,
		p.name,
		p.category,
		requester.full_name,
		recorder.full_name,
		public.ceo_search_date_terms(sp.created_at),
		public.ceo_search_date_terms(rr.created_at)
	) as search_text
from public.supplier_payments sp
left join public.refill_requests rr on rr.id = sp.refill_request_id
left join public.suppliers s on s.id = rr.supplier_id
left join public.products p on p.id = rr.product_id
left join public.employees requester on requester.id = rr.requested_by_employee_id
left join public.employees recorder on recorder.id = sp.recorded_by_employee_id
where public.can_access_ceo_search();

create or replace view public.ceo_search_inventory_vtable
with (security_invoker = true)
as
select
	'inventory'::text as entity_type,
	p.id::text as entity_id,
	p.name as title,
	p.category as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'sku', p.sku,
		'name_ar', p.name_ar,
		'category', p.category,
		'subcategory', p.subcategory,
		'brand', p.brand,
		'manufacturer', p.manufacturer,
		'unit_of_measure', p.unit_of_measure,
		'on_hand_quantity', s.on_hand_quantity,
		'reserved_quantity', s.reserved_quantity,
		'available_quantity', s.available_quantity,
		'minimum_quantity', s.minimum_quantity,
		'good_quantity', s.good_quantity,
		'price_range_min', p.price_range_min,
		'price_range_max', p.price_range_max,
		'preferred_suppliers', suppliers.supplier_names,
		'updated_at', s.updated_at
	)) as metadata,
	s.updated_at as sort_at,
	concat_ws(
		' ',
		'inventory',
		'stock',
		p.sku,
		p.slug,
		p.name,
		p.name_ar,
		p.description,
		p.description_ar,
		p.category,
		p.subcategory,
		p.subcategory_ar,
		p.brand,
		p.manufacturer,
		p.unit_of_measure,
		p.unit_of_measure_ar,
		p.weight_kg::text,
		p.price_range_min::text,
		p.price_range_max::text,
		p.price_tier::text,
		p.availability_status::text,
		p.tags::text,
		p.specifications::text,
		s.on_hand_quantity::text,
		s.reserved_quantity::text,
		s.available_quantity::text,
		s.minimum_quantity::text,
		s.good_quantity::text,
		suppliers.supplier_names,
		suppliers.supplier_search_text,
		public.ceo_search_date_terms(s.updated_at),
		public.ceo_search_date_terms(p.updated_at)
	) as search_text
from public.inventory_stock s
join public.products p on p.id = s.product_id
left join lateral (
	select
		string_agg(su.name, ', ' order by spl.is_primary desc, su.name) as supplier_names,
		string_agg(
			concat_ws(' ', su.name, su.phone, su.email, spl.raw_cost::text, spl.lead_time_days::text, spl.min_order_qty::text, spl.notes),
			' '
			order by spl.is_primary desc, su.name
		) as supplier_search_text
	from public.supplier_product_links spl
	join public.suppliers su on su.id = spl.supplier_id
	where spl.product_id = p.id
) suppliers on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_warehouse_vtable
with (security_invoker = true)
as
select
	'warehouse'::text as entity_type,
	lt.id::text as entity_id,
	o.order_number as title,
	lt.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'loading_task',
		'order_number', o.order_number,
		'order_status', o.status,
		'company_name', c.company_name,
		'contact_name', c.contact_name,
		'plate_number', drivers.plate_numbers,
		'driver_name', drivers.driver_names,
		'advisor_name', advisor.full_name,
		'delivery_address', concat_ws(', ', ca.street, ca.area, ca.city, ca.governorate, ca.landmark),
		'item_summary', request_items.item_summary,
		'rejection_reason', lt.rejection_reason,
		'created_at', lt.created_at,
		'updated_at', lt.updated_at
	)) as metadata,
	lt.updated_at as sort_at,
	concat_ws(
		' ',
		'warehouse',
		'loading',
		'loading task',
		o.order_number,
		o.status::text,
		lt.status::text,
		c.company_name,
		c.contact_name,
		advisor.full_name,
		drivers.driver_names,
		drivers.plate_numbers,
		ca.street,
		ca.area,
		ca.city,
		ca.governorate,
		ca.landmark,
		request_items.item_summary,
		request_items.item_search_text,
		lt.proof::text,
		lt.rejection_reason,
		public.ceo_search_date_terms(lt.created_at),
		public.ceo_search_date_terms(lt.updated_at)
	) as search_text
from public.loading_tasks lt
join public.orders o on o.id = lt.order_id
left join public.quote_requests qr on qr.id = o.quote_request_id
left join public.customers c on c.id = o.customer_id
left join public.customer_addresses ca on ca.id = qr.delivery_address_id
left join public.employees advisor on advisor.id = lt.advisor_employee_id
left join lateral (
	select
		string_agg(d.full_name, ', ' order by d.full_name) as driver_names,
		string_agg(t.plate_number, ', ' order by t.plate_number) as plate_numbers,
		string_agg(concat_ws(' ', d.full_name, d.phone, d.vehicle_label, t.plate_number, t.body_type, ltd.assigned_items::text), ' ') as driver_search_text
	from public.loading_task_drivers ltd
	left join public.drivers d on d.id = ltd.driver_id
	left join public.trucks t on t.id = ltd.truck_id
	where ltd.loading_task_id = lt.id
) drivers on true
left join lateral (
	select
		string_agg(
			concat_ws(' ', qri.quantity::text, coalesce(p.name, qri.customer_description), qri.unit_of_measure),
			', '
			order by qri.sort_order, qri.created_at
		) as item_summary,
		string_agg(concat_ws(' ', qri.quantity::text, qri.customer_description, qri.notes, p.sku, p.name, p.category), ' ') as item_search_text
	from public.quote_request_items qri
	left join public.products p on p.id = qri.product_id
	where qri.quote_request_id = qr.id
) request_items on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_receiving_vtable
with (security_invoker = true)
as
select
	'warehouse'::text as entity_type,
	rt.id::text as entity_id,
	concat('Receiving - ', coalesce(p.name, 'Supplier delivery')) as title,
	case
		when rt.status::text = 'rejected' then 'rejected'
		else 'receiving'
	end as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'receiving_task',
		'product_name', p.name,
		'product_sku', p.sku,
		'supplier_name', s.name,
		'advisor_name', e.full_name,
		'quantity', rr.quantity,
		'received_quantity', received.received_quantity,
		'unit_cost', rr.unit_cost,
		'refill_status', rr.status,
		'receiving_status', rt.status,
		'rejection_reason', rt.rejection_reason,
		'created_at', rt.created_at,
		'updated_at', rt.updated_at
	)) as metadata,
	rt.updated_at as sort_at,
	concat_ws(
		' ',
		'warehouse',
		'receiving',
		'receiving task',
		'refill request',
		rt.status::text,
		rr.status::text,
		p.name,
		p.name_ar,
		p.sku,
		p.slug,
		p.category,
		s.name,
		s.phone,
		s.email,
		e.full_name,
		rr.quantity::text,
		received.received_quantity::text,
		rr.unit_cost::text,
		rt.proof::text,
		rt.rejection_reason,
		public.ceo_search_date_terms(rt.created_at),
		public.ceo_search_date_terms(rt.updated_at),
		public.ceo_search_date_terms(rr.created_at)
	) as search_text
from public.receiving_tasks rt
left join public.refill_requests rr on rr.id = rt.refill_request_id
left join public.products p on p.id = rr.product_id
left join public.suppliers s on s.id = rr.supplier_id
left join public.employees e on e.id = rt.advisor_employee_id
left join lateral (
	select sum(rti.received_quantity) as received_quantity
	from public.receiving_task_items rti
	where rti.receiving_task_id = rt.id
) received on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_dispatch_vtable
with (security_invoker = true)
as
select
	'dispatch'::text as entity_type,
	d.id::text as entity_id,
	d.delivery_number as title,
	d.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'delivery_number', d.delivery_number,
		'order_number', o.order_number,
		'company_name', c.company_name,
		'contact_name', c.contact_name,
		'driver_name', driver.full_name,
		'driver_phone', driver.phone,
		'plate_number', t.plate_number,
		'truck_status', t.status,
		'delivery_address', concat_ws(', ', ca.street, ca.area, ca.city, ca.governorate, ca.landmark),
		'rejection_reason', d.rejection_reason,
		'started_at', d.started_at,
		'arrived_at', d.arrived_at,
		'completed_at', d.completed_at,
		'updated_at', d.updated_at
	)) as metadata,
	d.updated_at as sort_at,
	concat_ws(
		' ',
		'dispatch',
		'delivery',
		d.delivery_number,
		d.status::text,
		d.rejection_reason,
		d.rejection_proof::text,
		o.order_number,
		o.status::text,
		c.company_name,
		c.contact_name,
		c.phone,
		c.email,
		driver.full_name,
		driver.phone,
		driver.email,
		driver.vehicle_label,
		t.plate_number,
		t.status::text,
		t.body_type,
		t.capacity_tons::text,
		ca.street,
		ca.area,
		ca.city,
		ca.governorate,
		ca.landmark,
		public.ceo_search_date_terms(d.started_at),
		public.ceo_search_date_terms(d.arrived_at),
		public.ceo_search_date_terms(d.completed_at),
		public.ceo_search_date_terms(d.updated_at)
	) as search_text
from public.deliveries d
left join public.orders o on o.id = d.order_id
left join public.quote_requests qr on qr.id = o.quote_request_id
left join public.customers c on c.id = o.customer_id
left join public.customer_addresses ca on ca.id = qr.delivery_address_id
left join public.drivers driver on driver.id = d.driver_id
left join public.trucks t on t.id = d.truck_id
where public.can_access_ceo_search();

create or replace view public.ceo_search_driver_vtable
with (security_invoker = true)
as
select
	'driver'::text as entity_type,
	d.id::text as entity_id,
	d.full_name as title,
	coalesce(dos.status::text, d.status::text) as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'email', d.email,
		'phone', d.phone,
		'driver_status', d.status,
		'vehicle_label', d.vehicle_label,
		'online_status', dos.status,
		'last_seen_at', dos.last_seen_at,
		'truck_plates', trucks.plate_numbers,
		'updated_at', d.updated_at
	)) as metadata,
	d.updated_at as sort_at,
	concat_ws(
		' ',
		'driver',
		d.full_name,
		d.email,
		d.phone,
		d.status::text,
		dos.status::text,
		d.vehicle_label,
		trucks.plate_numbers,
		trucks.truck_search_text,
		public.ceo_search_date_terms(dos.last_seen_at),
		public.ceo_search_date_terms(d.updated_at)
	) as search_text
from public.drivers d
left join public.driver_online_states dos on dos.driver_id = d.id
left join lateral (
	select
		string_agg(t.plate_number, ', ' order by t.plate_number) as plate_numbers,
		string_agg(concat_ws(' ', t.plate_number, t.status::text, t.body_type, t.capacity_tons::text), ' ') as truck_search_text
	from public.trucks t
	where t.driver_id = d.id
) trucks on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_support_vtable
with (security_invoker = true)
as
select
	'support'::text as entity_type,
	st.id::text as entity_id,
	coalesce(st.reference, st.requester_name, c.company_name) as title,
	st.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'ticket',
		'reference', st.reference,
		'subject', st.subject,
		'requester', st.requester_name,
		'email', st.requester_email,
		'phone', st.requester_phone,
		'customer_name', c.company_name,
		'assigned_employee', assigned.full_name,
		'created_at', st.created_at,
		'updated_at', st.updated_at
	)) as metadata,
	st.updated_at as sort_at,
	concat_ws(
		' ',
		'support',
		'ticket',
		st.reference,
		st.subject,
		st.source::text,
		st.status::text,
		st.requester_name,
		st.requester_email,
		st.requester_phone,
		c.company_name,
		c.contact_name,
		assigned.full_name,
		public.ceo_search_date_terms(st.created_at),
		public.ceo_search_date_terms(st.updated_at)
	) as search_text
from public.support_tickets st
left join public.customers c on c.id = st.customer_id
left join public.employees assigned on assigned.id = st.assigned_employee_id
where public.can_access_ceo_search()
union all
select
	'support'::text as entity_type,
	sc.id::text as entity_id,
	coalesce(sc.external_thread_id, c.company_name, sc.phone, sc.email) as title,
	sc.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'conversation',
		'reference', sc.external_thread_id,
		'subject', sc.channel,
		'requester', coalesce(c.company_name, sc.phone, sc.email),
		'email', sc.email,
		'phone', sc.phone,
		'customer_name', c.company_name,
		'assigned_employee', assigned.full_name,
		'created_at', sc.created_at,
		'updated_at', sc.updated_at
	)) as metadata,
	sc.updated_at as sort_at,
	concat_ws(
		' ',
		'support',
		'conversation',
		sc.external_thread_id,
		sc.channel::text,
		sc.status::text,
		sc.phone,
		sc.email,
		c.company_name,
		c.contact_name,
		assigned.full_name,
		public.ceo_search_date_terms(sc.created_at),
		public.ceo_search_date_terms(sc.updated_at)
	) as search_text
from public.support_conversations sc
left join public.customers c on c.id = sc.customer_id
left join public.employees assigned on assigned.id = sc.assigned_employee_id
where public.can_access_ceo_search();

create or replace view public.ceo_search_supplier_vtable
with (security_invoker = true)
as
select
	'supplier'::text as entity_type,
	s.id::text as entity_id,
	s.name as title,
	s.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'phone', s.phone,
		'email', s.email,
		'tier', s.tier,
		'payment_terms', s.payment_terms,
		'rating', s.rating,
		'notes', s.notes,
		'custom_badges', s.custom_badges,
		'specialties', specialties.specialty_summary,
		'products', products.product_summary,
		'updated_at', s.updated_at
	)) as metadata,
	s.updated_at as sort_at,
	concat_ws(
		' ',
		'supplier',
		s.name,
		s.phone,
		s.email,
		s.status::text,
		s.tier,
		s.payment_terms,
		s.rating::text,
		s.notes,
		s.custom_badges::text,
		specialties.specialty_summary,
		products.product_summary,
		products.product_search_text,
		public.ceo_search_date_terms(s.created_at),
		public.ceo_search_date_terms(s.updated_at)
	) as search_text
from public.suppliers s
left join lateral (
	select string_agg(concat_ws(':', ss.category_slug, ss.product_slug), ', ' order by ss.category_slug, ss.product_slug) as specialty_summary
	from public.supplier_specialties ss
	where ss.supplier_id = s.id
) specialties on true
left join lateral (
	select
		string_agg(p.name, ', ' order by spl.is_primary desc, p.name) as product_summary,
		string_agg(
			concat_ws(' ', p.sku, p.name, p.name_ar, p.category, p.subcategory, p.brand, spl.raw_cost::text, spl.lead_time_days::text, spl.min_order_qty::text, spl.notes),
			' '
			order by spl.is_primary desc, p.name
		) as product_search_text
	from public.supplier_product_links spl
	join public.products p on p.id = spl.product_id
	where spl.supplier_id = s.id
) products on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_employee_vtable
with (security_invoker = true)
as
select
	'employee'::text as entity_type,
	e.id::text as entity_id,
	e.full_name as title,
	e.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'email', e.email,
		'phone', e.phone,
		'is_ceo', e.is_ceo,
		'roles', roles.role_summary,
		'department', comp.department,
		'title', comp.title,
		'hire_date', comp.hire_date,
		'base_salary', comp.base_salary,
		'social_insurance_salary', comp.social_insurance_salary,
		'salary_currency', comp.salary_currency,
		'created_at', e.created_at,
		'updated_at', coalesce(comp.updated_at, e.updated_at)
	)) as metadata,
	coalesce(comp.updated_at, e.updated_at) as sort_at,
	concat_ws(
		' ',
		'employee',
		e.full_name,
		e.status::text,
		e.email,
		e.phone,
		e.is_ceo::text,
		roles.role_summary,
		comp.department,
		comp.title,
		comp.base_salary::text,
		comp.social_insurance_salary::text,
		comp.salary_currency,
		public.ceo_search_date_terms(comp.hire_date),
		public.ceo_search_date_terms(e.created_at),
		public.ceo_search_date_terms(coalesce(comp.updated_at, e.updated_at))
	) as search_text
from public.employees e
left join public.employee_compensation comp on comp.employee_id = e.id
left join lateral (
	select string_agg(er.role::text, ', ' order by er.role::text) as role_summary
	from public.employee_roles er
	where er.employee_id = e.id
) roles on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_activity_vtable
with (security_invoker = true)
as
select
	'activity'::text as entity_type,
	ae.id::text as entity_id,
	ae.action::text as title,
	ae.entity_type as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'entity_id', ae.entity_id,
		'details', ae.details,
		'created_at', ae.created_at
	)) as metadata,
	ae.created_at as sort_at,
	concat_ws(
		' ',
		'activity',
		ae.action::text,
		ae.entity_type,
		ae.entity_id::text,
		ae.details::text,
		public.ceo_search_date_terms(ae.created_at)
	) as search_text
from public.activity_events ae
where public.can_access_ceo_search();

create or replace view public.ceo_search_index
with (security_invoker = true)
as
select * from public.ceo_search_order_vtable
union all
select * from public.ceo_search_quote_request_vtable
union all
select * from public.ceo_search_customer_vtable
union all
select * from public.ceo_search_payment_vtable
union all
select * from public.ceo_search_inventory_vtable
union all
select * from public.ceo_search_warehouse_vtable
union all
select * from public.ceo_search_receiving_vtable
union all
select * from public.ceo_search_dispatch_vtable
union all
select * from public.ceo_search_driver_vtable
union all
select * from public.ceo_search_support_vtable
union all
select * from public.ceo_search_supplier_vtable
union all
select * from public.ceo_search_employee_vtable
union all
select * from public.ceo_search_activity_vtable;

create or replace function public.admin_export_data(
	p_scope text,
	p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	export_id uuid := gen_random_uuid();
	payload jsonb;
	event_details jsonb;
begin
	employee_id := public.require_panel('admin', true);
	if p_reason is null or length(trim(p_reason)) < 8 then
		raise exception 'admin_export_reason_required' using errcode = '23514';
	end if;
	if p_scope not in (
		'products',
		'categories',
		'customers',
		'drivers',
		'suppliers',
		'employees',
		'pricing_rules',
		'trucks'
	) then
		raise exception 'unsupported_admin_export_scope' using errcode = '23514';
	end if;

	if p_scope = 'products' then
		select jsonb_agg(to_jsonb(p) - 'search_vector') into payload
		from public.products p;
	elsif p_scope = 'categories' then
		select jsonb_agg(to_jsonb(c)) into payload
		from public.categories c;
	elsif p_scope = 'customers' then
		select jsonb_agg(
			jsonb_build_object(
				'id', c.id,
				'company_name', c.company_name,
				'contact_name', c.contact_name,
				'phone_present', c.phone is not null,
				'email_domain', case when c.email is null then null else split_part(c.email, '@', 2) end,
				'status', c.status,
				'trade_license_status', c.trade_license_status,
				'tier', c.tier,
				'credit_limit', c.credit_limit,
				'payment_history', c.payment_history,
				'assigned_sales_rep_id', c.assigned_sales_rep_id,
				'created_at', c.created_at,
				'updated_at', c.updated_at
			)
		) into payload
		from public.customers c;
	elsif p_scope = 'drivers' then
		select jsonb_agg(
			jsonb_build_object(
				'id', d.id,
				'full_name', d.full_name,
				'email_domain', case when d.email is null then null else split_part(d.email, '@', 2) end,
				'phone_present', d.phone is not null,
				'status', d.status,
				'vehicle_label', d.vehicle_label,
				'created_at', d.created_at,
				'updated_at', d.updated_at
			)
		) into payload
		from public.drivers d;
	elsif p_scope = 'trucks' then
		select jsonb_agg(to_jsonb(t)) into payload
		from public.trucks t;
	elsif p_scope = 'suppliers' then
		select jsonb_agg(to_jsonb(s)) into payload
		from public.suppliers s;
	elsif p_scope = 'pricing_rules' then
		select jsonb_agg(to_jsonb(pr)) into payload
		from public.pricing_rules pr;
	elsif p_scope = 'employees' then
		select jsonb_agg(
			jsonb_build_object(
				'id', e.id,
				'full_name', e.full_name,
				'email_domain', split_part(e.email, '@', 2),
				'phone_present', e.phone is not null,
				'status', e.status,
				'is_ceo', e.is_ceo,
				'roles', coalesce(roles.roles, '[]'::jsonb),
				'department', comp.department,
				'title', comp.title,
				'hire_date', comp.hire_date,
				'base_salary', comp.base_salary,
				'social_insurance_salary', comp.social_insurance_salary,
				'salary_currency', comp.salary_currency,
				'created_at', e.created_at,
				'updated_at', greatest(e.updated_at, coalesce(comp.updated_at, e.updated_at))
			)
		) into payload
		from public.employees e
		left join public.employee_compensation comp on comp.employee_id = e.id
		left join lateral (
			select jsonb_agg(er.role order by er.role) as roles
			from public.employee_roles er
			where er.employee_id = e.id
		) roles on true;
	end if;

	event_details := jsonb_build_object(
		'employee_id', employee_id,
		'scope', p_scope,
		'reason', trim(p_reason),
		'row_count', coalesce(jsonb_array_length(coalesce(payload, '[]'::jsonb)), 0)
	);

	perform public.log_activity(
		'admin_export',
		export_id,
		'admin_export_created',
		event_details
	);
	perform public.log_activity(
		'admin_export',
		export_id,
		'admin_database_exported',
		event_details
	);

	return jsonb_build_object(
		'export_id', export_id,
		'scope', p_scope,
		'generated_at', now(),
		'rows', coalesce(payload, '[]'::jsonb)
	);
end;
$$;

grant execute on function public.admin_export_data(text, text) to authenticated;

do $$
declare
	relation_name text;
begin
	foreach relation_name in array array[
		'ceo_search_order_vtable',
		'ceo_search_quote_request_vtable',
		'ceo_search_customer_vtable',
		'ceo_search_payment_vtable',
		'ceo_search_inventory_vtable',
		'ceo_search_warehouse_vtable',
		'ceo_search_receiving_vtable',
		'ceo_search_dispatch_vtable',
		'ceo_search_driver_vtable',
		'ceo_search_support_vtable',
		'ceo_search_supplier_vtable',
		'ceo_search_employee_vtable',
		'ceo_search_activity_vtable',
		'ceo_search_index'
	] loop
		if to_regclass(format('public.%I', relation_name)) is not null then
			execute format(
				'revoke all privileges on table public.%I from anon, authenticated, public',
				relation_name
			);
			execute format(
				'grant select on table public.%I to authenticated',
				relation_name
			);
		end if;
	end loop;
end $$;
