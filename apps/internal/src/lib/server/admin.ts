// Developer admin — server functions
//
// Admin volumes write through Supabase. All mutations validate input with Zod
// and persist through database-backed contracts.

import type { CatalogProduct } from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	CustomerRow,
	DriverRow,
	JsonObject,
	JsonValue,
	SupplierRow,
	TruckRow,
} from '../db/types'
import {
	getInternalSupabaseAdminClient,
	getInternalSupabaseClient,
} from './_supabase'
import { toJsonObject } from './json'

/**
 * Admin returns products with specifications narrowed to a JSON-safe
 * shape. CatalogProduct uses `Record<string, unknown>` which TanStack
 * Start's serializer cannot round-trip without widening to `unknown`.
 */
export type AdminProduct = Omit<
	CatalogProduct,
	'specifications' | 'specifications_ar'
> & {
	cost: number
	goodStockThreshold: number
	isVisible: boolean
	lowStockThreshold: number
	specifications: JsonObject
	specifications_ar: JsonObject
}

export interface AdminProductPayload {
	name: string
	name_ar: string
	category: string
	brand: string | null
	manufacturer: string
	cost: number
	isVisible: boolean
	weight_kg: number
	unit_of_measure: string
	unit_of_measure_ar: string
	description: string
	description_ar: string
	lowStockThreshold: number
	goodStockThreshold: number
	pictureUrl: string | null
}

export type AdminEmployeeRole =
	| 'admin'
	| 'sales'
	| 'inventory'
	| 'warehouse'
	| 'finance'
	| 'dispatch'
	| 'customer_service'
	| 'driver_manager'
	| 'ceo'

export interface AdminEmployeeRow {
	id: string
	name: string
	email: string
	phone: string
	status: 'invited' | 'active' | 'disabled'
	isCeo: boolean
	roles: AdminEmployeeRole[]
	department: string
	title: string
	hireDate: string
	baseSalary: number
	socialInsuranceSalary: number
	salaryCurrency: string
}

export interface AdminCategoryRow {
	id: string
	slug: string
	name: string
	name_ar: string
	description: string
	description_ar: string
	pictureUrl: string | null
	parentId: string | null
	parentSlug: string | null
	isActive: boolean
}

export interface AdminCategoryPayload {
	name: string
	name_ar: string
	isActive: boolean
	description: string
	description_ar: string
	pictureUrl: string | null
}

export interface AdminCustomerAddressRow {
	id: string
	customerId: string
	label: string
	street: string
	area: string
	city: string
	governorate: string
	landmark: string
	phone: string
	postalCode: string
	isDefault: boolean
	latitude: number | null
	longitude: number | null
	createdAt: string
}

export interface AdminCustomerProjectRow {
	id: string
	customerId: string
	name: string
	description: string
	archived: boolean
	createdAt: string
}

export interface AdminPricingRuleRow {
	id: string
	categorySlug: string | null
	productSlug: string | null
	productCategory: string
	bonusMargin: number
	targetMargin: number
	floorMargin: number
	absoluteMinMargin: number
	active: boolean
	updatedByEmployeeId: string | null
	createdAt: string
	updatedAt: string
}

export interface AdminSupplierSpecialtyRow {
	id: string
	supplierId: string
	categorySlug: string
	productSlug: string | null
	createdAt: string
	updatedAt: string
}

export type AdminExportScope =
	| 'products'
	| 'categories'
	| 'customers'
	| 'drivers'
	| 'suppliers'
	| 'employees'
	| 'pricing_rules'
	| 'trucks'

export interface AdminExportResult {
	export_id: string
	scope: AdminExportScope
	generated_at: string
	rows: JsonValue[]
}

interface SupabaseProductRow {
	id: string
	slug: string
	sku: string
	name: string
	name_ar: string
	description: string | null
	description_ar: string | null
	category: string
	category_name?: string | null
	category_name_ar?: string | null
	product_family_slug?: string | null
	product_family_name?: string | null
	product_family_name_ar?: string | null
	product_type_slug?: string | null
	product_type_name?: string | null
	product_type_name_ar?: string | null
	subcategory: string | null
	subcategory_ar: string | null
	brand: string | null
	manufacturer: string | null
	specifications: Record<string, unknown>
	specifications_ar: Record<string, unknown>
	unit_of_measure: string
	unit_of_measure_ar: string
	weight_kg: number | string | null
	price_range_min: number | string | null
	price_range_max: number | string | null
	price_tier: CatalogProduct['price_tier'] | null
	availability_status: CatalogProduct['availability_status']
	image_urls: string[]
	tags: string[]
	is_stockable: boolean
	is_active: boolean
}

interface SupabaseProductStockRow {
	product_id: string
	minimum_quantity: number | string | null
	good_quantity: number | string | null
}

interface SupabaseCategoryRow {
	id: string
	slug: string
	name: string
	name_ar: string | null
	description: string | null
	description_ar: string | null
	image_url: string | null
	parent_id: string | null
	is_active: boolean
	parent: { slug: string } | { slug: string }[] | null
}

interface SupabaseEmployeeRoleRow {
	role: AdminEmployeeRole
}

interface SupabaseEmployeeRow {
	id: string
	user_id: string | null
	full_name: string
	email: string
	phone: string | null
	status: AdminEmployeeRow['status']
	is_ceo: boolean
	employee_roles: SupabaseEmployeeRoleRow[] | null
}

interface SupabaseEmployeeCompensationRow {
	employee_id: string
	department: string | null
	title: string | null
	hire_date: string | null
	base_salary: number | string | null
	social_insurance_salary: number | string | null
	salary_currency: string
	updated_at: string
}

interface SupabaseCustomerRow {
	id: string
	user_id: string | null
	company_name: string
	contact_name: string
	phone: string
	email: string | null
	status: CustomerRow['status']
	trade_license_status: CustomerRow['tradeLicenseStatus']
	profile_photo_url: string | null
	created_by_employee_id: string | null
	tier: CustomerRow['tier']
	credit_limit: number | string
	payment_history: CustomerRow['paymentHistory']
	assigned_sales_rep_id: string | null
	created_at: string
}

interface SupabaseCustomerAddressRow {
	id: string
	customer_id: string
	label: string
	street: string
	area: string | null
	city: string
	governorate: string
	landmark: string | null
	phone: string | null
	postal_code: string | null
	is_default: boolean
	latitude: number | string | null
	longitude: number | string | null
	created_at: string
}

interface SupabaseOrderMetricRow {
	id: string
	customer_id: string | null
	quote_id: string | null
	total_amount: number | string
}

interface SupabaseCustomerPaymentMetricRow {
	amount: number | string
	order_id: string
	status: 'recorded' | 'voided'
}

interface SupabaseQuoteMetricRow {
	customer_id: string | null
	id: string
}

interface SupabaseQuoteItemMetricRow {
	margin_percent: number | string | null
	quote_id: string | null
}

interface SupabaseSupplierRow {
	id: string
	name: string
	phone: string | null
	email: string | null
	status: 'active' | 'inactive' | 'blocked'
	notes: string | null
	tier: SupplierRow['tier']
	payment_terms: string
	rating: number | string
	custom_badges: string[]
	created_at: string
}

interface SupabaseSupplierSpecialtyRow {
	id: string
	supplier_id: string
	category_slug: string
	product_slug: string | null
	created_at: string
	updated_at: string
}

interface SupabaseProjectRow {
	id: string
	customer_id: string
	name: string
	description: string | null
	archived: boolean
	created_at: string
}

interface SupabasePricingRuleRow {
	id: string
	category_slug: string | null
	product_slug: string | null
	product_category: string
	bonus_margin: number | string
	target_margin: number | string
	floor_margin: number | string
	absolute_min_margin: number | string
	active: boolean
	updated_by_employee_id: string | null
	created_at: string
	updated_at: string
}

type SupabaseDriverStatus =
	| 'invited'
	| 'available'
	| 'on_delivery'
	| 'offline'
	| 'disabled'

interface SupabaseAdminDriverRow {
	email: string | null
	id: string
	full_name: string
	phone: string
	status: SupabaseDriverStatus
	user_id: string | null
	vehicle_label: string | null
	created_at: string
}

interface SupabaseAdminTruckRow {
	id: string
	plate_number: string
	driver_id: string | null
	capacity_tons: number | string | null
	body_type: TruckRow['bodyType']
	status: TruckRow['status']
	created_at: string
	drivers:
		| Pick<SupabaseAdminDriverRow, 'id' | 'full_name'>
		| Pick<SupabaseAdminDriverRow, 'id' | 'full_name'>[]
		| null
}

const PRODUCT_COLUMNS =
	'id, slug, sku, name, name_ar, description, description_ar, category, subcategory, subcategory_ar, brand, manufacturer, specifications, specifications_ar, unit_of_measure, unit_of_measure_ar, weight_kg, price_range_min, price_range_max, price_tier, availability_status, image_urls, tags, is_stockable, is_active'
const PRODUCT_HIERARCHY_COLUMNS =
	'id, slug, sku, name, name_ar, description, description_ar, category, category_name, category_name_ar, product_family_slug, product_family_name, product_family_name_ar, product_type_slug, product_type_name, product_type_name_ar, subcategory, subcategory_ar, brand, manufacturer, specifications, specifications_ar, unit_of_measure, unit_of_measure_ar, weight_kg, price_range_min, price_range_max, price_tier, availability_status, image_urls, tags, is_stockable, is_active'
const CATEGORY_COLUMNS =
	'id, slug, name, name_ar, description, description_ar, image_url, parent_id, is_active, parent:parent_id(slug)'
const EMPLOYEE_COLUMNS =
	'id, user_id, full_name, email, phone, status, is_ceo, employee_roles(role)'
const EMPLOYEE_COMPENSATION_COLUMNS =
	'employee_id, department, title, hire_date, base_salary, social_insurance_salary, salary_currency, updated_at'
const CUSTOMER_COLUMNS =
	'id, user_id, company_name, contact_name, phone, email, status, trade_license_status, profile_photo_url, created_by_employee_id, tier, credit_limit, payment_history, assigned_sales_rep_id, created_at'
const SUPPLIER_COLUMNS =
	'id, name, phone, email, status, notes, tier, payment_terms, rating, custom_badges, created_at'
const SUPPLIER_SPECIALTY_COLUMNS =
	'id, supplier_id, category_slug, product_slug, created_at, updated_at'
const DRIVER_COLUMNS =
	'id, user_id, email, full_name, phone, status, vehicle_label, created_at'
const TRUCK_COLUMNS =
	'id, plate_number, driver_id, capacity_tons, body_type, status, created_at, drivers(id, full_name)'
const CUSTOMER_ADDRESS_COLUMNS =
	'id, customer_id, label, street, area, city, governorate, landmark, phone, postal_code, is_default, latitude, longitude, created_at'
const PROJECT_COLUMNS =
	'id, customer_id, name, description, archived, created_at'
const PRICING_RULE_COLUMNS =
	'id, category_slug, product_slug, product_category, bonus_margin, target_margin, floor_margin, absolute_min_margin, active, updated_by_employee_id, created_at, updated_at'
const ADMIN_QUERY_CHUNK_SIZE = 50

const employeeRoleSchema = z.enum([
	'admin',
	'sales',
	'inventory',
	'warehouse',
	'finance',
	'dispatch',
	'customer_service',
	'driver_manager',
	'ceo',
])

const ADMIN_PANEL_PERMISSIONS = [
	'sales',
	'inventory',
	'warehouse',
	'finance',
	'dispatch',
	'customer_service',
	'admin',
	'search',
] as const

type AdminPanelPermission = (typeof ADMIN_PANEL_PERMISSIONS)[number]

const ROLE_PANEL_PERMISSIONS: Record<
	AdminEmployeeRole,
	readonly AdminPanelPermission[]
> = {
	admin: ADMIN_PANEL_PERMISSIONS,
	ceo: ADMIN_PANEL_PERMISSIONS,
	customer_service: ['customer_service'],
	dispatch: ['dispatch'],
	driver_manager: ['dispatch'],
	finance: ['finance'],
	inventory: ['inventory'],
	sales: ['sales'],
	warehouse: ['warehouse'],
}

const employeePasswordSchema = z.preprocess(
	(value) =>
		typeof value === 'string' && value.trim() === '' ? undefined : value,
	z.string().min(1).optional(),
)

const optionalPasswordSchema = z.preprocess(
	(value) =>
		typeof value === 'string' && value.trim() === '' ? undefined : value,
	z.string().min(6).optional(),
)

const nullableUrlSchema = z.preprocess((value) => {
	if (typeof value !== 'string') return value
	const clean = value.trim()
	return clean.length > 0 ? clean : null
}, z.string().trim().url().nullable())

async function getAdminSupabaseClient(writeRequired = true) {
	return getInternalSupabaseClient({
		panel: 'admin',
		writeRequired,
	})
}

function numeric(value: number | string | null | undefined): number {
	if (typeof value === 'number') return value
	if (typeof value === 'string') return Number(value)
	return 0
}

function nullableNumeric(
	value: number | string | null | undefined,
): number | null {
	if (value === null || value === undefined || value === '') return null
	return numeric(value)
}

