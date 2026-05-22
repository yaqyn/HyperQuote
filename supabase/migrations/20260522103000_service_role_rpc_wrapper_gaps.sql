create or replace function public.service_sales_confirm_order(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid,
	p_quote_version_id uuid default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.sales_confirm_order(p_order_id, p_quote_version_id);
end;
$$;

create or replace function public.service_inventory_finance_cleared_order_ids(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_ids uuid[]
)
returns table(order_id uuid)
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return query
	select result.order_id
	from public.inventory_finance_cleared_order_ids(p_order_ids) as result;
end;
$$;

create or replace function public.service_reserve_order_stock(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_order_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.reserve_order_stock(p_order_id);
end;
$$;

create or replace function public.service_send_support_reply(
	p_actor_user_id uuid,
	p_actor_pool text,
	p_ticket_id uuid,
	p_body text,
	p_channel public.support_message_channel default 'email',
	p_metadata jsonb default '{}'::jsonb
)
returns public.support_messages
language plpgsql
security definer
set search_path = public, app_private
as $$
begin
	perform app_private.set_service_actor(p_actor_user_id, p_actor_pool);
	return public.send_support_reply(
		p_ticket_id,
		p_body,
		p_channel,
		p_metadata
	);
end;
$$;

revoke all on function public.service_sales_confirm_order(uuid, text, uuid, uuid)
	from public, anon, authenticated;
revoke all on function public.service_inventory_finance_cleared_order_ids(uuid, text, uuid[])
	from public, anon, authenticated;
revoke all on function public.service_reserve_order_stock(uuid, text, uuid)
	from public, anon, authenticated;
revoke all on function public.service_send_support_reply(uuid, text, uuid, text, public.support_message_channel, jsonb)
	from public, anon, authenticated;

grant execute on function public.service_sales_confirm_order(uuid, text, uuid, uuid)
	to service_role;
grant execute on function public.service_inventory_finance_cleared_order_ids(uuid, text, uuid[])
	to service_role;
grant execute on function public.service_reserve_order_stock(uuid, text, uuid)
	to service_role;
grant execute on function public.service_send_support_reply(uuid, text, uuid, text, public.support_message_channel, jsonb)
	to service_role;
