import { Buffer } from 'node:buffer'
import { spawnSync } from 'node:child_process'
import { type Browser, expect, type Page, test } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { createActorFlowClient } from './flow-test-rpc'

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

interface PriceFreshnessFixture {
	customerName: string
	newCost: number
	oldCost: number
	productId: string
	productName: string
	productSlug: string
	proofFileName: string
	quantity: number
	requestId: string
	requestItemId: string
	requestNumber: string
	runId: string
	staleAt: string
	supplierId: string
	supplierName: string
}

interface InventoryPricesProductFixture {
	id: string
	name: string
	newCost: number
	oldCost: number
	slug: string
}

interface InventoryPricesFixture {
	batchProducts: [InventoryPricesProductFixture, InventoryPricesProductFixture]
	directProduct: InventoryPricesProductFixture
	freshProduct: InventoryPricesProductFixture
	runId: string
	supplierId: string
	supplierName: string
}

const URLS = {
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
}

const COOKIE_NAMES = {
	internal: 'hyperquote_internal_auth',
}

const LOCAL_INVENTORY = {
	email: 'Admin@HyperQuote.net',
	password: '123456',
}

const LOCAL_SALES = {
	email: 'Manager@HyperQuote.net',
	password: '123456',
}

test.describe.configure({ mode: 'serial' })