function supabaseProductToAdmin(
	row: SupabaseProductRow,
	stock?: SupabaseProductStockRow | null,
): AdminProduct {
	const cost = numeric(row.price_range_min ?? row.price_range_max)
	const lowStockThreshold = numeric(stock?.minimum_quantity)
	const goodStockThreshold = Math.max(
		lowStockThreshold,
		numeric(stock?.good_quantity),
	)
	const isVisible = row.is_active && row.availability_status !== 'hidden'
	return {
		id: row.id,
		slug: row.slug,
		sku: row.sku,
		name: row.name,
		name_ar: row.name_ar,
		description: row.description ?? '',
		description_ar: row.description_ar ?? '',
		category: row.category,
		category_slug: row.category,
		category_name: row.category_name ?? row.category,
		category_name_ar: row.category_name_ar ?? row.category_name ?? row.category,
		product_family_slug: row.product_family_slug ?? undefined,
		product_family_name: row.product_family_name ?? undefined,
		product_family_name_ar: row.product_family_name_ar ?? undefined,
		product_type_slug: row.product_type_slug ?? undefined,
		product_type_name: row.product_type_name ?? undefined,
		product_type_name_ar: row.product_type_name_ar ?? undefined,
		subcategory: row.subcategory ?? '',
		subcategory_ar: row.subcategory_ar ?? '',
		brand: row.brand,
		manufacturer: row.manufacturer ?? '',
		specifications: toJsonObject(row.specifications ?? {}),
		specifications_ar: toJsonObject(row.specifications_ar ?? {}),
		unit_of_measure: row.unit_of_measure,
		unit_of_measure_ar: row.unit_of_measure_ar,
		weight_kg: numeric(row.weight_kg),
		price_range_min: numeric(row.price_range_min),
		price_range_max: numeric(row.price_range_max),
		price_tier: row.price_tier ?? 'budget',
		availability_status: row.is_active ? row.availability_status : 'hidden',
		tags: row.tags ?? [],
		is_stockable: row.is_stockable,
		imageUrls: row.image_urls ?? [],
		pictureUrl: row.image_urls?.[0] ?? null,
		cost,
		goodStockThreshold,
		isVisible,
		lowStockThreshold,
	}
}

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value ?? null
}

function supabaseCategoryToAdmin(row: SupabaseCategoryRow): AdminCategoryRow {
	return {
		id: row.id,
		slug: row.slug,
		name: row.name,
		name_ar: row.name_ar ?? '',
		description: row.description ?? '',
		description_ar: row.description_ar ?? '',
		pictureUrl: row.image_url ?? null,
		parentId: row.parent_id,
		parentSlug: firstRelation(row.parent)?.slug ?? null,
		isActive: row.is_active,
	}
}

function supabaseEmployeeToAdmin(
	row: SupabaseEmployeeRow,
	compensation?: SupabaseEmployeeCompensationRow | null,
): AdminEmployeeRow {
	const roles = (row.employee_roles ?? []).map((role) => role.role)
	return {
		baseSalary: nullableNumeric(compensation?.base_salary) ?? 0,
		department: compensation?.department ?? '',
		hireDate: compensation?.hire_date ?? '',
		id: row.id,
		name: row.full_name,
		email: row.email,
		phone: row.phone ?? '',
		status: row.status,
		isCeo: row.is_ceo,
		roles: row.is_ceo && !roles.includes('ceo') ? [...roles, 'ceo'] : roles,
		salaryCurrency: compensation?.salary_currency ?? 'EGP',
		socialInsuranceSalary:
			nullableNumeric(compensation?.social_insurance_salary) ?? 0,
		title: compensation?.title ?? '',
	}
}

function customerAddressLabel(
	row: SupabaseCustomerAddressRow | null | undefined,
): string {
	if (!row) return ''
	return [row.street, row.area, row.city, row.governorate]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(', ')
}

function supabaseCustomerToAdmin(
	row: SupabaseCustomerRow,
	input: {
		address?: SupabaseCustomerAddressRow
		avgMargin: number
		currentExposure: number
		lifetimeValue: number
		orderCount: number
	},
): CustomerRow {
	const address = input.address
	return {
		address: customerAddressLabel(address),
		addressId: address?.id ?? null,
		addressLabel: address?.label ?? '',
		addressPhone: address?.phone ?? '',
		assignedSalesRep: row.assigned_sales_rep_id,
		avgMargin: input.avgMargin,
		area: address?.area ?? '',
		city: address?.city ?? '',
		companyName: row.company_name,
		contactName: row.contact_name,
		creditLimit: numeric(row.credit_limit),
		createdByEmployeeId: row.created_by_employee_id,
		currentExposure: input.currentExposure,
		email: row.email,
		governorate: address?.governorate ?? '',
		id: row.id,
		isDefault: address?.is_default ?? true,
		joinedAt: row.created_at,
		landmark: address?.landmark ?? '',
		latitude: nullableNumeric(address?.latitude),
		lifetimeValue: input.lifetimeValue,
		longitude: nullableNumeric(address?.longitude),
		orderCount: input.orderCount,
		paymentHistory: row.payment_history,
		phone: row.phone,
		postalCode: address?.postal_code ?? '',
		profilePhotoUrl: row.profile_photo_url,
		status: row.status,
		street: address?.street ?? '',
		tier: row.tier,
		tradeLicenseStatus: row.trade_license_status,
		userId: row.user_id,
	}
}

function chunkList<T>(
	values: readonly T[],
	size = ADMIN_QUERY_CHUNK_SIZE,
): T[][] {
	const chunks: T[][] = []
	for (let index = 0; index < values.length; index += size) {
		chunks.push(values.slice(index, index + size))
	}
	return chunks
}

function employeeAuthRoles(
	roles: AdminEmployeeRole[],
	isCeo: boolean,
): AdminEmployeeRole[] {
	const next = new Set<AdminEmployeeRole>(roles)
	if (isCeo) next.add('ceo')
	return [...next]
}

function employeePanels(
	roles: AdminEmployeeRole[],
	isCeo: boolean,
): AdminPanelPermission[] {
	const next = new Set<AdminPanelPermission>()
	for (const role of employeeAuthRoles(roles, isCeo)) {
		for (const panel of ROLE_PANEL_PERMISSIONS[role] ?? []) next.add(panel)
	}
	return [...next]
}

async function replaceEmployeePanelPermissions(
	employeeId: string,
	roles: AdminEmployeeRole[],
	isCeo: boolean,
) {
	const service = await getInternalSupabaseAdminClient()
	const { error: deleteError } = await service
		.from('employee_panel_permissions')
		.delete()
		.eq('employee_id', employeeId)
	if (deleteError) throw new Error(deleteError.message)

	const rows = employeePanels(roles, isCeo).map((panel) => ({
		can_read: true,
		can_write: true,
		employee_id: employeeId,
		panel,
	}))
	if (rows.length === 0) return
	const { error: insertError } = await service
		.from('employee_panel_permissions')
		.insert(rows)
	if (insertError) throw new Error(insertError.message)
}

function supabaseSupplierToAdmin(row: SupabaseSupplierRow): SupplierRow {
	return {
		id: row.id,
		email: row.email,
		status: row.status,
		name: row.name,
		tier: row.tier,
		paymentTerms: row.payment_terms,
		phone: row.phone,
		rating: numeric(row.rating),
		customBadges: row.custom_badges ?? [],
		notes: row.notes,
		joinedAt: row.created_at,
	}
}

