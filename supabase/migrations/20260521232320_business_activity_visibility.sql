create or replace function public.is_important_activity(
	p_action public.audit_event_type,
	p_entity_type text,
	p_details jsonb default '{}'::jsonb
)
returns boolean
language sql
immutable
set search_path = public
as $$
	select
		not (coalesce(p_details, '{}'::jsonb) ? 'source_action')
		and (
			p_action in (
				'customer_profile_claimed',
				'customer_payment_followup_recorded',
				'customer_payment_recorded',
				'customer_quote_accepted',
				'customer_quote_declined',
				'customer_quote_line_response_submitted',
				'customer_quote_negotiation_requested',
				'customer_signature_captured',
				'delivery_returned_to_warehouse_loading',
				'dispatch_delivery_completed',
				'dispatch_delivery_rejected',
				'dispatch_driver_assigned',
				'driver_assigned_delivery',
				'driver_delivery_accepted',
				'driver_delivery_arrived',
				'driver_delivery_confirmed',
				'driver_delivery_rejected',
				'driver_delivery_route_reopened',
				'driver_delivery_started',
				'driver_rejection_proof_uploaded',
				'internal_employee_created',
				'internal_employee_role_assigned',
				'internal_employee_role_removed',
				'inventory_order_evaluated',
				'inventory_price_updated',
				'manual_order_created',
				'order_stock_reserved',
				'order_submitted',
				'price_update_requested',
				'provisional_customer_created',
				'provisional_customer_confirmed',
				'sales_customer_called',
				'sales_order_canceled',
				'sales_order_claimed',
				'sales_order_confirmed',
				'sales_order_rejected',
				'sales_order_requeued',
				'sales_quote_approved',
				'supplier_payment_followup_recorded',
				'supplier_payment_recorded',
				'supplier_refill_canceled',
				'supplier_refill_created',
				'support_assigned',
				'support_conversation_linked_to_customer',
				'support_reply_sent',
				'support_status_updated',
				'support_ticket_created',
				'admin_database_exported',
				'warehouse_loading_approved',
				'warehouse_loading_driver_assigned',
				'warehouse_loading_driver_removed',
				'warehouse_loading_marked_ready',
				'warehouse_loading_rejected',
				'warehouse_loading_reset',
				'warehouse_loading_started',
				'warehouse_receiving_approved',
				'warehouse_receiving_rejected',
				'whatsapp_message_ingested'
			)
			or (
				p_action in (
					'admin_record_created',
					'admin_record_updated',
					'admin_record_deactivated'
				)
				and p_entity_type in (
					'customer',
					'driver',
					'employee',
					'pricing_rule',
					'product',
					'supplier',
					'supplier_product_link',
					'truck'
				)
			)
			or (
				p_action in ('employee_role_assigned', 'employee_role_removed')
				and p_entity_type = 'employee'
			)
		)
$$;

grant execute on function public.is_important_activity(
	public.audit_event_type,
	text,
	jsonb
) to authenticated;

create or replace function app_private.keep_only_business_activity_events()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if public.is_important_activity(new.action, new.entity_type, new.details) then
		return new;
	end if;

	return null;
end;
$$;

drop trigger if exists activity_events_business_filter
	on public.activity_events;
create trigger activity_events_business_filter
	before insert on public.activity_events
	for each row
	execute function app_private.keep_only_business_activity_events();

drop trigger if exists activity_event_flow_aliases
	on public.activity_events;

