create or replace function public.inventory_set_product_availability(
	p_product_id uuid,
	p_availability public.catalog_availability_status
)
returns public.products
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_product public.products%rowtype;
	updated_product public.products%rowtype;
	old_availability public.catalog_availability_status;
begin
	employee_id := public.require_panel('inventory', true);

	if p_availability not in ('available', 'out_of_stock') then
		raise exception 'invalid_inventory_availability_toggle'
			using errcode = '23514';
	end if;

	select * into target_product
	from public.products
	where id = p_product_id
	  and is_active
	  and is_stockable
	for update;

	if target_product.id is null then
		raise exception 'stockable_product_not_found' using errcode = '02000';
	end if;

	old_availability := target_product.availability_status;

	if old_availability = p_availability then
		return target_product;
	end if;

	perform set_config('app.audited_registry_write', 'on', true);

	update public.products
	set availability_status = p_availability
	where id = p_product_id
	returning * into updated_product;

	perform public.log_activity(
		'product',
		updated_product.id,
		'inventory_availability_updated',
		jsonb_build_object(
			'employee_id', employee_id,
			'product_id', updated_product.id,
			'old_availability', old_availability,
			'new_availability', p_availability
		)
	);

	return updated_product;
end;
$$;

create or replace function public.inventory_mark_price_outdated(
	p_product_id uuid
)
returns public.supplier_product_links
language plpgsql
security definer
set search_path = public
as $$
declare
	employee_id uuid;
	target_product public.products%rowtype;
	target_link public.supplier_product_links%rowtype;
	updated_link public.supplier_product_links%rowtype;
	old_last_quoted_at timestamptz;
	new_last_quoted_at timestamptz := now() - interval '48 hours';
begin
	employee_id := public.require_panel('inventory', true);

	select * into target_product
	from public.products
	where id = p_product_id
	  and is_active
	for update;

	if target_product.id is null then
		raise exception 'product_not_found' using errcode = '02000';
	end if;

	select spl.* into target_link
	from public.supplier_product_links spl
	join public.suppliers s
		on s.id = spl.supplier_id
		and s.status = 'active'
	where spl.product_id = p_product_id
	order by
		spl.is_primary desc,
		spl.last_quoted_at desc nulls last,
		spl.created_at desc
	limit 1
	for update of spl;

	if target_link.id is null then
		raise exception 'supplier_quote_not_found' using errcode = '02000';
	end if;

	old_last_quoted_at := target_link.last_quoted_at;

	if old_last_quoted_at is not null
		and old_last_quoted_at <= now() - interval '24 hours'
	then
		return target_link;
	end if;

	perform set_config('app.audited_registry_write', 'on', true);

	update public.supplier_product_links
	set last_quoted_at = new_last_quoted_at
	where id = target_link.id
	returning * into updated_link;

	perform public.log_activity(
		'supplier_product_link',
		updated_link.id,
		'inventory_price_marked_outdated',
		jsonb_build_object(
			'employee_id', employee_id,
			'product_id', p_product_id,
			'supplier_id', updated_link.supplier_id,
			'old_last_quoted_at', old_last_quoted_at,
			'new_last_quoted_at', new_last_quoted_at
		)
	);

	return updated_link;
end;
$$;

create or replace function public.service_inventory_set_product_availability(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_product_id uuid,
	p_availability public.catalog_availability_status
)
returns public.products
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.inventory_set_product_availability(
		p_product_id,
		p_availability
	);
end;
$$;

create or replace function public.service_inventory_mark_price_outdated(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_product_id uuid
)
returns public.supplier_product_links
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.inventory_mark_price_outdated(p_product_id);
end;
$$;

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
				'admin_export_created',
				'customer_profile_claimed',
				'customer_payment_followup_recorded',
				'customer_payment_recorded',
				'customer_quote_accepted',
				'customer_quote_declined',
				'customer_quote_line_response_submitted',
				'customer_quote_negotiation_requested',
				'customer_order_saved_as_draft',
				'customer_signature_captured',
				'customer_signed_in',
				'customer_signed_up',
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
				'draft_created',
				'draft_saved',
				'draft_submitted',
				'draft_updated',
				'internal_employee_created',
				'internal_employee_role_assigned',
				'internal_employee_role_removed',
				'inventory_availability_updated',
				'inventory_order_evaluated',
				'inventory_price_marked_outdated',
				'inventory_price_updated',
				'manual_order_created',
				'order_stock_reserved',
				'order_submitted',
				'price_update_requested',
				'provisional_customer_created',
				'provisional_customer_confirmed',
				'sales_call_note_recorded',
				'sales_customer_called',
				'sales_order_canceled',
				'sales_order_claimed',
				'sales_order_confirmed',
				'sales_order_opened',
				'sales_order_rejected',
				'sales_order_requeued',
				'sales_quote_approved',
				'sales_quote_draft_saved',
				'sales_quote_edited',
				'supplier_payment_followup_recorded',
				'supplier_payment_recorded',
				'supplier_refill_canceled',
				'supplier_refill_created',
				'support_assigned',
				'support_conversation_linked_to_customer',
				'support_reply_sent',
				'support_status_updated',
				'support_ticket_created',
				'support_ticket_reply_sent',
				'portal_draft_saved',
				'portal_order_viewed',
				'quote_request_submitted',
				'admin_role_assigned',
				'admin_role_removed',
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
				'whatsapp_message_ingested',
				'website_draft_saved'
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
		when 'inventory_availability_updated' then 'Inventory availability updated'
		when 'inventory_order_evaluated' then 'Inventory evaluated order'
		when 'inventory_price_marked_outdated' then 'Inventory marked price outdated'
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

revoke all on function public.inventory_set_product_availability(
	uuid,
	public.catalog_availability_status
) from public, anon, authenticated;
revoke all on function public.inventory_mark_price_outdated(uuid)
	from public, anon, authenticated;
revoke all on function public.service_inventory_set_product_availability(
	uuid,
	text,
	uuid,
	public.catalog_availability_status
) from public, anon, authenticated;
revoke all on function public.service_inventory_mark_price_outdated(uuid, text, uuid)
	from public, anon, authenticated;

grant execute on function public.inventory_set_product_availability(
	uuid,
	public.catalog_availability_status
) to service_role;
grant execute on function public.inventory_mark_price_outdated(uuid)
	to service_role;
grant execute on function public.service_inventory_set_product_availability(
	uuid,
	text,
	uuid,
	public.catalog_availability_status
) to service_role;
grant execute on function public.service_inventory_mark_price_outdated(uuid, text, uuid)
	to service_role;
