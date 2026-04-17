/** Branded string for YYYY-MM-DD date format */
export type ISODate = string & { readonly __brand: 'ISODate' }

/** Branded string for ISO 8601 datetime format */
export type ISODateTime = string & { readonly __brand: 'ISODateTime' }

/** Base entity with UUID primary key and timestamps */
export interface BaseEntity {
	id: string
	created_at: ISODateTime
	updated_at: ISODateTime
}

/** Tenant-scoped entity with tenant_id */
export interface TenantEntity extends BaseEntity {
	tenant_id: string
}
