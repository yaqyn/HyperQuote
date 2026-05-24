create or replace view public.ceo_search_approval_vtable
with (security_invoker = true)
as
select
	'approval'::text as entity_type,
	a.id::text as entity_id,
	concat('Approval - ', coalesce(target.target_label, a.entity_type, a.id::text)) as title,
	a.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'approval',
		'approval_type', a.approval_type,
		'target_type', a.entity_type,
		'target', target.target_label,
		'requested_by', requester.full_name,
		'assigned_to', assignee.full_name,
		'status', a.status,
		'context', a.context,
		'decided_at', a.decided_at,
		'created_at', a.created_at,
		'updated_at', a.updated_at
	)) as metadata,
	coalesce(a.decided_at, a.updated_at, a.created_at) as sort_at,
	concat_ws(' ',
		'approval',
		a.approval_type,
		a.entity_type,
		a.status::text,
		target.target_label,
		requester.full_name,
		assignee.full_name,
		a.context::text,
		ceo_search_date_terms(a.decided_at),
		ceo_search_date_terms(a.created_at),
		ceo_search_date_terms(a.updated_at)
	) as search_text
from public.approvals a
left join public.employees requester on requester.id = a.requested_by
left join public.employees assignee on assignee.id = a.assigned_to
left join public.orders target_order
	on a.entity_type in ('order', 'orders') and target_order.id = a.entity_id
left join public.quote_requests target_request
	on a.entity_type in ('quote_request', 'quote_requests')
	and target_request.id = a.entity_id
left join public.refill_requests target_refill
	on a.entity_type in ('refill_request', 'refill_requests')
	and target_refill.id = a.entity_id
left join public.price_update_requests target_price_request
	on a.entity_type in ('price_update_request', 'price_update_requests')
	and target_price_request.id = a.entity_id
left join lateral (
	select coalesce(
		target_order.order_number,
		target_request.request_number,
		concat('Refill ', target_refill.id::text),
		concat('Price request ', target_price_request.id::text),
		a.entity_id::text
	) as target_label
) target on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_category_vtable
with (security_invoker = true)
as
select
	'category'::text as entity_type,
	c.id::text as entity_id,
	c.name as title,
	case when c.is_active then 'active' else 'inactive' end as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'category',
		'slug', c.slug,
		'name_ar', c.name_ar,
		'parent_category', parent.name,
		'description', c.description,
		'description_ar', c.description_ar,
		'product_count', products.product_count,
		'is_active', c.is_active,
		'created_at', c.created_at,
		'updated_at', c.updated_at
	)) as metadata,
	c.updated_at as sort_at,
	concat_ws(' ',
		'category',
		c.slug,
		c.name,
		c.name_ar,
		parent.name,
		parent.name_ar,
		c.description,
		c.description_ar,
		case when c.is_active then 'active' else 'inactive' end,
		products.product_names,
		ceo_search_date_terms(c.created_at),
		ceo_search_date_terms(c.updated_at)
	) as search_text
from public.categories c
left join public.categories parent on parent.id = c.parent_id
left join lateral (
	select
		count(p.id)::integer as product_count,
		string_agg(concat_ws(' ', p.sku, p.name, p.name_ar, p.slug), ' ' order by p.name) as product_names
	from public.products p
	where p.category = c.slug
	   or p.category = c.name
) products on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_pricing_vtable
with (security_invoker = true)
as
select
	'pricing'::text as entity_type,
	concat('price_request:', pur.id::text) as entity_id,
	concat('Price request - ', coalesce(p.name, pur.id::text)) as title,
	pur.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'price_update_request',
		'product_name', p.name,
		'product_sku', p.sku,
		'product_category', p.category,
		'request_number', qr.request_number,
		'requested_item', coalesce(qri.customer_description, p.name),
		'requested_by', requester.full_name,
		'assigned_to', assignee.full_name,
		'reason', pur.reason,
		'status', pur.status,
		'created_at', pur.created_at,
		'updated_at', pur.updated_at,
		'resolved_at', pur.resolved_at
	)) as metadata,
	coalesce(pur.resolved_at, pur.updated_at, pur.created_at) as sort_at,
	concat_ws(' ',
		'pricing',
		'price request',
		pur.status::text,
		pur.reason,
		p.sku,
		p.slug,
		p.name,
		p.name_ar,
		p.category,
		qr.request_number,
		qri.customer_description,
		qri.product_name_ar,
		requester.full_name,
		assignee.full_name,
		ceo_search_date_terms(pur.created_at),
		ceo_search_date_terms(pur.updated_at),
		ceo_search_date_terms(pur.resolved_at)
	) as search_text
