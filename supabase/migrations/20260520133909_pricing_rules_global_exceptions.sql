alter table public.pricing_rules
	add column if not exists id uuid default gen_random_uuid(),
	add column if not exists category_slug text,
	add column if not exists product_slug text,
	add column if not exists bonus_margin numeric not null default 20 check (bonus_margin >= 0 and bonus_margin < 100);

update public.pricing_rules
set
	id = coalesce(id, gen_random_uuid()),
	category_slug = case
		when product_category in ('all', 'global', '__global__') then null
		else coalesce(category_slug, product_category)
	end,
	product_slug = null,
	bonus_margin = greatest(
		coalesce(bonus_margin, 20),
		target_margin,
		floor_margin,
		absolute_min_margin
	)
where id is null
	or category_slug is null
	or bonus_margin is null;

alter table public.pricing_rules
	alter column id set not null,
	alter column target_margin set default 20,
	alter column floor_margin set default 20,
	alter column absolute_min_margin set default 20;

do $$
begin
	if exists (
		select 1
		from pg_constraint
		where conrelid = 'public.pricing_rules'::regclass
			and conname = 'pricing_rules_pkey'
	) then
		alter table public.pricing_rules drop constraint pricing_rules_pkey;
	end if;

	if not exists (
		select 1
		from pg_constraint
		where conrelid = 'public.pricing_rules'::regclass
			and conname = 'pricing_rules_pkey'
	) then
		alter table public.pricing_rules add constraint pricing_rules_pkey primary key (id);
	end if;
end $$;

alter table public.pricing_rules
	alter column product_category drop not null;

alter table public.pricing_rules
	drop constraint if exists pricing_rules_product_scope_requires_category;

alter table public.pricing_rules
	add constraint pricing_rules_product_scope_requires_category
	check (product_slug is null or category_slug is not null);

alter table public.pricing_rules
	drop constraint if exists pricing_rules_margin_order;

alter table public.pricing_rules
	add constraint pricing_rules_margin_order
	check (
		floor_margin <= target_margin
		and target_margin <= bonus_margin
		and absolute_min_margin <= floor_margin
	);

create unique index if not exists pricing_rules_active_scope_unique_idx
	on public.pricing_rules (
		coalesce(category_slug, '__all__'),
		coalesce(product_slug, '__all__')
	)
	where active;

create index if not exists pricing_rules_category_slug_idx
	on public.pricing_rules (category_slug)
	where active;

create index if not exists pricing_rules_product_slug_idx
	on public.pricing_rules (product_slug)
	where active and product_slug is not null;

create or replace function app_private.validate_pricing_rule_scope()
returns trigger
language plpgsql
security definer
set search_path = public, app_private
as $$
declare
	resolved_category text;
begin
	new.category_slug := nullif(btrim(new.category_slug), '');
	new.product_slug := nullif(btrim(new.product_slug), '');

	if new.active then
		if new.floor_margin > new.target_margin then
			raise exception 'pricing_rule_floor_above_target' using errcode = '23514';
		end if;

		if new.target_margin > new.bonus_margin then
			raise exception 'pricing_rule_target_above_bonus' using errcode = '23514';
		end if;

		if new.category_slug is not null
			and not exists (
				select 1 from public.categories c where c.slug = new.category_slug
			)
		then
			raise exception 'pricing_rule_category_not_found_%', new.category_slug using errcode = '23503';
		end if;

		if new.product_slug is not null then
			select p.category
			into resolved_category
			from public.products p
			where p.slug = new.product_slug;

			if resolved_category is null then
				raise exception 'pricing_rule_product_not_found_%', new.product_slug using errcode = '23503';
			end if;

			if new.category_slug is null or resolved_category <> new.category_slug then
				raise exception 'pricing_rule_product_category_mismatch' using errcode = '23514';
			end if;
		end if;
	end if;

	new.absolute_min_margin := new.floor_margin;
	new.product_category := case
		when new.category_slug is null then 'all'
		when new.product_slug is null then new.category_slug
		else new.category_slug || ':' || new.product_slug
	end;
	new.updated_at := now();
	return new;
end;
$$;

drop trigger if exists pricing_rules_validate_scope on public.pricing_rules;

create trigger pricing_rules_validate_scope
before insert or update on public.pricing_rules
for each row
execute function app_private.validate_pricing_rule_scope();

insert into public.pricing_rules (
	category_slug,
	product_slug,
	product_category,
	bonus_margin,
	target_margin,
	floor_margin,
	absolute_min_margin,
	active
)
select
	null,
	null,
	'all',
	20,
	20,
	20,
	20,
	true
where not exists (
	select 1
	from public.pricing_rules
	where active
		and category_slug is null
		and product_slug is null
);
