create index if not exists proof_documents_uploaded_by_employee_id_idx
	on public.proof_documents (uploaded_by_employee_id);

create index if not exists proof_documents_uploaded_by_user_id_idx
	on public.proof_documents (uploaded_by_user_id);

create index if not exists support_email_threads_support_message_id_idx
	on public.support_email_threads (support_message_id);