test('sales sees stale item prices, requests inventory proof, and inventory resolves with audited supplier proof', async ({
	browser,
}) => {
	test.setTimeout(360_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const salesAuth = await signInLocal(env, LOCAL_SALES)
	const salesEmployeeId = await employeeIdByEmail(service, LOCAL_SALES.email)
	const inventoryEmployeeId = await employeeIdByEmail(
		service,
		LOCAL_INVENTORY.email,
	)
	await deferAssignedFlowTestWork(service, [{ employeeId: salesEmployeeId }])
	const fixture = await createPriceFreshnessFixture(service)
	await setSalesPresence(salesAuth.client, 'online')
	const claim = await salesAuth.client.rpc('sales_claim_order', {
		p_order_id: fixture.requestId,
	})
	expect(claim.error).toBeNull()
	let priceRequestId: string | null = null

	const sales = await openInternalPage(browser, LOCAL_SALES)
	try {
		await sales.page.getByRole('button', { name: /^Sales$/i }).click()
		const requestPricesButton = sales.page.getByRole('button', {
			name: /^Update price$/i,
		})
		await expectQuoteAssignedToEmployee(
			service,
			fixture.requestId,
			salesEmployeeId,
		)
		await expect(sales.page.locator('body')).toContainText(
			fixture.customerName,
			{ timeout: 30_000 },
		)
		await expect(sales.page.locator('body')).toContainText(fixture.productName)
		await expect(sales.page.getByLabel('Outdated price').first()).toBeVisible({
			timeout: 20_000,
		})
		await expect(
			sales.page.getByRole('button', { name: /Review & submit/i }),
		).toBeHidden()
		await expect(requestPricesButton).toBeVisible({ timeout: 20_000 })
		await requestPricesButton.click()
		await expect(sales.page.getByText(/Inventory notified/i)).toBeVisible({
			timeout: 20_000,
		})
		await expect(
			sales.page.getByRole('link', { name: /Call Admin/i }),
		).toBeVisible({ timeout: 20_000 })
		const priceRequest = await expectPriceRequestCreated(service, fixture, {
			requestedByEmployeeId: salesEmployeeId,
		})
		priceRequestId = priceRequest.id
		await sales.guard.expectClean('sales stale price request')

		const duplicate = await salesAuth.client.rpc('request_price_update', {
			p_order_id: fixture.requestId,
			p_product_id: fixture.productId,
			p_reason: `Duplicate price request should dedupe ${fixture.runId}`,
		})
		expect(duplicate.error).toBeNull()
		expect(duplicate.data?.id).toBe(priceRequest.id)
		await expectPriceRequestCount(service, fixture, 1)
	} finally {
		await sales.context.close()
	}

	const inventory = await openInternalPage(browser, LOCAL_INVENTORY)
	try {
		await inventory.page.getByRole('button', { name: /^Inventory$/i }).click()
		await expect(
			inventory.page.getByRole('navigation', {
				name: /Inventory sections/i,
			}),
		).toBeVisible({ timeout: 20_000 })
		await inventory.page
			.getByRole('button', { name: /^Prices(?:\s+\d+)?$/i })
			.click()
		await expect(
			inventory.page.getByRole('button', { name: /^Prices/i }),
		).toHaveClass(/red/)
		await inventory.page.getByLabel(/Search prices/i).fill(fixture.productName)
		await expect(inventory.page.locator('body')).toContainText(
			fixture.productName,
			{ timeout: 20_000 },
		)
		const requestedRow = inventory.page
			.locator('li', { hasText: fixture.productName })
			.first()
		await expect(requestedRow).toContainText(/Sales waiting · 1/i)
		await inventory.page
			.getByRole('button', {
				name: new RegExp(
					`Change price for ${escapeRegExp(fixture.productName)}`,
					'i',
				),
			})
			.click()
		await expect(
			inventory.page.getByRole('dialog', {
				name: /Update supplier price/i,
			}),
		).toBeVisible({ timeout: 20_000 })
		await expect(inventory.page.locator('body')).toContainText(
			'Sales waiting · 1',
		)
		await expect(inventory.page.locator('body')).toContainText(
			fixture.customerName,
		)

		await expect(
			inventory.page.getByRole('button', { name: /^Submit proof$/i }),
		).toBeDisabled()
		await expect(inventory.page.locator('body')).toContainText(
			/Choose a supplier first/i,
		)
		await inventory.page
			.getByRole('button', { name: /\(select a supplier\)/i })
			.click()
		await inventory.page
			.getByRole('dialog', {
				name: /Update supplier price/i,
			})
			.getByRole('button', {
				name: new RegExp(escapeRegExp(fixture.supplierName), 'i'),
			})
			.click()
		await expect(
			inventory.page.getByRole('button', { name: /^Submit proof$/i }),
		).toBeDisabled()
		await expect(inventory.page.locator('body')).toContainText(
			/Change the supplier cost before saving/i,
		)

		await inventory.page
			.getByLabel(
				new RegExp(
					`New supplier cost for ${escapeRegExp(fixture.supplierName)}`,
					'i',
				),
			)
			.fill(String(fixture.newCost))
		await inventory.page
			.getByRole('button', { name: /^Submit proof$/i })
			.click()
		await expect(
			inventory.page.getByRole('button', { name: /Submit proof & save/i }),
		).toBeDisabled()
		await expect(inventory.page.locator('body')).toContainText(
			/Upload a PDF proof/i,
		)

		await inventory.page.getByRole('button', { name: /^Essay$/i }).click()
		await inventory.page
			.getByPlaceholder(/Write the supplier contact/i)
			.fill('short proof')
		await expect(
			inventory.page.getByRole('button', { name: /Submit proof & save/i }),
		).toBeDisabled()
		await expect(inventory.page.locator('body')).toContainText(/at least 80/i)

		await inventory.page.getByRole('button', { name: /^PDF$/i }).click()
		await inventory.page.locator('input[type="file"]').setInputFiles({
			buffer: Buffer.from('%PDF-1.4\n% flow price proof\n%%EOF\n'),
			mimeType: 'application/pdf',
			name: fixture.proofFileName,
		})
		await expect(inventory.page.locator('body')).toContainText(
			fixture.proofFileName,
		)
		await inventory.page
			.getByRole('button', { name: /Submit proof & save/i })
			.click()
		await expect(
			inventory.page.getByRole('dialog', {
				name: /Update supplier price/i,
			}),
		).toBeHidden({ timeout: 30_000 })

		await expectPriceUpdateResolved(service, fixture, {
			inventoryEmployeeId,
			priceRequestId: expectString(priceRequestId, 'price request id'),
		})
		await inventory.page.getByLabel(/Search prices/i).fill(fixture.productName)
		await expect(inventory.page.locator('body')).toContainText(
			fixture.newCost.toLocaleString('en-EG', { minimumFractionDigits: 2 }),
			{ timeout: 20_000 },
		)
		await inventory.guard.expectClean('inventory supplier proof price update')
	} finally {
		await inventory.context.close()
	}

	const salesAfterPriceUpdate = await openInternalPage(browser, LOCAL_SALES)
	try {
		await salesAfterPriceUpdate.page
			.getByRole('button', { name: /^Sales$/i })
			.click()
		await expectQuoteAssignedToEmployee(
			service,
			fixture.requestId,
			salesEmployeeId,
		)
		await expect(salesAfterPriceUpdate.page.locator('body')).toContainText(
			fixture.productName,
			{ timeout: 30_000 },
		)
		const refreshedSellPrice = await quoteBuilderSellPrice(
			service,
			fixture.productId,
		)
		await expect(salesAfterPriceUpdate.page.locator('body')).toContainText(
			`${(refreshedSellPrice * fixture.quantity).toLocaleString('en-EG', {
				minimumFractionDigits: 2,
			})}LE`,
			{ timeout: 20_000 },
		)
		await salesAfterPriceUpdate.page
			.getByRole('button', { name: /Review & submit/i })
			.click()
		await expect(
			salesAfterPriceUpdate.page.getByRole('button', {
				name: /Send to finance/i,
			}),
		).toBeVisible({
			timeout: 20_000,
		})
		await salesAfterPriceUpdate.page
			.getByRole('button', { name: /Send to finance/i })
			.click()
		await salesAfterPriceUpdate.guard.expectClean(
			'sales refreshed cost confirm flow',
		)
	} finally {
		await salesAfterPriceUpdate.context.close()
	}

	const committedTotal = await expectOrderTotal(service, fixture.requestId)
	const laterCost = fixture.newCost + 50
	const { error: laterLinkError } = await service
		.from('supplier_product_links')
		.update({ last_quoted_at: new Date().toISOString(), raw_cost: laterCost })
		.eq('product_id', fixture.productId)
		.eq('supplier_id', fixture.supplierId)
	if (laterLinkError) throw new Error(laterLinkError.message)
	const { error: laterProductError } = await service
		.from('products')
		.update({
			price_range_max: laterCost * 1.15,
			price_range_min: laterCost,
			updated_at: new Date().toISOString(),
		})
		.eq('id', fixture.productId)
	if (laterProductError) throw new Error(laterProductError.message)
	expect(await expectOrderTotal(service, fixture.requestId)).toBe(
		committedTotal,
	)
})

test('inventory tabs keep direct supplier price links without specialties', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const fixture = await createInventoryPricesFixture(service)

	const inventory = await openInternalPage(browser, LOCAL_INVENTORY)
	try {
		await inventory.page.getByRole('button', { name: /^Inventory$/i }).click()
		await expect(
			inventory.page.getByRole('navigation', {
				name: /Inventory sections/i,
			}),
		).toBeVisible({ timeout: 20_000 })

		await inventory.page
			.getByRole('button', { name: /^Prices(?:\s+\d+)?$/i })
			.click()
		await inventory.page
			.getByLabel(/Search prices/i)
			.fill(fixture.directProduct.name)
		const directPriceRow = inventory.page
			.locator('li', { hasText: fixture.directProduct.name })
			.first()
		await expect(directPriceRow).toContainText(/outdated/i, {
			timeout: 20_000,
		})
		await expect(directPriceRow).toContainText(/10d ago/i)
		await expect(directPriceRow).toContainText(fixture.supplierName)

		await inventory.page
			.getByRole('button', { name: /^Stock(?:\s+\d+)?$/i })
			.click()
		await inventory.page
			.getByLabel(/Search stock/i)
			.fill(fixture.directProduct.name)
		const directStockRow = inventory.page
			.locator('li', { hasText: fixture.directProduct.name })
			.first()
		await expect(directStockRow).toBeVisible({ timeout: 20_000 })
		await directStockRow
			.getByRole('button', { name: /^(Refill|Review)$/i })
			.click()
		const refillPanel = inventory.page.getByRole('dialog', {
			name: /Refill stock/i,
		})
		await expect(refillPanel).toBeVisible({ timeout: 20_000 })
		await expect(refillPanel).toContainText(fixture.supplierName)
		await expect(refillPanel).toContainText(
			fixture.directProduct.oldCost.toLocaleString('en-EG', {
				minimumFractionDigits: 2,
			}),
		)
		await inventory.page.keyboard.press('Escape')
		await expect(refillPanel).toBeHidden({ timeout: 20_000 })

		await inventory.page
			.getByRole('button', { name: /^Prices(?:\s+\d+)?$/i })
			.click()
		await inventory.page.getByLabel(/Search prices/i).fill('')
		await inventory.page
			.getByRole('button', { name: /^Supplier call$/i })
			.click()
		await expect(
			inventory.page.getByRole('dialog', {
				name: /Supplier call price update/i,
			}),
		).toBeVisible({ timeout: 20_000 })
		await inventory.page
			.getByLabel(/Supplier for batch price update/i)
			.selectOption(fixture.supplierId)
		await expect(inventory.page.locator('body')).toContainText(
			`${fixture.supplierName} · 4 items`,
		)
		await inventory.guard.expectClean('inventory direct supplier link tabs')
	} finally {
		await inventory.context.close()
	}
})

