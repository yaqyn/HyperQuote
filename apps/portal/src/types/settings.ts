/**
 * Settings types for portal settings window.
 * Customer profile, address, project, notification, appearance, and security settings.
 */

export type SettingsSection =
	| 'profile'
	| 'addresses'
	| 'projects'
	| 'notifications'
	| 'appearance'
	| 'security'

export interface CustomerProfile {
	authEmail?: string
	id: string
	companyName: string
	contactName: string
	phone: string
	email?: string
	emailChangeSentAt?: string
	emailConfirmed: boolean
	hasPassword: boolean
	pendingEmail?: string
	phoneConfirmed: boolean
	status: 'unclaimed' | 'claimed' | 'active' | 'inactive'
	tier: 'A' | 'B' | 'C' | 'new'
	creditLimit: number
	paymentHistory: 'excellent' | 'good' | 'fair' | 'poor'
	tradeLicenseStatus: 'not_uploaded' | 'under_review' | 'verified'
	profilePhotoUrl?: string
	createdAt: string
	updatedAt: string
}

export interface Address {
	id: string
	label: string
	street: string
	city: string
	governorate: string
	isDefault: boolean
	latitude: number | null
	longitude: number | null
	postalCode?: string
}

export interface Project {
	id: string
	name: string
	description?: string
	orderCount: number
	draftCount: number
	requestCount: number
	createdAt: string
	lastActivityAt: string
	archived: boolean
}

export interface NotificationPreference {
	channel: 'whatsapp' | 'email' | 'push' | 'sms'
	event:
		| 'quote_ready'
		| 'order_status'
		| 'delivery_update'
		| 'invoice_generated'
		| 'payment_confirmation'
		| 'support_response'
	enabled: boolean
}
