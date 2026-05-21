create or replace function app_private.supplier_can_supply_product(
	p_supplier_id uuid,
	p_product_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.products p
		join public.supplier_specialties ss
		  on ss.supplier_id = p_supplier_id
		 and ss.category_slug = p.category
		 and (ss.product_slug is null or ss.product_slug = p.slug)
		where p.id = p_product_id
	);
$$;

revoke all on function app_private.supplier_can_supply_product(uuid, uuid) from public;
revoke all on function app_private.supplier_can_supply_product(uuid, uuid) from anon, authenticated;

create or replace function app_private.prune_supplier_links_for_removed_specialty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	perform set_config('app.audited_registry_write', 'on', true);

	delete from public.supplier_product_links spl
	using public.products p
	where spl.product_id = p.id
	  and spl.supplier_id = old.supplier_id
	  and p.category = old.category_slug
	  and (old.product_slug is null or p.slug = old.product_slug)
	  and not exists (
		select 1
		from public.supplier_specialties ss
		where ss.supplier_id = spl.supplier_id
		  and ss.category_slug = p.category
		  and (ss.product_slug is null or ss.product_slug = p.slug)
	  );

	if tg_op = 'DELETE' then
		return old;
	end if;
	return new;
end;
$$;

revoke all on function app_private.prune_supplier_links_for_removed_specialty() from public;
revoke all on function app_private.prune_supplier_links_for_removed_specialty() from anon, authenticated;

drop trigger if exists supplier_specialties_prune_links
	on public.supplier_specialties;
create trigger supplier_specialties_prune_links
	after update of category_slug, product_slug or delete
	on public.supplier_specialties
	for each row execute function app_private.prune_supplier_links_for_removed_specialty();

do $$
begin
	perform set_config('app.audited_registry_write', 'on', true);

	delete from public.supplier_product_links spl
	using public.products p
	where spl.product_id = p.id
	  and not exists (
		select 1
		from public.supplier_specialties ss
		where ss.supplier_id = spl.supplier_id
		  and ss.category_slug = p.category
		  and (ss.product_slug is null or ss.product_slug = p.slug)
	  );
end;
$$;
