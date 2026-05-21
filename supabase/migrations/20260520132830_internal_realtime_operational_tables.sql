do $$
declare
	realtime_table text;
	realtime_tables text[] := array[
		'activity_events',
		'ai_tool_call_audit',
		'approvals',
		'categories',
		'customer_addresses',
		'customer_payments',
		'customers',
		'deliveries',
		'delivery_proofs',
		'document_downloads',
		'documents',
		'driver_locations',
		'driver_online_states',
		'driver_team_messages',
		'drivers',
		'employee_panel_permissions',
		'employee_presence',
		'employee_roles',
		'employees',
		'finance_payment_followups',
		'inventory_reservations',
		'inventory_stock',
		'loading_task_drivers',
		'loading_tasks',
		'notification_preferences',
		'notifications',
		'orders',
		'price_update_requests',
		'price_updates',
		'pricing_rules',
		'products',
		'projects',
		'quote_counter_offers',
		'quote_items',
		'quote_request_items',
		'quote_requests',
		'quote_versions',
		'quotes',
		'receiving_task_items',
		'receiving_tasks',
		'referrals',
		'refill_requests',
		'sales_call_notes',
		'sales_quote_versions',
		'supplier_payments',
		'supplier_product_links',
		'suppliers',
		'support_attachments',
		'support_conversations',
		'support_messages',
		'support_tickets',
		'team_invites',
		'team_members',
		'trucks',
		'user_profiles',
		'user_roles',
		'user_sessions'
	];
begin
	if not exists (
		select 1
		from pg_publication
		where pubname = 'supabase_realtime'
	) then
		return;
	end if;

	foreach realtime_table in array realtime_tables
	loop
		if exists (
			select 1
			from information_schema.tables
			where table_schema = 'public'
			  and table_name = realtime_table
			  and table_type = 'BASE TABLE'
		)
		and not exists (
			select 1
			from pg_publication_tables
			where pubname = 'supabase_realtime'
			  and schemaname = 'public'
			  and tablename = realtime_table
		) then
			execute format(
				'alter publication supabase_realtime add table public.%I',
				realtime_table
			);
		end if;
	end loop;
end $$;
