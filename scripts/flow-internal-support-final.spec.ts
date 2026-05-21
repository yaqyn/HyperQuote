import { spawnSync } from 'node:child_process'
import { expect, type Page, test } from '@playwright/test'
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
	dbUrl: string
	serviceRoleKey: string
}

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')
const URLS = {
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
	website: process.env.FLOW_WEBSITE_URL ?? 'http://localhost:3000',
}
const INTERNAL_ACCOUNT = {
	email: 'local-admin@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}
const INTERNAL_COOKIE = 'hyperquote_internal_auth'

test('website support ticket enters internal queue and can be replied to from submitted email', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const service = createLocalServiceClient()
	const stamp = Date.now()
	const requesterName = `Flow Support ${alphaStamp(stamp)}`
	const requesterEmail = `flow-support-${stamp}@hyperquote.local`
	const requesterPhone = '1012345678'
	const requesterMessage = `Flow internal support queue proof ${stamp}. Please reply to this submitted email address.`
	const replyBody = `Flow customer service reply ${stamp}`

	const websiteContext = await browser.newContext({
		viewport: { height: 980, width: 1440 },
	})
	const website = await websiteContext.newPage()
	const websiteGuard = installBrowserErrorGuard(website)

	await website.goto(`${URLS.website}/support`, {
		waitUntil: 'domcontentloaded',
	})
	await waitForHydration(website)
	await website.getByLabel('Name').fill(requesterName)
	await website.getByLabel('Email').fill(requesterEmail)
	await website.getByLabel(/Phone/i).fill(requesterPhone)
	await website.getByLabel('Message').fill(requesterMessage)
	await website.getByRole('button', { name: /^Send$/ }).click()
	const reference = await readVisibleTicketReference(website)
	await websiteGuard.expectClean('website support submit')
	await websiteContext.close()

	const ticket = await expectSupportTicket(service, reference, {
		email: requesterEmail,
		name: requesterName,
		phone: `+20${requesterPhone}`,
	})
	await expectInitialSupportMessage(service, ticket.id, requesterMessage)

	const internalContext = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	await internalContext.addCookies(
		await createAuthCookies(INTERNAL_ACCOUNT, INTERNAL_COOKIE, URLS.internal),
	)
	const internal = await internalContext.newPage()
	const internalGuard = installBrowserErrorGuard(internal)

	await internal.goto(URLS.internal, { waitUntil: 'domcontentloaded' })
	await waitForHydration(internal)
	await expect(internal).not.toHaveURL(/\/login/)
	await internal.getByRole('button', { name: /customer service/i }).click()
	await expect(internal.locator('body')).toContainText(
		'Customer service queue',
		{ timeout: 20_000 },
	)
	await internal.getByRole('button', { name: /Email:/i }).click()
	await internal
		.getByRole('searchbox', { name: /Search conversations/i })
		.fill(requesterName)
	const conversationButton = internal.getByRole('button', {
		name: new RegExp(`${escapeRegExp(requesterName)}.*general`, 'i'),
	})
	await expect(conversationButton).toBeVisible({ timeout: 20_000 })
	await conversationButton.click()
	await expect(internal.locator('body')).toContainText(reference)
	await expect(internal.locator('body')).toContainText(requesterMessage)

	await internal
		.getByRole('button', { name: /Assign conversation to me/i })
		.click()
	await expect
		.poll(() => supportTicketStatus(service, ticket.id, 'assigned'))
		.toBe('assigned')

	await internal.locator('button').filter({ hasText: 'Compose reply' }).click()
	await expect(internal.locator('input[type="email"]').first()).toHaveValue(
		requesterEmail,
	)
	await internal.getByPlaceholder(/Write your email/i).fill(replyBody)
	await internal.getByRole('button', { name: /Send reply|Send email/i }).click()
	await expect(internal.locator('body')).toContainText(replyBody, {
		timeout: 20_000,
	})

	const reply = await expectSupportReply(service, ticket.id, {
		body: replyBody,
		to: requesterEmail,
	})
	await expectActivityActions(service, ticket.id, [
		'support_ticket_created',
		'support_reply_sent',
		'support_ticket_reply_sent',
	])
	expect(reply.provider_status).toBe('provider_not_configured')

	await internal
		.getByRole('button', { name: /Close support conversation/i })
		.click()
	await expect
		.poll(() => supportTicketStatus(service, ticket.id, 'status'))
		.toBe('closed')
	await internal
		.getByRole('button', {
			name: new RegExp(`${escapeRegExp(requesterName)}.*general`, 'i'),
		})
		.click()
	await internal
		.getByRole('button', { name: /Reopen support conversation/i })
		.click()
	await expect
		.poll(() => supportTicketStatus(service, ticket.id, 'status'))
		.toBe('open')

	await internalGuard.expectClean('internal support queue/reply')
	await internalContext.close()
})

