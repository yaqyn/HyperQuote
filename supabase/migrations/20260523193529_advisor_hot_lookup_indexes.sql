create index if not exists idx_ceo_search_documents_entity_type
	on public.ceo_search_documents using btree (entity_type);

create index if not exists idx_employees_full_name
	on public.employees using btree (full_name);

create index if not exists idx_categories_name
	on public.categories using btree (name);

create index if not exists idx_drivers_full_name
	on public.drivers using btree (full_name);
