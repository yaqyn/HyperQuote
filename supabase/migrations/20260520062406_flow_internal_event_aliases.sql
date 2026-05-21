alter type public.audit_event_type add value if not exists 'sales_order_auto_assigned';
alter type public.audit_event_type add value if not exists 'sales_order_saved';
alter type public.audit_event_type add value if not exists 'manual_order_started';
alter type public.audit_event_type add value if not exists 'provisional_customer_created';
alter type public.audit_event_type add value if not exists 'provisional_customer_confirmed';
alter type public.audit_event_type add value if not exists 'manual_order_quoted';
alter type public.audit_event_type add value if not exists 'sales_order_sent_to_finance';
alter type public.audit_event_type add value if not exists 'supplier_price_proof_uploaded';
alter type public.audit_event_type add value if not exists 'item_price_updated';
alter type public.audit_event_type add value if not exists 'inventory_refill_started';
alter type public.audit_event_type add value if not exists 'supplier_refill_deal_created';
alter type public.audit_event_type add value if not exists 'supplier_refill_sent_to_finance';
alter type public.audit_event_type add value if not exists 'customer_payment_discussion_started';
alter type public.audit_event_type add value if not exists 'customer_partial_payment_recorded';
alter type public.audit_event_type add value if not exists 'customer_order_sent_to_inventory';
alter type public.audit_event_type add value if not exists 'supplier_payment_discussion_started';
alter type public.audit_event_type add value if not exists 'supplier_partial_payment_recorded';
alter type public.audit_event_type add value if not exists 'supplier_refill_sent_to_warehouse';
alter type public.audit_event_type add value if not exists 'supplier_receiving_issue_opened';
alter type public.audit_event_type add value if not exists 'warehouse_driver_assigned';
alter type public.audit_event_type add value if not exists 'warehouse_stock_assigned_to_driver';
alter type public.audit_event_type add value if not exists 'warehouse_advisor_assigned';
alter type public.audit_event_type add value if not exists 'warehouse_advisor_approved';
alter type public.audit_event_type add value if not exists 'warehouse_loading_issue_opened';
alter type public.audit_event_type add value if not exists 'customer_order_sent_to_dispatch';
alter type public.audit_event_type add value if not exists 'warehouse_receiving_started';
alter type public.audit_event_type add value if not exists 'warehouse_receiving_advisor_assigned';
alter type public.audit_event_type add value if not exists 'warehouse_receiving_advisor_approved';
alter type public.audit_event_type add value if not exists 'support_ticket_assigned';
alter type public.audit_event_type add value if not exists 'support_ticket_replied';
alter type public.audit_event_type add value if not exists 'support_ticket_closed';
alter type public.audit_event_type add value if not exists 'whatsapp_support_message_received';
alter type public.audit_event_type add value if not exists 'whatsapp_support_message_replied';
alter type public.audit_event_type add value if not exists 'supplier_delivery_unloaded';
alter type public.audit_event_type add value if not exists 'supplier_delivery_rejected';
alter type public.audit_event_type add value if not exists 'inventory_stock_increased';
alter type public.audit_event_type add value if not exists 'inventory_order_received';
alter type public.audit_event_type add value if not exists 'inventory_stock_reserved';
alter type public.audit_event_type add value if not exists 'inventory_stock_released';
alter type public.audit_event_type add value if not exists 'inventory_stock_consumed';

create or replace function app_private.insert_flow_activity_aliases()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	alias_action public.audit_event_type;
	alias_actions public.audit_event_type[] := array[]::public.audit_event_type[];
	remaining_amount numeric;
