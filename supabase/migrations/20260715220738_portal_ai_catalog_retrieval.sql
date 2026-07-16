create or replace function app_private.immutable_search_terms(p_values text[])
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
	select pg_catalog.array_to_string(coalesce(p_values, '{}'::text[]), ' ');
$$;

revoke all on function app_private.immutable_search_terms(text[])
	from public, anon, authenticated;

alter table public.categories
	add column if not exists search_aliases text[] not null default '{}';

alter table public.product_families
	add column if not exists search_aliases text[] not null default '{}';

alter table public.product_types
	add column if not exists search_aliases text[] not null default '{}';

alter table public.products
	add column if not exists portal_search_vector tsvector generated always as (
		setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
		setweight(to_tsvector('simple', coalesce(name_ar, '')), 'A') ||
		setweight(to_tsvector('simple', coalesce(sku, '')), 'A') ||
		setweight(to_tsvector('simple', coalesce(brand, '')), 'B') ||
		setweight(to_tsvector('simple', coalesce(manufacturer, '')), 'B') ||
		setweight(to_tsvector('simple', coalesce(category, '')), 'B') ||
		setweight(to_tsvector('simple', coalesce(subcategory, '')), 'B') ||
		setweight(to_tsvector('simple', coalesce(subcategory_ar, '')), 'B') ||
		setweight(to_tsvector('simple', app_private.immutable_search_terms(tags)), 'B') ||
		setweight(to_tsvector('simple', coalesce(description, '')), 'C') ||
		setweight(to_tsvector('simple', coalesce(description_ar, '')), 'C')
	) stored;

alter table public.categories
	add column if not exists portal_search_vector tsvector generated always as (
		setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
		setweight(to_tsvector('simple', coalesce(name_ar, '')), 'A') ||
		setweight(to_tsvector('simple', coalesce(slug, '')), 'A') ||
		setweight(to_tsvector('simple', app_private.immutable_search_terms(search_aliases)), 'A') ||
		setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
		setweight(to_tsvector('simple', coalesce(description_ar, '')), 'B')
	) stored;

alter table public.product_families
	add column if not exists portal_search_vector tsvector generated always as (
		setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
		setweight(to_tsvector('simple', coalesce(name_ar, '')), 'A') ||
		setweight(to_tsvector('simple', coalesce(slug, '')), 'A') ||
		setweight(to_tsvector('simple', app_private.immutable_search_terms(search_aliases)), 'A') ||
		setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
		setweight(to_tsvector('simple', coalesce(description_ar, '')), 'B')
	) stored;

alter table public.product_types
	add column if not exists portal_search_vector tsvector generated always as (
		setweight(to_tsvector('simple', coalesce(name, '')), 'A') ||
		setweight(to_tsvector('simple', coalesce(name_ar, '')), 'A') ||
		setweight(to_tsvector('simple', coalesce(slug, '')), 'A') ||
		setweight(to_tsvector('simple', app_private.immutable_search_terms(search_aliases)), 'A') ||
		setweight(to_tsvector('simple', coalesce(description, '')), 'B') ||
		setweight(to_tsvector('simple', coalesce(description_ar, '')), 'B')
	) stored;

create index if not exists products_portal_search_vector_idx
	on public.products using gin (portal_search_vector);

create index if not exists categories_portal_search_vector_idx
	on public.categories using gin (portal_search_vector);

create index if not exists product_families_portal_search_vector_idx
	on public.product_families using gin (portal_search_vector);

create index if not exists product_types_portal_search_vector_idx
	on public.product_types using gin (portal_search_vector);

create index if not exists products_manufacturer_trgm_idx
	on public.products using gin (manufacturer gin_trgm_ops);

create index if not exists products_category_trgm_idx
	on public.products using gin (category gin_trgm_ops);

create index if not exists products_subcategory_trgm_idx
	on public.products using gin (subcategory gin_trgm_ops);

select set_config('app.audited_registry_write', 'on', true);

update public.categories
set search_aliases = case slug
	when 'timber' then array['wood', 'wooden', 'timber', 'lumber', 'خشب', 'أخشاب', 'اخشاب']
	when 'steel' then array['steel', 'iron', 'metal', 'حديد', 'صلب']
	when 'cement' then array['cement', 'concrete', 'أسمنت', 'اسمنت', 'خرسانة']
	else search_aliases
