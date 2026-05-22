import { spawnSync } from 'node:child_process'
import { type Dialog, expect, type Page, test } from '@playwright/test'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

interface SupabaseCookieToSet {
	name: string
	options?: { maxAge?: number }
	value: string
}

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')

const URLS = {
	driver: process.env.FLOW_DRIVER_URL ?? 'http://localhost:3003',
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
	portal: process.env.FLOW_PORTAL_URL ?? 'http://localhost:3001',
	website: process.env.FLOW_WEBSITE_URL ?? 'http://localhost:3000',
}

const ACCOUNTS = {
	customer: {
		email: 'local-customer@hyperquote.local',
		password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
	},
	driver: {
		email: 'local-driver@hyperquote.local',
		password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
	},
	internal: {
		email: 'local-admin@hyperquote.local',
		password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
	},
}

const COOKIE_NAMES = {
	customer: 'hyperquote_customer_auth',
	driver: 'hyperquote_driver_auth',
	internal: 'hyperquote_internal_auth',
}

test.describe.configure({ mode: 'serial' })

test('website public market and support ticket flow render without browser errors', async ({
	page,
}) => {
	const guard = installBrowserErrorGuard(page)

	await page.goto(URLS.website, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page.locator('body')).toContainText('HyperQuote')

	await page.goto(`${URLS.website}/market`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page.locator('body')).toContainText(/Market|Cart|Quote/i)

	await page.goto(`${URLS.website}/support`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByLabel('Name').fill('Flow Browser Smoke')
	await page
		.getByLabel('Email')
		.fill(`flow-browser-${Date.now()}@hyperquote.local`)
	await page
		.getByLabel('Message')
		.fill('Browser smoke confirms website support ticket submission.')
	await page.getByRole('button', { name: /^Send$/ }).click()
	await expect(page.locator('body')).toContainText(/Sent|HQS-/i, {
		timeout: 15_000,
	})

	await guard.expectClean('website')
})

test('portal rejects unauthenticated protected routes and fake OTP cannot sign in', async ({
	page,
}) => {
	const guard = installBrowserErrorGuard(page)

	await page.goto(`${URLS.portal}/market`, { waitUntil: 'domcontentloaded' })
	await expect(page).toHaveURL(/\/login/)

	await page.goto(`${URLS.portal}/login`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.locator('#atelier-phone').fill('1000000000', { timeout: 15_000 })
	await page.getByRole('button', { name: /whatsapp/i }).click()

	const sendFailed = page.getByRole('alert').filter({
		hasText: /could not|failed|wrong|try/i,
	})
	const firstOtpDigit = page.getByLabel('Verification digit 1')
	await expect(sendFailed.or(firstOtpDigit)).toBeVisible({ timeout: 15_000 })
	if (await firstOtpDigit.isVisible()) {
		await firstOtpDigit.click()
		await page.keyboard.type('000000')
		await expect(
			page
				.getByRole('alert')
				.filter({ hasText: /wrong|invalid|incorrect|try/i }),
		).toBeVisible({ timeout: 15_000 })
		await expect(page).toHaveURL(/\/login/)
	} else {
		await expect(sendFailed).toBeVisible()
	}

	await guard.expectClean('portal')
})

test('portal customer market and orders load Supabase-backed data', async ({
	browser,
}) => {
	test.setTimeout(90_000)
	const service = createLocalServiceClient()
	const flowStartedAt = new Date().toISOString()
	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	await context.addCookies([
		...(await createAuthCookies(
			ACCOUNTS.customer,
			COOKIE_NAMES.customer,
			URLS.portal,
		)),
		...(await createAuthCookies(
			ACCOUNTS.customer,
			COOKIE_NAMES.customer,
			URLS.website,
		)),
	])

	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)

	await page.goto(`${URLS.portal}/market`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page).not.toHaveURL(/\/login/)
	await expect(page.locator('body')).toContainText(/products|Portland Cement/i)
	await expect(page.locator('body')).not.toContainText(/No products yet/i)
	await page
		.getByRole('button', { name: /^Record$/i })
		.first()
		.click()
	await page
		.getByRole('button', { name: /^Record$/i })
		.last()
		.click()
	await page.getByRole('button', { name: /^Draft Quote$/i }).click()
	await confirmDraftSave(page)

	await page.goto(`${URLS.portal}/orders`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page.locator('body')).toContainText(
		/QR-2026|Submitted|Confirmed/i,
	)
	await expect(page.locator('body')).not.toContainText(/Failed to load orders/i)
	const viewOrderButton = page
		.getByRole('button', { name: /^(View|عرض)$/i })
		.first()
	if (!(await viewOrderButton.isVisible().catch(() => false))) {
		await page
			.getByRole('button', {
				name: /Submitted|Confirmed|مقدمة|مؤكدة/i,
			})
			.last()
			.click()
	}
	await expect(viewOrderButton).toBeVisible({ timeout: 15_000 })
	await viewOrderButton.click()
	await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+$/)
	await expect(page.getByText(/Reference|المرجع/i).first()).toBeVisible({
		timeout: 15_000,
	})
	await expect(page.locator('body')).not.toContainText(/Failed to load order/i)
	await page
		.getByRole('button', { name: /Save as Draft|حفظ كمسودة/i })
		.first()
		.click()
	await expect(page.locator('body')).toContainText(
		/Saved draft|تم حفظ المسودة/i,
	)
	await page
		.getByRole('button', { name: /Back to Orders|العودة إلى الطلبات/i })
		.click()
	await expect(page).toHaveURL(/\/orders/)

	await page.goto(`${URLS.website}/market`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page
		.getByRole('button', { name: /Add to Quote/i })
		.first()
		.click()
	await page
		.locator('button')
		.filter({ hasText: /^Add to Quote$/i })
		.click()
	await page.getByRole('button', { name: /Quote Cart/i }).click()
	const websiteDraftName = `Smoke website draft ${Date.now()}`
	const websiteFlowNote = `Smoke website submit clone ${Date.now()}`
	await page.getByRole('button', { name: /^Notes$/i }).click()
	await page
		.getByPlaceholder(/Delivery timing, site access/i)
		.fill(websiteFlowNote)
	await confirmDraftSave(page, websiteDraftName)
	await page.getByRole('button', { name: /Request Quote/i }).click()
	await page.getByRole('button', { name: /^Send request$/i }).click()
	await expect(page.locator('body')).toContainText(
		/Quote request submitted|QR-2026/i,
		{ timeout: 15_000 },
	)
	await expectCustomerDraftArtifactsSince(
		service,
		flowStartedAt,
		websiteDraftName,
		websiteFlowNote,
	)

	await guard.expectClean('portal customer data')
	await context.close()
})

test('internal employee login reaches the protected app shell', async ({
	page,
}) => {
	const guard = installBrowserErrorGuard(page)

	await page.goto(`${URLS.internal}/`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page).toHaveURL(/\/login/)
	await page.locator('#internal-login-email').fill(ACCOUNTS.internal.email)
	await page
		.locator('#internal-login-password')
		.fill(ACCOUNTS.internal.password)
	await page.getByRole('button', { name: /Enter internal ops/i }).click()
	await page.waitForURL((url) => !url.pathname.startsWith('/login'), {
		timeout: 15_000,
	})
	await expect(page.locator('body')).toContainText(/Sales|Operations|Search/i)

	await guard.expectClean('internal')
})

test('internal admin registry creates dynamic customer and driver login', async ({
	browser,
}) => {
	test.setTimeout(90_000)
	const stamp = Date.now()
	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	await context.addCookies(
		await createAuthCookies(
			ACCOUNTS.internal,
			COOKIE_NAMES.internal,
			URLS.internal,
		),
	)

	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)
	const company = `Admin Dynamic Customer ${stamp}`
	const driverName = `Admin Driver ${stamp}`
	const driverEmail = `admin-driver-${stamp}@hyperquote.local`
	const driverPassword = `Driver-${stamp}`
	const customerPhone = `+201${String(stamp).slice(-9)}`
	const driverPhone = `+202${String(stamp).slice(-9)}`
	const plate = `HQ-${String(stamp).slice(-6)}`

	await page.goto(URLS.internal, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByRole('button', { name: /^Admin$/i }).click()
	await expect(page.locator('body')).toContainText('The Registry', {
		timeout: 15_000,
	})

	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Company name').fill(company)
	await page.getByLabel('Contact').fill('Dynamic Buyer')
	await page.getByLabel('Phone', { exact: true }).fill(customerPhone)
	await page.getByLabel('Email').fill(`customer-${stamp}@hyperquote.local`)
	await page.getByLabel('Street').fill('Dynamic Street 1')
	await page.getByLabel('City').fill('Dynamic City')
	await page.getByLabel('Governorate').fill('Dynamic Governorate')
	await page.getByLabel('Credit limit').fill('250000')
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(company, {
		timeout: 15_000,
	})
	await page.getByLabel('Close panel').click()
	await expect(page.getByLabel('Close panel')).toBeHidden({ timeout: 10_000 })

	await page
		.locator('nav')
		.getByRole('button', { name: /Drivers/i })
		.click()
	await expect(page.locator('body')).toContainText('Driver people', {
		timeout: 15_000,
	})
	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Driver name').fill(driverName)
	await page.getByLabel('Driver email').fill(driverEmail)
	await page.getByLabel('Driver phone').fill(driverPhone)
	await page.getByLabel('Driver password').fill(driverPassword)
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(driverName, {
		timeout: 15_000,
	})
	await page.getByLabel('Close panel').click()
	await expect(page.getByLabel('Close panel')).toBeHidden({ timeout: 10_000 })

	await page
		.locator('nav')
		.getByRole('button', { name: /Trucks/i })
		.click()
	await expect(page.locator('body')).toContainText('Fleet assets', {
		timeout: 15_000,
	})
	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Plate number').fill(plate)
	await page.getByLabel('Capacity (tons)').fill('12')
	await selectOptionByLabel(page, 'Assigned driver', driverName)
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(plate, {
		timeout: 15_000,
	})

	const driverPage = await context.newPage()
	const driverGuard = installBrowserErrorGuard(driverPage)
	await driverPage.goto(URLS.driver, { waitUntil: 'domcontentloaded' })
	await waitForHydration(driverPage)
	await driverPage.getByLabel(/email/i).fill(driverEmail)
	await driverPage.getByLabel(/password/i).fill(driverPassword)
	await driverPage.getByRole('button', { name: /sign in|enter|start/i }).click()
	await expect(driverPage.locator('body')).toContainText(
		/No active delivery|Fleet|Details|Route/i,
		{ timeout: 15_000 },
	)

	await guard.expectClean('internal admin dynamic registry')
	await driverGuard.expectClean('admin-created driver login')
	await context.close()
})

test('internal admin registry controls every dynamic entity and persists every field', async ({
	browser,
}) => {
	test.setTimeout(240_000)
	const stamp = Date.now()
	const service = createLocalServiceClient()
	const context = await browser.newContext({
		viewport: { height: 1100, width: 1440 },
	})
	await context.addCookies([
		...(await createAuthCookies(
			ACCOUNTS.internal,
			COOKIE_NAMES.internal,
			URLS.internal,
		)),
		...(await createAuthCookies(
			ACCOUNTS.customer,
			COOKIE_NAMES.customer,
			URLS.portal,
		)),
	])

	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)

	const parentCategory = {
		name: `Admin Stress Parent ${stamp}`,
		nameAr: `تصنيف ${stamp}`,
		slug: `admin-stress-parent-${stamp}`,
	}
	const childCategory = {
		name: `Admin Stress Child ${stamp}`,
		nameAr: `فرعي ${stamp}`,
		slug: `admin-stress-child-${stamp}`,
	}
	const product = {
		name: `Admin Stress Product ${stamp}`,
		nameAr: `منتج ${stamp}`,
		slug: `admin-stress-product-${stamp}`,
		sku: `ASP-${stamp}`,
		imageOne: 'https://websiteassets.hyperquote.net/Images/cement.webp',
		imageTwo: 'https://websiteassets.hyperquote.net/Images/steel.webp',
	}
	const supplier = {
		name: `Admin Stress Supplier ${stamp}`,
		email: `supplier-${stamp}@hyperquote.local`,
		phone: `+203${String(stamp).slice(-9)}`,
	}
	const customer = {
		company: `Admin Stress Customer ${stamp}`,
		email: `admin-stress-customer-${stamp}@hyperquote.local`,
		phone: `+201${String(stamp).slice(-9)}`,
	}
	const employee = {
		name: `Admin Stress Employee ${stamp}`,
		email: `employee-${stamp}@hyperquote.local`,
		password: `Employee-${stamp}`,
		phone: `+204${String(stamp).slice(-9)}`,
	}
	const driver = {
		name: `Admin Stress Driver ${stamp}`,
		email: `driver-${stamp}@hyperquote.local`,
		password: `Driver-${stamp}`,
		phone: `+205${String(stamp).slice(-9)}`,
	}
	const truck = { plate: `AS-${String(stamp).slice(-6)}` }

	const { data: employeeRows, error: creatorError } = await service
		.from('employees')
		.select('id, full_name, employee_roles(role)')
		.eq('status', 'active')
	expect(creatorError).toBeNull()
	const activeEmployees = (employeeRows ?? []) as unknown as Array<{
		employee_roles: Array<{ role: string }> | null
		full_name: string
		id: string
	}>
	const creator = activeEmployees[0]
	const salesRep = activeEmployees.find((employeeRow) =>
		(employeeRow.employee_roles ?? []).some((roleRow) =>
			['admin', 'sales'].includes(roleRow.role),
		),
	)
	if (!creator?.full_name || !salesRep?.full_name) {
		throw new Error(
			'Admin flow requires active creator and sales/admin employee',
		)
	}

	await openInternalAdmin(page)

	await openAdminVolume(page, 'Categories', 'Catalog families')
	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Picture URL').fill(product.imageOne)
	await page.getByLabel('Name (English)').fill(parentCategory.name)
	await page.getByLabel('Name (Arabic)').fill(parentCategory.nameAr)
	await page
		.getByLabel('Description', { exact: true })
		.fill('Admin stress parent category')
	await page.getByLabel('Description (Arabic)').fill('تصنيف اختبار الإدارة')
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(parentCategory.name, {
		timeout: 15_000,
	})
	await closeAdminPanel(page)

	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Picture URL').fill(product.imageTwo)
	await page.getByLabel('Name (English)').fill(childCategory.name)
	await page.getByLabel('Name (Arabic)').fill(childCategory.nameAr)
	await page
		.getByLabel('Description', { exact: true })
		.fill('Admin stress child category')
	await page.getByLabel('Description (Arabic)').fill('فئة اختبار الإدارة')
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(childCategory.name, {
		timeout: 15_000,
	})
	await closeAdminPanel(page)

	const { data: parentCategoryRow } = await service
		.from('categories')
		.select(
			'id, slug, is_active, image_url, name_ar, description, description_ar, parent_id',
		)
		.eq('name', parentCategory.name)
		.single()
	const { data: childCategoryRow } = await service
		.from('categories')
		.select(
			'id, slug, parent_id, name_ar, description, description_ar, image_url, is_active',
		)
		.eq('name', childCategory.name)
		.single()
	expect(parentCategoryRow?.slug).toBe(parentCategory.slug)
	expect(parentCategoryRow?.is_active).toBe(true)
	expect(parentCategoryRow?.parent_id).toBeNull()
	expect(parentCategoryRow?.image_url).toBe(product.imageOne)
	expect(parentCategoryRow?.description_ar).toBe('تصنيف اختبار الإدارة')
	expect(childCategoryRow?.slug).toBe(childCategory.slug)
	expect(childCategoryRow?.parent_id).toBeNull()
	expect(childCategoryRow?.name_ar).toBe(childCategory.nameAr)
	expect(childCategoryRow?.description).toBe('Admin stress child category')
	expect(childCategoryRow?.description_ar).toBe('فئة اختبار الإدارة')
	expect(childCategoryRow?.image_url).toBe(product.imageTwo)

	await openAdminVolume(page, 'Products', 'Every SKU')
	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Picture URL').fill(product.imageOne)
	await page.getByLabel('Name (English)').fill(product.name)
	await page.getByLabel('Name (Arabic)').fill(product.nameAr)
	await selectOptionByLabel(page, 'Category', childCategory.name)
	await page.getByLabel('Brand').fill('HyperQuote QA')
	await page.getByLabel('Manufacturer').fill('HyperQuote Factory')
	await page.getByLabel('Cost').fill('111')
	await page.getByLabel('Unit of measure', { exact: true }).fill('bag')
	await page.getByLabel('Unit of measure (Arabic)').fill('شيكارة')
	await page.getByLabel('Weight (kg)').fill('42')
	await page.getByLabel('Low below').fill('10')
	await page.getByLabel('Good from').fill('20')
	await page
		.getByLabel('Description', { exact: true })
		.fill('Admin stress English description')
	await page.getByLabel('Description (Arabic)').fill('وصف اختبار الإدارة')
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(product.name, {
		timeout: 15_000,
	})
	await closeAdminPanel(page)

	const { data: productRow } = await service
		.from('products')
		.select(
			'id, slug, sku, category, brand, manufacturer, subcategory, subcategory_ar, specifications, specifications_ar, unit_of_measure, unit_of_measure_ar, image_urls, price_range_min, price_range_max, price_tier, availability_status, weight_kg, description, description_ar, tags, is_stockable, is_active',
		)
		.eq('name', product.name)
		.single()
	expect(productRow?.category).toBe(childCategory.slug)
	expect(productRow?.slug).toBe(
		`${childCategory.slug}-${slugPart(product.name)}`,
	)
	expect(productRow?.sku).toBe(
		`${skuPart(childCategory.slug)}-${skuPart(product.name)}`,
	)
	expect(productRow?.brand).toBe('HyperQuote QA')
	expect(productRow?.manufacturer).toBe('HyperQuote Factory')
	expect(productRow?.image_urls).toEqual([product.imageOne])
	expect(productRow?.subcategory).toBeNull()
	expect(productRow?.subcategory_ar).toBe('عام')
	expect(productRow?.specifications).toEqual({})
	expect(productRow?.specifications_ar).toEqual({})
	expect(productRow?.unit_of_measure).toBe('bag')
	expect(productRow?.unit_of_measure_ar).toBe('شيكارة')
	expect(Number(productRow?.weight_kg)).toBe(42)
	expect(Number(productRow?.price_range_min)).toBe(111)
	expect(Number(productRow?.price_range_max)).toBe(111)
	expect(productRow?.price_tier).toBe('budget')
	expect(productRow?.availability_status).toBe('available')
	expect(productRow?.description).toBe('Admin stress English description')
	expect(productRow?.description_ar).toBe('وصف اختبار الإدارة')
	expect(productRow?.tags).toEqual([])
	expect(productRow?.is_stockable).toBe(true)
	expect(productRow?.is_active).toBe(true)
	const { data: productStockRow } = await service
		.from('inventory_stock')
		.select('minimum_quantity, good_quantity')
		.eq('product_id', productRow?.id)
		.single()
	expect(Number(productStockRow?.minimum_quantity)).toBe(10)
	expect(Number(productStockRow?.good_quantity)).toBe(20)

	await openAdminVolume(page, 'Suppliers', 'Who we buy from')
	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Supplier name').fill(supplier.name)
	await page.getByLabel('Email').fill(supplier.email)
	await selectOptionByLabel(page, 'Tier', 'Preferred')
	await page.getByLabel('Rating').fill('4.7')
	await selectOptionByLabel(page, 'Status', 'Active')
	await page.getByLabel('Payment terms').fill('Net 45')
	await page.getByLabel('Phone', { exact: true }).fill(supplier.phone)
	await page.getByLabel('Notes').fill('Admin stress supplier notes')
	await page.getByLabel('Custom badges').fill('cement, audited')
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(supplier.name, {
		timeout: 15_000,
	})
	await page.getByRole('button', { name: /^Edit$/ }).click()
	await page.getByRole('button', { name: /^Add specialty$/ }).click()
	await selectOptionByLabel(page, 'Category', childCategory.name)
	await selectOptionByLabel(page, 'Product', product.name)
	await page
		.getByRole('button', { name: /^Add specialty$/ })
		.last()
		.click()
	await expect(page.locator('body')).toContainText(product.name, {
		timeout: 15_000,
	})
	await closeAdminPanel(page)

	const { data: supplierRow } = await service
		.from('suppliers')
		.select('id, email, status, notes, tier, custom_badges')
		.eq('email', supplier.email)
		.single()
	expect(supplierRow?.status).toBe('active')
	expect(supplierRow?.notes).toBe('Admin stress supplier notes')
	expect(supplierRow?.custom_badges).toEqual(['cement', 'audited'])
	const { data: supplierSpecialtyRow } = await service
		.from('supplier_specialties')
		.select('id, supplier_id, category_slug, product_slug')
		.eq('supplier_id', supplierRow?.id)
		.eq('category_slug', childCategory.slug)
		.eq('product_slug', productRow?.slug)
		.single()
	expect(supplierSpecialtyRow?.supplier_id).toBe(supplierRow?.id)
	expect(supplierSpecialtyRow?.category_slug).toBe(childCategory.slug)
	expect(supplierSpecialtyRow?.product_slug).toBe(productRow?.slug)

	await openAdminVolume(page, 'Customers', 'Companies')
	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Company name').fill(customer.company)
	await selectOptionByLabel(page, 'Tier', 'A')
	await selectOptionByLabel(page, 'Status', 'Active')
	await page
		.getByLabel('Profile photo URL')
		.fill(`https://example.com/${stamp}.jpg`)
	await selectOptionByLabel(page, 'Trade license', 'Approved')
	await selectOptionByLabel(page, 'Created by employee', creator.full_name)
	await page.getByLabel('Contact').fill('Admin Stress Buyer')
	await page.getByLabel('Phone', { exact: true }).fill(customer.phone)
	await page.getByLabel('Email').fill(customer.email)
	await page.getByLabel('Address label').fill('HQ')
	await page.getByLabel('Address phone').fill(customer.phone)
	await page.getByLabel('Street').fill('Street 9')
	await page.getByLabel('Area').fill('QA District')
	await page.getByLabel('City').fill('Cairo')
	await page.getByLabel('Governorate').fill('Cairo')
	await page.getByLabel('Postal code').fill('11865')
	await page.getByLabel('Latitude').fill('30.0444')
	await page.getByLabel('Longitude').fill('31.2357')
	await page.getByLabel('Landmark').fill('Beside the admin test yard')
	await page.getByLabel('Credit limit').fill('333000')
	await selectOptionByLabel(page, 'Payment history', 'Excellent')
	await selectOptionByLabel(page, 'Assigned sales rep', salesRep.full_name)
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(customer.company, {
		timeout: 15_000,
	})
	await closeAdminPanel(page)

	const { data: customerRow } = await service
		.from('customers')
		.select(
			'id, status, trade_license_status, profile_photo_url, created_by_employee_id, assigned_sales_rep_id, credit_limit',
		)
		.eq('email', customer.email)
		.single()
	expect(customerRow?.status).toBe('active')
	expect(customerRow?.trade_license_status).toBe('approved')
	expect(customerRow?.created_by_employee_id).toBe(creator.id)
	expect(customerRow?.assigned_sales_rep_id).toBe(salesRep.id)
	expect(Number(customerRow?.credit_limit)).toBe(333000)
	const { data: customerAddressRow } = await service
		.from('customer_addresses')
		.select(
			'label, street, area, city, governorate, landmark, phone, postal_code, latitude, longitude, is_default',
		)
		.eq('customer_id', customerRow?.id)
		.single()
	expect(customerAddressRow?.label).toBe('HQ')
	expect(customerAddressRow?.street).toBe('Street 9')
	expect(Number(customerAddressRow?.latitude)).toBeCloseTo(30.0444, 4)
	expect(Number(customerAddressRow?.longitude)).toBeCloseTo(31.2357, 4)
	expect(customerAddressRow?.is_default).toBe(true)

	await openAdminVolume(page, 'Employees', 'payroll')
	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Name (English)').fill(employee.name)
	await page.getByLabel('Email').fill(employee.email)
	await page.getByLabel('Phone', { exact: true }).fill(employee.phone)
	await page.getByLabel('Password').fill(employee.password)
	await selectOptionByLabel(page, 'Status', 'Active')
	await page.getByRole('switch', { name: 'Sales' }).click()
	await page.getByRole('switch', { name: 'Driver manager' }).click()
	await page.getByRole('switch', { name: 'CEO search access' }).click()
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(employee.name, {
		timeout: 15_000,
	})
	await closeAdminPanel(page)

	const { data: employeeRow } = await service
		.from('employees')
		.select('id, email, status, is_ceo')
		.eq('email', employee.email)
		.single()
	expect(employeeRow?.status).toBe('active')
	expect(employeeRow?.is_ceo).toBe(true)
	const { data: employeeRoles } = await service
		.from('employee_roles')
		.select('role')
		.eq('employee_id', employeeRow?.id)
	expect((employeeRoles ?? []).map((role) => role.role)).toEqual(
		expect.arrayContaining(['sales', 'driver_manager']),
	)

	await openAdminVolume(page, 'Drivers', 'Driver people')
	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Driver name').fill(driver.name)
	await page.getByLabel('Driver email').fill(driver.email)
	await page.getByLabel('Driver phone').fill(driver.phone)
	await page.getByLabel('Driver password').fill(driver.password)
	await selectOptionByLabel(page, 'Status', 'Available')
	await page.getByLabel('Vehicle label').fill('Stress driver primary vehicle')
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(driver.name, {
		timeout: 15_000,
	})
	await closeAdminPanel(page)

	const { data: driverRow } = await service
		.from('drivers')
		.select('id, user_id, email, status, vehicle_label')
		.eq('email', driver.email)
		.single()
	expect(driverRow?.status).toBe('available')
	expect(driverRow?.vehicle_label).toBe('Stress driver primary vehicle')
	expect(driverRow?.user_id).toBeTruthy()

	await openAdminVolume(page, 'Trucks', 'Fleet assets')
	await page.getByRole('button', { name: /^New entry$/ }).click()
	await page.getByLabel('Plate number').fill(truck.plate)
	await selectOptionByLabel(page, 'Body type', 'Box')
	await page.getByLabel('Capacity (tons)').fill('18.5')
	await selectOptionByLabel(page, 'Assigned driver', driver.name)
	await selectOptionByLabel(page, 'Status', 'Available')
	await page.getByRole('button', { name: /^Save$/ }).click()
	await expect(page.locator('body')).toContainText(truck.plate, {
		timeout: 15_000,
	})
	await closeAdminPanel(page)

	const { data: truckRow } = await service
		.from('trucks')
		.select('id, plate_number, driver_id, capacity_tons, body_type, status')
		.eq('plate_number', truck.plate)
		.single()
	expect(truckRow?.driver_id).toBe(driverRow?.id)
	expect(Number(truckRow?.capacity_tons)).toBeCloseTo(18.5, 1)
	expect(truckRow?.body_type).toBe('box')

	const appPage = await context.newPage()
	const appGuard = installBrowserErrorGuard(appPage)
	await expectWebsiteMarketProduct(appPage, product.name)
	await expectPortalMarketProduct(appPage, product.name)
	await appGuard.expectClean('admin-created product app visibility')
	await appPage.close()

	const driverPage = await context.newPage()
	const driverGuard = installBrowserErrorGuard(driverPage)
	await driverPage.goto(URLS.driver, { waitUntil: 'domcontentloaded' })
	await waitForHydration(driverPage)
	await driverPage.getByLabel(/email/i).fill(driver.email)
	await driverPage.getByLabel(/password/i).fill(driver.password)
	await driverPage.getByRole('button', { name: /sign in|enter|start/i }).click()
	await expect(driverPage.locator('body')).toContainText(
		/No active delivery|Fleet|Details|Route/i,
		{ timeout: 15_000 },
	)
	await driverGuard.expectClean('admin-created driver app visibility')
	await driverPage.close()

	await deleteOpenAdminRecord(page, 'Trucks', truck.plate, [undefined])
	await expectDeletedTruck(service, truck.plate)
	await deleteOpenAdminRecord(page, 'Drivers', driver.name, [
		undefined,
		'Admin stress driver deactivation',
	])
	const { data: disabledDriver } = await service
		.from('drivers')
		.select('status')
		.eq('id', driverRow?.id)
		.single()
	expect(disabledDriver?.status).toBe('disabled')

	const rejectedDriverContext = await browser.newContext({
		viewport: { height: 900, width: 1200 },
	})
	const rejectedDriverPage = await rejectedDriverContext.newPage()
	await rejectedDriverPage.goto(URLS.driver, { waitUntil: 'domcontentloaded' })
	await waitForHydration(rejectedDriverPage)
	await rejectedDriverPage.getByLabel(/email/i).fill(driver.email)
	await rejectedDriverPage.getByLabel(/password/i).fill(driver.password)
	await rejectedDriverPage
		.getByRole('button', { name: /sign in|enter|start/i })
		.click()
	await expect(rejectedDriverPage.locator('body')).not.toContainText(
		driver.name,
	)
	await rejectedDriverContext.close()

	await deleteOpenAdminRecord(page, 'Employees', employee.name, [
		undefined,
		'Admin stress employee disable',
	])
	const { data: disabledEmployee } = await service
		.from('employees')
		.select('status')
		.eq('id', employeeRow?.id)
		.single()
	expect(disabledEmployee?.status).toBe('disabled')

	await deleteOpenAdminRecord(page, 'Suppliers', supplier.name, [
		undefined,
		'Admin stress supplier deactivate',
	])
	const { data: inactiveSupplier } = await service
		.from('suppliers')
		.select('status')
		.eq('id', supplierRow?.id)
		.single()
	expect(inactiveSupplier?.status).toBe('inactive')

	await deleteOpenAdminRecord(page, 'Products', product.name, [
		undefined,
		'Admin stress product deactivate',
	])
	const { data: hiddenProduct } = await service
		.from('products')
		.select('availability_status, is_active')
		.eq('id', productRow?.id)
		.single()
	expect(hiddenProduct?.availability_status).toBe('hidden')
	expect(hiddenProduct?.is_active).toBe(false)

	await deleteOpenAdminRecord(page, 'Categories', childCategory.name, [
		undefined,
		'Admin stress category deactivate',
	])
	const { data: inactiveCategory } = await service
		.from('categories')
		.select('is_active')
		.eq('id', childCategoryRow?.id)
		.single()
	expect(inactiveCategory?.is_active).toBe(false)
	await deleteOpenAdminRecord(page, 'Categories', parentCategory.name, [
		undefined,
		'Admin stress parent category deactivate',
	])
	const { data: inactiveParentCategory } = await service
		.from('categories')
		.select('is_active')
		.eq('id', parentCategoryRow?.id)
		.single()
	expect(inactiveParentCategory?.is_active).toBe(false)

	await deleteOpenAdminRecord(page, 'Customers', customer.company, [undefined])
	const { data: inactiveCustomer } = await service
		.from('customers')
		.select('status')
		.eq('id', customerRow?.id)
		.single()
	expect(inactiveCustomer?.status).toBe('inactive')

	await guard.expectClean('internal admin registry stress')
	await context.close()
})

