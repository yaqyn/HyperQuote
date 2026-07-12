import { type BroadCategory, getBroadCategory } from '@hyperquote/types'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getInternalSupabaseClient } from './_supabase'
import { verifyEmployeeCredential } from './employee-credentials'

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const proofInput = z.object({
	proofDocumentId: z.string().regex(UUID_RE).optional(),
	proofPath: z.string().trim().min(1),
})

const recordDamageInput = proofInput.extend({
	productId: z.string().regex(UUID_RE),
	quantity: z.number().positive(),
	reason: z.string().trim().min(5).max(600),
	recoveryPercent: z.number().min(0).max(100).optional(),
	recoveryUnitValue: z.number().min(0).optional(),
})

const damageLotQuantityInput = proofInput.extend({
	lotId: z.string().regex(UUID_RE),
	quantity: z.number().positive(),
})

const sellDamagedInventoryInput = damageLotQuantityInput.extend({
	counterpartyName: z.string().trim().min(2).max(160),
	paymentStatus: z.enum(['paid', 'receivable']),
	unitSalePrice: z.number().positive(),
})

const disposeDamagedInventoryInput = damageLotQuantityInput.extend({
	reason: z.string().trim().min(5).max(600),
})

const reverseDamageInput = damageLotQuantityInput.extend({
	managerEmployeeId: z.string().regex(UUID_RE),
	managerPassword: z.string().trim().min(1),
	reason: z.string().trim().min(5).max(600),
})

type DamageLotQuantityInput = z.infer<typeof damageLotQuantityInput>

function damageLotQuantityProofParams(data: DamageLotQuantityInput) {
	return {
		p_lot_id: data.lotId,
		p_proof_document_id: data.proofDocumentId ?? null,
		p_proof_path: data.proofPath,
		p_quantity: data.quantity,
	}
}

export interface DamageableInventoryProduct {
	availableQuantity: number
	category: string
	name: string
	onHandQuantity: number
	productId: string
	reservedQuantity: number
	sku: string
	slug: string
	unit: string
	unitCost: number
}

export interface InventoryDamageApproverView {
	email: string
	id: string
	name: string
	roleLabel: string
}

type InventoryDamageLotStatus =
	| 'open'
	| 'sold'
	| 'disposed'
	| 'reversed'
	| 'closed'

type InventoryDamageTransactionType =
	| 'recorded'
	| 'sold'
	| 'disposed'
	| 'reversed'

interface InventoryDamageTransactionView {
	amount: number
	carryingAmount: number
	counterpartyName: string | null
	createdAt: string
	createdByEmployeeId: string | null
	id: string
	journalEntryId: string | null
	managerEmployeeId: string | null
	managerName: string | null
	paymentStatus: string | null
	proofDocumentId: string | null
	proofPath: string | null
	quantity: number
	reason: string | null
	transactionType: InventoryDamageTransactionType
	unitPrice: number | null
	writeDownReversalAmount: number
}

export interface InventoryDamageLotView {
	broadCategory: BroadCategory
	carryingTotalValue: number
	carryingUnitValue: number
	category: string
	createdAt: string
	damageNumber: string
	disposedQuantity: number
	id: string
	journalEntryId: string | null
	name: string
	originalQuantity: number
	originalTotalValue: number
	originalUnitCost: number
	productId: string
	productName: string
	proofDocumentId: string | null
	proofPath: string | null
	reason: string
	recoveryUnitValue: number
	remainingCarryingValue: number
	remainingQuantity: number
	reversedQuantity: number
	sku: string
	soldQuantity: number
	status: InventoryDamageLotStatus
	transactions: InventoryDamageTransactionView[]
	unit: string
	updatedAt: string
	writeDownAmount: number
}

export interface DamagedInventoryOverview {
	approvers: InventoryDamageApproverView[]
	currentEmployeeId: string | null
	lots: InventoryDamageLotView[]
	products: DamageableInventoryProduct[]
	totals: {
		disposedUnits: number
		openLots: number
		originalValue: number
		recoveredIncome: number
		remainingCarryingValue: number
		remainingUnits: number
		reversedUnits: number
		soldUnits: number
		writeDownAmount: number
	}
}