from public.price_update_requests pur
left join public.products p on p.id = pur.product_id
left join public.quote_requests qr on qr.id = pur.quote_request_id
left join public.quote_request_items qri on qri.id = pur.quote_request_item_id
left join public.employees requester on requester.id = pur.requested_by_employee_id
left join public.employees assignee on assignee.id = pur.assigned_employee_id
where public.can_access_ceo_search()
union all
select
	'pricing'::text as entity_type,
	concat('price_update:', pu.id::text) as entity_id,
	concat('Price update - ', coalesce(p.name, pu.id::text)) as title,
	'recorded'::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'price_update',
		'product_name', p.name,
		'product_sku', p.sku,
		'product_category', p.category,
		'supplier_name', s.name,
		'updated_by', updater.full_name,
		'old_price', pu.old_price,
		'new_price', pu.new_price,
		'proof_path', pu.proof_path,
		'notes', pu.notes,
		'created_at', pu.created_at
	)) as metadata,
	pu.created_at as sort_at,
	concat_ws(' ',
		'pricing',
		'price update',
		p.sku,
		p.slug,
		p.name,
		p.name_ar,
		p.category,
		s.name,
		s.phone,
		s.email,
		updater.full_name,
		pu.old_price::text,
		pu.new_price::text,
		pu.proof_path,
		pu.notes,
		ceo_search_date_terms(pu.created_at)
	) as search_text
from public.price_updates pu
left join public.products p on p.id = pu.product_id
left join public.suppliers s on s.id = pu.supplier_id
left join public.employees updater on updater.id = pu.updated_by_employee_id
where public.can_access_ceo_search()
union all
select
	'pricing'::text as entity_type,
	concat('pricing_rule:', pr.id::text) as entity_id,
	concat('Pricing rule - ', coalesce(p.name, category.name, pr.product_category, pr.category_slug, pr.id::text)) as title,
	case when pr.active then 'active' else 'inactive' end as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'pricing_rule',
		'product_name', p.name,
		'product_sku', p.sku,
		'category', coalesce(category.name, pr.product_category, pr.category_slug),
		'category_slug', pr.category_slug,
		'product_slug', pr.product_slug,
		'bonus_margin', pr.bonus_margin,
		'target_margin', pr.target_margin,
		'floor_margin', pr.floor_margin,
		'absolute_min_margin', pr.absolute_min_margin,
		'active', pr.active,
		'updated_by', updater.full_name,
		'created_at', pr.created_at,
		'updated_at', pr.updated_at
	)) as metadata,
	pr.updated_at as sort_at,
	concat_ws(' ',
		'pricing',
		'pricing rule',
		case when pr.active then 'active' else 'inactive' end,
		pr.product_category,
		pr.category_slug,
		pr.product_slug,
		category.name,
		category.name_ar,
		p.sku,
		p.slug,
		p.name,
		p.name_ar,
		pr.bonus_margin::text,
		pr.target_margin::text,
		pr.floor_margin::text,
		pr.absolute_min_margin::text,
		updater.full_name,
		ceo_search_date_terms(pr.created_at),
		ceo_search_date_terms(pr.updated_at)
	) as search_text
from public.pricing_rules pr
left join public.products p on p.slug = pr.product_slug
left join public.categories category
	on category.slug = pr.category_slug
	or category.slug = pr.product_category
	or category.name = pr.product_category
left join public.employees updater on updater.id = pr.updated_by_employee_id
where public.can_access_ceo_search();

create or replace view public.ceo_search_support_message_vtable
with (security_invoker = true)
as
select
	'support_message'::text as entity_type,
	sm.id::text as entity_id,
	concat('Support message - ', coalesce(st.reference, sc.external_thread_id, c.company_name, sm.id::text)) as title,
	sm.channel::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'support_message',
		'channel', sm.channel,
		'sender_type', sm.sender_type,
		'sender', coalesce(sender_employee.full_name, sender_profile.display_name, c.company_name),
		'message_body', left(sm.body, 500),
		'ticket_reference', st.reference,
		'ticket_subject', st.subject,
		'conversation_reference', sc.external_thread_id,
		'customer_name', c.company_name,
		'provider_status', sm.provider_status,
		'provider_error', sm.provider_error,
		'attachment_count', attachments.attachment_count,
		'created_at', sm.created_at
	)) as metadata,
	sm.created_at as sort_at,
	concat_ws(' ',
		'support',
		'message',
		sm.channel::text,
		sm.sender_type::text,
		sm.body,
		st.reference,
		st.subject,
		sc.external_thread_id,
		c.company_name,
		c.contact_name,
		c.phone,
		c.email,
		sender_employee.full_name,
		sender_profile.display_name,
		sm.provider_status,
		sm.provider_error,
		attachments.attachment_search_text,
		ceo_search_date_terms(sm.created_at)
	) as search_text
