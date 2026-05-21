import { spawnSync } from 'node:child_process'
import { type Dialog, expect, type Page, test } from '@playwright/test'
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

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')
const URLS = {
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
	portal: process.env.FLOW_PORTAL_URL ?? 'http://localhost:3001',
	website: process.env.FLOW_WEBSITE_URL ?? 'http://localhost:3000',
}
const ACCOUNTS = {
	admin: {
		email: 'local-admin@hyperquote.local',
		password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
	},
	customer: {
		email: 'local-customer@hyperquote.local',
		password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
	},
	sales: {
		email: 'local-sales@hyperquote.local',
		password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
	},
}
const INTERNAL_COOKIE = 'hyperquote_internal_auth'
const CUSTOMER_COOKIE = 'hyperquote_customer_auth'

test('Admin registry controls catalog, categories, suppliers, employees, exports, and audited write boundaries', async ({
	browser,
}) => {
	test.setTimeout(300_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const adminClient = await createAuthenticatedClient(env, ACCOUNTS.admin)
	const salesClient = await createAuthenticatedClient(env, ACCOUNTS.sales)
	const stamp = Date.now()
	const activityStartedAt = new Date().toISOString()
	const category = {
		image: 'https://websiteassets.hyperquote.net/Images/timber.webp',
		name: `Flow Admin Category ${stamp}`,
		nameAr: `تصنيف الإدارة ${stamp}`,
		slug: `flow-admin-category-${stamp}`,
		description: `Flow admin category description ${stamp}`,
		descriptionAr: `وصف تصنيف الإدارة ${stamp}`,
		updatedName: `Flow Admin Category Updated ${stamp}`,
		updatedNameAr: `تصنيف الإدارة محدث ${stamp}`,
		updatedDescription: `Flow admin category updated description ${stamp}`,
		updatedDescriptionAr: `وصف تصنيف الإدارة المحدث ${stamp}`,
	}
	const product = {
		name: `Flow Admin Product ${stamp}`,
		nameAr: `منتج الإدارة ${stamp}`,
		slug: `flow-admin-category-${stamp}-flow-admin-product-${stamp}`,
		updatedName: `Flow Admin Product Updated ${stamp}`,
		updatedNameAr: `منتج الإدارة محدث ${stamp}`,
		imageOne: 'https://websiteassets.hyperquote.net/Images/cement.webp',
	}
	const supplier = {
		name: `Flow Admin Supplier ${stamp}`,
		email: `flow-admin-supplier-${stamp}@hyperquote.local`,
		phone: `+203${String(stamp).slice(-9)}`,
		updatedPhone: `+204${String(stamp).slice(-9)}`,
	}
	const employee = {
		name: `Flow Admin Employee ${stamp}`,
		email: `flow-admin-employee-${stamp}@hyperquote.local`,
		password: `Employee-${stamp}`,
		phone: `+205${String(stamp).slice(-9)}`,
	}

	const deniedDirectCategory = await adminClient.from('categories').insert({
		is_active: true,
		name: `Direct Admin Bypass ${stamp}`,
		name_ar: `تجاوز ${stamp}`,
		slug: `direct-admin-bypass-${stamp}`,
	})
	expect(deniedDirectCategory.error?.message).toContain(
		'registry_writes_must_use_audited_server_function',
	)
	const deniedExport = await salesClient.rpc('admin_export_data', {
		p_reason: 'Sales user must not export admin data',
		p_scope: 'employees',
	})
	expect(deniedExport.error?.message).toContain('insufficient_admin_permission')

	const context = await browser.newContext({
		viewport: { height: 1100, width: 1440 },
	})
	await context.addCookies([
		...(await createAuthCookies(
			ACCOUNTS.admin,
			INTERNAL_COOKIE,
			URLS.internal,
			env,
		)),
		...(await createAuthCookies(
			ACCOUNTS.customer,
			CUSTOMER_COOKIE,
			URLS.website,
			env,
		)),
		...(await createAuthCookies(
			ACCOUNTS.customer,
			CUSTOMER_COOKIE,
			URLS.portal,
			env,
		)),
	])
	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)

	await openInternalAdmin(page)
	await expect(page.locator('body')).not.toContainText(/raw sql/i)

	await openAdminVolume(page, 'Categories', 'Catalog families')
	await page.getByRole('button', { name: /^New entry$/ }).click()
	for (const hiddenLabel of ['Slug', 'Parent category']) {
		await expect(page.getByLabel(hiddenLabel, { exact: true })).toHaveCount(0)
	}
	await page.getByLabel('Picture URL').fill(category.image)
	await page.getByLabel('Name (English)').fill(category.name)
	await page.getByLabel('Name (Arabic)').fill(category.nameAr)
	await page
		.getByLabel('Description', { exact: true })
		.fill(category.description)
	await page.getByLabel('Description (Arabic)').fill(category.descriptionAr)
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(category.name, {
		timeout: 15_000,
	})
	await page.getByRole('button', { name: /^Edit$/ }).click()
	await page.getByLabel('Name (English)').fill(category.updatedName)
	await page.getByLabel('Name (Arabic)').fill(category.updatedNameAr)
	await page
		.getByLabel('Description', { exact: true })
		.fill(category.updatedDescription)
	await page
		.getByLabel('Description (Arabic)')
		.fill(category.updatedDescriptionAr)
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(category.updatedName, {
		timeout: 15_000,
	})
	await closeAdminPanel(page)
	await expectCategory(service, category.slug, {
		description: category.updatedDescription,
		descriptionAr: category.updatedDescriptionAr,
		imageUrl: category.image,
		isActive: true,
		name: category.updatedName,
		nameAr: category.updatedNameAr,
	})

	await openAdminVolume(page, 'Products', 'Every SKU')
	await page.getByRole('button', { name: /^New entry$/ }).click()
	for (const hiddenLabel of [
		'SKU',
		'Slug',
		'Image URLs',
		'Price min',
		'Price max',
		'Price tier',
		'Specifications JSON',
		'Specifications JSON (Arabic)',
		'Tags',
		'Stockable',
	]) {
		await expect(page.getByLabel(hiddenLabel, { exact: true })).toHaveCount(0)
	}
	await page.getByLabel('Picture URL').fill(product.imageOne)
	await page.getByLabel('Name (English)').fill(product.name)
	await page.getByLabel('Name (Arabic)').fill(product.nameAr)
	await selectOptionByLabel(page, 'Category', category.updatedName)
	await page.getByLabel('Brand').fill('HyperQuote Admin QA')
	await page.getByLabel('Manufacturer').fill('HyperQuote Factory')
	await setNumberField(page, 'Cost', 120)
	await page.getByLabel('Unit of measure', { exact: true }).fill('bag')
	await page.getByLabel('Unit of measure (Arabic)').fill('شيكارة')
	await setNumberField(page, 'Weight (kg)', 50)
	await setNumberField(page, 'Low below', 10)
	await setNumberField(page, 'Good from', 25)
	await page
		.getByLabel('Description', { exact: true })
		.fill('Flow admin product English description')
	await page.getByLabel('Description (Arabic)').fill('وصف منتج الإدارة')
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(product.name, {
		timeout: 15_000,
	})
	await page.getByRole('button', { name: /^Edit$/ }).click()
	await page.getByLabel('Name (English)').fill(product.updatedName)
	await page.getByLabel('Name (Arabic)').fill(product.updatedNameAr)
	await setNumberField(page, 'Cost', 260)
	await setNumberField(page, 'Low below', 12)
	await setNumberField(page, 'Good from', 30)
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(product.updatedName, {
		timeout: 15_000,
	})
	await closeAdminPanel(page)
	const productRow = await expectProduct(service, product.slug, {
		category: category.slug,
		goodStockThreshold: 30,
		imageUrls: [product.imageOne],
		isActive: true,
		lowStockThreshold: 12,
		name: product.updatedName,
		nameAr: product.updatedNameAr,
		priceMax: 260,
	})

	const appPage = await context.newPage()
	const appGuard = installBrowserErrorGuard(appPage)
	await appPage.goto(
		`${URLS.website}/market?q=${encodeURIComponent(product.updatedName)}`,
		{ waitUntil: 'domcontentloaded' },
	)
	await waitForHydration(appPage)
	await expect(appPage.locator('body')).toContainText(product.updatedName, {
		timeout: 15_000,
	})
	await appPage.goto(`${URLS.portal}/market`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(appPage)
	await expect(appPage).not.toHaveURL(/\/login/, { timeout: 15_000 })
	const portalMarketSearch = appPage
		.locator('input[type="search"]:visible')
		.first()
	await expect(portalMarketSearch).toBeVisible({ timeout: 15_000 })
	await portalMarketSearch.fill(product.updatedName)
	await expect(appPage.locator('body')).toContainText(product.updatedName, {
		timeout: 15_000,
	})
	await appGuard.expectClean('admin-created catalog customer visibility')
	await appPage.close()

	const quoteItemId = await createQuoteItemSnapshot(service, {
		productId: productRow.id,
		productName: product.updatedName,
		productNameAr: product.updatedNameAr,
		unit: 'bag',
		unitAr: 'شيكارة',
	})

	await openAdminVolume(page, 'Suppliers', 'Who we buy from')
	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Supplier name').fill(supplier.name)
	await page.getByLabel('Email').fill(supplier.email)
	await selectOptionByLabel(page, 'Tier', 'Preferred')
	await page.getByLabel('Rating').fill('4.3')
	await selectOptionByLabel(page, 'Status', 'Active')
	await page.getByLabel('Payment terms').fill('Net 30')
	await page.getByLabel('Phone', { exact: true }).fill(supplier.phone)
	await page.getByLabel('Notes').fill('Flow admin supplier create note')
	await page.getByLabel('Custom badges').fill('approved, flow-final')
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(supplier.name, {
		timeout: 15_000,
	})
	await page.getByRole('button', { name: /^Edit$/ }).click()
	await page.getByLabel('Phone', { exact: true }).fill(supplier.updatedPhone)
	await page.getByLabel('Notes').fill('Flow admin supplier updated note')
	await page.getByLabel('Rating').fill('4.8')
	await page.getByRole('button', { name: /^Save$/ }).click()
	await closeAdminPanel(page)
	await expectSupplier(service, supplier.email, {
		notes: 'Flow admin supplier updated note',
		phone: supplier.updatedPhone,
		rating: 4.8,
		status: 'active',
	})

	await openAdminVolume(page, 'Employees', 'payroll')
	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Name (English)').fill(employee.name)
	await page.getByLabel('Email').fill(employee.email)
	await page.getByLabel('Phone', { exact: true }).fill(employee.phone)
	await page.getByLabel('Password').fill(employee.password)
	await selectOptionByLabel(page, 'Status', 'Active')
	await page.getByRole('switch', { name: 'Sales' }).click()
	await page.getByRole('switch', { name: 'Inventory' }).click()
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(employee.name, {
		timeout: 15_000,
	})
	await page.getByRole('button', { name: /^Edit$/ }).click()
	await page.getByRole('switch', { name: 'Inventory' }).click()
	await page.getByRole('switch', { name: 'Customer service' }).click()
	await page.getByRole('button', { name: /^Save$/ }).click()
	await closeAdminPanel(page)
	await expectEmployee(service, employee.email, {
		roles: ['customer_service', 'sales'],
		status: 'active',
	})

	const employeeContext = await browser.newContext({
		viewport: { height: 900, width: 1280 },
	})
	await employeeContext.addCookies(
		await createAuthCookies(
			{ email: employee.email, password: employee.password },
			INTERNAL_COOKIE,
			URLS.internal,
			env,
		),
	)
	const employeePage = await employeeContext.newPage()
	const employeeGuard = installBrowserErrorGuard(employeePage)
	await employeePage.goto(URLS.internal, { waitUntil: 'domcontentloaded' })
	await waitForHydration(employeePage)
	await expect(
		employeePage.getByRole('button', { name: /^sales$/i }),
	).toBeVisible()
	await expect(
		employeePage.getByRole('button', { name: /customer service/i }),
	).toBeVisible()
	await expect(
		employeePage.getByRole('button', { name: /^admin$/i }),
	).not.toBeVisible()
	await employeeGuard.expectClean('admin-created employee role scope')
	await employeeContext.close()

	await openAdminVolume(page, 'Employees', 'payroll')
	await exportCurrentVolume(page, 'Final admin employee export proof')
	await expect(page.locator('body')).toContainText(/rows exported/i, {
		timeout: 15_000,
	})
	const employeeExport = await adminClient.rpc('admin_export_data', {
		p_reason: 'Final admin employee redaction proof',
		p_scope: 'employees',
	})
	expect(employeeExport.error).toBeNull()
	for (const row of exportRows(employeeExport.data)) {
		expect(row.email).toBeUndefined()
		expect(row.phone).toBeUndefined()
		expect(row.email_domain).toBeTruthy()
		expect(row.phone_present).not.toBeUndefined()
	}

	await expectAdminActionsSince(service, activityStartedAt, [
		'admin_record_created',
		'admin_record_updated',
		'admin_role_assigned',
		'admin_role_removed',
		'admin_database_exported',
		'internal_employee_role_assigned',
		'internal_employee_role_removed',
		'internal_employee_created',
		'admin_export_created',
	])

	await deleteOpenAdminRecord(page, 'Products', product.updatedName, [
		undefined,
		'bad',
	])
	await expectProduct(service, product.slug, {
		category: category.slug,
		goodStockThreshold: 30,
		imageUrls: [product.imageOne],
		isActive: true,
		lowStockThreshold: 12,
		name: product.updatedName,
		nameAr: product.updatedNameAr,
		priceMax: 260,
	})
	await submitOpenAdminDelete(page, [
		undefined,
		'Flow admin product deactivate',
	])
	await expectProduct(service, product.slug, {
		category: category.slug,
		goodStockThreshold: 30,
		imageUrls: [product.imageOne],
		isActive: false,
		lowStockThreshold: 12,
		name: product.updatedName,
		nameAr: product.updatedNameAr,
		priceMax: 260,
	})
	await expectQuoteItemSnapshot(service, quoteItemId, {
		productName: product.updatedName,
		productNameAr: product.updatedNameAr,
		unit: 'bag',
		unitAr: 'شيكارة',
	})

	await deleteOpenAdminRecord(page, 'Categories', category.updatedName, [
		undefined,
		'Flow admin category deactivate',
	])
	await expectCategory(service, category.slug, {
		description: category.updatedDescription,
		descriptionAr: category.updatedDescriptionAr,
		imageUrl: category.image,
		isActive: false,
		name: category.updatedName,
		nameAr: category.updatedNameAr,
	})
	await expectQuoteItemSnapshot(service, quoteItemId, {
		productName: product.updatedName,
		productNameAr: product.updatedNameAr,
		unit: 'bag',
		unitAr: 'شيكارة',
	})

	await deleteOpenAdminRecord(page, 'Suppliers', supplier.name, [
		undefined,
		'Flow admin supplier deactivate',
	])
	await expectSupplier(service, supplier.email, {
		notes: 'Flow admin supplier updated note',
		phone: supplier.updatedPhone,
		rating: 4.8,
		status: 'inactive',
	})
	await deleteOpenAdminRecord(page, 'Employees', employee.name, [
		undefined,
		'Flow admin employee disable',
	])
	await expectEmployee(service, employee.email, {
		roles: ['customer_service', 'sales'],
		status: 'disabled',
	})

	await expectAdminActionsSince(service, activityStartedAt, [
		'admin_record_created',
		'admin_record_updated',
		'admin_record_deactivated',
		'admin_role_assigned',
		'admin_role_removed',
		'admin_database_exported',
		'internal_employee_role_assigned',
		'internal_employee_role_removed',
		'internal_employee_created',
		'admin_export_created',
	])

	const deniedDirectProductUpdate = await adminClient
		.from('products')
		.update({ tags: ['direct-bypass'] })
		.eq('id', productRow.id)
	expect(deniedDirectProductUpdate.error?.code).toBe('42501')
	expect(deniedDirectProductUpdate.error?.message).toMatch(
		/registry_writes_must_use_audited_server_function|permission denied for table products/i,
	)

	await guard.expectClean('internal admin final registry')
	await context.close()
})

async function waitForHydration(page: Page) {
	await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {
		return undefined
	})
	await page.waitForTimeout(600)
}