test('inventory prices show supplier freshness labels and update one or many supplier items with proof', async ({
	browser,
}) => {
	test.setTimeout(360_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const inventoryAuth = await signInLocal(env, LOCAL_INVENTORY)
	const salesOnlyAccount = await createSalesOnlyInternalActor(service)
	const salesOnlyAuth = await signInLocal(env, salesOnlyAccount)
	const inventoryEmployeeId = await employeeIdByEmail(
		service,
		LOCAL_INVENTORY.email,
	)
	const fixture = await createInventoryPricesFixture(service)

	const unauthorizedBatch = await salesOnlyAuth.client.rpc(
		'inventory_update_supplier_prices',
		{
			p_notes: `Sales must not batch-update supplier prices ${fixture.runId}`,
			p_proof_path: 'price-proofs/sales-batch-bypass.pdf',
			p_supplier_id: fixture.supplierId,
			p_updates: fixture.batchProducts.map((product) => ({
				product_id: product.id,
				new_price: product.newCost,
			})),
		},
	)
	expect(unauthorizedBatch.error?.message).toContain(
		'insufficient_inventory_permission',
	)

	const zeroPrice = await inventoryAuth.client.rpc('inventory_update_price', {
		p_new_price: 0,
		p_notes: `Zero price must be rejected ${fixture.runId}`,
		p_product_id: fixture.directProduct.id,
		p_proof_path: 'price-proofs/zero-price.pdf',
		p_supplier_id: fixture.supplierId,
	})
	expect(zeroPrice.error?.message).toContain('invalid_price_update_amount')

	const inventory = await openInternalPage(browser, LOCAL_INVENTORY)
	try {
		await inventory.page.getByRole('button', { name: /^Inventory$/i }).click()
		await expect(
			inventory.page.getByRole('navigation', {
				name: /Inventory sections/i,
			}),
		).toBeVisible({ timeout: 20_000 })
		await inventory.page
			.getByRole('button', { name: /^Prices(?:\s+\d+)?$/i })
			.click()

		await inventory.page
			.getByLabel(/Search prices/i)
			.fill(fixture.freshProduct.name)
		const freshRow = inventory.page
			.locator('li', { hasText: fixture.freshProduct.name })
			.first()
		await expect(freshRow).toContainText(/updated/i, { timeout: 20_000 })
		await expect(freshRow).toContainText(fixture.supplierName)

		await inventory.page
			.getByLabel(/Search prices/i)
			.fill(fixture.directProduct.name)
		const directRow = inventory.page
			.locator('li', { hasText: fixture.directProduct.name })
			.first()
		await expect(directRow).toContainText(/outdated/i, { timeout: 20_000 })
		await expect(directRow).toContainText(fixture.supplierName)

		await inventory.page
			.getByRole('button', {
				name: new RegExp(
					`Change price for ${escapeRegExp(fixture.directProduct.name)}`,
					'i',
				),
			})
			.click()
		await expect(
			inventory.page.getByRole('dialog', { name: /Update supplier price/i }),
		).toBeVisible({ timeout: 20_000 })
		await inventory.page
			.getByRole('button', { name: /\(select a supplier\)/i })
			.click()
		await inventory.page
			.getByRole('dialog', {
				name: /Update supplier price/i,
			})
			.getByRole('button', {
				name: new RegExp(escapeRegExp(fixture.supplierName), 'i'),
			})
			.click()
		await inventory.page
			.getByLabel(
				new RegExp(
					`New supplier cost for ${escapeRegExp(fixture.supplierName)}`,
					'i',
				),
			)
			.fill('0')
		await expect(
			inventory.page.getByRole('button', { name: /^Submit proof$/i }),
		).toBeDisabled()
		await expect(inventory.page.locator('body')).toContainText(
			/greater than zero/i,
		)
		await inventory.page
			.getByLabel(
				new RegExp(
					`New supplier cost for ${escapeRegExp(fixture.supplierName)}`,
					'i',
				),
			)
			.fill(String(fixture.directProduct.newCost))
		await inventory.page
			.getByRole('button', { name: /^Submit proof$/i })
			.click()
		await inventory.page.getByRole('button', { name: /^Essay$/i }).click()
		await inventory.page
			.getByPlaceholder(/Write the supplier contact/i)
			.fill('short proof')
		await expect(
			inventory.page.getByRole('button', { name: /Submit proof & save/i }),
		).toBeDisabled()
		await inventory.page
			.getByPlaceholder(/Write the supplier contact/i)
			.fill(longProof(`Direct price-tab proof ${fixture.runId}`))
		await inventory.page
			.getByRole('button', { name: /Submit proof & save/i })
			.click()
		await expect(
			inventory.page.getByRole('dialog', { name: /Update supplier price/i }),
		).toBeHidden({ timeout: 30_000 })
		await expectSupplierPricesUpdated(service, [fixture.directProduct], {
			inventoryEmployeeId,
			proofPath: 'price-proofs/internal-essay-proof.txt',
			supplierId: fixture.supplierId,
		})

		await inventory.page.getByLabel(/Search prices/i).fill('')
		await inventory.page
			.getByRole('button', { name: /^Supplier call$/i })
			.click()
		await expect(
			inventory.page.getByRole('dialog', {
				name: /Supplier call price update/i,
			}),
		).toBeVisible({ timeout: 20_000 })
		await inventory.page
			.getByLabel(/Supplier for batch price update/i)
			.selectOption(fixture.supplierId)
		await expect(inventory.page.locator('body')).toContainText(
			`${fixture.supplierName} · 4 items`,
		)
		await expect(
			inventory.page.getByRole('button', { name: /^Save supplier call$/i }),
		).toBeDisabled()

		const [firstBatch, secondBatch] = fixture.batchProducts
		await inventory.page
			.getByRole('checkbox', {
				name: new RegExp(escapeRegExp(firstBatch.name), 'i'),
			})
			.check()
		await inventory.page
			.getByLabel(
				new RegExp(
					`New supplier cost for ${escapeRegExp(firstBatch.name)}`,
					'i',
				),
			)
			.fill(String(firstBatch.newCost))
		await expect(
			inventory.page.getByRole('button', { name: /^Save supplier call$/i }),
		).toBeDisabled()

		await inventory.page
			.getByRole('checkbox', {
				name: new RegExp(escapeRegExp(secondBatch.name), 'i'),
			})
			.check()
		await inventory.page
			.getByLabel(
				new RegExp(
					`New supplier cost for ${escapeRegExp(secondBatch.name)}`,
					'i',
				),
			)
			.fill('0')
		await expect(
			inventory.page.getByRole('button', { name: /^Save supplier call$/i }),
		).toBeDisabled()
		await inventory.page
			.getByLabel(
				new RegExp(
					`New supplier cost for ${escapeRegExp(secondBatch.name)}`,
					'i',
				),
			)
			.fill(String(secondBatch.newCost))
		await inventory.page
			.getByLabel(/Supplier call proof/i)
			.fill('short batch proof')
		await expect(
			inventory.page.getByRole('button', { name: /^Save supplier call$/i }),
		).toBeDisabled()
		await inventory.page
			.getByLabel(/Supplier call proof/i)
			.fill(longProof(`Batch supplier call proof ${fixture.runId}`))
		await expect(
			inventory.page.getByRole('button', { name: /^Save supplier call$/i }),
		).toBeEnabled()
		await inventory.page
			.getByRole('button', { name: /^Save supplier call$/i })
			.click()
		await expect(
			inventory.page.getByRole('dialog', {
				name: /Supplier call price update/i,
			}),
		).toBeHidden({ timeout: 30_000 })
		await expectSupplierPricesUpdated(service, fixture.batchProducts, {
			inventoryEmployeeId,
			proofPath: 'price-proofs/internal-essay-proof.txt',
			supplierId: fixture.supplierId,
		})

		await inventory.page.getByLabel(/Search prices/i).fill(firstBatch.name)
		await expect(
			inventory.page.locator('li', { hasText: firstBatch.name }).first(),
		).toContainText(/updated/i, { timeout: 20_000 })
		await inventory.guard.expectClean(
			'inventory prices direct and batch update',
		)
	} finally {
		await inventory.context.close()
	}
})

async function createPriceFreshnessFixture(
	service: ReturnType<typeof createLocalServiceClient>,
): Promise<PriceFreshnessFixture> {
	const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
	const staleAt = new Date(Date.now() - 10 * 86_400_000).toISOString()
	const queueAt = '1900-01-01T00:00:00.000Z'
	const oldCost = 100
	const newCost = 112.5
	const quantity = 5
	const customer = await localCustomer(service)
	const address = await ensureCustomerAddress(service, customer.id, runId)
	const supplierName = `Flow Supplier ${runId}`
	const productName = `Flow Stale Price ${runId}`
	const productSlug = `flow-stale-price-${runId}`
	const proofFileName = `flow-price-proof-${runId}.pdf`

	const { data: supplier, error: supplierError } = await service
		.from('suppliers')
		.insert({
			email: `flow-supplier-${runId}@example.test`,
			name: supplierName,
			notes: `Flow price freshness supplier ${runId}`,
			phone: `+209${Date.now().toString().slice(-10)}`,
			status: 'active',
		})
		.select('id, name')
		.single()
	if (supplierError || !supplier) {
		throw new Error(supplierError?.message ?? 'Supplier fixture missing')
	}

	const { data: product, error: productError } = await service
		.from('products')
		.insert({
			availability_status: 'available',
			category: 'tree',
			description: null,
			image_urls: [],
			is_active: true,
			name: productName,
			name_ar: `اختبار سعر ${runId}`,
			price_range_max: 130,
			price_range_min: oldCost,
			sku: `FLOW-PRICE-${runId}`.toUpperCase(),
			slug: productSlug,
			specifications: { grade: 'CEM I', source: 'flow-final' },
			specifications_ar: { grade: 'CEM I', source: 'flow-final' },
			subcategory: 'tree',
			subcategory_ar: 'أسمنت',
			unit_of_measure: 'piece',
			unit_of_measure_ar: 'قطعة',
			updated_at: staleAt,
		})
		.select('id, name, slug')
		.single()
	if (productError || !product) {
		throw new Error(productError?.message ?? 'Product fixture missing')
	}

	const { error: linkError } = await service
		.from('supplier_product_links')
		.insert({
			is_primary: true,
			last_quoted_at: staleAt,
			lead_time_days: 1,
			min_order_qty: 1,
			notes: `Flow stale supplier quote ${runId}`,
			product_id: product.id,
			raw_cost: oldCost,
			supplier_id: supplier.id,
		})
	if (linkError) throw new Error(linkError.message)

	const { error: specialtyError } = await service
		.from('supplier_specialties')
		.insert({
			category_slug: 'tree',
			product_slug: product.slug,
			supplier_id: supplier.id,
		})
	if (specialtyError) throw new Error(specialtyError.message)

	const deliveryDate = new Date(Date.now() + 7 * 86_400_000)
		.toISOString()
		.slice(0, 10)
	const { data: quoteRequest, error: quoteRequestError } = await service
		.from('quote_requests')
		.insert({
			created_at: queueAt,
			customer_id: customer.id,
			delivery_address_id: address.id,
			delivery_date: deliveryDate,
			eligible_at: queueAt,
			notes: `Flow price freshness ${runId}`,
			status: 'submitted',
			submitted_at: queueAt,
			urgency: 'urgent',
		})
		.select('id, request_number')
		.single()
	if (quoteRequestError || !quoteRequest) {
		throw new Error(
			quoteRequestError?.message ?? 'Quote request fixture missing',
		)
	}

	const { data: requestItem, error: requestItemError } = await service
		.from('quote_request_items')
		.insert({
			currency: 'EGP',
			customer_description: productName,
			is_unmatched: false,
			match_confidence: 1,
			price_range_max: 130,
			price_range_min: oldCost,
			product_id: product.id,
			quantity,
			quote_request_id: quoteRequest.id,
			sort_order: 1,
			unit_of_measure: 'piece',
			unit_of_measure_ar: 'قطعة',
		})
		.select('id')
		.single()
	if (requestItemError || !requestItem) {
		throw new Error(
			requestItemError?.message ?? 'Quote request item fixture missing',
		)
	}

	return {
		customerName: customer.company_name,
		newCost,
		oldCost,
		productId: product.id,
		productName,
		productSlug: product.slug,
		proofFileName,
		quantity,
		requestId: quoteRequest.id,
		requestItemId: requestItem.id,
		requestNumber: quoteRequest.request_number,
		runId,
		staleAt,
		supplierId: supplier.id,
		supplierName: supplier.name,
	}
}

async function createInventoryPricesFixture(
	service: ReturnType<typeof createLocalServiceClient>,
): Promise<InventoryPricesFixture> {
	const runId = `prices-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
	const staleAt = new Date(Date.now() - 10 * 86_400_000).toISOString()
	const freshAt = new Date().toISOString()
	const supplierName = `Flow Price Supplier ${runId}`

	const { data: supplier, error: supplierError } = await service
		.from('suppliers')
		.insert({
			email: `flow-price-supplier-${runId}@example.test`,
			name: supplierName,
			notes: `Flow inventory prices supplier ${runId}`,
			phone: `+207${Date.now().toString().slice(-10)}`,
			status: 'active',
		})
		.select('id, name')
		.single()
	if (supplierError || !supplier) {
		throw new Error(supplierError?.message ?? 'Inventory supplier missing')
	}

	const definitions = [
		{
			key: 'direct',
			label: 'Direct',
			oldCost: 72,
			newCost: 81.5,
			lastQuotedAt: staleAt,
			productUpdatedAt: freshAt,
			skipSpecialty: true,
		},
		{
			key: 'fresh',
			label: 'Fresh',
			oldCost: 44,
			newCost: 51,
			lastQuotedAt: freshAt,
			productUpdatedAt: freshAt,
			skipSpecialty: false,
		},
		{
			key: 'batch-a',
			label: 'Batch A',
			oldCost: 63,
			newCost: 67.25,
			lastQuotedAt: staleAt,
			productUpdatedAt: staleAt,
			skipSpecialty: false,
		},
		{
			key: 'batch-b',
			label: 'Batch B',
			oldCost: 88,
			newCost: 93.75,
			lastQuotedAt: staleAt,
			productUpdatedAt: staleAt,
			skipSpecialty: false,
		},
	] as const

	const products: Record<string, InventoryPricesProductFixture> = {}
	for (const definition of definitions) {
		const name = `Flow ${definition.label} Price ${runId}`
		const slug = `flow-${definition.key}-price-${runId}`
		const { data: product, error: productError } = await service
			.from('products')
			.insert({
				availability_status: 'available',
				category: 'tree',
				description: null,
				image_urls: [],
				is_active: true,
				name,
				name_ar: `اختبار ${definition.label} ${runId}`,
				price_range_max: definition.oldCost + 15,
				price_range_min: definition.oldCost,
				sku: `FLOW-${definition.key}-${runId}`.toUpperCase(),
				slug,
				specifications: { flow: 'inventory-prices', key: definition.key },
				specifications_ar: { flow: 'inventory-prices', key: definition.key },
				subcategory: 'tree',
				subcategory_ar: 'أسمنت',
				unit_of_measure: 'piece',
				unit_of_measure_ar: 'قطعة',
				updated_at: definition.productUpdatedAt,
			})
			.select('id, name, slug')
			.single()
		if (productError || !product) {
			throw new Error(productError?.message ?? 'Inventory product missing')
		}

		const { error: linkError } = await service
			.from('supplier_product_links')
			.insert({
				is_primary: true,
				last_quoted_at: definition.lastQuotedAt,
				lead_time_days: 2,
				min_order_qty: 1,
				notes: `Flow inventory price link ${runId}`,
				product_id: product.id,
				raw_cost: definition.oldCost,
				supplier_id: supplier.id,
			})
		if (linkError) throw new Error(linkError.message)

		if (definition.skipSpecialty) {
			products[definition.key] = {
				id: product.id,
				name: product.name,
				newCost: definition.newCost,
				oldCost: definition.oldCost,
				slug: product.slug,
			}
			continue
		}

		const { error: specialtyError } = await service
			.from('supplier_specialties')
			.insert({
				category_slug: 'tree',
				product_slug: product.slug,
				supplier_id: supplier.id,
			})
		if (specialtyError) throw new Error(specialtyError.message)

		products[definition.key] = {
			id: product.id,
			name: product.name,
			newCost: definition.newCost,
			oldCost: definition.oldCost,
			slug: product.slug,
		}
	}

	return {
		batchProducts: [products['batch-a'], products['batch-b']],
		directProduct: products.direct,
		freshProduct: products.fresh,
		runId,
		supplierId: supplier.id,
		supplierName: supplier.name,
	}
}

async function createSalesOnlyInternalActor(
	service: ReturnType<typeof createLocalServiceClient>,
): Promise<{ email: string; password: string }> {
	const runId = `sales-only-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
	const email = `${runId}@hyperquote.local`
	const password = 'sales1'
	const { data: userData, error: userError } =
		await service.auth.admin.createUser({
			app_metadata: { pool: 'internal', roles: ['sales'] },
			email,
			email_confirm: true,
			password,
			user_metadata: { name: `Flow Sales Only ${runId}` },
		})
	if (userError || !userData.user) {
		throw new Error(userError?.message ?? 'Sales-only auth user missing')
	}

	const { data: employee, error: employeeError } = await service
		.from('employees')
		.insert({
			email,
			full_name: `Flow Sales Only ${runId}`,
			phone: `+206${Date.now().toString().slice(-10)}`,
			status: 'active',
			user_id: userData.user.id,
		})
		.select('id')
		.single()
	if (employeeError || !employee) {
		throw new Error(employeeError?.message ?? 'Sales-only employee missing')
	}

	const { error: roleError } = await service.from('employee_roles').insert({
		employee_id: employee.id,
		role: 'sales',
	})
	if (roleError) throw new Error(roleError.message)

	const { error: panelError } = await service
		.from('employee_panel_permissions')
		.insert({
			can_read: true,
			can_write: true,
			employee_id: employee.id,
			panel: 'sales',
		})
	if (panelError) throw new Error(panelError.message)

	return { email, password }
}

async function localCustomer(
	service: ReturnType<typeof createLocalServiceClient>,
) {
	const { data, error } = await service
		.from('customers')
		.select('id, company_name')
		.eq('email', 'Customer@HyperQuote.net')
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? 'Local customer not found')
	}
	return data as { company_name: string; id: string }
}

