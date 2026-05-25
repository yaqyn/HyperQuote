import { spawnSync } from 'node:child_process'
import { get as httpGet } from 'node:http'
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
	dbUrl: string
	serviceRoleKey: string
}

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')

const URLS = {
	driver: process.env.FLOW_DRIVER_URL ?? 'http://localhost:3003',
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
	portal: process.env.FLOW_PORTAL_URL ?? 'http://localhost:3001',
	website: process.env.FLOW_WEBSITE_URL ?? 'http://localhost:3000',
}

const COOKIE_NAME = 'hyperquote_customer_auth'
const COOKIE_NAMES = {
	customer: 'hyperquote_customer_auth',
	driver: 'hyperquote_driver_auth',
	internal: 'hyperquote_internal_auth',
}

const LOCAL_CUSTOMER = {
	email: 'local-customer@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
	phone: '+201000000000',
}

test.describe.configure({ mode: 'serial' })

test('website account signup, fake OTP rejection, account menu, and signout pass', async ({
	page,
}) => {
	test.setTimeout(90_000)
	const service = createLocalServiceClient()
	const activityStartedAt = new Date().toISOString()
	const phone = '1099999999'
	const fullPhone = `+20${phone}`
	await resetCustomerByPhone(service, fullPhone)
	const guard = installBrowserErrorGuard(page)

	await page.goto(URLS.website, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page.locator('body')).toContainText('Sign In')
	await expect(page.locator('body')).toContainText('Browse Market')

	await page.goto(`${URLS.website}/login`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByRole('button', { name: /whatsapp/i }).click()
	await expect(page.locator('body')).toContainText(/required|valid/i)
	await page.getByLabel(/phone/i).fill('999')
	await page.getByRole('button', { name: /whatsapp/i }).click()
	await expect(page.locator('body')).toContainText(/valid|mobile/i)
	await page.getByLabel(/phone/i).fill(phone)
	await page.getByRole('button', { name: /whatsapp/i }).click()
	await expect(page.getByLabel(/digit 1/i)).toBeVisible({ timeout: 15_000 })
	await enterOtp(page, '000000')
	await expect(page.locator('body')).toContainText(/wrong|invalid|try/i, {
		timeout: 15_000,
	})
	await page.waitForTimeout(700)
	await enterOtp(page, '123456')
	await expect(page.getByLabel(/company/i)).toBeVisible({ timeout: 15_000 })
	await page.getByRole('button', { name: /create|account/i }).click()
	await expect(page.getByLabel(/company/i)).toBeVisible()
	await page.getByLabel(/company/i).fill('Flow Final Signup Co')
	await page.getByLabel(/full name/i).fill('Flow Final Customer')
	await page.getByRole('button', { name: /create|account/i }).click()
	await expect(page).toHaveURL(/\/market/, { timeout: 20_000 })

	const signupCustomer = await expectCustomerByPhone(service, fullPhone)
	expect(signupCustomer.user_id).toBeTruthy()
	await expectActivityActionsSince(service, activityStartedAt, [
		'customer_signed_up',
	])

	await page.goto(URLS.website, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page.locator('body')).toContainText('Account')
	await expect(page.locator('body')).toContainText('Portal')
	await page.goto(`${URLS.website}/market`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByRole('button', { name: /account/i }).click()
	await expect(page.getByRole('menu')).toContainText(/Market/i)
	await expect(page.getByRole('menu')).toContainText(/Portal/i)
	await expect(page.getByRole('menu')).toContainText(/Sign Out/i)
	await page.getByRole('menuitem', { name: /Sign Out/i }).click()
	await expect(page.locator('body')).toContainText('Sign In', {
		timeout: 15_000,
	})
	await expect(page.locator('body')).not.toContainText(/white screen|error/i)

	await guard.expectClean('website signup/account/signout')
})

test('website phone signup can attach confirmed email/password for portal login', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const service = createLocalServiceClient()
	const stamp = Date.now().toString(36)
	const email = `flow-email-${stamp}@example.com`
	const changedEmail = `flow-email-change-${stamp}@example.com`
	const password = `Flow-email-${stamp}-123456`
	const resetPassword = `Flow-email-reset-${stamp}-123456`
	const phone = '1011111111'
	const fullPhone = `+20${phone}`
	const changedPhone = '1088888888'
	const changedFullPhone = `+20${changedPhone}`
	const companyName = `Flow Email ${stamp}`
	const fullName = 'Flow Email Customer'
	await resetCustomerByPhoneOrEmail(service, fullPhone, email)
	await resetCustomerByPhone(service, changedFullPhone)

	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)
	const activityStartedAt = new Date().toISOString()

	await page.goto(`${URLS.website}/login`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByLabel(/phone/i).fill(phone)
	await page.getByRole('button', { name: /whatsapp/i }).click()
	await expect(page.getByLabel(/digit 1/i)).toBeVisible({ timeout: 15_000 })
	await enterOtp(page, '123456')
	await expect(page.getByLabel(/^Company Name$/i)).toBeVisible({
		timeout: 20_000,
	})
	await page.getByLabel(/^Company Name$/i).fill(companyName)
	await page.getByLabel(/^Full Name$/i).fill(fullName)
	await page.getByLabel(/email.*optional/i).fill(email)
	await page.getByLabel(/password.*optional/i).fill(password)
	await page.getByLabel(/^Confirm password$/i).fill(password)
	await page.getByRole('button', { name: /^Create Account$/i }).click()
	await expect(page).toHaveURL(/\/market/, { timeout: 20_000 })

	const emailCustomer = await expectCustomerByEmail(service, email)
	expect(emailCustomer.phone).toBe(fullPhone)
	expect(emailCustomer.user_id).toBeTruthy()
	const customerUserId = String(emailCustomer.user_id)

	await context.clearCookies()
	await page.goto(`${URLS.website}/login`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByRole('button', { name: /email and password/i }).click()
	await page.getByLabel(/^Email$/i).fill(email)
	await page.getByLabel(/^Password$/i).fill(password)
	await page
		.locator('#main')
		.getByRole('button', { name: /^Sign In$/i })
		.last()
		.click()
	await expect(page.locator('body')).toContainText(/not confirmed/i)

	const confirmationUrl = await latestInbucketConfirmationUrl(email)
	const confirmPage = await context.newPage()
	await openConfirmationUrl(confirmPage, confirmationUrl)
	await confirmPage.waitForLoadState('networkidle').catch(() => undefined)
	await confirmPage.close()

	await page.goto(`${URLS.website}/login`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByRole('button', { name: /email and password/i }).click()
	await page.getByLabel(/^Email$/i).fill(email)
	await page.getByLabel(/^Password$/i).fill(password)
	await page
		.locator('#main')
		.getByRole('button', { name: /^Sign In$/i })
		.last()
		.click()
	await expect(page).toHaveURL(/\/market/, { timeout: 20_000 })

	await expectActivityActionsSince(service, activityStartedAt, [
		'customer_signed_up',
	])

	await addWebsiteProductToCart(page)
	await ensureWebsiteCartOpen(page)
	await submitWebsiteCart(page)
	const reference = await readVisibleReference(page, /submitted|sent/i)
	await expectQuoteRequestByReference(
		service,
		reference,
		'submitted',
		emailCustomer.id,
	)

	const portalContext = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	const portalPage = await portalContext.newPage()
	const portalGuard = installBrowserErrorGuard(portalPage)
	await portalPage.goto(`${URLS.portal}/login`, {
		waitUntil: 'domcontentloaded',
	})
	await waitForHydration(portalPage)
	await portalPage.getByRole('button', { name: /email and password/i }).click()
	await portalPage.getByLabel(/^Email$/i).fill(email)
	await portalPage.getByLabel(/^Password$/i).fill(password)
	await portalPage
		.getByRole('button', { name: /^Sign In$/i })
		.last()
		.click()
	await expect(portalPage).not.toHaveURL(/\/login/, { timeout: 25_000 })
	await portalPage.goto(`${URLS.portal}/profile`, {
		waitUntil: 'domcontentloaded',
	})
	await waitForHydration(portalPage)
	await expect(portalPage.locator('body')).toContainText('Email authentication')
	await portalPage.getByLabel(/^Email$/i).fill(changedEmail)
	await portalPage.getByRole('button', { name: /send confirmation/i }).click()
	await expect(portalPage.locator('body')).toContainText(
		`Confirmation email sent to ${changedEmail}.`,
		{ timeout: 15_000 },
	)
	await latestInbucketConfirmationUrl(changedEmail)
	const customerAfterEmailChangeRequest = await expectCustomerByEmail(
		service,
		email,
	)
	expect(customerAfterEmailChangeRequest.id).toBe(emailCustomer.id)
	const authBeforePhoneChange =
		await service.auth.admin.getUserById(customerUserId)
	expect(authBeforePhoneChange.error).toBeNull()
	expect(phoneDigits(authBeforePhoneChange.data.user?.phone)).toBe(
		phoneDigits(fullPhone),
	)
	await portalPage.locator('input[placeholder="10xxxxxxxx"]').fill(changedPhone)
	await portalPage.getByRole('button', { name: /send code/i }).click()
	await expect(portalPage.locator('body')).toContainText(
		/verification code sent/i,
		{ timeout: 15_000 },
	)
	const authAfterPhoneChangeRequest =
		await service.auth.admin.getUserById(customerUserId)
	expect(authAfterPhoneChangeRequest.error).toBeNull()
	expect(phoneDigits(authAfterPhoneChangeRequest.data.user?.phone)).toBe(
		phoneDigits(fullPhone),
	)
	const customerAfterPhoneChangeRequest = await expectCustomerByEmail(
		service,
		email,
	)
	expect(customerAfterPhoneChangeRequest.phone).toBe(fullPhone)
	await portalPage.goto(`${URLS.portal}/orders`, {
		waitUntil: 'domcontentloaded',
	})
	await waitForHydration(portalPage)
	await expect(portalPage.locator('body')).toContainText(reference)
	await portalGuard.expectClean('portal email/password customer sign-in')
	await portalContext.close()

	const resetContext = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	const resetPage = await resetContext.newPage()
	const resetGuard = installBrowserErrorGuard(resetPage)
	await resetPage.goto(`${URLS.portal}/login`, {
		waitUntil: 'domcontentloaded',
	})
	await waitForHydration(resetPage)
	await resetPage.getByRole('button', { name: /email and password/i }).click()
	await resetPage.getByLabel(/^Email$/i).fill(email)
	await resetPage.getByRole('button', { name: /forgot password/i }).click()
	await expect(resetPage.locator('body')).toContainText(/reset link/i, {
		timeout: 15_000,
	})
	const recoveryUrl = await latestInbucketRecoveryUrl(email)
	await resetPage.goto(recoveryUrl, { waitUntil: 'domcontentloaded' })
	await waitForHydration(resetPage)
	await expect(resetPage.locator('body')).toContainText(/new password/i)
	await resetPage.getByLabel(/^New password$/i).fill(resetPassword)
	await resetPage.getByLabel(/^Confirm new password$/i).fill(resetPassword)
	await resetPage.getByRole('button', { name: /update password/i }).click()
	await expect(resetPage).not.toHaveURL(/\/login/, { timeout: 25_000 })
	await resetGuard.expectClean('portal password reset')
	await resetContext.close()

	await guard.expectClean('website phone signup email confirmation')
	await context.close()
})

test('website market search, filter, and sort only return published catalog rows', async ({
	page,
}) => {
	test.setTimeout(90_000)
	const service = createLocalServiceClient()
	const guard = installBrowserErrorGuard(page)
	const baseProduct = await firstActiveProduct(service)
	const stamp = Date.now().toString(36)
	const token = `Flow Row35 ${stamp}`
	const products = [
		{
			availability_status: 'available',
			category: baseProduct.category,
			description: `${token} visible customer-safe product`,
			description_ar: `منتج ظاهر ${stamp}`,
			is_active: true,
			name: `AA ${token} Visible`,
			name_ar: `ظاهر ${stamp}`,
			price_range_max: 80,
			price_range_min: 40,
			price_tier: 'budget',
			sku: `FLOW-ROW35-A-${stamp}`,
			slug: `flow-row35-visible-${stamp}`,
			specifications: { token },
			specifications_ar: { token: `اختبار ${stamp}` },
			subcategory: 'flow-row35',
			subcategory_ar: 'اختبار',
			unit_of_measure: 'bag',
			unit_of_measure_ar: 'شيكارة',
		},
		{
			availability_status: 'hidden',
			category: baseProduct.category,
			description: `${token} hidden product must not publish`,
			description_ar: `منتج مخفي ${stamp}`,
			is_active: true,
			name: `BB ${token} Hidden`,
			name_ar: `مخفي ${stamp}`,
			price_range_max: 90,
			price_range_min: 50,
			price_tier: 'mid_range',
			sku: `FLOW-ROW35-H-${stamp}`,
			slug: `flow-row35-hidden-${stamp}`,
			specifications: { token },
			specifications_ar: { token: `مخفي ${stamp}` },
			subcategory: 'flow-row35',
			subcategory_ar: 'اختبار',
			unit_of_measure: 'bag',
			unit_of_measure_ar: 'شيكارة',
		},
		{
			availability_status: 'available',
			category: baseProduct.category,
			description: `${token} inactive product must not publish`,
			description_ar: `منتج غير نشط ${stamp}`,
			is_active: false,
			name: `CC ${token} Inactive`,
			name_ar: `غير نشط ${stamp}`,
			price_range_max: 100,
			price_range_min: 60,
			price_tier: 'premium',
			sku: `FLOW-ROW35-I-${stamp}`,
			slug: `flow-row35-inactive-${stamp}`,
			specifications: { token },
			specifications_ar: { token: `غير نشط ${stamp}` },
			subcategory: 'flow-row35',
			subcategory_ar: 'اختبار',
			unit_of_measure: 'bag',
			unit_of_measure_ar: 'شيكارة',
		},
	]
	const slugs = products.map((product) => product.slug)

	try {
		const { error } = await service.from('products').insert(products)
		expect(error).toBeNull()

		const anon = createLocalAnonClient()
		const { data: anonRows, error: anonError } = await anon
			.from('products')
			.select('slug, name')
			.ilike('name', `%${token}%`)
			.order('name')
		expect(anonError?.message).toContain('permission denied for schema public')
		expect(anonRows).toBeNull()

		await page.goto(`${URLS.website}/market`, { waitUntil: 'domcontentloaded' })
		await waitForHydration(page)
		await page.getByRole('combobox', { name: /search/i }).fill(token)
		await page.keyboard.press('Enter')
		await expect(page).toHaveURL(/q=Flow\+Row35|q=Flow%20Row35/, {
			timeout: 15_000,
		})
		await waitForHydration(page)
		await expect(page.locator('body')).toContainText(products[0].name)
		await expect(page.locator('body')).not.toContainText(products[1].name)
		await expect(page.locator('body')).not.toContainText(products[2].name)

		await page.getByLabel(/sort/i).click()
		await page.getByRole('option', { name: /^Name$/i }).click()
		await expect(page).toHaveURL(/sort=name/, { timeout: 15_000 })
		await waitForHydration(page)
		await expect(page.locator('body')).toContainText(products[0].name)
		await expect(page.locator('body')).not.toContainText(products[1].name)
		await expect(page.locator('body')).not.toContainText(products[2].name)

		await page.getByRole('button', { name: baseProduct.categoryName }).click()
		await expect(page).toHaveURL(/category=/, { timeout: 15_000 })
		await waitForHydration(page)
		await expect(page.locator('body')).toContainText(products[0].name)
		await expect(page.locator('body')).not.toContainText(products[1].name)
		await expect(page.locator('body')).not.toContainText(products[2].name)

		await guard.expectClean('website published catalog search/filter/sort')
	} finally {
		await service.from('products').delete().in('slug', slugs)
	}
})

test('website and portal expose bilingual catalog source data from Supabase', async ({
	browser,
}) => {
	test.setTimeout(150_000)
	const service = createLocalServiceClient()
	const stamp = Date.now().toString(36)
	const category = {
		name: `Flow Bilingual ${stamp}`,
		name_ar: `تصنيف ثنائي ${stamp}`,
		slug: `flow-bilingual-${stamp}`,
	}
	const product = {
		availability_status: 'available',
		category: category.slug,
		description: `Flow bilingual description ${stamp}`,
		description_ar: `وصف ثنائي ${stamp}`,
		is_active: true,
		name: `AA Flow Bilingual Product ${stamp}`,
		name_ar: `منتج ثنائي ${stamp}`,
		price_range_max: 120,
		price_range_min: 90,
		price_tier: 'budget',
		sku: `FLOW-BI-${stamp}`,
		slug: `flow-bilingual-product-${stamp}`,
		specifications: {
			color_grade: `sand white ${stamp}`,
			compression: 'C30',
		},
		specifications_ar: {
			'درجة اللون': `ابيض رملي ${stamp}`,
			المقاومة: 'C30',
		},
		subcategory: `flow subcategory ${stamp}`,
		subcategory_ar: `فرعي ثنائي ${stamp}`,
		unit_of_measure: 'bag',
		unit_of_measure_ar: 'كيس',
	}

	try {
		const invalidCategory = await service.from('categories').insert({
			name: `Invalid Bilingual ${stamp}`,
			name_ar: `English only ${stamp}`,
			slug: `flow-bilingual-invalid-category-${stamp}`,
		})
		expect(invalidCategory.error?.message).toContain(
			'categories_name_ar_language',
		)

		const { error: categoryError } = await service
			.from('categories')
			.insert(category)
		expect(categoryError).toBeNull()

		const invalidProduct = await service.from('products').insert({
			...product,
			name_ar: `English only ${stamp}`,
			sku: `FLOW-BI-BAD-${stamp}`,
			slug: `flow-bilingual-product-bad-${stamp}`,
			unit_of_measure_ar: 'bag',
		})
		expect(invalidProduct.error?.message).toContain('products_name_ar_language')

		const { error: productError } = await service
			.from('products')
			.insert(product)
		expect(productError).toBeNull()

		const anon = createLocalAnonClient()
		const directProductRead = await anon
			.from('products')
			.select('name')
			.eq('slug', product.slug)
			.single()
		expect(directProductRead.error?.message).toContain(
			'permission denied for schema public',
		)

		const { data: productRow, error: productRowError } = await service
			.from('products')
			.select(
				'name, name_ar, description, description_ar, category, subcategory, subcategory_ar, unit_of_measure, unit_of_measure_ar, specifications, specifications_ar',
			)
			.eq('slug', product.slug)
			.single()
		expect(productRowError).toBeNull()
		expect(productRow?.name_ar).toBe(product.name_ar)
		expect(productRow?.description_ar).toBe(product.description_ar)
		expect(productRow?.subcategory_ar).toBe(product.subcategory_ar)
		expect(productRow?.unit_of_measure_ar).toBe(product.unit_of_measure_ar)
		expect(productRow?.specifications_ar).toEqual(product.specifications_ar)

		const { data: categoryRow, error: categoryRowError } = await service
			.from('categories')
			.select('name, name_ar')
			.eq('slug', category.slug)
			.single()
		expect(categoryRowError).toBeNull()
		expect(categoryRow?.name_ar).toBe(category.name_ar)

		const websiteContext = await browser.newContext({
			viewport: { height: 1000, width: 1440 },
		})
		const website = await websiteContext.newPage()
		const websiteGuard = installBrowserErrorGuard(website)
		try {
			await website.goto(
				`${URLS.website}/market?q=${encodeURIComponent(product.name)}`,
				{ waitUntil: 'domcontentloaded' },
			)
			await waitForHydration(website)
			await expect(website.locator('body')).toContainText(product.name)
			await expect(website.locator('body')).toContainText(category.name)
			await expect(website.locator('body')).toContainText(
				product.unit_of_measure,
			)

			await website.goto(`${URLS.website}/market/${product.slug}`, {
				waitUntil: 'domcontentloaded',
			})
			await waitForHydration(website)
			await expect(website.locator('body')).toContainText(product.name)
			await expect(website.locator('body')).toContainText(category.name)
			await expect(website.locator('body')).toContainText(product.description)
			await expect(website.locator('body')).toContainText('Color Grade')
			await expect(website.locator('body')).toContainText(
				product.specifications.color_grade,
			)

			await website
				.getByRole('button', { name: /arabic|العربية/i })
				.first()
				.click()
			await expect(website.locator('html')).toHaveAttribute('dir', 'rtl')
			await expect(website.locator('body')).toContainText(product.name_ar)
			await expect(website.locator('body')).toContainText(category.name_ar)
			await expect(website.locator('body')).toContainText(
				product.description_ar,
			)
			await expect(website.locator('body')).toContainText(
				product.unit_of_measure_ar,
			)
			await expect(website.locator('body')).toContainText('درجة اللون')
			await expect(website.locator('body')).toContainText(
				product.specifications_ar['درجة اللون'],
			)
			await websiteGuard.expectClean('website bilingual catalog source data')
		} finally {
			await websiteContext.close()
		}

		const portalContext = await browser.newContext({
			viewport: { height: 1000, width: 1440 },
		})
		await portalContext.addCookies([
			...(await createAuthCookies(
				{
					email: LOCAL_CUSTOMER.email,
					password: LOCAL_CUSTOMER.password,
				},
				URLS.portal,
			)),
			{
				name: 'hq-locale',
				sameSite: 'Lax' as const,
				url: URLS.portal,
				value: 'ar',
			},
		])
		const portal = await portalContext.newPage()
		const portalGuard = installBrowserErrorGuard(portal)
		try {
			await portal.goto(`${URLS.portal}/market`, {
				waitUntil: 'domcontentloaded',
			})
			await waitForHydration(portal)
			await expect(portal).not.toHaveURL(/\/login/)
			await expect(portal.locator('html')).toHaveAttribute('dir', 'rtl')
			await portal.locator('input[type="search"]').fill(product.name_ar)
			await expect(portal.locator('body')).toContainText(product.name_ar, {
				timeout: 20_000,
			})
			await expect(portal.locator('body')).toContainText(category.name_ar)
			await expect(portal.locator('body')).toContainText(
				product.unit_of_measure_ar,
			)

			await portal.goto(`${URLS.portal}/market/${product.slug}`, {
				waitUntil: 'domcontentloaded',
			})
			await waitForHydration(portal)
			await expect(portal.locator('body')).toContainText(product.name_ar)
			await expect(portal.locator('body')).toContainText(category.name_ar)
			await expect(portal.locator('body')).toContainText(product.description_ar)
			await expect(portal.locator('body')).toContainText(
				product.unit_of_measure_ar,
			)
			await expect(portal.locator('body')).toContainText('درجة اللون')
			await expect(portal.locator('body')).toContainText(
				product.specifications_ar['درجة اللون'],
			)
			await portalGuard.expectClean('portal bilingual catalog source data')
		} finally {
			await portalContext.close()
		}
	} finally {
		await service
			.from('products')
			.delete()
			.in('slug', [product.slug, `flow-bilingual-product-bad-${stamp}`])
		await service
			.from('categories')
			.delete()
			.in('slug', [category.slug, `flow-bilingual-invalid-category-${stamp}`])
	}
})

test('customer submit revalidates product availability and safe line item data before acceptance', async ({
	browser,
}) => {
	test.setTimeout(120_000)
	const service = createLocalServiceClient()
	const customerClient = await createLocalCustomerClient()
	const customer = await expectCustomerByEmail(service, LOCAL_CUSTOMER.email)
	const baseProduct = await firstActiveProduct(service)
	const stamp = Date.now().toString(36)
	const product = {
		availability_status: 'available',
		category: baseProduct.category,
		description: `Flow submit validation ${stamp}`,
		description_ar: `تحقق ارسال ${stamp}`,
		is_active: true,
		name: `AA Flow Submit Validation ${stamp}`,
		name_ar: `منتج تحقق ارسال ${stamp}`,
		price_range_max: 180,
		price_range_min: 120,
		price_tier: 'mid_range',
		sku: `FLOW-SUBMIT-${stamp}`,
		slug: `flow-submit-validation-${stamp}`,
		specifications: { validation: stamp },
		specifications_ar: { التحقق: stamp },
		subcategory: 'flow-submit-validation',
		subcategory_ar: 'تحقق',
		unit_of_measure: 'bag',
		unit_of_measure_ar: 'كيس',
	}
	const submitSnapshot = {
		name: `AA Flow Submit Snapshot ${stamp}`,
		name_ar: `منتج لقطة ارسال ${stamp}`,
		price_range_max: 260,
		price_range_min: 210,
		unit_of_measure: 'box',
		unit_of_measure_ar: 'صندوق',
	}
	const postSubmitCatalog = {
		name: `AA Flow Changed After Submit ${stamp}`,
		name_ar: `منتج تغير بعد الارسال ${stamp}`,
		price_range_max: 390,
		price_range_min: 330,
		unit_of_measure: 'roll',
		unit_of_measure_ar: 'رول',
	}
	let quoteRequestId = ''

	try {
		const { data: productRow, error: productError } = await service
			.from('products')
			.insert(product)
			.select('id')
			.single()
		expect(productError).toBeNull()
		const productId = String(productRow?.id)
		expect(productId).toBeTruthy()

		const { data: draft, error: draftError } = await service
			.from('quote_requests')
			.insert({
				customer_id: customer.id,
				notes: `flow-submit-validation:${stamp}`,
			})
			.select('id, request_number')
			.single()
		expect(draftError).toBeNull()
		quoteRequestId = String(draft?.id)
		const reference = String(draft?.request_number)
		expect(quoteRequestId).toBeTruthy()
		expect(reference).toMatch(/^QR-/)

		const { data: insertedItem, error: itemError } = await service
			.from('quote_request_items')
			.insert({
				currency: 'USD',
				customer_description: `Injected customer text ${stamp}`,
				price_range_max: 2,
				price_range_min: 1,
				product_id: productId,
				quantity: 4,
				quote_request_id: quoteRequestId,
				sort_order: 0,
				unit_of_measure: 'wrong unit',
				unit_of_measure_ar: 'وحدة خاطئة',
			})
			.select(
				'customer_description, product_name_ar, quantity, unit_of_measure, unit_of_measure_ar, price_range_min, price_range_max, currency',
			)
			.single()
		expect(itemError).toBeNull()
		expect(insertedItem?.customer_description).toBe(
			`Injected customer text ${stamp}`,
		)
		expect(insertedItem?.unit_of_measure).toBe('wrong unit')
		expect(insertedItem?.unit_of_measure_ar).toBe('وحدة خاطئة')
		expect(Number(insertedItem?.price_range_min)).toBe(1)
		expect(Number(insertedItem?.price_range_max)).toBe(2)
		expect(insertedItem?.currency).toBe('USD')
		expect(Number(insertedItem?.quantity)).toBe(4)

		const { error: hideError } = await service
			.from('products')
			.update({ availability_status: 'out_of_stock' })
			.eq('id', productId)
		expect(hideError).toBeNull()
		const rejectedSubmit = await customerClient.rpc(
			'customer_submit_saved_quote_request',
			{ p_quote_request_id: quoteRequestId, p_source: 'portal' },
		)
		expect(rejectedSubmit.error?.message).toContain('product_not_orderable')
		await expectQuoteRequestStatus(service, quoteRequestId, 'draft')

		const { error: restoreError } = await service
			.from('products')
			.update({
				...submitSnapshot,
				availability_status: 'available',
			})
			.eq('id', productId)
		expect(restoreError).toBeNull()
		const acceptedSubmit = await customerClient.rpc(
			'customer_submit_saved_quote_request',
			{ p_quote_request_id: quoteRequestId, p_source: 'portal' },
		)
		expect(acceptedSubmit.error).toBeNull()
		expect(acceptedSubmit.data?.status).toBe('submitted')

		const submittedItem = await quoteRequestItemSnapshot(
			service,
			quoteRequestId,
		)
		expect(submittedItem.customer_description).toBe(submitSnapshot.name)
		expect(submittedItem.product_name_ar).toBe(submitSnapshot.name_ar)
		expect(submittedItem.unit_of_measure).toBe(submitSnapshot.unit_of_measure)
		expect(submittedItem.unit_of_measure_ar).toBe(
			submitSnapshot.unit_of_measure_ar,
		)
		expect(Number(submittedItem.price_range_min)).toBe(
			submitSnapshot.price_range_min,
		)
		expect(Number(submittedItem.price_range_max)).toBe(
			submitSnapshot.price_range_max,
		)
		expect(submittedItem.currency).toBe('EGP')
		expect(Number(submittedItem.quantity)).toBe(4)

		const { error: postSubmitEditError } = await service
			.from('products')
			.update(postSubmitCatalog)
			.eq('id', productId)
		expect(postSubmitEditError).toBeNull()
		await expect(
			await quoteRequestItemSnapshot(service, quoteRequestId),
		).toMatchObject({
			customer_description: submitSnapshot.name,
			product_name_ar: submitSnapshot.name_ar,
			unit_of_measure: submitSnapshot.unit_of_measure,
			unit_of_measure_ar: submitSnapshot.unit_of_measure_ar,
		})

		const context = await browser.newContext({
			viewport: { height: 1000, width: 1440 },
		})
		await context.addCookies(
			await createAuthCookies(
				{
					email: LOCAL_CUSTOMER.email,
					password: LOCAL_CUSTOMER.password,
				},
				URLS.portal,
			),
		)
		const page = await context.newPage()
		const guard = installBrowserErrorGuard(page)
		try {
			await page.goto(`${URLS.portal}/orders/${quoteRequestId}`, {
				waitUntil: 'domcontentloaded',
			})
			await waitForHydration(page)
			await expect(page.locator('body')).toContainText(reference)
			await expect(page.locator('body')).toContainText(submitSnapshot.name)
			await expect(page.locator('body')).toContainText(
				submitSnapshot.unit_of_measure,
			)
			await expect(page.locator('body')).not.toContainText(
				`Injected customer text ${stamp}`,
			)
			await expect(page.locator('body')).not.toContainText(
				postSubmitCatalog.name,
			)
			await guard.expectClean('portal submitted order revalidated snapshot')
		} finally {
			await context.close()
		}

		const arabicContext = await browser.newContext({
			viewport: { height: 1000, width: 1440 },
		})
		await arabicContext.addCookies([
			...(await createAuthCookies(
				{
					email: LOCAL_CUSTOMER.email,
					password: LOCAL_CUSTOMER.password,
				},
				URLS.portal,
			)),
			{
				name: 'hq-locale',
				sameSite: 'Lax' as const,
				url: URLS.portal,
				value: 'ar',
			},
		])
		const arabicPage = await arabicContext.newPage()
		const arabicGuard = installBrowserErrorGuard(arabicPage)
		try {
			await arabicPage.goto(`${URLS.portal}/orders/${quoteRequestId}`, {
				waitUntil: 'domcontentloaded',
			})
			await waitForHydration(arabicPage)
			await expect(arabicPage.locator('html')).toHaveAttribute('dir', 'rtl')
			await expect(arabicPage.locator('body')).toContainText(
				submitSnapshot.name_ar,
			)
			await expect(arabicPage.locator('body')).toContainText(
				submitSnapshot.unit_of_measure_ar,
			)
			await expect(arabicPage.locator('body')).not.toContainText(
				postSubmitCatalog.name_ar,
			)
			await arabicGuard.expectClean(
				'portal arabic submitted order snapshot after catalog edit',
			)
		} finally {
			await arabicContext.close()
		}
	} finally {
		if (quoteRequestId) {
			await service.from('quote_requests').delete().eq('id', quoteRequestId)
		}
		await service.from('products').delete().eq('slug', product.slug)
	}
})

test('website and portal market, draft, submit, support, and access boundaries pass', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const service = createLocalServiceClient()
	const activityStartedAt = new Date().toISOString()
	const localCustomer = await expectCustomerByPhone(
		service,
		LOCAL_CUSTOMER.phone,
	)
	const otherCustomer = await createPasswordCustomer(service, {
		companyName: 'Flow Other Customer Co',
		contactName: 'Flow Other Customer',
		email: 'flow-other-customer@hyperquote.local',
		password: 'Flow-other-customer-123456',
		phone: '+201055555555',
	})

	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	await context.addCookies([
		...(await createAuthCookies(
			{
				email: LOCAL_CUSTOMER.email,
				password: LOCAL_CUSTOMER.password,
			},
			URLS.website,
		)),
		...(await createAuthCookies(
			{
				email: LOCAL_CUSTOMER.email,
				password: LOCAL_CUSTOMER.password,
			},
			URLS.portal,
		)),
	])

	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)

	await assertPublicCatalogBoundary()
	await assertVisitorSupportTicket(service, browser)
	await assertSignedInSupportTicket(service, page, localCustomer.id)
	const product = await firstActiveProduct(service)

	await page.goto(`${URLS.website}/market`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page.locator('body')).not.toContainText(/No products yet/i)
	await page.goto(
		`${URLS.website}/market?q=${encodeURIComponent(product.name)}`,
		{
			waitUntil: 'domcontentloaded',
		},
	)
	await waitForHydration(page)
	await expect(page.locator('body')).toContainText(product.name)
	await page
		.getByRole('button', { name: /arabic|العربية/i })
		.first()
		.click()
	await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
	await expect(page.locator('body')).toContainText(product.name_ar)
	await page
		.getByRole('button', { name: /english|الإنجليزية/i })
		.first()
		.click()
	await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')

	await expect(page.locator('body')).toContainText(product.name)
	await page.getByRole('button', { name: product.categoryName }).click()
	await expect(page.locator('body')).toContainText(product.name)

	await addWebsiteProductToCart(page)
	await ensureWebsiteCartOpen(page)
	const cartQuantity = page
		.getByRole('spinbutton', { name: /^Quantity/i })
		.first()
	await cartQuantity.fill('3')
	await expect(cartQuantity).toHaveValue('3')
	await cartQuantity.fill('2')
	await expect(cartQuantity).toHaveValue('2')
	await page.getByLabel(/remove/i).click()
	await expect(page.locator('body')).toContainText(/empty|browse/i)

	await page
		.getByRole('link', { name: /browse/i })
		.first()
		.click()
	await addWebsiteProductToCart(page)
	await ensureWebsiteCartOpen(page)
	await saveWebsiteCartDraft(page)
	const draftReference = await readVisibleReference(page, /Draft saved/i)
	await expect(page.getByRole('link', { name: /^portal$/i })).toHaveAttribute(
		'href',
		/\/orders$/,
	)
	const websiteDraft = await expectQuoteRequestByReference(
		service,
		draftReference,
		'draft',
		localCustomer.id,
	)
	await expectDraftLifecycleEvents(service, {
		actions: ['draft_created', 'draft_saved', 'website_draft_saved'],
		customerId: localCustomer.id,
		draftId: websiteDraft.id,
		itemCount: 1,
		operation: 'create',
		requestNumber: draftReference,
		source: 'website',
	})

	await page.getByRole('button', { name: /continue browsing/i }).click()
	await addWebsiteProductToCart(page)
	await ensureWebsiteCartOpen(page)
	await submitWebsiteCart(page)
	const submittedReference = await readVisibleReference(page, /submitted|sent/i)
	const submitted = await expectQuoteRequestByReference(
		service,
		submittedReference,
		'submitted',
		localCustomer.id,
	)
	await expectSubmittedDraftEvents(service, {
		customerId: localCustomer.id,
		quoteRequestId: submitted.id,
		requestNumber: submittedReference,
		source: 'website',
	})

	await page.goto(`${URLS.portal}/market`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page).not.toHaveURL(/\/login/)
	await page.getByPlaceholder(/search/i).fill(product.name)
	await expect(page.locator('body')).toContainText(product.name)
	await page.goto(`${URLS.portal}/orders`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page.locator('body')).toContainText(draftReference)
	await expect(page.locator('body')).toContainText(submittedReference)
	await page
		.locator('article')
		.filter({ hasText: submittedReference })
		.getByRole('button', { name: /^View$|^عرض$/i })
		.click()
	await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+/)
	await expect(page.locator('body')).toContainText(/Reference|المرجع/i)
	await expect(page.locator('body')).not.toContainText(/Failed to load order/i)
	await page
		.getByRole('button', { name: /Save as Draft|حفظ كمسودة/i })
		.first()
		.click()
	await expect(page.locator('body')).toContainText(/Saved draft|تم حفظ/i, {
		timeout: 15_000,
	})
	const savedDraft = await latestCustomerDraft(service, localCustomer.id)
	expect(savedDraft.id).not.toBe(websiteDraft.id)
	expect(savedDraft.id).not.toBe(submitted.id)
	await expectQuoteRequestStatus(service, submitted.id, 'submitted')
	await expectQuoteRequestItemsEqual(service, savedDraft.id, submitted.id)
	await expectQuoteRequestMetadataEqual(service, savedDraft.id, submitted.id)

	const otherContext = await browser.newContext({
		viewport: { height: 900, width: 1200 },
	})
	await otherContext.addCookies(
		await createAuthCookies(
			{ email: otherCustomer.email, password: otherCustomer.password },
			URLS.portal,
		),
	)
	const otherPage = await otherContext.newPage()
	const otherGuard = installBrowserErrorGuard(otherPage)
	await otherPage.goto(`${URLS.portal}/orders/${submitted.id}`, {
		waitUntil: 'domcontentloaded',
	})
	await waitForHydration(otherPage)
	await expect(otherPage.locator('body')).not.toContainText(submittedReference)
	await expect(otherPage.locator('body')).toContainText(
		/not found|failed|access|لا/i,
	)
	await otherGuard.expectClean('portal cross-customer denial')
	await otherContext.close()

	await expectActivityActionsSince(service, activityStartedAt, [
		'draft_created',
		'draft_saved',
		'draft_submitted',
		'order_submitted',
		'website_draft_saved',
		'quote_request_submitted',
		'portal_order_viewed',
		'customer_order_saved_as_draft',
		'support_ticket_created',
	])

	await guard.expectClean('website portal final customer flow')
	await context.close()
})

