// Developer admin — server functions
//
// Thin CRUD over the mock DB for the five admin volumes. No business
// logic, no filtering, no derived state. The admin panel is the dev's
// direct window on the tables; every function here should be a
// one-liner over db.ts.
//
// All mutations validate input with Zod (per project rules). Reads
// return whatever the DB accessor returns.

import type { CatalogProduct } from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import {
	type CustomerRow,
	db,
	type EmployeeRow,
	type JsonObject,
	type SupplierPriceRow,
	type SupplierRow,
	type TruckRow,
} from '../db/db'
import { toJsonObject } from './json'

/**
 * Admin returns products with specifications narrowed to a JSON-safe
 * shape. CatalogProduct uses `Record<string, unknown>` which TanStack
 * Start's serializer cannot round-trip without widening to `unknown`.
 */
type AdminProduct = Omit<CatalogProduct, 'specifications'> & {
	specifications: JsonObject
}

function toAdminProduct(p: CatalogProduct): AdminProduct {
	return { ...p, specifications: toJsonObject(p.specifications) }
}

// ─── Customers ───────────────────────────────────────────

const CustomerPayload = z.object({
	companyName: z.string().min(1),
	tier: z.enum(['A', 'B', 'C', 'new']),
	status: z.enum(['unclaimed', 'claimed', 'active', 'inactive']),
	contactName: z.string().min(1),
	phone: z.string().min(1),
	email: z.string().email().nullable(),
	address: z.string(),
	city: z.string(),
	creditLimit: z.number().min(0),
	currentExposure: z.number().min(0),
	orderCount: z.number().int().min(0),
	lifetimeValue: z.number().min(0),
	avgMargin: z.number(),
	paymentHistory: z.enum(['excellent', 'good', 'fair', 'poor']),
	assignedSalesRep: z.string().nullable(),
})

export const adminListCustomers = createServerFn({ method: 'GET' }).handler(
	async (): Promise<CustomerRow[]> => db.customers.list(),
)

export const adminCreateCustomer = createServerFn({ method: 'POST' })
	.inputValidator(CustomerPayload)
	.handler(async ({ data }): Promise<CustomerRow> => db.customers.insert(data))

export const adminUpdateCustomer = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string() }).merge(CustomerPayload.partial()))
	.handler(async ({ data }): Promise<CustomerRow> => {
		const { id, ...patch } = data
		const next = db.customers.update(id, patch)
		if (!next) throw new Error(`Customer ${id} not found`)
		return next
	})

export const adminDeleteCustomer = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string() }))
	.handler(
		async ({ data }): Promise<{ ok: boolean }> => ({
			ok: db.customers.remove(data.id),
		}),
	)

// ─── Products ────────────────────────────────────────────

const ProductPayload = z.object({
	slug: z.string().min(1),
	sku: z.string().min(1),
	name: z.string().min(1),
	name_ar: z.string(),
	description: z.string(),
	description_ar: z.string(),
	category: z.string().min(1),
	subcategory: z.string(),
	brand: z.string().nullable(),
	manufacturer: z.string(),
	specifications: z.record(z.string(), z.unknown()),
	unit_of_measure: z.string().min(1),
	weight_kg: z.number().min(0),
	price_range_min: z.number().min(0),
	price_range_max: z.number().min(0),
	price_tier: z.enum(['budget', 'mid_range', 'premium']),
	availability_status: z.enum(['available', 'low_stock', 'out_of_stock']),
	tags: z.array(z.string()),
	is_stockable: z.boolean(),
	pictureUrl: z.string().nullable(),
})

export const adminListProducts = createServerFn({ method: 'GET' }).handler(
	async (): Promise<AdminProduct[]> => db.products.list().map(toAdminProduct),
)

export const adminCreateProduct = createServerFn({ method: 'POST' })
	.inputValidator(ProductPayload)
	.handler(
		async ({ data }): Promise<AdminProduct> =>
			toAdminProduct(db.products.insert(data)),
	)

export const adminUpdateProduct = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string() }).merge(ProductPayload.partial()))
	.handler(async ({ data }): Promise<AdminProduct> => {
		const { id, ...patch } = data
		const next = db.products.update(id, patch)
		if (!next) throw new Error(`Product ${id} not found`)
		return toAdminProduct(next)
	})

export const adminDeleteProduct = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string() }))
	.handler(
		async ({ data }): Promise<{ ok: boolean }> => ({
			ok: db.products.remove(data.id),
		}),
	)

// ─── Employees ───────────────────────────────────────────

const EmployeePayload = z.object({
	name: z.string().min(1),
	name_ar: z.string().min(1),
	phone: z.string().min(1),
})

export const adminListEmployees = createServerFn({ method: 'GET' }).handler(
	async (): Promise<EmployeeRow[]> => db.employees.list(),
)

export const adminCreateEmployee = createServerFn({ method: 'POST' })
	.inputValidator(EmployeePayload)
	.handler(async ({ data }): Promise<EmployeeRow> => db.employees.insert(data))

export const adminUpdateEmployee = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string() }).merge(EmployeePayload.partial()))
	.handler(async ({ data }): Promise<EmployeeRow> => {
		const { id, ...patch } = data
		const next = db.employees.update(id, patch)
		if (!next) throw new Error(`Employee ${id} not found`)
		return next
	})

