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

interface ProductRow {
	id: string
	name: string
	price_range_max: number | null
	price_range_min: number | null
	slug: string
	unit_of_measure: string
	unit_of_measure_ar: string
}

interface SubmittedQuoteFixture {
	customerName: string
	id: string
	originalQuantity: number
	productA: ProductRow
	productB: ProductRow
	requestNumber: string
	runId: string
}

interface SalesPageHandle {
	context: Awaited<ReturnType<Browser['newContext']>>
	guard: ReturnType<typeof installBrowserErrorGuard>
	page: Page
}

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')

const URLS = {
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
	portal: process.env.FLOW_PORTAL_URL ?? 'http://localhost:3001',
}

const COOKIE_NAMES = {
	internal: 'hyperquote_internal_auth',
}

const LOCAL_CUSTOMER = {
	email: 'local-customer@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

const LOCAL_SALES = {
	email: 'local-sales@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

const LOCAL_MANAGER = {
	email: 'local-manager@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}

const LOCAL_MANUAL_CLAIM_PHONE = {
	full: '+201011111111',
	national: '1011111111',
}

test.describe.configure({ mode: 'serial' })

test('submitted order reaches sales queue and quote builder can call, edit, save version, and confirm', async ({
	browser,
}) => {
	test.setTimeout(240_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const customer = await signInLocal(env, LOCAL_CUSTOMER)
	const salesAuth = await signInLocal(env, LOCAL_SALES)
	const salesEmployeeId = await employeeIdByEmail(service, LOCAL_SALES.email)
	await deferAssignedFlowTestWork(service, [{ employeeId: salesEmployeeId }])
	const fixture = await createSubmittedQuoteRequest({
		customerClient: customer.client,
		service,
		variant: 'confirm',
	})
	await setQuoteRequestQueueTimes(
		service,
		fixture.id,
		'1950-01-01T00:00:00.000Z',
	)
	const originalItems = await quoteRequestItems(service, fixture.id)
	expect(originalItems).toEqual([
		expect.objectContaining({
			product_id: fixture.productA.id,
			quantity: fixture.originalQuantity,
		}),
	])
	await setSalesPresence(salesAuth.client, 'online')
	const claimed = await salesAuth.client.rpc('sales_claim_order', {
		p_order_id: fixture.id,
	})
	expect(claimed.error).toBeNull()

	const sales = await openSalesPage(browser)
	try {
		await expectSalesAutoOpened(sales.page, service, fixture, LOCAL_SALES.email)

		const callNote = `Flow sales call reached customer ${fixture.runId}`
		await sales.page
			.getByRole('button', {
				name: `Call ${fixture.customerName}`,
			})
			.click()
		await expect(
			sales.page.getByRole('dialog', { name: /record call/i }),
		).toBeVisible()
		await sales.page.getByRole('combobox').selectOption('reached_customer')
		await sales.page.getByPlaceholder(/What happened/i).fill(callNote)
		await sales.page.getByRole('button', { name: /Record outcome/i }).click()
		await expect(sales.page.locator('body')).toContainText(
			/Call outcome recorded/i,
			{
				timeout: 20_000,
			},
		)
		await expectSalesCallNote(service, fixture.id, callNote, salesEmployeeId)

		await sales.page
			.getByRole('button', {
				name: `Edit ${fixture.productA.name}`,
			})
			.click()
		const quantityInput = sales.page.getByLabel(
			`Quantity for ${fixture.productA.name}`,
		)
		await expect(quantityInput).toBeVisible({ timeout: 20_000 })
		await quantityInput.fill('7')
		await sales.page.keyboard.press('Escape')
		await expect(
			sales.page.getByRole('button', {
				name: `Edit ${fixture.productA.name}, quantity 7`,
			}),
		).toBeVisible({ timeout: 20_000 })

		await sales.page.getByRole('button', { name: /^\+ADD$/ }).click()
		await expect(
			sales.page.getByRole('dialog', { name: /search catalog/i }),
		).toBeVisible()
		await sales.page
			.getByRole('textbox', { name: /search catalog/i })
			.fill(fixture.productB.name)
		await sales.page
			.getByRole('button', {
				name: `Add ${fixture.productB.name}`,
			})
			.click()
		await sales.page.locator(`#catalog-qty-${fixture.productB.id}`).fill('4')
		await sales.page.getByRole('button', { name: /^Apply$/ }).click()
		await expect(sales.page.locator('body')).toContainText(
			fixture.productB.name,
		)

		await sales.page
			.getByRole('button', {
				name: `Remove ${fixture.productA.name}`,
			})
			.click()
		await expect(sales.page.locator('body')).not.toContainText(
			fixture.productA.name,
		)
		await expect(sales.page.locator('body')).toContainText(
			fixture.productB.name,
		)

		await sales.page.getByRole('button', { name: /Review & submit/i }).click()
		await sendReviewedQuoteToFinance(sales.page)
		await expectConfirmedOrder(service, fixture.id)
		const quoteVersion = await expectSalesQuoteVersion(
			service,
			fixture,
			{
				finalProductId: fixture.productB.slug,
				finalQuantity: 4,
				removedProductId: fixture.productA.slug,
			},
			salesEmployeeId,
		)
		await expectQuoteRequestOriginalPreserved(service, fixture)
		await expectActivityActions(service, fixture.id, [
			'sales_order_claimed',
			'sales_order_opened',
			'sales_customer_called',
			'sales_call_note_recorded',
			'sales_quote_edited',
			'sales_quote_draft_saved',
			'sales_order_confirmed',
		])
		await expectSalesActivityAuditContext(
			service,
			fixture.id,
			salesEmployeeId,
			[
				{
					action: 'sales_order_claimed',
					details: {
						employee_id: salesEmployeeId,
						from_status: 'submitted',
						to_status: 'assigned',
					},
				},
				{
					action: 'sales_order_opened',
					details: {
						employee_id: salesEmployeeId,
						from_status: 'submitted',
						to_status: 'assigned',
					},
				},
				{
					action: 'sales_customer_called',
					details: {
						employee_id: salesEmployeeId,
						notes: callNote,
						outcome: 'reached_customer',
					},
				},
				{
					action: 'sales_call_note_recorded',
					details: {
						employee_id: salesEmployeeId,
						notes: callNote,
						outcome: 'reached_customer',
					},
				},
				{
					action: 'sales_quote_draft_saved',
					details: {
						employee_id: salesEmployeeId,
						item_count: 1,
						quote_version_id: quoteVersion.id,
						total: quoteVersion.total,
					},
				},
				{
					action: 'sales_quote_edited',
					details: {
						employee_id: salesEmployeeId,
						item_count: 1,
						quote_version_id: quoteVersion.id,
						total: quoteVersion.total,
					},
				},
				{
					action: 'sales_order_confirmed',
					details: {
						employee_id: salesEmployeeId,
						order_status: 'confirmed_for_inventory',
						quote_version_id: quoteVersion.id,
						to_status: 'approved',
						total_amount: quoteVersion.total,
					},
				},
			],
		)
		await sales.guard.expectClean('internal sales confirm flow')
	} finally {
		await sales.context.close()
	}
})

test('sales pipeline auto-claims, prevents duplicate assignment, and saves with a delayed return', async ({
	browser,
}) => {
	test.setTimeout(300_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const customer = await signInLocal(env, LOCAL_CUSTOMER)
	const sales = await signInLocal(env, LOCAL_SALES)
	const manager = await signInLocal(env, LOCAL_MANAGER)
	const salesEmployeeId = await employeeIdByEmail(service, LOCAL_SALES.email)
	const managerEmployeeId = await employeeIdByEmail(
		service,
		LOCAL_MANAGER.email,
	)
	await deferAssignedFlowTestWork(service, [
		{ employeeId: salesEmployeeId },
		{ employeeId: managerEmployeeId },
	])

	const autoFixture = await createSubmittedQuoteRequest({
		customerClient: customer.client,
		service,
		variant: 'auto-claim',
	})
	await setQuoteRequestQueueTimes(
		service,
		autoFixture.id,
		'1970-01-01T00:00:00.000Z',
	)

	const salesPage = await openSalesPage(browser)
	try {
		await expectQuoteAssignedToSales(service, autoFixture.id, LOCAL_SALES.email)
		await expect(salesPage.page.locator('body')).toContainText(
			autoFixture.customerName,
			{ timeout: 30_000 },
		)
		await expect(salesPage.page.locator('body')).toContainText(
			autoFixture.productA.name,
		)
		await expectClaimActivityDetails(service, autoFixture.id, {
			employeeId: salesEmployeeId,
			sourceQueuePosition: 1,
		})

		await salesPage.page
			.getByRole('button', { name: /Save for later/i })
			.click()
		await expect(salesPage.page.locator('body')).toContainText(
			/Come back when/i,
			{ timeout: 20_000 },
		)
		await salesPage.page
			.getByRole('button', { name: /Return in 30 min/i })
			.click()
		await expect(
			salesPage.page.getByRole('dialog', { name: /come back when/i }),
		).toBeHidden({ timeout: 20_000 })
		await expect
			.poll(() => quoteRequestStatusRow(service, autoFixture.id), {
				timeout: 20_000,
			})
			.toMatchObject({
				assigned_at: null,
				assigned_employee_id: null,
				status: 'submitted',
			})
		const savedAuto = await quoteRequestStatusRow(service, autoFixture.id)
		expect(savedAuto.status).toBe('submitted')
		expect(savedAuto.assigned_employee_id).toBeNull()
		expect(savedAuto.assigned_at).toBeNull()
		expect(new Date(savedAuto.eligible_at).getTime()).toBeGreaterThan(
			Date.now() + 25 * 60_000,
		)
		await expectRequeueActivityDetails(service, autoFixture.id, {
			employeeId: salesEmployeeId,
			returnMinutes: 30,
		})
		await salesPage.guard.expectClean('sales auto-claim and save delay')
	} finally {
		await salesPage.context.close()
	}

	await setSalesPresence(sales.client, 'online')
	await setSalesPresence(manager.client, 'online')

	const first = await createSubmittedQuoteRequest({
		customerClient: customer.client,
		service,
		variant: 'concurrent-first',
	})
	const second = await createSubmittedQuoteRequest({
		customerClient: customer.client,
		service,
		variant: 'concurrent-second',
	})
	await setQuoteRequestQueueTimes(service, first.id, '1971-01-01T00:00:00.000Z')
	await setQuoteRequestQueueTimes(
		service,
		second.id,
		'1971-01-01T00:00:01.000Z',
	)
	const [firstClaim, secondClaim] = await Promise.all([
		sales.client.rpc('claim_next_sales_order'),
		manager.client.rpc('claim_next_sales_order'),
	])
	expect(firstClaim.error).toBeNull()
	expect(secondClaim.error).toBeNull()
	const claimedIds = [firstClaim.data?.id, secondClaim.data?.id].sort()
	expect(claimedIds).toEqual([first.id, second.id].sort())
	expect(new Set(claimedIds).size).toBe(2)
	await expectClaimActivityDetails(service, first.id, {
		sourceQueuePosition: 1,
	})
	await expectClaimActivityDetails(service, second.id, {
		sourceQueuePositions: [1, 2],
	})

	const sourceFirst = await createSubmittedQuoteRequest({
		customerClient: customer.client,
		service,
		variant: 'source-position-first',
	})
	const sourceSecond = await createSubmittedQuoteRequest({
		customerClient: customer.client,
		service,
		variant: 'source-position-second',
	})
	await setQuoteRequestQueueTimes(
		service,
		sourceFirst.id,
		'1971-02-01T00:00:00.000Z',
	)
	await setQuoteRequestQueueTimes(
		service,
		sourceSecond.id,
		'1971-02-01T00:00:01.000Z',
	)
	const sourceSecondClaim = await manager.client.rpc('sales_claim_order', {
		p_order_id: sourceSecond.id,
	})
	expect(sourceSecondClaim.error).toBeNull()
	await expectClaimActivityDetails(service, sourceSecond.id, {
		sourceQueuePosition: 2,
	})
	const sourceFirstClaim = await sales.client.rpc('sales_claim_order', {
		p_order_id: sourceFirst.id,
	})
	expect(sourceFirstClaim.error).toBeNull()
	await expectClaimActivityDetails(service, sourceFirst.id, {
		sourceQueuePosition: 1,
	})

	const duplicate = await createSubmittedQuoteRequest({
		customerClient: customer.client,
		service,
		variant: 'duplicate-claim',
	})
	await setQuoteRequestQueueTimes(
		service,
		duplicate.id,
		'1972-01-01T00:00:00.000Z',
	)
	const duplicateClaims = await Promise.all([
		sales.client.rpc('sales_claim_order', { p_order_id: duplicate.id }),
		manager.client.rpc('sales_claim_order', { p_order_id: duplicate.id }),
	])
	const duplicateSuccesses = duplicateClaims.filter((claim) => !claim.error)
	const duplicateFailures = duplicateClaims.filter((claim) => claim.error)
	expect(duplicateSuccesses).toHaveLength(1)
	expect(duplicateFailures).toHaveLength(1)
	expect(duplicateFailures[0]?.error?.message).toMatch(
		/invalid_sales_claim_transition_assigned|quote_request_assigned_to_another_employee/,
	)
	const duplicateRow = await quoteRequestStatusRow(service, duplicate.id)
	expect(duplicateRow.status).toBe('assigned')
	expect(duplicateRow.assigned_employee_id).toBeTruthy()

	const olderSubmitted = await createSubmittedQuoteRequest({
		customerClient: customer.client,
		service,
		variant: 'older-submitted',
	})
	const delayed = await createSubmittedQuoteRequest({
		customerClient: customer.client,
		service,
		variant: 'delayed-return',
	})
	await setQuoteRequestQueueTimes(
		service,
		delayed.id,
		'1973-01-01T00:00:00.000Z',
	)
	await setQuoteRequestQueueTimes(
		service,
		olderSubmitted.id,
		'1974-01-01T00:00:00.000Z',
	)
	const delayedClaim = await sales.client.rpc('sales_claim_order', {
		p_order_id: delayed.id,
	})
	expect(delayedClaim.error).toBeNull()
	const delayedSave = await sales.client.rpc('sales_save_and_requeue', {
		p_note: `Flow delayed return ${delayed.runId}`,
		p_order_id: delayed.id,
		p_return_minutes: 1,
	})
	expect(delayedSave.error).toBeNull()
	const earlyClaim = await manager.client.rpc('sales_claim_order', {
		p_order_id: delayed.id,
	})
	expect(earlyClaim.error?.message).toContain(
		'invalid_sales_claim_transition_submitted',
	)
	await setQuoteRequestEligibleAt(
		service,
		delayed.id,
		'1975-01-01T00:00:00.000Z',
	)
	const olderClaim = await manager.client.rpc('claim_next_sales_order')
	expect(olderClaim.error).toBeNull()
	expect(olderClaim.data?.id).toBe(olderSubmitted.id)
	const delayedReturnClaim = await sales.client.rpc('claim_next_sales_order')
	expect(delayedReturnClaim.error).toBeNull()
	expect(delayedReturnClaim.data?.id).toBe(delayed.id)

	await setSalesPresence(sales.client, 'offline')
	await setSalesPresence(manager.client, 'offline')
	const noOnline = await createSubmittedQuoteRequest({
		customerClient: customer.client,
		service,
		variant: 'no-sales-online',
	})
	await setQuoteRequestQueueTimes(
		service,
		noOnline.id,
		'1976-01-01T00:00:00.000Z',
	)
	await new Promise((resolve) => setTimeout(resolve, 1_000))
	const noOnlineRow = await quoteRequestStatusRow(service, noOnline.id)
	expect(noOnlineRow.status).toBe('submitted')
	expect(noOnlineRow.assigned_employee_id).toBeNull()
	expect(noOnlineRow.assigned_at).toBeNull()

	const offlineClaim = await sales.client.rpc('claim_next_sales_order')
	expect(offlineClaim.error).toBeNull()
	expect(offlineClaim.data?.id ?? null).toBeNull()
	await expect
		.poll(() => quoteRequestStatusRow(service, noOnline.id), {
			timeout: 10_000,
		})
		.toMatchObject({
			assigned_at: null,
			assigned_employee_id: null,
			status: 'submitted',
		})

	await setSalesPresence(manager.client, 'online')
	const cleanupClaim = await manager.client.rpc('sales_claim_order', {
		p_order_id: noOnline.id,
	})
	expect(cleanupClaim.error).toBeNull()
	await expectQuoteAssignedToEmployeeId(service, noOnline.id, managerEmployeeId)
})

test('sales quote builder can reject a submitted order with required proof', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const customer = await signInLocal(env, LOCAL_CUSTOMER)
	const salesAuth = await signInLocal(env, LOCAL_SALES)
	const salesEmployeeId = await employeeIdByEmail(service, LOCAL_SALES.email)
	await deferAssignedFlowTestWork(service, [{ employeeId: salesEmployeeId }])
	const fixture = await createSubmittedQuoteRequest({
		customerClient: customer.client,
		service,
		variant: 'reject',
	})
	await setQuoteRequestQueueTimes(
		service,
		fixture.id,
		'1951-01-01T00:00:00.000Z',
	)
	await setSalesPresence(salesAuth.client, 'online')
	const claim = await salesAuth.client.rpc('sales_claim_order', {
		p_order_id: fixture.id,
	})
	expect(claim.error).toBeNull()
	const rejectNote = `Flow reject proof ${fixture.runId}`

	const sales = await openSalesPage(browser)
	try {
		await expectSalesAutoOpened(sales.page, service, fixture, LOCAL_SALES.email)
		await sales.page.getByRole('button', { name: /Reject quote/i }).click()
		await expect(
			sales.page.getByRole('dialog', { name: /Decline RFQ/i }),
		).toBeVisible()
		await expect(
			sales.page
				.getByRole('dialog', { name: /Decline RFQ/i })
				.getByRole('button', { name: /^Decline$/ }),
		).toBeDisabled()
		await sales.page.getByRole('button', { name: /Select a reason/i }).click()
		await sales.page
			.getByRole('option', { name: /Cannot source requested materials/i })
			.click()
		await sales.page.getByRole('button', { name: /^Decline$/ }).click()
		await sales.page.getByRole('button', { name: /Confirm decline/i }).click()
		await expect(sales.page.locator('body')).toContainText(
			/rejection_proof_required/i,
		)
		await expectQuoteRequestStatus(service, fixture.id, 'assigned')
		await sales.page.getByRole('button', { name: /Go back/i }).click()
		await sales.page.getByPlaceholder(/Additional context/i).fill(rejectNote)
		await sales.page.getByRole('button', { name: /^Decline$/ }).click()
		await sales.page.getByRole('button', { name: /Confirm decline/i }).click()
		await expectQuoteRequestStatus(service, fixture.id, 'rejected')
		await expectActivityActions(service, fixture.id, [
			'sales_order_claimed',
			'sales_order_opened',
			'sales_order_rejected',
		])
		await expectSalesActivityAuditContext(
			service,
			fixture.id,
			salesEmployeeId,
			[
				{
					action: 'sales_order_claimed',
					details: {
						employee_id: salesEmployeeId,
						from_status: 'submitted',
						to_status: 'assigned',
					},
				},
				{
					action: 'sales_order_opened',
					details: {
						employee_id: salesEmployeeId,
						from_status: 'submitted',
						to_status: 'assigned',
					},
				},
				{
					action: 'sales_order_rejected',
					details: {
						employee_id: salesEmployeeId,
						proof: { note: rejectNote },
						reason: 'cannot_source',
						to_status: 'rejected',
					},
				},
			],
		)
		await sales.guard.expectClean('internal sales reject flow')
	} finally {
		await sales.context.close()
	}
})

test('sales quote builder can cancel a submitted order with required reason', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const customer = await signInLocal(env, LOCAL_CUSTOMER)
	const salesAuth = await signInLocal(env, LOCAL_SALES)
	const salesEmployeeId = await employeeIdByEmail(service, LOCAL_SALES.email)
	await deferAssignedFlowTestWork(service, [{ employeeId: salesEmployeeId }])
	const fixture = await createSubmittedQuoteRequest({
		customerClient: customer.client,
		service,
		variant: 'cancel',
	})
	await setQuoteRequestQueueTimes(
		service,
		fixture.id,
		'1952-01-01T00:00:00.000Z',
	)
	await setSalesPresence(salesAuth.client, 'online')
	const claim = await salesAuth.client.rpc('sales_claim_order', {
		p_order_id: fixture.id,
	})
	expect(claim.error).toBeNull()
	const cancelReason = `Customer duplicated request ${fixture.runId}`
	const cancelNote = `Flow cancel note ${fixture.runId}`

	const sales = await openSalesPage(browser)
	try {
		await expectSalesAutoOpened(sales.page, service, fixture, LOCAL_SALES.email)
		await sales.page.getByRole('button', { name: /Cancel quote/i }).click()
		await expect(
			sales.page.getByRole('dialog', { name: /Cancel quote/i }),
		).toBeVisible()
		await sales.page.getByPlaceholder(/Customer canceled/i).fill(cancelReason)
		await sales.page.getByPlaceholder(/Additional context/i).fill(cancelNote)
		const cancelDialog = sales.page.getByRole('dialog', {
			name: /Cancel quote/i,
		})
		await cancelDialog.getByRole('button', { name: /^Cancel quote$/ }).click()
		await sales.page
			.getByRole('dialog', { name: /Confirm cancel/i })
			.getByRole('button', { name: /Confirm cancel/i })
			.click()
		await expectQuoteRequestStatus(service, fixture.id, 'canceled')
		await expectActivityActions(service, fixture.id, [
			'sales_order_claimed',
			'sales_order_opened',
			'sales_order_canceled',
		])
		await expectSalesActivityAuditContext(
			service,
			fixture.id,
			salesEmployeeId,
			[
				{
					action: 'sales_order_claimed',
					details: {
						employee_id: salesEmployeeId,
						from_status: 'submitted',
						to_status: 'assigned',
					},
				},
				{
					action: 'sales_order_opened',
					details: {
						employee_id: salesEmployeeId,
						from_status: 'submitted',
						to_status: 'assigned',
					},
				},
				{
					action: 'sales_order_canceled',
					details: {
						employee_id: salesEmployeeId,
						proof: { note: cancelNote },
						reason: cancelReason,
						to_status: 'canceled',
					},
				},
			],
		)
		await sales.guard.expectClean('internal sales cancel flow')
	} finally {
		await sales.context.close()
	}
})

test('manual sales add order attaches existing customers, creates provisional customers, and reaches portal after claim', async ({
	browser,
}) => {
	test.setTimeout(420_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const sales = await signInLocal(env, LOCAL_SALES)
	const salesEmployeeId = await employeeIdByEmail(service, LOCAL_SALES.email)
	await deferAssignedFlowTestWork(service, [{ employeeId: salesEmployeeId }])
	const [productA, productB] = await salesTestProducts(service)
	const existingCustomer = await customerByEmail(service, LOCAL_CUSTOMER.email)

	const emptyManualOrder = await sales.client.rpc('create_manual_order', {
		p_customer_id: existingCustomer.id,
		p_items: [],
		p_notes: 'Flow empty manual order should fail',
	})
	expect(emptyManualOrder.error?.message).toContain(
		'manual_order_items_required',
	)

	const existingRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-manual-existing`
	const existingNotes = `Flow manual existing ${existingRunId}`
	const existingSales = await openSalesPage(browser)
	try {
		await createManualOrderFromSalesUi(existingSales.page, {
			address: `Flow existing delivery ${existingRunId}, New Cairo, Cairo`,
			customerSearch: existingCustomer.companyName,
			mode: 'existing',
			notes: existingNotes,
			product: productA,
			quantity: 3,
		})
		await existingSales.guard.expectClean('manual existing customer order')
	} finally {
		await existingSales.context.close()
	}

	const existingOrder = await expectManualSalesOrder(service, {
		customerId: existingCustomer.id,
		employeeId: salesEmployeeId,
		notes: existingNotes,
		product: productA,
		quantity: 3,
	})
	expect(existingOrder.quoteRequest.customer_id).toBe(existingCustomer.id)

	const newRunId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-manual-new`
	await releaseLocalOtpPhone(service, LOCAL_MANUAL_CLAIM_PHONE.full)
	const nationalPhone = LOCAL_MANUAL_CLAIM_PHONE.national
	const fullPhone = LOCAL_MANUAL_CLAIM_PHONE.full
	const newCompanyName = `Flow Manual ${newRunId}`
	const newContactName = `Flow Buyer ${newRunId}`
	const newEmail = `flow-manual-${newRunId}@example.test`
	const newNotes = `Flow manual provisional ${newRunId}`
	const newSales = await openSalesPage(browser)
	try {
		await createManualOrderFromSalesUi(newSales.page, {
			address: `Flow provisional delivery ${newRunId}, Nasr City, Cairo`,
			companyName: newCompanyName,
			customerName: newContactName,
			customerSearch: newCompanyName,
			email: newEmail,
			mode: 'new',
			notes: newNotes,
			phone: nationalPhone,
			product: productB,
			quantity: 4,
		})
		await newSales.guard.expectClean('manual provisional customer order')
	} finally {
		await newSales.context.close()
	}

	const provisionalCustomer = await expectCustomerByPhone(service, fullPhone)
	expect(provisionalCustomer.company_name).toBe(newCompanyName)
	expect(provisionalCustomer.contact_name).toBe(newContactName)
	expect(provisionalCustomer.email).toBe(newEmail)
	expect(provisionalCustomer.status).toBe('unclaimed')
	expect(provisionalCustomer.user_id).toBeNull()
	expect(provisionalCustomer.created_by_employee_id).toBe(salesEmployeeId)

	const provisionalOrder = await expectManualSalesOrder(service, {
		customerId: provisionalCustomer.id,
		employeeId: salesEmployeeId,
		notes: newNotes,
		product: productB,
		quantity: 4,
	})
	expect(provisionalOrder.quoteRequest.customer_id).toBe(provisionalCustomer.id)

	await claimManualCustomerInPortal(browser, {
		companyName: newCompanyName,
		fullPhone,
		nationalPhone,
		orderId: provisionalOrder.order.id,
		orderNumber: provisionalOrder.order.order_number,
		productName: productB.name,
		service,
	})
})

async function createManualOrderFromSalesUi(
	page: Page,
	input: {
		address: string
		companyName?: string
		customerName?: string
		customerSearch: string
		email?: string
		mode: 'existing' | 'new'
		notes: string
		phone?: string
		product: ProductRow
		quantity: number
	},
) {
	await page.getByLabel(/Start a new quote/i).click()
	const customerDialog = page.getByRole('dialog', {
		name: /search customers or enter new/i,
	})
	await expect(customerDialog).toBeVisible({ timeout: 20_000 })
	await customerDialog
		.getByRole('textbox', { name: /search customers or enter new/i })
		.fill(input.customerSearch)

	if (input.mode === 'existing') {
		await customerDialog
			.locator('button[data-searchmenu-row="true"]')
			.filter({ hasText: input.customerSearch })
			.first()
			.click()
	} else {
		await customerDialog
			.locator('button[data-searchmenu-row="true"]')
			.filter({ hasText: `open a new ledger for ${input.customerSearch}` })
			.first()
			.click()
		await page.getByRole('button', { name: /Build quote/i }).click()
		await expect(page.getByRole('alert')).toContainText(
			/Phone number is required/i,
		)
		const phoneInput = page.locator('#cust-phone')
		const emailInput = page.getByLabel(/^Email$/i)
		await phoneInput.fill('123')
		await emailInput.fill('not-an-email')
		await page.getByRole('button', { name: /Build quote/i }).click()
		await expect(page.getByRole('alert')).toContainText(/not a valid Egyptian/i)
		await expect(page.getByRole('alert')).toContainText(
			/Email address is not valid/i,
		)
		await page
			.getByLabel(/Contracting party/i)
			.fill(input.customerName ?? input.customerSearch)
		await page
			.getByLabel(/Company/i)
			.fill(input.companyName ?? input.customerSearch)
		await phoneInput.fill(input.phone ?? '')
		if (input.phone) await expect(phoneInput).toHaveValue(/1\d{2} \d{3} \d{4}/)
		await emailInput.fill(input.email ?? '')
	}

	await expect(page.getByLabel(/Contracting party/i)).toBeVisible({
		timeout: 20_000,
	})
	await page.getByRole('button', { name: /Build quote/i }).click()
	await expect(page.getByRole('button', { name: /^\+ADD$/ })).toBeVisible({
		timeout: 20_000,
	})
	await page.getByRole('button', { name: /^\+ADD$/ }).click()
	await expect(
		page.getByRole('dialog', { name: /search catalog/i }),
	).toBeVisible({ timeout: 20_000 })
	await page
		.getByRole('textbox', { name: /search catalog/i })
		.fill(input.product.name)
	await page
		.getByRole('button', {
			name: `Add ${input.product.name}`,
		})
		.click()
	await page
		.locator(`#catalog-qty-${input.product.id}`)
		.fill(String(input.quantity))
	await page.getByRole('button', { name: /^Apply$/ }).click()
	await expect(page.locator('body')).toContainText(input.product.name)

	await page.getByLabel(/Manual address/i).fill(input.address)
	await page.getByPlaceholder(/^notes$/i).fill(input.notes)
	await setManualDeliveryDate(page)
	await page.getByRole('button', { name: /Review & submit/i }).click()
	await sendReviewedQuoteToFinance(page)
	await expect(page.locator('body')).not.toContainText(input.notes, {
		timeout: 30_000,
	})
}

async function sendReviewedQuoteToFinance(page: Page) {
	const signManagerButton = page.getByRole('button', {
		name: /Sign manager approval/i,
	})
	if (await signManagerButton.isVisible()) {
		await page.getByRole('button', { name: /Local Sales Manager/i }).click()
		await page
			.getByPlaceholder('Type password to sign')
			.fill(LOCAL_MANAGER.password)
		await signManagerButton.click()
	}

	const sendToFinanceButton = page.getByRole('button', {
		name: /Send to finance/i,
	})
	await expect(sendToFinanceButton).toBeVisible({ timeout: 20_000 })
	await sendToFinanceButton.click()
}

async function setManualDeliveryDate(page: Page) {
	await page
		.getByRole('button', { name: /Open delivery date and time picker/i })
		.click()
	const dialog = page.getByRole('dialog', { name: /Delivery date and time/i })
	await expect(dialog).toBeVisible({ timeout: 10_000 })
	await dialog
		.locator(
			'[role="gridcell"]:not([aria-disabled="true"]):not([data-disabled]):not([data-outside-month])',
		)
		.first()
		.click()
	await dialog.getByRole('button', { name: /midday/i }).click()
	await dialog.getByRole('button', { name: /^Done$/i }).click()
	await expect(dialog).toBeHidden({ timeout: 10_000 })
}

async function openSalesPage(browser: Browser): Promise<SalesPageHandle> {
	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	await context.addCookies(
		await createAuthCookies(LOCAL_SALES, COOKIE_NAMES.internal, URLS.internal),
	)
	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)
	await page.goto(URLS.internal, { waitUntil: 'domcontentloaded' })
	await waitForHydration(page)
	await expect(page).not.toHaveURL(/\/login/)
	await page.getByRole('button', { name: /^Sales$/i }).click()
	await expect(page.locator('body')).toContainText(/Sales|Supabase queue/i, {
		timeout: 20_000,
	})
	return { context, guard, page }
}

async function expectSalesAutoOpened(
	page: Page,
	service: ReturnType<typeof createLocalServiceClient>,
	fixture: SubmittedQuoteFixture,
	email: string,
) {
	await expectQuoteAssignedToSales(service, fixture.id, email)
	await expect(page.locator('body')).toContainText(fixture.customerName, {
		timeout: 30_000,
	})
	await expect(page.locator('body')).toContainText(fixture.productA.name)
}

async function createSubmittedQuoteRequest({
	customerClient,
	service,
	variant,
}: {
	customerClient: ReturnType<typeof createClient>
	service: ReturnType<typeof createLocalServiceClient>
	variant: string
}): Promise<SubmittedQuoteFixture> {
	const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${variant}`
	const [productA, productB] = await salesTestProducts(service, runId)
	const customer = await localCustomer(service)
	const address = await ensureCustomerAddress(service, customer.id, runId)
	const deliveryDate = new Date(Date.now() + 7 * 86_400_000)
		.toISOString()
		.slice(0, 10)
	const { data: draft, error: draftError } = await service
		.from('quote_requests')
		.insert({
			customer_id: customer.id,
			delivery_address_id: address.id,
			delivery_date: deliveryDate,
			notes: `flow-internal-sales:${runId}`,
		})
		.select('id, request_number')
		.single()
	if (draftError || !draft) {
		throw new Error(draftError?.message ?? 'Failed to create sales test draft')
	}

	const originalQuantity = 2
	const { error: itemError } = await service
		.from('quote_request_items')
		.insert({
			customer_description: productA.name,
			product_id: productA.id,
			quantity: originalQuantity,
			quote_request_id: draft.id,
			sort_order: 0,
			unit_of_measure: productA.unit_of_measure,
			unit_of_measure_ar: productA.unit_of_measure_ar,
		})
	if (itemError) {
		throw new Error(`Failed to create sales test item: ${itemError.message}`)
	}

	const { data: submitted, error: submitError } = await customerClient.rpc(
		'customer_submit_saved_quote_request',
		{ p_quote_request_id: draft.id },
	)
	if (submitError || !submitted) {
		throw new Error(submitError?.message ?? 'Failed to submit sales test draft')
	}
	expect(submitted.status).toBe('submitted')

	return {
		customerName: customer.company_name,
		id: draft.id,
		originalQuantity,
		productA,
		productB,
		requestNumber: draft.request_number,
		runId,
	}
}

async function salesTestProducts(
	service: ReturnType<typeof createLocalServiceClient>,
	runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
) {
	const rows = [
		{
			name: `Flow Sales Product A ${runId}`,
			name_ar: `منتج مبيعات أ ${runId}`,
			sku: `FLOW-SALES-A-${runId}`.toUpperCase(),
			slug: `flow-sales-a-${runId}`,
		},
		{
			name: `Flow Sales Product B ${runId}`,
			name_ar: `منتج مبيعات ب ${runId}`,
			sku: `FLOW-SALES-B-${runId}`.toUpperCase(),
			slug: `flow-sales-b-${runId}`,
		},
	].map((product) => ({
		...product,
		availability_status: 'available',
		category: 'cement',
		description: `Final Flow sales product ${runId}`,
		description_ar: `منتج اختبار مبيعات ${runId}`,
		image_urls: [],
		is_active: true,
		name: product.name,
		name_ar: product.name_ar,
		price_range_max: 125,
		price_range_min: 100,
		slug: product.slug,
		specifications: { flow: 'sales-final' },
		specifications_ar: { flow: 'sales-final' },
		subcategory: 'cement',
		subcategory_ar: 'أسمنت',
		unit_of_measure: 'bag',
		unit_of_measure_ar: 'شيكارة',
	}))
	const { data, error } = await service
		.from('products')
		.insert(rows)
		.select(
			'id, slug, name, unit_of_measure, unit_of_measure_ar, price_range_min, price_range_max',
		)
		.order('name', { ascending: true })
	if (error) throw new Error(error.message)
	const products = (data ?? []) as ProductRow[]
	if (products.length !== 2) {
		throw new Error('Two sales test products are required')
	}
	return products as [ProductRow, ProductRow]
}

async function localCustomer(
	service: ReturnType<typeof createLocalServiceClient>,
) {
	const { data, error } = await service
		.from('customers')
		.select('id, company_name')
		.eq('email', LOCAL_CUSTOMER.email)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? 'Local customer not found')
	}
	return data as { company_name: string; id: string }
}

async function customerByEmail(
	service: ReturnType<typeof createLocalServiceClient>,
	email: string,
) {
	const { data, error } = await service
		.from('customers')
		.select('id, company_name, contact_name, email, phone, status, user_id')
		.eq('email', email)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? `Customer ${email} not found`)
	}
	return {
		companyName: String(data.company_name),
		contactName: String(data.contact_name),
		email: String(data.email),
		id: String(data.id),
		phone: String(data.phone),
		status: String(data.status),
		userId: typeof data.user_id === 'string' ? data.user_id : null,
	}
}

async function expectCustomerByPhone(
	service: ReturnType<typeof createLocalServiceClient>,
	phone: string,
) {
	const { data, error } = await service
		.from('customers')
		.select(
			'id, user_id, company_name, contact_name, email, phone, status, created_by_employee_id',
		)
		.eq('phone', phone)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? `Customer ${phone} not found`)
	}
	return data as {
		company_name: string
		contact_name: string
		created_by_employee_id: string | null
		email: string | null
		id: string
		phone: string
		status: string
		user_id: string | null
	}
}

async function releaseLocalOtpPhone(
	service: ReturnType<typeof createLocalServiceClient>,
	phone: string,
) {
	const normalizedPhone = phone.replace(/\D/g, '')
	const users = await service.auth.admin.listUsers({ page: 1, perPage: 1000 })
	expect(users.error).toBeNull()
	for (const user of users.data.users) {
		const userPhone = (user.phone ?? '').replace(/\D/g, '')
		const metadataPhone =
			typeof user.user_metadata?.phone === 'string'
				? user.user_metadata.phone.replace(/\D/g, '')
				: ''
		if (userPhone === normalizedPhone || metadataPhone === normalizedPhone) {
			const deleted = await service.auth.admin.deleteUser(user.id)
			expect(deleted.error).toBeNull()
		}
	}

	const { data: customers, error } = await service
		.from('customers')
		.select('id')
		.eq('phone', phone)
	if (error) throw new Error(error.message)
	for (const [index, customer] of (customers ?? []).entries()) {
		const archivedPhone = `+209${Date.now()}${index}`
		const { error: updateError } = await service
			.from('customers')
			.update({ phone: archivedPhone, status: 'inactive', user_id: null })
			.eq('id', customer.id)
		expect(updateError).toBeNull()
	}
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
			label: `Flow ${runId}`,
			street: `Flow Sales ${runId} Street`,
		})
		.select('id')
		.single()
	if (createError || !created) {
		throw new Error(createError?.message ?? 'Failed to create test address')
	}
	return created as { id: string }
}

async function signInLocal(
	env: LocalSupabaseEnv,
	account: { email: string; password: string },
) {
	const client = createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const { data, error } = await client.auth.signInWithPassword(account)
	if (error)
		throw new Error(`Could not sign in ${account.email}: ${error.message}`)
	return {
		client: createActorFlowClient(client, createLocalServiceClient(env), {
			actorPool: account.email.includes('customer') ? 'external' : 'internal',
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

async function quoteRequestItems(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
) {
	const { data, error } = await service
		.from('quote_request_items')
		.select('product_id, quantity')
		.eq('quote_request_id', quoteRequestId)
		.order('sort_order')
	if (error) throw new Error(error.message)
	return (data ?? []).map((item) => ({
		product_id: String(item.product_id),
		quantity: Number(item.quantity),
	}))
}

async function expectQuoteAssignedToSales(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	email: string,
) {
	const employeeId = await employeeIdByEmail(service, email)
	await expectQuoteAssignedToEmployeeId(service, quoteRequestId, employeeId)
}

async function expectQuoteAssignedToEmployeeId(
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

async function quoteRequestStatusRow(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
) {
	const { data, error } = await service
		.from('quote_requests')
		.select('assigned_at, assigned_employee_id, eligible_at, status')
		.eq('id', quoteRequestId)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? `Quote request ${quoteRequestId} missing`)
	}
	return data
}

async function setQuoteRequestQueueTimes(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	isoTimestamp: string,
) {
	const { error } = await service
		.from('quote_requests')
		.update({
			created_at: isoTimestamp,
			eligible_at: isoTimestamp,
			submitted_at: isoTimestamp,
		})
		.eq('id', quoteRequestId)
	if (error) throw new Error(error.message)
}

async function setQuoteRequestEligibleAt(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	isoTimestamp: string,
) {
	const { error } = await service
		.from('quote_requests')
		.update({ eligible_at: isoTimestamp })
		.eq('id', quoteRequestId)
	if (error) throw new Error(error.message)
}

async function latestActivityDetails(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	action: string,
) {
	const { data, error } = await service
		.from('activity_events')
		.select('actor_employee_id, created_at, details')
		.eq('entity_type', 'quote_request')
		.eq('entity_id', quoteRequestId)
		.eq('action', action)
		.order('created_at', { ascending: false })
		.limit(1)
		.single()
	if (error || !data) {
		throw new Error(error?.message ?? `${action} activity missing`)
	}
	expect(isIsoTimestamp(data.created_at), `${action} created_at`).toBe(true)
	return {
		actorEmployeeId:
			typeof data.actor_employee_id === 'string'
				? data.actor_employee_id
				: null,
		details: expectRecord(data.details, `${action} details`),
	}
}

async function expectClaimActivityDetails(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	expected: {
		employeeId?: string
		sourceQueuePosition?: number
		sourceQueuePositions?: number[]
	},
) {
	const activity = await latestActivityDetails(
		service,
		quoteRequestId,
		'sales_order_claimed',
	)
	if (expected.employeeId) {
		expect(activity.actorEmployeeId).toBe(expected.employeeId)
		expect(String(activity.details.employee_id)).toBe(expected.employeeId)
	}
	expect(String(activity.details.order_id)).toBe(quoteRequestId)
	expect(isIsoTimestamp(activity.details.assigned_at)).toBe(true)
	const sourceQueuePosition = Number(activity.details.source_queue_position)
	if (expected.sourceQueuePosition !== undefined) {
		expect(sourceQueuePosition).toBe(expected.sourceQueuePosition)
	}
	if (expected.sourceQueuePositions !== undefined) {
		expect(expected.sourceQueuePositions).toContain(sourceQueuePosition)
	}
	if (
		expected.sourceQueuePosition === undefined &&
		expected.sourceQueuePositions === undefined
	) {
		throw new Error('Expected source queue position is required')
	}
}

async function expectRequeueActivityDetails(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	expected: { employeeId: string; returnMinutes: number },
) {
	const activity = await latestActivityDetails(
		service,
		quoteRequestId,
		'sales_order_requeued',
	)
	expect(activity.actorEmployeeId).toBe(expected.employeeId)
	expect(String(activity.details.employee_id)).toBe(expected.employeeId)
	expect(String(activity.details.order_id)).toBe(quoteRequestId)
	expect(Number(activity.details.return_minutes)).toBe(expected.returnMinutes)
	expect(isIsoTimestamp(activity.details.eligible_at)).toBe(true)
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
	if (error || !data)
		throw new Error(error?.message ?? `Employee ${email} not found`)
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
			notes === 'Local submitted order for portal smoke' ||
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

async function expectSalesCallNote(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	notes: string,
	employeeId: string,
) {
	await expect
		.poll(async () => {
			const { data, error } = await service
				.from('sales_call_notes')
				.select('created_at, employee_id, outcome, notes')
				.eq('quote_request_id', quoteRequestId)
				.eq('notes', notes)
				.maybeSingle()
			if (error) return `error:${error.message}`
			if (!data) return ''
			return [
				data.employee_id,
				data.outcome,
				data.notes,
				isIsoTimestamp(data.created_at) ? 'created_at' : 'missing_created_at',
			].join('|')
		})
		.toBe(`${employeeId}|reached_customer|${notes}|created_at`)
}

async function expectConfirmedOrder(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
) {
	await expect
		.poll(async () => {
			const { data, error } = await service
				.from('orders')
				.select('status, total_amount')
				.eq('quote_request_id', quoteRequestId)
				.maybeSingle()
			if (error) return `error:${error.message}`
			if (!data) return ''
			return `${data.status}|${Number(data.total_amount) > 0 ? 'total' : 'zero'}`
		})
		.toBe('confirmed_for_inventory|total')
	await expectQuoteRequestStatus(service, quoteRequestId, 'approved')
}

async function expectManualSalesOrder(
	service: ReturnType<typeof createLocalServiceClient>,
	expected: {
		customerId: string
		employeeId: string
		notes: string
		product: ProductRow
		quantity: number
	},
) {
	await expect
		.poll(
			async () => {
				const { data, error } = await service
					.from('quote_requests')
					.select('status')
					.eq('notes', expected.notes)
					.maybeSingle()
				if (error || !data) return ''
				return String(data.status)
			},
			{ timeout: 30_000 },
		)
		.toBe('approved')
	const { data: quoteRequestData, error: quoteRequestError } = await service
		.from('quote_requests')
		.select(
			'id, request_number, customer_id, status, notes, assigned_employee_id, assigned_at, submitted_at',
		)
		.eq('notes', expected.notes)
		.single()
	if (quoteRequestError || !quoteRequestData) {
		throw new Error(
			quoteRequestError?.message ?? 'Manual quote request missing',
		)
	}
	const quoteRequest = quoteRequestData as {
		assigned_at: string | null
		assigned_employee_id: string | null
		customer_id: string
		id: string
		notes: string | null
		request_number: string
		status: string
		submitted_at: string | null
	}

	expect(quoteRequest.customer_id).toBe(expected.customerId)
	expect(quoteRequest.status).toBe('approved')
	expect(quoteRequest.assigned_employee_id).toBe(expected.employeeId)
	expect(isIsoTimestamp(quoteRequest.assigned_at)).toBe(true)
	expect(isIsoTimestamp(quoteRequest.submitted_at)).toBe(true)

	const { data: items, error: itemError } = await service
		.from('quote_request_items')
		.select(
			'product_id, customer_description, quantity, unit_of_measure, notes',
		)
		.eq('quote_request_id', quoteRequest.id)
		.order('sort_order')
	if (itemError) throw new Error(itemError.message)
	expect(items).toHaveLength(1)
	const requestItem = items?.[0]
	expect(requestItem?.customer_description).toBe(expected.product.name)
	expect(requestItem?.product_id).toBe(expected.product.id)
	expect(Number(requestItem?.quantity)).toBe(expected.quantity)
	expect(requestItem?.unit_of_measure).toBe(expected.product.unit_of_measure)

	const { data: quoteVersion, error: quoteVersionError } = await service
		.from('sales_quote_versions')
		.select('id, created_by_employee_id, created_at, notes, status, total')
		.eq('quote_request_id', quoteRequest.id)
		.order('version_number', { ascending: false })
		.limit(1)
		.single()
	if (quoteVersionError || !quoteVersion) {
		throw new Error(
			quoteVersionError?.message ?? 'Manual quote version missing',
		)
	}
	expect(quoteVersion.status).toBe('approved')
	expect(quoteVersion.created_by_employee_id).toBe(expected.employeeId)
	expect(isIsoTimestamp(quoteVersion.created_at)).toBe(true)
	expect(Number(quoteVersion.total)).toBeGreaterThan(0)
	const quoteNotes = expectRecord(
		JSON.parse(String(quoteVersion.notes)),
		'manual quote version notes',
	)
	expect(String(quoteNotes.specialInstructions)).toBe(expected.notes)
	expect(isIsoDate(String(quoteNotes.deliveryDate))).toBe(true)
	expect(String(quoteNotes.deliveryAddress)).toContain('Flow')
	const quoteItems = Array.isArray(quoteNotes.items) ? quoteNotes.items : []
	expect(quoteItems).toHaveLength(1)
	const quoteItem = expectRecord(quoteItems[0], 'manual quote version item')
	expect(String(quoteItem.productSlug)).toBe(expected.product.slug)
	expect(Number(quoteItem.quantity)).toBe(expected.quantity)
	expect(Number(quoteItem.sellPrice)).toBeGreaterThan(0)
	expect(Number(quoteItem.marginPercent)).toBeGreaterThanOrEqual(15)

	const { data: order, error: orderError } = await service
		.from('orders')
		.select('id, order_number, status, total_amount')
		.eq('quote_request_id', quoteRequest.id)
		.single()
	if (orderError || !order) {
		throw new Error(orderError?.message ?? 'Manual confirmed order missing')
	}
	expect(order.status).toBe('confirmed_for_inventory')
	expect(Number(order.total_amount)).toBeGreaterThan(0)

	const manualActivity = await latestActivityDetails(
		service,
		quoteRequest.id,
		'manual_order_created',
	)
	expect(manualActivity.actorEmployeeId).toBe(expected.employeeId)
	expect(String(manualActivity.details.employee_id)).toBe(expected.employeeId)
	expect(String(manualActivity.details.order_id)).toBe(quoteRequest.id)
	expect(String(manualActivity.details.customer_id)).toBe(expected.customerId)
	expect(Number(manualActivity.details.item_count)).toBe(1)
	expect(String(manualActivity.details.source)).toBe('manual_phone_order')
	expect(isIsoTimestamp(manualActivity.details.assigned_at)).toBe(true)
	await expectActivityActions(service, quoteRequest.id, [
		'manual_order_created',
		'sales_quote_draft_saved',
		'sales_order_confirmed',
	])

	return {
		order: order as {
			id: string
			order_number: string
			status: string
			total_amount: number | string | null
		},
		quoteRequest,
		quoteVersion,
	}
}

async function expectQuoteRequestStatus(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	status: string,
) {
	await expect
		.poll(async () => {
			const { data, error } = await service
				.from('quote_requests')
				.select('status')
				.eq('id', quoteRequestId)
				.single()
			if (error) return `error:${error.message}`
			return data.status
		})
		.toBe(status)
}

async function expectSalesQuoteVersion(
	service: ReturnType<typeof createLocalServiceClient>,
	fixture: SubmittedQuoteFixture,
	expected: {
		finalProductId: string
		finalQuantity: number
		removedProductId: string
	},
	employeeId: string,
) {
	const { data, error } = await service
		.from('sales_quote_versions')
		.select('created_at, created_by_employee_id, id, notes, status, total')
		.eq('quote_request_id', fixture.id)
		.order('version_number', { ascending: false })
		.limit(1)
		.single()
	if (error || !data) throw new Error(error?.message ?? 'Quote version missing')
	expect(data.status).toBe('approved')
	expect(data.created_by_employee_id).toBe(employeeId)
	expect(isIsoTimestamp(data.created_at)).toBe(true)
	const total = Number(data.total)
	expect(total).toBeGreaterThan(0)
	const items = parseQuoteVersionItems(data.notes)
	expect(items).toEqual([
		expect.objectContaining({
			productSlug: expected.finalProductId,
			quantity: expected.finalQuantity,
		}),
	])
	expect(
		items.some((item) => item.productSlug === expected.removedProductId),
	).toBe(false)
	return { id: String(data.id), total }
}

async function expectQuoteRequestOriginalPreserved(
	service: ReturnType<typeof createLocalServiceClient>,
	fixture: SubmittedQuoteFixture,
) {
	const originalItems = await quoteRequestItems(service, fixture.id)
	expect(originalItems).toEqual([
		expect.objectContaining({
			product_id: fixture.productA.id,
			quantity: fixture.originalQuantity,
		}),
	])
}

interface QuoteVersionLineItem {
	productSlug?: string
	quantity?: number
}

function parseQuoteVersionItems(notes: string | null): QuoteVersionLineItem[] {
	if (!notes) return []
	const parsed: unknown = JSON.parse(notes)
	if (!isRecord(parsed) || !Array.isArray(parsed.items)) return []
	return parsed.items
		.map((item): QuoteVersionLineItem | null => {
			if (!isRecord(item)) return null
			return {
				productSlug:
					typeof item.productSlug === 'string' ? item.productSlug : undefined,
				quantity: typeof item.quantity === 'number' ? item.quantity : undefined,
			}
		})
		.filter((item): item is QuoteVersionLineItem => item !== null)
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null
}

async function expectActivityActions(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	actions: string[],
) {
	const expected = [...actions].sort().join('|')
	await expect
		.poll(async () => {
			const { data, error } = await service
				.from('activity_events')
				.select('action')
				.eq('entity_type', 'quote_request')
				.eq('entity_id', quoteRequestId)
				.in('action', actions)
			if (error) return `error:${error.message}`
			return [...new Set((data ?? []).map((event) => String(event.action)))]
				.sort()
				.join('|')
		})
		.toBe(expected)
}

interface ActivityAuditExpectation {
	action: string
	details: Record<string, unknown>
}

async function expectSalesActivityAuditContext(
	service: ReturnType<typeof createLocalServiceClient>,
	quoteRequestId: string,
	employeeId: string,
	expectations: ActivityAuditExpectation[],
) {
	const actions = expectations.map(({ action }) => action)
	const { data, error } = await service
		.from('activity_events')
		.select('action, actor_employee_id, created_at, details')
		.eq('entity_type', 'quote_request')
		.eq('entity_id', quoteRequestId)
		.in('action', actions)
		.order('created_at', { ascending: true })
	if (error) throw new Error(error.message)

	for (const expectation of expectations) {
		const event = (data ?? [])
			.filter((row) => row.action === expectation.action)
			.at(-1)
		expect(event, `${expectation.action} activity event`).toBeTruthy()
		expect(event?.actor_employee_id, `${expectation.action} actor`).toBe(
			employeeId,
		)
		expect(
			isIsoTimestamp(event?.created_at),
			`${expectation.action} created_at`,
		).toBe(true)
		const details = expectRecord(
			event?.details,
			`${expectation.action} details`,
		)
		for (const [key, expectedValue] of Object.entries(expectation.details)) {
			expectActivityDetail(details, key, expectedValue, expectation.action)
		}
	}
}

function expectActivityDetail(
	details: Record<string, unknown>,
	key: string,
	expectedValue: unknown,
	action: string,
) {
	const actualValue = details[key]
	if (typeof expectedValue === 'number') {
		expect(Number(actualValue), `${action} detail ${key}`).toBeCloseTo(
			expectedValue,
			2,
		)
		return
	}
	if (isRecord(expectedValue)) {
		const actualRecord = expectRecord(actualValue, `${action} detail ${key}`)
		for (const [nestedKey, nestedExpected] of Object.entries(expectedValue)) {
			expectActivityDetail(
				actualRecord,
				nestedKey,
				nestedExpected,
				`${action}.${key}`,
			)
		}
		return
	}
	expect(String(actualValue), `${action} detail ${key}`).toBe(
		String(expectedValue),
	)
}

function expectRecord(value: unknown, label: string): Record<string, unknown> {
	expect(isRecord(value), label).toBe(true)
	return value as Record<string, unknown>
}

async function claimManualCustomerInPortal(
	browser: Browser,
	input: {
		companyName: string
		fullPhone: string
		nationalPhone: string
		orderId: string
		orderNumber: string
		productName: string
		service: ReturnType<typeof createLocalServiceClient>
	},
) {
	const context = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	const page = await context.newPage()
	const guard = installBrowserErrorGuard(page)
	try {
		await page.goto(`${URLS.portal}/login`, { waitUntil: 'domcontentloaded' })
		await waitForHydration(page)
		await page.locator('#atelier-phone').fill(input.nationalPhone)
		await page.getByRole('button', { name: /whatsapp/i }).click()
		await expect(page.getByLabel('Verification digit 1')).toBeVisible({
			timeout: 15_000,
		})
		await page.getByLabel('Verification digit 1').click()
		await page.keyboard.type('123456')
		await expect(page.locator('body')).toContainText(
			/We found an existing company profile/i,
			{ timeout: 20_000 },
		)
		await expect(page.locator('body')).toContainText(input.companyName)
		await page.getByRole('button', { name: /Connect this profile/i }).click()
		await expect
			.poll(
				async () => {
					const customer = await expectCustomerByPhone(
						input.service,
						input.fullPhone,
					)
					return [
						customer.status,
						customer.user_id ? 'linked' : 'unlinked',
					].join('|')
				},
				{ timeout: 30_000 },
			)
			.toBe('claimed|linked')

		const users = await input.service.auth.admin.listUsers({
			page: 1,
			perPage: 1000,
		})
		expect(users.error).toBeNull()
		const matchingUser = users.data.users.find(
			(user) =>
				(user.phone ?? '').replace(/\D/g, '') ===
				input.fullPhone.replace(/\D/g, ''),
		)
		expect(matchingUser, 'claimed portal auth user').toBeTruthy()
		expect(
			(matchingUser?.app_metadata as Record<string, unknown> | undefined)?.pool,
		).toBe('external')

		await page.goto(`${URLS.portal}/orders/${input.orderId}`, {
			waitUntil: 'domcontentloaded',
		})
		await waitForHydration(page)
		await expect(page.locator('body')).toContainText(input.orderNumber, {
			timeout: 20_000,
		})
		await expect(page.locator('body')).toContainText(input.productName)
		await guard.expectClean('manual provisional portal claim and order detail')
	} finally {
		await context.close()
	}
}

function isIsoTimestamp(value: unknown) {
	if (typeof value !== 'string') return false
	return !Number.isNaN(Date.parse(value))
}

function isIsoDate(value: string) {
	return /^\d{4}-\d{2}-\d{2}$/.test(value)
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