test('website visitor cart, sign-in return, and wrong-app access boundaries pass', async ({
	browser,
}) => {
	test.setTimeout(150_000)
	const service = createLocalServiceClient()
	const activityStartedAt = new Date().toISOString()
	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)

	await page.goto(`${URLS.website}/market`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page.locator('body')).toContainText(/Building Materials|Market/i)
	await addWebsiteProductToCart(page)
	await ensureWebsiteCartOpen(page)
	await page.getByRole('button', { name: /Request Quote|Submit/i }).click()
	await expect(page.locator('body')).toContainText(/sign in|sign up|account/i)

	await signInWebsiteWithPhone(page, '1000000000')
	await expectActivityActionsSince(service, activityStartedAt, [
		'customer_signed_in',
	])
	await expect(page).toHaveURL(/\/market/, { timeout: 20_000 })
	await waitForHydration(page)
	await ensureWebsiteCartOpen(page)
	await expect(
		page.getByRole('button', { name: /^Save Draft$/i }),
	).toBeVisible()
	await submitWebsiteCart(page)
	const reference = await readVisibleReference(page, /submitted|sent/i)
	const customer = await expectCustomerByPhone(service, LOCAL_CUSTOMER.phone)
	await expectQuoteRequestByReference(
		service,
		reference,
		'submitted',
		customer.id,
	)

	const internalContext = await browser.newContext({
		viewport: { height: 900, width: 1200 },
	})
	await internalContext.addCookies(
		await createAuthCookies(
			{ email: LOCAL_CUSTOMER.email, password: LOCAL_CUSTOMER.password },
			URLS.internal,
			COOKIE_NAMES.internal,
		),
	)
	const internalPage = await internalContext.newPage()
	const internalGuard = installBrowserErrorGuard(internalPage)
	await internalPage.goto(URLS.internal, { waitUntil: 'domcontentloaded' })
	await waitForHydration(internalPage)
	await expect(internalPage).toHaveURL(/\/login/)
	await expect(internalPage.locator('body')).not.toContainText(
		/Local Admin|Sales Queue|Modules/i,
	)
	await expect(internalPage.locator('body')).toContainText(
		/login|employee|internal|access/i,
	)
	await internalGuard.expectClean('customer denied internal app')
	await internalContext.close()

	const driverPage = await context.newPage()
	const driverGuard = installBrowserErrorGuard(driverPage)
	await driverPage.goto(URLS.driver, { waitUntil: 'domcontentloaded' })
	await waitForHydration(driverPage)
	await driverPage.getByLabel(/email/i).fill(LOCAL_CUSTOMER.email)
	await driverPage.getByLabel(/password/i).fill(LOCAL_CUSTOMER.password)
	await driverPage.getByRole('button', { name: /sign in|enter|start/i }).click()
	await expect(driverPage.locator('body')).not.toContainText(/Local Driver/i)
	await expect(driverPage.locator('body')).toContainText(
		/driver|invalid|access|not authorized|sign in/i,
	)
	await driverGuard.expectClean('customer denied driver app')

	await guard.expectClean('website visitor cart sign-in')
	await context.close()
})

