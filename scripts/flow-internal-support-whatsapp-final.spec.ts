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

interface CustomerRow {
	id: string
	company_name: string
	contact_name: string
	phone: string
}

interface SupportConversationRow {
	assigned_employee_id: string | null
	customer_id: string | null
	id: string
	phone: string | null
	status: string
}

interface SupportMessageRow {
	body: string
	channel: string
	conversation_id: string
	metadata: Record<string, unknown>
	provider_status: string
	sender_type: string
}

const DEFAULT_PASSWORD = ['hyperquote', 'local', 'only', '2026'].join('-')
const URLS = {
	internal: process.env.FLOW_INTERNAL_URL ?? 'http://localhost:3002',
}
const INTERNAL_ACCOUNT = {
	email: 'local-admin@hyperquote.local',
	password: process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ?? DEFAULT_PASSWORD,
}
const INTERNAL_COOKIE = 'hyperquote_internal_auth'

test('WhatsApp support conversations are Supabase-backed, customer-linked, replied to, closed, and reopened', async ({
	browser,
}) => {
	test.setTimeout(180_000)
	const env = readLocalSupabaseEnv()
	const service = createLocalServiceClient(env)
	const employeeClient = createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const anonClient = createClient(env.apiUrl, env.anonKey, {
		auth: { autoRefreshToken: false, persistSession: false },
	})
	const stamp = Date.now()
	const linkedPhone = uniqueEgyptPhone(stamp, 0)
	const unlinkedPhone = uniqueEgyptPhone(stamp, 1)
	const linkedName = `Flow WhatsApp Linked ${alphaStamp(stamp)}`
	const linkedCompany = `Flow WhatsApp Linked Co ${alphaStamp(stamp)}`
	const unlinkedName = `Flow WhatsApp Confirmed ${alphaStamp(stamp)}`
	const unlinkedCompany = `Flow WhatsApp Confirmed Co ${alphaStamp(stamp)}`
	const linkedBody = `Flow WhatsApp linked customer message ${stamp}`
	const unlinkedBody = `Flow WhatsApp unlinked identity proof ${stamp}`
	const replyBody = `Flow WhatsApp support reply ${stamp}`

	const deniedAnon = await anonClient.rpc('ingest_whatsapp_message', {
		p_body: `Anon WhatsApp ingest should fail ${stamp}`,
		p_external_message_id: `anon-denied-${stamp}`,
		p_from_phone: uniqueEgyptPhone(stamp, 2),
	})
	expect(deniedAnon.error?.message).toContain(
		'service_role_required_for_whatsapp_ingest',
	)

	const { error: employeeSignInError } =
		await employeeClient.auth.signInWithPassword(INTERNAL_ACCOUNT)
	expect(employeeSignInError).toBeNull()
	const deniedEmployee = await employeeClient.rpc('ingest_whatsapp_message', {
		p_body: `Employee WhatsApp ingest should fail ${stamp}`,
		p_external_message_id: `employee-denied-${stamp}`,
		p_from_phone: uniqueEgyptPhone(stamp, 3),
	})
	expect(deniedEmployee.error?.message).toContain(
		'service_role_required_for_whatsapp_ingest',
	)

	const linkedCustomer = await createCustomer(service, {
		companyName: linkedCompany,
		contactName: linkedName,
		email: `flow-wa-linked-${stamp}@hyperquote.local`,
		phone: linkedPhone,
	})
	const linkedMessage = await ingestWhatsAppMessage(service, {
		body: linkedBody,
		externalId: `flow-wa-linked-${stamp}`,
		phone: linkedPhone,
	})
	const linkedConversation = await expectConversationByPhone(
		service,
		linkedPhone,
	)
	expect(linkedConversation.customer_id).toBe(linkedCustomer.id)
	await expectMessageRecorded(service, linkedMessage.id, {
		body: linkedBody,
		conversationId: linkedConversation.id,
		phone: linkedPhone,
	})

	const unlinkedMessage = await ingestWhatsAppMessage(service, {
		body: unlinkedBody,
		externalId: `flow-wa-unlinked-${stamp}`,
		phone: unlinkedPhone,
	})
	const unlinkedConversation = await expectConversationByPhone(
		service,
		unlinkedPhone,
	)
	expect(unlinkedConversation.customer_id).toBeNull()
	await expectMessageRecorded(service, unlinkedMessage.id, {
		body: unlinkedBody,
		conversationId: unlinkedConversation.id,
		phone: unlinkedPhone,
	})
	const confirmedCustomer = await createCustomer(service, {
		companyName: unlinkedCompany,
		contactName: unlinkedName,
		email: `flow-wa-confirmed-${stamp}@hyperquote.local`,
		phone: unlinkedPhone,
	})

	const internalContext = await browser.newContext({
		viewport: { height: 1000, width: 1440 },
	})
	await internalContext.addCookies(
		await createAuthCookies(
			INTERNAL_ACCOUNT,
			INTERNAL_COOKIE,
			URLS.internal,
			env,
		),
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

	await internal
		.getByRole('searchbox', { name: /Search conversations/i })
		.fill(linkedName)
	await internal
		.getByRole('button', {
			name: new RegExp(`${escapeRegExp(linkedName)}.*WhatsApp`, 'i'),
		})
		.click()
	await expect(internal.locator('body')).toContainText(linkedBody)
	await expect(internal.locator('body')).toContainText(linkedCompany)

	await internal
		.getByRole('button', { name: /Assign conversation to me/i })
		.click()
	await expect
		.poll(() => conversationField(service, linkedConversation.id, 'assigned'))
		.toBe('assigned')

	await internal.locator('textarea:visible').fill(replyBody)
	await internal.getByRole('button', { name: /^Send reply$/i }).click()
	await expect(internal.locator('body')).toContainText(replyBody, {
		timeout: 20_000,
	})
	const reply = await expectConversationReply(service, linkedConversation.id, {
		body: replyBody,
	})
	expect(reply.provider_status).toBe('provider_not_configured')
	await expectConversationActions(service, linkedConversation.id, [
		'whatsapp_message_ingested',
		'support_assigned',
		'support_reply_sent',
	])

	await internal
		.getByRole('button', { name: /Close support conversation/i })
		.click()
	await expect
		.poll(() => conversationField(service, linkedConversation.id, 'status'))
		.toBe('closed')
	await internal.getByRole('button', { name: /Closed chats:/i }).click()
	await internal
		.getByRole('searchbox', { name: /Search conversations/i })
		.fill(linkedName)
	await internal
		.getByRole('button', {
			name: new RegExp(`${escapeRegExp(linkedName)}.*WhatsApp`, 'i'),
		})
		.click()
	await internal
		.getByRole('button', { name: /Reopen support conversation/i })
		.click()
	await expect
		.poll(() => conversationField(service, linkedConversation.id, 'status'))
		.toBe('open')

	await internal.getByRole('button', { name: /WhatsApp:/i }).click()
	await internal
		.getByRole('searchbox', { name: /Search conversations/i })
		.fill(unlinkedBody)
	await internal
		.getByRole('button', {
			name: new RegExp(escapeRegExp(unlinkedPhone), 'i'),
		})
		.click()
	await expect(internal.locator('body')).toContainText(unlinkedBody)
	await expect(internal.locator('body')).toContainText(
		'Unlinked support contact',
	)
	await internal
		.getByRole('button', {
			name: /Link WhatsApp conversation to customer/i,
		})
		.click()
	await expect(internal.locator('body')).toContainText(unlinkedName, {
		timeout: 20_000,
	})
	await expect(internal.locator('body')).toContainText(unlinkedCompany)
	await expect
		.poll(() => conversationField(service, unlinkedConversation.id, 'customer'))
		.toBe(confirmedCustomer.id)
	await expectConversationActions(service, unlinkedConversation.id, [
		'whatsapp_message_ingested',
		'support_conversation_linked_to_customer',
	])

	await internalGuard.expectClean('internal WhatsApp support flow')
	await internalContext.close()
})

async function waitForHydration(page: Page) {
	await page.waitForLoadState('networkidle', { timeout: 8_000 }).catch(() => {
		return undefined
	})
	await page.waitForTimeout(600)
}

async function createCustomer(
	service: ReturnType<typeof createLocalServiceClient>,
	input: {
		companyName: string
		contactName: string
		email: string
		phone: string
	},
) {
	const { data, error } = await service
		.from('customers')
		.insert({
			company_name: input.companyName,
			contact_name: input.contactName,
			email: input.email,
			phone: input.phone,
			status: 'active',
		})
		.select('id, company_name, contact_name, phone')
		.single<CustomerRow>()
	expect(error).toBeNull()
	expect(data).toBeTruthy()
	return data
}

async function ingestWhatsAppMessage(
	service: ReturnType<typeof createLocalServiceClient>,
	input: { body: string; externalId: string; phone: string },
) {
	const { data, error } = await service
		.rpc('ingest_whatsapp_message', {
			p_body: input.body,
			p_external_message_id: input.externalId,
			p_from_phone: input.phone,
		})
		.select('id')
		.single()
	expect(error).toBeNull()
	expect(data?.id).toBeTruthy()
	return { id: String(data?.id) }
}

async function expectConversationByPhone(
	service: ReturnType<typeof createLocalServiceClient>,
	phone: string,
) {
	await expect
		.poll(async () => {
			const { data, error } = await service
				.from('support_conversations')
				.select('id')
				.eq('phone', phone)
				.maybeSingle()
			if (error) return `error:${error.message}`
			return data?.id ?? ''
		})
		.not.toBe('')
	const { data, error } = await service
		.from('support_conversations')
		.select('id, customer_id, phone, status, assigned_employee_id')
		.eq('phone', phone)
		.single<SupportConversationRow>()
	expect(error).toBeNull()
	expect(data).toBeTruthy()
	return data
}

async function expectMessageRecorded(
	service: ReturnType<typeof createLocalServiceClient>,
	messageId: string,
	expected: { body: string; conversationId: string; phone: string },
) {
	const { data, error } = await service
		.from('support_messages')
		.select(
			'body, channel, conversation_id, metadata, provider_status, sender_type',
		)
		.eq('id', messageId)
		.single<SupportMessageRow>()
	expect(error).toBeNull()
	expect(data).toMatchObject({
		body: expected.body,
		channel: 'whatsapp',
		conversation_id: expected.conversationId,
		provider_status: 'received',
		sender_type: 'external',
	})
	expect(data?.metadata.phone).toBe(expected.phone)
}

async function expectConversationReply(
	service: ReturnType<typeof createLocalServiceClient>,
	conversationId: string,
	expected: { body: string },
) {
	await expect
		.poll(async () => {
			const reply = await latestConversationReply(
				service,
				conversationId,
				expected.body,
			)
			return reply?.body ?? ''
		})
		.toBe(expected.body)
	const reply = await latestConversationReply(
		service,
		conversationId,
		expected.body,
	)
	expect(reply).toBeTruthy()
	expect(reply?.channel).toBe('whatsapp')
	expect(reply?.sender_type).toBe('employee')
	return reply
}

async function latestConversationReply(
	service: ReturnType<typeof createLocalServiceClient>,
	conversationId: string,
	body: string,
) {
	const { data, error } = await service
		.from('support_messages')
		.select(
			'body, channel, conversation_id, metadata, provider_status, sender_type',
		)
		.eq('conversation_id', conversationId)
		.eq('sender_type', 'employee')
		.eq('body', body)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle<SupportMessageRow>()
	if (error) throw new Error(error.message)
	return data
}

async function expectConversationActions(
	service: ReturnType<typeof createLocalServiceClient>,
	conversationId: string,
	actions: string[],
) {
	const expected = [...actions].sort().join('|')
	await expect
		.poll(async () => {
			const { data, error } = await service
				.from('activity_events')
				.select('action')
				.eq('entity_type', 'support_conversation')
				.eq('entity_id', conversationId)
				.in('action', actions)
			if (error) return `error:${error.message}`
			return [...new Set((data ?? []).map((event) => String(event.action)))]
				.sort()
				.join('|')
		})
		.toBe(expected)
}

async function conversationField(
	service: ReturnType<typeof createLocalServiceClient>,
	conversationId: string,
	field: 'assigned' | 'customer' | 'status',
) {
	const { data, error } = await service
		.from('support_conversations')
		.select('assigned_employee_id, customer_id, status')
		.eq('id', conversationId)
		.single()
	if (error) return `error:${error.message}`
	if (field === 'assigned') return data.assigned_employee_id ? 'assigned' : ''
	if (field === 'customer') return data.customer_id ?? ''
	return data.status
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

function createLocalServiceClient(env = readLocalSupabaseEnv()) {
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

function uniqueEgyptPhone(seed: number, offset: number) {
	const value = (seed + offset) % 100_000_000
	return `+2010${String(value).padStart(8, '0')}`
}