test('driver login accepts only the seeded driver account', async ({
	page,
}) => {
	const guard = installBrowserErrorGuard(page)

	await page.goto(URLS.driver, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByLabel(/email/i).fill(ACCOUNTS.driver.email)
	await page.getByLabel(/password/i).fill(ACCOUNTS.driver.password)
	await page.getByRole('button', { name: /sign in|enter|start/i }).click()
	await expect(page.locator('body')).toContainText(
		/No active delivery|Fleet|Details|Route/i,
		{
			timeout: 15_000,
		},
	)

	await guard.expectClean('driver')
})

test('auth sessions stay isolated across website, portal, internal, and driver apps', async ({
	browser,
}) => {
	test.setTimeout(75_000)
	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	const authCookies = [
		...(await createAuthCookies(
			ACCOUNTS.customer,
			COOKIE_NAMES.customer,
			URLS.website,
		)),
		...(await createAuthCookies(
			ACCOUNTS.internal,
			COOKIE_NAMES.internal,
			URLS.internal,
		)),
		...(await createAuthCookies(
			ACCOUNTS.driver,
			COOKIE_NAMES.driver,
			URLS.driver,
		)),
	]
	await context.addCookies(authCookies)

	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)

	for (const round of [1, 2]) {
		if (round === 2) await page.waitForTimeout(16_000)

		await page.goto(`${URLS.website}/market`, { waitUntil: 'domcontentloaded' })
		await waitForHydration(page)
		await expect(page.locator('body')).toContainText(
			/Account|Building Materials/,
		)

		await page.goto(`${URLS.portal}/market`, { waitUntil: 'domcontentloaded' })
		await waitForHydration(page)
		await expect(page).not.toHaveURL(/\/login/)
		await expect(page.locator('body')).toContainText(/Market|All entries/)

		await page.goto(URLS.internal, { waitUntil: 'domcontentloaded' })
		await waitForHydration(page)
		await expect(page).not.toHaveURL(/\/login/)
		await expect(page.locator('body')).toContainText(/modules|sales|warehouse/i)

		await page.goto(URLS.driver, { waitUntil: 'domcontentloaded' })
		await waitForHydration(page)
		await expect(page.locator('body')).toContainText(
			/No active delivery|Fleet|Details|Route/i,
		)

		const cookies = await context.cookies()
		expect(cookies.map((cookie) => cookie.name).sort()).toEqual(
			expect.arrayContaining([
				`${COOKIE_NAMES.customer}.0`,
				`${COOKIE_NAMES.customer}.1`,
				`${COOKIE_NAMES.driver}.0`,
				`${COOKIE_NAMES.driver}.1`,
				`${COOKIE_NAMES.internal}.0`,
				`${COOKIE_NAMES.internal}.1`,
			]),
		)
	}

	await guard.expectClean('auth isolation')
	await context.close()
})

