create or replace function public.inventory_finance_cleared_order_ids(p_order_ids uuid[])
returns table(order_id uuid)
language plpgsql
security definer
set search_path = public
as $$
begin
	perform public.require_panel('inventory');

	if p_order_ids is null or array_length(p_order_ids, 1) is null then
		return;
	end if;

	return query
	select distinct cp.order_id
	from public.customer_payments cp
	where cp.order_id = any (p_order_ids)
	  and cp.status = 'recorded';
end;
$$;

revoke all on function public.inventory_finance_cleared_order_ids(uuid[]) from public;
grant execute on function public.inventory_finance_cleared_order_ids(uuid[]) to authenticated;