interface ProductRow {
	category: string
	id: string
	name: string
	price_range_max: number | null
	price_range_min: number | null
	sku: string
	slug: string
	unit_of_measure: string
}

interface StockRow {
	available_quantity: number
	on_hand_quantity: number
	product_id: string
	reserved_quantity: number
}

interface SupplierRow {
	status: string | null
}

interface SupplierLinkRow {
	is_primary: boolean
	product_id: string
	raw_cost: number
	suppliers: SupplierRow | SupplierRow[] | null
	updated_at: string
}

interface DamageLotRow {
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
	products:
		| {
				category: string
				name: string
				sku: string
				unit_of_measure: string
		  }
		| Array<{
				category: string
				name: string
				sku: string
				unit_of_measure: string
		  }>
		| null
	proof_document_id: string | null
	proof_path: string | null
	reason: string
	recovery_unit_value: number
	remaining_quantity: number
	reversed_quantity: number
	sold_quantity: number
	status: InventoryDamageLotStatus
	updated_at: string
	write_down_amount: number
}

interface DamageTransactionRow {
	amount: number
	carrying_amount: number
	counterparty_name: string | null
	created_at: string
	created_by_employee_id: string | null
	employees:
		| {
				full_name: string
		  }
		| Array<{
				full_name: string
		  }>
		| null
	id: string
	journal_entry_id: string | null
	lot_id: string
	manager_employee_id: string | null
	payment_status: string | null
	proof_document_id: string | null
	proof_path: string | null
	quantity: number
	reason: string | null
	transaction_type: InventoryDamageTransactionType
	unit_price: number | null
	write_down_reversal_amount: number
}

interface EmployeeRoleRow {
	role: string
}

interface EmployeePanelPermissionRow {
	can_write: boolean
	panel: string
}

interface EmployeeRow {
	email: string
	employee_panel_permissions: EmployeePanelPermissionRow[] | null
	employee_roles: EmployeeRoleRow[] | null
	full_name: string
	id: string
	is_ceo: boolean
}

function firstRelation<T>(value: T | T[] | null): T | null {
	if (Array.isArray(value)) return value[0] ?? null
	return value
}

function roundMoney(value: number): number {
	return Math.round(value * 100) / 100
}

function numeric(value: number | string | null | undefined): number {
	if (typeof value === 'number') return value
	if (typeof value === 'string') return Number(value)
	return 0
}

function productUnitCost(
	product: ProductRow,
	links: SupplierLinkRow[],
): number {
	const activeLinks = links
		.filter((link) => {
			const supplier = firstRelation(link.suppliers)
			return !supplier || supplier.status === 'active'
		})
		.sort((a, b) => {
			if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1
			return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
		})
	const supplierCost = activeLinks[0]?.raw_cost
	return roundMoney(
		numeric(supplierCost ?? product.price_range_min ?? product.price_range_max),
	)
}

function approverRoleLabel(employee: EmployeeRow): string {
	if (employee.is_ceo) return 'CEO'
	const roles = new Set((employee.employee_roles ?? []).map((row) => row.role))
	if (roles.has('admin')) return 'Admin'
	if (roles.has('inventory')) return 'Inventory'
	return 'Inventory approval'
}

function canApproveInventoryDamage(employee: EmployeeRow): boolean {
	if (employee.is_ceo) return true
	const roles = new Set((employee.employee_roles ?? []).map((row) => row.role))
	if (roles.has('admin') || roles.has('inventory')) return true
	return (employee.employee_panel_permissions ?? []).some(
		(permission) => permission.panel === 'inventory' && permission.can_write,
	)
}

async function requireInventoryPanel(writeRequired: boolean) {
	return getInternalSupabaseClient({
		panel: 'inventory',
		writeRequired,
	})
}