begin
	alias_actions := case new.action
		when 'driver_assigned_delivery'::public.audit_event_type then array[
			'driver_assignment_notified'::public.audit_event_type,
			'dispatch_delivery_created'::public.audit_event_type
		]
		when 'driver_location_updated'::public.audit_event_type then array[
			'dispatch_truck_location_updated'::public.audit_event_type
		]
		when 'driver_delivery_started'::public.audit_event_type then array[
			'dispatch_delivery_status_updated'::public.audit_event_type
		]
		when 'driver_delivery_arrived'::public.audit_event_type then array[
			'driver_arrived'::public.audit_event_type,
			'dispatch_delivery_status_updated'::public.audit_event_type
		]
		when 'driver_delivery_confirmed'::public.audit_event_type then array[
			'dispatch_delivery_delivered'::public.audit_event_type,
			'dispatch_delivery_status_updated'::public.audit_event_type
		]
		when 'dispatch_delivery_completed'::public.audit_event_type then array[
			'dispatch_delivery_delivered'::public.audit_event_type,
			'dispatch_delivery_status_updated'::public.audit_event_type,
			'inventory_stock_consumed'::public.audit_event_type
		]
		when 'driver_delivery_rejected'::public.audit_event_type then array[
			'dispatch_delivery_exception_opened'::public.audit_event_type,
			'dispatch_delivery_status_updated'::public.audit_event_type
		]
		when 'dispatch_delivery_rejected'::public.audit_event_type then array[
			'dispatch_delivery_exception_opened'::public.audit_event_type,
			'dispatch_delivery_status_updated'::public.audit_event_type
		]
		when 'delivery_returned_to_warehouse_loading'::public.audit_event_type then array[
			'driver_delivery_returned_to_warehouse_loading'::public.audit_event_type
		]
		when 'sales_order_claimed'::public.audit_event_type then array[
			'sales_order_auto_assigned'::public.audit_event_type
		]
		when 'sales_order_requeued'::public.audit_event_type then array[
			'sales_order_saved'::public.audit_event_type
		]
		when 'manual_order_created'::public.audit_event_type then array[
			'manual_order_started'::public.audit_event_type
		]
		when 'customer_profile_claimed'::public.audit_event_type then array[
			'provisional_customer_confirmed'::public.audit_event_type
		]
		when 'sales_order_confirmed'::public.audit_event_type then array[
			'sales_order_sent_to_finance'::public.audit_event_type
		]
		when 'inventory_price_updated'::public.audit_event_type then array[
			'supplier_price_proof_uploaded'::public.audit_event_type,
			'item_price_updated'::public.audit_event_type
		]
		when 'supplier_refill_created'::public.audit_event_type then array[
			'inventory_refill_started'::public.audit_event_type,
			'supplier_refill_deal_created'::public.audit_event_type,
			'supplier_refill_sent_to_finance'::public.audit_event_type
		]
		when 'customer_payment_followup_recorded'::public.audit_event_type then array[
			'customer_payment_discussion_started'::public.audit_event_type
		]
		when 'customer_payment_recorded'::public.audit_event_type then array[
			'customer_order_sent_to_inventory'::public.audit_event_type
		]
		when 'supplier_payment_followup_recorded'::public.audit_event_type then array[
			'supplier_payment_discussion_started'::public.audit_event_type
		]
		when 'supplier_payment_recorded'::public.audit_event_type then array[
			'supplier_refill_sent_to_warehouse'::public.audit_event_type,
			'warehouse_receiving_started'::public.audit_event_type
		]
		when 'warehouse_loading_driver_assigned'::public.audit_event_type then array[
			'warehouse_driver_assigned'::public.audit_event_type
		]
		when 'warehouse_loading_item_toggled'::public.audit_event_type then array[
			'warehouse_stock_assigned_to_driver'::public.audit_event_type
		]
		when 'warehouse_loading_approved'::public.audit_event_type then array[
			'warehouse_advisor_assigned'::public.audit_event_type,
			'warehouse_advisor_approved'::public.audit_event_type,
			'customer_order_sent_to_dispatch'::public.audit_event_type
		]
		when 'warehouse_loading_rejected'::public.audit_event_type then array[
			'warehouse_loading_issue_opened'::public.audit_event_type
		]
		when 'warehouse_receiving_approved'::public.audit_event_type then array[
			'warehouse_receiving_advisor_assigned'::public.audit_event_type,
			'warehouse_receiving_advisor_approved'::public.audit_event_type,
			'supplier_delivery_unloaded'::public.audit_event_type,
			'inventory_stock_increased'::public.audit_event_type
		]
		when 'warehouse_receiving_rejected'::public.audit_event_type then array[
			'warehouse_receiving_advisor_assigned'::public.audit_event_type,
			'warehouse_receiving_advisor_approved'::public.audit_event_type,
			'supplier_receiving_issue_opened'::public.audit_event_type,
			'supplier_delivery_rejected'::public.audit_event_type
		]
		when 'support_assigned'::public.audit_event_type then array[
			'support_ticket_assigned'::public.audit_event_type
		]
		when 'support_ticket_reply_sent'::public.audit_event_type then array[
			'support_ticket_replied'::public.audit_event_type
		]
		when 'support_status_updated'::public.audit_event_type then array[
			'support_ticket_closed'::public.audit_event_type
		]
		when 'whatsapp_message_ingested'::public.audit_event_type then array[
			'whatsapp_support_message_received'::public.audit_event_type
		]
		when 'order_stock_reserved'::public.audit_event_type then array[
			'inventory_order_received'::public.audit_event_type,
			'inventory_stock_reserved'::public.audit_event_type
		]
		when 'sales_order_canceled'::public.audit_event_type then array[
			'inventory_stock_released'::public.audit_event_type
		]
		else array[]::public.audit_event_type[]
	end;

	if new.action = 'sales_order_confirmed'::public.audit_event_type
		and exists (
			select 1
			from public.activity_events previous
			where previous.entity_type = new.entity_type
			  and previous.entity_id = new.entity_id
			  and previous.action = 'manual_order_created'::public.audit_event_type
		)
	then
		alias_actions := alias_actions || array['manual_order_quoted'::public.audit_event_type];
	end if;

	if new.action = 'customer_payment_recorded'::public.audit_event_type then
		remaining_amount := nullif(new.details->>'remaining_amount', '')::numeric;
		if coalesce(remaining_amount, 0) > 0 then
			alias_actions := alias_actions || array['customer_partial_payment_recorded'::public.audit_event_type];
		end if;
	end if;

	if new.action = 'supplier_payment_recorded'::public.audit_event_type then
		remaining_amount := nullif(new.details->>'remaining_after', '')::numeric;
		if coalesce(remaining_amount, 0) > 0 then
			alias_actions := alias_actions || array['supplier_partial_payment_recorded'::public.audit_event_type];
		end if;
	end if;

	if new.action = 'support_reply_sent'::public.audit_event_type
		and new.entity_type = 'support_conversation'
		and coalesce(new.details->>'channel', '') = 'whatsapp'
	then
		alias_actions := alias_actions || array['whatsapp_support_message_replied'::public.audit_event_type];
	end if;

	foreach alias_action in array alias_actions
	loop
		insert into public.activity_events (
			actor_user_id,
			actor_employee_id,
			actor_customer_id,
			actor_driver_id,
			entity_type,
			entity_id,
			action,
			details,
			created_at
		)
		values (
			new.actor_user_id,
			new.actor_employee_id,
			new.actor_customer_id,
			new.actor_driver_id,
			new.entity_type,
			new.entity_id,
			alias_action,
			new.details || jsonb_build_object('source_action', new.action::text),
			new.created_at
		);
	end loop;

	return new;
end;
$$;

create or replace function app_private.log_provisional_customer_created()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	if new.status = 'unclaimed'
		and new.created_by_employee_id is not null
	then
		insert into public.activity_events (
			actor_user_id,
			actor_employee_id,
			entity_type,
			entity_id,
			action,
			details
		)
		values (
			auth.uid(),
			new.created_by_employee_id,
			'customer',
			new.id,
			'provisional_customer_created',
			jsonb_build_object(
				'customer_id', new.id,
				'employee_id', new.created_by_employee_id,
				'from_status', null,
				'to_status', new.status
			)
		);
	end if;

	return new;
end;
$$;

drop trigger if exists customers_flow_provisional_created on public.customers;
create trigger customers_flow_provisional_created
	after insert on public.customers
	for each row
	execute function app_private.log_provisional_customer_created();
