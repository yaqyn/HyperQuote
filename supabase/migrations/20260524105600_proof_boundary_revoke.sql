revoke all on function public.register_proof_document(
	text,
	text,
	text,
	integer,
	public.employee_panel,
	text,
	text,
	uuid,
	text,
	text
) from public, anon, authenticated;

revoke all on function public.create_supplier_refill(
	uuid,
	uuid,
	numeric,
	numeric,
	jsonb
) from public, anon, authenticated;