from public.support_messages sm
left join public.support_tickets st on st.id = sm.ticket_id
left join public.support_conversations sc on sc.id = sm.conversation_id
left join public.customers c on c.id = coalesce(st.customer_id, sc.customer_id)
left join public.employees sender_employee on sender_employee.user_id = sm.sender_user_id
left join public.user_profiles sender_profile on sender_profile.user_id = sm.sender_user_id
left join lateral (
	select
		count(sa.id)::integer as attachment_count,
		string_agg(concat_ws(' ', sa.storage_path, sa.content_type), ' ' order by sa.created_at) as attachment_search_text
	from public.support_attachments sa
	where sa.message_id = sm.id
) attachments on true
where public.can_access_ceo_search();

create or replace view public.ceo_search_sales_history_vtable
with (security_invoker = true)
as
select
	'sales_history'::text as entity_type,
	concat('sales_quote_version:', sqv.id::text) as entity_id,
	concat('Sales quote v', sqv.version_number::text, ' - ', coalesce(qr.request_number, c.company_name, sqv.id::text)) as title,
	sqv.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'sales_quote_version',
		'request_number', qr.request_number,
		'company_name', c.company_name,
		'created_by', creator.full_name,
		'version_number', sqv.version_number,
		'status', sqv.status,
		'subtotal', sqv.subtotal,
		'tax_amount', sqv.tax_amount,
		'delivery_fee', sqv.delivery_fee,
		'discount_amount', sqv.discount_amount,
		'total', sqv.total,
		'notes', sqv.notes,
		'created_at', sqv.created_at
	)) as metadata,
	sqv.created_at as sort_at,
	concat_ws(' ',
		'sales',
		'sales quote version',
		sqv.version_number::text,
		sqv.status::text,
		sqv.subtotal::text,
		sqv.tax_amount::text,
		sqv.delivery_fee::text,
		sqv.discount_amount::text,
		sqv.total::text,
		sqv.notes,
		qr.request_number,
		c.company_name,
		c.contact_name,
		creator.full_name,
		ceo_search_date_terms(sqv.created_at)
	) as search_text
from public.sales_quote_versions sqv
left join public.quote_requests qr on qr.id = sqv.quote_request_id
left join public.customers c on c.id = qr.customer_id
left join public.employees creator on creator.id = sqv.created_by_employee_id
where public.can_access_ceo_search()
union all
select
	'sales_history'::text as entity_type,
	concat('quote_version:', qv.id::text) as entity_id,
	concat('Quote v', qv.version_number::text, ' - ', coalesce(q.quote_number, c.company_name, qv.id::text)) as title,
	qv.status::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'quote_version',
		'quote_number', q.quote_number,
		'request_number', qr.request_number,
		'company_name', c.company_name,
		'version_number', qv.version_number,
		'status', qv.status,
		'subtotal', qv.subtotal,
		'total', qv.total,
		'notes', qv.notes,
		'created_at', qv.created_at
	)) as metadata,
	qv.created_at as sort_at,
	concat_ws(' ',
		'sales',
		'quote version',
		qv.version_number::text,
		qv.status::text,
		qv.subtotal::text,
		qv.total::text,
		qv.notes,
		q.quote_number,
		qr.request_number,
		c.company_name,
		c.contact_name,
		ceo_search_date_terms(qv.created_at)
	) as search_text
from public.quote_versions qv
left join public.quotes q on q.id = qv.quote_id
left join public.quote_requests qr on qr.id = q.quote_request_id
left join public.customers c on c.id = q.customer_id
where public.can_access_ceo_search()
union all
select
	'sales_history'::text as entity_type,
	concat('sales_call_note:', scn.id::text) as entity_id,
	concat('Sales call - ', coalesce(c.company_name, qr.request_number, scn.id::text)) as title,
	scn.outcome as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'sales_call_note',
		'request_number', qr.request_number,
		'company_name', c.company_name,
		'employee', employee.full_name,
		'outcome', scn.outcome,
		'notes', scn.notes,
		'created_at', scn.created_at
	)) as metadata,
	scn.created_at as sort_at,
	concat_ws(' ',
		'sales',
		'call note',
		scn.outcome,
		scn.notes,
		qr.request_number,
		c.company_name,
		c.contact_name,
		c.phone,
		employee.full_name,
		ceo_search_date_terms(scn.created_at)
	) as search_text