async function ensureCustomerAddress(
	service: ReturnType<typeof createLocalServiceClient>,
	customerId: string,
	runId: string,
) {
	const { data: existing, error: readError } = await service
		.from('customer_addresses')
		.select('id')
		.eq('customer_id', customerId)
		.order('is_default', { ascending: false })
		.limit(1)
		.maybeSingle()
	if (readError) throw new Error(readError.message)
	if (existing?.id) return existing as { id: string }

	const { data: created, error: createError } = await service
		.from('customer_addresses')
		.insert({
			area: 'New Cairo',
			city: 'Cairo',
			customer_id: customerId,
			governorate: 'Cairo',
			is_default: true,
			label: `Flow Price ${runId}`,
			street: `Flow Price ${runId} Street`,
		})
		.select('id')
		.single()
	if (createError || !created) {
		throw new Error(createError?.message ?? 'Failed to create customer address')
	}
	return created as { id: string }
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
	const { data, error } = await client.auth.signInWithPassword(account)
	if (error) {
		throw new Error(`Could not sign in ${account.email}: ${error.message}`)
	}
	return {
		client: createActorFlowClient(client, createLocalServiceClient(env), {
			actorPool: 'internal',
			actorUserId: data.user.id,
		}),
	}
}

async function setSalesPresence(
	client: ReturnType<typeof createClient>,
	status: 'online' | 'away' | 'offline',
) {
	const { error } = await client.rpc('set_employee_presence', {
		p_active_panel: status === 'online' ? 'sales' : null,
		p_status: status,
	})
	expect(error).toBeNull()
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

async function employeeIdByEmail(
	service: ReturnType<typeof createLocalServiceClient>,
	email: string,
) {
	const { data, error } = await service
		.from('employees')
		.select('id')
		.eq('email', email)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? `Employee ${email} not found`)
	}
	return String(data.id)
}