create or replace function public.ceo_activity_action_label(
	p_action public.audit_event_type
)
returns text
language sql
immutable
set search_path = public
as $$
	select case p_action::text
		when 'admin_record_created' then 'Admin record created'
		when 'admin_record_deactivated' then 'Admin record deactivated'
		when 'admin_record_updated' then 'Admin record updated'
		when 'admin_database_exported' then 'Database export created'
		when 'admin_role_assigned' then 'Admin role assigned'
		when 'admin_role_removed' then 'Admin role removed'
		when 'customer_profile_claimed' then 'Customer profile claimed'
		when 'customer_payment_followup_recorded' then 'Customer payment follow-up recorded'
		when 'customer_payment_recorded' then 'Customer payment recorded'
		when 'customer_quote_accepted' then 'Customer accepted quote'
		when 'customer_quote_declined' then 'Customer declined quote'
		when 'customer_quote_line_response_submitted' then 'Customer responded to quote lines'
		when 'customer_quote_negotiation_requested' then 'Customer requested negotiation'
		when 'customer_signature_captured' then 'Customer signature captured'
		when 'delivery_returned_to_warehouse_loading' then 'Delivery returned to warehouse'
		when 'dispatch_delivery_completed' then 'Delivery completed'
		when 'dispatch_delivery_rejected' then 'Delivery rejected'
		when 'dispatch_driver_assigned' then 'Driver assigned'
		when 'driver_assigned_delivery' then 'Driver received assignment'
		when 'driver_delivery_accepted' then 'Driver accepted delivery'
		when 'driver_delivery_arrived' then 'Driver arrived'
		when 'driver_delivery_confirmed' then 'Driver confirmed delivery'
		when 'driver_delivery_rejected' then 'Driver rejected delivery'
		when 'driver_delivery_route_reopened' then 'Delivery route reopened'
		when 'driver_delivery_started' then 'Driver started delivery'
		when 'driver_rejection_proof_uploaded' then 'Driver uploaded rejection proof'
		when 'employee_role_assigned' then 'Employee role assigned'
		when 'employee_role_removed' then 'Employee role removed'
		when 'internal_employee_created' then 'Employee created'
		when 'internal_employee_role_assigned' then 'Employee role assigned'
		when 'internal_employee_role_removed' then 'Employee role removed'
		when 'inventory_order_evaluated' then 'Inventory evaluated order'
		when 'inventory_price_updated' then 'Inventory price updated'
		when 'manual_order_created' then 'Manual order created'
		when 'order_stock_reserved' then 'Stock reserved'
		when 'order_submitted' then 'Order submitted'
		when 'price_update_requested' then 'Price update requested'
		when 'provisional_customer_created' then 'Provisional customer created'
		when 'provisional_customer_confirmed' then 'Provisional customer confirmed'
		when 'quote_accepted' then 'Quote accepted'
		when 'sales_call_note_recorded' then 'Sales call recorded'
		when 'sales_customer_called' then 'Sales called customer'
		when 'sales_order_canceled' then 'Sales canceled order'
		when 'sales_order_claimed' then 'Sales claimed order'
		when 'sales_order_confirmed' then 'Sales confirmed order'
		when 'sales_order_rejected' then 'Sales rejected order'
		when 'sales_order_requeued' then 'Sales requeued order'
		when 'sales_quote_approved' then 'Sales quote approved'
		when 'supplier_payment_followup_recorded' then 'Supplier payment follow-up recorded'
		when 'supplier_payment_recorded' then 'Supplier payment recorded'
		when 'supplier_refill_canceled' then 'Supplier refill canceled'
		when 'supplier_refill_created' then 'Supplier refill created'
		when 'support_assigned' then 'Support assigned'
		when 'support_conversation_linked_to_customer' then 'Support linked conversation to customer'
		when 'support_reply_sent' then 'Support replied'
		when 'support_status_updated' then 'Support status updated'
		when 'support_ticket_created' then 'Support ticket created'
		when 'support_ticket_reply_sent' then 'Support replied'
		when 'warehouse_loading_approved' then 'Warehouse approved loading'
		when 'warehouse_loading_driver_assigned' then 'Warehouse assigned driver'
		when 'warehouse_loading_driver_removed' then 'Warehouse removed driver'
		when 'warehouse_loading_marked_ready' then 'Warehouse marked loading ready'
		when 'warehouse_loading_rejected' then 'Warehouse rejected loading'
		when 'warehouse_loading_reset' then 'Warehouse reset loading'
		when 'warehouse_loading_started' then 'Warehouse started loading'
		when 'warehouse_receiving_approved' then 'Warehouse approved receiving'
		when 'warehouse_receiving_rejected' then 'Warehouse rejected receiving'
		when 'whatsapp_message_ingested' then 'WhatsApp message received'
		else initcap(replace(p_action::text, '_', ' '))
	end
$$;

