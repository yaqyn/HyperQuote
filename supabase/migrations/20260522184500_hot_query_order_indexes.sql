create index if not exists idx_ceo_search_documents_sort_at
	on public.ceo_search_documents using btree (sort_at);

create index if not exists idx_quote_requests_created_at
	on public.quote_requests using btree (created_at);

create index if not exists idx_customers_created_at
	on public.customers using btree (created_at);