function supabaseSupplierSpecialtyToAdmin(
	row: SupabaseSupplierSpecialtyRow,
): AdminSupplierSpecialtyRow {
	return {
		id: row.id,
		supplierId: row.supplier_id,
		categorySlug: row.category_slug,
		productSlug: row.product_slug,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

function supabaseAddressToAdmin(
	row: SupabaseCustomerAddressRow,
): AdminCustomerAddressRow {
	return {
		id: row.id,
		customerId: row.customer_id,
		label: row.label ?? '',
		street: row.street,
		area: row.area ?? '',
		city: row.city,
		governorate: row.governorate,
		landmark: row.landmark ?? '',
		phone: row.phone ?? '',
		postalCode: row.postal_code ?? '',
		isDefault: row.is_default,
		latitude: nullableNumeric(row.latitude),
		longitude: nullableNumeric(row.longitude),
		createdAt: row.created_at,
	}
}

function supabaseProjectToAdmin(
	row: SupabaseProjectRow,
): AdminCustomerProjectRow {
	return {
		id: row.id,
		customerId: row.customer_id,
		name: row.name,
		description: row.description ?? '',
		archived: row.archived,
		createdAt: row.created_at,
	}
}

function supabasePricingRuleToAdmin(
	row: SupabasePricingRuleRow,
): AdminPricingRuleRow {
	const categorySlug = row.category_slug ?? null
	const productSlug = row.product_slug ?? null
	return {
		id: row.id,
		categorySlug,
		productSlug,
		productCategory:
			row.product_category ??
			(categorySlug
				? productSlug
					? `${categorySlug}:${productSlug}`
					: categorySlug
				: 'all'),
		bonusMargin: numeric(row.bonus_margin),
		targetMargin: numeric(row.target_margin),
		floorMargin: numeric(row.floor_margin),
		absoluteMinMargin: numeric(row.absolute_min_margin),
		active: row.active,
		updatedByEmployeeId: row.updated_by_employee_id,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

function supabaseDriverToAdmin(row: SupabaseAdminDriverRow): DriverRow {
	return {
		id: row.id,
		userId: row.user_id,
		fullName: row.full_name,
		email: row.email,
		phone: row.phone,
		status: row.status,
		vehicleLabel: row.vehicle_label,
		createdAt: row.created_at,
	}
}

function supabaseTruckToAdmin(row: SupabaseAdminTruckRow): TruckRow {
	const driver = firstRelation(row.drivers)
	return {
		id: row.id,
		plateNumber: row.plate_number,
		driverId: row.driver_id,
		driverName: driver?.full_name ?? null,
		capacityTons: numeric(row.capacity_tons),
		bodyType: row.body_type,
		status: row.status,
		createdAt: row.created_at,
	}
}

const GENERATED_SUBCATEGORY_AR = 'عام'

function cleanText(value: string): string {
	return value.trim()
}

function nullableCleanText(value: string | null): string | null {
	const clean = value?.trim() ?? ''
	return clean.length > 0 ? clean : null
}

function normalizedAdminEmail(value: string): string {
	return value.trim().toLowerCase()
}

function normalizedNullableAdminEmail(
	value: string | null | undefined,
): string | null {
	const clean = value?.trim()
	return clean ? normalizedAdminEmail(clean) : null
}

function roundCurrency(value: number): number {
	return Math.round(value * 100) / 100
}

function slugPart(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

function skuPart(value: string): string {
	return value
		.trim()
		.toUpperCase()
		.replace(/[^A-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

function productSlugBase(data: AdminProductPayload): string {
	const base = [data.category, data.name]
		.map(slugPart)
		.filter(Boolean)
		.join('-')
	return base || 'product'
}

function productSkuBase(data: AdminProductPayload): string {
	const base = [data.category, data.name].map(skuPart).filter(Boolean).join('-')
	return base || 'PRODUCT'
}

async function uniqueProductValue(
	service: InternalSupabaseAdminClient,
	column: 'slug' | 'sku',
	base: string,
): Promise<string> {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
		const { data, error } = await service
			.from('products')
			.select('id')
			.eq(column, candidate)
			.maybeSingle()
		if (error) throw new Error(error.message)
		if (!data) return candidate
	}
	throw new Error(`Could not generate a unique product ${column}`)
}

async function generatedProductIdentifiers(
	service: InternalSupabaseAdminClient,
	data: AdminProductPayload,
) {
	const [slug, sku] = await Promise.all([
		uniqueProductValue(service, 'slug', productSlugBase(data)),
		uniqueProductValue(service, 'sku', productSkuBase(data)),
	])
	return { slug, sku }
}

function productPayloadForSupabase(
	data: AdminProductPayload,
	identifiers: { slug: string; sku: string },
) {
	const pictureUrl = nullableCleanText(data.pictureUrl)
	const cost = roundCurrency(data.cost)
	return {
		slug: identifiers.slug,
		sku: identifiers.sku,
		name: cleanText(data.name),
		name_ar: cleanText(data.name_ar),
		description: cleanText(data.description),
		description_ar: cleanText(data.description_ar),
		category: cleanText(data.category),
		subcategory: null,
		subcategory_ar: GENERATED_SUBCATEGORY_AR,
		brand: nullableCleanText(data.brand),
		manufacturer: cleanText(data.manufacturer),
		specifications: {},
		specifications_ar: {},
		unit_of_measure: cleanText(data.unit_of_measure),
		unit_of_measure_ar: cleanText(data.unit_of_measure_ar),
		weight_kg: data.weight_kg,
		price_range_min: cost,
		price_range_max: cost,
		price_tier: 'budget' as const,
		availability_status: data.isVisible
			? ('available' as const)
			: ('hidden' as const),
		image_urls: pictureUrl ? [pictureUrl] : [],
		tags: [],
		is_stockable: true,
		is_active: data.isVisible,
	}
}

function productPatchForSupabase(data: Partial<AdminProductPayload>) {
	const patch: Record<string, unknown> = {}
	if (data.name !== undefined) patch.name = cleanText(data.name)
	if (data.name_ar !== undefined) patch.name_ar = cleanText(data.name_ar)
	if (data.description !== undefined)
		patch.description = cleanText(data.description)
	if (data.description_ar !== undefined) {
		patch.description_ar = cleanText(data.description_ar)
	}
	if (data.category !== undefined) {
		patch.category = cleanText(data.category)
		patch.subcategory = null
		patch.subcategory_ar = GENERATED_SUBCATEGORY_AR
	}
	if (data.brand !== undefined) patch.brand = nullableCleanText(data.brand)
	if (data.manufacturer !== undefined) {
		patch.manufacturer = cleanText(data.manufacturer)
	}
	if (data.unit_of_measure !== undefined) {
		patch.unit_of_measure = cleanText(data.unit_of_measure)
	}
	if (data.unit_of_measure_ar !== undefined) {
		patch.unit_of_measure_ar = cleanText(data.unit_of_measure_ar)
	}
	if (data.weight_kg !== undefined) patch.weight_kg = data.weight_kg
	if (data.cost !== undefined) {
		const cost = roundCurrency(data.cost)
		patch.price_range_min = cost
		patch.price_range_max = cost
	}
	if (data.isVisible !== undefined) {
		patch.availability_status = data.isVisible ? 'available' : 'hidden'
		patch.is_active = data.isVisible
	}
	if (data.pictureUrl !== undefined) {
		const pictureUrl = nullableCleanText(data.pictureUrl)
		patch.image_urls = pictureUrl ? [pictureUrl] : []
	}
	return patch
}

async function recordAdminAudit(
	input: {
		entityType: string
		entityId: string
		action:
			| 'admin_record_created'
			| 'admin_record_updated'
			| 'admin_record_deactivated'
			| 'internal_employee_created'
		reason: string
		details?: JsonObject
	},
	client?: Awaited<ReturnType<typeof getInternalSupabaseClient>>['client'],
) {
	const actorClient =
		client ??
		(await getInternalSupabaseClient({ panel: 'admin', writeRequired: true }))
			.client
	const { error } = await actorClient.rpc('admin_record_audit', {
		p_action: input.action,
		p_details: input.details ?? {},
		p_entity_id: input.entityId,
		p_entity_type: input.entityType,
		p_reason: input.reason,
	})
	if (error) throw new Error(error.message)
}

type InternalSupabaseAdminClient = Awaited<
	ReturnType<typeof getInternalSupabaseAdminClient>
>

type AdminAccountType = 'customer' | 'driver' | 'employee'

interface AdminEmailConflict {
	email: string
	id: string
	type: AdminAccountType
	userId: string | null
}

async function currentAdminEmployeeId(input?: {
	actorUserId?: string
	service?: InternalSupabaseAdminClient
}): Promise<string | null> {
	const actorUserId =
		input?.actorUserId ??
		(await getInternalSupabaseClient({ panel: 'admin', writeRequired: true }))
			.user.id
	const service = input?.service ?? (await getInternalSupabaseAdminClient())
	const { data, error } = await service
		.from('employees')
		.select('id')
		.eq('user_id', actorUserId)
		.limit(1)
	if (error) throw new Error(error.message)
	return data?.[0]?.id ?? null
}

async function employeeCompensationById(
	employeeIds: string[],
): Promise<Map<string, SupabaseEmployeeCompensationRow>> {
	if (employeeIds.length === 0) return new Map()
	const service = await getInternalSupabaseAdminClient()
	const { data, error } = await service
		.from('employee_compensation')
		.select(EMPLOYEE_COMPENSATION_COLUMNS)
		.in('employee_id', employeeIds)
	if (error) throw new Error(error.message)
	return new Map(
		((data ?? []) as unknown as SupabaseEmployeeCompensationRow[]).map(
			(row) => [row.employee_id, row],
		),
	)
}

function cleanEmployeeDate(value: string | null | undefined): string | null {
	const clean = value?.trim()
	return clean ? clean : null
}

function cleanSalaryCurrency(value: string | null | undefined): string {
	const clean = value?.trim().toUpperCase()
	return clean || 'EGP'
}

function employeeCompensationPayload(
	data: Partial<{
		baseSalary: number
		department: string
		hireDate: string
		salaryCurrency: string
		socialInsuranceSalary: number
		title: string
	}>,
	updatedByEmployeeId: string | null,
): Record<string, unknown> {
	const patch: Record<string, unknown> = {
		updated_by_employee_id: updatedByEmployeeId,
	}
	if (data.department !== undefined) {
		patch.department = nullableCleanText(data.department)
	}
	if (data.title !== undefined) {
		patch.title = nullableCleanText(data.title)
	}
	if (data.hireDate !== undefined) {
		patch.hire_date = cleanEmployeeDate(data.hireDate)
	}
	if (data.baseSalary !== undefined) {
		patch.base_salary = data.baseSalary
	}
	if (data.socialInsuranceSalary !== undefined) {
		patch.social_insurance_salary = data.socialInsuranceSalary
	}
	if (data.salaryCurrency !== undefined) {
		patch.salary_currency = cleanSalaryCurrency(data.salaryCurrency)
	}
	return patch
}

function hasEmployeeCompensationPatch(
	data: Partial<{
		baseSalary: number
		department: string
		hireDate: string
		salaryCurrency: string
		socialInsuranceSalary: number
		title: string
	}>,
): boolean {
	return (
		data.department !== undefined ||
		data.title !== undefined ||
		data.hireDate !== undefined ||
		data.baseSalary !== undefined ||
		data.socialInsuranceSalary !== undefined ||
		data.salaryCurrency !== undefined
	)
}

async function upsertEmployeeCompensation(
	employeeId: string,
	data: Partial<{
		baseSalary: number
		department: string
		hireDate: string
		salaryCurrency: string
		socialInsuranceSalary: number
		title: string
	}>,
	options?: {
		updatedByEmployeeId?: string | null
	},
) {
	if (!hasEmployeeCompensationPatch(data)) return
	const service = await getInternalSupabaseAdminClient()
	const updatedByEmployeeId =
		options && 'updatedByEmployeeId' in options
			? (options.updatedByEmployeeId ?? null)
			: await currentAdminEmployeeId({ service })
	const { error } = await service.from('employee_compensation').upsert(
		{
			employee_id: employeeId,
			...employeeCompensationPayload(data, updatedByEmployeeId),
		},
		{ onConflict: 'employee_id' },
	)
	if (error) throw new Error(error.message)
}

async function findAuthUserByEmail(
	service: InternalSupabaseAdminClient,
	email: string,
) {
	const normalizedEmail = normalizedAdminEmail(email)
	let page = 1
	const perPage = 100
	while (true) {
		const { data, error } = await service.auth.admin.listUsers({
			page,
			perPage,
		})
		if (error) throw new Error(error.message)
		const user = data.users.find(
			(candidate) =>
				typeof candidate.email === 'string' &&
				normalizedAdminEmail(candidate.email) === normalizedEmail,
		)
		if (user) return user
		if (data.users.length < perPage) return null
		page += 1
	}
}

function valueString(value: unknown, key: string): string | null {
	if (!value || typeof value !== 'object' || !(key in value)) return null
	const field = Reflect.get(value, key)
	return typeof field === 'string' ? field : null
}

async function emailConflictsForTable({
	allowedId,
	email,
	select,
	service,
	table,
	type,
}: {
	allowedId?: string | null
	email: string
	select: string
	service: InternalSupabaseAdminClient
	table: 'customers' | 'drivers' | 'employees'
	type: AdminAccountType
}): Promise<AdminEmailConflict[]> {
	const { data, error } = await service
		.from(table)
		.select(select)
		.ilike('email', email)
	if (error) throw new Error(error.message)

	const conflicts: AdminEmailConflict[] = []
	for (const row of data ?? []) {
		const rowEmail = valueString(row, 'email')
		if (!rowEmail || normalizedAdminEmail(rowEmail) !== email) continue
		const id = valueString(row, 'id')
		if (!id || id === allowedId) continue
		conflicts.push({
			email: rowEmail,
			id,
			type,
			userId: valueString(row, 'user_id'),
		})
	}
	return conflicts
}

async function findAdminEmailConflicts({
	allowedId,
	email,
	service,
	type,
}: {
	allowedId?: string | null
	email: string
	service: InternalSupabaseAdminClient
	type: AdminAccountType
}): Promise<AdminEmailConflict[]> {
	const [customerConflicts, driverConflicts, employeeConflicts] =
		await Promise.all([
			emailConflictsForTable({
				allowedId: type === 'customer' ? allowedId : null,
				email,
				select: 'id, email, user_id',
				service,
				table: 'customers',
				type: 'customer',
			}),
			emailConflictsForTable({
				allowedId: type === 'driver' ? allowedId : null,
				email,
				select: 'id, email, user_id',
				service,
				table: 'drivers',
				type: 'driver',
			}),
			emailConflictsForTable({
				allowedId: type === 'employee' ? allowedId : null,
				email,
				select: 'id, email, user_id',
				service,
				table: 'employees',
				type: 'employee',
			}),
		])
	return [...customerConflicts, ...driverConflicts, ...employeeConflicts]
}

function accountTypeLabel(type: AdminAccountType): string {
	if (type === 'customer') return 'a customer'
	if (type === 'driver') return 'a driver'
	return 'an employee'
}

function authUserPoolLabel(value: unknown): string {
	if (!value || typeof value !== 'object' || !('pool' in value)) {
		return 'another login account'
	}
	const pool = value.pool
	if (pool === 'external') return 'a customer login account'
	if (pool === 'driver') return 'a driver login account'
	if (pool === 'internal') return 'an employee login account'
	return 'another login account'
}

function duplicateAccountEmailMessage(email: string, owner: string): string {
	return `${email} is already used by ${owner}. Use a unique email for each customer, employee, and driver login.`
}

async function assertAdminAccountEmailAvailable({
	allowedId,
	allowedUserId,
	email,
	service,
	type,
}: {
	allowedId?: string | null
	allowedUserId?: string | null
	email: string
	service: InternalSupabaseAdminClient
	type: AdminAccountType
}) {
	const conflicts = await findAdminEmailConflicts({
		allowedId,
		email,
		service,
		type,
	})
	const conflict = conflicts[0]
	if (conflict) {
		throw new Error(
			duplicateAccountEmailMessage(email, accountTypeLabel(conflict.type)),
		)
	}

	const existing = await findAuthUserByEmail(service, email)
	if (existing && existing.id !== allowedUserId) {
		throw new Error(
			duplicateAccountEmailMessage(
				email,
				authUserPoolLabel(existing.app_metadata),
			),
		)
	}
}

async function ensureEmployeeAuthUser(input: {
	email: string
	fullName: string
	isCeo: boolean
	password?: string
	recordId?: string | null
	roles: AdminEmployeeRole[]
	userId?: string | null
}) {
	const service = await getInternalSupabaseAdminClient()
	const email = normalizedAdminEmail(input.email)
	await assertAdminAccountEmailAvailable({
		allowedId: input.recordId,
		allowedUserId: input.userId,
		email,
		service,
		type: 'employee',
	})
	const payload = {
		app_metadata: {
			pool: 'internal',
			roles: employeeAuthRoles(input.roles, input.isCeo),
		},
		email,
		email_confirm: true,
		user_metadata: { name: input.fullName },
		...(input.password ? { password: input.password } : {}),
	}

	if (input.userId) {
		const { data, error } = await service.auth.admin.updateUserById(
			input.userId,
			payload,
		)
		if (error || !data.user) {
			throw new Error(error?.message ?? 'Failed to update employee auth user')
		}
		return data.user.id
	}

	if (!input.password) {
		throw new Error('Employee password is required to create a login account')
	}

	const { data, error } = await service.auth.admin.createUser(payload)
	if (error || !data.user) {
		throw new Error(error?.message ?? 'Failed to create employee auth user')
	}
	return data.user.id
}

async function ensureDriverAuthUser(input: {
	email: string
	fullName: string
	password?: string
	recordId?: string | null
	userId?: string | null
}) {
	const service = await getInternalSupabaseAdminClient()
	const email = normalizedAdminEmail(input.email)
	await assertAdminAccountEmailAvailable({
		allowedId: input.recordId,
		allowedUserId: input.userId,
		email,
		service,
		type: 'driver',
	})
	const payload = {
		app_metadata: {
			pool: 'driver',
			roles: ['driver'],
		},
		email,
		email_confirm: true,
		user_metadata: { name: input.fullName },
		...(input.password ? { password: input.password } : {}),
	}

	if (input.userId) {
		const { data, error } = await service.auth.admin.updateUserById(
			input.userId,
			payload,
		)
		if (error || !data.user) {
			throw new Error(error?.message ?? 'Failed to update driver auth user')
		}
		return data.user.id
	}

	if (!input.password) {
		throw new Error('Driver password is required to create a login account')
	}

	const { data, error } = await service.auth.admin.createUser(payload)
	if (error || !data.user) {
		throw new Error(error?.message ?? 'Failed to create driver auth user')
	}
	return data.user.id
}

async function upsertEmployeeProfileRows(input: {
	authUserId: string
	displayName: string
	email: string
	employeeId: string
	isCeo: boolean
	phone: string
	roles: AdminEmployeeRole[]
}) {
	const service = await getInternalSupabaseAdminClient()
	const { error: profileError } = await service.from('profiles').upsert(
		{
			account_type: 'employee',
			auth_user_id: input.authUserId,
			display_name: input.displayName,
			email: input.email,
			phone: input.phone,
			status: 'active',
		},
		{ onConflict: 'auth_user_id' },
	)
	if (profileError) throw new Error(profileError.message)
	const { data: userProfile, error: userProfileError } = await service
		.from('user_profiles')
		.upsert(
			{
				display_name: input.displayName,
				email: input.email,
				employee_id: input.employeeId,
				phone: input.phone,
				user_id: input.authUserId,
				user_type: 'internal',
			},
			{ onConflict: 'user_id' },
		)
		.select('id')
		.single()
	if (userProfileError) throw new Error(userProfileError.message)
	await replaceUserProfileRoles(
		service,
		userProfile.id,
		employeeAuthRoles(input.roles, input.isCeo),
	)
}

async function upsertDriverProfileRows(input: {
	authUserId: string
	displayName: string
	driverId: string
	email: string | null
	phone: string
}) {
	const service = await getInternalSupabaseAdminClient()
	const { error: profileError } = await service.from('profiles').upsert(
		{
			account_type: 'driver',
			auth_user_id: input.authUserId,
			display_name: input.displayName,
			email: input.email,
			phone: input.phone,
			status: 'active',
		},
		{ onConflict: 'auth_user_id' },
	)
	if (profileError) throw new Error(profileError.message)
	const { data: userProfile, error: userProfileError } = await service
		.from('user_profiles')
		.upsert(
			{
				display_name: input.displayName,
				driver_id: input.driverId,
				email: input.email,
				phone: input.phone,
				user_id: input.authUserId,
				user_type: 'driver',
			},
			{ onConflict: 'user_id' },
		)
		.select('id')
		.single()
	if (userProfileError) throw new Error(userProfileError.message)
	await replaceUserProfileRoles(service, userProfile.id, ['driver'])
}

async function replaceUserProfileRoles(
	service: InternalSupabaseAdminClient,
	userProfileId: string,
	roles: string[],
) {
	const { error: deleteError } = await service
		.from('user_roles')
		.delete()
		.eq('user_profile_id', userProfileId)
	if (deleteError) throw new Error(deleteError.message)
	if (roles.length === 0) return
	const { error: insertError } = await service.from('user_roles').insert(
		roles.map((role) => ({
			role,
			user_profile_id: userProfileId,
		})),
	)
	if (insertError) throw new Error(insertError.message)
}

async function listSupabaseCustomers(): Promise<CustomerRow[]> {
	await getAdminSupabaseClient(false)
	const service = await getInternalSupabaseAdminClient()
	const { data: customerRows, error: customerError } = await service
		.from('customers')
		.select(CUSTOMER_COLUMNS)
		.order('company_name', { ascending: true })
	if (customerError) throw new Error(customerError.message)

	const customers = (customerRows ?? []) as unknown as SupabaseCustomerRow[]
	return buildAdminCustomerRows(service, customers)
}

async function selectCustomerAddressRows(
	service: InternalSupabaseAdminClient,
	customerIds: readonly string[],
): Promise<SupabaseCustomerAddressRow[]> {
	const rows: SupabaseCustomerAddressRow[] = []
	for (const ids of chunkList(customerIds)) {
		const { data, error } = await service
			.from('customer_addresses')
			.select(CUSTOMER_ADDRESS_COLUMNS)
			.in('customer_id', ids)
			.order('is_default', { ascending: false })
			.order('created_at', { ascending: true })
		if (error) throw new Error(error.message)
		rows.push(...((data ?? []) as unknown as SupabaseCustomerAddressRow[]))
	}
	return rows
}

async function selectOrderMetricRows(
	service: InternalSupabaseAdminClient,
	customerIds: readonly string[],
): Promise<SupabaseOrderMetricRow[]> {
	const rows: SupabaseOrderMetricRow[] = []
	for (const ids of chunkList(customerIds)) {
		const { data, error } = await service
			.from('orders')
			.select('id, customer_id, quote_id, total_amount')
			.in('customer_id', ids)
		if (error) throw new Error(error.message)
		rows.push(...((data ?? []) as unknown as SupabaseOrderMetricRow[]))
	}
	return rows
}

async function selectQuoteMetricRows(
	service: InternalSupabaseAdminClient,
	customerIds: readonly string[],
): Promise<SupabaseQuoteMetricRow[]> {
	const rows: SupabaseQuoteMetricRow[] = []
	for (const ids of chunkList(customerIds)) {
		const { data, error } = await service
			.from('quotes')
			.select('id, customer_id')
			.in('customer_id', ids)
		if (error) throw new Error(error.message)
		rows.push(...((data ?? []) as unknown as SupabaseQuoteMetricRow[]))
	}
	return rows
}

async function selectCustomerPaymentRows(
	service: InternalSupabaseAdminClient,
	orderIds: readonly string[],
): Promise<SupabaseCustomerPaymentMetricRow[]> {
	const rows: SupabaseCustomerPaymentMetricRow[] = []
	for (const ids of chunkList(orderIds)) {
		const { data, error } = await service
			.from('customer_payments')
			.select('order_id, amount, status')
			.in('order_id', ids)
			.eq('status', 'recorded')
		if (error) throw new Error(error.message)
		rows.push(
			...((data ?? []) as unknown as SupabaseCustomerPaymentMetricRow[]),
		)
	}
	return rows
}

async function selectQuoteItemMetricRows(
	service: InternalSupabaseAdminClient,
	quoteIds: readonly string[],
): Promise<SupabaseQuoteItemMetricRow[]> {
	const rows: SupabaseQuoteItemMetricRow[] = []
	for (const ids of chunkList(quoteIds)) {
		const { data, error } = await service
			.from('quote_items')
			.select('quote_id, margin_percent')
			.in('quote_id', ids)
			.not('margin_percent', 'is', null)
		if (error) throw new Error(error.message)
		rows.push(...((data ?? []) as unknown as SupabaseQuoteItemMetricRow[]))
	}
	return rows
}

async function buildAdminCustomerRows(
	service: InternalSupabaseAdminClient,
	customers: readonly SupabaseCustomerRow[],
): Promise<CustomerRow[]> {
	const customerIds = customers.map((row) => row.id)
	if (customerIds.length === 0) return []

	const [addressRows, orders, quotes] = await Promise.all([
		selectCustomerAddressRows(service, customerIds),
		selectOrderMetricRows(service, customerIds),
		selectQuoteMetricRows(service, customerIds),
	])
	const orderIds = orders.map((row) => row.id)
	const quoteIds = quotes.map((row) => row.id)
	const [paymentRows, quoteItemRows] = await Promise.all([
		selectCustomerPaymentRows(service, orderIds),
		selectQuoteItemMetricRows(service, quoteIds),
	])

	const addressByCustomer = new Map<string, SupabaseCustomerAddressRow>()
	for (const address of addressRows) {
		if (!addressByCustomer.has(address.customer_id)) {
			addressByCustomer.set(address.customer_id, address)
		}
	}

	const paymentsByOrder = new Map<string, number>()
	for (const payment of paymentRows) {
		paymentsByOrder.set(
			payment.order_id,
			(paymentsByOrder.get(payment.order_id) ?? 0) + numeric(payment.amount),
		)
	}

	const orderMetricsByCustomer = new Map<
		string,
		{ currentExposure: number; lifetimeValue: number; orderCount: number }
	>()
	for (const order of orders) {
		if (!order.customer_id) continue
		const current = orderMetricsByCustomer.get(order.customer_id) ?? {
			currentExposure: 0,
			lifetimeValue: 0,
			orderCount: 0,
		}
		const total = numeric(order.total_amount)
		current.orderCount += 1
		current.lifetimeValue += total
		current.currentExposure += Math.max(
			total - (paymentsByOrder.get(order.id) ?? 0),
			0,
		)
		orderMetricsByCustomer.set(order.customer_id, current)
	}

	const quoteCustomerByQuote = new Map<string, string>()
	for (const quote of quotes) {
		if (quote.customer_id) quoteCustomerByQuote.set(quote.id, quote.customer_id)
	}
	const marginsByCustomer = new Map<string, number[]>()
	for (const item of quoteItemRows) {
		if (!item.quote_id || item.margin_percent === null) continue
		const customerId = quoteCustomerByQuote.get(item.quote_id)
		if (!customerId) continue
		const margins = marginsByCustomer.get(customerId) ?? []
		margins.push(numeric(item.margin_percent))
		marginsByCustomer.set(customerId, margins)
	}

	return customers.map((customer) => {
		const orderMetrics = orderMetricsByCustomer.get(customer.id) ?? {
			currentExposure: 0,
			lifetimeValue: 0,
			orderCount: 0,
		}
		const margins = marginsByCustomer.get(customer.id) ?? []
		return supabaseCustomerToAdmin(customer, {
			address: addressByCustomer.get(customer.id),
			avgMargin:
				margins.length === 0
					? 0
					: margins.reduce((sum, value) => sum + value, 0) / margins.length,
			...orderMetrics,
		})
	})
}

async function getSupabaseCustomerById(
	service: InternalSupabaseAdminClient,
	id: string,
): Promise<CustomerRow> {
	const { data: row, error } = await service
		.from('customers')
		.select(CUSTOMER_COLUMNS)
		.eq('id', id)
		.single()
	if (error || !row)
		throw new Error(error?.message ?? `Customer ${id} not found`)
	const [customer] = await buildAdminCustomerRows(service, [
		row as unknown as SupabaseCustomerRow,
	])
	if (!customer) throw new Error(`Customer ${id} not found`)
	return customer
}

async function upsertSupabaseCustomerAddress(
	customerId: string,
	data: Pick<
		CustomerRow,
		| 'addressId'
		| 'addressLabel'
		| 'addressPhone'
		| 'area'
		| 'city'
		| 'governorate'
		| 'isDefault'
		| 'landmark'
		| 'latitude'
		| 'longitude'
		| 'postalCode'
		| 'street'
	>,
) {
	const service = await getInternalSupabaseAdminClient()
	let existingId = data.addressId
	if (!existingId) {
		const { data: existing, error: existingError } = await service
			.from('customer_addresses')
			.select('id')
			.eq('customer_id', customerId)
			.order('is_default', { ascending: false })
			.order('created_at', { ascending: true })
			.limit(1)
		if (existingError) throw new Error(existingError.message)
		existingId = existing?.[0]?.id ?? null
	}

	const payload = {
		area: data.area || null,
		city: data.city,
		customer_id: customerId,
		governorate: data.governorate,
		is_default: data.isDefault,
		label: data.addressLabel || 'Primary',
		landmark: data.landmark || null,
		latitude: data.latitude,
		longitude: data.longitude,
		phone: data.addressPhone || null,
		postal_code: data.postalCode || null,
		street: data.street,
	}
	if (data.isDefault && existingId) {
		const { error } = await service
			.from('customer_addresses')
			.update({ is_default: false })
			.eq('customer_id', customerId)
			.neq('id', existingId)
		if (error) throw new Error(error.message)
	}
	if (existingId) {
		const { error } = await service
			.from('customer_addresses')
			.update(payload)
			.eq('id', existingId)
		if (error) throw new Error(error.message)
		return
	}
	if (data.isDefault) {
		const { error } = await service
			.from('customer_addresses')
			.update({ is_default: false })
			.eq('customer_id', customerId)
		if (error) throw new Error(error.message)
	}
	const { error } = await service.from('customer_addresses').insert(payload)
	if (error) throw new Error(error.message)
}

const CustomerAddressPayload = z.object({
	customerId: z.string().uuid(),
	label: z.string(),
	street: z.string().min(1),
	area: z.string(),
	city: z.string().min(1),
	governorate: z.string().min(1),
	landmark: z.string(),
	phone: z.string(),
	postalCode: z.string(),
	isDefault: z.boolean(),
	latitude: z.number().nullable(),
	longitude: z.number().nullable(),
})

const CustomerProjectPayload = z.object({
	customerId: z.string().uuid(),
	name: z.string().min(1),
	description: z.string(),
	archived: z.boolean(),
})

// ─── Customers ───────────────────────────────────────────

const CustomerPayload = z.object({
	companyName: z.string().min(1),
	tier: z.enum(['A', 'B', 'C', 'new']),
	status: z.enum(['unclaimed', 'claimed', 'active', 'inactive']),
	tradeLicenseStatus: z.enum([
		'not_uploaded',
		'under_review',
		'approved',
		'rejected',
	]),
	profilePhotoUrl: z.string().nullable(),
	createdByEmployeeId: z.string().uuid().nullable(),
	contactName: z.string().min(1),
	phone: z.string().min(1),
	email: z.string().email().nullable(),
	addressId: z.string().uuid().nullable(),
	addressLabel: z.string(),
	address: z.string(),
	street: z.string(),
	area: z.string(),
	city: z.string(),
	governorate: z.string(),
	landmark: z.string(),
	addressPhone: z.string(),
	postalCode: z.string(),
	latitude: z.number().nullable(),
	longitude: z.number().nullable(),
	isDefault: z.boolean(),
	creditLimit: z.number().min(0),
	currentExposure: z.number().min(0),
	orderCount: z.number().int().min(0),
	lifetimeValue: z.number().min(0),
	avgMargin: z.number(),
	paymentHistory: z.enum(['excellent', 'good', 'fair', 'poor']),
	assignedSalesRep: z.string().nullable(),
})

export const adminListCustomers = createServerFn({ method: 'GET' }).handler(
	async (): Promise<CustomerRow[]> => listSupabaseCustomers(),
)

export const adminCreateCustomer = createServerFn({ method: 'POST' })
	.inputValidator(CustomerPayload)
	.handler(async ({ data }): Promise<CustomerRow> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const email = normalizedNullableAdminEmail(data.email)
		if (email) {
			await assertAdminAccountEmailAvailable({
				email,
				service,
				type: 'customer',
			})
		}
		const { data: row, error } = await service
			.from('customers')
			.insert({
				assigned_sales_rep_id: data.assignedSalesRep,
				company_name: data.companyName,
				contact_name: data.contactName,
				created_by_employee_id: data.createdByEmployeeId,
				credit_limit: data.creditLimit,
				email,
				payment_history: data.paymentHistory,
				phone: data.phone,
				profile_photo_url: data.profilePhotoUrl,
				status: data.status,
				tier: data.tier,
				trade_license_status: data.tradeLicenseStatus,
			})
			.select(CUSTOMER_COLUMNS)
			.single()
		if (error || !row)
			throw new Error(error?.message ?? 'Failed to create customer')
		await upsertSupabaseCustomerAddress(row.id, data)
		await recordAdminAudit({
			action: 'admin_record_created',
			details: { scope: 'customers' },
			entityId: row.id,
			entityType: 'customer',
			reason: 'Admin customer create via internal panel',
		})
		return getSupabaseCustomerById(service, row.id)
	})

export const adminUpdateCustomer = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string() }).merge(CustomerPayload.partial()))
	.handler(async ({ data }): Promise<CustomerRow> => {
		const { id, ...patch } = data
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const customerPatch: Record<string, unknown> = {}
		if (patch.assignedSalesRep !== undefined) {
			customerPatch.assigned_sales_rep_id = patch.assignedSalesRep
		}
		if (patch.companyName !== undefined)
			customerPatch.company_name = patch.companyName
		if (patch.contactName !== undefined)
			customerPatch.contact_name = patch.contactName
		if (patch.createdByEmployeeId !== undefined) {
			customerPatch.created_by_employee_id = patch.createdByEmployeeId
		}
		if (patch.creditLimit !== undefined)
			customerPatch.credit_limit = patch.creditLimit
		if (patch.email !== undefined) {
			const email = normalizedNullableAdminEmail(patch.email)
			if (email) {
				const { data: currentCustomer, error: currentCustomerError } =
					await service
						.from('customers')
						.select('id, user_id')
						.eq('id', id)
						.single()
				if (currentCustomerError) throw new Error(currentCustomerError.message)
				await assertAdminAccountEmailAvailable({
					allowedId: id,
					allowedUserId: valueString(currentCustomer, 'user_id'),
					email,
					service,
					type: 'customer',
				})
			}
			customerPatch.email = email
		}
		if (patch.paymentHistory !== undefined) {
			customerPatch.payment_history = patch.paymentHistory
		}
		if (patch.phone !== undefined) customerPatch.phone = patch.phone
		if (patch.profilePhotoUrl !== undefined) {
			customerPatch.profile_photo_url = patch.profilePhotoUrl
		}
		if (patch.status !== undefined) customerPatch.status = patch.status
		if (patch.tier !== undefined) customerPatch.tier = patch.tier
		if (patch.tradeLicenseStatus !== undefined) {
			customerPatch.trade_license_status = patch.tradeLicenseStatus
		}
		if (Object.keys(customerPatch).length > 0) {
			const { error } = await service
				.from('customers')
				.update(customerPatch)
				.eq('id', id)
			if (error) throw new Error(error.message)
		}
		if (
			patch.addressId !== undefined ||
			patch.addressLabel !== undefined ||
			patch.addressPhone !== undefined ||
			patch.area !== undefined ||
			patch.city !== undefined ||
			patch.governorate !== undefined ||
			patch.isDefault !== undefined ||
			patch.landmark !== undefined ||
			patch.latitude !== undefined ||
			patch.longitude !== undefined ||
			patch.postalCode !== undefined ||
			patch.street !== undefined
		) {
			const current = await getSupabaseCustomerById(service, id)
			await upsertSupabaseCustomerAddress(id, {
				addressId: patch.addressId ?? current.addressId,
				addressLabel: patch.addressLabel ?? current.addressLabel,
				addressPhone: patch.addressPhone ?? current.addressPhone,
				area: patch.area ?? current.area,
				city: patch.city ?? current.city,
				governorate: patch.governorate ?? current.governorate,
				isDefault: patch.isDefault ?? current.isDefault,
				landmark: patch.landmark ?? current.landmark,
				latitude:
					patch.latitude === undefined ? current.latitude : patch.latitude,
				longitude:
					patch.longitude === undefined ? current.longitude : patch.longitude,
				postalCode: patch.postalCode ?? current.postalCode,
				street: patch.street ?? current.street,
			})
		}
		await recordAdminAudit({
			action: 'admin_record_updated',
			details: { changed_keys: Object.keys(patch), scope: 'customers' },
			entityId: id,
			entityType: 'customer',
			reason: 'Admin customer update via internal panel',
		})
		return getSupabaseCustomerById(service, id)
	})

export const adminDeleteCustomer = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string() }))
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { error } = await service
			.from('customers')
			.update({ status: 'inactive' })
			.eq('id', data.id)
		if (error) throw new Error(error.message)
		await recordAdminAudit({
			action: 'admin_record_deactivated',
			details: { scope: 'customers' },
			entityId: data.id,
			entityType: 'customer',
			reason: 'Admin customer deactivate via internal panel',
		})
		return { ok: true }
	})