async function deferAssignedFlowTestWork(
	service: ReturnType<typeof createLocalServiceClient>,
	employees: {
		employeeId: string
	}[],
) {
	const { data, error } = await service
		.from('quote_requests')
		.select('assigned_employee_id, id, notes')
		.eq('status', 'assigned')
		.in(
			'assigned_employee_id',
			employees.map((employee) => employee.employeeId),
		)
	if (error) throw new Error(error.message)

	const assignedEmployeeIds = [
		...new Set(
			(data ?? [])
				.map((row) => row.assigned_employee_id)
				.filter((id): id is string => typeof id === 'string'),
		),
	]
	const assignedEmployees = assignedEmployeeIds.length
		? await service
				.from('employees')
				.select('id, user_id')
				.in('id', assignedEmployeeIds)
		: { data: [], error: null }
	if (assignedEmployees.error) throw new Error(assignedEmployees.error.message)
	const actorUserIds = new Map(
		(assignedEmployees.data ?? []).map((employee) => [
			String(employee.id),
			String(employee.user_id),
		]),
	)

	for (const row of data ?? []) {
		const notes = String(row.notes ?? '')
		const isFlowTestWork =
			notes.startsWith('Flow ') ||
			notes.startsWith('flow-') ||
			notes.startsWith('flow-internal-sales:')
		if (!isFlowTestWork) continue
		const actorUserId =
			row.assigned_employee_id && actorUserIds.get(row.assigned_employee_id)
		if (!actorUserId) {
			throw new Error(`No actor user found for assigned order ${row.id}`)
		}
		const { error: requeueError } = await service.rpc(
			'service_sales_save_and_requeue',
			{
				p_actor_pool: 'internal',
				p_actor_user_id: actorUserId,
				p_note: 'Flow test isolation defer',
				p_order_id: row.id,
				p_return_minutes: 1440,
			},
		)
		if (requeueError) throw new Error(requeueError.message)
	}
}