test('portal login, market draft, confirmed order detail, and repeated save-as-draft pass', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const service = createLocalServiceClient()
	const activityStartedAt = new Date().toISOString()
	const localCustomer = await expectCustomerByPhone(
		service,
		LOCAL_CUSTOMER.phone,
	)
	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)

	await signInPortalWithPhone(page, '1000000000')
	await expect(page).not.toHaveURL(/\/login/, { timeout: 25_000 })
	await expectActivityActionsSince(service, activityStartedAt, [
		'customer_signed_in',
	])

	await page.goto(`${URLS.portal}/market`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await addPortalProductToDraft(page)
	await page.getByRole('button', { name: /Draft Quote|Open cart/i }).click()
	await expect(page.getByRole('button', { name: /Save Draft/i })).toBeVisible()
	await savePortalCartDraft(page)
	const portalDraftReference = await readVisibleReference(page, /Draft saved/i)
	const portalDraft = await expectQuoteRequestByReference(
		service,
		portalDraftReference,
		'draft',
		localCustomer.id,
	)
	await expectQuoteRequestItemCount(service, portalDraft.id, 1)
	await expectDraftLifecycleEvents(service, {
		actions: ['draft_created', 'draft_saved', 'portal_draft_saved'],
		customerId: localCustomer.id,
		draftId: portalDraft.id,
		itemCount: 1,
		operation: 'create',
		requestNumber: portalDraftReference,
		source: 'portal',
	})

	await page.goto(`${URLS.portal}/market`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await addPortalProductToDraft(page)
	await page.getByRole('button', { name: /Draft Quote|Open cart/i }).click()
	await savePortalCartDraft(page)
	const abandonedDraftReference = await readVisibleReference(
		page,
		/Draft saved/i,
	)
	const abandonedDraft = await expectQuoteRequestByReference(
		service,
		abandonedDraftReference,
		'draft',
		localCustomer.id,
	)

	await page.goto(`${URLS.portal}/orders`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	const abandonedDraftCard = page
		.locator('article')
		.filter({ hasText: abandonedDraftReference })
	await expect(abandonedDraftCard).toBeVisible()
	await abandonedDraftCard.getByLabel(/^Delete$/i).click()
	await expect(
		abandonedDraftCard.getByRole('button', { name: /^Delete\?$/i }),
	).toBeVisible()
	await abandonedDraftCard.getByRole('button', { name: /^Cancel$/i }).click()
	await expect(abandonedDraftCard).toContainText(abandonedDraftReference)
	await abandonedDraftCard.getByLabel(/^Delete$/i).click()
	await abandonedDraftCard.getByRole('button', { name: /^Delete\?$/i }).click()
	await expect(page.locator('body')).not.toContainText(
		abandonedDraftReference,
		{
			timeout: 15_000,
		},
	)
	await expectQuoteRequestMissing(service, abandonedDraft.id)

	await expect(page.locator('body')).toContainText(portalDraftReference)
	await page
		.locator('article')
		.filter({ hasText: portalDraftReference })
		.getByRole('button', { name: /Review & Submit|مراجعة/i })
		.click()
	await expect(page).toHaveURL(/\/orders\/edit\/[0-9a-f-]+/)
	await page
		.getByRole('textbox', { name: /Quantity|Qty/i })
		.first()
		.fill('5')
	await page.getByRole('button', { name: /^Save$/i }).click()
	await expect.poll(() => quoteRequestQuantity(service, portalDraft.id)).toBe(5)
	await expectDraftLifecycleEvents(service, {
		actions: ['draft_updated', 'draft_saved', 'portal_draft_saved'],
		customerId: localCustomer.id,
		draftId: portalDraft.id,
		itemCount: 1,
		operation: 'update',
		requestNumber: portalDraftReference,
		source: 'portal',
	})
	const portalDraftSubmitStartedAt = new Date().toISOString()
	await page.getByRole('button', { name: /^Submit$/i }).click()
	await expect(page).toHaveURL(/\/orders$/)
	await expectQuoteRequestStatus(service, portalDraft.id, 'draft')
	const portalDraftSubmission = await latestCustomerSubmittedQuoteRequest(
		service,
		localCustomer.id,
		portalDraftSubmitStartedAt,
	)
	expect(portalDraftSubmission.draft_name).toBeNull()
	await expect
		.poll(() => quoteRequestQuantity(service, portalDraftSubmission.id))
		.toBe(5)

	await ensureDeliveredOrderForCustomer(service, localCustomer.id)
	const confirmed = await latestConfirmedOrder(service, localCustomer.id)
	await page.goto(`${URLS.portal}/orders/${confirmed.orderId}`, {
		waitUntil: 'domcontentloaded',
	})
	await waitForHydration(page)
	await expect(page.locator('body')).toContainText(confirmed.orderNumber)
	await expect(page.locator('body')).toContainText(/Reference|المرجع/i)
	await expect(page.locator('body')).toContainText(/Delivered|تم التسليم/i)

	await page.goto(`${URLS.portal}/orders/${confirmed.quoteRequestId}`, {
		waitUntil: 'domcontentloaded',
	})
	await waitForHydration(page)
	await expect(page.locator('body')).toContainText(confirmed.orderNumber)
	await expect(page.locator('body')).toContainText(/Reference|المرجع/i)

	const beforeStatus = await orderStatus(service, confirmed.orderId)
	const saveCopyStartedAt = new Date().toISOString()
	await page.getByRole('button', { name: /Save as Draft|حفظ كمسودة/i }).click()
	const firstSavedReference = await readVisibleReference(
		page,
		/Saved draft|تم حفظ/i,
	)
	await page.getByRole('button', { name: /Save as Draft|حفظ كمسودة/i }).click()
	await expect
		.poll(
			async () =>
				(
					await latestCustomerDrafts(
						service,
						localCustomer.id,
						2,
						saveCopyStartedAt,
					)
				).length,
			{ timeout: 15_000 },
		)
		.toBe(2)
	const drafts = await latestCustomerDrafts(
		service,
		localCustomer.id,
		2,
		saveCopyStartedAt,
	)
	expect(drafts).toHaveLength(2)
	expect(new Set(drafts.map((draft) => draft.id)).size).toBe(2)
	expect(
		drafts.some((draft) => draft.request_number === firstSavedReference),
	).toBe(true)
	for (const draft of drafts) {
		await expectQuoteRequestItemCount(service, draft.id, confirmed.itemCount)
		await expectQuoteRequestItemsEqual(
			service,
			draft.id,
			confirmed.quoteRequestId,
		)
		await expectQuoteRequestMetadataEqual(
			service,
			draft.id,
			confirmed.quoteRequestId,
		)
		await expectOrderSavedAsDraftSourceContext(service, {
			customerId: localCustomer.id,
			draftId: draft.id,
			draftRequestNumber: draft.request_number,
			sourceOrderId: confirmed.orderId,
			sourceQuoteRequestId: confirmed.quoteRequestId,
			sourceRequestNumber: confirmed.quoteRequestNumber,
			sourceStatus: confirmed.quoteRequestStatus,
		})
	}

	const copiedDraft = drafts[0]
	await page.goto(`${URLS.portal}/orders`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page.locator('body')).toContainText(copiedDraft.request_number)
	await page
		.locator('article')
		.filter({ hasText: copiedDraft.request_number })
		.getByRole('button', { name: /Review & Submit|مراجعة/i })
		.click()
	await expect(page).toHaveURL(/\/orders\/edit\/[0-9a-f-]+/)
	await page
		.getByRole('textbox', { name: /Quantity|Qty/i })
		.first()
		.fill('3')
	await page.getByRole('button', { name: /^Save$/i }).click()
	await expect.poll(() => quoteRequestQuantity(service, copiedDraft.id)).toBe(3)
	await expectQuoteRequestMetadataEqual(
		service,
		copiedDraft.id,
		confirmed.quoteRequestId,
	)
	const copiedDraftSubmitStartedAt = new Date().toISOString()
	await page.getByRole('button', { name: /^Submit$/i }).click()
	await expect(page).toHaveURL(/\/orders$/)
	await expectQuoteRequestStatus(service, copiedDraft.id, 'draft')
	const copiedDraftSubmission = await latestCustomerSubmittedQuoteRequest(
		service,
		localCustomer.id,
		copiedDraftSubmitStartedAt,
	)
	expect(copiedDraftSubmission.draft_name).toBeNull()
	await expect
		.poll(() => quoteRequestQuantity(service, copiedDraftSubmission.id))
		.toBe(3)
	await expectQuoteRequestMetadataEqual(
		service,
		copiedDraftSubmission.id,
		confirmed.quoteRequestId,
	)
	await expectOrderStatus(service, confirmed.orderId, beforeStatus)

	await guard.expectClean('portal login draft confirmed save-as-draft')
	await context.close()
})

async function waitForHydration(page: Page) {
	await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {
		return undefined
	})
	await page.waitForTimeout(600)
}

