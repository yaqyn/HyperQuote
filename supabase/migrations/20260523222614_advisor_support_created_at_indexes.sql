create index if not exists idx_support_tickets_created_at
	on public.support_tickets using btree (created_at);

create index if not exists idx_support_messages_created_at
	on public.support_messages using btree (created_at);