async function loadDamageableProducts(
	auth: Awaited<ReturnType<typeof getInternalSupabaseClient>>,
): Promise<DamageableInventoryProduct[]> {
	const { data: productData, error: productError } = await auth.client
		.from('products')
		.select(
			'id, slug, sku, name, category, unit_of_measure, price_range_min, price_range_max',
		)
		.eq('is_active', true)
		.eq('is_stockable', true)
		.order('name', { ascending: true })
	if (productError) throw new Error(productError.message)

	const products = (productData ?? []) as unknown as ProductRow[]
	const productIds = products.map((product) => product.id)
	if (productIds.length === 0) return []

	const { data: stockData, error: stockError } = await auth.client
		.from('inventory_stock')
		.select(
			'product_id, on_hand_quantity, reserved_quantity, available_quantity',
		)
		.in('product_id', productIds)
	if (stockError) throw new Error(stockError.message)

	const { data: linkData, error: linkError } = await auth.client
		.from('supplier_product_links')
		.select(
			'product_id, raw_cost, is_primary, updated_at, suppliers ( status )',
		)
		.in('product_id', productIds)
	if (linkError) throw new Error(linkError.message)

	const stockByProduct = new Map(
		((stockData ?? []) as unknown as StockRow[]).map((row) => [
			row.product_id,
			row,
		]),
	)
	const linksByProduct = new Map<string, SupplierLinkRow[]>()
	for (const link of (linkData ?? []) as unknown as SupplierLinkRow[]) {
		const list = linksByProduct.get(link.product_id) ?? []
		list.push(link)
		linksByProduct.set(link.product_id, list)
	}

	return products
		.map((product) => {
			const stock = stockByProduct.get(product.id)
			const onHand = numeric(stock?.on_hand_quantity)
			const reserved = numeric(stock?.reserved_quantity)
			const available = Math.max(
				0,
				numeric(stock?.available_quantity ?? onHand - reserved),
			)
			return {
				availableQuantity: available,
				category: product.category,
				name: product.name,
				onHandQuantity: onHand,
				productId: product.id,
				reservedQuantity: reserved,
				sku: product.sku,
				slug: product.slug,
				unit: product.unit_of_measure,
				unitCost: productUnitCost(
					product,
					linksByProduct.get(product.id) ?? [],
				),
			}
		})
		.filter((product) => product.availableQuantity > 0)
}

async function loadDamageLots(
	auth: Awaited<ReturnType<typeof getInternalSupabaseClient>>,
): Promise<InventoryDamageLotView[]> {
	const { data: lotData, error: lotError } = await auth.client
		.from('inventory_damage_lots')
		.select(`
			id,
			damage_number,
			product_id,
			reason,
			original_quantity,
			remaining_quantity,
			sold_quantity,
			disposed_quantity,
			reversed_quantity,
			original_unit_cost,
			recovery_unit_value,
			carrying_unit_value,
			original_total_value,
			carrying_total_value,
			write_down_amount,
			proof_document_id,
			proof_path,
			status,
			journal_entry_id,
			created_at,
			updated_at,
			products (
				category,
				name,
				sku,
				unit_of_measure
			)
		`)
		.order('created_at', { ascending: false })
	if (lotError) throw new Error(lotError.message)

	const lotRows = (lotData ?? []) as unknown as DamageLotRow[]
	const lotIds = lotRows.map((lot) => lot.id)
	const transactionsByLot = new Map<string, InventoryDamageTransactionView[]>()
	if (lotIds.length > 0) {
		const { data: txData, error: txError } = await auth.client
			.from('inventory_damage_transactions')
			.select(`
				id,
				lot_id,
				transaction_type,
				quantity,
				unit_price,
				amount,
				carrying_amount,
				write_down_reversal_amount,
				counterparty_name,
				payment_status,
				reason,
				manager_employee_id,
				proof_document_id,
				proof_path,
				created_by_employee_id,
				journal_entry_id,
				created_at,
				employees:manager_employee_id (
					full_name
				)
			`)
			.in('lot_id', lotIds)
			.order('created_at', { ascending: false })
		if (txError) throw new Error(txError.message)

		for (const row of (txData ?? []) as unknown as DamageTransactionRow[]) {
			const manager = firstRelation(row.employees)
			const transaction: InventoryDamageTransactionView = {
				amount: numeric(row.amount),
				carryingAmount: numeric(row.carrying_amount),
				counterpartyName: row.counterparty_name,
				createdAt: row.created_at,
				createdByEmployeeId: row.created_by_employee_id,
				id: row.id,
				journalEntryId: row.journal_entry_id,
				managerEmployeeId: row.manager_employee_id,
				managerName: manager?.full_name ?? null,
				paymentStatus: row.payment_status,
				proofDocumentId: row.proof_document_id,
				proofPath: row.proof_path,
				quantity: numeric(row.quantity),
				reason: row.reason,
				transactionType: row.transaction_type,
				unitPrice:
					row.unit_price === null || row.unit_price === undefined
						? null
						: numeric(row.unit_price),
				writeDownReversalAmount: numeric(row.write_down_reversal_amount),
			}
			const list = transactionsByLot.get(row.lot_id) ?? []
			list.push(transaction)
			transactionsByLot.set(row.lot_id, list)
		}
	}

	return lotRows.map((lot) => {
		const product = firstRelation(lot.products)
		const remainingQuantity = numeric(lot.remaining_quantity)
		const carryingUnitValue = numeric(lot.carrying_unit_value)
		return {
			broadCategory: getBroadCategory(product?.category ?? ''),
			carryingTotalValue: numeric(lot.carrying_total_value),
			carryingUnitValue,
			category: product?.category ?? '',
			createdAt: lot.created_at,
			damageNumber: lot.damage_number,
			disposedQuantity: numeric(lot.disposed_quantity),
			id: lot.id,
			journalEntryId: lot.journal_entry_id,
			name: product?.name ?? 'Product',
			originalQuantity: numeric(lot.original_quantity),
			originalTotalValue: numeric(lot.original_total_value),
			originalUnitCost: numeric(lot.original_unit_cost),
			productId: lot.product_id,
			productName: product?.name ?? 'Product',
			proofDocumentId: lot.proof_document_id,
			proofPath: lot.proof_path,
			reason: lot.reason,
			recoveryUnitValue: numeric(lot.recovery_unit_value),
			remainingCarryingValue: roundMoney(remainingQuantity * carryingUnitValue),
			remainingQuantity,
			reversedQuantity: numeric(lot.reversed_quantity),
			sku: product?.sku ?? '',
			soldQuantity: numeric(lot.sold_quantity),
			status: lot.status,
			transactions: transactionsByLot.get(lot.id) ?? [],
			unit: product?.unit_of_measure ?? 'unit',
			updatedAt: lot.updated_at,
			writeDownAmount: numeric(lot.write_down_amount),
		}
	})
}

