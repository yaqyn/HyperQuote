import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

export const productionUrls = {
	driver: 'https://driver.hyperquote.net',
	internal: 'https://internal.hyperquote.net',
	portal: 'https://portal.hyperquote.net',
	root: 'https://hyperquote.net',
	website: 'https://www.hyperquote.net',
}

export const productionApps = [
	{
		cookieName: 'hyperquote_customer_auth',
		directory: 'apps/website',
		domain: 'www.hyperquote.net',
		id: 'website',
		workerName: 'hyperquote-website',
	},
	{
		cookieName: 'hyperquote_customer_auth',
		directory: 'apps/portal',
		domain: 'portal.hyperquote.net',
		id: 'portal',
		workerName: 'hyperquote-portal',
	},
	{
		cookieName: 'hyperquote_internal_auth',
		directory: 'apps/internal',
		domain: 'internal.hyperquote.net',
		id: 'internal',
		workerName: 'hyperquote-internal',
	},
	{
		cookieName: 'hyperquote_driver_auth',
		directory: 'apps/driver',
		domain: 'driver.hyperquote.net',
		id: 'driver',
		workerName: 'hyperquote-driver',
	},
]

export const requiredProductionBuildEnvNames = [
	'SUPABASE_URL',
	'SUPABASE_ANON_KEY',
]

const commonRuntimeSecretNames = [
	'COOKIE_DOMAIN',
	'SUPABASE_ANON_KEY',
	'SUPABASE_SERVICE_ROLE_KEY',
	'SUPABASE_URL',
]

const aiRuntimeSecretNames = ['GROQ_API_KEY']

const supportRuntimeSecretNames = [
	'RESEND_API_KEY',
	'RESEND_WEBHOOK_SECRET',
	'SUPPORT_EMAIL_FROM',
	'SUPPORT_INBOUND_EMAIL',
	'SUPPORT_REPLY_TO',
	'SUPPORT_URL',
]

const optionalSupportRuntimeSecretNames = [
	'SUPPORT_PHONE_E164',
	'SUPPORT_WHATSAPP_E164',
]

export function productionAppById(id) {
	const app = productionApps.find((candidate) => candidate.id === id)
	if (!app) {
		throw new Error(
			`Unknown production app "${id}". Use one of: ${productionApps.map((item) => item.id).join(', ')}`,
		)
	}
	return {
		...app,
		absoluteDirectory: join(repoRoot, app.directory),
		wranglerConfig: join(repoRoot, app.directory, 'wrangler.jsonc'),
	}
}

export function selectedProductionApps(selection) {
	if (!selection || selection === 'all') {
		return productionApps.map((app) => productionAppById(app.id))
	}
	return selection.split(',').map((id) => productionAppById(id.trim()))
}

export function productionBuildEnv(app, env = process.env) {
	return {
		VITE_DRIVER_API_BASE: productionUrls.driver,
		VITE_INTERNAL_URL: productionUrls.internal,
		VITE_PORTAL_URL: productionUrls.portal,
		VITE_ROAD_ROUTE_ENDPOINT:
			env.VITE_ROAD_ROUTE_ENDPOINT ??
			env.ROAD_ROUTE_ENDPOINT ??
			'https://router.project-osrm.org/route/v1/driving',
		VITE_SUPABASE_ANON_KEY: env.VITE_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY,
		VITE_SUPABASE_COOKIE_NAME: app.cookieName,
		VITE_SUPABASE_URL: env.VITE_SUPABASE_URL ?? env.SUPABASE_URL,
		VITE_SUPPORT_EMAIL:
			env.VITE_SUPPORT_EMAIL ??
			env.SUPPORT_INBOUND_EMAIL ??
			'support@hyperquote.net',
		VITE_SUPPORT_PHONE_E164:
			env.VITE_SUPPORT_PHONE_E164 ?? env.SUPPORT_PHONE_E164 ?? '',
		VITE_SUPPORT_PHONE_LABEL:
			env.VITE_SUPPORT_PHONE_LABEL ?? env.SUPPORT_PHONE_LABEL ?? '',
		VITE_SUPPORT_WHATSAPP_E164:
			env.VITE_SUPPORT_WHATSAPP_E164 ?? env.SUPPORT_WHATSAPP_E164 ?? '',
		VITE_USE_AI: env.VITE_USE_AI ?? env.USE_AI ?? 'true',
		VITE_WEBSITE_URL: productionUrls.website,
	}
}

export function requiredRuntimeSecretNamesForApp(app) {
	const names = new Set(commonRuntimeSecretNames)
	if (app.id !== 'driver') {
		for (const name of aiRuntimeSecretNames) names.add(name)
	}
	if (app.id === 'internal') {
		for (const name of supportRuntimeSecretNames) names.add(name)
	}
	return [...names]
}

export function optionalRuntimeSecretNamesForApp(app) {
	if (app.id !== 'internal') return []
	return [...optionalSupportRuntimeSecretNames]
}

export function missingEnvNames(names, env = process.env) {
	return names.filter((name) => !env[name]?.trim())
}

export function productionSupabaseDatabaseUrl(env = process.env) {
	const explicitUrl = env.SUPABASE_DB_URL?.trim()
	if (explicitUrl) return explicitUrl

	const projectRef = env.SUPABASE_PROJECT_REF?.trim()
	const password = env.SUPABASE_DB_PASSWORD?.trim()
	if (!projectRef || !password) return null

	const region = env.SUPABASE_DB_REGION?.trim() ?? 'eu-west-1'
	const user = env.SUPABASE_DB_USER?.trim() ?? `postgres.${projectRef}`
	const host =
		env.SUPABASE_DB_HOST?.trim() ?? `aws-0-${region}.pooler.supabase.com`
	const port = env.SUPABASE_DB_PORT?.trim() ?? '5432'
	const database = env.SUPABASE_DB_NAME?.trim() ?? 'postgres'

	return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`
}

export function productionSupabaseConfig(config) {
	const productionRedirects = [
		'https://www.hyperquote.net',
		'https://www.hyperquote.net/login',
		'https://portal.hyperquote.net',
		'https://portal.hyperquote.net/login',
		'https://internal.hyperquote.net',
		'https://internal.hyperquote.net/login',
		'https://driver.hyperquote.net',
		'https://driver.hyperquote.net/login',
	]
	return config
		.replace(
			/^project_id = "hyperquote"$/m,
			'project_id = "hyperquote-production"',
		)
		.replace(
			/^site_url = "http:\/\/localhost:3000"$/m,
			'site_url = "https://www.hyperquote.net"',
		)
		.replace(
			/additional_redirect_urls = \[[\s\S]*?\]\n/,
			`additional_redirect_urls = [\n${productionRedirects.map((url) => `  "${url}"`).join(',\n')}\n]\n`,
		)
		.replace(
			/\n# Use pre-defined local phone OTPs for development smoke checks\.\n\[auth\.sms\.test_otp\]\n(?:[^\n]+\n)+/u,
			'\n',
		)
}