async function expectQuoteAssignedToEmployee(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	employeeId: string,
) {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('quote_requests')
					.select('assigned_at, assigned_employee_id, status')
					.eq('id', quoteRequestId)
					.single()
				if (error) return `error:${error.message}`
				return [
					data.status,
					data.assigned_employee_id === employeeId ? 'employee' : 'wrong',
					data.assigned_at ? 'assigned_at' : 'missing_assigned_at',
				].join('|')
			},
			{ timeout: 30_000 },
		)
		.toBe('assigned|employee|assigned_at')
}

async function expectOrderTotal(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
): Promise<number> {
	let total = 0
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('orders')
					.select('status, total_amount')
					.eq('quote_request_id', quoteRequestId)
					.maybeSingle()
				if (error) return `error:${error.message}`
				if (!data) return ''
				total = Number(data.total_amount)
				return `${data.status}|${total > 0 ? 'total' : 'zero'}`
			},
			{ timeout: 30_000 },
		)
		.toBe('confirmed_for_inventory|total')
	return total
}

async function quoteBuilderSellPrice(
	service: ReturnType<typeof createLocalServiceClient>,
	productId: string,
): Promise<number> {
	const { data, error } = await service
		.from('products')
		.select(`
			category,
			price_range_max,
			slug,
			supplier_product_links (
				raw_cost,
				is_primary
			)
		`)
		.eq('id', productId)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? 'Product price missing')
	}
	const links = Array.isArray(data.supplier_product_links)
		? data.supplier_product_links
		: []
	const primaryLink = links.find((link) => link.is_primary) ?? links[0]
	const supplierCost = Number(primaryLink?.raw_cost ?? 0)
	const sellPrice = Number(data.price_range_max ?? 0)
	if (supplierCost <= 0 || sellPrice <= 0) return sellPrice
	const margin = Math.max(
		0,
		Math.round(((sellPrice - supplierCost) / supplierCost) * 1000) / 10,
	)
	const threshold = await marginThreshold(service, {
		categorySlug: String(data.category ?? ''),
		productSlug: String(data.slug ?? ''),
	})
	const clampedMargin = Math.max(
		Math.max(0, threshold.floor),
		Math.min(
			Math.max(Math.max(threshold.floor, 25), threshold.bonus),
			Math.round(margin * 10) / 10,
		),
	)
	return Math.round(supplierCost * (1 + clampedMargin / 100) * 100) / 100
}

