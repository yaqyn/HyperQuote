#!/usr/bin/env node
import process from 'node:process'

const API_BASE = 'https://api.cloudflare.com/client/v4'
const PHASE = 'http_request_dynamic_redirect'
const RULE_REF = 'hyperquote-root-to-www'
const RULE_DESCRIPTION = 'Redirect hyperquote.net to www.hyperquote.net'
const SUPPORT_RULE_NAME = 'Route support@hyperquote.net to Internal Worker'
const SUPPORT_WORKER_NAME = 'hyperquote-internal'
const strictConfig =
	process.env.HYPERQUOTE_CLOUDFLARE_CONFIG_STRICT === '1' ||
	process.env.HYPERQUOTE_CLOUDFLARE_CONFIG_STRICT === 'true'

const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim()
const token = process.env.CLOUDFLARE_API_TOKEN?.trim()
const supportEmail =
	process.env.SUPPORT_INBOUND_EMAIL?.trim().toLowerCase() ||
	'support@hyperquote.net'

if (!zoneId || !token) {
	console.error(
		'Cannot configure Cloudflare production rules. Missing CLOUDFLARE_ZONE_ID or CLOUDFLARE_API_TOKEN.',
	)
	process.exit(1)
}
if (!isEmail(supportEmail)) {
	console.error(
		'Cannot configure Cloudflare email routing. SUPPORT_INBOUND_EMAIL is invalid.',
	)
	process.exit(1)
}

const redirectRule = {
	action: 'redirect',
	action_parameters: {
		from_value: {
			preserve_query_string: true,
			status_code: 301,
			target_url: {
				expression:
					'concat("https://www.hyperquote.net", http.request.uri.path)',
			},
		},
	},
	description: RULE_DESCRIPTION,
	enabled: true,
	expression: '(http.host eq "hyperquote.net")',
	ref: RULE_REF,
}

await runOptionalCloudflareStep(
	'Cloudflare root-domain redirect rule',
	configureRootRedirectRule,
	'Website Worker apex redirect remains active without the Rulesets API permission.',
)
await runOptionalCloudflareStep(
	'Cloudflare Email Routing support rule',
	configureSupportEmailRoutingRule,
	'Configure support@hyperquote.net once with an operator token or grant the deploy token Email Routing write.',
)

async function configureRootRedirectRule() {
	const existingRuleset = await readEntrypointRuleset()
	if (!existingRuleset) {
		await createEntrypointRuleset()
		console.log('Configured Cloudflare root-domain redirect rule.')
		return
	}

	const rules = Array.isArray(existingRuleset.rules)
		? [...existingRuleset.rules]
		: []
	const index = rules.findIndex(
		(rule) => rule.ref === RULE_REF || rule.description === RULE_DESCRIPTION,
	)
	if (index >= 0) {
		rules[index] = { ...rules[index], ...redirectRule }
	} else {
		rules.push(redirectRule)
	}

	await updateEntrypointRuleset({
		...existingRuleset,
		name: existingRuleset.name || 'HyperQuote dynamic redirects',
		rules,
	})
	console.log('Configured Cloudflare root-domain redirect rule.')
}

async function runOptionalCloudflareStep(label, action, fallback) {
	try {
		await action()
	} catch (error) {
		if (!isPermissionError(error)) throw error
		if (strictConfig) {
			console.error(`${label} failed: Cloudflare token lacks permission.`)
			console.error(fallback)
			process.exit(1)
		}
		console.warn(`${label} skipped: Cloudflare token lacks permission.`)
		console.warn(fallback)
	}
}