async function addWebsiteProductToCart(page: Page) {
	await page.goto(`${URLS.website}/market`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page
		.getByRole('button', { name: /Add to Quote/i })
		.first()
		.click()
	const popoverQuantity = page.getByRole('textbox', { name: /^Quantity$/i })
	await expect(popoverQuantity).toBeVisible()
	await page
		.getByRole('button', { name: /^Add to Quote$/i })
		.last()
		.click()
	await expect(popoverQuantity).toBeHidden({ timeout: 10_000 })
}

async function addPortalProductToDraft(page: Page) {
	await page
		.getByRole('button', { name: /^Record$/i })
		.first()
		.click()
	const quantity = page.getByRole('textbox', { name: /^Quantity$/i })
	await expect(quantity).toBeVisible({ timeout: 10_000 })
	await quantity.fill('2')
	await page
		.getByRole('button', { name: /^Record$/i })
		.last()
		.click()
	await expect(quantity).toBeHidden({ timeout: 10_000 })
}

async function ensureWebsiteCartOpen(page: Page) {
	const submitButton = page.getByRole('button', {
		name: /Request Quote|Submit/i,
	})
	if (
		!(await submitButton
			.first()
			.isVisible()
			.catch(() => false))
	) {
		await page.getByRole('button', { name: /quote cart/i }).click()
	}
	await expect(page.getByRole('button', { name: /^Save Draft$/i })).toBeVisible(
		{
			timeout: 10_000,
		},
	)
}

async function submitWebsiteCart(page: Page) {
	await page.getByRole('button', { name: /Request Quote|Submit/i }).click()
	const confirm = page.getByRole('button', { name: /^Send request$/i })
	if (await confirm.isVisible({ timeout: 2_000 }).catch(() => false)) {
		await confirm.click()
	}
}

async function saveWebsiteCartDraft(page: Page, name?: string) {
	const saveButton = page.getByRole('button', { name: /^Save Draft$/i })
	await saveButton.click()
	const nameInput = page.getByLabel(/Draft name/i)
	if (await nameInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
		if (name) await nameInput.fill(name)
		await saveButton.click()
	}
}

async function savePortalCartDraft(page: Page, name?: string) {
	const saveButton = page.getByRole('button', { name: /Save Draft/i })
	await saveButton.click()
	const nameInput = page.getByLabel(/Draft name/i)
	if (await nameInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
		if (name) await nameInput.fill(name)
		await saveButton.click()
	}
}

async function signInWebsiteWithPhone(page: Page, phone: string) {
	await page.goto(`${URLS.website}/login`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByLabel(/phone/i).fill(phone)
	await page.getByRole('button', { name: /whatsapp/i }).click()
	await expect(page.getByLabel(/digit 1/i)).toBeVisible({ timeout: 15_000 })
	await enterOtp(page, '123456')
}

async function signInPortalWithPhone(page: Page, phone: string) {
	await page.goto(`${URLS.portal}/login`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.locator('#atelier-phone').fill(phone, { timeout: 15_000 })
	await page.getByRole('button', { name: /whatsapp/i }).click()
	await expect(page.getByLabel('Verification digit 1')).toBeVisible({
		timeout: 15_000,
	})
	await page.getByLabel('Verification digit 1').click()
	await page.keyboard.type('123456')
}

async function enterOtp(page: Page, code: string) {
	for (const [index, digit] of [...code].entries()) {
		const input = page.getByLabel(new RegExp(`digit ${index + 1}`, 'i'))
		await input.fill(digit)
	}
}

async function readVisibleReference(page: Page, successText: RegExp) {
	await expect(page.locator('body')).toContainText(successText, {
		timeout: 20_000,
	})
	await expect
		.poll(
			async () => {
				const bodyText = await page.locator('body').innerText()
				return /\bQR-[A-Z0-9-]+\b/.exec(bodyText)?.[0] ?? ''
			},
			{ timeout: 30_000 },
		)
		.not.toBe('')
	const bodyText = await page.locator('body').innerText()
	const reference = /\bQR-[A-Z0-9-]+\b/.exec(bodyText)?.[0]
	expect(reference).toBeTruthy()
	return String(reference)
}

async function assertVisitorSupportTicket(
	service: ReturnType<typeof createLocalServiceClient>,
	browser: Browser,
) {
	const context = await browser.newContext({
		viewport: { height: 900, width: 1200 },
	})
	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)
	const email = `flow-visitor-${Date.now()}@hyperquote.local`

	await page.goto(`${URLS.website}/support`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByRole('button', { name: /^Send$/ }).click()
	await expect(page.locator('body')).toContainText(/valid|detail|character/i)
	await page.getByLabel('Name').fill('Flow2')
	await page.getByLabel('Email').fill('not-an-email')
	await page.getByLabel('Message').fill('short')
	await page.getByRole('button', { name: /^Send$/ }).click()
	await expect(page.locator('body')).toContainText(/valid email|detail/i)
	await page.getByLabel('Name').fill('Flow Visitor')
	await page.getByLabel('Email').fill(email)
	await page
		.getByLabel('Message')
		.fill('Final website visitor support ticket persistence check.')
	await page.getByRole('button', { name: /^Send$/ }).click()
	await expect(page.locator('body')).toContainText(/HQS-|Sent|success/i, {
		timeout: 15_000,
	})
	const ticket = await expectSupportTicketByEmail(service, email)
	expect(ticket.customer_id).toBeNull()

	await guard.expectClean('visitor support ticket')
	await context.close()
}

async function assertSignedInSupportTicket(
	service: ReturnType<typeof createLocalServiceClient>,
	page: Page,
	customerId: string,
) {
	const email = `flow-signed-in-${Date.now()}@hyperquote.local`
	await page.goto(`${URLS.website}/support`, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await page.getByLabel('Name').fill('Flow Signed In')
	await page.getByLabel('Email').fill(email)
	await page
		.getByLabel('Message')
		.fill('Final website signed-in support ticket customer link check.')
	await page.getByRole('button', { name: /^Send$/ }).click()
	await expect(page.locator('body')).toContainText(/HQS-|Sent|success/i, {
		timeout: 15_000,
	})
	const ticket = await expectSupportTicketByEmail(service, email)
	expect(ticket.customer_id).toBe(customerId)
}

async function expectSupportTicketByEmail(
	service: ReturnType<typeof createLocalServiceClient>,
	email: string,
) {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('support_tickets')
					.select('id')
					.eq('requester_email', email)
				if (error) return `error:${error.message}`
				return String(data?.length ?? 0)
			},
			{ timeout: 10_000 },
		)
		.toBe('1')
	const { data, error } = await service
		.from('support_tickets')
		.select('id, requester_email, customer_id')
		.eq('requester_email', email)
		.single()
	expect(error).toBeNull()
	return data
}

async function assertPublicCatalogBoundary() {
	const env = readLocalSupabaseEnv()
	const anon = createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const star = await anon.from('products').select('*').limit(1)
	expect(star.error?.code).toBe('42501')
	const hiddenColumn = await anon
		.from('products')
		.select('search_vector')
		.limit(1)
	expect(hiddenColumn.error?.code).toBe('42501')
	const safe = await anon
		.from('products')
		.select('id, slug, name, name_ar, unit_of_measure, unit_of_measure_ar')
		.limit(1)
	expect(safe.error?.code).toBe('42501')
	const supplierCost = await anon
		.from('supplier_product_links')
		.select('raw_cost')
		.limit(1)
	if (supplierCost.error) {
		expect(supplierCost.error.code).toBe('42501')
	} else {
		expect(supplierCost.data).toEqual([])
	}

	const customerCookies = await createAuthCookies(
		{ email: LOCAL_CUSTOMER.email, password: LOCAL_CUSTOMER.password },
		URLS.portal,
	)
	const customerClient = createServerClient(env.apiUrl, env.anonKey, {
		cookieOptions: { name: COOKIE_NAME, path: '/', sameSite: 'lax' },
		cookies: {
			getAll: () =>
				customerCookies.map((cookie) => ({
					name: cookie.name,
					value: cookie.value,
				})),
			setAll: () => undefined,
		},
	})
	const customerSupplierCost = await customerClient
		.from('supplier_product_links')
		.select('raw_cost')
		.limit(1)
	expect(customerSupplierCost.error?.code).toBe('42501')

	const expectedIndexes = [
		'products_name_ar_trgm_idx',
		'products_sku_trgm_idx',
		'products_description_trgm_idx',
		'products_description_ar_trgm_idx',
		'products_brand_trgm_idx',
	].sort()
	expect(readPublicIndexNames(expectedIndexes).sort()).toEqual(expectedIndexes)
}

async function firstActiveProduct(
	service: ReturnType<typeof createLocalServiceClient>,
) {
	const { data, error } = await service
		.from('products')
		.select('id, name, name_ar, category, unit_of_measure, unit_of_measure_ar')
		.eq('is_active', true)
		.neq('availability_status', 'hidden')
		.order('name')
		.limit(1)
		.single()
	expect(error).toBeNull()
	expect(data?.name_ar).toMatch(/[\u0600-\u06ff]/)
	const { data: category, error: categoryError } = await service
		.from('categories')
		.select('name')
		.eq('slug', data?.category ?? '')
		.single()
	expect(categoryError).toBeNull()
	return { ...data, categoryName: category?.name ?? String(data?.category) }
}

async function expectCustomerByPhone(
	service: ReturnType<typeof createLocalServiceClient>,
	phone: string,
) {
	const { data, error } = await service
		.from('customers')
		.select('id, user_id, phone')
		.eq('phone', phone)
		.single()
	expect(error).toBeNull()
	expect(data?.id).toBeTruthy()
	return data
}

async function expectCustomerByEmail(
	service: ReturnType<typeof createLocalServiceClient>,
	email: string,
) {
	const { data, error } = await service
		.from('customers')
		.select('id, user_id, phone, email')
		.eq('email', email)
		.single()
	expect(error).toBeNull()
	expect(data?.id).toBeTruthy()
	return data
}

async function expectQuoteRequestByReference(
	service: ReturnType<typeof createLocalServiceClient>,
	reference: string,
	status: string,
	customerId: string,
) {
	const { data, error } = await service
		.from('quote_requests')
		.select('id, request_number, status, customer_id')
		.eq('request_number', reference)
		.single()
	expect(error).toBeNull()
	expect(data?.status).toBe(status)
	expect(data?.customer_id).toBe(customerId)
	return data
}

async function expectQuoteRequestStatus(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	expectedStatus: string,
) {
	await expect
		.poll(async () => {
			const { data, error } = await service
				.from('quote_requests')
				.select('status')
				.eq('id', quoteRequestId)
				.single()
			if (error) return `error:${error.message}`
			return data?.status ?? ''
		})
		.toBe(expectedStatus)
}

async function expectQuoteRequestMissing(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
) {
	await expect
		.poll(async () => {
			const { data, error } = await service
				.from('quote_requests')
				.select('id')
				.eq('id', quoteRequestId)
				.maybeSingle()
			if (error) return `error:${error.message}`
			return data?.id ?? null
		})
		.toBeNull()
}

async function latestCustomerDraft(
	service: ReturnType<typeof createLocalServiceClient>,
	customerId: string,
) {
	const { data, error } = await service
		.from('quote_requests')
		.select('id, status, customer_id')
		.eq('customer_id', customerId)
		.eq('status', 'draft')
		.order('created_at', { ascending: false })
		.limit(1)
		.single()
	expect(error).toBeNull()
	return data
}

async function latestCustomerDrafts(
	service: ReturnType<typeof createLocalServiceClient>,
	customerId: string,
	limit: number,
	createdAfter?: string,
) {
	let query = service
		.from('quote_requests')
		.select('id, request_number, status, customer_id, created_at')
		.eq('customer_id', customerId)
		.eq('status', 'draft')
		.order('created_at', { ascending: false })
		.limit(limit)

	if (createdAfter) {
		query = query.gte('created_at', createdAfter)
	}

	const { data, error } = await query
	expect(error).toBeNull()
	return data ?? []
}

async function latestCustomerSubmittedQuoteRequest(
	service: ReturnType<typeof createLocalServiceClient>,
	customerId: string,
	createdAfter: string,
) {
	const { data, error } = await service
		.from('quote_requests')
		.select('id, request_number, status, customer_id, created_at, draft_name')
		.eq('customer_id', customerId)
		.eq('status', 'submitted')
		.gte('created_at', createdAfter)
		.order('created_at', { ascending: false })
		.limit(1)
		.single()
	expect(error).toBeNull()
	expect(data?.customer_id).toBe(customerId)
	return data
}

async function quoteRequestQuantity(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
) {
	const { data, error } = await service
		.from('quote_request_items')
		.select('quantity')
		.eq('quote_request_id', quoteRequestId)
		.order('sort_order', { ascending: true })
		.limit(1)
		.single()
	if (error) return -1
	return Number(data?.quantity ?? -1)
}

async function quoteRequestItemSnapshot(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
) {
	const { data, error } = await service
		.from('quote_request_items')
		.select(
			'customer_description, product_name_ar, quantity, unit_of_measure, unit_of_measure_ar, price_range_min, price_range_max, currency',
		)
		.eq('quote_request_id', quoteRequestId)
		.order('sort_order', { ascending: true })
		.limit(1)
		.single()
	expect(error).toBeNull()
	expect(data).toBeTruthy()
	return data
}

async function expectQuoteRequestItemCount(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	expectedCount: number,
) {
	const { count, error } = await service
		.from('quote_request_items')
		.select('id', { count: 'exact', head: true })
		.eq('quote_request_id', quoteRequestId)
	expect(error).toBeNull()
	expect(count).toBe(expectedCount)
}

async function quoteRequestItemsSnapshot(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
) {
	const { data, error } = await service
		.from('quote_request_items')
		.select(
			'product_id, customer_description, quantity, unit_of_measure, unit_of_measure_ar, notes, sort_order, is_unmatched',
		)
		.eq('quote_request_id', quoteRequestId)
		.order('sort_order', { ascending: true })
	expect(error).toBeNull()
	return (data ?? []).map((item) => ({
		customer_description: item.customer_description,
		is_unmatched: item.is_unmatched,
		notes: item.notes,
		product_id: item.product_id,
		quantity: Number(item.quantity),
		sort_order: item.sort_order,
		unit_of_measure: item.unit_of_measure,
		unit_of_measure_ar: item.unit_of_measure_ar,
	}))
}

async function expectQuoteRequestItemsEqual(
	service: ReturnType<typeof createLocalServiceClient>,
	actualQuoteRequestId: string,
	expectedQuoteRequestId: string,
) {
	await expect(
		await quoteRequestItemsSnapshot(service, actualQuoteRequestId),
	).toEqual(await quoteRequestItemsSnapshot(service, expectedQuoteRequestId))
}

async function quoteRequestMetadataSnapshot(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
) {
	const { data, error } = await service
		.from('quote_requests')
		.select(
			'urgency, project_id, delivery_address_id, delivery_date, attachment_urls, notes',
		)
		.eq('id', quoteRequestId)
		.single()
	expect(error).toBeNull()
	expect(data).toBeTruthy()
	return {
		attachment_urls: data?.attachment_urls ?? [],
		delivery_address_id: data?.delivery_address_id ?? null,
		delivery_date: data?.delivery_date ?? null,
		notes: data?.notes ?? null,
		project_id: data?.project_id ?? null,
		urgency: data?.urgency ?? null,
	}
}

async function expectQuoteRequestMetadataEqual(
	service: ReturnType<typeof createLocalServiceClient>,
	actualQuoteRequestId: string,
	expectedQuoteRequestId: string,
) {
	await expect(
		await quoteRequestMetadataSnapshot(service, actualQuoteRequestId),
	).toEqual(await quoteRequestMetadataSnapshot(service, expectedQuoteRequestId))
}

async function ensureDeliveredOrderForCustomer(
	service: ReturnType<typeof createLocalServiceClient>,
	customerId: string,
) {
	const product = await firstActiveProduct(service)
	const { data: quoteRequest, error: quoteRequestError } = await service
		.from('quote_requests')
		.insert({
			customer_id: customerId,
			notes: 'Flow final confirmed order fixture',
			status: 'approved',
			submitted_at: new Date().toISOString(),
			urgency: 'standard',
		})
		.select('id')
		.single()
	expect(quoteRequestError).toBeNull()
	expect(quoteRequest?.id).toBeTruthy()

	const { error: itemError } = await service
		.from('quote_request_items')
		.insert({
			customer_description: product.name,
			product_id: product.id,
			quote_request_id: quoteRequest?.id,
			quantity: 2,
			sort_order: 0,
			unit_of_measure: product.unit_of_measure,
			unit_of_measure_ar: product.unit_of_measure_ar,
		})
	expect(itemError).toBeNull()

	const { data: order, error: orderError } = await service
		.from('orders')
		.insert({
			customer_id: customerId,
			delivered_at: new Date().toISOString(),
			quote_request_id: quoteRequest?.id,
			status: 'delivered',
			total_amount: 1000,
		})
		.select('id')
		.single()
	expect(orderError).toBeNull()
	expect(order?.id).toBeTruthy()
}

async function latestConfirmedOrder(
	service: ReturnType<typeof createLocalServiceClient>,
	customerId: string,
) {
	const { data, error } = await service
		.from('orders')
		.select(
			'id, order_number, status, quote_request_id, quote_requests!inner(customer_id, request_number, status, quote_request_items(id))',
		)
		.eq('quote_requests.customer_id', customerId)
		.order('created_at', { ascending: false })
		.limit(1)
		.single()
	expect(error).toBeNull()
	expect(data?.id).toBeTruthy()
	expect(data?.quote_request_id).toBeTruthy()
	const relation = Array.isArray(data?.quote_requests)
		? data?.quote_requests[0]
		: data?.quote_requests
	return {
		itemCount: relation?.quote_request_items?.length ?? 0,
		orderId: data?.id ?? '',
		orderNumber: data?.order_number ?? '',
		quoteRequestId: data?.quote_request_id ?? '',
		quoteRequestNumber: relation?.request_number ?? '',
		quoteRequestStatus: relation?.status ?? '',
		status: data?.status ?? '',
	}
}

async function expectOrderSavedAsDraftSourceContext(
	service: ReturnType<typeof createLocalServiceClient>,
	expected: {
		customerId: string
		draftId: string
		draftRequestNumber: string
		sourceOrderId: string
		sourceQuoteRequestId: string
		sourceRequestNumber: string
		sourceStatus: string
	},
) {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('activity_events')
					.select('actor_customer_id, created_at, details')
					.eq('entity_type', 'quote_request')
					.eq('entity_id', expected.draftId)
					.eq('action', 'customer_order_saved_as_draft')
					.order('created_at', { ascending: false })
					.limit(1)
					.maybeSingle()
				if (error) return `error:${error.message}`
				if (!data) return ''
				const details = recordFrom(data.details)
				return [
					data.actor_customer_id,
					isIsoTimestamp(data.created_at) ? 'created_at' : 'missing_created_at',
					stringDetail(details, 'source'),
					stringDetail(details, 'source_quote_request_id'),
					stringDetail(details, 'source_order_id'),
					stringDetail(details, 'source_status'),
					stringDetail(details, 'source_request_number'),
					stringDetail(details, 'draft_request_number'),
				].join('|')
			},
			{ timeout: 15_000 },
		)
		.toBe(
			[
				expected.customerId,
				'created_at',
				'portal',
				expected.sourceQuoteRequestId,
				expected.sourceOrderId,
				expected.sourceStatus,
				expected.sourceRequestNumber,
				expected.draftRequestNumber,
			].join('|'),
		)
}