export const adminDeleteEmployee = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string() }))
	.handler(
		async ({ data }): Promise<{ ok: boolean }> => ({
			ok: db.employees.remove(data.id),
		}),
	)

// ─── Drivers (trucks) ────────────────────────────────────

const TruckPayload = z.object({
	plateNumber: z.string().min(1),
	driverName: z.string().min(1),
	driverPhone: z.string().min(1),
	capacityTons: z.number().min(0),
	bodyType: z.enum(['flatbed', 'curtain-side', 'box', 'tipper']),
	status: z.enum(['available', 'loading', 'dispatched', 'maintenance']),
})

export const adminListTrucks = createServerFn({ method: 'GET' }).handler(
	async (): Promise<TruckRow[]> => db.trucks.list(),
)

export const adminCreateTruck = createServerFn({ method: 'POST' })
	.inputValidator(TruckPayload)
	.handler(async ({ data }): Promise<TruckRow> => db.trucks.insert(data))

export const adminUpdateTruck = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string() }).merge(TruckPayload.partial()))
	.handler(async ({ data }): Promise<TruckRow> => {
		const { id, ...patch } = data
		const next = db.trucks.update(id, patch)
		if (!next) throw new Error(`Truck ${id} not found`)
		return next
	})

export const adminDeleteTruck = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string() }))
	.handler(
		async ({ data }): Promise<{ ok: boolean }> => ({
			ok: db.trucks.remove(data.id),
		}),
	)

// ─── Suppliers ───────────────────────────────────────────

const SupplierPayload = z.object({
	name: z.string().min(1),
	tier: z.enum(['preferred', 'approved', 'conditional', 'new']),
	paymentTerms: z.string(),
	phone: z.string().nullable(),
	rating: z.number().min(0).max(5),
	customBadges: z.array(z.string()),
})

export const adminListSuppliers = createServerFn({ method: 'GET' }).handler(
	async (): Promise<SupplierRow[]> => db.suppliers.list(),
)

export const adminCreateSupplier = createServerFn({ method: 'POST' })
	.inputValidator(SupplierPayload)
	.handler(async ({ data }): Promise<SupplierRow> => {
		// upsert creates when absent; the admin flow always provides a full payload.
		const { name, ...rest } = data
		return db.suppliers.upsert(name, rest)
	})

export const adminUpdateSupplier = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({ originalName: z.string() }).merge(SupplierPayload.partial()),
	)
	.handler(async ({ data }): Promise<SupplierRow> => {
		const { originalName, name, ...patch } = data
		// Rename = delete old key, upsert new, cascade to supplier_prices so
		// every sub-table id stays pointing at the right parent.
		if (name && name !== originalName) {
			const existing = db.suppliers.get(originalName)
			if (!existing) throw new Error(`Supplier ${originalName} not found`)
			db.suppliers.remove(originalName)
			db.supplierPrices.renameSupplier(originalName, name)
			return db.suppliers.upsert(name, { ...existing, ...patch })
		}
		const next = db.suppliers.upsert(originalName, patch)
		return next
	})

export const adminDeleteSupplier = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ name: z.string() }))
	.handler(async ({ data }): Promise<{ ok: boolean; removedItems: number }> => {
		const removedItems = db.supplierPrices.removeForSupplier(data.name)
		const ok = db.suppliers.remove(data.name)
		return { ok, removedItems }
	})

// ─── Supplier items (supplier_prices sub-table) ──────────

const SupplierItemPayload = z.object({
	supplierName: z.string().min(1),
	productSlug: z.string().min(1),
	rawCost: z.number().min(0),
	leadTimeDays: z.number().int().min(0),
	minOrderQty: z.number().int().min(0),
	isPrimary: z.boolean(),
	notes: z.string().nullable(),
})

export const adminListSupplierItems = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ supplierName: z.string() }))
	.handler(
		async ({ data }): Promise<SupplierPriceRow[]> =>
			db.supplierPrices.forSupplier(data.supplierName),
	)

export const adminAddSupplierItem = createServerFn({ method: 'POST' })
	.inputValidator(SupplierItemPayload)
	.handler(
		async ({ data }): Promise<SupplierPriceRow> =>
			db.supplierPrices.insert(data),
	)

export const adminUpdateSupplierItem = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			id: z.string(),
			rawCost: z.number().min(0).optional(),
			leadTimeDays: z.number().int().min(0).optional(),
			minOrderQty: z.number().int().min(0).optional(),
			isPrimary: z.boolean().optional(),
			notes: z.string().nullable().optional(),
		}),
	)
	.handler(async ({ data }): Promise<SupplierPriceRow> => {
		const { id, ...patch } = data
		const next = db.supplierPrices.update(id, patch)
		if (!next) throw new Error(`Supplier item ${id} not found`)
		return next
	})

export const adminRemoveSupplierItem = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ id: z.string() }))
	.handler(
		async ({ data }): Promise<{ ok: boolean }> => ({
			ok: db.supplierPrices.remove(data.id),
		}),
	)
