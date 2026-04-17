import type {
	AppPermission,
	AppRole,
	ApprovalStatus,
	ApprovalType,
	AuditAction,
	EgyptianLicenseClass,
	InventoryCostingMethod,
	UserType,
} from './enums'
import type { BaseEntity, ISODate, ISODateTime, TenantEntity } from './helpers'

// =============================================================================
// tenants
// =============================================================================

export interface Tenant extends BaseEntity {
	name: string
	slug: string
	domain: string | null
	logo_url: string | null
	settings: Record<string, unknown>
	timezone: string
	currency: string
	tax_id: string | null
	commercial_register: string | null
	tax_registration_number: string | null
	inventory_costing_method: InventoryCostingMethod
	is_active: boolean
}

// =============================================================================
// employees
// =============================================================================

export interface Employee extends TenantEntity {
	user_id: string | null
	employee_number: string
	first_name_ar: string | null
	last_name_ar: string | null
	department: string
	title: string | null
	reports_to: string | null
	hire_date: ISODate | null
	base_salary: number | null
	social_insurance_salary: number | null
	is_driver: boolean
	cdl_class: EgyptianLicenseClass | null
	medical_card_expiry: ISODate | null
	drug_test_status: string | null
	moffett_certified: boolean
	is_active: boolean
	phone_extension: string | null
}

// =============================================================================
// user_profiles
// =============================================================================

export interface UserProfile extends BaseEntity {
	user_id: string
	tenant_id: string
	user_type: UserType
	pool: 'internal' | 'external'
	customer_id: string | null
	supplier_id: string | null
	driver_id: string | null
	employee_id: string | null
	first_name: string
	last_name: string
	display_name: string
	email: string
	phone: string | null
	avatar_url: string | null
	locale: string
	is_active: boolean
	last_login_at: ISODateTime | null
	mfa_enabled: boolean
}

// =============================================================================
// user_roles
// =============================================================================

export interface UserRole {
	id: number
	user_id: string
	role: AppRole
	tenant_id: string
	granted_by: string | null
	granted_at: ISODateTime
	expires_at: ISODateTime | null
}

// =============================================================================
// role_permissions
// =============================================================================

export interface RolePermission {
	id: number
	role: AppRole
	permission: AppPermission
}

// =============================================================================
// approvals
// =============================================================================

export interface Approval extends TenantEntity {
	approval_type: ApprovalType
	entity_type: string
	entity_id: string
	requested_by: string
	requested_at: ISODateTime
	assigned_to: string
	status: ApprovalStatus
	decision_notes: string | null
	decided_at: ISODateTime | null
	escalated_to: string | null
	escalated_at: ISODateTime | null
	escalation_reason: string | null
	expires_at: ISODateTime | null
	context: Record<string, unknown>
}

// =============================================================================
// audit_log
// =============================================================================

export interface AuditLogEntry {
	id: number
	tenant_id: string
	user_id: string | null
	user_email: string | null
	user_role: string | null
	ip_address: string | null
	user_agent: string | null
	action: AuditAction
	entity_type: string
	entity_id: string | null
	old_values: Record<string, unknown> | null
	new_values: Record<string, unknown> | null
	changed_fields: string[] | null
	description: string | null
	metadata: Record<string, unknown>
	created_at: ISODateTime
}