async function waitForHydration(page: Page) {
	await page.waitForLoadState('networkidle').catch(() => undefined)
	await page.waitForTimeout(500)
}

async function expectWebsiteMarketProduct(page: Page, productName: string) {
	await page.goto(`${URLS.website}/market`, {
		waitUntil: 'domcontentloaded',
	})
	await waitForHydration(page)
	const search = page.getByRole('combobox').first()
	await search.fill(productName)
	await expect(search).toHaveValue(productName)
	await search.press('Enter')
	await page.waitForURL(/\/market\?/, { timeout: 15_000 })
	await waitForHydration(page)
	await expect(page.locator('body')).toContainText(productName, {
		timeout: 15_000,
	})
}

async function expectPortalMarketProduct(page: Page, productName: string) {
	await page.goto(`${URLS.portal}/market`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	const search = page.locator('input[type="search"]').first()
	await search.fill(productName)
	await expect(search).toHaveValue(productName)
	await expect(page.locator('body')).toContainText(productName, {
		timeout: 15_000,
	})
}

async function openInternalAdmin(page: Page) {
	await page.goto(URLS.internal, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByRole('button', { name: /^Admin$/i }).click()
	await expect(page.locator('body')).toContainText('The Registry', {
		timeout: 15_000,
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
		timeout: 15_000,
	})
}

async function closeAdminPanel(page: Page) {
	const closeButton = page.getByLabel('Close panel')
	if (await closeButton.isVisible().catch(() => false)) {
		await closeButton.click()
		await expect(closeButton).toBeHidden({ timeout: 10_000 })
	}
}

async function deleteOpenAdminRecord(
	page: Page,
	volumeName: string,
	rowText: string,
	promptResponses: Array<string | undefined>,
) {
	await openAdminVolume(page, volumeName, volumeName)
	const rowButton = page.getByRole('button').filter({ hasText: rowText })
	await expect(rowButton.first()).toBeVisible({ timeout: 15_000 })
	await rowButton.first().click()
	const deleteButton = page.getByRole('button', { name: /^Delete$/ })
	await expect(deleteButton).toBeVisible({ timeout: 15_000 })
	let promptIndex = 0
	const dialogCompletions: Array<Promise<void>> = []
	const dialogHandler = (dialog: Dialog) => {
		const response = promptResponses[promptIndex]
		promptIndex += 1
		const completion =
			dialog.type() === 'prompt'
				? dialog.accept(response ?? '')
				: dialog.accept()
		dialogCompletions.push(completion)
	}
	page.on('dialog', dialogHandler)
	try {
		await deleteButton.click()
		if (promptResponses.length > 0) {
			await expect
				.poll(() => promptIndex, { timeout: 10_000 })
				.toBe(promptResponses.length)
		}
		await Promise.all(dialogCompletions)
	} finally {
		page.off('dialog', dialogHandler)
	}
	await expect(page.getByLabel('Close panel')).toBeHidden({ timeout: 15_000 })
}

async function expectDeletedTruck(
	service: ReturnType<typeof createLocalServiceClient>,
	plate: string,
) {
	const { data, error } = await service
		.from('trucks')
		.select('id')
		.eq('plate_number', plate)
	expect(error).toBeNull()
	expect(data).toEqual([])
}

async function selectOptionByLabel(page: Page, label: string, option: string) {
	await page.getByLabel(label, { exact: true }).click()
	const exactOption = page.getByRole('option', { name: option, exact: true })
	if ((await exactOption.count()) > 0) {
		await exactOption.first().click()
		return
	}
	const matchingOption = page
		.getByRole('option')
		.filter({ hasText: option })
		.first()
	await expect(
		matchingOption,
		`Option "${option}" should be available for "${label}"`,
	).toBeVisible({ timeout: 5_000 })
	await matchingOption.click()
}

async function confirmDraftSave(page: Page, draftName?: string) {
	const saveButton = page.getByRole('button', {
		name: /^(Save Draft|حفظ المسودة)$/i,
	})
	await expect(saveButton).toBeVisible({ timeout: 15_000 })
	await saveButton.click()
	const draftNameInput = page.getByLabel(/^(Draft name|اسم المسودة)$/i)
	if (await draftNameInput.isVisible({ timeout: 1_000 }).catch(() => false)) {
		if (draftName !== undefined) await draftNameInput.fill(draftName)
		await saveButton.click()
	}
	await expect(
		page.getByRole('button', {
			name: draftName
				? new RegExp(`^${escapeRegExp(draftName)}$`)
				: /^(Draft \d|مسودة )/i,
		}),
	).toBeDisabled({ timeout: 15_000 })
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
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

async function expectCustomerDraftArtifactsSince(
	service: ReturnType<typeof createLocalServiceClient>,
	sinceIso: string,
	websiteDraftName: string,
	websiteFlowNote: string,
) {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('quote_requests')
					.select('draft_name, notes, status, submitted_at')
					.gte('created_at', sinceIso)
				if (error) return `error:${error.message}`

				const rows = data ?? []
				const websiteRows = rows.filter((row) => row.notes === websiteFlowNote)
				const hasSavedWebsiteDraft = websiteRows.some(
					(row) =>
						row.status === 'draft' && row.draft_name === websiteDraftName,
				)
				const hasSubmittedWebsiteClone = websiteRows.some(
					(row) =>
						row.status !== 'draft' &&
						row.draft_name === null &&
						row.submitted_at !== null,
				)
				const submittedWithDraftName = websiteRows.some(
					(row) =>
						row.status !== 'draft' && row.draft_name === websiteDraftName,
				)
				return hasSavedWebsiteDraft &&
					hasSubmittedWebsiteClone &&
					!submittedWithDraftName
					? 'ready'
					: [
							hasSavedWebsiteDraft ? 'draft' : 'no-draft',
							hasSubmittedWebsiteClone ? 'clone' : 'no-clone',
							submittedWithDraftName ? 'leaked-name' : 'clean-name',
							`website:${websiteRows.length}`,
							`rows:${rows.length}`,
						].join(':')
			},
			{ timeout: 15_000 },
		)
		.toBe('ready')
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

function readLocalSupabaseEnv() {
	const result = spawnSync('supabase', ['status', '-o', 'env'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.status !== 0) {
		throw new Error(
			result.stderr.trim() ||
				'Local Supabase is not running. Start it before browser smoke.',
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
	if (!apiUrl || !anonKey) {
		throw new Error('Could not read local Supabase API URL/anon key.')
	}
	return { anonKey, apiUrl, serviceRoleKey }
}

function stripEnvQuotes(value: string) {
	if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
	return value
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

function createLocalServiceClient() {
	const env = readLocalSupabaseEnv()
	if (!env.serviceRoleKey) {
		throw new Error('Could not read local Supabase service role key.')
	}
	return createClient(env.apiUrl, env.serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
}
