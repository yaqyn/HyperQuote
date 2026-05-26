export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[]

export type Database = {
	public: {
		Tables: {
			activity_event_proofs: {
				Row: {
					activity_event_id: string
					created_at: string
					proof_document_id: string
				}
				Insert: {
					activity_event_id: string
					created_at?: string
					proof_document_id: string
				}
				Update: {
					activity_event_id?: string
					created_at?: string
					proof_document_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'activity_event_proofs_activity_event_id_fkey'
						columns: ['activity_event_id']
						isOneToOne: false
						referencedRelation: 'activity_events'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'activity_event_proofs_activity_event_id_fkey'
						columns: ['activity_event_id']
						isOneToOne: false
						referencedRelation: 'ceo_activity_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'activity_event_proofs_activity_event_id_fkey'
						columns: ['activity_event_id']
						isOneToOne: false
						referencedRelation: 'ceo_business_activity_vtable'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'activity_event_proofs_proof_document_id_fkey'
						columns: ['proof_document_id']
						isOneToOne: false
						referencedRelation: 'proof_documents'
						referencedColumns: ['id']
					},
				]
			}
			activity_events: {
				Row: {
					action: Database['public']['Enums']['audit_event_type']
					actor_customer_id: string | null
					actor_driver_id: string | null
					actor_employee_id: string | null
					actor_user_id: string | null
					created_at: string
					details: Json
					entity_id: string | null
					entity_type: string
					id: string
				}
				Insert: {
					action: Database['public']['Enums']['audit_event_type']
					actor_customer_id?: string | null
					actor_driver_id?: string | null
					actor_employee_id?: string | null
					actor_user_id?: string | null
					created_at?: string
					details?: Json
					entity_id?: string | null
					entity_type: string
					id?: string
				}
				Update: {
					action?: Database['public']['Enums']['audit_event_type']
					actor_customer_id?: string | null
					actor_driver_id?: string | null
					actor_employee_id?: string | null
					actor_user_id?: string | null
					created_at?: string
					details?: Json
					entity_id?: string | null
					entity_type?: string
					id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'activity_events_actor_customer_id_fkey'
						columns: ['actor_customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'activity_events_actor_customer_id_fkey'
						columns: ['actor_customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'activity_events_actor_driver_id_fkey'
						columns: ['actor_driver_id']
						isOneToOne: false
						referencedRelation: 'ceo_driver_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'activity_events_actor_driver_id_fkey'
						columns: ['actor_driver_id']
						isOneToOne: false
						referencedRelation: 'drivers'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'activity_events_actor_employee_id_fkey'
						columns: ['actor_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'activity_events_actor_employee_id_fkey'
						columns: ['actor_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			ai_tool_call_audit: {
				Row: {
					actor_employee_id: string | null
					actor_user_id: string | null
					agent_scope: Database['public']['Enums']['ai_agent_scope']
					approved_by_user: boolean
					created_at: string
					id: string
					input_summary: Json
					output_summary: Json
					read_entities: string[]
					tool_name: string
					write_entity_id: string | null
					write_entity_type: string | null
				}
				Insert: {
					actor_employee_id?: string | null
					actor_user_id?: string | null
					agent_scope: Database['public']['Enums']['ai_agent_scope']
					approved_by_user?: boolean
					created_at?: string
					id?: string
					input_summary?: Json
					output_summary?: Json
					read_entities?: string[]
					tool_name: string
					write_entity_id?: string | null
					write_entity_type?: string | null
				}
				Update: {
					actor_employee_id?: string | null
					actor_user_id?: string | null
					agent_scope?: Database['public']['Enums']['ai_agent_scope']
					approved_by_user?: boolean
					created_at?: string
					id?: string
					input_summary?: Json
					output_summary?: Json
					read_entities?: string[]
					tool_name?: string
					write_entity_id?: string | null
					write_entity_type?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'ai_tool_call_audit_actor_employee_id_fkey'
						columns: ['actor_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'ai_tool_call_audit_actor_employee_id_fkey'
						columns: ['actor_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			approvals: {
				Row: {
					approval_type: string
					assigned_to: string | null
					context: Json
					created_at: string
					decided_at: string | null
					entity_id: string
					entity_type: string
					id: string
					requested_by: string | null
					status: Database['public']['Enums']['approval_status']
					updated_at: string
				}
				Insert: {
					approval_type: string
					assigned_to?: string | null
					context?: Json
					created_at?: string
					decided_at?: string | null
					entity_id: string
					entity_type: string
					id?: string
					requested_by?: string | null
					status?: Database['public']['Enums']['approval_status']
					updated_at?: string
				}
				Update: {
					approval_type?: string
					assigned_to?: string | null
					context?: Json
					created_at?: string
					decided_at?: string | null
					entity_id?: string
					entity_type?: string
					id?: string
					requested_by?: string | null
					status?: Database['public']['Enums']['approval_status']
					updated_at?: string
				}
				Relationships: []
			}
			categories: {
				Row: {
					created_at: string
					description: string
					description_ar: string
					id: string
					image_url: string | null
					is_active: boolean
					name: string
					name_ar: string
					parent_id: string | null
					slug: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					description?: string
					description_ar?: string
					id?: string
					image_url?: string | null
					is_active?: boolean
					name: string
					name_ar?: string
					parent_id?: string | null
					slug: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					description?: string
					description_ar?: string
					id?: string
					image_url?: string | null
					is_active?: boolean
					name?: string
					name_ar?: string
					parent_id?: string | null
					slug?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'categories_parent_id_fkey'
						columns: ['parent_id']
						isOneToOne: false
						referencedRelation: 'categories'
						referencedColumns: ['id']
					},
				]
			}
			ceo_search_documents: {
				Row: {
					entity_id: string
					entity_type: string
					metadata: Json
					refreshed_at: string
					search_text: string
					search_vector: unknown
					sort_at: string | null
					subtitle: string | null
					title: string
				}
				Insert: {
					entity_id: string
					entity_type: string
					metadata?: Json
					refreshed_at?: string
					search_text?: string
					search_vector?: unknown
					sort_at?: string | null
					subtitle?: string | null
					title: string
				}
				Update: {
					entity_id?: string
					entity_type?: string
					metadata?: Json
					refreshed_at?: string
					search_text?: string
					search_vector?: unknown
					sort_at?: string | null
					subtitle?: string | null
					title?: string
				}
				Relationships: []
			}
			company_assets: {
				Row: {
					acquisition_cost: number
					acquisition_date: string
					asset_number: string
					asset_type: Database['public']['Enums']['company_asset_type']
					carrying_value: number
					created_at: string
					created_by_employee_id: string | null
					currency: string
					funding_source: Database['public']['Enums']['company_asset_funding_source']
					id: string
					journal_entry_id: string | null
					location: string | null
					name: string
					notes: string | null
					proof_document_id: string | null
					proof_path: string | null
					related_truck_id: string | null
					status: Database['public']['Enums']['company_asset_status']
					updated_at: string
				}
				Insert: {
					acquisition_cost: number
					acquisition_date?: string
					asset_number?: string
					asset_type: Database['public']['Enums']['company_asset_type']
					carrying_value: number
					created_at?: string
					created_by_employee_id?: string | null
					currency?: string
					funding_source: Database['public']['Enums']['company_asset_funding_source']
					id?: string
					journal_entry_id?: string | null
					location?: string | null
					name: string
					notes?: string | null
					proof_document_id?: string | null
					proof_path?: string | null
					related_truck_id?: string | null
					status?: Database['public']['Enums']['company_asset_status']
					updated_at?: string
				}
				Update: {
					acquisition_cost?: number
					acquisition_date?: string
					asset_number?: string
					asset_type?: Database['public']['Enums']['company_asset_type']
					carrying_value?: number
					created_at?: string
					created_by_employee_id?: string | null
					currency?: string
					funding_source?: Database['public']['Enums']['company_asset_funding_source']
					id?: string
					journal_entry_id?: string | null
					location?: string | null
					name?: string
					notes?: string | null
					proof_document_id?: string | null
					proof_path?: string | null
					related_truck_id?: string | null
					status?: Database['public']['Enums']['company_asset_status']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'company_assets_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'company_assets_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'company_assets_journal_entry_id_fkey'
						columns: ['journal_entry_id']
						isOneToOne: true
						referencedRelation: 'finance_journal_entries'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'company_assets_proof_document_id_fkey'
						columns: ['proof_document_id']
						isOneToOne: false
						referencedRelation: 'proof_documents'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'company_assets_related_truck_id_fkey'
						columns: ['related_truck_id']
						isOneToOne: false
						referencedRelation: 'trucks'
						referencedColumns: ['id']
					},
				]
			}
			customer_addresses: {
				Row: {
					area: string | null
					city: string
					created_at: string
					customer_id: string
					governorate: string
					id: string
					is_default: boolean
					label: string | null
					landmark: string | null
					latitude: number | null
					longitude: number | null
					phone: string | null
					postal_code: string | null
					street: string
					updated_at: string
				}
				Insert: {
					area?: string | null
					city: string
					created_at?: string
					customer_id: string
					governorate: string
					id?: string
					is_default?: boolean
					label?: string | null
					landmark?: string | null
					latitude?: number | null
					longitude?: number | null
					phone?: string | null
					postal_code?: string | null
					street: string
					updated_at?: string
				}
				Update: {
					area?: string | null
					city?: string
					created_at?: string
					customer_id?: string
					governorate?: string
					id?: string
					is_default?: boolean
					label?: string | null
					landmark?: string | null
					latitude?: number | null
					longitude?: number | null
					phone?: string | null
					postal_code?: string | null
					street?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'customer_addresses_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'customer_addresses_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			customer_payments: {
				Row: {
					amount: number
					created_at: string
					id: string
					order_id: string
					payment_fraction: number
					proof_path: string
					recorded_by_employee_id: string | null
					status: Database['public']['Enums']['payment_record_status']
				}
				Insert: {
					amount: number
					created_at?: string
					id?: string
					order_id: string
					payment_fraction: number
					proof_path: string
					recorded_by_employee_id?: string | null
					status?: Database['public']['Enums']['payment_record_status']
				}
				Update: {
					amount?: number
					created_at?: string
					id?: string
					order_id?: string
					payment_fraction?: number
					proof_path?: string
					recorded_by_employee_id?: string | null
					status?: Database['public']['Enums']['payment_record_status']
				}
				Relationships: [
					{
						foreignKeyName: 'customer_payments_order_id_fkey'
						columns: ['order_id']
						isOneToOne: false
						referencedRelation: 'ceo_order_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'customer_payments_order_id_fkey'
						columns: ['order_id']
						isOneToOne: false
						referencedRelation: 'orders'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'customer_payments_recorded_by_employee_id_fkey'
						columns: ['recorded_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'customer_payments_recorded_by_employee_id_fkey'
						columns: ['recorded_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			customer_quote_carts: {
				Row: {
					created_at: string
					customer_id: string
					global_note: string
					items: Json
					source: string
					updated_at: string
					version: number
				}
				Insert: {
					created_at?: string
					customer_id: string
					global_note?: string
					items?: Json
					source?: string
					updated_at?: string
					version?: number
				}
				Update: {
					created_at?: string
					customer_id?: string
					global_note?: string
					items?: Json
					source?: string
					updated_at?: string
					version?: number
				}
				Relationships: [
					{
						foreignKeyName: 'customer_quote_carts_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: true
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'customer_quote_carts_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: true
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			customers: {
				Row: {
					assigned_sales_rep_id: string | null
					company_name: string
					contact_name: string
					created_at: string
					created_by_employee_id: string | null
					credit_limit: number
					email: string | null
					id: string
					payment_history: Database['public']['Enums']['customer_payment_history']
					phone: string
					profile_photo_url: string | null
					status: Database['public']['Enums']['customer_status']
					tier: Database['public']['Enums']['customer_tier']
					trade_license_status: Database['public']['Enums']['trade_license_status']
					updated_at: string
					user_id: string | null
				}
				Insert: {
					assigned_sales_rep_id?: string | null
					company_name: string
					contact_name: string
					created_at?: string
					created_by_employee_id?: string | null
					credit_limit?: number
					email?: string | null
					id?: string
					payment_history?: Database['public']['Enums']['customer_payment_history']
					phone: string
					profile_photo_url?: string | null
					status?: Database['public']['Enums']['customer_status']
					tier?: Database['public']['Enums']['customer_tier']
					trade_license_status?: Database['public']['Enums']['trade_license_status']
					updated_at?: string
					user_id?: string | null
				}
				Update: {
					assigned_sales_rep_id?: string | null
					company_name?: string
					contact_name?: string
					created_at?: string
					created_by_employee_id?: string | null
					credit_limit?: number
					email?: string | null
					id?: string
					payment_history?: Database['public']['Enums']['customer_payment_history']
					phone?: string
					profile_photo_url?: string | null
					status?: Database['public']['Enums']['customer_status']
					tier?: Database['public']['Enums']['customer_tier']
					trade_license_status?: Database['public']['Enums']['trade_license_status']
					updated_at?: string
					user_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'customers_assigned_sales_rep_id_fkey'
						columns: ['assigned_sales_rep_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'customers_assigned_sales_rep_id_fkey'
						columns: ['assigned_sales_rep_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'customers_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'customers_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			deliveries: {
				Row: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				Insert: {
					arrived_at?: string | null
					completed_at?: string | null
					created_at?: string
					delivery_number?: string
					driver_id?: string | null
					id?: string
					loading_task_id?: string | null
					order_id?: string | null
					rejection_proof?: Json | null
					rejection_reason?: string | null
					started_at?: string | null
					status?: Database['public']['Enums']['delivery_status']
					truck_id?: string | null
					updated_at?: string
				}
				Update: {
					arrived_at?: string | null
					completed_at?: string | null
					created_at?: string
					delivery_number?: string
					driver_id?: string | null
					id?: string
					loading_task_id?: string | null
					order_id?: string | null
					rejection_proof?: Json | null
					rejection_reason?: string | null
					started_at?: string | null
					status?: Database['public']['Enums']['delivery_status']
					truck_id?: string | null
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'deliveries_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'ceo_driver_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'deliveries_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'drivers'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'deliveries_loading_task_id_fkey'
						columns: ['loading_task_id']
						isOneToOne: false
						referencedRelation: 'ceo_warehouse_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'deliveries_loading_task_id_fkey'
						columns: ['loading_task_id']
						isOneToOne: false
						referencedRelation: 'loading_tasks'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'deliveries_order_id_fkey'
						columns: ['order_id']
						isOneToOne: false
						referencedRelation: 'ceo_order_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'deliveries_order_id_fkey'
						columns: ['order_id']
						isOneToOne: false
						referencedRelation: 'orders'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'deliveries_truck_id_fkey'
						columns: ['truck_id']
						isOneToOne: false
						referencedRelation: 'trucks'
						referencedColumns: ['id']
					},
				]
			}
			delivery_proofs: {
				Row: {
					created_at: string
					delivery_id: string
					driver_id: string | null
					id: string
					location: Json
					proof_path: string | null
					proof_type: Database['public']['Enums']['delivery_proof_type']
					signer_name: string | null
				}
				Insert: {
					created_at?: string
					delivery_id: string
					driver_id?: string | null
					id?: string
					location?: Json
					proof_path?: string | null
					proof_type: Database['public']['Enums']['delivery_proof_type']
					signer_name?: string | null
				}
				Update: {
					created_at?: string
					delivery_id?: string
					driver_id?: string | null
					id?: string
					location?: Json
					proof_path?: string | null
					proof_type?: Database['public']['Enums']['delivery_proof_type']
					signer_name?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'delivery_proofs_delivery_id_fkey'
						columns: ['delivery_id']
						isOneToOne: false
						referencedRelation: 'ceo_dispatch_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'delivery_proofs_delivery_id_fkey'
						columns: ['delivery_id']
						isOneToOne: false
						referencedRelation: 'deliveries'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'delivery_proofs_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'ceo_driver_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'delivery_proofs_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'drivers'
						referencedColumns: ['id']
					},
				]
			}
			document_downloads: {
				Row: {
					document_id: string
					downloaded_at: string
					id: string
					user_id: string | null
				}
				Insert: {
					document_id: string
					downloaded_at?: string
					id?: string
					user_id?: string | null
				}
				Update: {
					document_id?: string
					downloaded_at?: string
					id?: string
					user_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'document_downloads_document_id_fkey'
						columns: ['document_id']
						isOneToOne: false
						referencedRelation: 'documents'
						referencedColumns: ['id']
					},
				]
			}
			documents: {
				Row: {
					created_at: string
					customer_id: string | null
					download_url: string | null
					file_size: string | null
					id: string
					reference: string
					related_order_ref: string | null
					storage_path: string | null
					title: string
					type: Database['public']['Enums']['document_type']
					updated_at: string
				}
				Insert: {
					created_at?: string
					customer_id?: string | null
					download_url?: string | null
					file_size?: string | null
					id?: string
					reference: string
					related_order_ref?: string | null
					storage_path?: string | null
					title: string
					type: Database['public']['Enums']['document_type']
					updated_at?: string
				}
				Update: {
					created_at?: string
					customer_id?: string | null
					download_url?: string | null
					file_size?: string | null
					id?: string
					reference?: string
					related_order_ref?: string | null
					storage_path?: string | null
					title?: string
					type?: Database['public']['Enums']['document_type']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'documents_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'documents_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			driver_app_sessions: {
				Row: {
					claimed_at: string
					driver_id: string
					last_seen_at: string
					session_id: string
					source: string
					user_id: string
				}
				Insert: {
					claimed_at?: string
					driver_id: string
					last_seen_at?: string
					session_id: string
					source?: string
					user_id: string
				}
				Update: {
					claimed_at?: string
					driver_id?: string
					last_seen_at?: string
					session_id?: string
					source?: string
					user_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'driver_app_sessions_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: true
						referencedRelation: 'ceo_driver_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'driver_app_sessions_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: true
						referencedRelation: 'drivers'
						referencedColumns: ['id']
					},
				]
			}
			driver_location_place_cache: {
				Row: {
					expires_at: string
					latitude_key: number
					longitude_key: number
					place_name: string
					provider: string
					resolved_at: string
				}
				Insert: {
					expires_at?: string
					latitude_key: number
					longitude_key: number
					place_name: string
					provider?: string
					resolved_at?: string
				}
				Update: {
					expires_at?: string
					latitude_key?: number
					longitude_key?: number
					place_name?: string
					provider?: string
					resolved_at?: string
				}
				Relationships: []
			}
			driver_locations: {
				Row: {
					accuracy_meters: number | null
					delivery_id: string | null
					driver_id: string
					heading: number | null
					id: string
					latitude: number
					longitude: number
					recorded_at: string
					source: Database['public']['Enums']['driver_location_source']
					speed_kmh: number | null
				}
				Insert: {
					accuracy_meters?: number | null
					delivery_id?: string | null
					driver_id: string
					heading?: number | null
					id?: string
					latitude: number
					longitude: number
					recorded_at?: string
					source?: Database['public']['Enums']['driver_location_source']
					speed_kmh?: number | null
				}
				Update: {
					accuracy_meters?: number | null
					delivery_id?: string | null
					driver_id?: string
					heading?: number | null
					id?: string
					latitude?: number
					longitude?: number
					recorded_at?: string
					source?: Database['public']['Enums']['driver_location_source']
					speed_kmh?: number | null
				}
				Relationships: [
					{
						foreignKeyName: 'driver_locations_delivery_id_fkey'
						columns: ['delivery_id']
						isOneToOne: false
						referencedRelation: 'ceo_dispatch_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'driver_locations_delivery_id_fkey'
						columns: ['delivery_id']
						isOneToOne: false
						referencedRelation: 'deliveries'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'driver_locations_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'ceo_driver_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'driver_locations_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'drivers'
						referencedColumns: ['id']
					},
				]
			}
			driver_online_states: {
				Row: {
					driver_id: string
					last_seen_at: string
					status: Database['public']['Enums']['driver_online_status']
					updated_at: string
				}
				Insert: {
					driver_id: string
					last_seen_at?: string
					status?: Database['public']['Enums']['driver_online_status']
					updated_at?: string
				}
				Update: {
					driver_id?: string
					last_seen_at?: string
					status?: Database['public']['Enums']['driver_online_status']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'driver_online_states_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: true
						referencedRelation: 'ceo_driver_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'driver_online_states_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: true
						referencedRelation: 'drivers'
						referencedColumns: ['id']
					},
				]
			}
			driver_team_messages: {
				Row: {
					author_driver_id: string
					body: string
					created_at: string
					id: string
				}
				Insert: {
					author_driver_id: string
					body: string
					created_at?: string
					id?: string
				}
				Update: {
					author_driver_id?: string
					body?: string
					created_at?: string
					id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'driver_team_messages_author_driver_id_fkey'
						columns: ['author_driver_id']
						isOneToOne: false
						referencedRelation: 'ceo_driver_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'driver_team_messages_author_driver_id_fkey'
						columns: ['author_driver_id']
						isOneToOne: false
						referencedRelation: 'drivers'
						referencedColumns: ['id']
					},
				]
			}
			drivers: {
				Row: {
					created_at: string
					email: string | null
					full_name: string
					id: string
					phone: string
					status: Database['public']['Enums']['driver_status']
					updated_at: string
					user_id: string | null
					vehicle_label: string | null
				}
				Insert: {
					created_at?: string
					email?: string | null
					full_name: string
					id?: string
					phone: string
					status?: Database['public']['Enums']['driver_status']
					updated_at?: string
					user_id?: string | null
					vehicle_label?: string | null
				}
				Update: {
					created_at?: string
					email?: string | null
					full_name?: string
					id?: string
					phone?: string
					status?: Database['public']['Enums']['driver_status']
					updated_at?: string
					user_id?: string | null
					vehicle_label?: string | null
				}
				Relationships: []
			}
			employee_compensation: {
				Row: {
					base_salary: number | null
					created_at: string
					department: string | null
					employee_id: string
					hire_date: string | null
					salary_currency: string
					social_insurance_salary: number | null
					title: string | null
					updated_at: string
					updated_by_employee_id: string | null
				}
				Insert: {
					base_salary?: number | null
					created_at?: string
					department?: string | null
					employee_id: string
					hire_date?: string | null
					salary_currency?: string
					social_insurance_salary?: number | null
					title?: string | null
					updated_at?: string
					updated_by_employee_id?: string | null
				}
				Update: {
					base_salary?: number | null
					created_at?: string
					department?: string | null
					employee_id?: string
					hire_date?: string | null
					salary_currency?: string
					social_insurance_salary?: number | null
					title?: string | null
					updated_at?: string
					updated_by_employee_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'employee_compensation_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: true
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'employee_compensation_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: true
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'employee_compensation_updated_by_employee_id_fkey'
						columns: ['updated_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'employee_compensation_updated_by_employee_id_fkey'
						columns: ['updated_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			employee_panel_permissions: {
				Row: {
					can_read: boolean
					can_write: boolean
					created_at: string
					employee_id: string
					id: string
					panel: Database['public']['Enums']['employee_panel']
				}
				Insert: {
					can_read?: boolean
					can_write?: boolean
					created_at?: string
					employee_id: string
					id?: string
					panel: Database['public']['Enums']['employee_panel']
				}
				Update: {
					can_read?: boolean
					can_write?: boolean
					created_at?: string
					employee_id?: string
					id?: string
					panel?: Database['public']['Enums']['employee_panel']
				}
				Relationships: [
					{
						foreignKeyName: 'employee_panel_permissions_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'employee_panel_permissions_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			employee_payroll_payments: {
				Row: {
					amount: number
					created_at: string
					created_by_employee_id: string | null
					currency: string
					employee_id: string
					id: string
					journal_entry_id: string | null
					payment_date: string
					payment_type: Database['public']['Enums']['finance_payroll_payment_type']
					period_month: string
					proof_document_id: string | null
					proof_path: string | null
					reason: string | null
					status: Database['public']['Enums']['finance_payroll_payment_status']
					updated_at: string
				}
				Insert: {
					amount: number
					created_at?: string
					created_by_employee_id?: string | null
					currency?: string
					employee_id: string
					id?: string
					journal_entry_id?: string | null
					payment_date?: string
					payment_type: Database['public']['Enums']['finance_payroll_payment_type']
					period_month: string
					proof_document_id?: string | null
					proof_path?: string | null
					reason?: string | null
					status?: Database['public']['Enums']['finance_payroll_payment_status']
					updated_at?: string
				}
				Update: {
					amount?: number
					created_at?: string
					created_by_employee_id?: string | null
					currency?: string
					employee_id?: string
					id?: string
					journal_entry_id?: string | null
					payment_date?: string
					payment_type?: Database['public']['Enums']['finance_payroll_payment_type']
					period_month?: string
					proof_document_id?: string | null
					proof_path?: string | null
					reason?: string | null
					status?: Database['public']['Enums']['finance_payroll_payment_status']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'employee_payroll_payments_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'employee_payroll_payments_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'employee_payroll_payments_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'employee_payroll_payments_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'employee_payroll_payments_journal_entry_id_fkey'
						columns: ['journal_entry_id']
						isOneToOne: true
						referencedRelation: 'finance_journal_entries'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'employee_payroll_payments_proof_document_id_fkey'
						columns: ['proof_document_id']
						isOneToOne: false
						referencedRelation: 'proof_documents'
						referencedColumns: ['id']
					},
				]
			}
			employee_presence: {
				Row: {
					active_panel: Database['public']['Enums']['employee_panel'] | null
					employee_id: string
					last_seen_at: string
					status: Database['public']['Enums']['employee_presence_status']
					updated_at: string
				}
				Insert: {
					active_panel?: Database['public']['Enums']['employee_panel'] | null
					employee_id: string
					last_seen_at?: string
					status?: Database['public']['Enums']['employee_presence_status']
					updated_at?: string
				}
				Update: {
					active_panel?: Database['public']['Enums']['employee_panel'] | null
					employee_id?: string
					last_seen_at?: string
					status?: Database['public']['Enums']['employee_presence_status']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'employee_presence_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: true
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'employee_presence_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: true
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			employee_roles: {
				Row: {
					created_at: string
					employee_id: string
					id: string
					role: Database['public']['Enums']['employee_role']
				}
				Insert: {
					created_at?: string
					employee_id: string
					id?: string
					role: Database['public']['Enums']['employee_role']
				}
				Update: {
					created_at?: string
					employee_id?: string
					id?: string
					role?: Database['public']['Enums']['employee_role']
				}
				Relationships: [
					{
						foreignKeyName: 'employee_roles_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'employee_roles_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			employees: {
				Row: {
					created_at: string
					email: string
					full_name: string
					id: string
					is_ceo: boolean
					phone: string | null
					status: Database['public']['Enums']['profile_status']
					updated_at: string
					user_id: string | null
				}
				Insert: {
					created_at?: string
					email: string
					full_name: string
					id?: string
					is_ceo?: boolean
					phone?: string | null
					status?: Database['public']['Enums']['profile_status']
					updated_at?: string
					user_id?: string | null
				}
				Update: {
					created_at?: string
					email?: string
					full_name?: string
					id?: string
					is_ceo?: boolean
					phone?: string | null
					status?: Database['public']['Enums']['profile_status']
					updated_at?: string
					user_id?: string | null
				}
				Relationships: []
			}
			finance_accounts: {
				Row: {
					account_class: Database['public']['Enums']['finance_account_class']
					code: string
					created_at: string
					id: string
					is_active: boolean
					is_system: boolean
					name: string
					normal_balance: Database['public']['Enums']['finance_normal_balance']
					parent_account_id: string | null
					updated_at: string
				}
				Insert: {
					account_class: Database['public']['Enums']['finance_account_class']
					code: string
					created_at?: string
					id?: string
					is_active?: boolean
					is_system?: boolean
					name: string
					normal_balance: Database['public']['Enums']['finance_normal_balance']
					parent_account_id?: string | null
					updated_at?: string
				}
				Update: {
					account_class?: Database['public']['Enums']['finance_account_class']
					code?: string
					created_at?: string
					id?: string
					is_active?: boolean
					is_system?: boolean
					name?: string
					normal_balance?: Database['public']['Enums']['finance_normal_balance']
					parent_account_id?: string | null
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'finance_accounts_parent_account_id_fkey'
						columns: ['parent_account_id']
						isOneToOne: false
						referencedRelation: 'finance_accounts'
						referencedColumns: ['id']
					},
				]
			}
			finance_adjustments: {
				Row: {
					adjustment_type: Database['public']['Enums']['finance_adjustment_type']
					amount: number
					category: string
					counterparty_id: string | null
					counterparty_type: string | null
					created_at: string
					created_by_employee_id: string | null
					currency: string
					description: string
					id: string
					journal_entry_id: string | null
					posted_at: string | null
					posted_by_employee_id: string | null
					proof_document_id: string | null
					proof_path: string | null
					status: Database['public']['Enums']['finance_adjustment_status']
					updated_at: string
					void_reason: string | null
					voided_at: string | null
					voided_by_employee_id: string | null
				}
				Insert: {
					adjustment_type: Database['public']['Enums']['finance_adjustment_type']
					amount: number
					category: string
					counterparty_id?: string | null
					counterparty_type?: string | null
					created_at?: string
					created_by_employee_id?: string | null
					currency?: string
					description: string
					id?: string
					journal_entry_id?: string | null
					posted_at?: string | null
					posted_by_employee_id?: string | null
					proof_document_id?: string | null
					proof_path?: string | null
					status?: Database['public']['Enums']['finance_adjustment_status']
					updated_at?: string
					void_reason?: string | null
					voided_at?: string | null
					voided_by_employee_id?: string | null
				}
				Update: {
					adjustment_type?: Database['public']['Enums']['finance_adjustment_type']
					amount?: number
					category?: string
					counterparty_id?: string | null
					counterparty_type?: string | null
					created_at?: string
					created_by_employee_id?: string | null
					currency?: string
					description?: string
					id?: string
					journal_entry_id?: string | null
					posted_at?: string | null
					posted_by_employee_id?: string | null
					proof_document_id?: string | null
					proof_path?: string | null
					status?: Database['public']['Enums']['finance_adjustment_status']
					updated_at?: string
					void_reason?: string | null
					voided_at?: string | null
					voided_by_employee_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'finance_adjustments_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_adjustments_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_adjustments_journal_entry_id_fkey'
						columns: ['journal_entry_id']
						isOneToOne: true
						referencedRelation: 'finance_journal_entries'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_adjustments_posted_by_employee_id_fkey'
						columns: ['posted_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_adjustments_posted_by_employee_id_fkey'
						columns: ['posted_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_adjustments_proof_document_id_fkey'
						columns: ['proof_document_id']
						isOneToOne: false
						referencedRelation: 'proof_documents'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_adjustments_voided_by_employee_id_fkey'
						columns: ['voided_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_adjustments_voided_by_employee_id_fkey'
						columns: ['voided_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			finance_journal_entries: {
				Row: {
					accounting_date: string
					accounting_period: string
					actor_employee_id: string | null
					created_at: string
					description: string
					entry_number: string
					id: string
					posted_at: string | null
					posted_by_employee_id: string | null
					requires_accountant_signoff: boolean
					reversal_entry_id: string | null
					reversed_at: string | null
					reversed_by_employee_id: string | null
					reversed_from_entry_id: string | null
					signoff_reason: string | null
					source_id: string | null
					source_type:
						| Database['public']['Enums']['finance_journal_source_type']
						| null
					status: Database['public']['Enums']['finance_journal_status']
					updated_at: string
					void_reason: string | null
					voided_at: string | null
					voided_by_employee_id: string | null
				}
				Insert: {
					accounting_date?: string
					accounting_period?: string
					actor_employee_id?: string | null
					created_at?: string
					description: string
					entry_number?: string
					id?: string
					posted_at?: string | null
					posted_by_employee_id?: string | null
					requires_accountant_signoff?: boolean
					reversal_entry_id?: string | null
					reversed_at?: string | null
					reversed_by_employee_id?: string | null
					reversed_from_entry_id?: string | null
					signoff_reason?: string | null
					source_id?: string | null
					source_type?:
						| Database['public']['Enums']['finance_journal_source_type']
						| null
					status?: Database['public']['Enums']['finance_journal_status']
					updated_at?: string
					void_reason?: string | null
					voided_at?: string | null
					voided_by_employee_id?: string | null
				}
				Update: {
					accounting_date?: string
					accounting_period?: string
					actor_employee_id?: string | null
					created_at?: string
					description?: string
					entry_number?: string
					id?: string
					posted_at?: string | null
					posted_by_employee_id?: string | null
					requires_accountant_signoff?: boolean
					reversal_entry_id?: string | null
					reversed_at?: string | null
					reversed_by_employee_id?: string | null
					reversed_from_entry_id?: string | null
					signoff_reason?: string | null
					source_id?: string | null
					source_type?:
						| Database['public']['Enums']['finance_journal_source_type']
						| null
					status?: Database['public']['Enums']['finance_journal_status']
					updated_at?: string
					void_reason?: string | null
					voided_at?: string | null
					voided_by_employee_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'finance_journal_entries_actor_employee_id_fkey'
						columns: ['actor_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_journal_entries_actor_employee_id_fkey'
						columns: ['actor_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_journal_entries_posted_by_employee_id_fkey'
						columns: ['posted_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_journal_entries_posted_by_employee_id_fkey'
						columns: ['posted_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_journal_entries_reversal_entry_id_fkey'
						columns: ['reversal_entry_id']
						isOneToOne: false
						referencedRelation: 'finance_journal_entries'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_journal_entries_reversed_by_employee_id_fkey'
						columns: ['reversed_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_journal_entries_reversed_by_employee_id_fkey'
						columns: ['reversed_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_journal_entries_reversed_from_entry_id_fkey'
						columns: ['reversed_from_entry_id']
						isOneToOne: false
						referencedRelation: 'finance_journal_entries'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_journal_entries_voided_by_employee_id_fkey'
						columns: ['voided_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_journal_entries_voided_by_employee_id_fkey'
						columns: ['voided_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			finance_journal_lines: {
				Row: {
					account_id: string
					counterparty_id: string | null
					counterparty_type: string | null
					created_at: string
					credit: number
					currency: string
					debit: number
					entry_id: string
					id: string
					line_number: number
					memo: string | null
					source_id: string | null
					source_type:
						| Database['public']['Enums']['finance_journal_source_type']
						| null
				}
				Insert: {
					account_id: string
					counterparty_id?: string | null
					counterparty_type?: string | null
					created_at?: string
					credit?: number
					currency?: string
					debit?: number
					entry_id: string
					id?: string
					line_number: number
					memo?: string | null
					source_id?: string | null
					source_type?:
						| Database['public']['Enums']['finance_journal_source_type']
						| null
				}
				Update: {
					account_id?: string
					counterparty_id?: string | null
					counterparty_type?: string | null
					created_at?: string
					credit?: number
					currency?: string
					debit?: number
					entry_id?: string
					id?: string
					line_number?: number
					memo?: string | null
					source_id?: string | null
					source_type?:
						| Database['public']['Enums']['finance_journal_source_type']
						| null
				}
				Relationships: [
					{
						foreignKeyName: 'finance_journal_lines_account_id_fkey'
						columns: ['account_id']
						isOneToOne: false
						referencedRelation: 'finance_accounts'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_journal_lines_entry_id_fkey'
						columns: ['entry_id']
						isOneToOne: false
						referencedRelation: 'finance_journal_entries'
						referencedColumns: ['id']
					},
				]
			}
			finance_journal_proof_links: {
				Row: {
					created_at: string
					entry_id: string
					id: string
					link_role: string
					proof_document_id: string | null
					proof_path: string | null
				}
				Insert: {
					created_at?: string
					entry_id: string
					id?: string
					link_role?: string
					proof_document_id?: string | null
					proof_path?: string | null
				}
				Update: {
					created_at?: string
					entry_id?: string
					id?: string
					link_role?: string
					proof_document_id?: string | null
					proof_path?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'finance_journal_proof_links_entry_id_fkey'
						columns: ['entry_id']
						isOneToOne: false
						referencedRelation: 'finance_journal_entries'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_journal_proof_links_proof_document_id_fkey'
						columns: ['proof_document_id']
						isOneToOne: false
						referencedRelation: 'proof_documents'
						referencedColumns: ['id']
					},
				]
			}
			finance_journal_source_links: {
				Row: {
					created_at: string
					entry_id: string
					id: string
					link_role: string
					source_id: string
					source_label: string | null
					source_type: Database['public']['Enums']['finance_journal_source_type']
				}
				Insert: {
					created_at?: string
					entry_id: string
					id?: string
					link_role?: string
					source_id: string
					source_label?: string | null
					source_type: Database['public']['Enums']['finance_journal_source_type']
				}
				Update: {
					created_at?: string
					entry_id?: string
					id?: string
					link_role?: string
					source_id?: string
					source_label?: string | null
					source_type?: Database['public']['Enums']['finance_journal_source_type']
				}
				Relationships: [
					{
						foreignKeyName: 'finance_journal_source_links_entry_id_fkey'
						columns: ['entry_id']
						isOneToOne: false
						referencedRelation: 'finance_journal_entries'
						referencedColumns: ['id']
					},
				]
			}
			finance_payment_followups: {
				Row: {
					contact_channel: string
					created_at: string
					follow_up_due_at: string
					follow_up_state: string
					id: string
					notes: string
					order_id: string | null
					outcome: string
					recorded_by_employee_id: string | null
					refill_request_id: string | null
					target_type: string
					updated_at: string
				}
				Insert: {
					contact_channel: string
					created_at?: string
					follow_up_due_at: string
					follow_up_state?: string
					id?: string
					notes: string
					order_id?: string | null
					outcome: string
					recorded_by_employee_id?: string | null
					refill_request_id?: string | null
					target_type: string
					updated_at?: string
				}
				Update: {
					contact_channel?: string
					created_at?: string
					follow_up_due_at?: string
					follow_up_state?: string
					id?: string
					notes?: string
					order_id?: string | null
					outcome?: string
					recorded_by_employee_id?: string | null
					refill_request_id?: string | null
					target_type?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'finance_payment_followups_order_id_fkey'
						columns: ['order_id']
						isOneToOne: false
						referencedRelation: 'ceo_order_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_payment_followups_order_id_fkey'
						columns: ['order_id']
						isOneToOne: false
						referencedRelation: 'orders'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_payment_followups_recorded_by_employee_id_fkey'
						columns: ['recorded_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_payment_followups_recorded_by_employee_id_fkey'
						columns: ['recorded_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'finance_payment_followups_refill_request_id_fkey'
						columns: ['refill_request_id']
						isOneToOne: false
						referencedRelation: 'refill_requests'
						referencedColumns: ['id']
					},
				]
			}
			inventory_damage_lots: {
				Row: {
					carrying_total_value: number
					carrying_unit_value: number
					created_at: string
					damage_number: string
					disposed_quantity: number
					id: string
					journal_entry_id: string | null
					original_quantity: number
					original_total_value: number
					original_unit_cost: number
					product_id: string
					proof_document_id: string | null
					proof_path: string | null
					reason: string
					recorded_by_employee_id: string | null
					recovery_unit_value: number
					remaining_quantity: number
					reversed_quantity: number
					sold_quantity: number
					status: Database['public']['Enums']['inventory_damage_lot_status']
					updated_at: string
					write_down_amount: number
				}
				Insert: {
					carrying_total_value: number
					carrying_unit_value: number
					created_at?: string
					damage_number?: string
					disposed_quantity?: number
					id?: string
					journal_entry_id?: string | null
					original_quantity: number
					original_total_value: number
					original_unit_cost: number
					product_id: string
					proof_document_id?: string | null
					proof_path?: string | null
					reason: string
					recorded_by_employee_id?: string | null
					recovery_unit_value: number
					remaining_quantity?: number
					reversed_quantity?: number
					sold_quantity?: number
					status?: Database['public']['Enums']['inventory_damage_lot_status']
					updated_at?: string
					write_down_amount: number
				}
				Update: {
					carrying_total_value?: number
					carrying_unit_value?: number
					created_at?: string
					damage_number?: string
					disposed_quantity?: number
					id?: string
					journal_entry_id?: string | null
					original_quantity?: number
					original_total_value?: number
					original_unit_cost?: number
					product_id?: string
					proof_document_id?: string | null
					proof_path?: string | null
					reason?: string
					recorded_by_employee_id?: string | null
					recovery_unit_value?: number
					remaining_quantity?: number
					reversed_quantity?: number
					sold_quantity?: number
					status?: Database['public']['Enums']['inventory_damage_lot_status']
					updated_at?: string
					write_down_amount?: number
				}
				Relationships: [
					{
						foreignKeyName: 'inventory_damage_lots_journal_entry_id_fkey'
						columns: ['journal_entry_id']
						isOneToOne: true
						referencedRelation: 'finance_journal_entries'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_damage_lots_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'ceo_inventory_summary'
						referencedColumns: ['product_id']
					},
					{
						foreignKeyName: 'inventory_damage_lots_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'products'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_damage_lots_proof_document_id_fkey'
						columns: ['proof_document_id']
						isOneToOne: false
						referencedRelation: 'proof_documents'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_damage_lots_recorded_by_employee_id_fkey'
						columns: ['recorded_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_damage_lots_recorded_by_employee_id_fkey'
						columns: ['recorded_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			inventory_damage_transactions: {
				Row: {
					amount: number
					carrying_amount: number
					counterparty_name: string | null
					created_at: string
					created_by_employee_id: string | null
					id: string
					journal_entry_id: string | null
					lot_id: string
					manager_employee_id: string | null
					payment_status: string | null
					proof_document_id: string | null
					proof_path: string | null
					quantity: number
					reason: string | null
					transaction_type: Database['public']['Enums']['inventory_damage_transaction_type']
					unit_price: number | null
					write_down_reversal_amount: number
				}
				Insert: {
					amount?: number
					carrying_amount?: number
					counterparty_name?: string | null
					created_at?: string
					created_by_employee_id?: string | null
					id?: string
					journal_entry_id?: string | null
					lot_id: string
					manager_employee_id?: string | null
					payment_status?: string | null
					proof_document_id?: string | null
					proof_path?: string | null
					quantity: number
					reason?: string | null
					transaction_type: Database['public']['Enums']['inventory_damage_transaction_type']
					unit_price?: number | null
					write_down_reversal_amount?: number
				}
				Update: {
					amount?: number
					carrying_amount?: number
					counterparty_name?: string | null
					created_at?: string
					created_by_employee_id?: string | null
					id?: string
					journal_entry_id?: string | null
					lot_id?: string
					manager_employee_id?: string | null
					payment_status?: string | null
					proof_document_id?: string | null
					proof_path?: string | null
					quantity?: number
					reason?: string | null
					transaction_type?: Database['public']['Enums']['inventory_damage_transaction_type']
					unit_price?: number | null
					write_down_reversal_amount?: number
				}
				Relationships: [
					{
						foreignKeyName: 'inventory_damage_transactions_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_damage_transactions_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_damage_transactions_journal_entry_id_fkey'
						columns: ['journal_entry_id']
						isOneToOne: true
						referencedRelation: 'finance_journal_entries'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_damage_transactions_lot_id_fkey'
						columns: ['lot_id']
						isOneToOne: false
						referencedRelation: 'inventory_damage_lots'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_damage_transactions_manager_employee_id_fkey'
						columns: ['manager_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_damage_transactions_manager_employee_id_fkey'
						columns: ['manager_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_damage_transactions_proof_document_id_fkey'
						columns: ['proof_document_id']
						isOneToOne: false
						referencedRelation: 'proof_documents'
						referencedColumns: ['id']
					},
				]
			}
			inventory_reservations: {
				Row: {
					created_at: string
					created_by_employee_id: string | null
					id: string
					order_id: string
					product_id: string
					quantity: number
					status: Database['public']['Enums']['inventory_reservation_status']
					updated_at: string
				}
				Insert: {
					created_at?: string
					created_by_employee_id?: string | null
					id?: string
					order_id: string
					product_id: string
					quantity: number
					status?: Database['public']['Enums']['inventory_reservation_status']
					updated_at?: string
				}
				Update: {
					created_at?: string
					created_by_employee_id?: string | null
					id?: string
					order_id?: string
					product_id?: string
					quantity?: number
					status?: Database['public']['Enums']['inventory_reservation_status']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'inventory_reservations_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_reservations_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_reservations_order_id_fkey'
						columns: ['order_id']
						isOneToOne: false
						referencedRelation: 'ceo_order_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_reservations_order_id_fkey'
						columns: ['order_id']
						isOneToOne: false
						referencedRelation: 'orders'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'inventory_reservations_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'ceo_inventory_summary'
						referencedColumns: ['product_id']
					},
					{
						foreignKeyName: 'inventory_reservations_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'products'
						referencedColumns: ['id']
					},
				]
			}
			inventory_stock: {
				Row: {
					available_quantity: number | null
					good_quantity: number
					id: string
					minimum_quantity: number
					on_hand_quantity: number
					product_id: string
					reserved_quantity: number
					updated_at: string
				}
				Insert: {
					available_quantity?: number | null
					good_quantity?: number
					id?: string
					minimum_quantity?: number
					on_hand_quantity?: number
					product_id: string
					reserved_quantity?: number
					updated_at?: string
				}
				Update: {
					available_quantity?: number | null
					good_quantity?: number
					id?: string
					minimum_quantity?: number
					on_hand_quantity?: number
					product_id?: string
					reserved_quantity?: number
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'inventory_stock_product_id_fkey'
						columns: ['product_id']
						isOneToOne: true
						referencedRelation: 'ceo_inventory_summary'
						referencedColumns: ['product_id']
					},
					{
						foreignKeyName: 'inventory_stock_product_id_fkey'
						columns: ['product_id']
						isOneToOne: true
						referencedRelation: 'products'
						referencedColumns: ['id']
					},
				]
			}
			loading_task_drivers: {
				Row: {
					assigned_items: Json
					created_at: string
					driver_id: string
					id: string
					loading_task_id: string
					truck_id: string | null
				}
				Insert: {
					assigned_items?: Json
					created_at?: string
					driver_id: string
					id?: string
					loading_task_id: string
					truck_id?: string | null
				}
				Update: {
					assigned_items?: Json
					created_at?: string
					driver_id?: string
					id?: string
					loading_task_id?: string
					truck_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'loading_task_drivers_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'ceo_driver_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'loading_task_drivers_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'drivers'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'loading_task_drivers_loading_task_id_fkey'
						columns: ['loading_task_id']
						isOneToOne: false
						referencedRelation: 'ceo_warehouse_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'loading_task_drivers_loading_task_id_fkey'
						columns: ['loading_task_id']
						isOneToOne: false
						referencedRelation: 'loading_tasks'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'loading_task_drivers_truck_id_fkey'
						columns: ['truck_id']
						isOneToOne: false
						referencedRelation: 'trucks'
						referencedColumns: ['id']
					},
				]
			}
			loading_tasks: {
				Row: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				Insert: {
					advisor_employee_id?: string | null
					created_at?: string
					id?: string
					order_id: string
					proof?: Json
					rejection_reason?: string | null
					status?: Database['public']['Enums']['loading_task_status']
					updated_at?: string
				}
				Update: {
					advisor_employee_id?: string | null
					created_at?: string
					id?: string
					order_id?: string
					proof?: Json
					rejection_reason?: string | null
					status?: Database['public']['Enums']['loading_task_status']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'loading_tasks_advisor_employee_id_fkey'
						columns: ['advisor_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'loading_tasks_advisor_employee_id_fkey'
						columns: ['advisor_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'loading_tasks_order_id_fkey'
						columns: ['order_id']
						isOneToOne: true
						referencedRelation: 'ceo_order_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'loading_tasks_order_id_fkey'
						columns: ['order_id']
						isOneToOne: true
						referencedRelation: 'orders'
						referencedColumns: ['id']
					},
				]
			}
			notification_preferences: {
				Row: {
					channel: Database['public']['Enums']['notification_channel']
					created_at: string
					customer_id: string | null
					enabled: boolean
					id: string
					updated_at: string
					user_id: string | null
				}
				Insert: {
					channel: Database['public']['Enums']['notification_channel']
					created_at?: string
					customer_id?: string | null
					enabled?: boolean
					id?: string
					updated_at?: string
					user_id?: string | null
				}
				Update: {
					channel?: Database['public']['Enums']['notification_channel']
					created_at?: string
					customer_id?: string | null
					enabled?: boolean
					id?: string
					updated_at?: string
					user_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'notification_preferences_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'notification_preferences_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			notifications: {
				Row: {
					body: string
					created_at: string
					customer_id: string | null
					id: string
					read: boolean
					target_id: string | null
					target_type: string | null
					title: string
					type: string
					user_id: string | null
				}
				Insert: {
					body: string
					created_at?: string
					customer_id?: string | null
					id?: string
					read?: boolean
					target_id?: string | null
					target_type?: string | null
					title: string
					type: string
					user_id?: string | null
				}
				Update: {
					body?: string
					created_at?: string
					customer_id?: string | null
					id?: string
					read?: boolean
					target_id?: string | null
					target_type?: string | null
					title?: string
					type?: string
					user_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'notifications_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'notifications_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			orders: {
				Row: {
					created_at: string
					customer_id: string | null
					delivered_at: string | null
					id: string
					order_number: string
					quote_id: string | null
					quote_request_id: string | null
					reserved_at: string | null
					status: Database['public']['Enums']['order_workflow_status']
					total_amount: number
					updated_at: string
				}
				Insert: {
					created_at?: string
					customer_id?: string | null
					delivered_at?: string | null
					id?: string
					order_number?: string
					quote_id?: string | null
					quote_request_id?: string | null
					reserved_at?: string | null
					status?: Database['public']['Enums']['order_workflow_status']
					total_amount?: number
					updated_at?: string
				}
				Update: {
					created_at?: string
					customer_id?: string | null
					delivered_at?: string | null
					id?: string
					order_number?: string
					quote_id?: string | null
					quote_request_id?: string | null
					reserved_at?: string | null
					status?: Database['public']['Enums']['order_workflow_status']
					total_amount?: number
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'orders_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'orders_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'orders_quote_id_fkey'
						columns: ['quote_id']
						isOneToOne: true
						referencedRelation: 'quotes'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'orders_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: true
						referencedRelation: 'ceo_quote_request_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'orders_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: true
						referencedRelation: 'quote_requests'
						referencedColumns: ['id']
					},
				]
			}
			price_update_requests: {
				Row: {
					assigned_employee_id: string | null
					created_at: string
					id: string
					product_id: string
					quote_request_id: string | null
					quote_request_item_id: string | null
					reason: string
					requested_by_employee_id: string | null
					resolved_at: string | null
					status: Database['public']['Enums']['price_update_request_status']
					updated_at: string
				}
				Insert: {
					assigned_employee_id?: string | null
					created_at?: string
					id?: string
					product_id: string
					quote_request_id?: string | null
					quote_request_item_id?: string | null
					reason: string
					requested_by_employee_id?: string | null
					resolved_at?: string | null
					status?: Database['public']['Enums']['price_update_request_status']
					updated_at?: string
				}
				Update: {
					assigned_employee_id?: string | null
					created_at?: string
					id?: string
					product_id?: string
					quote_request_id?: string | null
					quote_request_item_id?: string | null
					reason?: string
					requested_by_employee_id?: string | null
					resolved_at?: string | null
					status?: Database['public']['Enums']['price_update_request_status']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'price_update_requests_assigned_employee_id_fkey'
						columns: ['assigned_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'price_update_requests_assigned_employee_id_fkey'
						columns: ['assigned_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'price_update_requests_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'ceo_inventory_summary'
						referencedColumns: ['product_id']
					},
					{
						foreignKeyName: 'price_update_requests_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'products'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'price_update_requests_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: false
						referencedRelation: 'ceo_quote_request_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'price_update_requests_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: false
						referencedRelation: 'quote_requests'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'price_update_requests_quote_request_item_id_fkey'
						columns: ['quote_request_item_id']
						isOneToOne: false
						referencedRelation: 'quote_request_items'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'price_update_requests_requested_by_employee_id_fkey'
						columns: ['requested_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'price_update_requests_requested_by_employee_id_fkey'
						columns: ['requested_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			price_updates: {
				Row: {
					created_at: string
					id: string
					new_price: number
					notes: string | null
					old_price: number | null
					product_id: string
					proof_path: string
					supplier_id: string
					updated_by_employee_id: string | null
				}
				Insert: {
					created_at?: string
					id?: string
					new_price: number
					notes?: string | null
					old_price?: number | null
					product_id: string
					proof_path: string
					supplier_id: string
					updated_by_employee_id?: string | null
				}
				Update: {
					created_at?: string
					id?: string
					new_price?: number
					notes?: string | null
					old_price?: number | null
					product_id?: string
					proof_path?: string
					supplier_id?: string
					updated_by_employee_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'price_updates_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'ceo_inventory_summary'
						referencedColumns: ['product_id']
					},
					{
						foreignKeyName: 'price_updates_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'products'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'price_updates_supplier_id_fkey'
						columns: ['supplier_id']
						isOneToOne: false
						referencedRelation: 'ceo_supplier_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'price_updates_supplier_id_fkey'
						columns: ['supplier_id']
						isOneToOne: false
						referencedRelation: 'suppliers'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'price_updates_updated_by_employee_id_fkey'
						columns: ['updated_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'price_updates_updated_by_employee_id_fkey'
						columns: ['updated_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			pricing_rules: {
				Row: {
					absolute_min_margin: number
					active: boolean
					bonus_margin: number
					category_slug: string | null
					created_at: string
					floor_margin: number
					id: string
					product_category: string | null
					product_slug: string | null
					target_margin: number
					updated_at: string
					updated_by_employee_id: string | null
				}
				Insert: {
					absolute_min_margin?: number
					active?: boolean
					bonus_margin?: number
					category_slug?: string | null
					created_at?: string
					floor_margin?: number
					id?: string
					product_category?: string | null
					product_slug?: string | null
					target_margin?: number
					updated_at?: string
					updated_by_employee_id?: string | null
				}
				Update: {
					absolute_min_margin?: number
					active?: boolean
					bonus_margin?: number
					category_slug?: string | null
					created_at?: string
					floor_margin?: number
					id?: string
					product_category?: string | null
					product_slug?: string | null
					target_margin?: number
					updated_at?: string
					updated_by_employee_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'pricing_rules_updated_by_employee_id_fkey'
						columns: ['updated_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'pricing_rules_updated_by_employee_id_fkey'
						columns: ['updated_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			products: {
				Row: {
					availability_status: Database['public']['Enums']['catalog_availability_status']
					brand: string | null
					category: string
					created_at: string
					description: string | null
					description_ar: string | null
					id: string
					image_urls: string[]
					is_active: boolean
					is_stockable: boolean
					manufacturer: string | null
					name: string
					name_ar: string
					price_range_max: number | null
					price_range_min: number | null
					price_tier: Database['public']['Enums']['price_tier'] | null
					search_vector: unknown
					sku: string
					slug: string
					specifications: Json
					specifications_ar: Json
					subcategory: string | null
					subcategory_ar: string
					tags: string[]
					unit_of_measure: string
					unit_of_measure_ar: string
					updated_at: string
					weight_kg: number | null
				}
				Insert: {
					availability_status?: Database['public']['Enums']['catalog_availability_status']
					brand?: string | null
					category: string
					created_at?: string
					description?: string | null
					description_ar?: string | null
					id?: string
					image_urls?: string[]
					is_active?: boolean
					is_stockable?: boolean
					manufacturer?: string | null
					name: string
					name_ar?: string
					price_range_max?: number | null
					price_range_min?: number | null
					price_tier?: Database['public']['Enums']['price_tier'] | null
					search_vector?: unknown
					sku: string
					slug: string
					specifications?: Json
					specifications_ar?: Json
					subcategory?: string | null
					subcategory_ar?: string
					tags?: string[]
					unit_of_measure: string
					unit_of_measure_ar?: string
					updated_at?: string
					weight_kg?: number | null
				}
				Update: {
					availability_status?: Database['public']['Enums']['catalog_availability_status']
					brand?: string | null
					category?: string
					created_at?: string
					description?: string | null
					description_ar?: string | null
					id?: string
					image_urls?: string[]
					is_active?: boolean
					is_stockable?: boolean
					manufacturer?: string | null
					name?: string
					name_ar?: string
					price_range_max?: number | null
					price_range_min?: number | null
					price_tier?: Database['public']['Enums']['price_tier'] | null
					search_vector?: unknown
					sku?: string
					slug?: string
					specifications?: Json
					specifications_ar?: Json
					subcategory?: string | null
					subcategory_ar?: string
					tags?: string[]
					unit_of_measure?: string
					unit_of_measure_ar?: string
					updated_at?: string
					weight_kg?: number | null
				}
				Relationships: []
			}
			profiles: {
				Row: {
					account_type: Database['public']['Enums']['account_type']
					auth_user_id: string
					created_at: string
					display_name: string
					email: string | null
					id: string
					locale: string
					phone: string | null
					status: Database['public']['Enums']['profile_status']
					updated_at: string
				}
				Insert: {
					account_type: Database['public']['Enums']['account_type']
					auth_user_id: string
					created_at?: string
					display_name: string
					email?: string | null
					id?: string
					locale?: string
					phone?: string | null
					status?: Database['public']['Enums']['profile_status']
					updated_at?: string
				}
				Update: {
					account_type?: Database['public']['Enums']['account_type']
					auth_user_id?: string
					created_at?: string
					display_name?: string
					email?: string | null
					id?: string
					locale?: string
					phone?: string | null
					status?: Database['public']['Enums']['profile_status']
					updated_at?: string
				}
				Relationships: []
			}
			projects: {
				Row: {
					archived: boolean
					created_at: string
					customer_id: string
					description: string | null
					id: string
					name: string
					updated_at: string
				}
				Insert: {
					archived?: boolean
					created_at?: string
					customer_id: string
					description?: string | null
					id?: string
					name: string
					updated_at?: string
				}
				Update: {
					archived?: boolean
					created_at?: string
					customer_id?: string
					description?: string | null
					id?: string
					name?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'projects_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'projects_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			proof_documents: {
				Row: {
					bucket_id: string
					created_at: string
					file_name: string
					file_size_bytes: number
					id: string
					mime_type: string
					notes: string | null
					panel: Database['public']['Enums']['employee_panel']
					proof_type: string
					related_entity_id: string | null
					related_entity_type: string | null
					storage_path: string
					title: string | null
					uploaded_by_employee_id: string | null
					uploaded_by_user_id: string | null
				}
				Insert: {
					bucket_id?: string
					created_at?: string
					file_name: string
					file_size_bytes: number
					id?: string
					mime_type: string
					notes?: string | null
					panel: Database['public']['Enums']['employee_panel']
					proof_type: string
					related_entity_id?: string | null
					related_entity_type?: string | null
					storage_path: string
					title?: string | null
					uploaded_by_employee_id?: string | null
					uploaded_by_user_id?: string | null
				}
				Update: {
					bucket_id?: string
					created_at?: string
					file_name?: string
					file_size_bytes?: number
					id?: string
					mime_type?: string
					notes?: string | null
					panel?: Database['public']['Enums']['employee_panel']
					proof_type?: string
					related_entity_id?: string | null
					related_entity_type?: string | null
					storage_path?: string
					title?: string | null
					uploaded_by_employee_id?: string | null
					uploaded_by_user_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'proof_documents_uploaded_by_employee_id_fkey'
						columns: ['uploaded_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'proof_documents_uploaded_by_employee_id_fkey'
						columns: ['uploaded_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			quote_counter_offers: {
				Row: {
					counter_type: Database['public']['Enums']['quote_counter_type']
					created_at: string
					id: string
					line_items: Json | null
					notes: string | null
					quote_id: string
					self_pickup: boolean
					total_discount: number | null
				}
				Insert: {
					counter_type: Database['public']['Enums']['quote_counter_type']
					created_at?: string
					id?: string
					line_items?: Json | null
					notes?: string | null
					quote_id: string
					self_pickup?: boolean
					total_discount?: number | null
				}
				Update: {
					counter_type?: Database['public']['Enums']['quote_counter_type']
					created_at?: string
					id?: string
					line_items?: Json | null
					notes?: string | null
					quote_id?: string
					self_pickup?: boolean
					total_discount?: number | null
				}
				Relationships: [
					{
						foreignKeyName: 'quote_counter_offers_quote_id_fkey'
						columns: ['quote_id']
						isOneToOne: false
						referencedRelation: 'quotes'
						referencedColumns: ['id']
					},
				]
			}
			quote_items: {
				Row: {
					created_at: string
					customer_counter_price: number | null
					id: string
					is_accepted: boolean
					line_status: Database['public']['Enums']['quote_item_line_status']
					line_total: number
					margin_percent: number | null
					product_id: string | null
					product_name: string
					product_name_ar: string
					quantity: number
					quote_id: string
					quote_version_id: string | null
					reject_reason: string | null
					sort_order: number
					unit_of_measure: string
					unit_of_measure_ar: string
					unit_price: number
					updated_at: string
				}
				Insert: {
					created_at?: string
					customer_counter_price?: number | null
					id?: string
					is_accepted?: boolean
					line_status?: Database['public']['Enums']['quote_item_line_status']
					line_total: number
					margin_percent?: number | null
					product_id?: string | null
					product_name: string
					product_name_ar?: string
					quantity: number
					quote_id: string
					quote_version_id?: string | null
					reject_reason?: string | null
					sort_order?: number
					unit_of_measure: string
					unit_of_measure_ar?: string
					unit_price: number
					updated_at?: string
				}
				Update: {
					created_at?: string
					customer_counter_price?: number | null
					id?: string
					is_accepted?: boolean
					line_status?: Database['public']['Enums']['quote_item_line_status']
					line_total?: number
					margin_percent?: number | null
					product_id?: string | null
					product_name?: string
					product_name_ar?: string
					quantity?: number
					quote_id?: string
					quote_version_id?: string | null
					reject_reason?: string | null
					sort_order?: number
					unit_of_measure?: string
					unit_of_measure_ar?: string
					unit_price?: number
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'quote_items_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'ceo_inventory_summary'
						referencedColumns: ['product_id']
					},
					{
						foreignKeyName: 'quote_items_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'products'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quote_items_quote_id_fkey'
						columns: ['quote_id']
						isOneToOne: false
						referencedRelation: 'quotes'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quote_items_quote_version_id_fkey'
						columns: ['quote_version_id']
						isOneToOne: false
						referencedRelation: 'quote_versions'
						referencedColumns: ['id']
					},
				]
			}
			quote_request_items: {
				Row: {
					created_at: string
					currency: string
					customer_description: string
					id: string
					is_unmatched: boolean
					match_confidence: number | null
					notes: string | null
					price_range_max: number | null
					price_range_min: number | null
					product_id: string | null
					product_name_ar: string
					quantity: number
					quote_request_id: string
					sort_order: number
					unit_of_measure: string
					unit_of_measure_ar: string
				}
				Insert: {
					created_at?: string
					currency?: string
					customer_description: string
					id?: string
					is_unmatched?: boolean
					match_confidence?: number | null
					notes?: string | null
					price_range_max?: number | null
					price_range_min?: number | null
					product_id?: string | null
					product_name_ar?: string
					quantity: number
					quote_request_id: string
					sort_order?: number
					unit_of_measure: string
					unit_of_measure_ar?: string
				}
				Update: {
					created_at?: string
					currency?: string
					customer_description?: string
					id?: string
					is_unmatched?: boolean
					match_confidence?: number | null
					notes?: string | null
					price_range_max?: number | null
					price_range_min?: number | null
					product_id?: string | null
					product_name_ar?: string
					quantity?: number
					quote_request_id?: string
					sort_order?: number
					unit_of_measure?: string
					unit_of_measure_ar?: string
				}
				Relationships: [
					{
						foreignKeyName: 'quote_request_items_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'ceo_inventory_summary'
						referencedColumns: ['product_id']
					},
					{
						foreignKeyName: 'quote_request_items_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'products'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quote_request_items_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: false
						referencedRelation: 'ceo_quote_request_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quote_request_items_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: false
						referencedRelation: 'quote_requests'
						referencedColumns: ['id']
					},
				]
			}
			quote_requests: {
				Row: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				Insert: {
					approval_required?: boolean
					assigned_at?: string | null
					assigned_employee_id?: string | null
					attachment_urls?: string[]
					created_at?: string
					customer_id?: string | null
					delivery_address_id?: string | null
					delivery_date?: string | null
					draft_name?: string | null
					eligible_at?: string
					id?: string
					idempotency_key?: string | null
					notes?: string | null
					project_id?: string | null
					rejected_proof?: Json | null
					rejected_reason?: string | null
					request_number?: string
					status?: Database['public']['Enums']['quote_request_status']
					submitted_at?: string | null
					submitted_by?: string | null
					updated_at?: string
					urgency?: Database['public']['Enums']['quote_request_urgency']
				}
				Update: {
					approval_required?: boolean
					assigned_at?: string | null
					assigned_employee_id?: string | null
					attachment_urls?: string[]
					created_at?: string
					customer_id?: string | null
					delivery_address_id?: string | null
					delivery_date?: string | null
					draft_name?: string | null
					eligible_at?: string
					id?: string
					idempotency_key?: string | null
					notes?: string | null
					project_id?: string | null
					rejected_proof?: Json | null
					rejected_reason?: string | null
					request_number?: string
					status?: Database['public']['Enums']['quote_request_status']
					submitted_at?: string | null
					submitted_by?: string | null
					updated_at?: string
					urgency?: Database['public']['Enums']['quote_request_urgency']
				}
				Relationships: [
					{
						foreignKeyName: 'quote_requests_assigned_employee_id_fkey'
						columns: ['assigned_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quote_requests_assigned_employee_id_fkey'
						columns: ['assigned_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quote_requests_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quote_requests_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quote_requests_delivery_address_id_fkey'
						columns: ['delivery_address_id']
						isOneToOne: false
						referencedRelation: 'customer_addresses'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quote_requests_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					},
				]
			}
			quote_versions: {
				Row: {
					created_at: string
					id: string
					notes: string | null
					quote_id: string
					status: Database['public']['Enums']['quote_status']
					subtotal: number
					total: number
					version_number: number
				}
				Insert: {
					created_at?: string
					id?: string
					notes?: string | null
					quote_id: string
					status?: Database['public']['Enums']['quote_status']
					subtotal?: number
					total?: number
					version_number: number
				}
				Update: {
					created_at?: string
					id?: string
					notes?: string | null
					quote_id?: string
					status?: Database['public']['Enums']['quote_status']
					subtotal?: number
					total?: number
					version_number?: number
				}
				Relationships: [
					{
						foreignKeyName: 'quote_versions_quote_id_fkey'
						columns: ['quote_id']
						isOneToOne: false
						referencedRelation: 'quotes'
						referencedColumns: ['id']
					},
				]
			}
			quotes: {
				Row: {
					accepted_at: string | null
					assigned_rep_name: string | null
					assigned_rep_phone: string | null
					created_at: string
					currency: string
					customer_id: string | null
					decline_notes: string | null
					decline_reason: string | null
					declined_at: string | null
					delivery_fee: number
					discount_amount: number
					id: string
					payment_terms: string | null
					previous_version_id: string | null
					project_id: string | null
					quote_number: string
					quote_request_id: string | null
					status: Database['public']['Enums']['quote_status']
					subtotal: number
					tax_amount: number
					total: number
					updated_at: string
					valid_until: string
					validity_days: number
					version_number: number
				}
				Insert: {
					accepted_at?: string | null
					assigned_rep_name?: string | null
					assigned_rep_phone?: string | null
					created_at?: string
					currency?: string
					customer_id?: string | null
					decline_notes?: string | null
					decline_reason?: string | null
					declined_at?: string | null
					delivery_fee?: number
					discount_amount?: number
					id?: string
					payment_terms?: string | null
					previous_version_id?: string | null
					project_id?: string | null
					quote_number?: string
					quote_request_id?: string | null
					status?: Database['public']['Enums']['quote_status']
					subtotal?: number
					tax_amount?: number
					total?: number
					updated_at?: string
					valid_until?: string
					validity_days?: number
					version_number?: number
				}
				Update: {
					accepted_at?: string | null
					assigned_rep_name?: string | null
					assigned_rep_phone?: string | null
					created_at?: string
					currency?: string
					customer_id?: string | null
					decline_notes?: string | null
					decline_reason?: string | null
					declined_at?: string | null
					delivery_fee?: number
					discount_amount?: number
					id?: string
					payment_terms?: string | null
					previous_version_id?: string | null
					project_id?: string | null
					quote_number?: string
					quote_request_id?: string | null
					status?: Database['public']['Enums']['quote_status']
					subtotal?: number
					tax_amount?: number
					total?: number
					updated_at?: string
					valid_until?: string
					validity_days?: number
					version_number?: number
				}
				Relationships: [
					{
						foreignKeyName: 'quotes_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quotes_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quotes_previous_version_id_fkey'
						columns: ['previous_version_id']
						isOneToOne: false
						referencedRelation: 'quotes'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quotes_project_id_fkey'
						columns: ['project_id']
						isOneToOne: false
						referencedRelation: 'projects'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quotes_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: false
						referencedRelation: 'ceo_quote_request_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'quotes_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: false
						referencedRelation: 'quote_requests'
						referencedColumns: ['id']
					},
				]
			}
			receiving_task_items: {
				Row: {
					created_at: string
					id: string
					product_id: string
					received_quantity: number
					receiving_task_id: string
				}
				Insert: {
					created_at?: string
					id?: string
					product_id: string
					received_quantity: number
					receiving_task_id: string
				}
				Update: {
					created_at?: string
					id?: string
					product_id?: string
					received_quantity?: number
					receiving_task_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'receiving_task_items_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'ceo_inventory_summary'
						referencedColumns: ['product_id']
					},
					{
						foreignKeyName: 'receiving_task_items_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'products'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'receiving_task_items_receiving_task_id_fkey'
						columns: ['receiving_task_id']
						isOneToOne: false
						referencedRelation: 'receiving_tasks'
						referencedColumns: ['id']
					},
				]
			}
			receiving_tasks: {
				Row: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					proof: Json
					refill_request_id: string
					rejection_reason: string | null
					status: Database['public']['Enums']['receiving_task_status']
					updated_at: string
				}
				Insert: {
					advisor_employee_id?: string | null
					created_at?: string
					id?: string
					proof?: Json
					refill_request_id: string
					rejection_reason?: string | null
					status?: Database['public']['Enums']['receiving_task_status']
					updated_at?: string
				}
				Update: {
					advisor_employee_id?: string | null
					created_at?: string
					id?: string
					proof?: Json
					refill_request_id?: string
					rejection_reason?: string | null
					status?: Database['public']['Enums']['receiving_task_status']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'receiving_tasks_advisor_employee_id_fkey'
						columns: ['advisor_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'receiving_tasks_advisor_employee_id_fkey'
						columns: ['advisor_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'receiving_tasks_refill_request_id_fkey'
						columns: ['refill_request_id']
						isOneToOne: true
						referencedRelation: 'refill_requests'
						referencedColumns: ['id']
					},
				]
			}
			referrals: {
				Row: {
					created_at: string
					customer_id: string
					id: string
					referral_code: string
					referred_email: string | null
					status: Database['public']['Enums']['referral_status']
					updated_at: string
				}
				Insert: {
					created_at?: string
					customer_id: string
					id?: string
					referral_code: string
					referred_email?: string | null
					status?: Database['public']['Enums']['referral_status']
					updated_at?: string
				}
				Update: {
					created_at?: string
					customer_id?: string
					id?: string
					referral_code?: string
					referred_email?: string | null
					status?: Database['public']['Enums']['referral_status']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'referrals_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'referrals_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			refill_requests: {
				Row: {
					created_at: string
					id: string
					product_id: string
					proof: Json
					quantity: number
					requested_by_employee_id: string | null
					status: Database['public']['Enums']['refill_request_status']
					supplier_id: string
					unit_cost: number
					updated_at: string
				}
				Insert: {
					created_at?: string
					id?: string
					product_id: string
					proof?: Json
					quantity: number
					requested_by_employee_id?: string | null
					status?: Database['public']['Enums']['refill_request_status']
					supplier_id: string
					unit_cost: number
					updated_at?: string
				}
				Update: {
					created_at?: string
					id?: string
					product_id?: string
					proof?: Json
					quantity?: number
					requested_by_employee_id?: string | null
					status?: Database['public']['Enums']['refill_request_status']
					supplier_id?: string
					unit_cost?: number
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'refill_requests_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'ceo_inventory_summary'
						referencedColumns: ['product_id']
					},
					{
						foreignKeyName: 'refill_requests_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'products'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'refill_requests_requested_by_employee_id_fkey'
						columns: ['requested_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'refill_requests_requested_by_employee_id_fkey'
						columns: ['requested_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'refill_requests_supplier_id_fkey'
						columns: ['supplier_id']
						isOneToOne: false
						referencedRelation: 'ceo_supplier_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'refill_requests_supplier_id_fkey'
						columns: ['supplier_id']
						isOneToOne: false
						referencedRelation: 'suppliers'
						referencedColumns: ['id']
					},
				]
			}
			sales_call_notes: {
				Row: {
					created_at: string
					employee_id: string | null
					id: string
					notes: string | null
					outcome: string
					quote_request_id: string
				}
				Insert: {
					created_at?: string
					employee_id?: string | null
					id?: string
					notes?: string | null
					outcome: string
					quote_request_id: string
				}
				Update: {
					created_at?: string
					employee_id?: string | null
					id?: string
					notes?: string | null
					outcome?: string
					quote_request_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'sales_call_notes_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'sales_call_notes_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'sales_call_notes_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: false
						referencedRelation: 'ceo_quote_request_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'sales_call_notes_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: false
						referencedRelation: 'quote_requests'
						referencedColumns: ['id']
					},
				]
			}
			sales_quote_versions: {
				Row: {
					created_at: string
					created_by_employee_id: string | null
					delivery_fee: number
					discount_amount: number
					id: string
					notes: string | null
					quote_request_id: string
					status: Database['public']['Enums']['sales_quote_version_status']
					subtotal: number
					tax_amount: number
					total: number
					version_number: number
				}
				Insert: {
					created_at?: string
					created_by_employee_id?: string | null
					delivery_fee?: number
					discount_amount?: number
					id?: string
					notes?: string | null
					quote_request_id: string
					status?: Database['public']['Enums']['sales_quote_version_status']
					subtotal?: number
					tax_amount?: number
					total?: number
					version_number: number
				}
				Update: {
					created_at?: string
					created_by_employee_id?: string | null
					delivery_fee?: number
					discount_amount?: number
					id?: string
					notes?: string | null
					quote_request_id?: string
					status?: Database['public']['Enums']['sales_quote_version_status']
					subtotal?: number
					tax_amount?: number
					total?: number
					version_number?: number
				}
				Relationships: [
					{
						foreignKeyName: 'sales_quote_versions_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'sales_quote_versions_created_by_employee_id_fkey'
						columns: ['created_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'sales_quote_versions_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: false
						referencedRelation: 'ceo_quote_request_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'sales_quote_versions_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: false
						referencedRelation: 'quote_requests'
						referencedColumns: ['id']
					},
				]
			}
			supplier_payments: {
				Row: {
					amount: number
					created_at: string
					id: string
					payment_fraction: number
					proof_path: string
					recorded_by_employee_id: string | null
					refill_request_id: string
					status: Database['public']['Enums']['payment_record_status']
				}
				Insert: {
					amount: number
					created_at?: string
					id?: string
					payment_fraction: number
					proof_path: string
					recorded_by_employee_id?: string | null
					refill_request_id: string
					status?: Database['public']['Enums']['payment_record_status']
				}
				Update: {
					amount?: number
					created_at?: string
					id?: string
					payment_fraction?: number
					proof_path?: string
					recorded_by_employee_id?: string | null
					refill_request_id?: string
					status?: Database['public']['Enums']['payment_record_status']
				}
				Relationships: [
					{
						foreignKeyName: 'supplier_payments_recorded_by_employee_id_fkey'
						columns: ['recorded_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'supplier_payments_recorded_by_employee_id_fkey'
						columns: ['recorded_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'supplier_payments_refill_request_id_fkey'
						columns: ['refill_request_id']
						isOneToOne: false
						referencedRelation: 'refill_requests'
						referencedColumns: ['id']
					},
				]
			}
			supplier_product_links: {
				Row: {
					created_at: string
					id: string
					is_primary: boolean
					last_quoted_at: string | null
					lead_time_days: number
					min_order_qty: number
					notes: string | null
					product_id: string
					raw_cost: number
					supplier_id: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					id?: string
					is_primary?: boolean
					last_quoted_at?: string | null
					lead_time_days?: number
					min_order_qty?: number
					notes?: string | null
					product_id: string
					raw_cost: number
					supplier_id: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					id?: string
					is_primary?: boolean
					last_quoted_at?: string | null
					lead_time_days?: number
					min_order_qty?: number
					notes?: string | null
					product_id?: string
					raw_cost?: number
					supplier_id?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'supplier_product_links_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'ceo_inventory_summary'
						referencedColumns: ['product_id']
					},
					{
						foreignKeyName: 'supplier_product_links_product_id_fkey'
						columns: ['product_id']
						isOneToOne: false
						referencedRelation: 'products'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'supplier_product_links_supplier_id_fkey'
						columns: ['supplier_id']
						isOneToOne: false
						referencedRelation: 'ceo_supplier_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'supplier_product_links_supplier_id_fkey'
						columns: ['supplier_id']
						isOneToOne: false
						referencedRelation: 'suppliers'
						referencedColumns: ['id']
					},
				]
			}
			supplier_specialties: {
				Row: {
					category_slug: string
					created_at: string
					id: string
					product_slug: string | null
					supplier_id: string
					updated_at: string
				}
				Insert: {
					category_slug: string
					created_at?: string
					id?: string
					product_slug?: string | null
					supplier_id: string
					updated_at?: string
				}
				Update: {
					category_slug?: string
					created_at?: string
					id?: string
					product_slug?: string | null
					supplier_id?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'supplier_specialties_category_slug_fkey'
						columns: ['category_slug']
						isOneToOne: false
						referencedRelation: 'categories'
						referencedColumns: ['slug']
					},
					{
						foreignKeyName: 'supplier_specialties_product_slug_fkey'
						columns: ['product_slug']
						isOneToOne: false
						referencedRelation: 'products'
						referencedColumns: ['slug']
					},
					{
						foreignKeyName: 'supplier_specialties_supplier_id_fkey'
						columns: ['supplier_id']
						isOneToOne: false
						referencedRelation: 'ceo_supplier_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'supplier_specialties_supplier_id_fkey'
						columns: ['supplier_id']
						isOneToOne: false
						referencedRelation: 'suppliers'
						referencedColumns: ['id']
					},
				]
			}
			suppliers: {
				Row: {
					created_at: string
					custom_badges: string[]
					email: string | null
					id: string
					name: string
					notes: string | null
					payment_terms: string
					phone: string | null
					rating: number
					status: Database['public']['Enums']['supplier_status']
					tier: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					custom_badges?: string[]
					email?: string | null
					id?: string
					name: string
					notes?: string | null
					payment_terms?: string
					phone?: string | null
					rating?: number
					status?: Database['public']['Enums']['supplier_status']
					tier?: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					custom_badges?: string[]
					email?: string | null
					id?: string
					name?: string
					notes?: string | null
					payment_terms?: string
					phone?: string | null
					rating?: number
					status?: Database['public']['Enums']['supplier_status']
					tier?: string
					updated_at?: string
				}
				Relationships: []
			}
			support_attachments: {
				Row: {
					content_type: string | null
					created_at: string
					id: string
					message_id: string
					storage_path: string
				}
				Insert: {
					content_type?: string | null
					created_at?: string
					id?: string
					message_id: string
					storage_path: string
				}
				Update: {
					content_type?: string | null
					created_at?: string
					id?: string
					message_id?: string
					storage_path?: string
				}
				Relationships: [
					{
						foreignKeyName: 'support_attachments_message_id_fkey'
						columns: ['message_id']
						isOneToOne: false
						referencedRelation: 'support_messages'
						referencedColumns: ['id']
					},
				]
			}
			support_conversations: {
				Row: {
					assigned_employee_id: string | null
					channel: Database['public']['Enums']['support_channel']
					created_at: string
					customer_id: string | null
					email: string | null
					external_thread_id: string | null
					id: string
					phone: string | null
					status: Database['public']['Enums']['support_conversation_status']
					updated_at: string
				}
				Insert: {
					assigned_employee_id?: string | null
					channel: Database['public']['Enums']['support_channel']
					created_at?: string
					customer_id?: string | null
					email?: string | null
					external_thread_id?: string | null
					id?: string
					phone?: string | null
					status?: Database['public']['Enums']['support_conversation_status']
					updated_at?: string
				}
				Update: {
					assigned_employee_id?: string | null
					channel?: Database['public']['Enums']['support_channel']
					created_at?: string
					customer_id?: string | null
					email?: string | null
					external_thread_id?: string | null
					id?: string
					phone?: string | null
					status?: Database['public']['Enums']['support_conversation_status']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'support_conversations_assigned_employee_id_fkey'
						columns: ['assigned_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'support_conversations_assigned_employee_id_fkey'
						columns: ['assigned_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'support_conversations_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'support_conversations_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			support_email_threads: {
				Row: {
					cc_emails: string[]
					created_at: string
					direction: string
					headers: Json
					id: string
					in_reply_to: string | null
					internet_message_id: string | null
					normalized_subject: string
					provider: string
					provider_email_id: string
					recipient_emails: string[]
					reference_message_ids: string[]
					sender_email: string
					support_message_id: string
					ticket_id: string
				}
				Insert: {
					cc_emails?: string[]
					created_at?: string
					direction: string
					headers?: Json
					id?: string
					in_reply_to?: string | null
					internet_message_id?: string | null
					normalized_subject: string
					provider?: string
					provider_email_id: string
					recipient_emails?: string[]
					reference_message_ids?: string[]
					sender_email: string
					support_message_id: string
					ticket_id: string
				}
				Update: {
					cc_emails?: string[]
					created_at?: string
					direction?: string
					headers?: Json
					id?: string
					in_reply_to?: string | null
					internet_message_id?: string | null
					normalized_subject?: string
					provider?: string
					provider_email_id?: string
					recipient_emails?: string[]
					reference_message_ids?: string[]
					sender_email?: string
					support_message_id?: string
					ticket_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'support_email_threads_support_message_id_fkey'
						columns: ['support_message_id']
						isOneToOne: false
						referencedRelation: 'support_messages'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'support_email_threads_ticket_id_fkey'
						columns: ['ticket_id']
						isOneToOne: false
						referencedRelation: 'support_tickets'
						referencedColumns: ['id']
					},
				]
			}
			support_messages: {
				Row: {
					body: string
					channel: Database['public']['Enums']['support_message_channel']
					conversation_id: string | null
					created_at: string
					external_message_id: string | null
					id: string
					metadata: Json
					provider_error: string | null
					provider_status: string
					sender_type: Database['public']['Enums']['support_sender_type']
					sender_user_id: string | null
					ticket_id: string | null
				}
				Insert: {
					body: string
					channel: Database['public']['Enums']['support_message_channel']
					conversation_id?: string | null
					created_at?: string
					external_message_id?: string | null
					id?: string
					metadata?: Json
					provider_error?: string | null
					provider_status?: string
					sender_type: Database['public']['Enums']['support_sender_type']
					sender_user_id?: string | null
					ticket_id?: string | null
				}
				Update: {
					body?: string
					channel?: Database['public']['Enums']['support_message_channel']
					conversation_id?: string | null
					created_at?: string
					external_message_id?: string | null
					id?: string
					metadata?: Json
					provider_error?: string | null
					provider_status?: string
					sender_type?: Database['public']['Enums']['support_sender_type']
					sender_user_id?: string | null
					ticket_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'support_messages_conversation_id_fkey'
						columns: ['conversation_id']
						isOneToOne: false
						referencedRelation: 'support_conversations'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'support_messages_ticket_id_fkey'
						columns: ['ticket_id']
						isOneToOne: false
						referencedRelation: 'support_tickets'
						referencedColumns: ['id']
					},
				]
			}
			support_tickets: {
				Row: {
					assigned_employee_id: string | null
					created_at: string
					customer_id: string | null
					id: string
					reference: string
					requester_email: string
					requester_name: string | null
					requester_phone: string | null
					source: Database['public']['Enums']['support_ticket_source']
					status: Database['public']['Enums']['support_ticket_status']
					subject: string
					updated_at: string
				}
				Insert: {
					assigned_employee_id?: string | null
					created_at?: string
					customer_id?: string | null
					id?: string
					reference?: string
					requester_email: string
					requester_name?: string | null
					requester_phone?: string | null
					source?: Database['public']['Enums']['support_ticket_source']
					status?: Database['public']['Enums']['support_ticket_status']
					subject: string
					updated_at?: string
				}
				Update: {
					assigned_employee_id?: string | null
					created_at?: string
					customer_id?: string | null
					id?: string
					reference?: string
					requester_email?: string
					requester_name?: string | null
					requester_phone?: string | null
					source?: Database['public']['Enums']['support_ticket_source']
					status?: Database['public']['Enums']['support_ticket_status']
					subject?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'support_tickets_assigned_employee_id_fkey'
						columns: ['assigned_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'support_tickets_assigned_employee_id_fkey'
						columns: ['assigned_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'support_tickets_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'support_tickets_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			team_invites: {
				Row: {
					created_at: string
					customer_id: string
					email: string
					id: string
					role: Database['public']['Enums']['team_member_role']
					status: Database['public']['Enums']['team_invite_status']
					updated_at: string
				}
				Insert: {
					created_at?: string
					customer_id: string
					email: string
					id?: string
					role?: Database['public']['Enums']['team_member_role']
					status?: Database['public']['Enums']['team_invite_status']
					updated_at?: string
				}
				Update: {
					created_at?: string
					customer_id?: string
					email?: string
					id?: string
					role?: Database['public']['Enums']['team_member_role']
					status?: Database['public']['Enums']['team_invite_status']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'team_invites_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'team_invites_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			team_members: {
				Row: {
					created_at: string
					customer_id: string
					id: string
					role: Database['public']['Enums']['team_member_role']
					user_id: string | null
				}
				Insert: {
					created_at?: string
					customer_id: string
					id?: string
					role?: Database['public']['Enums']['team_member_role']
					user_id?: string | null
				}
				Update: {
					created_at?: string
					customer_id?: string
					id?: string
					role?: Database['public']['Enums']['team_member_role']
					user_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'team_members_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'team_members_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			truck_fuel_expenses: {
				Row: {
					amount: number | null
					created_at: string
					currency: string
					delivery_id: string | null
					driver_id: string
					expense_date: string
					finance_note: string | null
					fuel_liters: number | null
					id: string
					journal_entry_id: string | null
					note: string | null
					odometer_km: number | null
					posted_at: string | null
					posted_by_employee_id: string | null
					proof_document_id: string | null
					proof_path: string | null
					receipt_file_name: string
					receipt_image_data_url: string
					receipt_mime_type: string
					receipt_size_bytes: number | null
					status: Database['public']['Enums']['truck_fuel_expense_status']
					submitted_at: string
					truck_id: string
					updated_at: string
				}
				Insert: {
					amount?: number | null
					created_at?: string
					currency?: string
					delivery_id?: string | null
					driver_id: string
					expense_date?: string
					finance_note?: string | null
					fuel_liters?: number | null
					id?: string
					journal_entry_id?: string | null
					note?: string | null
					odometer_km?: number | null
					posted_at?: string | null
					posted_by_employee_id?: string | null
					proof_document_id?: string | null
					proof_path?: string | null
					receipt_file_name?: string
					receipt_image_data_url: string
					receipt_mime_type?: string
					receipt_size_bytes?: number | null
					status?: Database['public']['Enums']['truck_fuel_expense_status']
					submitted_at?: string
					truck_id: string
					updated_at?: string
				}
				Update: {
					amount?: number | null
					created_at?: string
					currency?: string
					delivery_id?: string | null
					driver_id?: string
					expense_date?: string
					finance_note?: string | null
					fuel_liters?: number | null
					id?: string
					journal_entry_id?: string | null
					note?: string | null
					odometer_km?: number | null
					posted_at?: string | null
					posted_by_employee_id?: string | null
					proof_document_id?: string | null
					proof_path?: string | null
					receipt_file_name?: string
					receipt_image_data_url?: string
					receipt_mime_type?: string
					receipt_size_bytes?: number | null
					status?: Database['public']['Enums']['truck_fuel_expense_status']
					submitted_at?: string
					truck_id?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'truck_fuel_expenses_delivery_id_fkey'
						columns: ['delivery_id']
						isOneToOne: false
						referencedRelation: 'ceo_dispatch_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'truck_fuel_expenses_delivery_id_fkey'
						columns: ['delivery_id']
						isOneToOne: false
						referencedRelation: 'deliveries'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'truck_fuel_expenses_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'ceo_driver_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'truck_fuel_expenses_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'drivers'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'truck_fuel_expenses_journal_entry_id_fkey'
						columns: ['journal_entry_id']
						isOneToOne: true
						referencedRelation: 'finance_journal_entries'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'truck_fuel_expenses_posted_by_employee_id_fkey'
						columns: ['posted_by_employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'truck_fuel_expenses_posted_by_employee_id_fkey'
						columns: ['posted_by_employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'truck_fuel_expenses_proof_document_id_fkey'
						columns: ['proof_document_id']
						isOneToOne: false
						referencedRelation: 'proof_documents'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'truck_fuel_expenses_truck_id_fkey'
						columns: ['truck_id']
						isOneToOne: false
						referencedRelation: 'trucks'
						referencedColumns: ['id']
					},
				]
			}
			trucks: {
				Row: {
					body_type: string
					capacity_tons: number | null
					created_at: string
					driver_id: string | null
					id: string
					plate_number: string
					status: Database['public']['Enums']['truck_status']
					updated_at: string
				}
				Insert: {
					body_type?: string
					capacity_tons?: number | null
					created_at?: string
					driver_id?: string | null
					id?: string
					plate_number: string
					status?: Database['public']['Enums']['truck_status']
					updated_at?: string
				}
				Update: {
					body_type?: string
					capacity_tons?: number | null
					created_at?: string
					driver_id?: string | null
					id?: string
					plate_number?: string
					status?: Database['public']['Enums']['truck_status']
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'trucks_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'ceo_driver_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'trucks_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'drivers'
						referencedColumns: ['id']
					},
				]
			}
			user_profiles: {
				Row: {
					created_at: string
					customer_id: string | null
					display_name: string
					driver_id: string | null
					email: string | null
					employee_id: string | null
					id: string
					is_active: boolean
					phone: string | null
					updated_at: string
					user_id: string
					user_type: Database['public']['Enums']['user_profile_type']
				}
				Insert: {
					created_at?: string
					customer_id?: string | null
					display_name: string
					driver_id?: string | null
					email?: string | null
					employee_id?: string | null
					id?: string
					is_active?: boolean
					phone?: string | null
					updated_at?: string
					user_id: string
					user_type: Database['public']['Enums']['user_profile_type']
				}
				Update: {
					created_at?: string
					customer_id?: string | null
					display_name?: string
					driver_id?: string | null
					email?: string | null
					employee_id?: string | null
					id?: string
					is_active?: boolean
					phone?: string | null
					updated_at?: string
					user_id?: string
					user_type?: Database['public']['Enums']['user_profile_type']
				}
				Relationships: [
					{
						foreignKeyName: 'user_profiles_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'ceo_customer_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_profiles_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_profiles_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'ceo_driver_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_profiles_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: false
						referencedRelation: 'drivers'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_profiles_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: false
						referencedRelation: 'ceo_employee_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'user_profiles_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: false
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			user_roles: {
				Row: {
					created_at: string
					id: string
					role: Database['public']['Enums']['user_role']
					user_profile_id: string
				}
				Insert: {
					created_at?: string
					id?: string
					role: Database['public']['Enums']['user_role']
					user_profile_id: string
				}
				Update: {
					created_at?: string
					id?: string
					role?: Database['public']['Enums']['user_role']
					user_profile_id?: string
				}
				Relationships: [
					{
						foreignKeyName: 'user_roles_user_profile_id_fkey'
						columns: ['user_profile_id']
						isOneToOne: false
						referencedRelation: 'user_profiles'
						referencedColumns: ['id']
					},
				]
			}
			user_sessions: {
				Row: {
					created_at: string
					device: string | null
					id: string
					is_current: boolean
					last_active: string
					location: string | null
					user_id: string
				}
				Insert: {
					created_at?: string
					device?: string | null
					id?: string
					is_current?: boolean
					last_active?: string
					location?: string | null
					user_id: string
				}
				Update: {
					created_at?: string
					device?: string | null
					id?: string
					is_current?: boolean
					last_active?: string
					location?: string | null
					user_id?: string
				}
				Relationships: []
			}
		}
		Views: {
			ceo_activity_summary: {
				Row: {
					action: string | null
					created_at: string | null
					details: Json | null
					entity_id: string | null
					entity_type: string | null
					id: string | null
				}
				Relationships: []
			}
			ceo_business_activity_vtable: {
				Row: {
					action: string | null
					action_label: string | null
					actor_label: string | null
					actor_type: string | null
					amount: number | null
					area: string | null
					contact_channel: string | null
					created_at: string | null
					customer_contact: string | null
					customer_email: string | null
					customer_name: string | null
					customer_phone: string | null
					delivery_address: string | null
					delivery_number: string | null
					driver_name: string | null
					driver_phone: string | null
					follow_up_due_at: string | null
					follow_up_state: string | null
					from_status: string | null
					headline: string | null
					id: string | null
					item_summary: string | null
					notes: string | null
					order_number: string | null
					outcome: string | null
					payment_fraction: number | null
					product_category: string | null
					product_name: string | null
					product_sku: string | null
					quote_number: string | null
					reason: string | null
					request_number: string | null
					role: string | null
					row_count: number | null
					scope: string | null
					source: string | null
					source_entity_id: string | null
					source_entity_type: string | null
					supplier_name: string | null
					support_reference: string | null
					support_subject: string | null
					target: string | null
					to_status: string | null
					total_amount: number | null
					truck_plate: string | null
					truck_type: string | null
				}
				Relationships: []
			}
			ceo_customer_summary: {
				Row: {
					company_name: string | null
					contact_name: string | null
					created_at: string | null
					email: string | null
					id: string | null
					phone: string | null
					status: string | null
					trade_license_status: string | null
					updated_at: string | null
				}
				Insert: {
					company_name?: string | null
					contact_name?: string | null
					created_at?: string | null
					email?: string | null
					id?: string | null
					phone?: string | null
					status?: never
					trade_license_status?: never
					updated_at?: string | null
				}
				Update: {
					company_name?: string | null
					contact_name?: string | null
					created_at?: string | null
					email?: string | null
					id?: string | null
					phone?: string | null
					status?: never
					trade_license_status?: never
					updated_at?: string | null
				}
				Relationships: []
			}
			ceo_dispatch_summary: {
				Row: {
					completed_at: string | null
					delivery_number: string | null
					driver_name: string | null
					id: string | null
					order_id: string | null
					order_number: string | null
					plate_number: string | null
					status: string | null
					updated_at: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'deliveries_order_id_fkey'
						columns: ['order_id']
						isOneToOne: false
						referencedRelation: 'ceo_order_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'deliveries_order_id_fkey'
						columns: ['order_id']
						isOneToOne: false
						referencedRelation: 'orders'
						referencedColumns: ['id']
					},
				]
			}
			ceo_driver_summary: {
				Row: {
					driver_status: string | null
					full_name: string | null
					id: string | null
					last_seen_at: string | null
					online_status: string | null
					phone: string | null
					updated_at: string | null
					vehicle_label: string | null
				}
				Relationships: []
			}
			ceo_employee_summary: {
				Row: {
					created_at: string | null
					email: string | null
					full_name: string | null
					id: string | null
					is_ceo: boolean | null
					phone: string | null
					status: string | null
					updated_at: string | null
				}
				Insert: {
					created_at?: string | null
					email?: string | null
					full_name?: string | null
					id?: string | null
					is_ceo?: boolean | null
					phone?: string | null
					status?: never
					updated_at?: string | null
				}
				Update: {
					created_at?: string | null
					email?: string | null
					full_name?: string | null
					id?: string | null
					is_ceo?: boolean | null
					phone?: string | null
					status?: never
					updated_at?: string | null
				}
				Relationships: []
			}
			ceo_finance_summary: {
				Row: {
					amount: number | null
					created_at: string | null
					entity_id: string | null
					id: string | null
					payment_fraction: number | null
					source: string | null
					status: string | null
				}
				Relationships: []
			}
			ceo_inventory_summary: {
				Row: {
					available_quantity: number | null
					category: string | null
					minimum_quantity: number | null
					name: string | null
					on_hand_quantity: number | null
					product_id: string | null
					reserved_quantity: number | null
					updated_at: string | null
				}
				Relationships: []
			}
			ceo_order_summary: {
				Row: {
					company_name: string | null
					created_at: string | null
					delivered_at: string | null
					id: string | null
					order_number: string | null
					status: string | null
					total_amount: number | null
				}
				Relationships: []
			}
			ceo_quote_request_summary: {
				Row: {
					approval_required: boolean | null
					company_name: string | null
					contact_name: string | null
					created_at: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string | null
					id: string | null
					item_count: number | null
					notes: string | null
					request_number: string | null
					status: string | null
					submitted_at: string | null
					updated_at: string | null
					urgency: string | null
				}
				Relationships: []
			}
			ceo_search_activity_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_approval_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_category_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_customer_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_dispatch_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_document_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_driver_location_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_driver_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_employee_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_finance_company_asset_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_finance_damage_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_finance_fuel_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_finance_payroll_payment_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_finance_payroll_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_finance_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_index: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Insert: {
					entity_id?: string | null
					entity_type?: string | null
					metadata?: Json | null
					search_text?: string | null
					sort_at?: string | null
					subtitle?: string | null
					title?: string | null
				}
				Update: {
					entity_id?: string | null
					entity_type?: string | null
					metadata?: Json | null
					search_text?: string | null
					sort_at?: string | null
					subtitle?: string | null
					title?: string | null
				}
				Relationships: []
			}
			ceo_search_inventory_damage_activity_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_inventory_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_order_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_payment_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_pricing_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_quote_request_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_receiving_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_sales_history_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_supplier_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_support_message_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_support_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_search_warehouse_vtable: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					search_text: string | null
					sort_at: string | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
			ceo_supplier_summary: {
				Row: {
					created_at: string | null
					email: string | null
					id: string | null
					name: string | null
					payment_terms: string | null
					phone: string | null
					rating: number | null
					status: string | null
					tier: string | null
					updated_at: string | null
				}
				Insert: {
					created_at?: string | null
					email?: string | null
					id?: string | null
					name?: string | null
					payment_terms?: string | null
					phone?: string | null
					rating?: number | null
					status?: never
					tier?: string | null
					updated_at?: string | null
				}
				Update: {
					created_at?: string | null
					email?: string | null
					id?: string | null
					name?: string | null
					payment_terms?: string | null
					phone?: string | null
					rating?: number | null
					status?: never
					tier?: string | null
					updated_at?: string | null
				}
				Relationships: []
			}
			ceo_support_summary: {
				Row: {
					created_at: string | null
					email: string | null
					id: string | null
					phone: string | null
					reference: string | null
					requester: string | null
					source: string | null
					status: string | null
					subject: string | null
					updated_at: string | null
				}
				Relationships: []
			}
			ceo_warehouse_summary: {
				Row: {
					company_name: string | null
					created_at: string | null
					id: string | null
					loading_status: string | null
					order_number: string | null
					order_status: string | null
					plate_number: string | null
					rejection_reason: string | null
					updated_at: string | null
				}
				Relationships: []
			}
		}
		Functions: {
			admin_assign_employee_role: {
				Args: {
					p_employee_id: string
					p_reason: string
					p_role: Database['public']['Enums']['employee_role']
				}
				Returns: undefined
			}
			admin_disable_driver: {
				Args: { p_driver_id: string; p_reason: string }
				Returns: undefined
			}
			admin_export_data: {
				Args: { p_reason: string; p_scope: string }
				Returns: Json
			}
			admin_record_audit: {
				Args: {
					p_action: Database['public']['Enums']['audit_event_type']
					p_details?: Json
					p_entity_id: string
					p_entity_type: string
					p_reason: string
				}
				Returns: undefined
			}
			admin_remove_employee_role: {
				Args: {
					p_employee_id: string
					p_reason: string
					p_role: Database['public']['Enums']['employee_role']
				}
				Returns: undefined
			}
			assign_support_conversation: {
				Args: { p_conversation_id: string }
				Returns: {
					assigned_employee_id: string | null
					channel: Database['public']['Enums']['support_channel']
					created_at: string
					customer_id: string | null
					email: string | null
					external_thread_id: string | null
					id: string
					phone: string | null
					status: Database['public']['Enums']['support_conversation_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'support_conversations'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			assign_support_ticket: {
				Args: { p_ticket_id: string }
				Returns: {
					assigned_employee_id: string | null
					created_at: string
					customer_id: string | null
					id: string
					reference: string
					requester_email: string
					requester_name: string | null
					requester_phone: string | null
					source: Database['public']['Enums']['support_ticket_source']
					status: Database['public']['Enums']['support_ticket_status']
					subject: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'support_tickets'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			can_access_ceo_search: { Args: never; Returns: boolean }
			can_access_panel: {
				Args: { required_panel: string; write_required?: boolean }
				Returns: boolean
			}
			ceo_activity_action_label: {
				Args: { p_action: Database['public']['Enums']['audit_event_type'] }
				Returns: string
			}
			ceo_activity_area: {
				Args: {
					p_action: Database['public']['Enums']['audit_event_type']
					p_entity_type: string
				}
				Returns: string
			}
			ceo_activity_source_label: {
				Args: {
					p_action: Database['public']['Enums']['audit_event_type']
					p_actor_type: string
					p_source: string
				}
				Returns: string
			}
			ceo_search_date_terms:
				| {
						Args: { p_value: string }
						Returns: {
							error: true
						} & 'Could not choose the best candidate function between: public.ceo_search_date_terms(p_value => date), public.ceo_search_date_terms(p_value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved'
				  }
				| {
						Args: { p_value: string }
						Returns: {
							error: true
						} & 'Could not choose the best candidate function between: public.ceo_search_date_terms(p_value => date), public.ceo_search_date_terms(p_value => timestamptz). Try renaming the parameters or the function itself in the database so function overloading can be resolved'
				  }
			claim_customer_profile: {
				Args: { p_phone: string }
				Returns: {
					assigned_sales_rep_id: string | null
					company_name: string
					contact_name: string
					created_at: string
					created_by_employee_id: string | null
					credit_limit: number
					email: string | null
					id: string
					payment_history: Database['public']['Enums']['customer_payment_history']
					phone: string
					profile_photo_url: string | null
					status: Database['public']['Enums']['customer_status']
					tier: Database['public']['Enums']['customer_tier']
					trade_license_status: Database['public']['Enums']['trade_license_status']
					updated_at: string
					user_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'customers'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			claim_next_sales_order: {
				Args: never
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			create_manual_order: {
				Args: { p_customer_id: string; p_items: Json; p_notes?: string }
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			create_supplier_refill: {
				Args: {
					p_product_id: string
					p_proof?: Json
					p_quantity: number
					p_supplier_id: string
					p_unit_cost: number
				}
				Returns: {
					created_at: string
					id: string
					product_id: string
					proof: Json
					quantity: number
					requested_by_employee_id: string | null
					status: Database['public']['Enums']['refill_request_status']
					supplier_id: string
					unit_cost: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'refill_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			create_support_ticket: {
				Args: {
					p_client_key?: string
					p_message: string
					p_requester_email: string
					p_requester_name?: string
					p_requester_phone?: string
					p_source?: string
					p_subject: string
				}
				Returns: {
					assigned_employee_id: string | null
					created_at: string
					customer_id: string | null
					id: string
					reference: string
					requester_email: string
					requester_name: string | null
					requester_phone: string | null
					source: Database['public']['Enums']['support_ticket_source']
					status: Database['public']['Enums']['support_ticket_status']
					subject: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'support_tickets'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			current_customer_id: { Args: never; Returns: string }
			current_driver_id: { Args: never; Returns: string }
			current_employee_id: { Args: never; Returns: string }
			current_employee_is_online: {
				Args: { required_panel?: string }
				Returns: boolean
			}
			customer_accept_quote: {
				Args: { p_quote_id: string }
				Returns: {
					created_at: string
					customer_id: string | null
					delivered_at: string | null
					id: string
					order_number: string
					quote_id: string | null
					quote_request_id: string | null
					reserved_at: string | null
					status: Database['public']['Enums']['order_workflow_status']
					total_amount: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'orders'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			customer_decline_quote: {
				Args: { p_notes?: string; p_quote_id: string; p_reason?: string }
				Returns: {
					accepted_at: string | null
					assigned_rep_name: string | null
					assigned_rep_phone: string | null
					created_at: string
					currency: string
					customer_id: string | null
					decline_notes: string | null
					decline_reason: string | null
					declined_at: string | null
					delivery_fee: number
					discount_amount: number
					id: string
					payment_terms: string | null
					previous_version_id: string | null
					project_id: string | null
					quote_number: string
					quote_request_id: string | null
					status: Database['public']['Enums']['quote_status']
					subtotal: number
					tax_amount: number
					total: number
					updated_at: string
					valid_until: string
					validity_days: number
					version_number: number
				}
				SetofOptions: {
					from: '*'
					to: 'quotes'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			customer_get_delivery_secret: {
				Args: { p_order_id: string }
				Returns: Json
			}
			customer_order_delivery_tracking: {
				Args: { p_order_id: string }
				Returns: Json
			}
			customer_record_order_saved_as_draft: {
				Args: {
					p_draft_quote_request_id: string
					p_source?: string
					p_source_order_id?: string
					p_source_quote_request_id: string
				}
				Returns: undefined
			}
			customer_record_portal_order_viewed: {
				Args: { p_order_id?: string; p_quote_request_id: string }
				Returns: undefined
			}
			customer_record_quote_request_draft_saved: {
				Args: { p_context?: Json; p_quote_request_id: string; p_source: string }
				Returns: undefined
			}
			customer_request_quote_negotiation: {
				Args: {
					p_counter_type: Database['public']['Enums']['quote_counter_type']
					p_line_items?: Json
					p_notes?: string
					p_quote_id: string
					p_self_pickup?: boolean
					p_total_discount?: number
				}
				Returns: {
					counter_type: Database['public']['Enums']['quote_counter_type']
					created_at: string
					id: string
					line_items: Json | null
					notes: string | null
					quote_id: string
					self_pickup: boolean
					total_discount: number | null
				}
				SetofOptions: {
					from: '*'
					to: 'quote_counter_offers'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			customer_submit_quote_line_response: {
				Args: { p_line_responses: Json; p_quote_id: string }
				Returns: {
					accepted_at: string | null
					assigned_rep_name: string | null
					assigned_rep_phone: string | null
					created_at: string
					currency: string
					customer_id: string | null
					decline_notes: string | null
					decline_reason: string | null
					declined_at: string | null
					delivery_fee: number
					discount_amount: number
					id: string
					payment_terms: string | null
					previous_version_id: string | null
					project_id: string | null
					quote_number: string
					quote_request_id: string | null
					status: Database['public']['Enums']['quote_status']
					subtotal: number
					tax_amount: number
					total: number
					updated_at: string
					valid_until: string
					validity_days: number
					version_number: number
				}
				SetofOptions: {
					from: '*'
					to: 'quotes'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			customer_submit_saved_quote_request:
				| {
						Args: { p_quote_request_id: string }
						Returns: {
							approval_required: boolean
							assigned_at: string | null
							assigned_employee_id: string | null
							attachment_urls: string[]
							created_at: string
							customer_id: string | null
							delivery_address_id: string | null
							delivery_date: string | null
							draft_name: string | null
							eligible_at: string
							id: string
							idempotency_key: string | null
							notes: string | null
							project_id: string | null
							rejected_proof: Json | null
							rejected_reason: string | null
							request_number: string
							status: Database['public']['Enums']['quote_request_status']
							submitted_at: string | null
							submitted_by: string | null
							updated_at: string
							urgency: Database['public']['Enums']['quote_request_urgency']
						}
						SetofOptions: {
							from: '*'
							to: 'quote_requests'
							isOneToOne: true
							isSetofReturn: false
						}
				  }
				| {
						Args: { p_quote_request_id: string; p_source: string }
						Returns: {
							approval_required: boolean
							assigned_at: string | null
							assigned_employee_id: string | null
							attachment_urls: string[]
							created_at: string
							customer_id: string | null
							delivery_address_id: string | null
							delivery_date: string | null
							draft_name: string | null
							eligible_at: string
							id: string
							idempotency_key: string | null
							notes: string | null
							project_id: string | null
							rejected_proof: Json | null
							rejected_reason: string | null
							request_number: string
							status: Database['public']['Enums']['quote_request_status']
							submitted_at: string | null
							submitted_by: string | null
							updated_at: string
							urgency: Database['public']['Enums']['quote_request_urgency']
						}
						SetofOptions: {
							from: '*'
							to: 'quote_requests'
							isOneToOne: true
							isSetofReturn: false
						}
				  }
			dispatch_assign_driver: {
				Args: {
					p_driver_id: string
					p_loading_task_id?: string
					p_order_id: string
					p_truck_id?: string
				}
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			dispatch_complete_delivery: {
				Args: { p_delivery_id: string; p_proof: Json }
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			dispatch_complete_loaded_order: {
				Args: { p_order_id: string; p_proof: Json }
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			dispatch_reject_delivery: {
				Args: { p_delivery_id: string; p_proof: Json; p_reason: string }
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			dispatch_return_loaded_order: {
				Args: { p_order_id: string; p_proof: Json; p_reason: string }
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			driver_accept_delivery: {
				Args: { p_delivery_id: string }
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			driver_app_dashboard: { Args: never; Returns: Json }
			driver_confirm_arrival_secret: {
				Args: { p_code: string; p_delivery_id: string }
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			driver_confirm_arrival_secret_result: {
				Args: { p_code: string; p_delivery_id: string }
				Returns: Json
			}
			driver_confirm_delivery: {
				Args: {
					p_code: string
					p_delivery_id: string
					p_latitude: number
					p_longitude: number
					p_signature_path: string
					p_signer_name: string
				}
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			driver_list_active_drivers: { Args: never; Returns: Json }
			driver_list_team_messages: { Args: { p_limit?: number }; Returns: Json }
			driver_record_arrival: {
				Args: { p_delivery_id: string }
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			driver_reject_delivery: {
				Args: { p_delivery_id: string; p_proof: Json; p_reason: string }
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			driver_reopen_delivery_route: {
				Args: { p_delivery_id: string }
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			driver_send_team_message: { Args: { p_body: string }; Returns: Json }
			driver_set_online: {
				Args: { p_online: boolean }
				Returns: {
					driver_id: string
					last_seen_at: string
					status: Database['public']['Enums']['driver_online_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'driver_online_states'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			driver_start_delivery: {
				Args: { p_delivery_id: string }
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			driver_submit_fuel_receipt: {
				Args: {
					p_amount?: number
					p_delivery_id?: string
					p_expense_date?: string
					p_fuel_liters?: number
					p_note?: string
					p_odometer_km?: number
					p_receipt_file_name?: string
					p_receipt_image_data_url?: string
					p_receipt_mime_type?: string
					p_receipt_size_bytes?: number
					p_truck_id?: string
				}
				Returns: {
					amount: number | null
					created_at: string
					currency: string
					delivery_id: string | null
					driver_id: string
					expense_date: string
					finance_note: string | null
					fuel_liters: number | null
					id: string
					journal_entry_id: string | null
					note: string | null
					odometer_km: number | null
					posted_at: string | null
					posted_by_employee_id: string | null
					proof_document_id: string | null
					proof_path: string | null
					receipt_file_name: string
					receipt_image_data_url: string
					receipt_mime_type: string
					receipt_size_bytes: number | null
					status: Database['public']['Enums']['truck_fuel_expense_status']
					submitted_at: string
					truck_id: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'truck_fuel_expenses'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			driver_update_location: {
				Args: {
					p_accuracy_meters?: number
					p_delivery_id?: string
					p_heading?: number
					p_latitude: number
					p_longitude: number
					p_speed_kmh?: number
				}
				Returns: {
					accuracy_meters: number | null
					delivery_id: string | null
					driver_id: string
					heading: number | null
					id: string
					latitude: number
					longitude: number
					recorded_at: string
					source: Database['public']['Enums']['driver_location_source']
					speed_kmh: number | null
				}
				SetofOptions: {
					from: '*'
					to: 'driver_locations'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			finance_accounting_dashboard: {
				Args: { p_period_end?: string; p_period_start?: string }
				Returns: Json
			}
			finance_accounting_dashboard_without_damage: {
				Args: { p_period_end?: string; p_period_start?: string }
				Returns: Json
			}
			finance_accounting_dashboard_without_operating_finance: {
				Args: { p_period_end?: string; p_period_start?: string }
				Returns: Json
			}
			finance_backfill_accounting_sources: { Args: never; Returns: Json }
			finance_cancel_customer_order: {
				Args: { p_order_id: string; p_proof?: Json; p_reason: string }
				Returns: {
					created_at: string
					customer_id: string | null
					delivered_at: string | null
					id: string
					order_number: string
					quote_id: string | null
					quote_request_id: string | null
					reserved_at: string | null
					status: Database['public']['Enums']['order_workflow_status']
					total_amount: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'orders'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			finance_cancel_supplier_refill: {
				Args: { p_proof?: Json; p_reason: string; p_refill_request_id: string }
				Returns: {
					created_at: string
					id: string
					product_id: string
					proof: Json
					quantity: number
					requested_by_employee_id: string | null
					status: Database['public']['Enums']['refill_request_status']
					supplier_id: string
					unit_cost: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'refill_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			finance_create_adjustment: {
				Args: {
					p_adjustment_type: string
					p_amount: number
					p_category: string
					p_description: string
					p_proof_document_id?: string
					p_proof_path?: string
				}
				Returns: {
					adjustment_type: Database['public']['Enums']['finance_adjustment_type']
					amount: number
					category: string
					counterparty_id: string | null
					counterparty_type: string | null
					created_at: string
					created_by_employee_id: string | null
					currency: string
					description: string
					id: string
					journal_entry_id: string | null
					posted_at: string | null
					posted_by_employee_id: string | null
					proof_document_id: string | null
					proof_path: string | null
					status: Database['public']['Enums']['finance_adjustment_status']
					updated_at: string
					void_reason: string | null
					voided_at: string | null
					voided_by_employee_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'finance_adjustments'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			finance_pay_employee_bonus: {
				Args: {
					p_amount: number
					p_employee_id: string
					p_period_month?: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_reason?: string
				}
				Returns: {
					amount: number
					created_at: string
					created_by_employee_id: string | null
					currency: string
					employee_id: string
					id: string
					journal_entry_id: string | null
					payment_date: string
					payment_type: Database['public']['Enums']['finance_payroll_payment_type']
					period_month: string
					proof_document_id: string | null
					proof_path: string | null
					reason: string | null
					status: Database['public']['Enums']['finance_payroll_payment_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'employee_payroll_payments'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			finance_pay_employee_salary: {
				Args: {
					p_employee_id: string
					p_note?: string
					p_period_month?: string
					p_proof_document_id?: string
					p_proof_path?: string
				}
				Returns: {
					amount: number
					created_at: string
					created_by_employee_id: string | null
					currency: string
					employee_id: string
					id: string
					journal_entry_id: string | null
					payment_date: string
					payment_type: Database['public']['Enums']['finance_payroll_payment_type']
					period_month: string
					proof_document_id: string | null
					proof_path: string | null
					reason: string | null
					status: Database['public']['Enums']['finance_payroll_payment_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'employee_payroll_payments'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			finance_post_journal_entry: {
				Args: { p_entry_id: string }
				Returns: {
					accounting_date: string
					accounting_period: string
					actor_employee_id: string | null
					created_at: string
					description: string
					entry_number: string
					id: string
					posted_at: string | null
					posted_by_employee_id: string | null
					requires_accountant_signoff: boolean
					reversal_entry_id: string | null
					reversed_at: string | null
					reversed_by_employee_id: string | null
					reversed_from_entry_id: string | null
					signoff_reason: string | null
					source_id: string | null
					source_type:
						| Database['public']['Enums']['finance_journal_source_type']
						| null
					status: Database['public']['Enums']['finance_journal_status']
					updated_at: string
					void_reason: string | null
					voided_at: string | null
					voided_by_employee_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'finance_journal_entries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			finance_post_truck_fuel_expense: {
				Args: {
					p_amount?: number
					p_expense_id: string
					p_note?: string
					p_proof_document_id?: string
					p_proof_path?: string
				}
				Returns: {
					amount: number | null
					created_at: string
					currency: string
					delivery_id: string | null
					driver_id: string
					expense_date: string
					finance_note: string | null
					fuel_liters: number | null
					id: string
					journal_entry_id: string | null
					note: string | null
					odometer_km: number | null
					posted_at: string | null
					posted_by_employee_id: string | null
					proof_document_id: string | null
					proof_path: string | null
					receipt_file_name: string
					receipt_image_data_url: string
					receipt_mime_type: string
					receipt_size_bytes: number | null
					status: Database['public']['Enums']['truck_fuel_expense_status']
					submitted_at: string
					truck_id: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'truck_fuel_expenses'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			finance_record_company_asset: {
				Args: {
					p_acquisition_cost: number
					p_acquisition_date?: string
					p_asset_type: string
					p_funding_source: string
					p_location?: string
					p_name: string
					p_notes?: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_related_truck_id?: string
				}
				Returns: {
					acquisition_cost: number
					acquisition_date: string
					asset_number: string
					asset_type: Database['public']['Enums']['company_asset_type']
					carrying_value: number
					created_at: string
					created_by_employee_id: string | null
					currency: string
					funding_source: Database['public']['Enums']['company_asset_funding_source']
					id: string
					journal_entry_id: string | null
					location: string | null
					name: string
					notes: string | null
					proof_document_id: string | null
					proof_path: string | null
					related_truck_id: string | null
					status: Database['public']['Enums']['company_asset_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'company_assets'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			finance_reverse_journal_entry: {
				Args: { p_entry_id: string; p_reason: string }
				Returns: {
					accounting_date: string
					accounting_period: string
					actor_employee_id: string | null
					created_at: string
					description: string
					entry_number: string
					id: string
					posted_at: string | null
					posted_by_employee_id: string | null
					requires_accountant_signoff: boolean
					reversal_entry_id: string | null
					reversed_at: string | null
					reversed_by_employee_id: string | null
					reversed_from_entry_id: string | null
					signoff_reason: string | null
					source_id: string | null
					source_type:
						| Database['public']['Enums']['finance_journal_source_type']
						| null
					status: Database['public']['Enums']['finance_journal_status']
					updated_at: string
					void_reason: string | null
					voided_at: string | null
					voided_by_employee_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'finance_journal_entries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			finance_update_employee_compensation: {
				Args: {
					p_base_salary: number
					p_department?: string
					p_employee_id: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_salary_currency?: string
					p_social_insurance_salary?: number
					p_title?: string
				}
				Returns: {
					base_salary: number | null
					created_at: string
					department: string | null
					employee_id: string
					hire_date: string | null
					salary_currency: string
					social_insurance_salary: number | null
					title: string | null
					updated_at: string
					updated_by_employee_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'employee_compensation'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			finance_void_draft_journal_entry: {
				Args: { p_entry_id: string; p_reason: string }
				Returns: {
					accounting_date: string
					accounting_period: string
					actor_employee_id: string | null
					created_at: string
					description: string
					entry_number: string
					id: string
					posted_at: string | null
					posted_by_employee_id: string | null
					requires_accountant_signoff: boolean
					reversal_entry_id: string | null
					reversed_at: string | null
					reversed_by_employee_id: string | null
					reversed_from_entry_id: string | null
					signoff_reason: string | null
					source_id: string | null
					source_type:
						| Database['public']['Enums']['finance_journal_source_type']
						| null
					status: Database['public']['Enums']['finance_journal_status']
					updated_at: string
					void_reason: string | null
					voided_at: string | null
					voided_by_employee_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'finance_journal_entries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			find_claimable_customer_profile: {
				Args: { p_phone: string }
				Returns: {
					company_name: string
					id: string
					user_id: string
				}[]
			}
			ingest_support_email_message: {
				Args: {
					p_body?: string
					p_cc_emails?: string[]
					p_from_email?: string
					p_from_name?: string
					p_headers?: Json
					p_in_reply_to?: string
					p_internet_message_id?: string
					p_provider: string
					p_provider_email_id: string
					p_received_at?: string
					p_references?: string[]
					p_subject?: string
					p_to_emails?: string[]
				}
				Returns: {
					created_ticket: boolean
					duplicate: boolean
					message_id: string
					ticket_id: string
					ticket_reference: string
				}[]
			}
			ingest_whatsapp_message: {
				Args: {
					p_body: string
					p_external_message_id?: string
					p_from_phone: string
				}
				Returns: {
					body: string
					channel: Database['public']['Enums']['support_message_channel']
					conversation_id: string | null
					created_at: string
					external_message_id: string | null
					id: string
					metadata: Json
					provider_error: string | null
					provider_status: string
					sender_type: Database['public']['Enums']['support_sender_type']
					sender_user_id: string | null
					ticket_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'support_messages'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			inventory_dispose_damaged_inventory: {
				Args: {
					p_lot_id: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_quantity: number
					p_reason: string
				}
				Returns: {
					amount: number
					carrying_amount: number
					counterparty_name: string | null
					created_at: string
					created_by_employee_id: string | null
					id: string
					journal_entry_id: string | null
					lot_id: string
					manager_employee_id: string | null
					payment_status: string | null
					proof_document_id: string | null
					proof_path: string | null
					quantity: number
					reason: string | null
					transaction_type: Database['public']['Enums']['inventory_damage_transaction_type']
					unit_price: number | null
					write_down_reversal_amount: number
				}
				SetofOptions: {
					from: '*'
					to: 'inventory_damage_transactions'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			inventory_evaluate_order: {
				Args: { p_order_id: string }
				Returns: {
					created_at: string
					customer_id: string | null
					delivered_at: string | null
					id: string
					order_number: string
					quote_id: string | null
					quote_request_id: string | null
					reserved_at: string | null
					status: Database['public']['Enums']['order_workflow_status']
					total_amount: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'orders'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			inventory_finance_cleared_order_ids: {
				Args: { p_order_ids: string[] }
				Returns: {
					order_id: string
				}[]
			}
			inventory_mark_price_outdated: {
				Args: { p_product_id: string }
				Returns: {
					created_at: string
					id: string
					is_primary: boolean
					last_quoted_at: string | null
					lead_time_days: number
					min_order_qty: number
					notes: string | null
					product_id: string
					raw_cost: number
					supplier_id: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'supplier_product_links'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			inventory_record_damage: {
				Args: {
					p_product_id: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_quantity: number
					p_reason: string
					p_recovery_percent?: number
					p_recovery_unit_value?: number
				}
				Returns: {
					carrying_total_value: number
					carrying_unit_value: number
					created_at: string
					damage_number: string
					disposed_quantity: number
					id: string
					journal_entry_id: string | null
					original_quantity: number
					original_total_value: number
					original_unit_cost: number
					product_id: string
					proof_document_id: string | null
					proof_path: string | null
					reason: string
					recorded_by_employee_id: string | null
					recovery_unit_value: number
					remaining_quantity: number
					reversed_quantity: number
					sold_quantity: number
					status: Database['public']['Enums']['inventory_damage_lot_status']
					updated_at: string
					write_down_amount: number
				}
				SetofOptions: {
					from: '*'
					to: 'inventory_damage_lots'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			inventory_reverse_damage: {
				Args: {
					p_lot_id: string
					p_manager_employee_id: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_quantity: number
					p_reason: string
				}
				Returns: {
					amount: number
					carrying_amount: number
					counterparty_name: string | null
					created_at: string
					created_by_employee_id: string | null
					id: string
					journal_entry_id: string | null
					lot_id: string
					manager_employee_id: string | null
					payment_status: string | null
					proof_document_id: string | null
					proof_path: string | null
					quantity: number
					reason: string | null
					transaction_type: Database['public']['Enums']['inventory_damage_transaction_type']
					unit_price: number | null
					write_down_reversal_amount: number
				}
				SetofOptions: {
					from: '*'
					to: 'inventory_damage_transactions'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			inventory_sell_damaged_inventory: {
				Args: {
					p_counterparty_name: string
					p_lot_id: string
					p_payment_status: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_quantity: number
					p_unit_sale_price: number
				}
				Returns: {
					amount: number
					carrying_amount: number
					counterparty_name: string | null
					created_at: string
					created_by_employee_id: string | null
					id: string
					journal_entry_id: string | null
					lot_id: string
					manager_employee_id: string | null
					payment_status: string | null
					proof_document_id: string | null
					proof_path: string | null
					quantity: number
					reason: string | null
					transaction_type: Database['public']['Enums']['inventory_damage_transaction_type']
					unit_price: number | null
					write_down_reversal_amount: number
				}
				SetofOptions: {
					from: '*'
					to: 'inventory_damage_transactions'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			inventory_set_product_availability: {
				Args: {
					p_availability: Database['public']['Enums']['catalog_availability_status']
					p_product_id: string
				}
				Returns: {
					availability_status: Database['public']['Enums']['catalog_availability_status']
					brand: string | null
					category: string
					created_at: string
					description: string | null
					description_ar: string | null
					id: string
					image_urls: string[]
					is_active: boolean
					is_stockable: boolean
					manufacturer: string | null
					name: string
					name_ar: string
					price_range_max: number | null
					price_range_min: number | null
					price_tier: Database['public']['Enums']['price_tier'] | null
					search_vector: unknown
					sku: string
					slug: string
					specifications: Json
					specifications_ar: Json
					subcategory: string | null
					subcategory_ar: string
					tags: string[]
					unit_of_measure: string
					unit_of_measure_ar: string
					updated_at: string
					weight_kg: number | null
				}
				SetofOptions: {
					from: '*'
					to: 'products'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			inventory_update_price: {
				Args: {
					p_new_price: number
					p_notes?: string
					p_product_id: string
					p_proof_path: string
					p_supplier_id: string
				}
				Returns: {
					created_at: string
					id: string
					new_price: number
					notes: string | null
					old_price: number | null
					product_id: string
					proof_path: string
					supplier_id: string
					updated_by_employee_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'price_updates'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			inventory_update_supplier_prices: {
				Args: {
					p_notes?: string
					p_proof_path: string
					p_supplier_id: string
					p_updates: Json
				}
				Returns: Json
			}
			is_employee_with_role: {
				Args: { required_role: string }
				Returns: boolean
			}
			is_important_activity: {
				Args: {
					p_action: Database['public']['Enums']['audit_event_type']
					p_details?: Json
					p_entity_type: string
				}
				Returns: boolean
			}
			link_support_conversation_to_customer: {
				Args: { p_conversation_id: string }
				Returns: {
					assigned_employee_id: string | null
					channel: Database['public']['Enums']['support_channel']
					created_at: string
					customer_id: string | null
					email: string | null
					external_thread_id: string | null
					id: string
					phone: string | null
					status: Database['public']['Enums']['support_conversation_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'support_conversations'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			log_activity: {
				Args: {
					action: Database['public']['Enums']['audit_event_type']
					details?: Json
					entity_id: string
					entity_type: string
				}
				Returns: undefined
			}
			next_order_number: { Args: never; Returns: string }
			next_quote_request_number: { Args: never; Returns: string }
			record_ai_tool_call: {
				Args: {
					p_agent_scope: Database['public']['Enums']['ai_agent_scope']
					p_approved_by_user?: boolean
					p_input_summary?: Json
					p_output_summary?: Json
					p_read_entities?: string[]
					p_tool_name: string
					p_write_entity_id?: string
					p_write_entity_type?: string
				}
				Returns: {
					actor_employee_id: string | null
					actor_user_id: string | null
					agent_scope: Database['public']['Enums']['ai_agent_scope']
					approved_by_user: boolean
					created_at: string
					id: string
					input_summary: Json
					output_summary: Json
					read_entities: string[]
					tool_name: string
					write_entity_id: string | null
					write_entity_type: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'ai_tool_call_audit'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			record_customer_payment: {
				Args: {
					p_amount: number
					p_order_id: string
					p_payment_fraction: number
					p_proof_path: string
				}
				Returns: {
					amount: number
					created_at: string
					id: string
					order_id: string
					payment_fraction: number
					proof_path: string
					recorded_by_employee_id: string | null
					status: Database['public']['Enums']['payment_record_status']
				}
				SetofOptions: {
					from: '*'
					to: 'customer_payments'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			record_customer_payment_followup: {
				Args: {
					p_contact_channel: string
					p_follow_up_due_at: string
					p_follow_up_state: string
					p_notes: string
					p_order_id: string
					p_outcome: string
				}
				Returns: {
					contact_channel: string
					created_at: string
					follow_up_due_at: string
					follow_up_state: string
					id: string
					notes: string
					order_id: string | null
					outcome: string
					recorded_by_employee_id: string | null
					refill_request_id: string | null
					target_type: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'finance_payment_followups'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			record_search_query_executed: {
				Args: {
					p_context?: Json
					p_query: string
					p_result_count: number
					p_table_count: number
				}
				Returns: undefined
			}
			record_supplier_payment: {
				Args: {
					p_amount: number
					p_payment_fraction: number
					p_proof_path: string
					p_refill_request_id: string
				}
				Returns: {
					amount: number
					created_at: string
					id: string
					payment_fraction: number
					proof_path: string
					recorded_by_employee_id: string | null
					refill_request_id: string
					status: Database['public']['Enums']['payment_record_status']
				}
				SetofOptions: {
					from: '*'
					to: 'supplier_payments'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			record_supplier_payment_followup: {
				Args: {
					p_contact_channel: string
					p_follow_up_due_at: string
					p_follow_up_state: string
					p_notes: string
					p_outcome: string
					p_refill_request_id: string
				}
				Returns: {
					contact_channel: string
					created_at: string
					follow_up_due_at: string
					follow_up_state: string
					id: string
					notes: string
					order_id: string | null
					outcome: string
					recorded_by_employee_id: string | null
					refill_request_id: string | null
					target_type: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'finance_payment_followups'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			register_proof_document: {
				Args: {
					p_file_name: string
					p_file_size_bytes: number
					p_mime_type: string
					p_notes?: string
					p_panel: Database['public']['Enums']['employee_panel']
					p_proof_type: string
					p_related_entity_id?: string
					p_related_entity_type?: string
					p_storage_path: string
					p_title?: string
				}
				Returns: {
					bucket_id: string
					created_at: string
					file_name: string
					file_size_bytes: number
					id: string
					mime_type: string
					notes: string | null
					panel: Database['public']['Enums']['employee_panel']
					proof_type: string
					related_entity_id: string | null
					related_entity_type: string | null
					storage_path: string
					title: string | null
					uploaded_by_employee_id: string | null
					uploaded_by_user_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'proof_documents'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			request_price_update: {
				Args: { p_order_id: string; p_product_id: string; p_reason: string }
				Returns: {
					assigned_employee_id: string | null
					created_at: string
					id: string
					product_id: string
					quote_request_id: string | null
					quote_request_item_id: string | null
					reason: string
					requested_by_employee_id: string | null
					resolved_at: string | null
					status: Database['public']['Enums']['price_update_request_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'price_update_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			require_delivery_signature: {
				Args: { signature_path: string; signer_name: string }
				Returns: undefined
			}
			require_driver_rejection_proof: {
				Args: { proof: Json }
				Returns: undefined
			}
			require_panel: {
				Args: { required_panel: string; write_required?: boolean }
				Returns: string
			}
			require_rejection_proof: { Args: { proof: Json }; Returns: undefined }
			require_warehouse_receiving_proof: {
				Args: { proof: Json }
				Returns: string
			}
			reserve_order_stock: {
				Args: { p_order_id: string }
				Returns: {
					created_at: string
					customer_id: string | null
					delivered_at: string | null
					id: string
					order_number: string
					quote_id: string | null
					quote_request_id: string | null
					reserved_at: string | null
					status: Database['public']['Enums']['order_workflow_status']
					total_amount: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'orders'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			sales_approve_quote: {
				Args: { p_order_id: string; p_quote_version_id?: string }
				Returns: {
					created_at: string
					customer_id: string | null
					delivered_at: string | null
					id: string
					order_number: string
					quote_id: string | null
					quote_request_id: string | null
					reserved_at: string | null
					status: Database['public']['Enums']['order_workflow_status']
					total_amount: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'orders'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			sales_cancel_order: {
				Args: { p_order_id: string; p_proof?: Json; p_reason: string }
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			sales_claim_order: {
				Args: { p_order_id: string }
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			sales_confirm_order: {
				Args: {
					p_approval?: Json
					p_order_id: string
					p_quote_version_id?: string
				}
				Returns: {
					created_at: string
					customer_id: string | null
					delivered_at: string | null
					id: string
					order_number: string
					quote_id: string | null
					quote_request_id: string | null
					reserved_at: string | null
					status: Database['public']['Enums']['order_workflow_status']
					total_amount: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'orders'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			sales_record_call_note: {
				Args: { p_notes?: string; p_order_id: string; p_outcome: string }
				Returns: {
					created_at: string
					employee_id: string | null
					id: string
					notes: string | null
					outcome: string
					quote_request_id: string
				}
				SetofOptions: {
					from: '*'
					to: 'sales_call_notes'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			sales_reject_order: {
				Args: { p_order_id: string; p_proof: Json; p_reason: string }
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			sales_save_and_requeue: {
				Args: { p_note?: string; p_order_id: string; p_return_minutes?: number }
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			sales_save_quote_version: {
				Args: { p_items: Json; p_notes?: string; p_order_id: string }
				Returns: {
					created_at: string
					created_by_employee_id: string | null
					delivery_fee: number
					discount_amount: number
					id: string
					notes: string | null
					quote_request_id: string
					status: Database['public']['Enums']['sales_quote_version_status']
					subtotal: number
					tax_amount: number
					total: number
					version_number: number
				}
				SetofOptions: {
					from: '*'
					to: 'sales_quote_versions'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			send_support_conversation_reply: {
				Args: {
					p_body: string
					p_channel?: Database['public']['Enums']['support_message_channel']
					p_conversation_id: string
				}
				Returns: {
					body: string
					channel: Database['public']['Enums']['support_message_channel']
					conversation_id: string | null
					created_at: string
					external_message_id: string | null
					id: string
					metadata: Json
					provider_error: string | null
					provider_status: string
					sender_type: Database['public']['Enums']['support_sender_type']
					sender_user_id: string | null
					ticket_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'support_messages'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			send_support_reply: {
				Args: {
					p_body: string
					p_channel?: Database['public']['Enums']['support_message_channel']
					p_metadata?: Json
					p_ticket_id: string
				}
				Returns: {
					body: string
					channel: Database['public']['Enums']['support_message_channel']
					conversation_id: string | null
					created_at: string
					external_message_id: string | null
					id: string
					metadata: Json
					provider_error: string | null
					provider_status: string
					sender_type: Database['public']['Enums']['support_sender_type']
					sender_user_id: string | null
					ticket_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'support_messages'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_admin_assign_employee_role: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_employee_id: string
					p_reason: string
					p_role: Database['public']['Enums']['employee_role']
				}
				Returns: undefined
			}
			service_admin_disable_driver: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_driver_id: string
					p_reason: string
				}
				Returns: undefined
			}
			service_admin_export_data: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_reason: string
					p_scope: string
				}
				Returns: Json
			}
			service_admin_record_audit: {
				Args: {
					p_action: Database['public']['Enums']['audit_event_type']
					p_actor_pool: string
					p_actor_user_id: string
					p_details?: Json
					p_entity_id: string
					p_entity_type: string
					p_reason: string
				}
				Returns: undefined
			}
			service_admin_remove_employee_role: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_employee_id: string
					p_reason: string
					p_role: Database['public']['Enums']['employee_role']
				}
				Returns: undefined
			}
			service_assign_support_conversation: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_conversation_id: string
				}
				Returns: {
					assigned_employee_id: string | null
					channel: Database['public']['Enums']['support_channel']
					created_at: string
					customer_id: string | null
					email: string | null
					external_thread_id: string | null
					id: string
					phone: string | null
					status: Database['public']['Enums']['support_conversation_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'support_conversations'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_assign_support_ticket: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_ticket_id: string
				}
				Returns: {
					assigned_employee_id: string | null
					created_at: string
					customer_id: string | null
					id: string
					reference: string
					requester_email: string
					requester_name: string | null
					requester_phone: string | null
					source: Database['public']['Enums']['support_ticket_source']
					status: Database['public']['Enums']['support_ticket_status']
					subject: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'support_tickets'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_can_access_ceo_search: {
				Args: { p_actor_pool: string; p_actor_user_id: string }
				Returns: boolean
			}
			service_can_access_panel: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					required_panel: string
					write_required?: boolean
				}
				Returns: boolean
			}
			service_claim_customer_profile: {
				Args: { p_actor_pool: string; p_actor_user_id: string; p_phone: string }
				Returns: {
					assigned_sales_rep_id: string | null
					company_name: string
					contact_name: string
					created_at: string
					created_by_employee_id: string | null
					credit_limit: number
					email: string | null
					id: string
					payment_history: Database['public']['Enums']['customer_payment_history']
					phone: string
					profile_photo_url: string | null
					status: Database['public']['Enums']['customer_status']
					tier: Database['public']['Enums']['customer_tier']
					trade_license_status: Database['public']['Enums']['trade_license_status']
					updated_at: string
					user_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'customers'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_claim_next_sales_order: {
				Args: { p_actor_pool: string; p_actor_user_id: string }
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_clear_customer_pending_email_change: {
				Args: { p_expected_pending_email: string; p_user_id: string }
				Returns: boolean
			}
			service_create_manual_order: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_customer_id: string
					p_items: Json
					p_notes?: string
				}
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_create_supplier_refill: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_product_id: string
					p_proof: Json
					p_quantity: number
					p_supplier_id: string
					p_unit_cost: number
				}
				Returns: {
					created_at: string
					id: string
					product_id: string
					proof: Json
					quantity: number
					requested_by_employee_id: string | null
					status: Database['public']['Enums']['refill_request_status']
					supplier_id: string
					unit_cost: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'refill_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_create_support_ticket: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_client_key?: string
					p_message: string
					p_requester_email: string
					p_requester_name?: string
					p_requester_phone?: string
					p_source?: string
					p_subject: string
				}
				Returns: {
					assigned_employee_id: string | null
					created_at: string
					customer_id: string | null
					id: string
					reference: string
					requester_email: string
					requester_name: string | null
					requester_phone: string | null
					source: Database['public']['Enums']['support_ticket_source']
					status: Database['public']['Enums']['support_ticket_status']
					subject: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'support_tickets'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_current_employee_id: {
				Args: { p_actor_pool: string; p_actor_user_id: string }
				Returns: string
			}
			service_customer_accept_quote: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_quote_id: string
				}
				Returns: {
					created_at: string
					customer_id: string | null
					delivered_at: string | null
					id: string
					order_number: string
					quote_id: string | null
					quote_request_id: string | null
					reserved_at: string | null
					status: Database['public']['Enums']['order_workflow_status']
					total_amount: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'orders'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_customer_auth_has_password: {
				Args: { p_user_id: string }
				Returns: boolean
			}
			service_customer_auth_verify_password: {
				Args: { p_password: string; p_user_id: string }
				Returns: boolean
			}
			service_customer_decline_quote: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_notes: string
					p_quote_id: string
					p_reason: string
				}
				Returns: {
					accepted_at: string | null
					assigned_rep_name: string | null
					assigned_rep_phone: string | null
					created_at: string
					currency: string
					customer_id: string | null
					decline_notes: string | null
					decline_reason: string | null
					declined_at: string | null
					delivery_fee: number
					discount_amount: number
					id: string
					payment_terms: string | null
					previous_version_id: string | null
					project_id: string | null
					quote_number: string
					quote_request_id: string | null
					status: Database['public']['Enums']['quote_status']
					subtotal: number
					tax_amount: number
					total: number
					updated_at: string
					valid_until: string
					validity_days: number
					version_number: number
				}
				SetofOptions: {
					from: '*'
					to: 'quotes'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_customer_get_delivery_secret: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
				}
				Returns: Json
			}
			service_customer_order_delivery_tracking: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
				}
				Returns: Json
			}
			service_customer_record_order_saved_as_draft: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_draft_quote_request_id: string
					p_source?: string
					p_source_order_id?: string
					p_source_quote_request_id: string
				}
				Returns: undefined
			}
			service_customer_record_portal_order_viewed: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id?: string
					p_quote_request_id: string
				}
				Returns: undefined
			}
			service_customer_record_quote_request_draft_saved: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_context?: Json
					p_quote_request_id: string
					p_source: string
				}
				Returns: undefined
			}
			service_customer_request_quote_negotiation: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_counter_type: Database['public']['Enums']['quote_counter_type']
					p_line_items: Json
					p_notes: string
					p_quote_id: string
					p_self_pickup: boolean
					p_total_discount: number
				}
				Returns: {
					counter_type: Database['public']['Enums']['quote_counter_type']
					created_at: string
					id: string
					line_items: Json | null
					notes: string | null
					quote_id: string
					self_pickup: boolean
					total_discount: number | null
				}
				SetofOptions: {
					from: '*'
					to: 'quote_counter_offers'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_customer_submit_quote_line_response: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_line_responses: Json
					p_quote_id: string
				}
				Returns: {
					accepted_at: string | null
					assigned_rep_name: string | null
					assigned_rep_phone: string | null
					created_at: string
					currency: string
					customer_id: string | null
					decline_notes: string | null
					decline_reason: string | null
					declined_at: string | null
					delivery_fee: number
					discount_amount: number
					id: string
					payment_terms: string | null
					previous_version_id: string | null
					project_id: string | null
					quote_number: string
					quote_request_id: string | null
					status: Database['public']['Enums']['quote_status']
					subtotal: number
					tax_amount: number
					total: number
					updated_at: string
					valid_until: string
					validity_days: number
					version_number: number
				}
				SetofOptions: {
					from: '*'
					to: 'quotes'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_customer_submit_saved_quote_request: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_quote_request_id: string
					p_source?: string
				}
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_dispatch_complete_delivery: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_delivery_id: string
					p_proof: Json
				}
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_dispatch_complete_loaded_order: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
					p_proof: Json
				}
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_dispatch_return_loaded_order: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
					p_proof: Json
					p_reason: string
				}
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_driver_accept_delivery: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_delivery_id: string
				}
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_driver_app_dashboard: {
				Args: { p_actor_pool: string; p_actor_user_id: string }
				Returns: Json
			}
			service_driver_confirm_arrival_secret_result: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_code: string
					p_delivery_id: string
				}
				Returns: Json
			}
			service_driver_confirm_delivery: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_code: string
					p_delivery_id: string
					p_latitude: number
					p_longitude: number
					p_signature_path: string
					p_signer_name: string
				}
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_driver_list_active_drivers: {
				Args: { p_actor_pool: string; p_actor_user_id: string }
				Returns: Json
			}
			service_driver_list_team_messages: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_limit?: number
				}
				Returns: Json
			}
			service_driver_reject_delivery: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_delivery_id: string
					p_proof: Json
					p_reason: string
				}
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_driver_reopen_delivery_route: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_delivery_id: string
				}
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_driver_send_team_message: {
				Args: { p_actor_pool: string; p_actor_user_id: string; p_body: string }
				Returns: Json
			}
			service_driver_set_online: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_online: boolean
				}
				Returns: {
					driver_id: string
					last_seen_at: string
					status: Database['public']['Enums']['driver_online_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'driver_online_states'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_driver_start_delivery: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_delivery_id: string
				}
				Returns: {
					arrived_at: string | null
					completed_at: string | null
					created_at: string
					delivery_number: string
					driver_id: string | null
					id: string
					loading_task_id: string | null
					order_id: string | null
					rejection_proof: Json | null
					rejection_reason: string | null
					started_at: string | null
					status: Database['public']['Enums']['delivery_status']
					truck_id: string | null
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'deliveries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_driver_submit_fuel_receipt: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_amount?: number
					p_delivery_id?: string
					p_expense_date?: string
					p_fuel_liters?: number
					p_note?: string
					p_odometer_km?: number
					p_receipt_file_name?: string
					p_receipt_image_data_url?: string
					p_receipt_mime_type?: string
					p_receipt_size_bytes?: number
					p_truck_id?: string
				}
				Returns: {
					amount: number | null
					created_at: string
					currency: string
					delivery_id: string | null
					driver_id: string
					expense_date: string
					finance_note: string | null
					fuel_liters: number | null
					id: string
					journal_entry_id: string | null
					note: string | null
					odometer_km: number | null
					posted_at: string | null
					posted_by_employee_id: string | null
					proof_document_id: string | null
					proof_path: string | null
					receipt_file_name: string
					receipt_image_data_url: string
					receipt_mime_type: string
					receipt_size_bytes: number | null
					status: Database['public']['Enums']['truck_fuel_expense_status']
					submitted_at: string
					truck_id: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'truck_fuel_expenses'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_driver_update_location: {
				Args: {
					p_accuracy_meters?: number
					p_actor_pool: string
					p_actor_user_id: string
					p_delivery_id?: string
					p_heading?: number
					p_latitude: number
					p_longitude: number
					p_speed_kmh?: number
				}
				Returns: {
					accuracy_meters: number | null
					delivery_id: string | null
					driver_id: string
					heading: number | null
					id: string
					latitude: number
					longitude: number
					recorded_at: string
					source: Database['public']['Enums']['driver_location_source']
					speed_kmh: number | null
				}
				SetofOptions: {
					from: '*'
					to: 'driver_locations'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_finance_accounting_dashboard: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_period_end?: string
					p_period_start?: string
				}
				Returns: Json
			}
			service_finance_backfill_accounting_sources: {
				Args: { p_actor_pool: string; p_actor_user_id: string }
				Returns: Json
			}
			service_finance_cancel_customer_order: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
					p_proof?: Json
					p_reason: string
				}
				Returns: {
					created_at: string
					customer_id: string | null
					delivered_at: string | null
					id: string
					order_number: string
					quote_id: string | null
					quote_request_id: string | null
					reserved_at: string | null
					status: Database['public']['Enums']['order_workflow_status']
					total_amount: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'orders'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_finance_cancel_supplier_refill: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_proof?: Json
					p_reason: string
					p_refill_request_id: string
				}
				Returns: {
					created_at: string
					id: string
					product_id: string
					proof: Json
					quantity: number
					requested_by_employee_id: string | null
					status: Database['public']['Enums']['refill_request_status']
					supplier_id: string
					unit_cost: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'refill_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_finance_create_adjustment: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_adjustment_type: string
					p_amount: number
					p_category: string
					p_description: string
					p_proof_document_id?: string
					p_proof_path?: string
				}
				Returns: {
					adjustment_type: Database['public']['Enums']['finance_adjustment_type']
					amount: number
					category: string
					counterparty_id: string | null
					counterparty_type: string | null
					created_at: string
					created_by_employee_id: string | null
					currency: string
					description: string
					id: string
					journal_entry_id: string | null
					posted_at: string | null
					posted_by_employee_id: string | null
					proof_document_id: string | null
					proof_path: string | null
					status: Database['public']['Enums']['finance_adjustment_status']
					updated_at: string
					void_reason: string | null
					voided_at: string | null
					voided_by_employee_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'finance_adjustments'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_finance_pay_employee_bonus: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_amount: number
					p_employee_id: string
					p_period_month?: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_reason?: string
				}
				Returns: {
					amount: number
					created_at: string
					created_by_employee_id: string | null
					currency: string
					employee_id: string
					id: string
					journal_entry_id: string | null
					payment_date: string
					payment_type: Database['public']['Enums']['finance_payroll_payment_type']
					period_month: string
					proof_document_id: string | null
					proof_path: string | null
					reason: string | null
					status: Database['public']['Enums']['finance_payroll_payment_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'employee_payroll_payments'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_finance_pay_employee_salary: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_employee_id: string
					p_note?: string
					p_period_month?: string
					p_proof_document_id?: string
					p_proof_path?: string
				}
				Returns: {
					amount: number
					created_at: string
					created_by_employee_id: string | null
					currency: string
					employee_id: string
					id: string
					journal_entry_id: string | null
					payment_date: string
					payment_type: Database['public']['Enums']['finance_payroll_payment_type']
					period_month: string
					proof_document_id: string | null
					proof_path: string | null
					reason: string | null
					status: Database['public']['Enums']['finance_payroll_payment_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'employee_payroll_payments'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_finance_post_journal_entry: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_entry_id: string
				}
				Returns: {
					accounting_date: string
					accounting_period: string
					actor_employee_id: string | null
					created_at: string
					description: string
					entry_number: string
					id: string
					posted_at: string | null
					posted_by_employee_id: string | null
					requires_accountant_signoff: boolean
					reversal_entry_id: string | null
					reversed_at: string | null
					reversed_by_employee_id: string | null
					reversed_from_entry_id: string | null
					signoff_reason: string | null
					source_id: string | null
					source_type:
						| Database['public']['Enums']['finance_journal_source_type']
						| null
					status: Database['public']['Enums']['finance_journal_status']
					updated_at: string
					void_reason: string | null
					voided_at: string | null
					voided_by_employee_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'finance_journal_entries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_finance_post_truck_fuel_expense: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_amount?: number
					p_expense_id: string
					p_note?: string
					p_proof_document_id?: string
					p_proof_path?: string
				}
				Returns: {
					amount: number | null
					created_at: string
					currency: string
					delivery_id: string | null
					driver_id: string
					expense_date: string
					finance_note: string | null
					fuel_liters: number | null
					id: string
					journal_entry_id: string | null
					note: string | null
					odometer_km: number | null
					posted_at: string | null
					posted_by_employee_id: string | null
					proof_document_id: string | null
					proof_path: string | null
					receipt_file_name: string
					receipt_image_data_url: string
					receipt_mime_type: string
					receipt_size_bytes: number | null
					status: Database['public']['Enums']['truck_fuel_expense_status']
					submitted_at: string
					truck_id: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'truck_fuel_expenses'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_finance_record_company_asset: {
				Args: {
					p_acquisition_cost: number
					p_acquisition_date?: string
					p_actor_pool: string
					p_actor_user_id: string
					p_asset_type: string
					p_funding_source: string
					p_location?: string
					p_name: string
					p_notes?: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_related_truck_id?: string
				}
				Returns: {
					acquisition_cost: number
					acquisition_date: string
					asset_number: string
					asset_type: Database['public']['Enums']['company_asset_type']
					carrying_value: number
					created_at: string
					created_by_employee_id: string | null
					currency: string
					funding_source: Database['public']['Enums']['company_asset_funding_source']
					id: string
					journal_entry_id: string | null
					location: string | null
					name: string
					notes: string | null
					proof_document_id: string | null
					proof_path: string | null
					related_truck_id: string | null
					status: Database['public']['Enums']['company_asset_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'company_assets'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_finance_reverse_journal_entry: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_entry_id: string
					p_reason: string
				}
				Returns: {
					accounting_date: string
					accounting_period: string
					actor_employee_id: string | null
					created_at: string
					description: string
					entry_number: string
					id: string
					posted_at: string | null
					posted_by_employee_id: string | null
					requires_accountant_signoff: boolean
					reversal_entry_id: string | null
					reversed_at: string | null
					reversed_by_employee_id: string | null
					reversed_from_entry_id: string | null
					signoff_reason: string | null
					source_id: string | null
					source_type:
						| Database['public']['Enums']['finance_journal_source_type']
						| null
					status: Database['public']['Enums']['finance_journal_status']
					updated_at: string
					void_reason: string | null
					voided_at: string | null
					voided_by_employee_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'finance_journal_entries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_finance_update_employee_compensation: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_base_salary: number
					p_department?: string
					p_employee_id: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_salary_currency?: string
					p_social_insurance_salary?: number
					p_title?: string
				}
				Returns: {
					base_salary: number | null
					created_at: string
					department: string | null
					employee_id: string
					hire_date: string | null
					salary_currency: string
					social_insurance_salary: number | null
					title: string | null
					updated_at: string
					updated_by_employee_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'employee_compensation'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_finance_void_draft_journal_entry: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_entry_id: string
					p_reason: string
				}
				Returns: {
					accounting_date: string
					accounting_period: string
					actor_employee_id: string | null
					created_at: string
					description: string
					entry_number: string
					id: string
					posted_at: string | null
					posted_by_employee_id: string | null
					requires_accountant_signoff: boolean
					reversal_entry_id: string | null
					reversed_at: string | null
					reversed_by_employee_id: string | null
					reversed_from_entry_id: string | null
					signoff_reason: string | null
					source_id: string | null
					source_type:
						| Database['public']['Enums']['finance_journal_source_type']
						| null
					status: Database['public']['Enums']['finance_journal_status']
					updated_at: string
					void_reason: string | null
					voided_at: string | null
					voided_by_employee_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'finance_journal_entries'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_find_claimable_customer_profile: {
				Args: { p_actor_pool: string; p_actor_user_id: string; p_phone: string }
				Returns: {
					company_name: string
					id: string
					user_id: string
				}[]
			}
			service_ingest_support_email_message: {
				Args: {
					p_body?: string
					p_cc_emails?: string[]
					p_from_email?: string
					p_from_name?: string
					p_headers?: Json
					p_in_reply_to?: string
					p_internet_message_id?: string
					p_provider: string
					p_provider_email_id: string
					p_received_at?: string
					p_references?: string[]
					p_subject?: string
					p_to_emails?: string[]
				}
				Returns: {
					created_ticket: boolean
					duplicate: boolean
					message_id: string
					ticket_id: string
					ticket_reference: string
				}[]
			}
			service_internal_ai_search_documents: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_agent_scope: Database['public']['Enums']['ai_agent_scope']
					p_entity_types?: string[]
					p_limit_per_entity?: number
					p_search_tokens?: string[]
				}
				Returns: {
					entity_id: string
					entity_type: string
					metadata: Json
					search_text: string
					sort_at: string
					subtitle: string
					title: string
				}[]
			}
			service_inventory_dispose_damaged_inventory: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_lot_id: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_quantity: number
					p_reason: string
				}
				Returns: {
					amount: number
					carrying_amount: number
					counterparty_name: string | null
					created_at: string
					created_by_employee_id: string | null
					id: string
					journal_entry_id: string | null
					lot_id: string
					manager_employee_id: string | null
					payment_status: string | null
					proof_document_id: string | null
					proof_path: string | null
					quantity: number
					reason: string | null
					transaction_type: Database['public']['Enums']['inventory_damage_transaction_type']
					unit_price: number | null
					write_down_reversal_amount: number
				}
				SetofOptions: {
					from: '*'
					to: 'inventory_damage_transactions'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_inventory_evaluate_order: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
				}
				Returns: {
					created_at: string
					customer_id: string | null
					delivered_at: string | null
					id: string
					order_number: string
					quote_id: string | null
					quote_request_id: string | null
					reserved_at: string | null
					status: Database['public']['Enums']['order_workflow_status']
					total_amount: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'orders'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_inventory_finance_cleared_order_ids: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_ids: string[]
				}
				Returns: {
					order_id: string
				}[]
			}
			service_inventory_mark_price_outdated: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_product_id: string
				}
				Returns: {
					created_at: string
					id: string
					is_primary: boolean
					last_quoted_at: string | null
					lead_time_days: number
					min_order_qty: number
					notes: string | null
					product_id: string
					raw_cost: number
					supplier_id: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'supplier_product_links'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_inventory_record_damage: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_product_id: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_quantity: number
					p_reason: string
					p_recovery_percent?: number
					p_recovery_unit_value?: number
				}
				Returns: {
					carrying_total_value: number
					carrying_unit_value: number
					created_at: string
					damage_number: string
					disposed_quantity: number
					id: string
					journal_entry_id: string | null
					original_quantity: number
					original_total_value: number
					original_unit_cost: number
					product_id: string
					proof_document_id: string | null
					proof_path: string | null
					reason: string
					recorded_by_employee_id: string | null
					recovery_unit_value: number
					remaining_quantity: number
					reversed_quantity: number
					sold_quantity: number
					status: Database['public']['Enums']['inventory_damage_lot_status']
					updated_at: string
					write_down_amount: number
				}
				SetofOptions: {
					from: '*'
					to: 'inventory_damage_lots'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_inventory_reverse_damage: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_lot_id: string
					p_manager_employee_id: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_quantity: number
					p_reason: string
				}
				Returns: {
					amount: number
					carrying_amount: number
					counterparty_name: string | null
					created_at: string
					created_by_employee_id: string | null
					id: string
					journal_entry_id: string | null
					lot_id: string
					manager_employee_id: string | null
					payment_status: string | null
					proof_document_id: string | null
					proof_path: string | null
					quantity: number
					reason: string | null
					transaction_type: Database['public']['Enums']['inventory_damage_transaction_type']
					unit_price: number | null
					write_down_reversal_amount: number
				}
				SetofOptions: {
					from: '*'
					to: 'inventory_damage_transactions'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_inventory_sell_damaged_inventory: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_counterparty_name: string
					p_lot_id: string
					p_payment_status: string
					p_proof_document_id?: string
					p_proof_path?: string
					p_quantity: number
					p_unit_sale_price: number
				}
				Returns: {
					amount: number
					carrying_amount: number
					counterparty_name: string | null
					created_at: string
					created_by_employee_id: string | null
					id: string
					journal_entry_id: string | null
					lot_id: string
					manager_employee_id: string | null
					payment_status: string | null
					proof_document_id: string | null
					proof_path: string | null
					quantity: number
					reason: string | null
					transaction_type: Database['public']['Enums']['inventory_damage_transaction_type']
					unit_price: number | null
					write_down_reversal_amount: number
				}
				SetofOptions: {
					from: '*'
					to: 'inventory_damage_transactions'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_inventory_set_product_availability: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_availability: Database['public']['Enums']['catalog_availability_status']
					p_product_id: string
				}
				Returns: {
					availability_status: Database['public']['Enums']['catalog_availability_status']
					brand: string | null
					category: string
					created_at: string
					description: string | null
					description_ar: string | null
					id: string
					image_urls: string[]
					is_active: boolean
					is_stockable: boolean
					manufacturer: string | null
					name: string
					name_ar: string
					price_range_max: number | null
					price_range_min: number | null
					price_tier: Database['public']['Enums']['price_tier'] | null
					search_vector: unknown
					sku: string
					slug: string
					specifications: Json
					specifications_ar: Json
					subcategory: string | null
					subcategory_ar: string
					tags: string[]
					unit_of_measure: string
					unit_of_measure_ar: string
					updated_at: string
					weight_kg: number | null
				}
				SetofOptions: {
					from: '*'
					to: 'products'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_inventory_update_price: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_new_price: number
					p_notes: string
					p_product_id: string
					p_proof_path: string
					p_supplier_id: string
				}
				Returns: {
					created_at: string
					id: string
					new_price: number
					notes: string | null
					old_price: number | null
					product_id: string
					proof_path: string
					supplier_id: string
					updated_by_employee_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'price_updates'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_inventory_update_supplier_prices: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_notes?: string
					p_proof_path: string
					p_supplier_id: string
					p_updates: Json
				}
				Returns: Json
			}
			service_link_support_conversation_to_customer: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_conversation_id: string
				}
				Returns: {
					assigned_employee_id: string | null
					channel: Database['public']['Enums']['support_channel']
					created_at: string
					customer_id: string | null
					email: string | null
					external_thread_id: string | null
					id: string
					phone: string | null
					status: Database['public']['Enums']['support_conversation_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'support_conversations'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_log_activity: {
				Args: {
					action: Database['public']['Enums']['audit_event_type']
					details?: Json
					entity_id: string
					entity_type: string
					p_actor_pool: string
					p_actor_user_id: string
				}
				Returns: undefined
			}
			service_record_ai_tool_call: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_agent_scope: Database['public']['Enums']['ai_agent_scope']
					p_approved_by_user?: boolean
					p_input_summary?: Json
					p_output_summary?: Json
					p_read_entities?: string[]
					p_tool_name: string
					p_write_entity_id?: string
					p_write_entity_type?: string
				}
				Returns: {
					actor_employee_id: string | null
					actor_user_id: string | null
					agent_scope: Database['public']['Enums']['ai_agent_scope']
					approved_by_user: boolean
					created_at: string
					id: string
					input_summary: Json
					output_summary: Json
					read_entities: string[]
					tool_name: string
					write_entity_id: string | null
					write_entity_type: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'ai_tool_call_audit'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_record_customer_payment: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_amount: number
					p_order_id: string
					p_payment_fraction: number
					p_proof_path: string
				}
				Returns: {
					amount: number
					created_at: string
					id: string
					order_id: string
					payment_fraction: number
					proof_path: string
					recorded_by_employee_id: string | null
					status: Database['public']['Enums']['payment_record_status']
				}
				SetofOptions: {
					from: '*'
					to: 'customer_payments'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_record_customer_payment_followup: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_contact_channel: string
					p_follow_up_due_at: string
					p_follow_up_state: string
					p_notes: string
					p_order_id: string
					p_outcome: string
				}
				Returns: {
					contact_channel: string
					created_at: string
					follow_up_due_at: string
					follow_up_state: string
					id: string
					notes: string
					order_id: string | null
					outcome: string
					recorded_by_employee_id: string | null
					refill_request_id: string | null
					target_type: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'finance_payment_followups'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_record_supplier_payment: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_amount: number
					p_payment_fraction: number
					p_proof_path: string
					p_refill_request_id: string
				}
				Returns: {
					amount: number
					created_at: string
					id: string
					payment_fraction: number
					proof_path: string
					recorded_by_employee_id: string | null
					refill_request_id: string
					status: Database['public']['Enums']['payment_record_status']
				}
				SetofOptions: {
					from: '*'
					to: 'supplier_payments'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_record_supplier_payment_followup: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_contact_channel: string
					p_follow_up_due_at: string
					p_follow_up_state: string
					p_notes: string
					p_outcome: string
					p_refill_request_id: string
				}
				Returns: {
					contact_channel: string
					created_at: string
					follow_up_due_at: string
					follow_up_state: string
					id: string
					notes: string
					order_id: string | null
					outcome: string
					recorded_by_employee_id: string | null
					refill_request_id: string | null
					target_type: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'finance_payment_followups'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_refresh_ceo_search_documents_if_dirty: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_force?: boolean
				}
				Returns: number
			}
			service_register_proof_document: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_file_name: string
					p_file_size_bytes: number
					p_mime_type: string
					p_notes?: string
					p_panel: Database['public']['Enums']['employee_panel']
					p_proof_type: string
					p_related_entity_id?: string
					p_related_entity_type?: string
					p_storage_path: string
					p_title?: string
				}
				Returns: {
					bucket_id: string
					created_at: string
					file_name: string
					file_size_bytes: number
					id: string
					mime_type: string
					notes: string | null
					panel: Database['public']['Enums']['employee_panel']
					proof_type: string
					related_entity_id: string | null
					related_entity_type: string | null
					storage_path: string
					title: string | null
					uploaded_by_employee_id: string | null
					uploaded_by_user_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'proof_documents'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_request_price_update: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
					p_product_id: string
					p_reason: string
				}
				Returns: {
					assigned_employee_id: string | null
					created_at: string
					id: string
					product_id: string
					quote_request_id: string | null
					quote_request_item_id: string | null
					reason: string
					requested_by_employee_id: string | null
					resolved_at: string | null
					status: Database['public']['Enums']['price_update_request_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'price_update_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_require_panel: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					required_panel: string
					write_required?: boolean
				}
				Returns: string
			}
			service_reserve_order_stock: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
				}
				Returns: {
					created_at: string
					customer_id: string | null
					delivered_at: string | null
					id: string
					order_number: string
					quote_id: string | null
					quote_request_id: string | null
					reserved_at: string | null
					status: Database['public']['Enums']['order_workflow_status']
					total_amount: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'orders'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_sales_cancel_order: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
					p_proof?: Json
					p_reason: string
				}
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_sales_claim_order: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
				}
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_sales_confirm_order: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_approval?: Json
					p_order_id: string
					p_quote_version_id?: string
				}
				Returns: {
					created_at: string
					customer_id: string | null
					delivered_at: string | null
					id: string
					order_number: string
					quote_id: string | null
					quote_request_id: string | null
					reserved_at: string | null
					status: Database['public']['Enums']['order_workflow_status']
					total_amount: number
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'orders'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_sales_record_call_note: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_notes?: string
					p_order_id: string
					p_outcome: string
				}
				Returns: {
					created_at: string
					employee_id: string | null
					id: string
					notes: string | null
					outcome: string
					quote_request_id: string
				}
				SetofOptions: {
					from: '*'
					to: 'sales_call_notes'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_sales_reject_order: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
					p_proof: Json
					p_reason: string
				}
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_sales_save_and_requeue: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_note?: string
					p_order_id: string
					p_return_minutes?: number
				}
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					draft_name: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: Database['public']['Enums']['quote_request_status']
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: Database['public']['Enums']['quote_request_urgency']
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_sales_save_quote_version: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_items: Json
					p_notes?: string
					p_order_id: string
				}
				Returns: {
					created_at: string
					created_by_employee_id: string | null
					delivery_fee: number
					discount_amount: number
					id: string
					notes: string | null
					quote_request_id: string
					status: Database['public']['Enums']['sales_quote_version_status']
					subtotal: number
					tax_amount: number
					total: number
					version_number: number
				}
				SetofOptions: {
					from: '*'
					to: 'sales_quote_versions'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_send_support_conversation_reply: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_body: string
					p_channel: Database['public']['Enums']['support_message_channel']
					p_conversation_id: string
				}
				Returns: {
					body: string
					channel: Database['public']['Enums']['support_message_channel']
					conversation_id: string | null
					created_at: string
					external_message_id: string | null
					id: string
					metadata: Json
					provider_error: string | null
					provider_status: string
					sender_type: Database['public']['Enums']['support_sender_type']
					sender_user_id: string | null
					ticket_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'support_messages'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_send_support_reply: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_body: string
					p_channel?: Database['public']['Enums']['support_message_channel']
					p_metadata?: Json
					p_ticket_id: string
				}
				Returns: {
					body: string
					channel: Database['public']['Enums']['support_message_channel']
					conversation_id: string | null
					created_at: string
					external_message_id: string | null
					id: string
					metadata: Json
					provider_error: string | null
					provider_status: string
					sender_type: Database['public']['Enums']['support_sender_type']
					sender_user_id: string | null
					ticket_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'support_messages'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_set_employee_presence: {
				Args: {
					p_active_panel?: string
					p_actor_pool: string
					p_actor_user_id: string
					p_status: string
				}
				Returns: {
					active_panel: Database['public']['Enums']['employee_panel'] | null
					employee_id: string
					last_seen_at: string
					status: Database['public']['Enums']['employee_presence_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'employee_presence'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_set_support_conversation_status: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_conversation_id: string
					p_status: Database['public']['Enums']['support_conversation_status']
				}
				Returns: {
					assigned_employee_id: string | null
					channel: Database['public']['Enums']['support_channel']
					created_at: string
					customer_id: string | null
					email: string | null
					external_thread_id: string | null
					id: string
					phone: string | null
					status: Database['public']['Enums']['support_conversation_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'support_conversations'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_set_support_ticket_status: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_status: Database['public']['Enums']['support_ticket_status']
					p_ticket_id: string
				}
				Returns: {
					assigned_employee_id: string | null
					created_at: string
					customer_id: string | null
					id: string
					reference: string
					requester_email: string
					requester_name: string | null
					requester_phone: string | null
					source: Database['public']['Enums']['support_ticket_source']
					status: Database['public']['Enums']['support_ticket_status']
					subject: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'support_tickets'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_transfer_team_ownership: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_member_id: string
				}
				Returns: undefined
			}
			service_warehouse_approve_loading: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_loading_task_id: string
					p_proof: Json
				}
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_warehouse_approve_receiving: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_proof: Json
					p_receiving_task_id: string
				}
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					proof: Json
					refill_request_id: string
					rejection_reason: string | null
					status: Database['public']['Enums']['receiving_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'receiving_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_warehouse_assign_loading_driver: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_driver_id: string
					p_order_id: string
					p_truck_id?: string
				}
				Returns: {
					assigned_items: Json
					created_at: string
					driver_id: string
					id: string
					loading_task_id: string
					truck_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'loading_task_drivers'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_warehouse_mark_loading_ready: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
				}
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_warehouse_reject_loading: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_loading_task_id: string
					p_proof: Json
					p_reason: string
				}
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_warehouse_reject_receiving: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_proof: Json
					p_reason: string
					p_receiving_task_id: string
				}
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					proof: Json
					refill_request_id: string
					rejection_reason: string | null
					status: Database['public']['Enums']['receiving_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'receiving_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_warehouse_remove_loading_driver: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
					p_truck_id: string
				}
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_warehouse_replace_loading_driver: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_driver_id: string
					p_from_truck_id: string
					p_order_id: string
					p_truck_id?: string
				}
				Returns: {
					assigned_items: Json
					created_at: string
					driver_id: string
					id: string
					loading_task_id: string
					truck_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'loading_task_drivers'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_warehouse_reset_loading: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
				}
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_warehouse_start_loading: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
				}
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			service_warehouse_toggle_loading_item: {
				Args: {
					p_actor_pool: string
					p_actor_user_id: string
					p_order_id: string
					p_product_slug: string
					p_truck_id: string
				}
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			set_employee_presence: {
				Args: { p_active_panel?: string; p_status: string }
				Returns: {
					active_panel: Database['public']['Enums']['employee_panel'] | null
					employee_id: string
					last_seen_at: string
					status: Database['public']['Enums']['employee_presence_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'employee_presence'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			set_support_conversation_status: {
				Args: {
					p_conversation_id: string
					p_status: Database['public']['Enums']['support_conversation_status']
				}
				Returns: {
					assigned_employee_id: string | null
					channel: Database['public']['Enums']['support_channel']
					created_at: string
					customer_id: string | null
					email: string | null
					external_thread_id: string | null
					id: string
					phone: string | null
					status: Database['public']['Enums']['support_conversation_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'support_conversations'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			set_support_ticket_status: {
				Args: {
					p_status: Database['public']['Enums']['support_ticket_status']
					p_ticket_id: string
				}
				Returns: {
					assigned_employee_id: string | null
					created_at: string
					customer_id: string | null
					id: string
					reference: string
					requester_email: string
					requester_name: string | null
					requester_phone: string | null
					source: Database['public']['Enums']['support_ticket_source']
					status: Database['public']['Enums']['support_ticket_status']
					subject: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'support_tickets'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			transfer_team_ownership: {
				Args: { p_member_id: string }
				Returns: undefined
			}
			warehouse_approve_loading: {
				Args: { p_loading_task_id: string; p_proof: Json }
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			warehouse_approve_receiving: {
				Args: { p_proof: Json; p_receiving_task_id: string }
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					proof: Json
					refill_request_id: string
					rejection_reason: string | null
					status: Database['public']['Enums']['receiving_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'receiving_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			warehouse_assign_loading_driver: {
				Args: { p_driver_id: string; p_order_id: string; p_truck_id?: string }
				Returns: {
					assigned_items: Json
					created_at: string
					driver_id: string
					id: string
					loading_task_id: string
					truck_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'loading_task_drivers'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			warehouse_mark_loading_ready: {
				Args: { p_order_id: string }
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			warehouse_reject_loading: {
				Args: { p_loading_task_id: string; p_proof: Json; p_reason: string }
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			warehouse_reject_receiving: {
				Args: { p_proof: Json; p_reason: string; p_receiving_task_id: string }
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					proof: Json
					refill_request_id: string
					rejection_reason: string | null
					status: Database['public']['Enums']['receiving_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'receiving_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			warehouse_remove_loading_driver: {
				Args: { p_order_id: string; p_truck_id: string }
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			warehouse_replace_loading_driver: {
				Args: {
					p_driver_id: string
					p_from_truck_id: string
					p_order_id: string
					p_truck_id?: string
				}
				Returns: {
					assigned_items: Json
					created_at: string
					driver_id: string
					id: string
					loading_task_id: string
					truck_id: string | null
				}
				SetofOptions: {
					from: '*'
					to: 'loading_task_drivers'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			warehouse_reset_loading: {
				Args: { p_order_id: string }
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			warehouse_start_loading: {
				Args: { p_order_id: string }
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			warehouse_toggle_loading_item: {
				Args: { p_order_id: string; p_product_slug: string; p_truck_id: string }
				Returns: {
					advisor_employee_id: string | null
					created_at: string
					id: string
					order_id: string
					proof: Json
					rejection_reason: string | null
					status: Database['public']['Enums']['loading_task_status']
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'loading_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
		}
		Enums: {
			account_type: 'customer' | 'employee' | 'driver'
			ai_agent_scope: 'website' | 'portal' | 'employee' | 'search'
			approval_status:
				| 'pending'
				| 'approved'
				| 'changes_requested'
				| 'rejected'
				| 'canceled'
			audit_event_type:
				| 'driver_marked_online'
				| 'driver_marked_offline'
				| 'customer_profile_claimed'
				| 'quote_request_submitted'
				| 'quote_accepted'
				| 'customer_quote_accepted'
				| 'customer_quote_declined'
				| 'customer_quote_negotiation_requested'
				| 'customer_quote_line_response_submitted'
				| 'sales_order_claimed'
				| 'sales_order_requeued'
				| 'sales_call_note_recorded'
				| 'sales_quote_draft_saved'
				| 'sales_quote_approved'
				| 'sales_order_confirmed'
				| 'sales_order_rejected'
				| 'sales_order_canceled'
				| 'manual_order_created'
				| 'price_update_requested'
				| 'inventory_price_updated'
				| 'supplier_refill_created'
				| 'customer_payment_recorded'
				| 'supplier_payment_recorded'
				| 'inventory_order_evaluated'
				| 'order_stock_reserved'
				| 'warehouse_loading_started'
				| 'warehouse_loading_approved'
				| 'warehouse_loading_rejected'
				| 'warehouse_receiving_approved'
				| 'warehouse_receiving_rejected'
				| 'dispatch_driver_assigned'
				| 'dispatch_delivery_completed'
				| 'dispatch_delivery_rejected'
				| 'delivery_returned_to_warehouse_loading'
				| 'driver_delivery_accepted'
				| 'driver_delivery_started'
				| 'driver_delivery_arrived'
				| 'driver_delivery_confirmed'
				| 'driver_delivery_rejected'
				| 'support_ticket_created'
				| 'support_reply_sent'
				| 'whatsapp_message_ingested'
				| 'warehouse_loading_driver_assigned'
				| 'warehouse_loading_driver_removed'
				| 'warehouse_loading_item_toggled'
				| 'warehouse_loading_marked_ready'
				| 'warehouse_loading_reset'
				| 'support_status_updated'
				| 'support_assigned'
				| 'admin_record_created'
				| 'admin_record_updated'
				| 'admin_record_deactivated'
				| 'admin_export_created'
				| 'employee_role_assigned'
				| 'employee_role_removed'
				| 'driver_location_updated'
				| 'driver_assigned_delivery'
				| 'customer_signature_captured'
				| 'driver_rejection_proof_uploaded'
				| 'internal_employee_created'
				| 'internal_employee_role_assigned'
				| 'internal_employee_role_removed'
				| 'customer_payment_followup_recorded'
				| 'supplier_payment_followup_recorded'
				| 'supplier_refill_canceled'
				| 'driver_team_message_sent'
				| 'website_draft_saved'
				| 'portal_draft_saved'
				| 'customer_order_saved_as_draft'
				| 'portal_order_viewed'
				| 'customer_signed_up'
				| 'customer_signed_in'
				| 'draft_created'
				| 'draft_updated'
				| 'draft_saved'
				| 'draft_submitted'
				| 'order_submitted'
				| 'support_ticket_notification_sent'
				| 'support_ticket_reply_sent'
				| 'sales_order_opened'
				| 'sales_customer_called'
				| 'sales_quote_edited'
				| 'support_conversation_linked_to_customer'
				| 'admin_role_assigned'
				| 'admin_role_removed'
				| 'admin_database_exported'
				| 'search_query_executed'
				| 'driver_assignment_notified'
				| 'driver_arrived'
				| 'driver_delivery_returned_to_warehouse_loading'
				| 'dispatch_delivery_created'
				| 'dispatch_delivery_delivered'
				| 'dispatch_delivery_exception_opened'
				| 'dispatch_delivery_status_updated'
				| 'dispatch_truck_location_updated'
				| 'sales_order_auto_assigned'
				| 'sales_order_saved'
				| 'manual_order_started'
				| 'provisional_customer_created'
				| 'provisional_customer_confirmed'
				| 'manual_order_quoted'
				| 'sales_order_sent_to_finance'
				| 'supplier_price_proof_uploaded'
				| 'item_price_updated'
				| 'inventory_refill_started'
				| 'supplier_refill_deal_created'
				| 'supplier_refill_sent_to_finance'
				| 'customer_payment_discussion_started'
				| 'customer_partial_payment_recorded'
				| 'customer_order_sent_to_inventory'
				| 'supplier_payment_discussion_started'
				| 'supplier_partial_payment_recorded'
				| 'supplier_refill_sent_to_warehouse'
				| 'supplier_receiving_issue_opened'
				| 'warehouse_driver_assigned'
				| 'warehouse_stock_assigned_to_driver'
				| 'warehouse_advisor_assigned'
				| 'warehouse_advisor_approved'
				| 'warehouse_loading_issue_opened'
				| 'customer_order_sent_to_dispatch'
				| 'warehouse_receiving_started'
				| 'warehouse_receiving_advisor_assigned'
				| 'warehouse_receiving_advisor_approved'
				| 'support_ticket_assigned'
				| 'support_ticket_replied'
				| 'support_ticket_closed'
				| 'whatsapp_support_message_received'
				| 'whatsapp_support_message_replied'
				| 'supplier_delivery_unloaded'
				| 'supplier_delivery_rejected'
				| 'inventory_stock_increased'
				| 'inventory_order_received'
				| 'inventory_stock_reserved'
				| 'inventory_stock_released'
				| 'inventory_stock_consumed'
				| 'driver_delivery_route_reopened'
				| 'inventory_availability_updated'
				| 'inventory_price_marked_outdated'
				| 'finance_adjustment_created'
				| 'finance_journal_posted'
				| 'finance_journal_reversed'
				| 'finance_journal_voided'
				| 'finance_accounting_backfilled'
				| 'inventory_damage_recorded'
				| 'inventory_damage_sold'
				| 'inventory_damage_disposed'
				| 'inventory_damage_reversed'
				| 'finance_salary_updated'
				| 'finance_payroll_paid'
				| 'finance_bonus_paid'
				| 'driver_fuel_receipt_submitted'
				| 'finance_fuel_expense_posted'
				| 'finance_company_asset_recorded'
				| 'finance_company_asset_revalued'
				| 'finance_company_asset_disposed'
			catalog_availability_status:
				| 'available'
				| 'low_stock'
				| 'out_of_stock'
				| 'hidden'
			company_asset_funding_source:
				| 'cash_purchase'
				| 'opening_balance'
				| 'owner_contribution'
			company_asset_status: 'active' | 'disposed'
			company_asset_type:
				| 'building'
				| 'vehicle'
				| 'truck'
				| 'equipment'
				| 'furniture'
				| 'technology'
				| 'other'
			customer_payment_history: 'excellent' | 'good' | 'fair' | 'poor'
			customer_status: 'unclaimed' | 'claimed' | 'active' | 'inactive'
			customer_tier: 'A' | 'B' | 'C' | 'new'
			delivery_proof_type: 'signature' | 'photo' | 'note'
			delivery_status:
				| 'assigned'
				| 'accepted'
				| 'in_transit'
				| 'arrived'
				| 'completed'
				| 'rejected'
			document_type: 'invoice' | 'delivery_note' | 'quote_pdf' | 'certificate'
			driver_location_source: 'driver_app' | 'dispatch' | 'system'
			driver_online_status: 'online' | 'offline'
			driver_status:
				| 'invited'
				| 'available'
				| 'on_delivery'
				| 'offline'
				| 'disabled'
			employee_panel:
				| 'sales'
				| 'inventory'
				| 'warehouse'
				| 'finance'
				| 'dispatch'
				| 'customer_service'
				| 'admin'
				| 'search'
			employee_presence_status: 'online' | 'away' | 'offline'
			employee_role:
				| 'admin'
				| 'sales'
				| 'inventory'
				| 'warehouse'
				| 'finance'
				| 'dispatch'
				| 'customer_service'
				| 'driver_manager'
				| 'ceo'
			finance_account_class:
				| 'asset'
				| 'liability'
				| 'equity'
				| 'revenue'
				| 'expense'
			finance_adjustment_status:
				| 'draft'
				| 'review_required'
				| 'posted'
				| 'voided'
			finance_adjustment_type:
				| 'company_expense'
				| 'damage'
				| 'refund'
				| 'write_off'
				| 'credit_adjustment'
				| 'debit_adjustment'
			finance_journal_source_type:
				| 'customer_payment'
				| 'supplier_payment'
				| 'order'
				| 'refill_request'
				| 'employee_compensation'
				| 'proof_document'
				| 'activity_event'
				| 'manual_adjustment'
				| 'warehouse_receiving'
				| 'dispatch_delivery'
				| 'inventory_damage_lot'
				| 'inventory_damage_transaction'
				| 'employee_payroll_payment'
				| 'truck_fuel_expense'
				| 'company_asset'
			finance_journal_status: 'draft' | 'posted' | 'voided' | 'reversed'
			finance_normal_balance: 'debit' | 'credit'
			finance_payroll_payment_status: 'paid' | 'reversed'
			finance_payroll_payment_type: 'salary' | 'bonus'
			inventory_damage_lot_status:
				| 'open'
				| 'sold'
				| 'disposed'
				| 'reversed'
				| 'closed'
			inventory_damage_transaction_type:
				| 'recorded'
				| 'sold'
				| 'disposed'
				| 'reversed'
			inventory_reservation_status: 'reserved' | 'released' | 'consumed'
			loading_task_status: 'pending' | 'loading' | 'approved' | 'rejected'
			notification_channel: 'email' | 'sms' | 'whatsapp' | 'push'
			order_workflow_status:
				| 'confirmed_for_inventory'
				| 'inventory_reserved'
				| 'warehouse_loading'
				| 'dispatch_ready'
				| 'dispatch_assigned'
				| 'out_for_delivery'
				| 'delivered'
				| 'rejected'
				| 'canceled'
			payment_record_status: 'recorded' | 'voided'
			price_tier: 'budget' | 'mid_range' | 'premium'
			price_update_request_status: 'pending' | 'resolved' | 'canceled'
			profile_status: 'invited' | 'active' | 'disabled'
			quote_counter_type: 'total' | 'per_line'
			quote_item_line_status: 'quoted' | 'accepted' | 'rejected' | 'negotiate'
			quote_request_status:
				| 'draft'
				| 'submitted'
				| 'assigned'
				| 'saved'
				| 'reviewing'
				| 'awaiting_clarification'
				| 'quoting'
				| 'quoted'
				| 'approved'
				| 'rejected'
				| 'declined'
				| 'expired'
				| 'canceled'
			quote_request_urgency: 'standard' | 'urgent'
			quote_status:
				| 'draft'
				| 'internal_review'
				| 'pending_approval'
				| 'approved'
				| 'sent'
				| 'viewed'
				| 'negotiating'
				| 'revised'
				| 'accepted'
				| 'declined'
				| 'expired'
				| 'canceled'
				| 'cancelled'
				| 'requires_re_quote'
			receiving_task_status: 'pending' | 'approved' | 'rejected'
			referral_status: 'pending' | 'converted' | 'credited' | 'canceled'
			refill_request_status:
				| 'finance_pending'
				| 'finance_approved'
				| 'warehouse_receiving'
				| 'received'
				| 'rejected'
				| 'canceled'
			sales_quote_version_status: 'draft' | 'approved' | 'sent' | 'rejected'
			supplier_status: 'active' | 'inactive' | 'blocked'
			support_channel: 'email' | 'whatsapp'
			support_conversation_status: 'open' | 'closed'
			support_message_channel: 'email' | 'whatsapp' | 'portal' | 'website'
			support_sender_type: 'customer' | 'employee' | 'system' | 'external'
			support_ticket_source:
				| 'website'
				| 'portal'
				| 'whatsapp'
				| 'internal'
				| 'email'
			support_ticket_status: 'open' | 'pending' | 'closed'
			team_invite_status: 'pending' | 'accepted' | 'revoked'
			team_member_role: 'owner' | 'admin' | 'member'
			trade_license_status:
				| 'not_uploaded'
				| 'under_review'
				| 'approved'
				| 'rejected'
			truck_fuel_expense_status:
				| 'submitted'
				| 'posted'
				| 'rejected'
				| 'reversed'
			truck_status: 'available' | 'loading' | 'dispatched' | 'maintenance'
			user_profile_type: 'customer' | 'internal' | 'driver'
			user_role:
				| 'customer'
				| 'approver'
				| 'admin'
				| 'sales'
				| 'inventory'
				| 'warehouse'
				| 'finance'
				| 'dispatch'
				| 'customer_service'
				| 'driver_manager'
				| 'driver'
				| 'ceo'
		}
		CompositeTypes: {
			[_ in never]: never
		}
	}
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
				DefaultSchema['Views'])
		? (DefaultSchema['Tables'] &
				DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R
			}
			? R
			: never
		: never

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I
			}
			? I
			: never
		: never

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U
			}
			? U
			: never
		: never

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never

export const Constants = {
	public: {
		Enums: {
			account_type: ['customer', 'employee', 'driver'],
			ai_agent_scope: ['website', 'portal', 'employee', 'search'],
			approval_status: [
				'pending',
				'approved',
				'changes_requested',
				'rejected',
				'canceled',
			],
			audit_event_type: [
				'driver_marked_online',
				'driver_marked_offline',
				'customer_profile_claimed',
				'quote_request_submitted',
				'quote_accepted',
				'customer_quote_accepted',
				'customer_quote_declined',
				'customer_quote_negotiation_requested',
				'customer_quote_line_response_submitted',
				'sales_order_claimed',
				'sales_order_requeued',
				'sales_call_note_recorded',
				'sales_quote_draft_saved',
				'sales_quote_approved',
				'sales_order_confirmed',
				'sales_order_rejected',
				'sales_order_canceled',
				'manual_order_created',
				'price_update_requested',
				'inventory_price_updated',
				'supplier_refill_created',
				'customer_payment_recorded',
				'supplier_payment_recorded',
				'inventory_order_evaluated',
				'order_stock_reserved',
				'warehouse_loading_started',
				'warehouse_loading_approved',
				'warehouse_loading_rejected',
				'warehouse_receiving_approved',
				'warehouse_receiving_rejected',
				'dispatch_driver_assigned',
				'dispatch_delivery_completed',
				'dispatch_delivery_rejected',
				'delivery_returned_to_warehouse_loading',
				'driver_delivery_accepted',
				'driver_delivery_started',
				'driver_delivery_arrived',
				'driver_delivery_confirmed',
				'driver_delivery_rejected',
				'support_ticket_created',
				'support_reply_sent',
				'whatsapp_message_ingested',
				'warehouse_loading_driver_assigned',
				'warehouse_loading_driver_removed',
				'warehouse_loading_item_toggled',
				'warehouse_loading_marked_ready',
				'warehouse_loading_reset',
				'support_status_updated',
				'support_assigned',
				'admin_record_created',
				'admin_record_updated',
				'admin_record_deactivated',
				'admin_export_created',
				'employee_role_assigned',
				'employee_role_removed',
				'driver_location_updated',
				'driver_assigned_delivery',
				'customer_signature_captured',
				'driver_rejection_proof_uploaded',
				'internal_employee_created',
				'internal_employee_role_assigned',
				'internal_employee_role_removed',
				'customer_payment_followup_recorded',
				'supplier_payment_followup_recorded',
				'supplier_refill_canceled',
				'driver_team_message_sent',
				'website_draft_saved',
				'portal_draft_saved',
				'customer_order_saved_as_draft',
				'portal_order_viewed',
				'customer_signed_up',
				'customer_signed_in',
				'draft_created',
				'draft_updated',
				'draft_saved',
				'draft_submitted',
				'order_submitted',
				'support_ticket_notification_sent',
				'support_ticket_reply_sent',
				'sales_order_opened',
				'sales_customer_called',
				'sales_quote_edited',
				'support_conversation_linked_to_customer',
				'admin_role_assigned',
				'admin_role_removed',
				'admin_database_exported',
				'search_query_executed',
				'driver_assignment_notified',
				'driver_arrived',
				'driver_delivery_returned_to_warehouse_loading',
				'dispatch_delivery_created',
				'dispatch_delivery_delivered',
				'dispatch_delivery_exception_opened',
				'dispatch_delivery_status_updated',
				'dispatch_truck_location_updated',
				'sales_order_auto_assigned',
				'sales_order_saved',
				'manual_order_started',
				'provisional_customer_created',
				'provisional_customer_confirmed',
				'manual_order_quoted',
				'sales_order_sent_to_finance',
				'supplier_price_proof_uploaded',
				'item_price_updated',
				'inventory_refill_started',
				'supplier_refill_deal_created',
				'supplier_refill_sent_to_finance',
				'customer_payment_discussion_started',
				'customer_partial_payment_recorded',
				'customer_order_sent_to_inventory',
				'supplier_payment_discussion_started',
				'supplier_partial_payment_recorded',
				'supplier_refill_sent_to_warehouse',
				'supplier_receiving_issue_opened',
				'warehouse_driver_assigned',
				'warehouse_stock_assigned_to_driver',
				'warehouse_advisor_assigned',
				'warehouse_advisor_approved',
				'warehouse_loading_issue_opened',
				'customer_order_sent_to_dispatch',
				'warehouse_receiving_started',
				'warehouse_receiving_advisor_assigned',
				'warehouse_receiving_advisor_approved',
				'support_ticket_assigned',
				'support_ticket_replied',
				'support_ticket_closed',
				'whatsapp_support_message_received',
				'whatsapp_support_message_replied',
				'supplier_delivery_unloaded',
				'supplier_delivery_rejected',
				'inventory_stock_increased',
				'inventory_order_received',
				'inventory_stock_reserved',
				'inventory_stock_released',
				'inventory_stock_consumed',
				'driver_delivery_route_reopened',
				'inventory_availability_updated',
				'inventory_price_marked_outdated',
				'finance_adjustment_created',
				'finance_journal_posted',
				'finance_journal_reversed',
				'finance_journal_voided',
				'finance_accounting_backfilled',
				'inventory_damage_recorded',
				'inventory_damage_sold',
				'inventory_damage_disposed',
				'inventory_damage_reversed',
				'finance_salary_updated',
				'finance_payroll_paid',
				'finance_bonus_paid',
				'driver_fuel_receipt_submitted',
				'finance_fuel_expense_posted',
				'finance_company_asset_recorded',
				'finance_company_asset_revalued',
				'finance_company_asset_disposed',
			],
			catalog_availability_status: [
				'available',
				'low_stock',
				'out_of_stock',
				'hidden',
			],
			company_asset_funding_source: [
				'cash_purchase',
				'opening_balance',
				'owner_contribution',
			],
			company_asset_status: ['active', 'disposed'],
			company_asset_type: [
				'building',
				'vehicle',
				'truck',
				'equipment',
				'furniture',
				'technology',
				'other',
			],
			customer_payment_history: ['excellent', 'good', 'fair', 'poor'],
			customer_status: ['unclaimed', 'claimed', 'active', 'inactive'],
			customer_tier: ['A', 'B', 'C', 'new'],
			delivery_proof_type: ['signature', 'photo', 'note'],
			delivery_status: [
				'assigned',
				'accepted',
				'in_transit',
				'arrived',
				'completed',
				'rejected',
			],
			document_type: ['invoice', 'delivery_note', 'quote_pdf', 'certificate'],
			driver_location_source: ['driver_app', 'dispatch', 'system'],
			driver_online_status: ['online', 'offline'],
			driver_status: [
				'invited',
				'available',
				'on_delivery',
				'offline',
				'disabled',
			],
			employee_panel: [
				'sales',
				'inventory',
				'warehouse',
				'finance',
				'dispatch',
				'customer_service',
				'admin',
				'search',
			],
			employee_presence_status: ['online', 'away', 'offline'],
			employee_role: [
				'admin',
				'sales',
				'inventory',
				'warehouse',
				'finance',
				'dispatch',
				'customer_service',
				'driver_manager',
				'ceo',
			],
			finance_account_class: [
				'asset',
				'liability',
				'equity',
				'revenue',
				'expense',
			],
			finance_adjustment_status: [
				'draft',
				'review_required',
				'posted',
				'voided',
			],
			finance_adjustment_type: [
				'company_expense',
				'damage',
				'refund',
				'write_off',
				'credit_adjustment',
				'debit_adjustment',
			],
			finance_journal_source_type: [
				'customer_payment',
				'supplier_payment',
				'order',
				'refill_request',
				'employee_compensation',
				'proof_document',
				'activity_event',
				'manual_adjustment',
				'warehouse_receiving',
				'dispatch_delivery',
				'inventory_damage_lot',
				'inventory_damage_transaction',
				'employee_payroll_payment',
				'truck_fuel_expense',
				'company_asset',
			],
			finance_journal_status: ['draft', 'posted', 'voided', 'reversed'],
			finance_normal_balance: ['debit', 'credit'],
			finance_payroll_payment_status: ['paid', 'reversed'],
			finance_payroll_payment_type: ['salary', 'bonus'],
			inventory_damage_lot_status: [
				'open',
				'sold',
				'disposed',
				'reversed',
				'closed',
			],
			inventory_damage_transaction_type: [
				'recorded',
				'sold',
				'disposed',
				'reversed',
			],
			inventory_reservation_status: ['reserved', 'released', 'consumed'],
			loading_task_status: ['pending', 'loading', 'approved', 'rejected'],
			notification_channel: ['email', 'sms', 'whatsapp', 'push'],
			order_workflow_status: [
				'confirmed_for_inventory',
				'inventory_reserved',
				'warehouse_loading',
				'dispatch_ready',
				'dispatch_assigned',
				'out_for_delivery',
				'delivered',
				'rejected',
				'canceled',
			],
			payment_record_status: ['recorded', 'voided'],
			price_tier: ['budget', 'mid_range', 'premium'],
			price_update_request_status: ['pending', 'resolved', 'canceled'],
			profile_status: ['invited', 'active', 'disabled'],
			quote_counter_type: ['total', 'per_line'],
			quote_item_line_status: ['quoted', 'accepted', 'rejected', 'negotiate'],
			quote_request_status: [
				'draft',
				'submitted',
				'assigned',
				'saved',
				'reviewing',
				'awaiting_clarification',
				'quoting',
				'quoted',
				'approved',
				'rejected',
				'declined',
				'expired',
				'canceled',
			],
			quote_request_urgency: ['standard', 'urgent'],
			quote_status: [
				'draft',
				'internal_review',
				'pending_approval',
				'approved',
				'sent',
				'viewed',
				'negotiating',
				'revised',
				'accepted',
				'declined',
				'expired',
				'canceled',
				'cancelled',
				'requires_re_quote',
			],
			receiving_task_status: ['pending', 'approved', 'rejected'],
			referral_status: ['pending', 'converted', 'credited', 'canceled'],
			refill_request_status: [
				'finance_pending',
				'finance_approved',
				'warehouse_receiving',
				'received',
				'rejected',
				'canceled',
			],
			sales_quote_version_status: ['draft', 'approved', 'sent', 'rejected'],
			supplier_status: ['active', 'inactive', 'blocked'],
			support_channel: ['email', 'whatsapp'],
			support_conversation_status: ['open', 'closed'],
			support_message_channel: ['email', 'whatsapp', 'portal', 'website'],
			support_sender_type: ['customer', 'employee', 'system', 'external'],
			support_ticket_source: [
				'website',
				'portal',
				'whatsapp',
				'internal',
				'email',
			],
			support_ticket_status: ['open', 'pending', 'closed'],
			team_invite_status: ['pending', 'accepted', 'revoked'],
			team_member_role: ['owner', 'admin', 'member'],
			trade_license_status: [
				'not_uploaded',
				'under_review',
				'approved',
				'rejected',
			],
			truck_fuel_expense_status: [
				'submitted',
				'posted',
				'rejected',
				'reversed',
			],
			truck_status: ['available', 'loading', 'dispatched', 'maintenance'],
			user_profile_type: ['customer', 'internal', 'driver'],
			user_role: [
				'customer',
				'approver',
				'admin',
				'sales',
				'inventory',
				'warehouse',
				'finance',
				'dispatch',
				'customer_service',
				'driver_manager',
				'driver',
				'ceo',
			],
		},
	},
} as const
