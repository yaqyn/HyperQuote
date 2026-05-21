drop view if exists public.ceo_search_index;
drop view if exists public.ceo_search_receiving_vtable;

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
	jsonb_build_object(
		'source', 'receiving_task',
		'product_name', p.name,
		'supplier_name', s.name,
		'advisor_name', e.full_name,
		'quantity', rr.quantity,
		'unit_cost', rr.unit_cost,
		'refill_status', rr.status,
		'receiving_status', rt.status,
		'rejection_reason', rt.rejection_reason,
		'created_at', rt.created_at,
		'updated_at', rt.updated_at
	) as metadata,
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
		p.sku,
		s.name,
		e.full_name,
		rr.quantity::text,
		rr.unit_cost::text,
		rt.rejection_reason,
		rt.created_at::text,
		rt.updated_at::text
	) as search_text
from public.receiving_tasks rt
left join public.refill_requests rr on rr.id = rt.refill_request_id
left join public.products p on p.id = rr.product_id
left join public.suppliers s on s.id = rr.supplier_id
left join public.employees e on e.id = rt.advisor_employee_id
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

do $$
declare
	relation_name text;
begin
	foreach relation_name in array array[
		'ceo_order_summary',
		'ceo_quote_request_summary',
		'ceo_customer_summary',
		'ceo_finance_summary',
		'ceo_inventory_summary',
		'ceo_warehouse_summary',
		'ceo_dispatch_summary',
		'ceo_driver_summary',
		'ceo_support_summary',
		'ceo_supplier_summary',
		'ceo_employee_summary',
		'ceo_activity_summary',
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