async function loadApprovers(
	auth: Awaited<ReturnType<typeof getInternalSupabaseClient>>,
): Promise<InventoryDamageApproverView[]> {
	const { data, error } = await auth.client
		.from('employees')
		.select(`
			id,
			full_name,
			email,
			is_ceo,
			employee_roles ( role ),
			employee_panel_permissions ( panel, can_write )
		`)
		.eq('status', 'active')
		.order('full_name', { ascending: true })
	if (error) throw new Error(error.message)

	return ((data ?? []) as unknown as EmployeeRow[])
		.filter(canApproveInventoryDamage)
		.map((employee) => ({
			email: employee.email,
			id: employee.id,
			name: employee.full_name,
			roleLabel: approverRoleLabel(employee),
		}))
}

function buildTotals(lots: InventoryDamageLotView[]) {
	return {
		disposedUnits: lots.reduce((sum, lot) => sum + lot.disposedQuantity, 0),
		openLots: lots.filter((lot) => lot.remainingQuantity > 0).length,
		originalValue: roundMoney(
			lots.reduce((sum, lot) => sum + lot.originalTotalValue, 0),
		),
		recoveredIncome: roundMoney(
			lots.reduce(
				(sum, lot) =>
					sum +
					lot.transactions
						.filter((transaction) => transaction.transactionType === 'sold')
						.reduce((txSum, transaction) => txSum + transaction.amount, 0),
				0,
			),
		),
		remainingCarryingValue: roundMoney(
			lots.reduce((sum, lot) => sum + lot.remainingCarryingValue, 0),
		),
		remainingUnits: lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0),
		reversedUnits: lots.reduce((sum, lot) => sum + lot.reversedQuantity, 0),
		soldUnits: lots.reduce((sum, lot) => sum + lot.soldQuantity, 0),
		writeDownAmount: roundMoney(
			lots.reduce((sum, lot) => sum + lot.writeDownAmount, 0),
		),
	}
}