async function marginThreshold(
	service: ReturnType<typeof createLocalServiceClient>,
	scope: { categorySlug: string; productSlug: string },
) {
	const { data, error } = await service
		.from('pricing_rules')
		.select('category_slug, product_slug, bonus_margin, floor_margin, active')
		.eq('active', true)
		.order('category_slug', { ascending: true, nullsFirst: true })
		.order('product_slug', { ascending: true, nullsFirst: true })
	if (error) throw new Error(error.message)
	const rows = data ?? []
	const productRule = rows.find(
		(row) =>
			row.category_slug === scope.categorySlug &&
			row.product_slug === scope.productSlug,
	)
	const categoryRule = rows.find(
		(row) =>
			row.category_slug === scope.categorySlug && row.product_slug === null,
	)
	const fallback = rows.find(
		(row) => row.category_slug === null && row.product_slug === null,
	)
	const rule = productRule ?? categoryRule ?? fallback
	return {
		bonus: Number(rule?.bonus_margin ?? 20),
		floor: Number(rule?.floor_margin ?? 20),
	}
}

async function expectPriceRequestCreated(
	service: ReturnType<typeof createLocalServiceClient>,
	fixture: PriceFreshnessFixture,
	expected: { requestedByEmployeeId: string },
) {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('price_update_requests')
					.select('id, status')
					.eq('product_id', fixture.productId)
					.eq('quote_request_id', fixture.requestId)
				if (error) return `error:${error.message}`
				return `${data?.length ?? 0}:${data?.[0]?.status ?? ''}`
			},
			{ timeout: 20_000 },
		)
		.toBe('1:pending')

	const { data, error } = await service
		.from('price_update_requests')
		.select(
			'id, product_id, quote_request_id, quote_request_item_id, requested_by_employee_id, assigned_employee_id, reason, status, created_at',
		)
		.eq('product_id', fixture.productId)
		.eq('quote_request_id', fixture.requestId)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? 'Price update request missing')
	}
	expect(data.product_id).toBe(fixture.productId)
	expect(data.quote_request_id).toBe(fixture.requestId)
	expect(data.quote_request_item_id).toBe(fixture.requestItemId)
	expect(data.requested_by_employee_id).toBe(expected.requestedByEmployeeId)
	expect(data.assigned_employee_id).toBeNull()
	expect(data.status).toBe('pending')
	expect(String(data.reason)).toContain(fixture.productName)
	expect(isIsoTimestamp(data.created_at)).toBe(true)

	const activity = await latestActivity(service, {
		action: 'price_update_requested',
		entityId: data.id,
		entityType: 'price_update_request',
	})
	expect(activity.actorEmployeeId).toBe(expected.requestedByEmployeeId)
	expect(String(activity.details.employee_id)).toBe(
		expected.requestedByEmployeeId,
	)
	expect(String(activity.details.product_id)).toBe(fixture.productId)
	expect(String(activity.details.quote_request_id)).toBe(fixture.requestId)
	expect(String(activity.details.quote_request_item_id)).toBe(
		fixture.requestItemId,
	)
	expect(String(activity.details.status)).toBe('pending')

	return data as { id: string }
}

async function expectPriceRequestCount(
	service: ReturnType<typeof createLocalServiceClient>,
	fixture: PriceFreshnessFixture,
	expectedCount: number,
) {
	const { data, error } = await service
		.from('price_update_requests')
		.select('id')
		.eq('product_id', fixture.productId)
		.eq('quote_request_id', fixture.requestId)
	if (error) throw new Error(error.message)
	expect(data ?? []).toHaveLength(expectedCount)
}