async function expectDraftLifecycleEvents(
	service: ReturnType<typeof createLocalServiceClient>,
	expected: {
		actions: string[]
		customerId: string
		draftId: string
		itemCount: number
		operation: 'create' | 'update'
		requestNumber: string
		source: 'portal' | 'website'
	},
) {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('activity_events')
					.select('action, actor_customer_id, created_at, details')
					.eq('entity_type', 'quote_request')
					.eq('entity_id', expected.draftId)
					.in('action', expected.actions)
				if (error) return `error:${error.message}`

				const matched = (data ?? []).filter((event) => {
					const details = recordFrom(event.details)
					return stringDetail(details, 'operation') === expected.operation
				})
				for (const action of expected.actions) {
					const event = matched.find((row) => row.action === action)
					if (!event) return `missing:${action}`
					const details = recordFrom(event.details)
					if (event.actor_customer_id !== expected.customerId) {
						return `${action}:actor`
					}
					if (!isIsoTimestamp(event.created_at)) {
						return `${action}:created_at`
					}
					if (stringDetail(details, 'source') !== expected.source) {
						return `${action}:source`
					}
					if (stringDetail(details, 'status') !== 'draft') {
						return `${action}:status`
					}
					if (
						stringDetail(details, 'request_number') !== expected.requestNumber
					) {
						return `${action}:request_number`
					}
					if (Number(details.item_count) !== expected.itemCount) {
						return `${action}:item_count`
					}
				}
				return 'ok'
			},
			{ timeout: 15_000 },
		)
		.toBe('ok')
}

