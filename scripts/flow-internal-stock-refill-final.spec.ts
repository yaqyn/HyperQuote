import { spawnSync } from 'node:child_process'
import { type Browser, expect, type Page, test } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

interface SupabaseCookieToSet {
	name: string
	options?: { maxAge?: number }
	value: string
}

interface LocalSupabaseEnv {
	anonKey: string
	apiUrl: string
	serviceRoleKey: string
}

interface InternalPageHandle {
	context: Awaited<ReturnType<Browser['newContext']>>
	guard: ReturnType<typeof installBrowserErrorGuard>
	page: Page
}

interface EmployeeRef {
	email: string
	id: string
	name: string
}

interface RefillFixture {
	agreedCost: number
	agreedQty: number
	initialStock: number
	minimumStock: number
	oldCost: number
	productId: string
	productName: string
	productSlug: string
	proofNotes: string
	runId: string
	supplierId: string
	supplierName: string
}

interface RefillRecord {
	id: string
	receivingTaskId: string | null
	status: string
}

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')

const URLS = {
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
}

const COOKIE_NAMES = {
	internal: 'hyperquote_internal_auth',
}

const LOCAL_FINANCE = {
	email: 'local-finance@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

const LOCAL_INVENTORY = {
	email: 'local-inventory@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

const LOCAL_SALES = {
	email: 'local-sales@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

const LOCAL_WAREHOUSE = {
	email: 'local-warehouse@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

test.describe.configure({ mode: 'serial' })

test('inventory refill uses real stock, finance keeps partial supplier balances visible, and warehouse receiving controls stock', async ({
	browser,
}) => {
	test.setTimeout(540_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const inventoryAuth = await signInLocal(env, LOCAL_INVENTORY)
	const financeAuth = await signInLocal(env, LOCAL_FINANCE)
	const salesAuth = await signInLocal(env, LOCAL_SALES)
	const warehouseAuth = await signInLocal(env, LOCAL_WAREHOUSE)
	const inventoryEmployee = await employeeByEmail(
		service,
		LOCAL_INVENTORY.email,
	)
	const financeEmployee = await employeeByEmail(service, LOCAL_FINANCE.email)
	const warehouseEmployee = await employeeByEmail(
		service,
		LOCAL_WAREHOUSE.email,
	)
	const happy = await createRefillFixture(service, {
		agreedCost: 80,
		agreedQty: 5,
		initialStock: 2,
		minimumStock: 10,
		oldCost: 100,
		variant: 'approve',
	})
	const rejected = await createRefillFixture(service, {
		agreedCost: 95,
		agreedQty: 4,
		initialStock: 1,
		minimumStock: 8,
		oldCost: 120,
		variant: 'reject',
	})

	const inventory = await openInternalPage(browser, LOCAL_INVENTORY)
	let happyRefillRecord: RefillRecord | null = null
	let rejectedRefillRecord: RefillRecord | null = null
	try {
		await inventory.page.getByRole('button', { name: /^Inventory$/i }).click()
		await expect(
			inventory.page.getByRole('navigation', {
				name: /Inventory sections/i,
			}),
		).toBeVisible({ timeout: 20_000 })
		await inventory.page.getByRole('button', { name: /^Stock$/i }).click()

		happyRefillRecord = await createRefillFromStockUi(inventory.page, happy)
		await expectRefillCreated(service, happy, happyRefillRecord.id, {
			requestedByEmployeeId: inventoryEmployee.id,
		})
		await expectStockQuantity(service, happy.productId, happy.initialStock)

		rejectedRefillRecord = await createRefillFromStockUi(
			inventory.page,
			rejected,
		)
		await expectRefillCreated(service, rejected, rejectedRefillRecord.id, {
			requestedByEmployeeId: inventoryEmployee.id,
		})
		await expectStockQuantity(
			service,
			rejected.productId,
			rejected.initialStock,
		)
		await inventory.guard.expectClean('inventory stock refill creation')
	} finally {
		await inventory.context.close()
	}
	let happyRefill = expectRefillRecord(happyRefillRecord, 'happy refill')
	let rejectedRefill = expectRefillRecord(
		rejectedRefillRecord,
		'rejected refill',
	)

	const invalidInventoryPayment = await inventoryAuth.client.rpc(
		'record_supplier_payment',
		{
			p_amount: 10,
			p_payment_fraction: 0.5,
			p_proof_path: 'supplier-payments/inventory-bypass.pdf',
			p_refill_request_id: happyRefill.id,
		},
	)
	expect(invalidInventoryPayment.error?.message).toContain(
		'insufficient_finance_permission',
	)

	const invalidSalesRefill = await salesAuth.client.rpc(
		'create_supplier_refill',
		{
			p_product_id: happy.productId,
			p_proof: {
				kind: 'supplier_refill',
				supplier_name: happy.supplierName,
			},
			p_quantity: 1,
			p_supplier_id: happy.supplierId,
			p_unit_cost: happy.agreedCost,
		},
	)
	expect(invalidSalesRefill.error?.message).toContain(
		'insufficient_inventory_permission',
	)

	const zeroCostRefill = await inventoryAuth.client.rpc(
		'create_supplier_refill',
		{
			p_product_id: happy.productId,
			p_proof: {
				kind: 'supplier_refill',
				supplier_name: happy.supplierName,
			},
			p_quantity: 1,
			p_supplier_id: happy.supplierId,
			p_unit_cost: 0,
		},
	)
	expect(zeroCostRefill.error?.message).toContain('invalid_refill_unit_cost')

	const wrongSupplierPaymentAmount = await financeAuth.client.rpc(
		'record_supplier_payment',
		{
			p_amount: 1,
			p_payment_fraction: 1,
			p_proof_path: `supplier-payments/wrong-amount-${happy.runId}.pdf`,
			p_refill_request_id: happyRefill.id,
		},
	)
	expect(wrongSupplierPaymentAmount.error?.message).toContain(
		'supplier_payment_amount_must_match_fraction',
	)

	const finance = await openInternalPage(browser, LOCAL_FINANCE)
	try {
		await finance.page.getByRole('button', { name: /^Finance$/i }).click()
		await finance.page.getByRole('button', { name: /^Out\b/i }).click()
		await saveSupplierFollowUpFromFinanceUi(
			finance.page,
			happy,
			happyRefill.id,
			service,
			financeEmployee,
		)
		await recordSupplierPaymentFromFinanceUi(finance.page, happy, {
			mode: 'partial',
			proof: `supplier-partial-${happy.runId}.pdf`,
		})
		await expectSupplierPaymentState(service, happyRefill.id, {
			expectedAmountPaid: (happy.agreedCost * happy.agreedQty) / 2,
			expectedPaymentCount: 1,
			expectedRefillStatus: 'warehouse_receiving',
			recordedByEmployeeId: financeEmployee.id,
		})
		happyRefill = await expectReceivingTaskCreated(service, happyRefill.id)
		await expect(finance.page.locator('body')).toContainText(
			`${((happy.agreedCost * happy.agreedQty) / 2).toLocaleString('en-EG')} EGP supplier balance`,
			{ timeout: 20_000 },
		)

		await recordSupplierPaymentFromFinanceUi(finance.page, rejected, {
			mode: 'full',
			proof: `supplier-full-${rejected.runId}.pdf`,
		})
		await expectSupplierPaymentState(service, rejectedRefill.id, {
			expectedAmountPaid: rejected.agreedCost * rejected.agreedQty,
			expectedPaymentCount: 1,
			expectedRefillStatus: 'warehouse_receiving',
			recordedByEmployeeId: financeEmployee.id,
		})
		rejectedRefill = await expectReceivingTaskCreated(
			service,
			rejectedRefill.id,
		)

		const financeWarehouseBypass = await financeAuth.client.rpc(
			'warehouse_approve_receiving',
			{
				p_proof: warehouseProof(warehouseEmployee, 'finance-bypass.pdf'),
				p_receiving_task_id: happyRefill.receivingTaskId,
			},
		)
		expect(financeWarehouseBypass.error?.message).toContain(
			'insufficient_warehouse_permission',
		)
		await finance.guard.expectClean('finance supplier refill payments')
	} finally {
		await finance.context.close()
	}

	const directStatusUpdate = await financeAuth.client
		.from('refill_requests')
		.update({ status: 'received' })
		.eq('id', rejectedRefill.id)
	expect(directStatusUpdate.error?.message).toContain(
		'state_updates_must_use_rpc',
	)

	const warehouse = await openInternalPage(browser, LOCAL_WAREHOUSE)
	try {
		await warehouse.page.getByRole('button', { name: /^Warehouse$/i }).click()
		await warehouse.page.locator('[data-tab-id="receiving"]').click()

		await expectStockQuantity(service, happy.productId, happy.initialStock)
		await receiveSupplierDeliveryFromWarehouseUi(
			warehouse.page,
			happy,
			warehouseEmployee,
			'PARTIAL',
		)
		await expectWarehouseReceiptApproved(service, happyRefill, happy, {
			warehouseEmployeeId: warehouseEmployee.id,
		})
		await expectStockQuantity(
			service,
			happy.productId,
			happy.initialStock + happy.agreedQty,
		)

		const stockAfterApprove = await stockQuantity(service, happy.productId)
		const duplicateApprove = await warehouseAuth.client.rpc(
			'warehouse_approve_receiving',
			{
				p_proof: warehouseProof(warehouseEmployee, 'duplicate-approve.pdf'),
				p_receiving_task_id: happyRefill.receivingTaskId,
			},
		)
		expect(duplicateApprove.error?.message).toContain(
			'invalid_receiving_task_status_approved',
		)
		await expectStockQuantity(service, happy.productId, stockAfterApprove)

		await rejectSupplierDeliveryFromWarehouseUi(
			warehouse.page,
			rejected,
			warehouseEmployee,
			'PAID',
		)
		await expectWarehouseReceiptRejected(service, rejectedRefill, rejected, {
			warehouseEmployeeId: warehouseEmployee.id,
		})
		await expectStockQuantity(
			service,
			rejected.productId,
			rejected.initialStock,
		)
		await expect(
			warehouse.page
				.locator('button', { hasText: rejected.supplierName })
				.first(),
		).toContainText(/Retry · attempt 2/i)

		const approveRejectedWithoutItems = await warehouseAuth.client.rpc(
			'warehouse_approve_receiving',
			{
				p_proof: warehouseProof(warehouseEmployee, 'rejected-no-items.pdf'),
				p_receiving_task_id: rejectedRefill.receivingTaskId,
			},
		)
		expect(approveRejectedWithoutItems.error?.message).toContain(
			'receiving_items_required',
		)
		await expectStockQuantity(
			service,
			rejected.productId,
			rejected.initialStock,
		)
		await warehouse.guard.expectClean('warehouse receiving approval rejection')
	} finally {
		await warehouse.context.close()
	}

	const financeFinal = await openInternalPage(browser, LOCAL_FINANCE)
	try {
		await financeFinal.page.getByRole('button', { name: /^Finance$/i }).click()
		await financeFinal.page.getByRole('button', { name: /^Out\b/i }).click()
		await expect(financeFinal.page.locator('body')).toContainText(
			happy.supplierName,
			{ timeout: 20_000 },
		)
		await expect(financeFinal.page.locator('body')).toContainText(
			/supplier balance/i,
		)
		await recordSupplierPaymentFromFinanceUi(financeFinal.page, happy, {
			expectPreviousPartialBy: financeEmployee.name,
			expectPreviousPartialProof: `supplier-partial-${happy.runId}.pdf`,
			mode: 'remaining',
			proof: `supplier-balance-${happy.runId}.pdf`,
		})
		await expectSupplierPaymentState(service, happyRefill.id, {
			expectedAmountPaid: happy.agreedCost * happy.agreedQty,
			expectedPaymentCount: 2,
			expectedRefillStatus: 'received',
			recordedByEmployeeId: financeEmployee.id,
		})
		await expect(financeFinal.page.locator('body')).not.toContainText(
			happy.supplierName,
			{ timeout: 30_000 },
		)
		await financeFinal.guard.expectClean(
			'finance final supplier balance payment',
		)
	} finally {
		await financeFinal.context.close()
	}
})

async function createRefillFromStockUi(page: Page, fixture: RefillFixture) {
	await page.getByLabel(/Search stock/i).fill(fixture.productName)
	await expect(page.locator('body')).toContainText(fixture.productName, {
		timeout: 20_000,
	})
	const row = page.locator('li', { hasText: fixture.productName }).first()
	await expect(row).toContainText('Available')
	await expect(row).toContainText('Minimum')
	await expect(row).toContainText(fixture.initialStock.toLocaleString('en-EG'))
	await expect(row).toContainText(fixture.minimumStock.toLocaleString('en-EG'))
	await row.getByRole('button', { name: /^Refill$/i }).click()

	await expect(page.getByRole('dialog', { name: /Refill stock/i })).toBeVisible(
		{ timeout: 20_000 },
	)
	await expect(page.locator('body')).toContainText(fixture.supplierName)

	const costInput = page.getByLabel(/^Supplier unit cost$/i)
	await costInput.fill('0')
	await expect(
		page.getByRole('button', { name: /^Send to finance$/i }),
	).toBeDisabled()
	await costInput.fill(String(fixture.agreedCost))

	const quantityInput = page.getByLabel(/Refill quantity/i)
	await quantityInput.fill('0')
	await expect(
		page.getByRole('button', { name: /^Send to finance$/i }),
	).toBeDisabled()
	await quantityInput.fill(String(fixture.agreedQty))
	await expect(page.locator('body')).toContainText(/Proof required/i)

	await page.getByPlaceholder(/Ahmed confirmed/i).fill('short')
	await expect(
		page.getByRole('button', { name: /^Send to finance$/i }),
	).toBeDisabled()
	await page.getByPlaceholder(/Ahmed confirmed/i).fill(fixture.proofNotes)
	await expect(
		page.getByRole('button', { name: /^Send to finance$/i }),
	).toBeEnabled()
	await page.getByRole('button', { name: /^Send to finance$/i }).click()
	await expect(page.getByRole('dialog', { name: /Refill stock/i })).toBeHidden({
		timeout: 30_000,
	})

	const refill = await findRefillByProduct(createLocalServiceClient(), fixture)
	await page.getByLabel(/Search stock/i).fill('')
	return refill
}

async function recordSupplierPaymentFromFinanceUi(
	page: Page,
	fixture: RefillFixture,
	input: {
		expectPreviousPartialBy?: string
		expectPreviousPartialProof?: string
		mode: 'full' | 'partial' | 'remaining'
		proof: string
	},
) {
	await expect(page.locator('body')).toContainText(fixture.supplierName, {
		timeout: 30_000,
	})
	const row = page.locator('li', { hasText: fixture.supplierName }).first()
	await row.getByRole('button', { name: /Record payment/i }).click()
	const paymentPanel = page.getByRole('dialog', {
		name: /Finance payment recorder/i,
	})
	await expect(paymentPanel).toBeVisible({ timeout: 20_000 })

	if (input.expectPreviousPartialBy || input.expectPreviousPartialProof) {
		await expect(paymentPanel).toContainText('previous partial')
		if (input.expectPreviousPartialBy) {
			await expect(paymentPanel).toContainText(
				`by ${input.expectPreviousPartialBy}`,
			)
		}
		if (input.expectPreviousPartialProof) {
			await expect(paymentPanel).toContainText(input.expectPreviousPartialProof)
		}
	}

	if (input.mode === 'partial') {
		await page.getByRole('button', { name: /collect 50%/i }).click()
	}
	if (input.mode === 'full') {
		await page.getByRole('button', { name: /settle full/i }).click()
	}

	await expect(
		page.getByRole('button', { name: /^Review payment$/i }),
	).toBeDisabled()
	await page.getByLabel(/Payment proof/i).fill(input.proof)
	await page.getByRole('button', { name: /^Review payment$/i }).click()
	await expect(page.locator('body')).toContainText(/Review before recording/i)
	await page.getByRole('button', { name: /^Record .* EGP$/i }).click()
	await expect(
		page.getByRole('dialog', { name: /Finance payment recorder/i }),
	).toBeHidden({ timeout: 30_000 })
}

async function saveSupplierFollowUpFromFinanceUi(
	page: Page,
	fixture: RefillFixture,
	refillId: string,
	service: ReturnType<typeof createLocalServiceClient>,
	employee: EmployeeRef,
) {
	await expect(page.locator('body')).toContainText(fixture.supplierName, {
		timeout: 30_000,
	})
	const row = page.locator('li', { hasText: fixture.supplierName }).first()
	await row.getByRole('button', { name: /Record payment/i }).click()
	const paymentPanel = page.getByRole('dialog', {
		name: /Finance payment recorder/i,
	})
	await expect(paymentPanel).toBeVisible({ timeout: 20_000 })
	await expect(
		paymentPanel.getByRole('button', { name: /Save follow-up/i }),
	).toBeDisabled()

	await paymentPanel
		.getByRole('combobox', { name: /^Channel$/i })
		.selectOption('bank')
	await paymentPanel
		.getByRole('combobox', { name: /^State$/i })
		.selectOption('waiting')
	const dueAt = futureLocalDateTime()
	await paymentPanel
		.getByRole('textbox', { name: /Follow-up due/i })
		.fill(dueAt)
	await paymentPanel
		.getByRole('textbox', { name: /^Outcome$/i })
		.fill(`Supplier bank transfer scheduled ${fixture.runId}`)
	await paymentPanel
		.getByRole('textbox', { name: /^Notes$/i })
		.fill(
			`Supplier confirmed the payment route and delivery coordination for ${fixture.runId}.`,
		)
	await paymentPanel.getByRole('button', { name: /Save follow-up/i }).click()
	await expect(paymentPanel).toContainText('Follow-up saved', {
		timeout: 20_000,
	})
	await expectSupplierFollowUp(service, {
		employeeId: employee.id,
		refillId,
		runId: fixture.runId,
	})
	await page.getByRole('button', { name: /Close panel/i }).click()
	await expect(paymentPanel).toBeHidden({ timeout: 20_000 })
}

async function receiveSupplierDeliveryFromWarehouseUi(
	page: Page,
	fixture: RefillFixture,
	employee: EmployeeRef,
	expectedPaymentStatus: string,
) {
	await expect(page.locator('body')).toContainText(fixture.supplierName, {
		timeout: 30_000,
	})
	const card = page.locator('button', { hasText: fixture.supplierName }).first()
	await expect(card).toContainText(expectedPaymentStatus)
	await card.click()
	await expect(page.locator('body')).toContainText(fixture.productName, {
		timeout: 20_000,
	})
	await page.getByRole('button', { name: /^Receive$/i }).click()
	await page.locator('button', { hasText: employee.id }).click()
	await page.getByPlaceholder(/^Your password$/i).fill(LOCAL_WAREHOUSE.password)
	await page
		.getByPlaceholder(/receipt-photo/i)
		.fill(`receipt-${fixture.runId}.jpg`)
	await page.getByRole('button', { name: /^Commit receipt$/i }).click()
	await expect(page.locator('body')).not.toContainText(fixture.supplierName, {
		timeout: 30_000,
	})
}

async function rejectSupplierDeliveryFromWarehouseUi(
	page: Page,
	fixture: RefillFixture,
	employee: EmployeeRef,
	expectedPaymentStatus: string,
) {
	await expect(page.locator('body')).toContainText(fixture.supplierName, {
		timeout: 30_000,
	})
	const card = page.locator('button', { hasText: fixture.supplierName }).first()
	await expect(card).toContainText(expectedPaymentStatus)
	await card.click()
	await expect(page.locator('body')).toContainText(fixture.productName, {
		timeout: 20_000,
	})
	await page.getByRole('button', { name: /^Reject$/i }).click()
	await expect(
		page.getByRole('button', { name: /^Commit receipt$/i }),
	).toBeDisabled()
	await page.getByPlaceholder(/bags of cement/i).fill('no')
	await expect(
		page.getByRole('button', { name: /^Commit receipt$/i }),
	).toBeDisabled()
	await page
		.getByPlaceholder(/bags of cement/i)
		.fill(`Supplier truck missing the agreed material ${fixture.runId}`)
	await page.locator('button', { hasText: employee.id }).click()
	await page.getByPlaceholder(/^Your password$/i).fill(LOCAL_WAREHOUSE.password)
	await page
		.getByPlaceholder(/receipt-photo/i)
		.fill(`reject-${fixture.runId}.jpg`)
	await page.getByRole('button', { name: /^Commit receipt$/i }).click()
	await expect(card).toContainText(/Retry · attempt 2/i, { timeout: 30_000 })
}

async function createRefillFixture(
	service: ReturnType<typeof createLocalServiceClient>,
	input: {
		agreedCost: number
		agreedQty: number
		initialStock: number
		minimumStock: number
		oldCost: number
		variant: string
	},
): Promise<RefillFixture> {
	const runId = `${input.variant}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
	const productName = `Flow Stock Refill ${runId}`
	const supplierName = `Flow Refill Supplier ${runId}`
	const productSlug = `flow-stock-refill-${runId}`

	const { data: supplier, error: supplierError } = await service
		.from('suppliers')
		.insert({
			email: `flow-refill-supplier-${runId}@example.test`,
			name: supplierName,
			notes: `Flow refill supplier ${runId}`,
			phone: `+208${Date.now().toString().slice(-10)}`,
			status: 'active',
		})
		.select('id')
		.single()
	if (supplierError || !supplier) {
		throw new Error(supplierError?.message ?? 'Supplier fixture missing')
	}

	const { data: product, error: productError } = await service
		.from('products')
		.insert({
			availability_status: 'available',
			category: 'cement',
			description: `Flow stock refill ${runId}`,
			description_ar: `اختبار تعبئة المخزون ${runId}`,
			image_urls: [],
			is_active: true,
			is_stockable: true,
			name: productName,
			name_ar: `اختبار تعبئة ${runId}`,
			price_range_max: input.oldCost,
			price_range_min: input.oldCost,
			sku: `FLOW-REFILL-${runId}`.toUpperCase(),
			slug: productSlug,
			specifications: { source: 'flow-final-stock-refill' },
			specifications_ar: { source: 'flow-final-stock-refill' },
			subcategory: 'cement',
			subcategory_ar: 'أسمنت',
			unit_of_measure: 'bag',
			unit_of_measure_ar: 'شيكارة',
		})
		.select('id, slug')
		.single()
	if (productError || !product) {
		throw new Error(productError?.message ?? 'Product fixture missing')
	}

	const { error: stockError } = await service.from('inventory_stock').insert({
		minimum_quantity: input.minimumStock,
		on_hand_quantity: input.initialStock,
		product_id: product.id,
		reserved_quantity: 0,
	})
	if (stockError) throw new Error(stockError.message)

	const { error: linkError } = await service
		.from('supplier_product_links')
		.insert({
			is_primary: true,
			last_quoted_at: new Date().toISOString(),
			lead_time_days: 1,
			min_order_qty: input.minimumStock,
			notes: `Flow refill supplier quote ${runId}`,
			product_id: product.id,
			raw_cost: input.oldCost,
			supplier_id: supplier.id,
		})
	if (linkError) throw new Error(linkError.message)

	return {
		agreedCost: input.agreedCost,
		agreedQty: input.agreedQty,
		initialStock: input.initialStock,
		minimumStock: input.minimumStock,
		oldCost: input.oldCost,
		productId: product.id,
		productName,
		productSlug: product.slug,
		proofNotes: `Supplier ${supplierName} confirmed exception for ${input.agreedQty} bags at ${input.agreedCost} EGP during final Flow refill testing ${runId}.`,
		runId,
		supplierId: supplier.id,
		supplierName,
	}
}

async function expectRefillCreated(
	service: ReturnType<typeof createLocalServiceClient>,
	fixture: RefillFixture,
	refillId: string,
	expected: { requestedByEmployeeId: string },
) {
	const { data, error } = await service
		.from('refill_requests')
		.select(
			'id, product_id, supplier_id, requested_by_employee_id, quantity, unit_cost, status, proof, created_at',
		)
		.eq('id', refillId)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Refill missing')
	expect(data.product_id).toBe(fixture.productId)
	expect(data.supplier_id).toBe(fixture.supplierId)
	expect(data.requested_by_employee_id).toBe(expected.requestedByEmployeeId)
	expect(Number(data.quantity)).toBe(fixture.agreedQty)
	expect(Number(data.unit_cost)).toBe(fixture.agreedCost)
	expect(data.status).toBe('finance_pending')
	expect(isIsoTimestamp(data.created_at)).toBe(true)
	const proof = expectRecord(data.proof, 'refill proof')
	expect(String(proof.supplier_name)).toBe(fixture.supplierName)

	const { data: product, error: productError } = await service
		.from('products')
		.select('price_range_min, price_range_max, updated_at')
		.eq('id', fixture.productId)
		.single()
	if (productError || !product) {
		throw new Error(productError?.message ?? 'Updated refill product missing')
	}
	expect(Number(product.price_range_min)).toBe(fixture.agreedCost)
	expect(Number(product.price_range_max)).toBe(fixture.agreedCost)
	expect(isRecentTimestamp(product.updated_at)).toBe(true)

	const { data: priceUpdate, error: priceError } = await service
		.from('price_updates')
		.select(
			'id, old_price, new_price, proof_path, notes, updated_by_employee_id',
		)
		.eq('product_id', fixture.productId)
		.eq('supplier_id', fixture.supplierId)
		.order('created_at', { ascending: false })
		.limit(1)
		.single()
	if (priceError || !priceUpdate) {
		throw new Error(priceError?.message ?? 'Refill price update missing')
	}
	expect(Number(priceUpdate.old_price)).toBe(fixture.oldCost)
	expect(Number(priceUpdate.new_price)).toBe(fixture.agreedCost)
	expect(priceUpdate.proof_path).toBe(`refill-proofs/${refillId}.json`)
	expect(priceUpdate.updated_by_employee_id).toBe(
		expected.requestedByEmployeeId,
	)
	expect(String(priceUpdate.notes)).toContain(fixture.runId)

	const activity = await latestActivity(service, {
		action: 'supplier_refill_created',
		entityId: refillId,
		entityType: 'refill_request',
	})
	expect(activity.actorEmployeeId).toBe(expected.requestedByEmployeeId)
	expect(activity.details.employee_id).toBe(expected.requestedByEmployeeId)
	expect(activity.details.to_status).toBe('finance_pending')
}

async function expectSupplierPaymentState(
	service: ReturnType<typeof createLocalServiceClient>,
	refillId: string,
	expected: {
		expectedAmountPaid: number
		expectedPaymentCount: number
		expectedRefillStatus: string
		recordedByEmployeeId: string
	},
) {
	await expect
		.poll(
			async () => {
				const { data: refill, error: refillError } = await service
					.from('refill_requests')
					.select('status')
					.eq('id', refillId)
					.single()
				if (refillError) return `error:${refillError.message}`
				const { data: payments, error: paymentError } = await service
					.from('supplier_payments')
					.select('amount')
					.eq('refill_request_id', refillId)
					.eq('status', 'recorded')
				if (paymentError) return `error:${paymentError.message}`
				const amount = (payments ?? []).reduce(
					(sum, payment) => sum + Number(payment.amount),
					0,
				)
				return `${refill.status}:${payments?.length ?? 0}:${amount}`
			},
			{ timeout: 30_000 },
		)
		.toBe(
			`${expected.expectedRefillStatus}:${expected.expectedPaymentCount}:${expected.expectedAmountPaid}`,
		)

	const { data, error } = await service
		.from('supplier_payments')
		.select('recorded_by_employee_id, proof_path, created_at')
		.eq('refill_request_id', refillId)
		.eq('status', 'recorded')
	if (error || !data)
		throw new Error(error?.message ?? 'Supplier payments missing')
	expect(data).toHaveLength(expected.expectedPaymentCount)
	for (const payment of data) {
		expect(payment.recorded_by_employee_id).toBe(expected.recordedByEmployeeId)
		expect(String(payment.proof_path)).toMatch(/supplier-/)
		expect(isIsoTimestamp(payment.created_at)).toBe(true)
	}

	const activity = await latestActivity(service, {
		action: 'supplier_payment_recorded',
		entityId: refillId,
		entityType: 'refill_request',
	})
	expect(activity.actorEmployeeId).toBe(expected.recordedByEmployeeId)
	expect(activity.details.employee_id).toBe(expected.recordedByEmployeeId)
}

async function expectSupplierFollowUp(
	service: ReturnType<typeof createLocalServiceClient>,
	expected: { employeeId: string; refillId: string; runId: string },
) {
	const { data, error } = await service
		.from('finance_payment_followups')
		.select(
			'recorded_by_employee_id, contact_channel, outcome, notes, follow_up_state, follow_up_due_at, created_at',
		)
		.eq('target_type', 'supplier_refill')
		.eq('refill_request_id', expected.refillId)
		.order('created_at', { ascending: false })
		.limit(1)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? 'Supplier finance follow-up missing')
	}
	expect(data.recorded_by_employee_id).toBe(expected.employeeId)
	expect(data.contact_channel).toBe('bank')
	expect(data.follow_up_state).toBe('waiting')
	expect(String(data.outcome)).toContain(expected.runId)
	expect(String(data.notes)).toContain(expected.runId)
	expect(isIsoTimestamp(data.follow_up_due_at)).toBe(true)
	expect(isIsoTimestamp(data.created_at)).toBe(true)

	const activity = await latestActivity(service, {
		action: 'supplier_payment_followup_recorded',
		entityId: expected.refillId,
		entityType: 'refill_request',
	})
	expect(activity.actorEmployeeId).toBe(expected.employeeId)
	expect(activity.details.outcome).toContain(expected.runId)
	expect(activity.details.follow_up_state).toBe('waiting')
}

async function expectReceivingTaskCreated(
	service: ReturnType<typeof createLocalServiceClient>,
	refillId: string,
): Promise<RefillRecord> {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('receiving_tasks')
					.select('id, status')
					.eq('refill_request_id', refillId)
					.maybeSingle()
				if (error) return `error:${error.message}`
				return data ? `${data.id}:${data.status}` : 'missing'
			},
			{ timeout: 30_000 },
		)
		.not.toBe('missing')

	const { data: refill, error: refillError } = await service
		.from('refill_requests')
		.select('id, status')
		.eq('id', refillId)
		.single()
	if (refillError || !refill)
		throw new Error(refillError?.message ?? 'Refill missing')
	const { data: task, error: taskError } = await service
		.from('receiving_tasks')
		.select('id')
		.eq('refill_request_id', refillId)
		.single()
	if (taskError || !task)
		throw new Error(taskError?.message ?? 'Receiving task missing')
	return { id: refill.id, receivingTaskId: task.id, status: refill.status }
}

async function expectWarehouseReceiptApproved(
	service: ReturnType<typeof createLocalServiceClient>,
	refill: RefillRecord,
	fixture: RefillFixture,
	expected: { warehouseEmployeeId: string },
) {
	expect(refill.receivingTaskId).not.toBeNull()
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('receiving_tasks')
					.select('status')
					.eq('id', expectString(refill.receivingTaskId, 'receiving task id'))
					.single()
				if (error) return `error:${error.message}`
				return data.status
			},
			{ timeout: 30_000 },
		)
		.toBe('approved')
	const { data: task, error } = await service
		.from('receiving_tasks')
		.select('status, advisor_employee_id, proof')
		.eq('id', expectString(refill.receivingTaskId, 'receiving task id'))
		.single()
	if (error || !task)
		throw new Error(error?.message ?? 'Receiving approval missing')
	expect(task.status).toBe('approved')
	expect(task.advisor_employee_id).toBe(expected.warehouseEmployeeId)
	const proof = expectRecord(task.proof, 'receiving proof')
	expect(proof.advisor_id).toBe(expected.warehouseEmployeeId)

	const { data: itemRows, error: itemError } = await service
		.from('receiving_task_items')
		.select('product_id, received_quantity')
		.eq('receiving_task_id', refill.receivingTaskId)
	if (itemError || !itemRows)
		throw new Error(itemError?.message ?? 'Receiving items missing')
	expect(itemRows).toHaveLength(1)
	expect(itemRows[0]?.product_id).toBe(fixture.productId)
	expect(Number(itemRows[0]?.received_quantity)).toBe(fixture.agreedQty)

	const { data: refillRow, error: refillError } = await service
		.from('refill_requests')
		.select('status')
		.eq('id', refill.id)
		.single()
	if (refillError || !refillRow)
		throw new Error(refillError?.message ?? 'Approved refill missing')
	expect(refillRow.status).toBe('received')

	const activity = await latestActivity(service, {
		action: 'warehouse_receiving_approved',
		entityId: expectString(refill.receivingTaskId, 'receiving task id'),
		entityType: 'receiving_task',
	})
	expect(activity.actorEmployeeId).toBe(expected.warehouseEmployeeId)
	expect(activity.details.to_status).toBe('approved')
}

async function expectWarehouseReceiptRejected(
	service: ReturnType<typeof createLocalServiceClient>,
	refill: RefillRecord,
	fixture: RefillFixture,
	expected: { warehouseEmployeeId: string },
) {
	expect(refill.receivingTaskId).not.toBeNull()
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('receiving_tasks')
					.select('status')
					.eq('id', expectString(refill.receivingTaskId, 'receiving task id'))
					.single()
				if (error) return `error:${error.message}`
				return data.status
			},
			{ timeout: 30_000 },
		)
		.toBe('rejected')
	const { data: task, error } = await service
		.from('receiving_tasks')
		.select('status, advisor_employee_id, rejection_reason, proof')
		.eq('id', expectString(refill.receivingTaskId, 'receiving task id'))
		.single()
	if (error || !task)
		throw new Error(error?.message ?? 'Receiving rejection missing')
	expect(task.status).toBe('rejected')
	expect(task.advisor_employee_id).toBe(expected.warehouseEmployeeId)
	expect(String(task.rejection_reason)).toContain(fixture.runId)
	const proof = expectRecord(task.proof, 'receiving rejection proof')
	expect(proof.advisor_id).toBe(expected.warehouseEmployeeId)

	const { data: itemRows, error: itemError } = await service
		.from('receiving_task_items')
		.select('id')
		.eq('receiving_task_id', refill.receivingTaskId)
	if (itemError || !itemRows)
		throw new Error(
			itemError?.message ?? 'Receiving rejected items read failed',
		)
	expect(itemRows).toHaveLength(0)

	const { data: refillRow, error: refillError } = await service
		.from('refill_requests')
		.select('status')
		.eq('id', refill.id)
		.single()
	if (refillError || !refillRow)
		throw new Error(refillError?.message ?? 'Rejected refill missing')
	expect(refillRow.status).toBe('warehouse_receiving')

	const activity = await latestActivity(service, {
		action: 'warehouse_receiving_rejected',
		entityId: expectString(refill.receivingTaskId, 'receiving task id'),
		entityType: 'receiving_task',
	})
	expect(activity.actorEmployeeId).toBe(expected.warehouseEmployeeId)
	expect(activity.details.to_status).toBe('rejected')
}

async function findRefillByProduct(
	service: ReturnType<typeof createLocalServiceClient>,
	fixture: RefillFixture,
): Promise<RefillRecord> {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('refill_requests')
					.select('id, status')
					.eq('product_id', fixture.productId)
				if (error) return `error:${error.message}`
				return `${data?.length ?? 0}:${data?.[0]?.status ?? ''}`
			},
			{ timeout: 30_000 },
		)
		.toBe('1:finance_pending')

	const { data, error } = await service
		.from('refill_requests')
		.select('id, status')
		.eq('product_id', fixture.productId)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Refill not found')
	return { id: data.id, receivingTaskId: null, status: data.status }
}

function expectRefillRecord(
	refill: RefillRecord | null,
	label: string,
): RefillRecord {
	if (!refill) throw new Error(`${label} was not created`)
	return refill
}

async function expectStockQuantity(
	service: ReturnType<typeof createLocalServiceClient>,
	productId: string,
	expectedQuantity: number,
) {
	await expect
		.poll(async () => stockQuantity(service, productId), { timeout: 20_000 })
		.toBe(expectedQuantity)
}

async function stockQuantity(
	service: ReturnType<typeof createLocalServiceClient>,
	productId: string,
) {
	const { data, error } = await service
		.from('inventory_stock')
		.select('on_hand_quantity')
		.eq('product_id', productId)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Stock missing')
	return Number(data.on_hand_quantity)
}

async function latestActivity(
	service: ReturnType<typeof createLocalServiceClient>,
	input: { action: string; entityId: string; entityType: string },
) {
	const { data, error } = await service
		.from('activity_events')
		.select('actor_employee_id, created_at, details')
		.eq('entity_type', input.entityType)
		.eq('entity_id', input.entityId)
		.eq('action', input.action)
		.order('created_at', { ascending: false })
		.limit(1)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? `${input.action} activity missing`)
	}
	expect(isIsoTimestamp(data.created_at)).toBe(true)
	return {
		actorEmployeeId:
			typeof data.actor_employee_id === 'string'
				? data.actor_employee_id
				: null,
		details: expectRecord(data.details, `${input.action} details`),
	}
}

function warehouseProof(employee: EmployeeRef, proofUrl: string) {
	return {
		advisor_id: employee.id,
		proof_url: proofUrl,
		security_method: 'password',
	}
}

async function employeeByEmail(
	service: ReturnType<typeof createLocalServiceClient>,
	email: string,
): Promise<EmployeeRef> {
	const { data, error } = await service
		.from('employees')
		.select('id, email, full_name')
		.eq('email', email)
		.single()
	if (error || !data)
		throw new Error(error?.message ?? `Employee ${email} not found`)
	return { email: data.email, id: data.id, name: data.full_name }
}

async function openInternalPage(
	browser: Browser,
	account: { email: string; password: string },
): Promise<InternalPageHandle> {
	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	await context.addCookies(
		await createAuthCookies(account, COOKIE_NAMES.internal, URLS.internal),
	)
	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)
	await page.goto(URLS.internal, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page).not.toHaveURL(/\/login/)
	return { context, guard, page }
}

async function signInLocal(
	env: LocalSupabaseEnv,
	account: { email: string; password: string },
) {
	const client = createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const { error } = await client.auth.signInWithPassword(account)
	if (error) {
		throw new Error(`Could not sign in ${account.email}: ${error.message}`)
	}
	return { client }
}

async function createAuthCookies(
	account: { email: string; password: string },
	cookieName: string,
	url: string,
) {
	const env = readLocalSupabaseEnv()
	const cookieJar: SupabaseCookieToSet[] = []
	const client = createServerClient(env.apiUrl, env.anonKey, {
		cookieOptions: { name: cookieName, path: '/', sameSite: 'lax' },
		cookies: {
			getAll: () => [],
			setAll: (cookies) => {
				cookieJar.push(...cookies)
			},
		},
	})

	const { error } = await client.auth.signInWithPassword(account)
	if (error) throw new Error(`Could not seed ${cookieName}: ${error.message}`)

	const nowSeconds = Math.floor(Date.now() / 1000)
	return cookieJar.map((cookie) => ({
		expires: nowSeconds + (cookie.options?.maxAge ?? 3600),
		name: cookie.name,
		sameSite: 'Lax' as const,
		url,
		value: cookie.value,
	}))
}

async function waitForHydration(page: Page) {
	await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {
		return undefined
	})
	await page.waitForTimeout(600)
}

function installBrowserErrorGuard(page: Page) {
	const browserErrors: string[] = []

	page.on('console', (message) => {
		if (message.type() !== 'error') return
		browserErrors.push(message.text())
	})
	page.on('pageerror', (error) => {
		browserErrors.push(error.message)
	})
	page.on('requestfailed', (request) => {
		const failure = request.failure()
		const errorText = failure?.errorText ?? 'request failed'
		if (errorText.includes('ERR_ABORTED')) return
		browserErrors.push(`${request.method()} ${request.url()} ${errorText}`)
	})
	page.on('response', (response) => {
		if (response.status() < 500) return
		browserErrors.push(`${response.status()} ${response.url()}`)
	})

	return {
		async expectClean(label: string) {
			await page.waitForTimeout(400)
			expect(browserErrors, `${label} browser errors`).toEqual([])
		},
	}
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
	expect(isRecord(value), label).toBe(true)
	return value as Record<string, unknown>
}

function expectString(value: unknown, label: string): string {
	expect(typeof value === 'string' && value.length > 0, label).toBe(true)
	return String(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

function isIsoTimestamp(value: unknown) {
	if (typeof value !== 'string') return false
	return !Number.isNaN(Date.parse(value))
}

function futureLocalDateTime() {
	const due = new Date(Date.now() + 2 * 86_400_000)
	due.setMinutes(0, 0, 0)
	const offsetMs = due.getTimezoneOffset() * 60_000
	return new Date(due.getTime() - offsetMs).toISOString().slice(0, 16)
}

function isRecentTimestamp(value: unknown) {
	if (!isIsoTimestamp(value)) return false
	return Date.now() - new Date(value).getTime() < 5 * 60_000
}

function readLocalSupabaseEnv(): LocalSupabaseEnv {
	const result = spawnSync('supabase', ['status', '-o', 'env'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.status !== 0) {
		throw new Error(
			result.stderr.trim() ||
				'Local Supabase is not running. Start it before browser testing.',
		)
	}

	const env: Record<string, string> = {}
	for (const line of result.stdout.split('\n')) {
		const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
		if (!match) continue
		env[match[1]] = stripEnvQuotes(match[2])
	}

	const apiUrl = env.API_URL
	const anonKey = env.ANON_KEY
	const serviceRoleKey = env.SERVICE_ROLE_KEY
	if (!apiUrl || !anonKey || !serviceRoleKey) {
		throw new Error('Could not read local Supabase URL/API keys.')
	}
	return { anonKey, apiUrl, serviceRoleKey }
}

function stripEnvQuotes(value: string) {
	if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
	return value
}

function createLocalServiceClient(env = readLocalSupabaseEnv()) {
	return createClient(env.apiUrl, env.serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
}