export const adminListCustomerAddresses = createServerFn({
	method: 'POST',
})
	.inputValidator(z.object({ customerId: z.string().uuid() }))
	.handler(async ({ data }): Promise<AdminCustomerAddressRow[]> => {
		await getAdminSupabaseClient(false)
		const service = await getInternalSupabaseAdminClient()
		const { data: rows, error } = await service
			.from('customer_addresses')
			.select(CUSTOMER_ADDRESS_COLUMNS)
			.eq('customer_id', data.customerId)
			.order('is_default', { ascending: false })
			.order('created_at', { ascending: true })
		if (error) throw new Error(error.message)
		return ((rows ?? []) as unknown as SupabaseCustomerAddressRow[]).map(
			supabaseAddressToAdmin,
		)
	})

export const adminCreateCustomerAddress = createServerFn({ method: 'POST' })
	.inputValidator(CustomerAddressPayload)
	.handler(async ({ data }): Promise<AdminCustomerAddressRow> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		if (data.isDefault) {
			const { error } = await service
				.from('customer_addresses')
				.update({ is_default: false })
				.eq('customer_id', data.customerId)
			if (error) throw new Error(error.message)
		}
		const { data: row, error } = await service
			.from('customer_addresses')
			.insert({
				area: data.area || null,
				city: data.city,
				customer_id: data.customerId,
				governorate: data.governorate,
				is_default: data.isDefault,
				label: data.label || null,
				landmark: data.landmark || null,
				latitude: data.latitude,
				longitude: data.longitude,
				phone: data.phone || null,
				postal_code: data.postalCode || null,
				street: data.street,
			})
			.select(CUSTOMER_ADDRESS_COLUMNS)
			.single()
		if (error || !row) {
			throw new Error(error?.message ?? 'Failed to create customer address')
		}
		await recordAdminAudit({
			action: 'admin_record_created',
			details: { customer_id: data.customerId, scope: 'customer_addresses' },
			entityId: row.id,
			entityType: 'customer_address',
			reason: 'Admin customer address create via internal panel',
		})
		return supabaseAddressToAdmin(row as unknown as SupabaseCustomerAddressRow)
	})

