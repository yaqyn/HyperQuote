create or replace view public.ceo_search_payment_vtable
with (security_invoker = true)
as
select
	'payment'::text as entity_type,
	concat('customer_order:', o.id::text) as entity_id,
	concat('Customer payment - ', o.order_number) as title,
	customer_finance.payment_status as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'customer_payment',
		'payment_status', customer_finance.payment_status,
		'total_due', customer_finance.total_due,
		'amount_paid', customer_finance.amount_paid,
		'remaining_due', customer_finance.remaining_due,
		'last_payment_at', customer_payments.last_payment_at,
		'recorded_by', customer_payments.recorded_by_names,
		'order_number', o.order_number,
		'request_number', qr.request_number,
		'quote_number', q.quote_number,
		'order_status', o.status,
		'company_name', c.company_name,
		'contact_name', c.contact_name,
		'phone', c.phone,
		'email', c.email,
		'delivery_address', concat_ws(', ', ca.street, ca.area, ca.city, ca.governorate, ca.landmark),
		'item_count', coalesce(order_items.item_count, 0),
		'item_summary', order_items.item_summary,
		'follow_up_state', customer_followup.follow_up_state,
		'follow_up_due_at', customer_followup.follow_up_due_at,
		'follow_up_outcome', customer_followup.outcome,
		'follow_up_notes', customer_followup.notes,
		'created_at', o.created_at,
		'updated_at', o.updated_at,
		'delivered_at', o.delivered_at
	)) as metadata,
	customer_sort.sort_at,
	concat_ws(
		' ',
		'finance',
		'payment',
		'customer payment',
		'customer receivable',
		customer_finance.payment_status,
		customer_finance.total_due::text,
		customer_finance.amount_paid::text,
		customer_finance.remaining_due::text,
		o.order_number,
		o.status::text,
		qr.request_number,
		q.quote_number,
		c.company_name,
		c.contact_name,
		c.phone,
		c.email,
		c.tier::text,
		ca.street,
		ca.area,
		ca.city,
		ca.governorate,
		ca.landmark,
		order_items.item_summary,
		order_items.item_search_text,
		customer_payments.recorded_by_names,
		customer_followup.contact_channel,
		customer_followup.outcome,
		customer_followup.notes,
		customer_followup.follow_up_state,
		public.ceo_search_date_terms(o.created_at),
		public.ceo_search_date_terms(o.updated_at),
		public.ceo_search_date_terms(o.delivered_at),
		public.ceo_search_date_terms(customer_payments.last_payment_at),
		public.ceo_search_date_terms(customer_followup.follow_up_due_at),
		public.ceo_search_date_terms(customer_followup.created_at)
	) as search_text
from public.orders o
left join public.customers c on c.id = o.customer_id
left join public.quote_requests qr on qr.id = o.quote_request_id
left join public.quotes q on q.id = o.quote_id
left join public.customer_addresses ca on ca.id = qr.delivery_address_id
left join lateral (
	select
		coalesce(sum(cp.amount), 0) as amount_paid,
		max(cp.created_at) as last_payment_at,
		string_agg(distinct coalesce(recorder.full_name, recorder.email), ', ') as recorded_by_names
	from public.customer_payments cp
	left join public.employees recorder on recorder.id = cp.recorded_by_employee_id
	where cp.order_id = o.id
	  and cp.status = 'recorded'
) customer_payments on true
left join lateral (
	select
		count(item_rows.id)::integer as item_count,
		string_agg(item_rows.item_label, ', ' order by item_rows.sort_order, item_rows.created_at) as item_summary,
		string_agg(item_rows.item_search, ' ' order by item_rows.sort_order, item_rows.created_at) as item_search_text
	from (
		select
			qri.id,
			qri.sort_order,
			qri.created_at,
			concat_ws(' ', qri.quantity::text, coalesce(p.name, qri.customer_description), qri.unit_of_measure) as item_label,
			concat_ws(
				' ',
				qri.quantity::text,
				qri.unit_of_measure,
				qri.customer_description,
				qri.notes,
				p.sku,
				p.slug,
				p.name,
				p.name_ar,
				p.category,
				p.subcategory,
				p.brand,
				p.manufacturer
			) as item_search
		from public.quote_request_items qri
		left join public.products p on p.id = qri.product_id
		where qri.quote_request_id = qr.id
		union all
		select
			qi.id,
			qi.sort_order,
			qi.created_at,
			concat_ws(' ', qi.quantity::text, qi.product_name, qi.unit_of_measure) as item_label,
			concat_ws(
				' ',
				qi.quantity::text,
				qi.unit_of_measure,
				qi.product_name,
				qi.product_name_ar,
				qi.unit_price::text,
				qi.line_total::text,
				p.sku,
				p.slug,
				p.category,
				p.subcategory,
				p.brand,
				p.manufacturer
			) as item_search
		from public.quote_items qi
		left join public.products p on p.id = qi.product_id
		where qi.quote_id = q.id
	) item_rows
) order_items on true
left join lateral (
	select fpf.*
	from public.finance_payment_followups fpf
	where fpf.order_id = o.id
	order by fpf.created_at desc
	limit 1
) customer_followup on true
cross join lateral (
	select
		round(coalesce(o.total_amount, 0), 2) as total_due,
		round(least(coalesce(o.total_amount, 0), coalesce(customer_payments.amount_paid, 0)), 2) as amount_paid
) customer_amounts
cross join lateral (
	select
		round(greatest(customer_amounts.total_due - customer_amounts.amount_paid, 0), 2) as remaining_due
) customer_remaining
cross join lateral (
	select
		customer_amounts.total_due,
		customer_amounts.amount_paid,
		customer_remaining.remaining_due,
		case
			when customer_amounts.total_due <= 0
				or customer_remaining.remaining_due <= 0 then 'paid'
			when customer_amounts.amount_paid > 0 then 'partial'
			else 'unpaid'
		end as payment_status
) customer_finance
cross join lateral (
	select max(sort_values.value) as sort_at
	from (values
		(o.updated_at),
		(o.created_at),
		(o.delivered_at),
		(customer_payments.last_payment_at),
		(customer_followup.created_at)
	) as sort_values(value)
) customer_sort
where public.can_access_ceo_search()
  and o.status::text not in ('rejected', 'canceled')