async function openInternalAdmin(page: Page) {
	await page.goto(URLS.internal, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByRole('button', { name: /^Admin$/i }).click()
	await expect(page.locator('body')).toContainText('The Registry', {
		timeout: 20_000,
	})
}

async function openAdminVolume(
	page: Page,
	volumeName: string,
	expectedText: string,
) {
	await page
		.locator('nav')
		.getByRole('button')
		.filter({ hasText: volumeName })
		.first()
		.click()
	await expect(page.locator('body')).toContainText(expectedText, {
		timeout: 20_000,
	})
	const searchbox = page.getByRole('searchbox', { name: /Filter entries/i })
	if (await searchbox.isVisible().catch(() => false)) {
		await searchbox.fill('')
	}
}

async function closeAdminPanel(page: Page) {
	const panel = page.locator('.slide-panel-shell')
	if (await panel.isVisible().catch(() => false)) {
		await page
			.locator('.slide-panel-backdrop')
			.click({ position: { x: 12, y: 12 } })
		await expect(panel).toBeHidden({ timeout: 10_000 })
		await expect(page.locator('body')).toContainText('The Registry', {
			timeout: 10_000,
		})
	}
}

async function exportCurrentVolume(page: Page, reason: string) {
	await withDialogResponses(page, [reason], async () => {
		await page
			.locator('button:visible')
			.filter({ hasText: 'Export' })
			.first()
			.click()
	})
}

async function deleteOpenAdminRecord(
	page: Page,
	volumeName: string,
	rowText: string,
	dialogResponses: Array<string | undefined>,
) {
	await closeAdminPanel(page)
	await openAdminVolume(page, volumeName, volumeName)
	await page.getByRole('searchbox', { name: /Filter entries/i }).fill(rowText)
	const rowButton = page.getByRole('button').filter({ hasText: rowText })
	await expect(rowButton.first()).toBeVisible({ timeout: 15_000 })
	await rowButton.first().click()
	await submitOpenAdminDelete(page, dialogResponses)
}

async function submitOpenAdminDelete(
	page: Page,
	dialogResponses: Array<string | undefined>,
) {
	await withDialogResponses(page, dialogResponses, async () => {
		await page.getByRole('button', { name: /^Delete$/ }).click()
	})
	const panel = page.locator('.slide-panel-shell')
	if (
		dialogResponses.some((response) => response && response.trim().length >= 8)
	) {
		await expect(panel).toBeHidden({ timeout: 15_000 })
	} else {
		await expect(panel).toBeVisible({ timeout: 5_000 })
	}
}

async function withDialogResponses(
	page: Page,
	responses: Array<string | undefined>,
	action: () => Promise<void>,
) {
	let index = 0
	const handler = async (dialog: Dialog) => {
		const response = responses[index]
		index += 1
		await dialog.accept(response)
	}
	page.on('dialog', handler)
	try {
		await action()
	} finally {
		page.off('dialog', handler)
	}
}

async function selectOptionByLabel(page: Page, label: string, option: string) {
	await page.getByLabel(label, { exact: true }).click()
	const exactOption = page.getByRole('option', { name: option, exact: true })
	if ((await exactOption.count()) > 0) {
		await exactOption.first().click()
		return
	}
	await page.getByRole('option').filter({ hasText: option }).first().click()
}

async function setNumberField(page: Page, label: string, value: number) {
	const field = page.getByLabel(label, { exact: true })
	await field.fill(String(value))
	await field.press('Tab')
}

async function expectCategory(
	service: ReturnType<typeof createLocalServiceClient>,
	slug: string,
	expected: {
		description: string
		descriptionAr: string
		imageUrl: string
		isActive: boolean
		name: string
		nameAr: string
	},
) {
	const { data, error } = await service
		.from('categories')
		.select(
			'id, name, name_ar, slug, description, description_ar, image_url, is_active',
		)
		.eq('slug', slug)
		.single()
	expect(error).toBeNull()
	expect(data).toMatchObject({
		description: expected.description,
		description_ar: expected.descriptionAr,
		image_url: expected.imageUrl,
		is_active: expected.isActive,
		name: expected.name,
		name_ar: expected.nameAr,
		slug,
	})
	return data
}

async function expectProduct(
	service: ReturnType<typeof createLocalServiceClient>,
	slug: string,
	expected: {
		category: string
		goodStockThreshold: number
		imageUrls: string[]
		isActive: boolean
		lowStockThreshold: number
		name: string
		nameAr: string
		priceMax: number
	},
) {
	const { data, error } = await service
		.from('products')
		.select(
			'id, name, name_ar, slug, category, image_urls, price_range_max, availability_status, is_active',
		)
		.eq('slug', slug)
		.single()
	expect(error).toBeNull()
	expect(data).toMatchObject({
		category: expected.category,
		image_urls: expected.imageUrls,
		is_active: expected.isActive,
		name: expected.name,
		name_ar: expected.nameAr,
		slug,
	})
	expect(Number(data?.price_range_max)).toBe(expected.priceMax)
	expect(data?.availability_status).toBe(
		expected.isActive ? 'available' : 'hidden',
	)
	const { data: stockData, error: stockError } = await service
		.from('inventory_stock')
		.select('minimum_quantity, good_quantity')
		.eq('product_id', data?.id)
		.single()
	expect(stockError).toBeNull()
	expect(Number(stockData?.minimum_quantity)).toBe(expected.lowStockThreshold)
	expect(Number(stockData?.good_quantity)).toBe(expected.goodStockThreshold)
	return data
}

async function expectSupplier(
	service: ReturnType<typeof createLocalServiceClient>,
	email: string,
	expected: { notes: string; phone: string; rating: number; status: string },
) {
	const { data, error } = await service
		.from('suppliers')
		.select('id, email, notes, phone, rating, status')
		.eq('email', email)
		.single()
	expect(error).toBeNull()
	expect(data).toMatchObject({
		email,
		notes: expected.notes,
		phone: expected.phone,
		status: expected.status,
	})
	expect(Number(data?.rating)).toBeCloseTo(expected.rating, 1)
	return data
}

async function expectEmployee(
	service: ReturnType<typeof createLocalServiceClient>,
	email: string,
	expected: { roles: string[]; status: string },
) {
	const { data, error } = await service
		.from('employees')
		.select('id, email, status, employee_roles(role)')
		.eq('email', email)
		.single()
	expect(error).toBeNull()
	expect(data?.status).toBe(expected.status)
	const roles = relationRows<{ role: string }>(data?.employee_roles)
		.map((row) => row.role)
		.sort()
	expect(roles).toEqual([...expected.roles].sort())
	return data
}

async function createQuoteItemSnapshot(
	service: ReturnType<typeof createLocalServiceClient>,
	input: {
		productId: string
		productName: string
		productNameAr: string
		unit: string
		unitAr: string
	},
) {
	const phone = `+206${String(Date.now()).slice(-9)}`
	const { data: customer, error: customerError } = await service
		.from('customers')
		.insert({
			company_name: `Flow Admin Snapshot ${Date.now()}`,
			contact_name: 'Snapshot Buyer',
			phone,
			status: 'active',
		})
		.select('id')
		.single()
	expect(customerError).toBeNull()
	const { data: quote, error: quoteError } = await service
		.from('quote_requests')
		.insert({ customer_id: customer?.id, status: 'draft' })
		.select('id')
		.single()
	expect(quoteError).toBeNull()
	const { data: item, error: itemError } = await service
		.from('quote_request_items')
		.insert({
			currency: 'EGP',
			customer_description: input.productName,
			price_range_max: 260,
			price_range_min: 120,
			product_id: input.productId,
			product_name_ar: input.productNameAr,
			quantity: 2,
			quote_request_id: quote?.id,
			unit_of_measure: input.unit,
			unit_of_measure_ar: input.unitAr,
		})
		.select('id')
		.single()
	expect(itemError).toBeNull()
	return String(item?.id)
}

async function expectQuoteItemSnapshot(
	service: ReturnType<typeof createLocalServiceClient>,
	itemId: string,
	expected: {
		productName: string
		productNameAr: string
		unit: string
		unitAr: string
	},
) {
	const { data, error } = await service
		.from('quote_request_items')
		.select(
			'customer_description, product_name_ar, unit_of_measure, unit_of_measure_ar',
		)
		.eq('id', itemId)
		.single()
	expect(error).toBeNull()
	expect(data).toMatchObject({
		customer_description: expected.productName,
		product_name_ar: expected.productNameAr,
		unit_of_measure: expected.unit,
		unit_of_measure_ar: expected.unitAr,
	})
}

async function expectAdminActionsSince(
	service: ReturnType<typeof createLocalServiceClient>,
	sinceIso: string,
	expectedActions: string[],
) {
	const expected = [...expectedActions].sort().join('|')
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('activity_events')
					.select('action')
					.gte('created_at', sinceIso)
					.in('action', expectedActions)
				if (error) return `error:${error.message}`
				return [...new Set((data ?? []).map((event) => String(event.action)))]
					.sort()
					.join('|')
			},
			{ timeout: 15_000 },
		)
		.toBe(expected)
}

function exportRows(payload: unknown): Array<Record<string, unknown>> {
	if (!payload || typeof payload !== 'object' || !('rows' in payload)) {
		throw new Error('Export payload did not include rows')
	}
	const rows = (payload as { rows: unknown }).rows
	if (!Array.isArray(rows))
		throw new Error('Export rows payload was not an array')
	return rows.map((row) => {
		if (!row || typeof row !== 'object' || Array.isArray(row)) {
			throw new Error('Export row was not an object')
		}
		return row as Record<string, unknown>
	})
}

function relationRows<T>(value: T[] | T | null | undefined): T[] {
	if (!value) return []
	return Array.isArray(value) ? value : [value]
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

async function createAuthenticatedClient(
	env: LocalSupabaseEnv,
	account: { email: string; password: string },
) {
	const client = createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const { error } = await client.auth.signInWithPassword(account)
	if (error)
		throw new Error(`Could not sign in ${account.email}: ${error.message}`)
	return client
}

async function createAuthCookies(
	account: { email: string; password: string },
	cookieName: string,
	url: string,
	env: LocalSupabaseEnv,
) {
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