export const adminUpdateCustomerAddress = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ id: z.string().uuid() }).merge(CustomerAddressPayload.partial()),
	)
	.handler(async ({ data }): Promise<AdminCustomerAddressRow> => {
		const { id, customerId, ...patch } = data
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		if (patch.isDefault && customerId) {
			const { error } = await service
				.from('customer_addresses')
				.update({ is_default: false })
				.eq('customer_id', customerId)
				.neq('id', id)
			if (error) throw new Error(error.message)
		}
		const addressPatch: Record<string, unknown> = {}
		if (patch.label !== undefined) addressPatch.label = patch.label || null
		if (patch.street !== undefined) addressPatch.street = patch.street
		if (patch.area !== undefined) addressPatch.area = patch.area || null
		if (patch.city !== undefined) addressPatch.city = patch.city
		if (patch.governorate !== undefined)
			addressPatch.governorate = patch.governorate
		if (patch.landmark !== undefined)
			addressPatch.landmark = patch.landmark || null
		if (patch.phone !== undefined) addressPatch.phone = patch.phone || null
		if (patch.postalCode !== undefined)
			addressPatch.postal_code = patch.postalCode || null
		if (patch.isDefault !== undefined) addressPatch.is_default = patch.isDefault
		if (patch.latitude !== undefined) addressPatch.latitude = patch.latitude
		if (patch.longitude !== undefined) addressPatch.longitude = patch.longitude
		const { data: row, error } = await service
			.from('customer_addresses')
			.update(addressPatch)
			.eq('id', id)
			.select(CUSTOMER_ADDRESS_COLUMNS)
			.single()
		if (error || !row) {
			throw new Error(error?.message ?? `Customer address ${id} not found`)
		}
		await recordAdminAudit({
			action: 'admin_record_updated',
			details: {
				changed_keys: Object.keys(patch),
				scope: 'customer_addresses',
			},
			entityId: id,
			entityType: 'customer_address',
			reason: 'Admin customer address update via internal panel',
		})
		return supabaseAddressToAdmin(row as unknown as SupabaseCustomerAddressRow)
	})

export const adminDeleteCustomerAddress = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { count, error: countError } = await service
			.from('quote_requests')
			.select('id', { count: 'exact', head: true })
			.eq('delivery_address_id', data.id)
		if (countError) throw new Error(countError.message)
		if ((count ?? 0) > 0) {
			throw new Error(
				'Customer address has order history and cannot be deleted',
			)
		}
		await recordAdminAudit({
			action: 'admin_record_deactivated',
			details: { scope: 'customer_addresses' },
			entityId: data.id,
			entityType: 'customer_address',
			reason: 'Admin customer address delete via internal panel',
		})
		const { error } = await service
			.from('customer_addresses')
			.delete()
			.eq('id', data.id)
		if (error) throw new Error(error.message)
		return { ok: true }
	})

export const adminListCustomerProjects = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ customerId: z.string().uuid() }))
	.handler(async ({ data }): Promise<AdminCustomerProjectRow[]> => {
		await getAdminSupabaseClient(false)
		const service = await getInternalSupabaseAdminClient()
		const { data: rows, error } = await service
			.from('projects')
			.select(PROJECT_COLUMNS)
			.eq('customer_id', data.customerId)
			.order('created_at', { ascending: false })
		if (error) throw new Error(error.message)
		return ((rows ?? []) as unknown as SupabaseProjectRow[]).map(
			supabaseProjectToAdmin,
		)
	})

export const adminCreateCustomerProject = createServerFn({ method: 'POST' })
	.inputValidator(CustomerProjectPayload)
	.handler(async ({ data }): Promise<AdminCustomerProjectRow> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { data: row, error } = await service
			.from('projects')
			.insert({
				archived: data.archived,
				customer_id: data.customerId,
				description: data.description || null,
				name: data.name,
			})
			.select(PROJECT_COLUMNS)
			.single()
		if (error || !row) {
			throw new Error(error?.message ?? 'Failed to create customer project')
		}
		await recordAdminAudit({
			action: 'admin_record_created',
			details: { customer_id: data.customerId, scope: 'projects' },
			entityId: row.id,
			entityType: 'project',
			reason: 'Admin customer project create via internal panel',
		})
		return supabaseProjectToAdmin(row as unknown as SupabaseProjectRow)
	})

export const adminUpdateCustomerProject = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ id: z.string().uuid() }).merge(CustomerProjectPayload.partial()),
	)
	.handler(async ({ data }): Promise<AdminCustomerProjectRow> => {
		const { id, customerId: _customerId, ...patch } = data
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const projectPatch: Record<string, unknown> = {}
		if (patch.name !== undefined) projectPatch.name = patch.name
		if (patch.description !== undefined) {
			projectPatch.description = patch.description || null
		}
		if (patch.archived !== undefined) projectPatch.archived = patch.archived
		const { data: row, error } = await service
			.from('projects')
			.update(projectPatch)
			.eq('id', id)
			.select(PROJECT_COLUMNS)
			.single()
		if (error || !row) {
			throw new Error(error?.message ?? `Project ${id} not found`)
		}
		await recordAdminAudit({
			action: 'admin_record_updated',
			details: { changed_keys: Object.keys(patch), scope: 'projects' },
			entityId: id,
			entityType: 'project',
			reason: 'Admin customer project update via internal panel',
		})
		return supabaseProjectToAdmin(row as unknown as SupabaseProjectRow)
	})

export const adminDeleteCustomerProject = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { error } = await service
			.from('projects')
			.update({ archived: true })
			.eq('id', data.id)
		if (error) throw new Error(error.message)
		await recordAdminAudit({
			action: 'admin_record_deactivated',
			details: { scope: 'projects' },
			entityId: data.id,
			entityType: 'project',
			reason: 'Admin customer project archive via internal panel',
		})
		return { ok: true }
	})

// ─── Products ────────────────────────────────────────────

const ProductPayloadBase = z.object({
	name: z.string().trim().min(1),
	name_ar: z.string().trim().min(1),
	category: z.string().trim().min(1),
	brand: z.string().nullable(),
	manufacturer: z.string(),
	cost: z.number().min(0),
	isVisible: z.boolean(),
	weight_kg: z.number().min(0),
	unit_of_measure: z.string().trim().min(1),
	unit_of_measure_ar: z.string().trim().min(1),
	description: z.string().trim().min(1),
	description_ar: z.string().trim().min(1),
	lowStockThreshold: z.number().min(0),
	goodStockThreshold: z.number().min(0),
	pictureUrl: nullableUrlSchema,
})

const ProductPayload = ProductPayloadBase.superRefine((value, ctx) => {
	if (value.goodStockThreshold < value.lowStockThreshold) {
		ctx.addIssue({
			code: 'custom',
			message:
				'Good stock threshold must be greater than or equal to low stock threshold',
			path: ['goodStockThreshold'],
		})
	}
})

const ProductPatchPayload = ProductPayloadBase.partial()
	.extend({ id: z.string() })
	.superRefine((value, ctx) => {
		if (
			value.goodStockThreshold !== undefined &&
			value.lowStockThreshold !== undefined &&
			value.goodStockThreshold < value.lowStockThreshold
		) {
			ctx.addIssue({
				code: 'custom',
				message:
					'Good stock threshold must be greater than or equal to low stock threshold',
				path: ['goodStockThreshold'],
			})
		}
	})

async function loadProductStockThresholds(
	service: InternalSupabaseAdminClient,
	productIds: string[],
): Promise<Map<string, SupabaseProductStockRow>> {
	if (productIds.length === 0) return new Map()
	const chunks: string[][] = []
	for (
		let index = 0;
		index < productIds.length;
		index += ADMIN_QUERY_CHUNK_SIZE
	) {
		chunks.push(productIds.slice(index, index + ADMIN_QUERY_CHUNK_SIZE))
	}
	const rows: SupabaseProductStockRow[] = []
	for (const ids of chunks) {
		const { data, error } = await service
			.from('inventory_stock')
			.select('product_id, minimum_quantity, good_quantity')
			.in('product_id', ids)
		if (error) throw new Error(error.message)
		rows.push(...((data ?? []) as unknown as SupabaseProductStockRow[]))
	}
	return new Map(rows.map((row) => [row.product_id, row]))
}