async function expectSubmittedDraftEvents(
	service: ReturnType<typeof createLocalServiceClient>,
	expected: {
		customerId: string
		quoteRequestId: string
		requestNumber: string
		source: 'portal' | 'website'
	},
) {
	const actions = [
		'draft_submitted',
		'order_submitted',
		'quote_request_submitted',
	]
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('activity_events')
					.select('action, actor_customer_id, created_at, details')
					.eq('entity_type', 'quote_request')
					.eq('entity_id', expected.quoteRequestId)
					.in('action', actions)
				if (error) return `error:${error.message}`
				for (const action of actions) {
					const event = (data ?? []).find((row) => row.action === action)
					if (!event) return `missing:${action}`
					const details = recordFrom(event.details)
					if (event.actor_customer_id !== expected.customerId) {
						return `${action}:actor`
					}
					if (!isIsoTimestamp(event.created_at)) {
						return `${action}:created_at`
					}
					if (stringDetail(details, 'from_status') !== 'draft') {
						return `${action}:from_status`
					}
					if (stringDetail(details, 'to_status') !== 'submitted') {
						return `${action}:to_status`
					}
					if (stringDetail(details, 'source') !== expected.source) {
						return `${action}:source`
					}
					if (
						stringDetail(details, 'request_number') !== expected.requestNumber
					) {
						return `${action}:request_number`
					}
				}
				return 'ok'
			},
			{ timeout: 15_000 },
		)
		.toBe('ok')
}