async function waitForHydration(page: Page) {
	await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {
		return undefined
	})
	await page.waitForTimeout(600)
}

async function readVisibleTicketReference(page: Page) {
	await expect(page.locator('body')).toContainText(/\b(?:HQS|TK)-/i, {
		timeout: 20_000,
	})
	const bodyText = await page.locator('body').innerText()
	const reference = /\b(?:HQS|TK)-[A-Z0-9-]+\b/i.exec(bodyText)?.[0]
	expect(reference).toBeTruthy()
	return String(reference)
}

async function expectSupportTicket(
	service: ReturnType<typeof createLocalServiceClient>,
	reference: string,
	expected: { email: string; name: string; phone: string },
) {
	await expect
		.poll(async () => {
			const { data, error } = await service
				.from('support_tickets')
				.select('id')
				.eq('reference', reference)
				.maybeSingle()
			if (error) return `error:${error.message}`
			return data?.id ?? ''
		})
		.not.toBe('')
	const { data, error } = await service
		.from('support_tickets')
		.select(
			'id, reference, requester_email, requester_name, requester_phone, status, source, customer_id',
		)
		.eq('reference', reference)
		.single()
	expect(error).toBeNull()
	expect(data).toMatchObject({
		customer_id: null,
		requester_email: expected.email,
		requester_name: expected.name,
		requester_phone: expected.phone,
		source: 'website',
		status: 'open',
	})
	return data
}

async function expectInitialSupportMessage(
	service: ReturnType<typeof createLocalServiceClient>,
	ticketId: string,
	body: string,
) {
	const { data, error } = await service
		.from('support_messages')
		.select('body, channel, provider_status, sender_type, metadata')
		.eq('ticket_id', ticketId)
		.eq('sender_type', 'external')
		.single()
	expect(error).toBeNull()
	expect(data).toMatchObject({
		body,
		channel: 'website',
		provider_status: 'recorded',
		sender_type: 'external',
	})
}

async function expectSupportReply(
	service: ReturnType<typeof createLocalServiceClient>,
	ticketId: string,
	expected: { body: string; to: string },
) {
	await expect
		.poll(async () => {
			const reply = await latestSupportReply(service, ticketId, expected.body)
			return reply?.body ?? ''
		})
		.toBe(expected.body)
	const reply = await latestSupportReply(service, ticketId, expected.body)
	expect(reply).toBeTruthy()
	expect(reply?.metadata?.to).toBe(expected.to)
	expect(reply?.metadata?.subject).toMatch(/^Re:/)
	return reply
}

async function latestSupportReply(
	service: ReturnType<typeof createLocalServiceClient>,
	ticketId: string,
	body: string,
) {
	const { data, error } = await service
		.from('support_messages')
		.select('id, body, channel, provider_status, sender_type, metadata')
		.eq('ticket_id', ticketId)
		.eq('sender_type', 'employee')
		.eq('body', body)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle()
	if (error) throw new Error(error.message)
	return data
}

async function expectActivityActions(
	service: ReturnType<typeof createLocalServiceClient>,
	ticketId: string,
	actions: string[],
) {
	const expected = [...actions].sort().join('|')
	await expect
		.poll(async () => {
			const { data, error } = await service
				.from('activity_events')
				.select('action')
				.eq('entity_type', 'support_ticket')
				.eq('entity_id', ticketId)
				.in('action', actions)
			if (error) return `error:${error.message}`
			return [...new Set((data ?? []).map((event) => String(event.action)))]
				.sort()
				.join('|')
		})
		.toBe(expected)
}

async function supportTicketStatus(
	service: ReturnType<typeof createLocalServiceClient>,
	ticketId: string,
	field: 'assigned' | 'status',
) {
	const { data, error } = await service
		.from('support_tickets')
		.select('status, assigned_employee_id')
		.eq('id', ticketId)
		.single()
	if (error) return `error:${error.message}`
	if (field === 'assigned') return data.assigned_employee_id ? 'assigned' : ''
	return data.status
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

function escapeRegExp(value: string) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function alphaStamp(value: number) {
	return String(value)
		.split('')
		.map((digit) => String.fromCharCode(97 + Number(digit)))
		.join('')
}