async function upsertProductStockThresholds(
	service: InternalSupabaseAdminClient,
	productId: string,
	data: Partial<
		Pick<AdminProductPayload, 'goodStockThreshold' | 'lowStockThreshold'>
	>,
) {
	if (
		data.lowStockThreshold === undefined &&
		data.goodStockThreshold === undefined
	) {
		return
	}
	const { data: current, error: currentError } = await service
		.from('inventory_stock')
		.select('minimum_quantity, good_quantity')
		.eq('product_id', productId)
		.maybeSingle()
	if (currentError) throw new Error(currentError.message)
	const currentStock = current as Pick<
		SupabaseProductStockRow,
		'good_quantity' | 'minimum_quantity'
	> | null
	const lowStockThreshold =
		data.lowStockThreshold ?? numeric(currentStock?.minimum_quantity)
	const goodStockThreshold =
		data.goodStockThreshold ??
		Math.max(lowStockThreshold, numeric(currentStock?.good_quantity))
	if (goodStockThreshold < lowStockThreshold) {
		throw new Error(
			'Good stock threshold must be greater than or equal to low stock threshold',
		)
	}
	const patch = {
		good_quantity: goodStockThreshold,
		minimum_quantity: lowStockThreshold,
	}
	const { data: updatedRows, error: updateError } = await service
		.from('inventory_stock')
		.update(patch)
		.eq('product_id', productId)
		.select('id')
	if (updateError) throw new Error(updateError.message)
	if ((updatedRows ?? []).length > 0) return
	const { error: insertError } = await service.from('inventory_stock').insert({
		product_id: productId,
		...patch,
	})
	if (insertError) throw new Error(insertError.message)
}

export const adminListProducts = createServerFn({ method: 'GET' }).handler(
	async (): Promise<AdminProduct[]> => {
		const auth = await getAdminSupabaseClient(false)
		const service = await getInternalSupabaseAdminClient()

		const { data, error } = await auth.client
			.from('catalog_product_hierarchy')
			.select(PRODUCT_HIERARCHY_COLUMNS)
			.order('name', { ascending: true })
		if (error) throw new Error(error.message)
		const rows = (data ?? []) as unknown as SupabaseProductRow[]
		const stockByProduct = await loadProductStockThresholds(
			service,
			rows.map((row) => row.id),
		)
		return rows.map((row) =>
			supabaseProductToAdmin(row, stockByProduct.get(row.id) ?? null),
		)
	},
)

export const adminCreateProduct = createServerFn({ method: 'POST' })
	.inputValidator(ProductPayload)
	.handler(async ({ data }): Promise<AdminProduct> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const identifiers = await generatedProductIdentifiers(service, data)

		const { data: row, error } = await service
			.from('products')
			.insert(productPayloadForSupabase(data, identifiers))
			.select(PRODUCT_COLUMNS)
			.single()
		if (error) throw new Error(error.message)
		await upsertProductStockThresholds(service, row.id, data)
		const stockByProduct = await loadProductStockThresholds(service, [row.id])
		await recordAdminAudit({
			action: 'admin_record_created',
			details: { slug: row.slug, scope: 'products' },
			entityId: row.id,
			entityType: 'product',
			reason: 'Admin product create via internal panel',
		})
		return supabaseProductToAdmin(
			row as unknown as SupabaseProductRow,
			stockByProduct.get(row.id) ?? null,
		)
	})

export const adminUpdateProduct = createServerFn({ method: 'POST' })
	.inputValidator(ProductPatchPayload)
	.handler(async ({ data }): Promise<AdminProduct> => {
		const { id, ...patch } = data
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { data: row, error } = await service
			.from('products')
			.update(productPatchForSupabase(patch))
			.eq('id', id)
			.select(PRODUCT_COLUMNS)
			.single()
		if (error) throw new Error(error.message)
		await upsertProductStockThresholds(service, id, patch)
		const stockByProduct = await loadProductStockThresholds(service, [id])
		await recordAdminAudit({
			action: 'admin_record_updated',
			details: {
				changed_keys: Object.keys(patch),
				scope: 'products',
			},
			entityId: id,
			entityType: 'product',
			reason: 'Admin product update via internal panel',
		})
		return supabaseProductToAdmin(
			row as unknown as SupabaseProductRow,
			stockByProduct.get(id) ?? null,
		)
	})

export const adminDeleteProduct = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string(), reason: z.string().min(8) }))
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { error } = await service
			.from('products')
			.update({ availability_status: 'hidden', is_active: false })
			.eq('id', data.id)
		if (error) throw new Error(error.message)
		await recordAdminAudit({
			action: 'admin_record_deactivated',
			details: { scope: 'products' },
			entityId: data.id,
			entityType: 'product',
			reason: data.reason,
		})
		return { ok: true }
	})

// ─── Categories ──────────────────────────────────────────

const CategoryPayload = z.object({
	name: z.string().trim().min(1),
	name_ar: z.string().trim().min(1),
	isActive: z.boolean(),
	description: z.string().trim().min(1),
	description_ar: z.string().trim().min(1),
	pictureUrl: nullableUrlSchema,
})

async function uniqueCategorySlug(
	service: InternalSupabaseAdminClient,
	base: string,
): Promise<string> {
	for (let attempt = 0; attempt < 100; attempt += 1) {
		const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
		const { data, error } = await service
			.from('categories')
			.select('id')
			.eq('slug', candidate)
			.maybeSingle()
		if (error) throw new Error(error.message)
		if (!data) return candidate
	}
	throw new Error('Could not generate a unique category slug')
}

async function generatedCategorySlug(
	service: InternalSupabaseAdminClient,
	data: AdminCategoryPayload,
) {
	return uniqueCategorySlug(service, slugPart(data.name) || 'category')
}

function categoryPayloadForSupabase(data: AdminCategoryPayload) {
	return {
		name: cleanText(data.name),
		name_ar: cleanText(data.name_ar),
		description: cleanText(data.description),
		description_ar: cleanText(data.description_ar),
		image_url: nullableCleanText(data.pictureUrl),
		is_active: data.isActive,
	}
}

export const adminListCategories = createServerFn({ method: 'GET' }).handler(
	async (): Promise<AdminCategoryRow[]> => {
		const auth = await getAdminSupabaseClient(false)
		const { data, error } = await auth.client
			.from('categories')
			.select(CATEGORY_COLUMNS)
			.order('name', { ascending: true })
		if (error) throw new Error(error.message)
		return ((data ?? []) as unknown as SupabaseCategoryRow[]).map(
			supabaseCategoryToAdmin,
		)
	},
)

export const adminCreateCategory = createServerFn({ method: 'POST' })
	.inputValidator(CategoryPayload)
	.handler(async ({ data }): Promise<AdminCategoryRow> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const slug = await generatedCategorySlug(service, data)
		const { data: row, error } = await service
			.from('categories')
			.insert({ ...categoryPayloadForSupabase(data), parent_id: null, slug })
			.select(CATEGORY_COLUMNS)
			.single()
		if (error) throw new Error(error.message)
		await recordAdminAudit({
			action: 'admin_record_created',
			details: { slug: row.slug, scope: 'categories' },
			entityId: row.id,
			entityType: 'category',
			reason: 'Admin category create via internal panel',
		})
		return supabaseCategoryToAdmin(row as unknown as SupabaseCategoryRow)
	})

export const adminUpdateCategory = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string().uuid() }).merge(CategoryPayload))
	.handler(async ({ data }): Promise<AdminCategoryRow> => {
		const { id, ...patch } = data
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { data: row, error } = await service
			.from('categories')
			.update(categoryPayloadForSupabase(patch))
			.eq('id', id)
			.select(CATEGORY_COLUMNS)
			.single()
		if (error) throw new Error(error.message)
		await recordAdminAudit({
			action: 'admin_record_updated',
			details: { changed_keys: Object.keys(patch), scope: 'categories' },
			entityId: id,
			entityType: 'category',
			reason: 'Admin category update via internal panel',
		})
		return supabaseCategoryToAdmin(row as unknown as SupabaseCategoryRow)
	})

export const adminDeleteCategory = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ id: z.string().uuid(), reason: z.string().min(8) }),
	)
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { error } = await service
			.from('categories')
			.update({ is_active: false })
			.eq('id', data.id)
		if (error) throw new Error(error.message)
		await recordAdminAudit({
			action: 'admin_record_deactivated',
			details: { scope: 'categories' },
			entityId: data.id,
			entityType: 'category',
			reason: data.reason,
		})
		return { ok: true }
	})

// ─── Employees ───────────────────────────────────────────

const EmployeePayload = z.object({
	name: z.string().min(1),
	email: z.string().email(),
	phone: z.string().min(1),
	password: employeePasswordSchema,
	status: z.enum(['invited', 'active', 'disabled']),
	isCeo: z.boolean(),
	roles: z.array(employeeRoleSchema),
	department: z.string(),
	title: z.string(),
	hireDate: z.string(),
	baseSalary: z.number().min(0),
	socialInsuranceSalary: z.number().min(0),
	salaryCurrency: z.string().trim().min(3).max(8),
})

export const adminListEmployees = createServerFn({ method: 'GET' }).handler(
	async (): Promise<AdminEmployeeRow[]> => {
		const auth = await getAdminSupabaseClient(false)
		const { data, error } = await auth.client
			.from('employees')
			.select(EMPLOYEE_COLUMNS)
			.order('full_name', { ascending: true })
		if (error) throw new Error(error.message)
		const rows = (data ?? []) as unknown as SupabaseEmployeeRow[]
		const compensation = await employeeCompensationById(
			rows.map((row) => row.id),
		)
		return rows.map((row) =>
			supabaseEmployeeToAdmin(row, compensation.get(row.id)),
		)
	},
)

export const adminCreateEmployee = createServerFn({ method: 'POST' })
	.inputValidator(EmployeePayload)
	.handler(async ({ data }): Promise<AdminEmployeeRow> => {
		const auth = await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const email = normalizedAdminEmail(data.email)
		await assertAdminAccountEmailAvailable({
			email,
			service,
			type: 'employee',
		})
		const actingEmployeeId = await currentAdminEmployeeId({
			actorUserId: auth.user.id,
			service,
		})
		const userId =
			data.password || data.status === 'active'
				? await ensureEmployeeAuthUser({
						email,
						fullName: data.name,
						isCeo: data.isCeo,
						password: data.password,
						roles: data.roles,
					})
				: null
		const { data: row, error } = await service
			.from('employees')
			.insert({
				full_name: data.name,
				email,
				user_id: userId,
				phone: data.phone,
				status: data.status,
				is_ceo: data.isCeo,
			})
			.select(EMPLOYEE_COLUMNS)
			.single()
		if (error) throw new Error(error.message)
		await upsertEmployeeCompensation(row.id, data, {
			updatedByEmployeeId: actingEmployeeId,
		})
		for (const role of data.roles) {
			const { error: assignError } = await auth.client.rpc(
				'admin_assign_employee_role',
				{
					p_employee_id: row.id,
					p_reason: 'Admin employee create via internal panel',
					p_role: role,
				},
			)
			if (assignError) throw new Error(assignError.message)
		}
		await replaceEmployeePanelPermissions(row.id, data.roles, data.isCeo)
		if (userId) {
			await upsertEmployeeProfileRows({
				authUserId: userId,
				displayName: data.name,
				email,
				employeeId: row.id,
				isCeo: data.isCeo,
				phone: data.phone,
				roles: data.roles,
			})
		}
		await recordAdminAudit(
			{
				action: 'internal_employee_created',
				details: { email_domain: email.split('@')[1], scope: 'employees' },
				entityId: row.id,
				entityType: 'employee',
				reason: 'Admin employee create via internal panel',
			},
			auth.client,
		)
		const { data: fresh, error: freshError } = await service
			.from('employees')
			.select(EMPLOYEE_COLUMNS)
			.eq('id', row.id)
			.single()
		if (freshError) throw new Error(freshError.message)
		const compensation = await employeeCompensationById([row.id])
		return supabaseEmployeeToAdmin(
			fresh as unknown as SupabaseEmployeeRow,
			compensation.get(row.id),
		)
	})

export const adminUpdateEmployee = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string() }).merge(EmployeePayload.partial()))
	.handler(async ({ data }): Promise<AdminEmployeeRow> => {
		const { id, ...patch } = data
		const auth = await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const actingEmployeeId = await currentAdminEmployeeId({
			actorUserId: auth.user.id,
			service,
		})
		const employeePatch: Record<string, unknown> = {}
		if (patch.name !== undefined) employeePatch.full_name = patch.name
		if (patch.phone !== undefined) employeePatch.phone = patch.phone
		if (patch.status !== undefined) employeePatch.status = patch.status
		if (patch.isCeo !== undefined) employeePatch.is_ceo = patch.isCeo

		const { data: currentEmployee, error: currentEmployeeError } = await service
			.from('employees')
			.select(EMPLOYEE_COLUMNS)
			.eq('id', id)
			.single()
		if (currentEmployeeError) throw new Error(currentEmployeeError.message)
		const currentRow = currentEmployee as unknown as SupabaseEmployeeRow
		const nextRoles = patch.roles ?? supabaseEmployeeToAdmin(currentRow).roles
		const nextIsCeo = patch.isCeo ?? currentRow.is_ceo
		const nextName = patch.name ?? currentRow.full_name
		const nextEmail = normalizedAdminEmail(patch.email ?? currentRow.email)
		const nextPhone = patch.phone ?? currentRow.phone ?? ''
		if (patch.email !== undefined) {
			await assertAdminAccountEmailAvailable({
				allowedId: id,
				allowedUserId: currentRow.user_id,
				email: nextEmail,
				service,
				type: 'employee',
			})
			employeePatch.email = nextEmail
		}
		const shouldEnsureAuth =
			patch.password !== undefined ||
			patch.email !== undefined ||
			patch.name !== undefined ||
			patch.roles !== undefined ||
			patch.isCeo !== undefined ||
			(patch.status === 'active' && !currentRow.user_id)
		const shouldSyncProfile = shouldEnsureAuth || patch.phone !== undefined
		if (patch.status === 'active' && !currentRow.user_id && !patch.password) {
			throw new Error('Employee password is required to activate this account')
		}
		if (shouldEnsureAuth && (currentRow.user_id || patch.password)) {
			employeePatch.user_id = await ensureEmployeeAuthUser({
				email: nextEmail,
				fullName: nextName,
				isCeo: nextIsCeo,
				password: patch.password,
				recordId: id,
				roles: nextRoles,
				userId: currentRow.user_id,
			})
		}

		if (Object.keys(employeePatch).length > 0) {
			const { error } = await service
				.from('employees')
				.update(employeePatch)
				.eq('id', id)
			if (error) throw new Error(error.message)
		}
		await upsertEmployeeCompensation(id, patch, {
			updatedByEmployeeId: actingEmployeeId,
		})

		if (patch.roles) {
			const { data: currentRoles, error: roleError } = await auth.client
				.from('employee_roles')
				.select('role')
				.eq('employee_id', id)
			if (roleError) throw new Error(roleError.message)
			const current = new Set(
				((currentRoles ?? []) as unknown as SupabaseEmployeeRoleRow[]).map(
					(role) => role.role,
				),
			)
			const next = new Set(patch.roles)
			for (const role of next) {
				if (current.has(role)) continue
				const { error } = await auth.client.rpc('admin_assign_employee_role', {
					p_employee_id: id,
					p_reason: 'Admin employee role update via internal panel',
					p_role: role,
				})
				if (error) throw new Error(error.message)
			}
			for (const role of current) {
				if (next.has(role)) continue
				const { error } = await auth.client.rpc('admin_remove_employee_role', {
					p_employee_id: id,
					p_reason: 'Admin employee role update via internal panel',
					p_role: role,
				})
				if (error) throw new Error(error.message)
			}
		}
		if (patch.roles || patch.isCeo !== undefined) {
			await replaceEmployeePanelPermissions(id, nextRoles, nextIsCeo)
		}

		const nextUserId =
			typeof employeePatch.user_id === 'string'
				? employeePatch.user_id
				: currentRow.user_id
		if (nextUserId && shouldSyncProfile) {
			await upsertEmployeeProfileRows({
				authUserId: nextUserId,
				displayName: nextName,
				email: nextEmail,
				employeeId: id,
				isCeo: nextIsCeo,
				phone: nextPhone,
				roles: nextRoles,
			})
		}

		await recordAdminAudit(
			{
				action: 'admin_record_updated',
				details: { changed_keys: Object.keys(patch), scope: 'employees' },
				entityId: id,
				entityType: 'employee',
				reason: 'Admin employee update via internal panel',
			},
			auth.client,
		)
		const { data: row, error } = await service
			.from('employees')
			.select(EMPLOYEE_COLUMNS)
			.eq('id', id)
			.single()
		if (error) throw new Error(error.message)
		const compensation = await employeeCompensationById([id])
		return supabaseEmployeeToAdmin(
			row as unknown as SupabaseEmployeeRow,
			compensation.get(id),
		)
	})

