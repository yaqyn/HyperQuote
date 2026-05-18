export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[]

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never
		}
		Views: {
			[_ in never]: never
		}
		Functions: {
			graphql: {
				Args: {
					extensions?: Json
					operationName?: string
					query?: string
					variables?: Json
				}
				Returns: Json
			}
		}
		Enums: {
			[_ in never]: never
		}
		CompositeTypes: {
			[_ in never]: never
		}
	}
	public: {
		Tables: {
			activity_events: {
				Row: {
					action: string
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
					action: string
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
					action?: string
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
						referencedRelation: 'customers'
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
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			ai_tool_call_audit: {
				Row: {
					actor_employee_id: string | null
					actor_user_id: string | null
					agent_scope: string
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
					agent_scope: string
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
					agent_scope?: string
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
					status: string
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
					status?: string
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
					status?: string
					updated_at?: string
				}
				Relationships: []
			}
			categories: {
				Row: {
					created_at: string
					id: string
					is_active: boolean
					name: string
					name_ar: string | null
					parent_id: string | null
					slug: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					id?: string
					is_active?: boolean
					name: string
					name_ar?: string | null
					parent_id?: string | null
					slug: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					id?: string
					is_active?: boolean
					name?: string
					name_ar?: string | null
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
					status: string
				}
				Insert: {
					amount: number
					created_at?: string
					id?: string
					order_id: string
					payment_fraction: number
					proof_path: string
					recorded_by_employee_id?: string | null
					status?: string
				}
				Update: {
					amount?: number
					created_at?: string
					id?: string
					order_id?: string
					payment_fraction?: number
					proof_path?: string
					recorded_by_employee_id?: string | null
					status?: string
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
						referencedRelation: 'employees'
						referencedColumns: ['id']
					},
				]
			}
			customers: {
				Row: {
					company_name: string
					contact_name: string
					created_at: string
					created_by_employee_id: string | null
					email: string | null
					id: string
					phone: string
					profile_photo_url: string | null
					status: string
					trade_license_status: string
					updated_at: string
					user_id: string | null
				}
				Insert: {
					company_name: string
					contact_name: string
					created_at?: string
					created_by_employee_id?: string | null
					email?: string | null
					id?: string
					phone: string
					profile_photo_url?: string | null
					status?: string
					trade_license_status?: string
					updated_at?: string
					user_id?: string | null
				}
				Update: {
					company_name?: string
					contact_name?: string
					created_at?: string
					created_by_employee_id?: string | null
					email?: string | null
					id?: string
					phone?: string
					profile_photo_url?: string | null
					status?: string
					trade_license_status?: string
					updated_at?: string
					user_id?: string | null
				}
				Relationships: [
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
					status: string
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
					status?: string
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
					status?: string
					truck_id?: string | null
					updated_at?: string
				}
				Relationships: [
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
					proof_type: string
					signer_name: string | null
				}
				Insert: {
					created_at?: string
					delivery_id: string
					driver_id?: string | null
					id?: string
					location?: Json
					proof_path?: string | null
					proof_type: string
					signer_name?: string | null
				}
				Update: {
					created_at?: string
					delivery_id?: string
					driver_id?: string | null
					id?: string
					location?: Json
					proof_path?: string | null
					proof_type?: string
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
					type: string
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
					type: string
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
					type?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'documents_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
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
					source: string
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
					source?: string
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
					source?: string
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
						referencedRelation: 'drivers'
						referencedColumns: ['id']
					},
				]
			}
			driver_online_states: {
				Row: {
					driver_id: string
					last_seen_at: string
					status: string
					updated_at: string
				}
				Insert: {
					driver_id: string
					last_seen_at?: string
					status?: string
					updated_at?: string
				}
				Update: {
					driver_id?: string
					last_seen_at?: string
					status?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'driver_online_states_driver_id_fkey'
						columns: ['driver_id']
						isOneToOne: true
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
					status: string
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
					status?: string
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
					status?: string
					updated_at?: string
					user_id?: string | null
					vehicle_label?: string | null
				}
				Relationships: []
			}
			employee_panel_permissions: {
				Row: {
					can_read: boolean
					can_write: boolean
					created_at: string
					employee_id: string
					id: string
					panel: string
				}
				Insert: {
					can_read?: boolean
					can_write?: boolean
					created_at?: string
					employee_id: string
					id?: string
					panel: string
				}
				Update: {
					can_read?: boolean
					can_write?: boolean
					created_at?: string
					employee_id?: string
					id?: string
					panel?: string
				}
				Relationships: [
					{
						foreignKeyName: 'employee_panel_permissions_employee_id_fkey'
						columns: ['employee_id']
						isOneToOne: false
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
					role: string
				}
				Insert: {
					created_at?: string
					employee_id: string
					id?: string
					role: string
				}
				Update: {
					created_at?: string
					employee_id?: string
					id?: string
					role?: string
				}
				Relationships: [
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
					status: string
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
					status?: string
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
					status?: string
					updated_at?: string
					user_id?: string | null
				}
				Relationships: []
			}
			inventory_reservations: {
				Row: {
					created_at: string
					created_by_employee_id: string | null
					id: string
					order_id: string
					product_id: string
					quantity: number
					status: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					created_by_employee_id?: string | null
					id?: string
					order_id: string
					product_id: string
					quantity: number
					status?: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					created_by_employee_id?: string | null
					id?: string
					order_id?: string
					product_id?: string
					quantity?: number
					status?: string
					updated_at?: string
				}
				Relationships: [
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
					id: string
					minimum_quantity: number
					on_hand_quantity: number
					product_id: string
					reserved_quantity: number
					updated_at: string
				}
				Insert: {
					available_quantity?: number | null
					id?: string
					minimum_quantity?: number
					on_hand_quantity?: number
					product_id: string
					reserved_quantity?: number
					updated_at?: string
				}
				Update: {
					available_quantity?: number | null
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
						referencedRelation: 'drivers'
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
					status: string
					updated_at: string
				}
				Insert: {
					advisor_employee_id?: string | null
					created_at?: string
					id?: string
					order_id: string
					proof?: Json
					rejection_reason?: string | null
					status?: string
					updated_at?: string
				}
				Update: {
					advisor_employee_id?: string | null
					created_at?: string
					id?: string
					order_id?: string
					proof?: Json
					rejection_reason?: string | null
					status?: string
					updated_at?: string
				}
				Relationships: [
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
						isOneToOne: false
						referencedRelation: 'ceo_order_summary'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'loading_tasks_order_id_fkey'
						columns: ['order_id']
						isOneToOne: false
						referencedRelation: 'orders'
						referencedColumns: ['id']
					},
				]
			}
			notification_preferences: {
				Row: {
					channel: string
					created_at: string
					customer_id: string | null
					enabled: boolean
					id: string
					updated_at: string
					user_id: string | null
				}
				Insert: {
					channel: string
					created_at?: string
					customer_id?: string | null
					enabled?: boolean
					id?: string
					updated_at?: string
					user_id?: string | null
				}
				Update: {
					channel?: string
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
					status: string
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
					status?: string
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
					status?: string
					total_amount?: number
					updated_at?: string
				}
				Relationships: [
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
						isOneToOne: false
						referencedRelation: 'quotes'
						referencedColumns: ['id']
					},
					{
						foreignKeyName: 'orders_quote_request_id_fkey'
						columns: ['quote_request_id']
						isOneToOne: false
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
					reason: string
					requested_by_employee_id: string | null
					resolved_at: string | null
					status: string
					updated_at: string
				}
				Insert: {
					assigned_employee_id?: string | null
					created_at?: string
					id?: string
					product_id: string
					quote_request_id?: string | null
					reason: string
					requested_by_employee_id?: string | null
					resolved_at?: string | null
					status?: string
					updated_at?: string
				}
				Update: {
					assigned_employee_id?: string | null
					created_at?: string
					id?: string
					product_id?: string
					quote_request_id?: string | null
					reason?: string
					requested_by_employee_id?: string | null
					resolved_at?: string | null
					status?: string
					updated_at?: string
				}
				Relationships: [
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
						referencedRelation: 'quote_requests'
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
						referencedRelation: 'suppliers'
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
			products: {
				Row: {
					availability_status: string
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
					price_tier: string | null
					search_vector: unknown
					sku: string
					slug: string
					specifications: Json
					subcategory: string | null
					tags: string[]
					unit_of_measure: string
					updated_at: string
					weight_kg: number | null
				}
				Insert: {
					availability_status?: string
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
					price_tier?: string | null
					search_vector?: unknown
					sku: string
					slug: string
					specifications?: Json
					subcategory?: string | null
					tags?: string[]
					unit_of_measure: string
					updated_at?: string
					weight_kg?: number | null
				}
				Update: {
					availability_status?: string
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
					price_tier?: string | null
					search_vector?: unknown
					sku?: string
					slug?: string
					specifications?: Json
					subcategory?: string | null
					tags?: string[]
					unit_of_measure?: string
					updated_at?: string
					weight_kg?: number | null
				}
				Relationships: []
			}
			profiles: {
				Row: {
					account_type: string
					auth_user_id: string
					created_at: string
					display_name: string
					email: string | null
					id: string
					locale: string
					phone: string | null
					status: string
					updated_at: string
				}
				Insert: {
					account_type: string
					auth_user_id: string
					created_at?: string
					display_name: string
					email?: string | null
					id?: string
					locale?: string
					phone?: string | null
					status?: string
					updated_at?: string
				}
				Update: {
					account_type?: string
					auth_user_id?: string
					created_at?: string
					display_name?: string
					email?: string | null
					id?: string
					locale?: string
					phone?: string | null
					status?: string
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
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			quote_counter_offers: {
				Row: {
					counter_type: string
					created_at: string
					id: string
					line_items: Json | null
					notes: string | null
					quote_id: string
					self_pickup: boolean
					total_discount: number | null
				}
				Insert: {
					counter_type: string
					created_at?: string
					id?: string
					line_items?: Json | null
					notes?: string | null
					quote_id: string
					self_pickup?: boolean
					total_discount?: number | null
				}
				Update: {
					counter_type?: string
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
					line_status: string
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
					unit_price: number
					updated_at: string
				}
				Insert: {
					created_at?: string
					customer_counter_price?: number | null
					id?: string
					is_accepted?: boolean
					line_status?: string
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
					unit_price: number
					updated_at?: string
				}
				Update: {
					created_at?: string
					customer_counter_price?: number | null
					id?: string
					is_accepted?: boolean
					line_status?: string
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
					customer_description: string
					id: string
					is_unmatched: boolean
					match_confidence: number | null
					notes: string | null
					product_id: string | null
					quantity: number
					quote_request_id: string
					sort_order: number
					unit_of_measure: string
				}
				Insert: {
					created_at?: string
					customer_description: string
					id?: string
					is_unmatched?: boolean
					match_confidence?: number | null
					notes?: string | null
					product_id?: string | null
					quantity: number
					quote_request_id: string
					sort_order?: number
					unit_of_measure: string
				}
				Update: {
					created_at?: string
					customer_description?: string
					id?: string
					is_unmatched?: boolean
					match_confidence?: number | null
					notes?: string | null
					product_id?: string | null
					quantity?: number
					quote_request_id?: string
					sort_order?: number
					unit_of_measure?: string
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
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: string
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: string
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
					eligible_at?: string
					id?: string
					idempotency_key?: string | null
					notes?: string | null
					project_id?: string | null
					rejected_proof?: Json | null
					rejected_reason?: string | null
					request_number?: string
					status?: string
					submitted_at?: string | null
					submitted_by?: string | null
					updated_at?: string
					urgency?: string
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
					eligible_at?: string
					id?: string
					idempotency_key?: string | null
					notes?: string | null
					project_id?: string | null
					rejected_proof?: Json | null
					rejected_reason?: string | null
					request_number?: string
					status?: string
					submitted_at?: string | null
					submitted_by?: string | null
					updated_at?: string
					urgency?: string
				}
				Relationships: [
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
					status: string
					subtotal: number
					total: number
					version_number: number
				}
				Insert: {
					created_at?: string
					id?: string
					notes?: string | null
					quote_id: string
					status?: string
					subtotal?: number
					total?: number
					version_number: number
				}
				Update: {
					created_at?: string
					id?: string
					notes?: string | null
					quote_id?: string
					status?: string
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
					status: string
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
					status?: string
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
					status?: string
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
					status: string
					updated_at: string
				}
				Insert: {
					advisor_employee_id?: string | null
					created_at?: string
					id?: string
					proof?: Json
					refill_request_id: string
					rejection_reason?: string | null
					status?: string
					updated_at?: string
				}
				Update: {
					advisor_employee_id?: string | null
					created_at?: string
					id?: string
					proof?: Json
					refill_request_id?: string
					rejection_reason?: string | null
					status?: string
					updated_at?: string
				}
				Relationships: [
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
						isOneToOne: false
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
					status: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					customer_id: string
					id?: string
					referral_code: string
					referred_email?: string | null
					status?: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					customer_id?: string
					id?: string
					referral_code?: string
					referred_email?: string | null
					status?: string
					updated_at?: string
				}
				Relationships: [
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
					status: string
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
					status?: string
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
					status?: string
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
						referencedRelation: 'employees'
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
						referencedRelation: 'employees'
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
					status: string
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
					status?: string
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
					status?: string
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
						referencedRelation: 'employees'
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
					status: string
				}
				Insert: {
					amount: number
					created_at?: string
					id?: string
					payment_fraction: number
					proof_path: string
					recorded_by_employee_id?: string | null
					refill_request_id: string
					status?: string
				}
				Update: {
					amount?: number
					created_at?: string
					id?: string
					payment_fraction?: number
					proof_path?: string
					recorded_by_employee_id?: string | null
					refill_request_id?: string
					status?: string
				}
				Relationships: [
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
						referencedRelation: 'suppliers'
						referencedColumns: ['id']
					},
				]
			}
			suppliers: {
				Row: {
					created_at: string
					email: string | null
					id: string
					name: string
					notes: string | null
					phone: string | null
					status: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					email?: string | null
					id?: string
					name: string
					notes?: string | null
					phone?: string | null
					status?: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					email?: string | null
					id?: string
					name?: string
					notes?: string | null
					phone?: string | null
					status?: string
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
					channel: string
					created_at: string
					customer_id: string | null
					email: string | null
					external_thread_id: string | null
					id: string
					phone: string | null
					status: string
					updated_at: string
				}
				Insert: {
					channel: string
					created_at?: string
					customer_id?: string | null
					email?: string | null
					external_thread_id?: string | null
					id?: string
					phone?: string | null
					status?: string
					updated_at?: string
				}
				Update: {
					channel?: string
					created_at?: string
					customer_id?: string | null
					email?: string | null
					external_thread_id?: string | null
					id?: string
					phone?: string | null
					status?: string
					updated_at?: string
				}
				Relationships: [
					{
						foreignKeyName: 'support_conversations_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			support_messages: {
				Row: {
					body: string
					channel: string
					conversation_id: string | null
					created_at: string
					external_message_id: string | null
					id: string
					sender_type: string
					sender_user_id: string | null
					ticket_id: string | null
				}
				Insert: {
					body: string
					channel: string
					conversation_id?: string | null
					created_at?: string
					external_message_id?: string | null
					id?: string
					sender_type: string
					sender_user_id?: string | null
					ticket_id?: string | null
				}
				Update: {
					body?: string
					channel?: string
					conversation_id?: string | null
					created_at?: string
					external_message_id?: string | null
					id?: string
					sender_type?: string
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
					created_at: string
					customer_id: string | null
					id: string
					reference: string
					requester_email: string
					requester_name: string | null
					requester_phone: string | null
					source: string
					status: string
					subject: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					customer_id?: string | null
					id?: string
					reference?: string
					requester_email: string
					requester_name?: string | null
					requester_phone?: string | null
					source?: string
					status?: string
					subject: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					customer_id?: string | null
					id?: string
					reference?: string
					requester_email?: string
					requester_name?: string | null
					requester_phone?: string | null
					source?: string
					status?: string
					subject?: string
					updated_at?: string
				}
				Relationships: [
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
					role: string
					status: string
					updated_at: string
				}
				Insert: {
					created_at?: string
					customer_id: string
					email: string
					id?: string
					role?: string
					status?: string
					updated_at?: string
				}
				Update: {
					created_at?: string
					customer_id?: string
					email?: string
					id?: string
					role?: string
					status?: string
					updated_at?: string
				}
				Relationships: [
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
					role: string
					user_id: string | null
				}
				Insert: {
					created_at?: string
					customer_id: string
					id?: string
					role?: string
					user_id?: string | null
				}
				Update: {
					created_at?: string
					customer_id?: string
					id?: string
					role?: string
					user_id?: string | null
				}
				Relationships: [
					{
						foreignKeyName: 'team_members_customer_id_fkey'
						columns: ['customer_id']
						isOneToOne: false
						referencedRelation: 'customers'
						referencedColumns: ['id']
					},
				]
			}
			trucks: {
				Row: {
					capacity_tons: number | null
					created_at: string
					driver_id: string | null
					id: string
					plate_number: string
					status: string
					updated_at: string
				}
				Insert: {
					capacity_tons?: number | null
					created_at?: string
					driver_id?: string | null
					id?: string
					plate_number: string
					status?: string
					updated_at?: string
				}
				Update: {
					capacity_tons?: number | null
					created_at?: string
					driver_id?: string | null
					id?: string
					plate_number?: string
					status?: string
					updated_at?: string
				}
				Relationships: [
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
					user_type: string
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
					user_type: string
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
					user_type?: string
				}
				Relationships: [
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
						referencedRelation: 'drivers'
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
					role: string
					user_profile_id: string
				}
				Insert: {
					created_at?: string
					id?: string
					role: string
					user_profile_id: string
				}
				Update: {
					created_at?: string
					id?: string
					role?: string
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
			ceo_dispatch_summary: {
				Row: {
					completed_at: string | null
					delivery_number: string | null
					driver_name: string | null
					id: string | null
					order_id: string | null
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
			ceo_finance_summary: {
				Row: {
					amount: number | null
					created_at: string | null
					entity_id: string | null
					id: string | null
					payment_fraction: number | null
					source: string | null
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
			ceo_search_index: {
				Row: {
					entity_id: string | null
					entity_type: string | null
					metadata: Json | null
					subtitle: string | null
					title: string | null
				}
				Relationships: []
			}
		}
		Functions: {
			can_access_panel: {
				Args: { required_panel: string; write_required?: boolean }
				Returns: boolean
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
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: string
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: string
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
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: string
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: string
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
					status: string
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
					p_message: string
					p_requester_email: string
					p_requester_name?: string
					p_requester_phone?: string
					p_subject: string
				}
				Returns: {
					created_at: string
					customer_id: string | null
					id: string
					reference: string
					requester_email: string
					requester_name: string | null
					requester_phone: string | null
					source: string
					status: string
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
					status: string
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
					status: string
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
			driver_confirm_delivery: {
				Args: {
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
					status: string
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
					status: string
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
					source: string
					speed_kmh: number | null
				}
				SetofOptions: {
					from: '*'
					to: 'driver_locations'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			ingest_whatsapp_message: {
				Args: {
					p_body: string
					p_external_message_id?: string
					p_from_phone: string
				}
				Returns: {
					body: string
					channel: string
					conversation_id: string | null
					created_at: string
					external_message_id: string | null
					id: string
					sender_type: string
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
			is_employee_with_role: {
				Args: { required_role: string }
				Returns: boolean
			}
			log_activity: {
				Args: {
					action: string
					details?: Json
					entity_id: string
					entity_type: string
				}
				Returns: undefined
			}
			next_order_number: { Args: never; Returns: string }
			next_quote_request_number: { Args: never; Returns: string }
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
					status: string
				}
				SetofOptions: {
					from: '*'
					to: 'customer_payments'
					isOneToOne: true
					isSetofReturn: false
				}
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
					status: string
				}
				SetofOptions: {
					from: '*'
					to: 'supplier_payments'
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
					reason: string
					requested_by_employee_id: string | null
					resolved_at: string | null
					status: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'price_update_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			require_panel: {
				Args: { required_panel: string; write_required?: boolean }
				Returns: string
			}
			require_rejection_proof: { Args: { proof: Json }; Returns: undefined }
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
					status: string
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
					status: string
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
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: string
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: string
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			sales_save_and_requeue: {
				Args: { p_note?: string; p_order_id: string }
				Returns: {
					approval_required: boolean
					assigned_at: string | null
					assigned_employee_id: string | null
					attachment_urls: string[]
					created_at: string
					customer_id: string | null
					delivery_address_id: string | null
					delivery_date: string | null
					eligible_at: string
					id: string
					idempotency_key: string | null
					notes: string | null
					project_id: string | null
					rejected_proof: Json | null
					rejected_reason: string | null
					request_number: string
					status: string
					submitted_at: string | null
					submitted_by: string | null
					updated_at: string
					urgency: string
				}
				SetofOptions: {
					from: '*'
					to: 'quote_requests'
					isOneToOne: true
					isSetofReturn: false
				}
			}
			send_support_reply: {
				Args: { p_body: string; p_channel?: string; p_ticket_id: string }
				Returns: {
					body: string
					channel: string
					conversation_id: string | null
					created_at: string
					external_message_id: string | null
					id: string
					sender_type: string
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
					status: string
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
					status: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'receiving_tasks'
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
					status: string
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
					status: string
					updated_at: string
				}
				SetofOptions: {
					from: '*'
					to: 'receiving_tasks'
					isOneToOne: true
					isSetofReturn: false
				}
			}
		}
		Enums: {
			[_ in never]: never
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
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {},
	},
} as const