from public.sales_call_notes scn
left join public.quote_requests qr on qr.id = scn.quote_request_id
left join public.customers c on c.id = qr.customer_id
left join public.employees employee on employee.id = scn.employee_id
where public.can_access_ceo_search()
union all
select
	'sales_history'::text as entity_type,
	concat('quote_counter_offer:', qco.id::text) as entity_id,
	concat('Counter offer - ', coalesce(q.quote_number, c.company_name, qco.id::text)) as title,
	qco.counter_type::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'quote_counter_offer',
		'quote_number', q.quote_number,
		'request_number', qr.request_number,
		'company_name', c.company_name,
		'counter_type', qco.counter_type,
		'total_discount', qco.total_discount,
		'self_pickup', qco.self_pickup,
		'notes', qco.notes,
		'line_items', qco.line_items,
		'created_at', qco.created_at
	)) as metadata,
	qco.created_at as sort_at,
	concat_ws(' ',
		'sales',
		'counter offer',
		qco.counter_type::text,
		qco.total_discount::text,
		qco.self_pickup::text,
		qco.notes,
		qco.line_items::text,
		q.quote_number,
		qr.request_number,
		c.company_name,
		c.contact_name,
		ceo_search_date_terms(qco.created_at)
	) as search_text
from public.quote_counter_offers qco
left join public.quotes q on q.id = qco.quote_id
left join public.quote_requests qr on qr.id = q.quote_request_id
left join public.customers c on c.id = q.customer_id
where public.can_access_ceo_search();

create or replace view public.ceo_search_driver_location_vtable
with (security_invoker = true)
as
with latest_location as (
	select distinct on (dl.driver_id)
		dl.*
	from public.driver_locations dl
	order by dl.driver_id, dl.recorded_at desc
)
select
	'driver_location'::text as entity_type,
	ll.driver_id::text as entity_id,
	concat('Driver location - ', coalesce(driver.full_name, ll.driver_id::text)) as title,
	coalesce(online.status::text, driver.status::text, ll.source::text) as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'driver_location',
		'driver_name', driver.full_name,
		'driver_phone', driver.phone,
		'driver_status', driver.status,
		'online_status', online.status,
		'delivery_number', delivery.delivery_number,
		'order_number', orders.order_number,
		'company_name', customer.company_name,
		'latitude', ll.latitude,
		'longitude', ll.longitude,
		'accuracy_meters', ll.accuracy_meters,
		'heading', ll.heading,
		'speed_kmh', ll.speed_kmh,
		'location_source', ll.source,
		'recorded_at', ll.recorded_at,
		'last_seen_at', online.last_seen_at
	)) as metadata,
	ll.recorded_at as sort_at,
	concat_ws(' ',
		'dispatch',
		'driver location',
		driver.full_name,
		driver.phone,
		driver.status::text,
		online.status::text,
		delivery.delivery_number,
		orders.order_number,
		customer.company_name,
		ll.latitude::text,
		ll.longitude::text,
		ll.accuracy_meters::text,
		ll.heading::text,
		ll.speed_kmh::text,
		ll.source::text,
		ceo_search_date_terms(ll.recorded_at),
		ceo_search_date_terms(online.last_seen_at)
	) as search_text
from latest_location ll
left join public.drivers driver on driver.id = ll.driver_id
left join public.driver_online_states online on online.driver_id = ll.driver_id
left join public.deliveries delivery on delivery.id = ll.delivery_id
left join public.orders orders on orders.id = delivery.order_id
left join public.customers customer on customer.id = orders.customer_id
where public.can_access_ceo_search();