create or replace function public.ceo_activity_area(
	p_action public.audit_event_type,
	p_entity_type text
)
returns text
language sql
immutable
set search_path = public
as $$
	select case
		when p_action::text like 'sales_%'
			or p_action in (
				'manual_order_created',
				'order_submitted',
				'quote_accepted',
				'customer_quote_accepted',
				'customer_quote_declined',
				'customer_quote_line_response_submitted',
				'customer_quote_negotiation_requested'
			)
			then 'Sales'
		when p_action::text like 'customer_payment_%'
			or p_action::text like 'supplier_payment_%'
			then 'Finance'
		when p_action::text like 'inventory_%'
			or p_action in ('order_stock_reserved', 'price_update_requested')
			then 'Inventory'
		when p_action::text like 'warehouse_%'
			then 'Warehouse'
		when p_action::text like 'dispatch_%'
			or p_action::text like 'driver_delivery_%'
			or p_action::text like 'driver_assigned_%'
			or p_action::text like 'driver_rejection_%'
			or p_action in (
				'customer_signature_captured',
				'delivery_returned_to_warehouse_loading'
			)
			then 'Dispatch'
		when p_action::text like 'support_%'
			or p_action = 'whatsapp_message_ingested'
			then 'Customer service'
		when p_action::text like 'admin_%'
			or p_action::text like 'employee_%'
			or p_action::text like 'internal_employee_%'
			or p_entity_type in ('employee', 'driver', 'truck')
			then 'Admin'
		when p_action::text like 'supplier_%'
			then 'Procurement'
		else initcap(replace(coalesce(nullif(p_entity_type, ''), 'activity'), '_', ' '))
	end
$$;

create or replace function public.ceo_activity_source_label(
	p_source text,
	p_actor_type text,
	p_action public.audit_event_type
)
returns text
language sql
immutable
set search_path = public
as $$
	select case
		when p_action in ('sales_customer_called', 'sales_call_note_recorded')
			then 'Phone call'
		when lower(coalesce(p_source, '')) in ('portal', 'customer_portal')
			then 'Portal'
		when lower(coalesce(p_source, '')) in ('website', 'web')
			then 'Website'
		when lower(coalesce(p_source, '')) in ('whatsapp', 'whatsapp_message')
			then 'WhatsApp'
		when lower(coalesce(p_source, '')) in ('phone', 'phone_call')
			then 'Phone call'
		when lower(coalesce(p_source, '')) = 'email'
			then 'Email'
		when lower(coalesce(p_source, '')) = 'bank'
			then 'Bank'
		when lower(coalesce(p_source, '')) in ('driver_app', 'driver')
			then 'Driver app'
		when lower(coalesce(p_source, '')) in ('internal', 'internal_app')
			then 'Internal'
		when p_source is not null and btrim(p_source) <> ''
			then initcap(replace(p_source, '_', ' '))
		when p_actor_type = 'Customer'
			then 'Portal'
		when p_actor_type = 'Driver'
			then 'Driver app'
		when p_actor_type = 'Employee'
			then 'Internal'
		else null
	end
$$;

grant execute on function public.ceo_activity_action_label(public.audit_event_type)
	to authenticated;
grant execute on function public.ceo_activity_area(public.audit_event_type, text)
	to authenticated;
grant execute on function public.ceo_activity_source_label(text, text, public.audit_event_type)
	to authenticated;

drop view if exists public.ceo_search_activity_vtable;
drop view if exists public.ceo_activity_summary;
drop view if exists public.ceo_business_activity_vtable;

