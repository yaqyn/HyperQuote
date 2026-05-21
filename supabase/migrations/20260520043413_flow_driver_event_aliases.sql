alter type public.audit_event_type add value if not exists 'driver_assignment_notified';
alter type public.audit_event_type add value if not exists 'driver_arrived';
alter type public.audit_event_type add value if not exists 'driver_delivery_returned_to_warehouse_loading';
alter type public.audit_event_type add value if not exists 'dispatch_delivery_created';
alter type public.audit_event_type add value if not exists 'dispatch_delivery_delivered';
alter type public.audit_event_type add value if not exists 'dispatch_delivery_exception_opened';
alter type public.audit_event_type add value if not exists 'dispatch_delivery_status_updated';
alter type public.audit_event_type add value if not exists 'dispatch_truck_location_updated';

create or replace function app_private.insert_flow_activity_aliases()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	alias_action public.audit_event_type;
begin
	foreach alias_action in array case new.action
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
			'dispatch_delivery_status_updated'::public.audit_event_type
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
		else array[]::public.audit_event_type[]
	end
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

drop trigger if exists activity_event_flow_aliases on public.activity_events;
create trigger activity_event_flow_aliases
	after insert on public.activity_events
	for each row
	execute function app_private.insert_flow_activity_aliases();