create or replace view public.ceo_search_document_vtable
with (security_invoker = true)
as
select
	'document'::text as entity_type,
	concat('document:', d.id::text) as entity_id,
	coalesce(d.title, d.reference, d.related_order_ref, d.id::text) as title,
	d.type::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'document',
		'document_type', d.type,
		'reference', d.reference,
		'title', d.title,
		'customer_name', c.company_name,
		'related_order_ref', d.related_order_ref,
		'file_size', d.file_size,
		'storage_path', d.storage_path,
		'created_at', d.created_at,
		'updated_at', d.updated_at
	)) as metadata,
	d.updated_at as sort_at,
	concat_ws(' ',
		'document',
		d.type::text,
		d.reference,
		d.title,
		d.related_order_ref,
		d.file_size,
		d.storage_path,
		c.company_name,
		c.contact_name,
		ceo_search_date_terms(d.created_at),
		ceo_search_date_terms(d.updated_at)
	) as search_text
from public.documents d
left join public.customers c on c.id = d.customer_id
where public.can_access_ceo_search()
union all
select
	'document'::text as entity_type,
	concat('delivery_proof:', dp.id::text) as entity_id,
	concat('Delivery proof - ', coalesce(delivery.delivery_number, dp.id::text)) as title,
	dp.proof_type::text as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'delivery_proof',
		'proof_type', dp.proof_type,
		'proof_path', dp.proof_path,
		'signer_name', dp.signer_name,
		'driver_name', driver.full_name,
		'delivery_number', delivery.delivery_number,
		'order_number', orders.order_number,
		'customer_name', customer.company_name,
		'location', dp.location,
		'created_at', dp.created_at
	)) as metadata,
	dp.created_at as sort_at,
	concat_ws(' ',
		'document',
		'delivery proof',
		dp.proof_type::text,
		dp.proof_path,
		dp.signer_name,
		driver.full_name,
		delivery.delivery_number,
		orders.order_number,
		customer.company_name,
		dp.location::text,
		ceo_search_date_terms(dp.created_at)
	) as search_text
from public.delivery_proofs dp
left join public.drivers driver on driver.id = dp.driver_id
left join public.deliveries delivery on delivery.id = dp.delivery_id
left join public.orders orders on orders.id = delivery.order_id
left join public.customers customer on customer.id = orders.customer_id
where public.can_access_ceo_search()
union all
select
	'document'::text as entity_type,
	concat('support_attachment:', sa.id::text) as entity_id,
	concat('Support attachment - ', coalesce(st.reference, sc.external_thread_id, sa.id::text)) as title,
	coalesce(sa.content_type, 'attachment') as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'source', 'support_attachment',
		'storage_path', sa.storage_path,
		'content_type', sa.content_type,
		'ticket_reference', st.reference,
		'ticket_subject', st.subject,
		'conversation_reference', sc.external_thread_id,
		'customer_name', c.company_name,
		'created_at', sa.created_at
	)) as metadata,
	sa.created_at as sort_at,
	concat_ws(' ',
		'document',
		'support attachment',
		sa.storage_path,
		sa.content_type,
		st.reference,
		st.subject,
		sc.external_thread_id,
		c.company_name,
		c.contact_name,
		ceo_search_date_terms(sa.created_at)
	) as search_text
from public.support_attachments sa
left join public.support_messages sm on sm.id = sa.message_id
left join public.support_tickets st on st.id = sm.ticket_id
left join public.support_conversations sc on sc.id = sm.conversation_id
left join public.customers c on c.id = coalesce(st.customer_id, sc.customer_id)
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
		'panels', panels.panel_summary,
		'presence_status', presence.status,
		'active_panel', presence.active_panel,
		'last_seen_at', presence.last_seen_at,
		'department', comp.department,
		'title', comp.title,
		'hire_date', comp.hire_date,
		'base_salary', comp.base_salary,
		'social_insurance_salary', comp.social_insurance_salary,
		'salary_currency', comp.salary_currency,
		'created_at', e.created_at,
		'updated_at', greatest(
			e.updated_at,
			coalesce(comp.updated_at, e.updated_at),
			coalesce(presence.updated_at, e.updated_at)
		)
	)) as metadata,
	greatest(
		e.updated_at,
		coalesce(comp.updated_at, e.updated_at),
		coalesce(presence.updated_at, e.updated_at)
	) as sort_at,
	concat_ws(' ',
		'employee',
		e.full_name,
		e.status::text,
		e.email,
		e.phone,
		e.is_ceo::text,
		roles.role_summary,
		panels.panel_summary,
		presence.status::text,
		presence.active_panel::text,
		comp.department,
		comp.title,
		comp.base_salary::text,
		comp.social_insurance_salary::text,
		comp.salary_currency,
		ceo_search_date_terms(comp.hire_date),
		ceo_search_date_terms(e.created_at),
		ceo_search_date_terms(greatest(
			e.updated_at,
			coalesce(comp.updated_at, e.updated_at),
			coalesce(presence.updated_at, e.updated_at)
		)),
		ceo_search_date_terms(presence.last_seen_at)
	) as search_text