export const getDamagedInventoryOverview = createServerFn({ method: 'POST' })
	.inputValidator(z.object({}))
	.handler(async (): Promise<DamagedInventoryOverview> => {
		const auth = await requireInventoryPanel(false)
		const [{ data: currentEmployeeId }, products, lots, approvers] =
			await Promise.all([
				auth.client.rpc('current_employee_id'),
				loadDamageableProducts(auth),
				loadDamageLots(auth),
				loadApprovers(auth),
			])

		return {
			approvers,
			currentEmployeeId:
				typeof currentEmployeeId === 'string' ? currentEmployeeId : null,
			lots,
			products,
			totals: buildTotals(lots),
		}
	})

export const recordInventoryDamage = createServerFn({ method: 'POST' })
	.inputValidator(recordDamageInput)
	.handler(async ({ data }) => {
		const auth = await requireInventoryPanel(true)
		const { data: lot, error } = await auth.client.rpc(
			'inventory_record_damage',
			{
				p_product_id: data.productId,
				p_proof_document_id: data.proofDocumentId ?? null,
				p_proof_path: data.proofPath,
				p_quantity: data.quantity,
				p_reason: data.reason,
				p_recovery_percent:
					data.recoveryUnitValue === undefined
						? (data.recoveryPercent ?? null)
						: null,
				p_recovery_unit_value: data.recoveryUnitValue ?? null,
			},
		)
		if (error) return { success: false as const, error: error.message }
		const row = lot as { id?: string; damage_number?: string } | null
		return {
			success: true as const,
			damageNumber: row?.damage_number ?? null,
			lotId: row?.id ?? null,
		}
	})

export const sellDamagedInventory = createServerFn({ method: 'POST' })
	.inputValidator(sellDamagedInventoryInput)
	.handler(async ({ data }) => {
		const auth = await requireInventoryPanel(true)
		const { data: transaction, error } = await auth.client.rpc(
			'inventory_sell_damaged_inventory',
			{
				p_counterparty_name: data.counterpartyName,
				p_payment_status: data.paymentStatus,
				p_unit_sale_price: data.unitSalePrice,
				...damageLotQuantityProofParams(data),
			},
		)
		if (error) return { success: false as const, error: error.message }
		const row = transaction as { id?: string } | null
		return { success: true as const, transactionId: row?.id ?? null }
	})

export const disposeDamagedInventory = createServerFn({ method: 'POST' })
	.inputValidator(disposeDamagedInventoryInput)
	.handler(async ({ data }) => {
		const auth = await requireInventoryPanel(true)
		const { data: transaction, error } = await auth.client.rpc(
			'inventory_dispose_damaged_inventory',
			{
				p_reason: data.reason,
				...damageLotQuantityProofParams(data),
			},
		)
		if (error) return { success: false as const, error: error.message }
		const row = transaction as { id?: string } | null
		return { success: true as const, transactionId: row?.id ?? null }
	})

export const reverseInventoryDamage = createServerFn({ method: 'POST' })
	.inputValidator(reverseDamageInput)
	.handler(async ({ data }) => {
		const auth = await requireInventoryPanel(true)
		const { data: currentEmployeeId, error: currentEmployeeError } =
			await auth.client.rpc('current_employee_id')
		if (currentEmployeeError) {
			return { success: false as const, error: currentEmployeeError.message }
		}
		if (currentEmployeeId === data.managerEmployeeId) {
			return {
				success: false as const,
				error: 'Manager approval must come from another employee.',
			}
		}

		const verified = await verifyEmployeeCredential({
			allowedPanels: new Set(['inventory']),
			allowedRoles: new Set(['admin', 'inventory']),
			client: auth.client,
			employeeId: data.managerEmployeeId,
			method: 'password',
			password: data.managerPassword,
		})
		if (!verified.success) {
			return { success: false as const, error: verified.error }
		}

		const { data: transaction, error } = await auth.client.rpc(
			'inventory_reverse_damage',
			{
				p_manager_employee_id: verified.employee.id,
				p_reason: data.reason,
				...damageLotQuantityProofParams(data),
			},
		)
		if (error) return { success: false as const, error: error.message }
		const row = transaction as { id?: string } | null
		return { success: true as const, transactionId: row?.id ?? null }
	})