async function orderStatus(
	service: ReturnType<typeof createLocalServiceClient>,
	orderId: string,
) {
	const { data, error } = await service
		.from('orders')
		.select('status')
		.eq('id', orderId)
		.single()
	expect(error).toBeNull()
	return data?.status ?? ''
}

async function expectOrderStatus(
	service: ReturnType<typeof createLocalServiceClient>,
	orderId: string,
	expectedStatus: string,
) {
	await expect.poll(() => orderStatus(service, orderId)).toBe(expectedStatus)
}

async function expectActivityActionsSince(
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
			{ timeout: 20_000 },
		)
		.toBe(expected)
}

async function createPasswordCustomer(
	service: ReturnType<typeof createLocalServiceClient>,
	input: {
		companyName: string
		contactName: string
		email: string
		password: string
		phone: string
	},
) {
	await resetCustomerByPhone(service, input.phone)
	const { data: userData, error: userError } =
		await service.auth.admin.createUser({
			app_metadata: { pool: 'external', roles: ['customer'] },
			email: input.email,
			email_confirm: true,
			password: input.password,
			phone: input.phone,
			phone_confirm: true,
			user_metadata: {
				company_name: input.companyName,
				name: input.contactName,
			},
		})
	expect(userError).toBeNull()
	expect(userData.user?.id).toBeTruthy()
	const { data, error } = await service
		.from('customers')
		.insert({
			company_name: input.companyName,
			contact_name: input.contactName,
			email: input.email,
			phone: input.phone,
			status: 'active',
			user_id: userData.user?.id,
		})
		.select('id')
		.single()
	expect(error).toBeNull()
	return { ...input, customerId: data?.id ?? '' }
}