async function configureSupportEmailRoutingRule() {
	const rules = await listEmailRoutingRules()
	const existing = rules.find((rule) => {
		const matchers = Array.isArray(rule.matchers) ? rule.matchers : []
		return (
			rule.name === SUPPORT_RULE_NAME ||
			matchers.some(
				(matcher) =>
					matcher.type === 'literal' &&
					matcher.field === 'to' &&
					typeof matcher.value === 'string' &&
					matcher.value.toLowerCase() === supportEmail,
			)
		)
	})
	const desiredRule = {
		actions: [{ type: 'worker', value: [SUPPORT_WORKER_NAME] }],
		enabled: true,
		matchers: [{ field: 'to', type: 'literal', value: supportEmail }],
		name: SUPPORT_RULE_NAME,
		priority: existing?.priority ?? 0,
	}

	if (existing?.id) {
		const payload = await jsonCloudflareFetch(
			`/zones/${zoneId}/email/routing/rules/${existing.id}`,
			desiredRule,
			'PUT',
		)
		if (!payload.success) {
			throw new Error(
				apiErrorMessage(payload, 'cloudflare_email_rule_update_failed'),
			)
		}
	} else {
		const payload = await jsonCloudflareFetch(
			`/zones/${zoneId}/email/routing/rules`,
			desiredRule,
		)
		if (!payload.success) {
			throw new Error(
				apiErrorMessage(payload, 'cloudflare_email_rule_create_failed'),
			)
		}
	}
	console.log(`Configured Cloudflare Email Routing for ${supportEmail}.`)
}

async function listEmailRoutingRules() {
	const response = await cloudflareFetch(
		`/zones/${zoneId}/email/routing/rules?per_page=100`,
	)
	const payload = await response.json()
	if (!response.ok || !payload.success) {
		throw new Error(
			apiErrorMessage(payload, 'cloudflare_email_rules_read_failed'),
		)
	}
	return Array.isArray(payload.result) ? payload.result : []
}

async function readEntrypointRuleset() {
	const response = await cloudflareFetch(
		`/zones/${zoneId}/rulesets/phases/${PHASE}/entrypoint`,
	)
	if (response.status === 404) return null
	const payload = await response.json()
	if (!response.ok || !payload.success) {
		throw new Error(apiErrorMessage(payload, 'cloudflare_ruleset_read_failed'))
	}
	return payload.result
}

async function createEntrypointRuleset() {
	const payload = await jsonCloudflareFetch(`/zones/${zoneId}/rulesets`, {
		kind: 'zone',
		name: 'HyperQuote dynamic redirects',
		phase: PHASE,
		rules: [redirectRule],
	})
	if (!payload.success) {
		throw new Error(
			apiErrorMessage(payload, 'cloudflare_ruleset_create_failed'),
		)
	}
}

async function updateEntrypointRuleset(ruleset) {
	const payload = await jsonCloudflareFetch(
		`/zones/${zoneId}/rulesets/${ruleset.id}`,
		{
			description: ruleset.description ?? '',
			kind: 'zone',
			name: ruleset.name,
			phase: PHASE,
			rules: ruleset.rules,
		},
		'PUT',
	)
	if (!payload.success) {
		throw new Error(
			apiErrorMessage(payload, 'cloudflare_ruleset_update_failed'),
		)
	}
}

async function jsonCloudflareFetch(path, body, method = 'POST') {
	const response = await cloudflareFetch(path, {
		body: JSON.stringify(body),
		headers: { 'content-type': 'application/json' },
		method,
	})
	const payload = await response.json()
	if (!response.ok) {
		throw new Error(apiErrorMessage(payload, 'cloudflare_api_failed'))
	}
	return payload
}

function cloudflareFetch(path, init = {}) {
	const headers = new Headers(init.headers)
	headers.set('authorization', `Bearer ${token}`)
	return fetch(`${API_BASE}${path}`, {
		...init,
		headers,
		signal: AbortSignal.timeout(15_000),
	})
}

function apiErrorMessage(payload, fallback) {
	const errors = Array.isArray(payload?.errors) ? payload.errors : []
	const messages = errors
		.map((error) => error?.message)
		.filter((message) => typeof message === 'string' && message.length > 0)
	return messages[0] ?? fallback
}

function isPermissionError(error) {
	return (
		error instanceof Error &&
		/Authentication error|permission|not authorized|unauthorized/i.test(
			error.message,
		)
	)
}

function isEmail(value) {
	return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
}
