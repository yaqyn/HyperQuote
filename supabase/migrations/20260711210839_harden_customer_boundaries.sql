alter table public.quote_requests
	drop constraint if exists quote_requests_idempotency_key_key;

alter table public.quote_requests
	add constraint quote_requests_customer_id_idempotency_key_key
	unique (customer_id, idempotency_key);

insert into storage.buckets (
	id,
	name,
	public,
	file_size_limit,
	allowed_mime_types
)
values (
	'customer-documents',
	'customer-documents',
	false,
	10485760,
	array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

-- Existing legacy URLs remain readable through the scoped server function.
-- New storage-backed documents must live below their owning customer prefix.
alter table public.documents
	add constraint documents_customer_storage_path_check
	check (
		storage_path is null
		or (
			customer_id is not null
			and storage_path like customer_id::text || '/%'
			and storage_path !~ '(^/|\.\.|//)'
		)
	) not valid;