export const adminDeleteEmployee = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string(), reason: z.string().min(8) }))
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { error } = await service
			.from('employees')
			.update({ status: 'disabled' })
			.eq('id', data.id)
		if (error) throw new Error(error.message)
		await recordAdminAudit({
			action: 'admin_record_deactivated',
			details: { scope: 'employees' },
			entityId: data.id,
			entityType: 'employee',
			reason: data.reason,
		})
		return { ok: true }
	})

// ─── Drivers ─────────────────────────────────────────────

const DriverPayload = z.object({
	fullName: z.string().min(1),
	email: z.string().email().nullable(),
	phone: z.string().min(1),
	password: optionalPasswordSchema,
	status: z.enum([
		'invited',
		'available',
		'on_delivery',
		'offline',
		'disabled',
	]),
	vehicleLabel: z.string().nullable(),
})

export const adminListDrivers = createServerFn({ method: 'GET' }).handler(
	async (): Promise<DriverRow[]> => {
		await getAdminSupabaseClient(false)
		const service = await getInternalSupabaseAdminClient()
		const { data, error } = await service
			.from('drivers')
			.select(DRIVER_COLUMNS)
			.order('full_name', { ascending: true })
		if (error) throw new Error(error.message)
		return ((data ?? []) as unknown as SupabaseAdminDriverRow[]).map(
			supabaseDriverToAdmin,
		)
	},
)

export const adminCreateDriver = createServerFn({ method: 'POST' })
	.inputValidator(DriverPayload)
	.handler(async ({ data }): Promise<DriverRow> => {
		await getAdminSupabaseClient()
		if (!data.email || !data.password) {
			throw new Error(
				'Driver email and password are required to create a login account',
			)
		}
		const service = await getInternalSupabaseAdminClient()
		const email = normalizedAdminEmail(data.email)
		await assertAdminAccountEmailAvailable({
			email,
			service,
			type: 'driver',
		})
		const userId = await ensureDriverAuthUser({
			email,
			fullName: data.fullName,
			password: data.password,
		})
		const { data: row, error } = await service
			.from('drivers')
			.insert({
				email,
				full_name: data.fullName,
				phone: data.phone,
				status: data.status,
				user_id: userId,
				vehicle_label: data.vehicleLabel,
			})
			.select(DRIVER_COLUMNS)
			.single()
		if (error || !row) {
			throw new Error(error?.message ?? 'Failed to create driver')
		}
		await upsertDriverProfileRows({
			authUserId: userId,
			displayName: data.fullName,
			driverId: row.id,
			email,
			phone: data.phone,
		})
		await recordAdminAudit({
			action: 'admin_record_created',
			details: { email_domain: email.split('@')[1], scope: 'drivers' },
			entityId: row.id,
			entityType: 'driver',
			reason: 'Admin driver create via internal panel',
		})
		return supabaseDriverToAdmin(row as unknown as SupabaseAdminDriverRow)
	})

export const adminUpdateDriver = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ id: z.string().uuid() }).merge(DriverPayload.partial()),
	)
	.handler(async ({ data }): Promise<DriverRow> => {
		const { id, ...patch } = data
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { data: current, error: currentError } = await service
			.from('drivers')
			.select(DRIVER_COLUMNS)
			.eq('id', id)
			.single()
		if (currentError || !current) {
			throw new Error(currentError?.message ?? `Driver ${id} not found`)
		}
		const currentRow = current as unknown as SupabaseAdminDriverRow
		const nextEmail = normalizedNullableAdminEmail(
			patch.email === undefined ? currentRow.email : patch.email,
		)
		const nextFullName = patch.fullName ?? currentRow.full_name
		const nextPhone = patch.phone ?? currentRow.phone
		const shouldEnsureAuth =
			patch.password !== undefined ||
			patch.email !== undefined ||
			patch.fullName !== undefined ||
			(currentRow.user_id === null &&
				patch.status !== undefined &&
				patch.status !== 'invited')
		const shouldSyncProfile = shouldEnsureAuth || patch.phone !== undefined

		const driverPatch: Record<string, unknown> = {}
		if (patch.fullName !== undefined) driverPatch.full_name = patch.fullName
		if (patch.email !== undefined) {
			if (nextEmail) {
				await assertAdminAccountEmailAvailable({
					allowedId: id,
					allowedUserId: currentRow.user_id,
					email: nextEmail,
					service,
					type: 'driver',
				})
			}
			driverPatch.email = nextEmail
		}
		if (patch.phone !== undefined) driverPatch.phone = patch.phone
		if (patch.status !== undefined) driverPatch.status = patch.status
		if (patch.vehicleLabel !== undefined) {
			driverPatch.vehicle_label = patch.vehicleLabel
		}
		if (shouldEnsureAuth) {
			if (!nextEmail) {
				throw new Error('Driver email is required to create login access')
			}
			if (!currentRow.user_id && !patch.password) {
				throw new Error('Driver password is required to activate this account')
			}
			driverPatch.user_id = await ensureDriverAuthUser({
				email: nextEmail,
				fullName: nextFullName,
				password: patch.password,
				recordId: id,
				userId: currentRow.user_id,
			})
		}
		const nextUserId =
			typeof driverPatch.user_id === 'string'
				? driverPatch.user_id
				: currentRow.user_id

		const { data: row, error } = await service
			.from('drivers')
			.update(driverPatch)
			.eq('id', id)
			.select(DRIVER_COLUMNS)
			.single()
		if (error || !row) {
			throw new Error(error?.message ?? `Driver ${id} not found`)
		}
		if (nextUserId && shouldSyncProfile) {
			await upsertDriverProfileRows({
				authUserId: nextUserId,
				displayName: nextFullName,
				driverId: id,
				email: nextEmail,
				phone: nextPhone,
			})
		}
		await recordAdminAudit({
			action: 'admin_record_updated',
			details: { changed_keys: Object.keys(patch), scope: 'drivers' },
			entityId: id,
			entityType: 'driver',
			reason: 'Admin driver update via internal panel',
		})
		return supabaseDriverToAdmin(row as unknown as SupabaseAdminDriverRow)
	})

export const adminDeleteDriver = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ id: z.string().uuid(), reason: z.string().min(8) }),
	)
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		const auth = await getAdminSupabaseClient()
		const { error } = await auth.client.rpc('admin_disable_driver', {
			p_driver_id: data.id,
			p_reason: data.reason,
		})
		if (error) throw new Error(error.message)
		return { ok: true }
	})

// ─── Trucks ──────────────────────────────────────────────

const TruckPayload = z.object({
	plateNumber: z.string().min(1),
	driverId: z.string().uuid().nullable(),
	capacityTons: z.number().min(0),
	bodyType: z.enum(['flatbed', 'curtain-side', 'box', 'tipper']),
	status: z.enum(['available', 'loading', 'dispatched', 'maintenance']),
})

export const adminListTrucks = createServerFn({ method: 'GET' }).handler(
	async (): Promise<TruckRow[]> => {
		await getAdminSupabaseClient(false)
		const service = await getInternalSupabaseAdminClient()
		const { data, error } = await service
			.from('trucks')
			.select(TRUCK_COLUMNS)
			.order('plate_number', { ascending: true })
		if (error) throw new Error(error.message)
		return ((data ?? []) as unknown as SupabaseAdminTruckRow[]).map(
			supabaseTruckToAdmin,
		)
	},
)

export const adminCreateTruck = createServerFn({ method: 'POST' })
	.inputValidator(TruckPayload)
	.handler(async ({ data }): Promise<TruckRow> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { data: row, error } = await service
			.from('trucks')
			.insert({
				body_type: data.bodyType,
				capacity_tons: data.capacityTons,
				driver_id: data.driverId,
				plate_number: data.plateNumber,
				status: data.status,
			})
			.select(TRUCK_COLUMNS)
			.single()
		if (error || !row) {
			throw new Error(error?.message ?? 'Failed to create truck')
		}
		await recordAdminAudit({
			action: 'admin_record_created',
			details: { plate_number: data.plateNumber, scope: 'trucks' },
			entityId: row.id,
			entityType: 'truck',
			reason: 'Admin truck create via internal panel',
		})
		return supabaseTruckToAdmin(row as unknown as SupabaseAdminTruckRow)
	})

export const adminUpdateTruck = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ id: z.string().uuid() }).merge(TruckPayload.partial()),
	)
	.handler(async ({ data }): Promise<TruckRow> => {
		const { id, ...patch } = data
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const truckPatch: Record<string, unknown> = {}
		if (patch.plateNumber !== undefined) {
			truckPatch.plate_number = patch.plateNumber
		}
		if (patch.driverId !== undefined) truckPatch.driver_id = patch.driverId
		if (patch.capacityTons !== undefined) {
			truckPatch.capacity_tons = patch.capacityTons
		}
		if (patch.bodyType !== undefined) truckPatch.body_type = patch.bodyType
		if (patch.status !== undefined) truckPatch.status = patch.status
		const { data: row, error } = await service
			.from('trucks')
			.update(truckPatch)
			.eq('id', id)
			.select(TRUCK_COLUMNS)
			.single()
		if (error || !row) {
			throw new Error(error?.message ?? `Truck ${id} not found`)
		}
		await recordAdminAudit({
			action: 'admin_record_updated',
			details: { changed_keys: Object.keys(patch), scope: 'trucks' },
			entityId: id,
			entityType: 'truck',
			reason: 'Admin truck update via internal panel',
		})
		return supabaseTruckToAdmin(row as unknown as SupabaseAdminTruckRow)
	})

export const adminDeleteTruck = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		await getAdminSupabaseClient()
		await recordAdminAudit({
			action: 'admin_record_deactivated',
			details: { scope: 'trucks' },
			entityId: data.id,
			entityType: 'truck',
			reason: 'Admin truck delete via internal panel',
		})
		const service = await getInternalSupabaseAdminClient()
		const { error } = await service.from('trucks').delete().eq('id', data.id)
		if (error) throw new Error(error.message)
		return { ok: true }
	})

// ─── Suppliers ───────────────────────────────────────────

const SupplierPayload = z.object({
	name: z.string().min(1),
	email: z.string().email().nullable(),
	status: z.enum(['active', 'inactive', 'blocked']),
	notes: z.string().nullable(),
	tier: z.enum(['preferred', 'approved', 'conditional', 'new']),
	paymentTerms: z.string(),
	phone: z.string().nullable(),
	rating: z.number().min(0).max(5),
	customBadges: z.array(z.string()),
})

export const adminListSuppliers = createServerFn({ method: 'GET' }).handler(
	async (): Promise<SupplierRow[]> => {
		const auth = await getAdminSupabaseClient(false)
		const { data, error } = await auth.client
			.from('suppliers')
			.select(SUPPLIER_COLUMNS)
			.order('name', { ascending: true })
		if (error) throw new Error(error.message)
		return ((data ?? []) as unknown as SupabaseSupplierRow[]).map(
			supabaseSupplierToAdmin,
		)
	},
)

export const adminCreateSupplier = createServerFn({ method: 'POST' })
	.inputValidator(SupplierPayload)
	.handler(async ({ data }): Promise<SupplierRow> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { data: row, error } = await service
			.from('suppliers')
			.insert({
				custom_badges: data.customBadges,
				email: data.email,
				name: data.name,
				notes: data.notes,
				payment_terms: data.paymentTerms,
				phone: data.phone,
				rating: data.rating,
				status: data.status,
				tier: data.tier,
			})
			.select(SUPPLIER_COLUMNS)
			.single()
		if (error) throw new Error(error.message)
		await recordAdminAudit({
			action: 'admin_record_created',
			details: { name: data.name, scope: 'suppliers' },
			entityId: row.id,
			entityType: 'supplier',
			reason: 'Admin supplier create via internal panel',
		})
		return supabaseSupplierToAdmin(row as unknown as SupabaseSupplierRow)
	})