create or replace view public.ceo_business_activity_vtable
with (security_invoker = true)
as
with activity as (
	select
		ae.*,
		case
			when ae.details->>'order_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details->>'order_id')::uuid
			else null
		end as detail_order_id,
		case
			when ae.details->>'delivery_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details->>'delivery_id')::uuid
			else null
		end as detail_delivery_id,
		case
			when ae.details->>'customer_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details->>'customer_id')::uuid
			else null
		end as detail_customer_id,
		case
			when ae.details->>'employee_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details->>'employee_id')::uuid
			else null
		end as detail_employee_id,
		case
			when ae.details->>'driver_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details->>'driver_id')::uuid
			else null
		end as detail_driver_id,
		case
			when ae.details->>'truck_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details->>'truck_id')::uuid
			else null
		end as detail_truck_id,
		case
			when ae.details->>'product_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details->>'product_id')::uuid
			else null
		end as detail_product_id,
		case
			when ae.details->>'supplier_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details->>'supplier_id')::uuid
			else null
		end as detail_supplier_id,
		case
			when ae.details->>'finance_followup_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
				then (ae.details->>'finance_followup_id')::uuid
			else null
		end as detail_finance_followup_id
	from public.activity_events ae
	where public.can_access_ceo_search()
	  and public.is_important_activity(ae.action, ae.entity_type, ae.details)
),
joined as (
	select
		ae.*,
		actor_employee.full_name as actor_employee_name,
		actor_customer.company_name as actor_customer_company,
		actor_customer.contact_name as actor_customer_contact,
		actor_driver.full_name as actor_driver_name,
		case
			when coalesce(ae.actor_employee_id, ae.detail_employee_id) is not null then 'Employee'
			when coalesce(
				ae.actor_customer_id,
				case
					when ae.action::text like 'customer_%' or ae.action = 'order_submitted'
						then ae.detail_customer_id
					else null
				end
			) is not null then 'Customer'
			when coalesce(
				ae.actor_driver_id,
				case when ae.action::text like 'driver_%' then ae.detail_driver_id else null end
			) is not null then 'Driver'
			else 'System'
		end as actor_type,
		coalesce(
			actor_employee.full_name,
			actor_customer.company_name,
			actor_customer.contact_name,
			actor_driver.full_name,
			case
				when coalesce(ae.actor_employee_id, ae.detail_employee_id) is not null then 'Employee'
				when coalesce(
					ae.actor_customer_id,
					case
						when ae.action::text like 'customer_%' or ae.action = 'order_submitted'
							then ae.detail_customer_id
						else null
					end
				) is not null then 'Customer'
				when coalesce(
					ae.actor_driver_id,
					case when ae.action::text like 'driver_%' then ae.detail_driver_id else null end
				) is not null then 'Driver'
				else null
			end,
			'System'
		) as actor_label,
		o.id as order_id,
		o.order_number,
		o.status::text as order_status,
		o.total_amount,
		qr.id as quote_request_id,
		qr.request_number,
		qr.status::text as quote_request_status,
		qr.delivery_date,
		q.quote_number,
		q.total as quote_total,
		c.company_name as customer_name,
		c.contact_name as customer_contact,
		c.phone as customer_phone,
		c.email as customer_email,
		nullif(
			concat_ws(', ', ca.street, ca.area, ca.city, ca.governorate, ca.landmark),
			''
		) as delivery_address,
		d.delivery_number,
		d.status::text as delivery_status,
		coalesce(delivery_driver.full_name, detail_driver.full_name) as driver_name,
		coalesce(delivery_driver.phone, detail_driver.phone) as driver_phone,
		coalesce(delivery_truck.plate_number, detail_truck.plate_number) as truck_plate,
		coalesce(delivery_truck.body_type, detail_truck.body_type) as truck_type,
		target_employee.full_name as target_employee_name,
		target_driver.full_name as target_driver_name,
		target_truck.plate_number as target_truck_plate,
		lt.id as loading_task_id,
		lt.status::text as loading_status,
		rr.id as refill_request_id,
		rr.status::text as refill_status,
		rr.quantity as refill_quantity,
		rr.unit_cost as refill_unit_cost,
		rt.id as receiving_task_id,
		rt.status::text as receiving_status,
		p.name as product_name,
		p.sku as product_sku,
		p.category as product_category,
		s.name as supplier_name,
		st.reference as support_reference,
		st.subject as support_subject,
		st.source::text as support_source,
		sc.channel::text as conversation_channel,
		fpf.contact_channel as finance_contact_channel,
		fpf.outcome as finance_outcome,
		fpf.notes as finance_notes,
		fpf.follow_up_state as finance_follow_up_state,
		fpf.follow_up_due_at as finance_follow_up_due_at,
		request_items.item_summary as request_items,
		quote_items.item_summary as quote_items
	from activity ae
	left join public.employees actor_employee
		on actor_employee.id = coalesce(ae.actor_employee_id, ae.detail_employee_id)
	left join public.customers actor_customer
		on actor_customer.id = coalesce(
			ae.actor_customer_id,
			case
				when ae.action::text like 'customer_%' or ae.action = 'order_submitted'
					then ae.detail_customer_id
				else null
			end
		)
	left join public.drivers actor_driver
		on actor_driver.id = coalesce(
			ae.actor_driver_id,
			case when ae.action::text like 'driver_%' then ae.detail_driver_id else null end
		)
	left join public.deliveries d
		on d.id = case when ae.entity_type = 'delivery' then ae.entity_id else ae.detail_delivery_id end
	left join public.loading_tasks lt
		on lt.id = case when ae.entity_type = 'loading_task' then ae.entity_id else null end
	left join public.receiving_tasks rt
		on rt.id = case when ae.entity_type = 'receiving_task' then ae.entity_id else null end
	left join public.refill_requests rr
		on rr.id = coalesce(
			case when ae.entity_type = 'refill_request' then ae.entity_id else null end,
			rt.refill_request_id
		)
	left join public.orders o
		on o.id = coalesce(
			case when ae.entity_type = 'order' then ae.entity_id else null end,
			ae.detail_order_id,
			d.order_id,
			lt.order_id
		)
	left join public.quotes q
		on q.id = case when ae.entity_type = 'quote' then ae.entity_id else o.quote_id end
	left join public.quote_requests qr
		on qr.id = coalesce(
			case when ae.entity_type = 'quote_request' then ae.entity_id else null end,
			o.quote_request_id,
			q.quote_request_id
		)
	left join public.customers c
		on c.id = coalesce(
			case when ae.entity_type = 'customer' then ae.entity_id else null end,
			ae.detail_customer_id,
			o.customer_id,
			qr.customer_id,
			q.customer_id
		)
	left join public.customer_addresses ca
		on ca.id = qr.delivery_address_id
	left join public.drivers delivery_driver
		on delivery_driver.id = d.driver_id
	left join public.drivers detail_driver
		on detail_driver.id = ae.detail_driver_id
	left join public.employees target_employee
		on target_employee.id = case when ae.entity_type = 'employee' then ae.entity_id else null end
	left join public.drivers target_driver
		on target_driver.id = case when ae.entity_type = 'driver' then ae.entity_id else null end
	left join public.trucks target_truck
		on target_truck.id = case when ae.entity_type = 'truck' then ae.entity_id else null end
	left join public.trucks delivery_truck
		on delivery_truck.id = d.truck_id
	left join public.trucks detail_truck
		on detail_truck.id = ae.detail_truck_id
	left join public.products p
		on p.id = coalesce(
			case when ae.entity_type = 'product' then ae.entity_id else null end,
			rr.product_id,
			ae.detail_product_id
		)
	left join public.suppliers s
		on s.id = coalesce(
			case when ae.entity_type = 'supplier' then ae.entity_id else null end,
			rr.supplier_id,
			ae.detail_supplier_id
		)
	left join public.support_tickets st
		on st.id = case when ae.entity_type = 'support_ticket' then ae.entity_id else null end
	left join public.support_conversations sc
		on sc.id = case when ae.entity_type = 'support_conversation' then ae.entity_id else null end
	left join public.finance_payment_followups fpf
		on fpf.id = ae.detail_finance_followup_id
	left join lateral (
		select string_agg(
			concat_ws(
				' ',
				qri.quantity::text,
				coalesce(prod.name, qri.customer_description),
				qri.unit_of_measure
			),
			', '
			order by qri.sort_order, qri.created_at
		) as item_summary
		from public.quote_request_items qri
		left join public.products prod on prod.id = qri.product_id
		where qri.quote_request_id = qr.id
	) request_items on true
	left join lateral (
		select string_agg(
			concat_ws(' ', qi.quantity::text, qi.product_name, qi.unit_of_measure),
			', '
			order by qi.sort_order, qi.created_at
		) as item_summary
		from public.quote_items qi
		where qi.quote_id = q.id
	) quote_items on true
)
select
	j.id,
	j.entity_type as source_entity_type,
	j.entity_id as source_entity_id,
	j.action::text as action,
	public.ceo_activity_action_label(j.action) as action_label,
	public.ceo_activity_area(j.action, j.entity_type) as area,
	case
		when j.action = 'order_submitted' then concat_ws(
			' ',
			j.actor_label,
			'submitted',
			coalesce(j.request_number, j.order_number, 'an order'),
			'via',
			public.ceo_activity_source_label(j.details->>'source', j.actor_type, j.action)
		)
		when j.action in ('sales_order_claimed', 'sales_customer_called') then concat_ws(
			' ',
			j.actor_label,
			case when j.action = 'sales_customer_called' then 'called customer about' else 'claimed' end,
			coalesce(j.request_number, j.order_number, 'an order')
		)
		when j.action in (
			'customer_quote_accepted',
			'customer_quote_declined',
			'customer_quote_negotiation_requested',
			'customer_quote_line_response_submitted'
		) then concat_ws(
			' ',
			j.actor_label,
			case
				when j.action = 'customer_quote_accepted' then 'accepted'
				when j.action = 'customer_quote_declined' then 'declined'
				when j.action = 'customer_quote_negotiation_requested' then 'requested negotiation for'
				else 'responded to lines on'
			end,
			coalesce(j.quote_number, j.request_number, 'a quote')
		)
		when j.action = 'sales_order_confirmed' then concat_ws(
			' ',
			j.actor_label,
			'confirmed',
			coalesce(j.request_number, j.order_number, 'an order'),
			'and sent it to finance'
		)
		when j.action in ('sales_order_rejected', 'sales_order_canceled') then concat_ws(
			' ',
			j.actor_label,
			case when j.action = 'sales_order_canceled' then 'canceled' else 'rejected' end,
			coalesce(j.request_number, j.order_number, 'an order')
		)
		when j.action in (
			'customer_payment_recorded',
			'supplier_payment_recorded',
			'customer_payment_followup_recorded',
			'supplier_payment_followup_recorded'
		) then concat_ws(
			' ',
			j.actor_label,
			case
				when j.action in ('customer_payment_followup_recorded', 'supplier_payment_followup_recorded')
					then 'followed up on'
				else 'recorded'
			end,
			case
				when j.action in ('supplier_payment_recorded', 'supplier_payment_followup_recorded')
					then 'supplier payment for'
				else 'customer payment for'
			end,
			coalesce(
				j.order_number,
				j.request_number,
				j.product_name,
				j.supplier_name,
				nullif(initcap(replace(j.entity_type, '_', ' ')), ''),
				'the record'
			)
		)
		when j.action in ('order_stock_reserved', 'inventory_order_evaluated') then concat_ws(
			' ',
			j.actor_label,
			'evaluated stock for',
			coalesce(j.order_number, j.request_number, 'an order')
		)
		when j.action::text like 'warehouse_loading_%' then concat_ws(
			' ',
			j.actor_label,
			public.ceo_activity_action_label(j.action),
			'for',
			coalesce(j.order_number, j.request_number, 'an order')
		)
		when j.action::text like 'warehouse_receiving_%' then concat_ws(
			' ',
			j.actor_label,
			public.ceo_activity_action_label(j.action),
			coalesce(j.product_name, j.supplier_name, 'supplier stock')
		)
		when j.action::text like 'dispatch_%'
			or j.action::text like 'driver_delivery_%'
			or j.action = 'driver_assigned_delivery'
		then concat_ws(
			' ',
			j.actor_label,
			public.ceo_activity_action_label(j.action),
			coalesce(j.delivery_number, j.order_number, 'delivery')
		)
		when j.action = 'support_conversation_linked_to_customer' then concat_ws(
			' ',
			j.actor_label,
			'linked support conversation to',
			coalesce(j.customer_name, j.customer_phone, 'a customer')
		)
		when j.action::text like 'support_%'
			or j.action = 'whatsapp_message_ingested'
		then concat_ws(
			' ',
			j.actor_label,
			public.ceo_activity_action_label(j.action),
			coalesce(j.support_reference, j.support_subject, j.customer_name, 'support case')
		)
		when j.action = 'admin_database_exported' then concat_ws(
			' ',
			j.actor_label,
			'exported',
			coalesce(nullif(j.details->>'scope', ''), 'database'),
			'data',
			case
				when nullif(j.details->>'row_count', '') is not null
					then concat('(', j.details->>'row_count', ' rows)')
				else null
			end
		)
		when j.action::text like 'admin_%'
			or j.action::text like 'internal_employee_%'
			or j.action::text like 'employee_%'
		then concat_ws(
			' ',
			j.actor_label,
			case
				when j.action in ('admin_record_created', 'internal_employee_created') then 'created'
				when j.action = 'admin_record_updated' then 'updated'
				when j.action = 'admin_record_deactivated' then 'deactivated'
				when j.action in ('admin_role_assigned', 'employee_role_assigned', 'internal_employee_role_assigned') then 'assigned a role to'
				when j.action in ('admin_role_removed', 'employee_role_removed', 'internal_employee_role_removed') then 'removed a role from'
				else lower(public.ceo_activity_action_label(j.action))
			end,
			coalesce(
				j.target_employee_name,
				j.customer_name,
				j.product_name,
				j.supplier_name,
				j.target_driver_name,
				j.driver_name,
				j.target_truck_plate,
				j.entity_type
			)
		)
		else concat_ws(
			' ',
			j.actor_label,
			public.ceo_activity_action_label(j.action),
			coalesce(
				j.order_number,
				j.request_number,
				j.quote_number,
				j.delivery_number,
				j.product_name,
				j.supplier_name,
				j.target_employee_name,
				j.target_driver_name,
				j.target_truck_plate,
				j.support_reference,
				j.customer_name,
				j.entity_type
			)
		)
	end as headline,
	j.actor_label,
	j.actor_type,
	public.ceo_activity_source_label(
		coalesce(j.details->>'source', j.details->>'channel', j.support_source, j.conversation_channel),
		j.actor_type,
		j.action
	) as source,
	coalesce(
		j.order_number,
		j.request_number,
		j.quote_number,
		j.delivery_number,
		j.support_reference,
		j.product_name,
		j.supplier_name,
		j.target_employee_name,
		j.target_driver_name,
		j.target_truck_plate,
		j.customer_name,
		initcap(replace(j.entity_type, '_', ' '))
	) as target,
	j.customer_name,
	j.customer_contact,
	j.customer_phone,
	j.customer_email,
	j.request_number,
	j.order_number,
	j.quote_number,
	j.delivery_number,
	j.delivery_address,
	coalesce(j.quote_items, j.request_items) as item_summary,
	j.product_name,
	j.product_sku,
	j.product_category,
	j.supplier_name,
	j.driver_name,
	j.driver_phone,
	j.truck_plate,
	j.truck_type,
	j.support_reference,
	j.support_subject,
	nullif(j.details->>'role', '') as role,
	nullif(j.details->>'scope', '') as scope,
	nullif(j.details->>'row_count', '')::integer as row_count,
	coalesce(
		nullif(j.details->>'contact_channel', ''),
		nullif(j.details->>'channel', ''),
		j.finance_contact_channel
	) as contact_channel,
	nullif(j.details->>'from_status', '') as from_status,
	nullif(j.details->>'to_status', '') as to_status,
	nullif(j.details->>'reason', '') as reason,
	coalesce(nullif(j.details->>'outcome', ''), j.finance_outcome) as outcome,
	coalesce(nullif(j.details->>'notes', ''), j.finance_notes) as notes,
	coalesce(
		nullif(j.details->>'follow_up_state', ''),
		j.finance_follow_up_state
	) as follow_up_state,
	coalesce(
		nullif(j.details->>'follow_up_due_at', '')::timestamptz,
		j.finance_follow_up_due_at
	) as follow_up_due_at,
	nullif(j.details->>'amount', '')::numeric as amount,
	nullif(j.details->>'payment_fraction', '')::numeric as payment_fraction,
	coalesce(j.total_amount, j.quote_total) as total_amount,
	j.created_at