end
where slug in ('timber', 'steel', 'cement')
	and cardinality(search_aliases) = 0;

update public.product_families
set search_aliases = case
	when slug ~ '(^|-)plywood$' then array['plywood', 'wood sheet', 'wood panel', 'أبلكاش', 'ابلكاش', 'خشب رقائقي']
	when slug ~ '(^|-)structural-timber$' then array['timber', 'lumber', 'wood beam', 'خشب', 'خشب إنشائي', 'خشب انشائي']
	when slug ~ '(^|-)formwork-boards$' then array['formwork wood', 'shuttering board', 'wood board', 'ألواح شدة', 'الواح شدة']
	when slug ~ '(^|-)rebar$' then array['rebar', 'reinforcement steel', 'steel bar', 'حديد تسليح']
	when slug ~ '(^|-)steel-mesh$' then array['steel mesh', 'welded mesh', 'wire mesh', 'شبك حديد']
	when slug ~ '(^|-)steel-profiles$' then array['steel profile', 'steel section', 'structural steel', 'قطاعات حديد']
	when slug ~ '(^|-)portland-cement$' then array['portland cement', 'grey cement', 'أسمنت بورتلاندي', 'اسمنت بورتلاندي']
	when slug ~ '(^|-)white-cement$' then array['white cement', 'finishing cement', 'أسمنت أبيض', 'اسمنت ابيض']
	when slug ~ '(^|-)ready-mix-concrete$' then array['ready mix', 'ready mixed concrete', 'concrete', 'خرسانة جاهزة']
	else search_aliases
end
where slug ~ '(^|-)(plywood|structural-timber|formwork-boards|rebar|steel-mesh|steel-profiles|portland-cement|white-cement|ready-mix-concrete)$'
	and cardinality(search_aliases) = 0;

select set_config('app.audited_registry_write', 'off', true);