union all
select
	'payment'::text as entity_type,
	concat('supplier_refill:', rr.id::text) as entity_id,
	concat('Supplier payment - ', coalesce(s.name, 'Supplier'), ' - ', coalesce(p.name, 'Refill')) as title,
	supplier_finance.payment_status as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'supplier_payment',
		'payment_status', supplier_finance.payment_status,
		'total_due', supplier_finance.total_due,
		'amount_paid', supplier_finance.amount_paid,
		'remaining_due', supplier_finance.remaining_due,
		'last_payment_at', supplier_payments.last_payment_at,
		'recorded_by', supplier_payments.recorded_by_names,
		'supplier_name', s.name,
		'phone', s.phone,
		'email', s.email,
		'product_name', p.name,
		'product_sku', p.sku,
		'unit_of_measure', p.unit_of_measure,
		'quantity', rr.quantity,
		'unit_cost', rr.unit_cost,
		'refill_status', rr.status,
		'requested_by', requester.full_name,
		'follow_up_state', supplier_followup.follow_up_state,
		'follow_up_due_at', supplier_followup.follow_up_due_at,
		'follow_up_outcome', supplier_followup.outcome,
		'follow_up_notes', supplier_followup.notes,
		'created_at', rr.created_at,
		'updated_at', rr.updated_at
	)) as metadata,
	supplier_sort.sort_at,
	concat_ws(
		' ',
		'finance',
		'payment',
		'supplier payment',
		'supplier payable',
		supplier_finance.payment_status,
		supplier_finance.total_due::text,
		supplier_finance.amount_paid::text,
		supplier_finance.remaining_due::text,
		rr.status::text,
		rr.quantity::text,
		rr.unit_cost::text,
		s.name,
		s.phone,
		s.email,
		p.sku,
		p.slug,
		p.name,
		p.name_ar,
		p.category,
		p.subcategory,
		p.brand,
		p.manufacturer,
		p.unit_of_measure,
		requester.full_name,
		supplier_payments.recorded_by_names,
		supplier_followup.contact_channel,
		supplier_followup.outcome,
		supplier_followup.notes,
		supplier_followup.follow_up_state,
		public.ceo_search_date_terms(rr.created_at),
		public.ceo_search_date_terms(rr.updated_at),
		public.ceo_search_date_terms(supplier_payments.last_payment_at),
		public.ceo_search_date_terms(supplier_followup.follow_up_due_at),
		public.ceo_search_date_terms(supplier_followup.created_at)
	) as search_text
from public.refill_requests rr
left join public.suppliers s on s.id = rr.supplier_id
left join public.products p on p.id = rr.product_id
left join public.employees requester on requester.id = rr.requested_by_employee_id
left join lateral (
	select
		coalesce(sum(sp.amount), 0) as amount_paid,
		max(sp.created_at) as last_payment_at,
		string_agg(distinct coalesce(recorder.full_name, recorder.email), ', ') as recorded_by_names
	from public.supplier_payments sp
	left join public.employees recorder on recorder.id = sp.recorded_by_employee_id
	where sp.refill_request_id = rr.id
	  and sp.status = 'recorded'
) supplier_payments on true
left join lateral (
	select fpf.*
	from public.finance_payment_followups fpf
	where fpf.refill_request_id = rr.id
	order by fpf.created_at desc
	limit 1
) supplier_followup on true
cross join lateral (
	select
		round(coalesce(rr.quantity, 0) * coalesce(rr.unit_cost, 0), 2) as total_due,
		round(least(coalesce(rr.quantity, 0) * coalesce(rr.unit_cost, 0), coalesce(supplier_payments.amount_paid, 0)), 2) as amount_paid
) supplier_amounts
cross join lateral (
	select
		round(greatest(supplier_amounts.total_due - supplier_amounts.amount_paid, 0), 2) as remaining_due
) supplier_remaining
cross join lateral (
	select
		supplier_amounts.total_due,
		supplier_amounts.amount_paid,
		supplier_remaining.remaining_due,
		case
			when supplier_amounts.total_due <= 0
				or supplier_remaining.remaining_due <= 0 then 'paid'
			when supplier_amounts.amount_paid > 0 then 'partial'
			else 'unpaid'
		end as payment_status
) supplier_finance
cross join lateral (
	select max(sort_values.value) as sort_at
	from (values
		(rr.updated_at),
		(rr.created_at),
		(supplier_payments.last_payment_at),
		(supplier_followup.created_at)
	) as sort_values(value)
) supplier_sort
where public.can_access_ceo_search()
  and rr.status::text not in ('rejected', 'canceled');

grant select on table public.ceo_search_payment_vtable to authenticated;

do $$
begin
	if to_regprocedure('app_private.refresh_ceo_search_documents()') is not null then
		perform app_private.refresh_ceo_search_documents();
	end if;
end
$$;