from public.employees e
left join public.employee_compensation comp on comp.employee_id = e.id
left join public.employee_presence presence on presence.employee_id = e.id
left join lateral (
	select string_agg(er.role::text, ', ' order by er.role::text) as role_summary
	from public.employee_roles er
	where er.employee_id = e.id
) roles on true
left join lateral (
	select string_agg(
		concat(ep.panel::text, case when ep.can_write then ' write' when ep.can_read then ' read' else '' end),
		', ' order by ep.panel::text
	) as panel_summary
	from public.employee_panel_permissions ep
	where ep.employee_id = e.id
	  and ep.can_read
) panels on true
where public.can_access_ceo_search();

create or replace function app_private.refresh_ceo_search_documents()
returns integer
language plpgsql
security definer
set search_path = public, app_private, extensions
as $$
declare
	search_user_id uuid;
	refreshed_count integer := 0;
begin
	select e.user_id into search_user_id
	from public.employees e
	where e.user_id is not null
	  and e.status = 'active'
	  and (
		e.is_ceo
		or exists (
			select 1
			from public.employee_roles er
			where er.employee_id = e.id
			  and er.role = 'ceo'
		)
		or exists (
			select 1
			from public.employee_panel_permissions ep
			where ep.employee_id = e.id
			  and ep.panel = 'search'
			  and ep.can_read
		)
	  )
	order by e.is_ceo desc, e.created_at asc
	limit 1;

	if search_user_id is null then
		select count(*)::integer into refreshed_count
		from public.ceo_search_documents;
		return refreshed_count;
	end if;

	perform set_config('request.jwt.claim.sub', search_user_id::text, true);
	perform set_config(
		'request.jwt.claims',
		jsonb_build_object('sub', search_user_id::text, 'role', 'authenticated')::text,
		true
	);

	with source_rows as materialized (
		select distinct on (source_candidates.entity_type, source_candidates.entity_id)
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
		from (
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
			select * from public.ceo_search_approval_vtable
			union all
			select * from public.ceo_search_category_vtable
			union all
			select * from public.ceo_search_pricing_vtable
			union all
			select * from public.ceo_search_support_message_vtable
			union all
			select * from public.ceo_search_sales_history_vtable
			union all
			select * from public.ceo_search_driver_location_vtable
			union all
			select * from public.ceo_search_document_vtable
			union all
			select * from public.ceo_search_activity_vtable
		) source_candidates
		where source_candidates.entity_type is not null
		  and source_candidates.entity_id is not null
		order by source_candidates.entity_type, source_candidates.entity_id, source_candidates.sort_at desc nulls last
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
		where not exists (
			select 1
			from source_rows
			where source_rows.entity_type = documents.entity_type
			  and source_rows.entity_id = documents.entity_id
		)
		returning 1
	)
	select counted.source_count into refreshed_count
	from (
		select count(*)::integer as source_count
		from source_rows
	) counted
	cross join (
		select count(*) as upsert_count
		from upserted
	) upsert_summary
	cross join (
		select count(*) as delete_count
		from deleted
	) delete_summary;

	return refreshed_count;
end;
$$;

revoke all privileges on function app_private.refresh_ceo_search_documents()
	from anon, authenticated, public;

do $$
declare
	source_table text;
begin
	foreach source_table in array array[
		'approvals',
		'categories',
		'delivery_proofs',
		'documents',
		'driver_locations',
		'employee_panel_permissions',
		'employee_presence',
		'price_update_requests',
		'price_updates',
		'pricing_rules',
		'quote_counter_offers',
		'quote_versions',
		'sales_call_notes',
		'sales_quote_versions',
		'support_attachments',
		'support_messages'
	] loop
		if to_regclass(format('public.%I', source_table)) is not null then
			execute format(
				'drop trigger if exists ceo_search_documents_dirty on public.%I',
				source_table
			);
			execute format(
				'create trigger ceo_search_documents_dirty after insert or update or delete or truncate on public.%I for each statement execute function app_private.mark_ceo_search_documents_dirty()',
				source_table
			);
		end if;
	end loop;
end
$$;

select app_private.refresh_ceo_search_documents_if_dirty(true);