export const adminUpdateSupplier = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ id: z.string().uuid() }).merge(SupplierPayload.partial()),
	)
	.handler(async ({ data }): Promise<SupplierRow> => {
		const { id, name, ...patch } = data
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const supplierPatch: Record<string, unknown> = {}
		if (name !== undefined) supplierPatch.name = name
		if (patch.email !== undefined) supplierPatch.email = patch.email
		if (patch.status !== undefined) supplierPatch.status = patch.status
		if (patch.notes !== undefined) supplierPatch.notes = patch.notes
		if (patch.tier !== undefined) supplierPatch.tier = patch.tier
		if (patch.paymentTerms !== undefined) {
			supplierPatch.payment_terms = patch.paymentTerms
		}
		if (patch.phone !== undefined) supplierPatch.phone = patch.phone
		if (patch.rating !== undefined) supplierPatch.rating = patch.rating
		if (patch.customBadges !== undefined) {
			supplierPatch.custom_badges = patch.customBadges
		}
		const { data: row, error } = await service
			.from('suppliers')
			.update(supplierPatch)
			.eq('id', id)
			.select(SUPPLIER_COLUMNS)
			.single()
		if (error) throw new Error(error.message)
		await recordAdminAudit({
			action: 'admin_record_updated',
			details: {
				changed_keys: Object.keys(supplierPatch),
				scope: 'suppliers',
			},
			entityId: row.id,
			entityType: 'supplier',
			reason: 'Admin supplier update via internal panel',
		})
		return supabaseSupplierToAdmin(row as unknown as SupabaseSupplierRow)
	})

export const adminDeleteSupplier = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ id: z.string().uuid(), reason: z.string().min(8) }),
	)
	.handler(async ({ data }): Promise<{ ok: boolean; removedItems: number }> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { data: row, error } = await service
			.from('suppliers')
			.update({ status: 'inactive' })
			.eq('id', data.id)
			.select('id')
			.single()
		if (error) throw new Error(error.message)
		await recordAdminAudit({
			action: 'admin_record_deactivated',
			details: { scope: 'suppliers' },
			entityId: row.id,
			entityType: 'supplier',
			reason: data.reason,
		})
		return { ok: true, removedItems: 0 }
	})

// ─── Supplier specialties ────────────────────────────────

const SupplierSpecialtyScopePayload = z.object({
	categorySlug: z.string().trim().min(1),
	productSlug: z.string().trim().min(1).nullable(),
})

const SupplierSpecialtyCreatePayload = z
	.object({
		supplierId: z.string().uuid(),
	})
	.merge(SupplierSpecialtyScopePayload)

const SupplierSpecialtyUpdatePayload = z
	.object({
		id: z.string().uuid(),
	})
	.merge(SupplierSpecialtyScopePayload)

async function assertSupplierSpecialtyScope(
	service: InternalSupabaseAdminClient,
	data: z.infer<typeof SupplierSpecialtyScopePayload>,
) {
	const { data: category, error: categoryError } = await service
		.from('categories')
		.select('slug')
		.eq('slug', data.categorySlug)
		.maybeSingle()
	if (categoryError) throw new Error(categoryError.message)
	if (!category?.slug) {
		throw new Error(`Category ${data.categorySlug} not found`)
	}

	if (!data.productSlug) return

	const { data: product, error: productError } = await service
		.from('products')
		.select('slug, category')
		.eq('slug', data.productSlug)
		.maybeSingle()
	if (productError) throw new Error(productError.message)
	if (!product?.slug) {
		throw new Error(`Product ${data.productSlug} not found`)
	}
	if (product.category !== data.categorySlug) {
		throw new Error('Product does not belong to the selected category')
	}
}

export const adminListSupplierSpecialties = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ supplierId: z.string().uuid() }))
	.handler(async ({ data }): Promise<AdminSupplierSpecialtyRow[]> => {
		await getAdminSupabaseClient(false)
		const service = await getInternalSupabaseAdminClient()
		const { data: rows, error } = await service
			.from('supplier_specialties')
			.select(SUPPLIER_SPECIALTY_COLUMNS)
			.eq('supplier_id', data.supplierId)
			.order('category_slug', { ascending: true })
			.order('product_slug', { ascending: true, nullsFirst: true })
		if (error) throw new Error(error.message)
		return ((rows ?? []) as unknown as SupabaseSupplierSpecialtyRow[]).map(
			supabaseSupplierSpecialtyToAdmin,
		)
	})

export const adminAddSupplierSpecialty = createServerFn({ method: 'POST' })
	.inputValidator(SupplierSpecialtyCreatePayload)
	.handler(async ({ data }): Promise<AdminSupplierSpecialtyRow> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const [{ data: supplier, error: supplierError }] = await Promise.all([
			service.from('suppliers').select('id').eq('id', data.supplierId).single(),
			assertSupplierSpecialtyScope(service, data),
		])
		if (supplierError) throw new Error(supplierError.message)
		if (!supplier?.id) throw new Error(`Supplier ${data.supplierId} not found`)

		const { data: row, error } = await service
			.from('supplier_specialties')
			.insert({
				category_slug: data.categorySlug,
				product_slug: data.productSlug,
				supplier_id: data.supplierId,
			})
			.select(SUPPLIER_SPECIALTY_COLUMNS)
			.single()
		if (error || !row) {
			throw new Error(error?.message ?? 'Failed to create supplier specialty')
		}
		await recordAdminAudit({
			action: 'admin_record_created',
			details: {
				category_slug: data.categorySlug,
				product_slug: data.productSlug,
				scope: 'supplier_specialties',
			},
			entityId: row.id,
			entityType: 'supplier_specialty',
			reason: 'Admin supplier specialty create via internal panel',
		})
		return supabaseSupplierSpecialtyToAdmin(
			row as unknown as SupabaseSupplierSpecialtyRow,
		)
	})

export const adminUpdateSupplierSpecialty = createServerFn({ method: 'POST' })
	.inputValidator(SupplierSpecialtyUpdatePayload)
	.handler(async ({ data }): Promise<AdminSupplierSpecialtyRow> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		await assertSupplierSpecialtyScope(service, data)
		const { data: row, error } = await service
			.from('supplier_specialties')
			.update({
				category_slug: data.categorySlug,
				product_slug: data.productSlug,
			})
			.eq('id', data.id)
			.select(SUPPLIER_SPECIALTY_COLUMNS)
			.single()
		if (error || !row) {
			throw new Error(
				error?.message ?? `Supplier specialty ${data.id} not found`,
			)
		}
		await recordAdminAudit({
			action: 'admin_record_updated',
			details: {
				category_slug: data.categorySlug,
				product_slug: data.productSlug,
				scope: 'supplier_specialties',
			},
			entityId: row.id,
			entityType: 'supplier_specialty',
			reason: 'Admin supplier specialty update via internal panel',
		})
		return supabaseSupplierSpecialtyToAdmin(
			row as unknown as SupabaseSupplierSpecialtyRow,
		)
	})

export const adminRemoveSupplierSpecialty = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const { error } = await service
			.from('supplier_specialties')
			.delete()
			.eq('id', data.id)
		if (error) throw new Error(error.message)
		await recordAdminAudit({
			action: 'admin_record_deactivated',
			details: { scope: 'supplier_specialties' },
			entityId: data.id,
			entityType: 'supplier_specialty',
			reason: 'Admin supplier specialty delete via internal panel',
		})
		return { ok: true }
	})

// ─── Pricing rules ───────────────────────────────────────

const PricingRulePayloadFields = z.object({
	categorySlug: z.string().min(1).nullable(),
	productSlug: z.string().min(1).nullable(),
	bonusMargin: z.number().min(0).max(99),
	targetMargin: z.number().min(0).max(99),
	floorMargin: z.number().min(0).max(99),
	active: z.boolean(),
})

function validatePricingRulePayload(
	data: z.infer<typeof PricingRulePayloadFields>,
	ctx: z.RefinementCtx,
) {
	if (data.productSlug && !data.categorySlug) {
		ctx.addIssue({
			code: 'custom',
			message: 'Product exceptions require a category',
			path: ['productSlug'],
		})
	}
	if (data.floorMargin > data.targetMargin) {
		ctx.addIssue({
			code: 'custom',
			message: 'Floor margin cannot be above target margin',
			path: ['floorMargin'],
		})
	}
	if (data.targetMargin > data.bonusMargin) {
		ctx.addIssue({
			code: 'custom',
			message: 'Target margin cannot be above bonus margin',
			path: ['targetMargin'],
		})
	}
}

const PricingRuleCreatePayload = PricingRulePayloadFields.superRefine(
	validatePricingRulePayload,
)
const PricingRuleUpdatePayload = PricingRulePayloadFields.extend({
	id: z.string().uuid(),
}).superRefine(validatePricingRulePayload)

function pricingRulePayloadForSupabase(
	data: z.infer<typeof PricingRulePayloadFields>,
	employeeId: string | null,
) {
	const categorySlug = data.categorySlug?.trim() || null
	const productSlug = data.productSlug?.trim() || null
	return {
		absolute_min_margin: data.floorMargin,
		active: data.active,
		bonus_margin: data.bonusMargin,
		category_slug: categorySlug,
		floor_margin: data.floorMargin,
		product_category: categorySlug
			? productSlug
				? `${categorySlug}:${productSlug}`
				: categorySlug
			: 'all',
		product_slug: productSlug,
		target_margin: data.targetMargin,
		updated_by_employee_id: employeeId,
	}
}

export const adminListPricingRules = createServerFn({ method: 'GET' }).handler(
	async (): Promise<AdminPricingRuleRow[]> => {
		await getAdminSupabaseClient(false)
		const service = await getInternalSupabaseAdminClient()
		const { data, error } = await service
			.from('pricing_rules')
			.select(PRICING_RULE_COLUMNS)
			.order('category_slug', { ascending: true, nullsFirst: true })
			.order('product_slug', { ascending: true, nullsFirst: true })
		if (error) throw new Error(error.message)
		return ((data ?? []) as unknown as SupabasePricingRuleRow[]).map(
			supabasePricingRuleToAdmin,
		)
	},
)

export const adminCreatePricingRule = createServerFn({ method: 'POST' })
	.inputValidator(PricingRuleCreatePayload)
	.handler(async ({ data }): Promise<AdminPricingRuleRow> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const employeeId = await currentAdminEmployeeId()
		const { data: row, error } = await service
			.from('pricing_rules')
			.insert(pricingRulePayloadForSupabase(data, employeeId))
			.select(PRICING_RULE_COLUMNS)
			.single()
		if (error || !row) {
			throw new Error(error?.message ?? 'Failed to create pricing rule')
		}
		await recordAdminAudit({
			action: 'admin_record_created',
			details: { scope: 'pricing_rules' },
			entityId: row.id,
			entityType: 'pricing_rule',
			reason: 'Admin pricing rule create via internal panel',
		})
		return supabasePricingRuleToAdmin(row as unknown as SupabasePricingRuleRow)
	})

export const adminUpdatePricingRule = createServerFn({ method: 'POST' })
	.inputValidator(PricingRuleUpdatePayload)
	.handler(async ({ data }): Promise<AdminPricingRuleRow> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const employeeId = await currentAdminEmployeeId()
		const { data: row, error } = await service
			.from('pricing_rules')
			.update(pricingRulePayloadForSupabase(data, employeeId))
			.eq('id', data.id)
			.select(PRICING_RULE_COLUMNS)
			.single()
		if (error || !row) {
			throw new Error(error?.message ?? `Pricing rule ${data.id} not found`)
		}
		await recordAdminAudit({
			action: 'admin_record_updated',
			details: { scope: 'pricing_rules' },
			entityId: row.id,
			entityType: 'pricing_rule',
			reason: 'Admin pricing rule update via internal panel',
		})
		return supabasePricingRuleToAdmin(row as unknown as SupabasePricingRuleRow)
	})

export const adminDeletePricingRule = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string().uuid() }))
	.handler(async ({ data }): Promise<{ ok: boolean }> => {
		await getAdminSupabaseClient()
		const service = await getInternalSupabaseAdminClient()
		const employeeId = await currentAdminEmployeeId()
		const { data: existing, error: existingError } = await service
			.from('pricing_rules')
			.select('id, category_slug, product_slug')
			.eq('id', data.id)
			.maybeSingle()
		if (existingError) throw new Error(existingError.message)
		if (!existing) throw new Error(`Pricing rule ${data.id} not found`)
		if (!existing.category_slug && !existing.product_slug) {
			throw new Error('Global pricing defaults cannot be deleted')
		}
		const { error } = await service
			.from('pricing_rules')
			.update({ active: false, updated_by_employee_id: employeeId })
			.eq('id', data.id)
		if (error) throw new Error(error.message)
		await recordAdminAudit({
			action: 'admin_record_deactivated',
			details: { scope: 'pricing_rules' },
			entityId: data.id,
			entityType: 'pricing_rule',
			reason: 'Admin pricing rule deactivate via internal panel',
		})
		return { ok: true }
	})

// ─── Scoped exports ──────────────────────────────────────

export const adminExportData = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			scope: z.enum([
				'products',
				'categories',
				'customers',
				'drivers',
				'suppliers',
				'employees',
				'pricing_rules',
				'trucks',
			]),
			reason: z.string().min(8),
		}),
	)
	.handler(async ({ data }): Promise<AdminExportResult> => {
		const auth = await getAdminSupabaseClient()
		const { data: payload, error } = await auth.client.rpc(
			'admin_export_data',
			{
				p_reason: data.reason,
				p_scope: data.scope,
			},
		)
		if (error) throw new Error(error.message)
		return payload as AdminExportResult
	})