from joined j;

create or replace view public.ceo_activity_summary
with (security_invoker = true)
as
select
	ba.id,
	ba.source_entity_type as entity_type,
	ba.source_entity_id as entity_id,
	ba.action,
	jsonb_strip_nulls(jsonb_build_object(
		'action_label', ba.action_label,
		'area', ba.area,
		'headline', ba.headline,
		'actor', ba.actor_label,
		'actor_type', ba.actor_type,
		'source', ba.source,
		'target', ba.target,
		'customer', ba.customer_name,
		'contact', ba.customer_contact,
		'phone', ba.customer_phone,
		'email', ba.customer_email,
		'request_number', ba.request_number,
		'order_number', ba.order_number,
		'quote_number', ba.quote_number,
		'delivery_number', ba.delivery_number,
		'delivery_address', ba.delivery_address,
		'items', ba.item_summary,
		'product', ba.product_name,
		'supplier', ba.supplier_name,
		'driver', ba.driver_name,
		'truck', ba.truck_plate,
		'role', ba.role,
		'scope', ba.scope,
		'row_count', ba.row_count,
		'contact_channel', ba.contact_channel,
		'from_status', ba.from_status,
		'to_status', ba.to_status,
		'reason', ba.reason,
		'outcome', ba.outcome,
		'notes', ba.notes,
		'follow_up_state', ba.follow_up_state,
		'follow_up_due_at', ba.follow_up_due_at,
		'amount', ba.amount,
		'payment_fraction', ba.payment_fraction,
		'total_amount', ba.total_amount,
		'created_at', ba.created_at
	)) as details,
	ba.created_at