create or replace function public.service_search_portal_catalog(
	p_query text default '',
	p_limit integer default 24,
	p_orderable_only boolean default false
)
returns table (
	id uuid,
	sku text,
	slug text,
	name text,
	name_ar text,
	description text,
	description_ar text,
	category text,
	subcategory text,
	subcategory_ar text,
	brand text,
	manufacturer text,
	specifications jsonb,
	specifications_ar jsonb,
	unit_of_measure text,
	unit_of_measure_ar text,
	price_range_min numeric,
	price_range_max numeric,
	availability_status public.catalog_availability_status,
	image_urls text[],
	category_name text,
	category_name_ar text,
	product_family_slug text,
	product_family_name text,
	product_family_name_ar text,
	product_type_slug text,
	product_type_name text,
	product_type_name_ar text,
	search_rank double precision,
	total_matches bigint,
	total_visible_products bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
	with params as (
		select
			lower(trim(coalesce(p_query, ''))) as normalized_query,
			least(greatest(coalesce(p_limit, 24), 1), 100) as result_limit
	),
	query_data as (
		select
			params.normalized_query,
			params.result_limit,
			case
				when params.normalized_query = '' then null::tsquery
				else pg_catalog.websearch_to_tsquery('simple'::regconfig, params.normalized_query)
			end as parsed_query
		from params
	),
	candidates as (
		select
			p.id,
			p.sku,
			p.slug,
			p.name,
			p.name_ar,
			p.description,
			p.description_ar,
			p.category,
			p.subcategory,
			p.subcategory_ar,
			p.brand,
			p.manufacturer,
			p.specifications,
			p.specifications_ar,
			p.unit_of_measure,
			p.unit_of_measure_ar,
			p.price_range_min,
			p.price_range_max,
			p.availability_status,
			p.image_urls,
			c.name as category_name,
			c.name_ar as category_name_ar,
			pf.slug as product_family_slug,
			pf.name as product_family_name,
			pf.name_ar as product_family_name_ar,
			pt.slug as product_type_slug,
			pt.name as product_type_name,
			pt.name_ar as product_type_name_ar,
			qd.normalized_query,
			qd.result_limit,
			(
				qd.normalized_query = ''
				or p.portal_search_vector @@ qd.parsed_query
				or c.portal_search_vector @@ qd.parsed_query
				or pf.portal_search_vector @@ qd.parsed_query
				or pt.portal_search_vector @@ qd.parsed_query
				or lower(p.name) like '%' || qd.normalized_query || '%'
				or lower(p.name_ar) like '%' || qd.normalized_query || '%'
				or lower(p.sku) like '%' || qd.normalized_query || '%'
				or lower(coalesce(p.brand, '')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(p.manufacturer, '')) like '%' || qd.normalized_query || '%'
				or lower(array_to_string(p.tags, ' ')) like '%' || qd.normalized_query || '%'
				or lower(array_to_string(c.search_aliases, ' ')) like '%' || qd.normalized_query || '%'
				or lower(array_to_string(pf.search_aliases, ' ')) like '%' || qd.normalized_query || '%'
				or lower(array_to_string(pt.search_aliases, ' ')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(pf.name, '')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(pf.name_ar, '')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(c.name, '')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(c.name_ar, '')) like '%' || qd.normalized_query || '%'
			) as is_strong_match,
			(
				qd.normalized_query = ''
				or p.portal_search_vector @@ qd.parsed_query
				or pf.portal_search_vector @@ qd.parsed_query
				or pt.portal_search_vector @@ qd.parsed_query
				or lower(p.name) like '%' || qd.normalized_query || '%'
				or lower(p.name_ar) like '%' || qd.normalized_query || '%'
				or lower(p.sku) like '%' || qd.normalized_query || '%'
				or lower(coalesce(p.brand, '')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(p.manufacturer, '')) like '%' || qd.normalized_query || '%'
				or lower(array_to_string(p.tags, ' ')) like '%' || qd.normalized_query || '%'
				or lower(array_to_string(pf.search_aliases, ' ')) like '%' || qd.normalized_query || '%'
				or lower(array_to_string(pt.search_aliases, ' ')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(pf.name, '')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(pf.name_ar, '')) like '%' || qd.normalized_query || '%'
			) as is_specific_match,
			case
				when qd.normalized_query = '' then 0::double precision
				else
					(case
						when lower(p.sku) = qd.normalized_query then 12
						when lower(p.name) = qd.normalized_query or lower(p.name_ar) = qd.normalized_query then 10
						else 0
					end)::double precision +
					coalesce(pg_catalog.ts_rank_cd(p.portal_search_vector, qd.parsed_query, 32), 0)::double precision * 8 +
					coalesce(pg_catalog.ts_rank_cd(pt.portal_search_vector, qd.parsed_query, 32), 0)::double precision * 7 +
					coalesce(pg_catalog.ts_rank_cd(pf.portal_search_vector, qd.parsed_query, 32), 0)::double precision * 6 +
					coalesce(pg_catalog.ts_rank_cd(c.portal_search_vector, qd.parsed_query, 32), 0)::double precision * 5 +
					greatest(
						extensions.word_similarity(qd.normalized_query, lower(coalesce(p.name, ''))),
						extensions.word_similarity(qd.normalized_query, lower(coalesce(p.name_ar, ''))),
						extensions.word_similarity(qd.normalized_query, lower(coalesce(p.sku, ''))),
						extensions.word_similarity(qd.normalized_query, lower(coalesce(p.brand, ''))),
						extensions.word_similarity(qd.normalized_query, lower(coalesce(p.manufacturer, ''))),
						extensions.word_similarity(qd.normalized_query, lower(array_to_string(p.tags, ' '))),
						extensions.word_similarity(qd.normalized_query, lower(array_to_string(pt.search_aliases, ' '))),
						extensions.word_similarity(qd.normalized_query, lower(array_to_string(pf.search_aliases, ' '))),
						extensions.word_similarity(qd.normalized_query, lower(array_to_string(c.search_aliases, ' '))),
						extensions.word_similarity(qd.normalized_query, lower(coalesce(pf.name, ''))),
						extensions.word_similarity(qd.normalized_query, lower(coalesce(pf.name_ar, ''))),
						extensions.word_similarity(qd.normalized_query, lower(coalesce(c.name, ''))),
						extensions.word_similarity(qd.normalized_query, lower(coalesce(c.name_ar, '')))
					)::double precision * 4
			end as search_rank
		from public.products p
		left join public.product_types pt on pt.id = p.product_type_id
		left join public.product_families pf on pf.id = pt.product_family_id
		left join public.categories c on c.id = pf.category_id
		cross join query_data qd
		where p.is_active
			and p.availability_status <> 'hidden'::public.catalog_availability_status
			and (
				not p_orderable_only
				or p.availability_status <> 'out_of_stock'::public.catalog_availability_status
			)
			and (
				qd.normalized_query = ''
				or p.portal_search_vector @@ qd.parsed_query
				or c.portal_search_vector @@ qd.parsed_query
				or pf.portal_search_vector @@ qd.parsed_query
				or pt.portal_search_vector @@ qd.parsed_query
				or lower(p.name) like '%' || qd.normalized_query || '%'
				or lower(p.name_ar) like '%' || qd.normalized_query || '%'
				or lower(p.sku) like '%' || qd.normalized_query || '%'
				or lower(coalesce(p.brand, '')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(p.manufacturer, '')) like '%' || qd.normalized_query || '%'
				or lower(array_to_string(p.tags, ' ')) like '%' || qd.normalized_query || '%'
				or lower(array_to_string(c.search_aliases, ' ')) like '%' || qd.normalized_query || '%'
				or lower(array_to_string(pf.search_aliases, ' ')) like '%' || qd.normalized_query || '%'
				or lower(array_to_string(pt.search_aliases, ' ')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(pf.name, '')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(pf.name_ar, '')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(c.name, '')) like '%' || qd.normalized_query || '%'
				or lower(coalesce(c.name_ar, '')) like '%' || qd.normalized_query || '%'
				or extensions.word_similarity(qd.normalized_query, lower(coalesce(p.name, ''))) >= 0.28
				or extensions.word_similarity(qd.normalized_query, lower(coalesce(p.name_ar, ''))) >= 0.28
				or extensions.word_similarity(qd.normalized_query, lower(coalesce(pf.name, ''))) >= 0.32
				or extensions.word_similarity(qd.normalized_query, lower(coalesce(c.name, ''))) >= 0.32
				or extensions.word_similarity(qd.normalized_query, lower(array_to_string(p.tags, ' '))) >= 0.28
				or extensions.word_similarity(qd.normalized_query, lower(array_to_string(pf.search_aliases, ' '))) >= 0.28
				or extensions.word_similarity(qd.normalized_query, lower(array_to_string(c.search_aliases, ' '))) >= 0.28
			)
	),
	relevant_candidates as (
		select candidates.*
		from candidates
		where candidates.is_specific_match
			or (
				not exists (
					select 1
					from candidates specific_candidate
					where specific_candidate.is_specific_match
				)
				and candidates.is_strong_match
			)
			or not exists (
				select 1
				from candidates strong_candidate
				where strong_candidate.is_strong_match
			)
	),
	ranked as (
		select
			relevant_candidates.*,
			count(*) over () as total_matches,
			(
				select count(*)
				from public.products visible
				where visible.is_active
					and visible.availability_status <> 'hidden'::public.catalog_availability_status
			) as total_visible_products
		from relevant_candidates
	)
	select
		ranked.id,
		ranked.sku,
		ranked.slug,
		ranked.name,
		ranked.name_ar,
		ranked.description,
		ranked.description_ar,
		ranked.category,
		ranked.subcategory,
		ranked.subcategory_ar,
		ranked.brand,
		ranked.manufacturer,
		ranked.specifications,
		ranked.specifications_ar,
		ranked.unit_of_measure,
		ranked.unit_of_measure_ar,
		ranked.price_range_min,
		ranked.price_range_max,
		ranked.availability_status,
		ranked.image_urls,
		ranked.category_name,
		ranked.category_name_ar,
		ranked.product_family_slug,
		ranked.product_family_name,
		ranked.product_family_name_ar,
		ranked.product_type_slug,
		ranked.product_type_name,
		ranked.product_type_name_ar,
		ranked.search_rank,
		ranked.total_matches,
		ranked.total_visible_products
	from ranked
	order by ranked.search_rank desc, ranked.name asc
	limit (select result_limit from query_data);
$$;

revoke all on function public.service_search_portal_catalog(text, integer, boolean)
	from public, anon, authenticated;
grant execute on function public.service_search_portal_catalog(text, integer, boolean)
	to service_role;
