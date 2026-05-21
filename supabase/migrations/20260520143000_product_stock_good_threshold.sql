alter table public.inventory_stock
	add column if not exists good_quantity numeric;

update public.inventory_stock
set good_quantity = greatest(coalesce(good_quantity, 0), minimum_quantity)
where good_quantity is null
	or good_quantity < minimum_quantity;

alter table public.inventory_stock
	alter column good_quantity set default 0,
	alter column good_quantity set not null,
	drop constraint if exists inventory_stock_good_quantity_nonnegative,
	drop constraint if exists inventory_stock_good_quantity_gte_minimum,
	add constraint inventory_stock_good_quantity_nonnegative
		check (good_quantity >= 0),
	add constraint inventory_stock_good_quantity_gte_minimum
		check (good_quantity >= minimum_quantity);