from public.ceo_business_activity_vtable ba;

create or replace view public.ceo_search_activity_vtable
with (security_invoker = true)
as
select
	'activity'::text as entity_type,
	ba.id::text as entity_id,
	ba.headline as title,
	ba.area as subtitle,
	jsonb_strip_nulls(jsonb_build_object(
		'action', ba.action,
		'action_label', ba.action_label,
		'area', ba.area,
		'headline', ba.headline,
		'actor', ba.actor_label,
		'actor_type', ba.actor_type,
		'source', ba.source,
		'target', ba.target,
		'customer', ba.customer_name,
		'contact', ba.customer_contact,
		'phone', ba.customer_phone,
		'email', ba.customer_email,
		'request_number', ba.request_number,
		'order_number', ba.order_number,
		'quote_number', ba.quote_number,
		'delivery_number', ba.delivery_number,
		'delivery_address', ba.delivery_address,
		'items', ba.item_summary,
		'product', ba.product_name,
		'product_sku', ba.product_sku,
		'product_category', ba.product_category,
		'supplier', ba.supplier_name,
		'driver', ba.driver_name,
		'driver_phone', ba.driver_phone,
		'truck', ba.truck_plate,
		'truck_type', ba.truck_type,
		'support_reference', ba.support_reference,
		'support_subject', ba.support_subject,
		'role', ba.role,
		'scope', ba.scope,
		'row_count', ba.row_count,
		'contact_channel', ba.contact_channel,
		'from_status', ba.from_status,
		'to_status', ba.to_status,
		'reason', ba.reason,
		'outcome', ba.outcome,
		'notes', ba.notes,
		'follow_up_state', ba.follow_up_state,
		'follow_up_due_at', ba.follow_up_due_at,
		'amount', ba.amount,
		'payment_fraction', ba.payment_fraction,
		'total_amount', ba.total_amount,
		'created_at', ba.created_at
	)) as metadata,
	ba.created_at as sort_at,
	concat_ws(
		' ',
		'activity',
		ba.area,
		ba.action,
		ba.action_label,
		ba.headline,
		ba.actor_label,
		ba.actor_type,
		ba.source,
		ba.target,
		ba.customer_name,
		ba.customer_contact,
		ba.customer_phone,
		ba.customer_email,
		ba.request_number,
		ba.order_number,
		ba.quote_number,
		ba.delivery_number,
		ba.delivery_address,
		ba.item_summary,
		ba.product_name,
		ba.product_sku,
		ba.product_category,
		ba.supplier_name,
		ba.driver_name,
		ba.driver_phone,
		ba.truck_plate,
		ba.truck_type,
		ba.support_reference,
		ba.support_subject,
		ba.role,
		ba.scope,
		ba.row_count::text,
		ba.contact_channel,
		ba.from_status,
		ba.to_status,
		ba.reason,
		ba.outcome,
		ba.notes,
		ba.follow_up_state,
		ba.follow_up_due_at::text,
		ba.amount::text,
		ba.payment_fraction::text,
		ba.total_amount::text,
		public.ceo_search_date_terms(ba.created_at)
	) as search_text
from public.ceo_business_activity_vtable ba;

do $$
declare
	relation_name text;
begin
	foreach relation_name in array array[
		'ceo_business_activity_vtable',
		'ceo_activity_summary',
		'ceo_search_activity_vtable'
	] loop
		execute format(
			'revoke all privileges on table public.%I from anon, authenticated, public',
			relation_name
		);
		execute format(
			'grant select on table public.%I to authenticated',
			relation_name
		);
	end loop;
end $$;

delete from public.ceo_search_documents
where entity_type = 'activity';

do $$
begin
	if to_regprocedure('app_private.refresh_ceo_search_documents()') is not null then
		perform app_private.refresh_ceo_search_documents();
	end if;
end $$;
