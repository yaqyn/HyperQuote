insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
	(
		'quote-attachments',
		'quote-attachments',
		false,
		10485760,
		array['image/jpeg', 'image/png', 'application/pdf']
	)
on conflict (id) do update
set
	public = excluded.public,
	file_size_limit = excluded.file_size_limit,
	allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists storage_authenticated_uploads on storage.objects;
create policy storage_authenticated_uploads
	on storage.objects for insert
	to authenticated
	with check (
		bucket_id in (
			'price-proofs',
			'payment-proofs',
			'delivery-proofs',
			'support-attachments',
			'quote-attachments'
		)
	);

drop policy if exists storage_authenticated_reads on storage.objects;
create policy storage_authenticated_reads
	on storage.objects for select
	to authenticated
	using (
		bucket_id in (
			'price-proofs',
			'payment-proofs',
			'delivery-proofs',
			'support-attachments',
			'quote-attachments'
		)
	);