async function resetCustomerByPhone(
	service: ReturnType<typeof createLocalServiceClient>,
	phone: string,
) {
	const normalizedPhone = phone.replace(/\D/g, '')
	const users = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
	expect(users.error).toBeNull()
	for (const user of users.data.users) {
		if ((user.phone ?? '').replace(/\D/g, '') === normalizedPhone) {
			const deleted = await service.auth.admin.deleteUser(user.id)
			expect(deleted.error).toBeNull()
		}
	}
	const deleted = await service.from('customers').delete().eq('phone', phone)
	if (!deleted.error) return
	await archiveCustomerPhone(service, phone)
}

async function resetCustomerByPhoneOrEmail(
	service: ReturnType<typeof createLocalServiceClient>,
	phone: string,
	email: string,
) {
	const normalizedPhone = phone.replace(/\D/g, '')
	const normalizedEmail = email.toLowerCase()
	const users = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
	expect(users.error).toBeNull()
	for (const user of users.data.users) {
		const userPhone = (user.phone ?? '').replace(/\D/g, '')
		const userEmail = (user.email ?? '').toLowerCase()
		const metadataPhone =
			typeof user.user_metadata?.phone === 'string'
				? user.user_metadata.phone.replace(/\D/g, '')
				: ''
		if (
			userPhone === normalizedPhone ||
			userEmail === normalizedEmail ||
			metadataPhone === normalizedPhone
		) {
			const deleted = await service.auth.admin.deleteUser(user.id)
			expect(deleted.error).toBeNull()
		}
	}
	const phoneDeleted = await service
		.from('customers')
		.delete()
		.eq('phone', phone)
	if (phoneDeleted.error) await archiveCustomerPhone(service, phone)
	await service.from('customers').delete().eq('email', email)
}

async function archiveCustomerPhone(
	service: ReturnType<typeof createLocalServiceClient>,
	phone: string,
) {
	const { data, error } = await service
		.from('customers')
		.select('id')
		.eq('phone', phone)
	expect(error).toBeNull()
	for (const [index, customer] of (data ?? []).entries()) {
		const archived = await service
			.from('customers')
			.update({
				phone: `${phone}:archived:${Date.now()}:${index}`,
				status: 'inactive',
				user_id: null,
			})
			.eq('id', customer.id)
		expect(archived.error).toBeNull()
	}
}

async function latestInbucketConfirmationUrl(email: string) {
	return latestInbucketUrl(email, {
		description: 'confirmation URL',
		matches: (message) =>
			JSON.stringify(message).toLowerCase().includes(email.toLowerCase()),
	})
}

async function latestInbucketRecoveryUrl(email: string) {
	const normalizedEmail = email.toLowerCase()
	return latestInbucketUrl(email, {
		description: 'password recovery URL',
		matches: (message) => {
			const raw = JSON.stringify(message).toLowerCase()
			return (
				raw.includes(normalizedEmail) &&
				raw.includes('reset your hyperquote password')
			)
		},
	})
}

async function latestInbucketUrl(
	email: string,
	options: { description: string; matches: (message: unknown) => boolean },
) {
	let messageId = ''
	await expect
		.poll(
			async () => {
				const payload = await localInbucketJson('/api/v1/messages')
				if (!payload) return ''
				const messages = recordsFrom(payload, 'messages')
				const match = messages.find(options.matches)
				messageId = stringField(match, 'id')
				return messageId
			},
			{ timeout: 25_000 },
		)
		.not.toBe('')

	for (const path of [`message/${messageId}`, `messages/${messageId}`]) {
		const detail = await localInbucketJson(`/api/v1/${path}`)
		if (!detail) continue
		const confirmationUrl = confirmationUrlFromMessage(detail)
		if (confirmationUrl) return confirmationUrl
	}

	throw new Error(`No ${options.description} found for ${email}`)
}

function localInbucketUrl(path: string): URL {
	const url = new URL(path, 'http://127.0.0.1:54324')
	if (url.hostname !== '127.0.0.1' || url.port !== '54324') {
		throw new Error('Inbucket URL must stay local')
	}
	return url
}

async function localInbucketJson(path: string): Promise<unknown | null> {
	const url = localInbucketUrl(path)
	return new Promise((resolve, reject) => {
		const request = httpGet(url, (response) => {
			if (
				!response.statusCode ||
				response.statusCode < 200 ||
				response.statusCode >= 300
			) {
				response.resume()
				resolve(null)
				return
			}
			response.setEncoding('utf8')
			let body = ''
			response.on('data', (chunk) => {
				body += chunk
			})
			response.on('end', () => {
				try {
					resolve(JSON.parse(body) as unknown)
				} catch (error) {
					reject(error)
				}
			})
		})
		request.on('error', reject)
	})
}

function recordsFrom(payload: unknown, key: string): unknown[] {
	if (!payload || typeof payload !== 'object') return []
	const value = (payload as Record<string, unknown>)[key]
	return Array.isArray(value) ? value : []
}

function recordFrom(payload: unknown): Record<string, unknown> {
	if (!payload || typeof payload !== 'object') return {}
	return payload as Record<string, unknown>
}

function stringDetail(payload: Record<string, unknown>, key: string): string {
	const value = payload[key]
	if (typeof value === 'string') return value
	if (typeof value === 'number') return String(value)
	return ''
}

function stringField(payload: unknown, key: string): string {
	if (!payload || typeof payload !== 'object') return ''
	const record = payload as Record<string, unknown>
	const value = record[key] ?? record[key.toUpperCase()]
	if (typeof value === 'string') return value
	if (typeof value === 'number') return String(value)
	return ''
}

function phoneDigits(value: string | null | undefined): string {
	return (value ?? '').replace(/\D/g, '')
}

function isIsoTimestamp(value: unknown) {
	if (typeof value !== 'string') return false
	return !Number.isNaN(Date.parse(value))
}

function confirmationUrlFromMessage(message: unknown): string {
	const raw = JSON.stringify(message)
	const match =
		/https?:\/\/[^"'<>\s]+\/auth\/v1\/verify[^"'<>\s]+/i.exec(raw) ??
		/https?:\/\/[^"'<>\s]+token_hash=[^"'<>\s]+/i.exec(raw)
	return match?.[0]?.replaceAll('\\u0026', '&').replaceAll('&amp;', '&') ?? ''
}

async function openConfirmationUrl(page: Page, confirmationUrl: string) {
	let lastError: unknown
	for (let attempt = 0; attempt < 3; attempt += 1) {
		try {
			await page.goto(confirmationUrl, { waitUntil: 'domcontentloaded' })
			return
		} catch (error) {
			lastError = error
			await page.waitForTimeout(750)
		}
	}
	throw lastError
}

async function createAuthCookies(
	account: { email: string; password: string },
	url: string,
	cookieName = COOKIE_NAME,
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
	if (error) throw new Error(`Could not seed ${COOKIE_NAME}: ${error.message}`)

	const nowSeconds = Math.floor(Date.now() / 1000)
	return cookieJar.map((cookie) => ({
		expires: nowSeconds + (cookie.options?.maxAge ?? 3600),
		name: cookie.name,
		sameSite: 'Lax' as const,
		url,
		value: cookie.value,
	}))
}

function installBrowserErrorGuard(page: Page) {
	const browserErrors: string[] = []

	page.on('console', (message) => {
		if (message.type() !== 'error') return
		const text = message.text()
		if (isIgnorableBrowserNoise(text)) return
		browserErrors.push(text)
	})

	page.on('pageerror', (error) => {
		browserErrors.push(error.message)
	})

	page.on('requestfailed', (request) => {
		const failure = request.failure()
		const errorText = failure?.errorText ?? 'request failed'
		if (errorText.includes('ERR_ABORTED')) return
		if (isIgnorableBrowserNoise(`${request.url()} ${errorText}`)) return
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

function isIgnorableBrowserNoise(text: string) {
	return (
		text.includes('ERR_NETWORK_CHANGED') &&
		/(websiteassets\.hyperquote\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)/i.test(
			text,
		)
	)
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
	const dbUrl = env.DB_URL
	const serviceRoleKey = env.SERVICE_ROLE_KEY
	if (!apiUrl || !anonKey || !dbUrl || !serviceRoleKey) {
		throw new Error('Could not read local Supabase URL/API keys.')
	}
	return { anonKey, apiUrl, dbUrl, serviceRoleKey }
}

function stripEnvQuotes(value: string) {
	if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
	return value
}

function createLocalServiceClient() {
	const env = readLocalSupabaseEnv()
	return createClient(env.apiUrl, env.serviceRoleKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
}

function createLocalAnonClient() {
	const env = readLocalSupabaseEnv()
	return createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
}

async function createLocalCustomerClient() {
	const env = readLocalSupabaseEnv()
	const client = createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const { data, error } = await client.auth.signInWithPassword({
		email: LOCAL_CUSTOMER.email,
		password: LOCAL_CUSTOMER.password,
	})
	if (error)
		throw new Error(`Could not sign in local customer: ${error.message}`)
	return createActorFlowClient(client, createLocalServiceClient(), {
		actorPool: 'external',
		actorUserId: data.user.id,
	})
}

function readPublicIndexNames(indexNames: string[]) {
	const env = readLocalSupabaseEnv()
	const query = `
		select indexname
		from pg_indexes
		where schemaname = 'public'
			and indexname = any(array[${indexNames.map(sqlString).join(', ')}])
		order by indexname;
	`
	const result = spawnSync('psql', [env.dbUrl, '-qAtc', query], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.status !== 0) {
		throw new Error(result.stderr.trim() || 'Could not inspect pg_indexes.')
	}
	return result.stdout
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
}

function sqlString(value: string) {
	return `'${value.replaceAll("'", "''")}'`
}