async function expectPriceUpdateResolved(
	service: ReturnType<typeof createLocalServiceClient>,
	fixture: PriceFreshnessFixture,
	expected: { inventoryEmployeeId: string; priceRequestId: string },
) {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('price_update_requests')
					.select('assigned_employee_id, status')
					.eq('id', expected.priceRequestId)
					.single()
				if (error) return `error:${error.message}`
				return `${data.status}:${data.assigned_employee_id}`
			},
			{ timeout: 30_000 },
		)
		.toBe(`resolved:${expected.inventoryEmployeeId}`)

	const { data: priceUpdate, error: priceUpdateError } = await service
		.from('price_updates')
		.select(
			'id, product_id, supplier_id, updated_by_employee_id, old_price, new_price, proof_path, notes, created_at',
		)
		.eq('product_id', fixture.productId)
		.eq('supplier_id', fixture.supplierId)
		.order('created_at', { ascending: false })
		.limit(1)
		.single()
	if (priceUpdateError || !priceUpdate) {
		throw new Error(priceUpdateError?.message ?? 'Price update missing')
	}
	expect(priceUpdate.updated_by_employee_id).toBe(expected.inventoryEmployeeId)
	expect(Number(priceUpdate.old_price)).toBeCloseTo(fixture.oldCost, 2)
	expect(Number(priceUpdate.new_price)).toBeCloseTo(fixture.newCost, 2)
	expect(priceUpdate.proof_path).toBe(`price-proofs/${fixture.proofFileName}`)
	expect(String(priceUpdate.notes)).toContain(`PDF: ${fixture.proofFileName}`)
	expect(isIsoTimestamp(priceUpdate.created_at)).toBe(true)

	const { data: request, error: requestError } = await service
		.from('price_update_requests')
		.select(
			'status, assigned_employee_id, resolved_at, quote_request_item_id, updated_at',
		)
		.eq('id', expected.priceRequestId)
		.single()
	if (requestError || !request) {
		throw new Error(requestError?.message ?? 'Resolved request missing')
	}
	expect(request.status).toBe('resolved')
	expect(request.assigned_employee_id).toBe(expected.inventoryEmployeeId)
	expect(request.quote_request_item_id).toBe(fixture.requestItemId)
	expect(isIsoTimestamp(request.resolved_at)).toBe(true)
	expect(isIsoTimestamp(request.updated_at)).toBe(true)

	const { data: product, error: productError } = await service
		.from('products')
		.select('price_range_min, updated_at')
		.eq('id', fixture.productId)
		.single()
	if (productError || !product) {
		throw new Error(productError?.message ?? 'Updated product missing')
	}
	expect(Number(product.price_range_min)).toBeCloseTo(fixture.newCost, 2)
	expect(isRecentTimestamp(product.updated_at)).toBe(true)

	const { data: link, error: linkError } = await service
		.from('supplier_product_links')
		.select('raw_cost, last_quoted_at, is_primary')
		.eq('product_id', fixture.productId)
		.eq('supplier_id', fixture.supplierId)
		.single()
	if (linkError || !link) {
		throw new Error(linkError?.message ?? 'Updated supplier link missing')
	}
	expect(Number(link.raw_cost)).toBeCloseTo(fixture.newCost, 2)
	expect(link.is_primary).toBe(true)
	expect(isRecentTimestamp(link.last_quoted_at)).toBe(true)

	const activity = await latestActivity(service, {
		action: 'inventory_price_updated',
		entityId: priceUpdate.id,
		entityType: 'price_update',
	})
	expect(activity.actorEmployeeId).toBe(expected.inventoryEmployeeId)
	expect(String(activity.details.employee_id)).toBe(
		expected.inventoryEmployeeId,
	)
	expect(String(activity.details.product_id)).toBe(fixture.productId)
	expect(String(activity.details.supplier_id)).toBe(fixture.supplierId)
	expect(Number(activity.details.old_price)).toBeCloseTo(fixture.oldCost, 2)
	expect(Number(activity.details.new_price)).toBeCloseTo(fixture.newCost, 2)
	expect(String(activity.details.proof_path)).toBe(
		`price-proofs/${fixture.proofFileName}`,
	)
}

async function expectSupplierPricesUpdated(
	service: ReturnType<typeof createLocalServiceClient>,
	products: InventoryPricesProductFixture[],
	expected: {
		inventoryEmployeeId: string
		proofPath: string
		supplierId: string
	},
) {
	for (const product of products) {
		await expect
			.poll(
				async () => {
					const { data, error } = await service
						.from('supplier_product_links')
						.select('raw_cost')
						.eq('product_id', product.id)
						.eq('supplier_id', expected.supplierId)
						.single()
					if (error) return `error:${error.message}`
					return Number(data.raw_cost)
				},
				{ timeout: 30_000 },
			)
			.toBeCloseTo(product.newCost, 2)

		const { data: productRow, error: productError } = await service
			.from('products')
			.select('price_range_min, updated_at')
			.eq('id', product.id)
			.single()
		if (productError || !productRow) {
			throw new Error(productError?.message ?? 'Updated product missing')
		}
		expect(Number(productRow.price_range_min)).toBeCloseTo(product.newCost, 2)
		expect(isRecentTimestamp(productRow.updated_at)).toBe(true)

		const { data: priceUpdate, error: priceUpdateError } = await service
			.from('price_updates')
			.select(
				'id, product_id, supplier_id, updated_by_employee_id, old_price, new_price, proof_path, notes, created_at',
			)
			.eq('product_id', product.id)
			.eq('supplier_id', expected.supplierId)
			.order('created_at', { ascending: false })
			.limit(1)
			.single()
		if (priceUpdateError || !priceUpdate) {
			throw new Error(priceUpdateError?.message ?? 'Price update missing')
		}
		expect(priceUpdate.updated_by_employee_id).toBe(
			expected.inventoryEmployeeId,
		)
		expect(Number(priceUpdate.old_price)).toBeCloseTo(product.oldCost, 2)
		expect(Number(priceUpdate.new_price)).toBeCloseTo(product.newCost, 2)
		expect(priceUpdate.proof_path).toBe(expected.proofPath)
		expect(isIsoTimestamp(priceUpdate.created_at)).toBe(true)

		const activity = await latestActivity(service, {
			action: 'inventory_price_updated',
			entityId: priceUpdate.id,
			entityType: 'price_update',
		})
		expect(activity.actorEmployeeId).toBe(expected.inventoryEmployeeId)
		expect(String(activity.details.product_id)).toBe(product.id)
		expect(String(activity.details.supplier_id)).toBe(expected.supplierId)
		expect(Number(activity.details.old_price)).toBeCloseTo(product.oldCost, 2)
		expect(Number(activity.details.new_price)).toBeCloseTo(product.newCost, 2)
		expect(String(activity.details.proof_path)).toBe(expected.proofPath)
	}
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

function isRecentTimestamp(value: unknown) {
	if (!isIsoTimestamp(value)) return false
	return Date.now() - new Date(value).getTime() < 5 * 60_000
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

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function longProof(prefix: string) {
	return `${prefix}. Confirmed by the supplier account manager during a live inventory price call; the note includes source, reason, affected items, and commercial context.`
}
