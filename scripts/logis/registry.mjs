import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const repoRoot = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../..',
)
export const companyRegistryDir = join(repoRoot, 'logis/companies')
export const generatedConfigDir = join(repoRoot, '.logis/generated')

const APP_IDS = ['website', 'portal', 'internal', 'driver']

export function listCompanySlugs() {
	return readdirSync(companyRegistryDir)
		.filter((entry) => entry.endsWith('.yml') || entry.endsWith('.yaml'))
		.map((entry) => entry.replace(/\.ya?ml$/u, ''))
		.sort()
}

export function loadCompanyRegistry(
	slug = process.env.LOGIS_COMPANY_SLUG ?? 'hyperquote',
) {
	const normalizedSlug = normalizeSlug(slug)
	const file = join(companyRegistryDir, `${normalizedSlug}.yml`)
	const company = parseSimpleYaml(readFileSync(file, 'utf8'))
	validateCompanyRegistry(company, file)
	return company
}

export function validateCompanyRegistry(company, source = 'company registry') {
	const errors = []
	if (!isSlug(company.slug)) errors.push('slug must be lowercase kebab-case')
	if (!company.brand?.name) errors.push('brand.name is required')
	if (!company.infisical?.path?.startsWith('/Projects/')) {
		errors.push('infisical.path must start with /Projects/')
	}
	if (!company.supabase?.projectId)
		errors.push('supabase.projectId is required')
	if (!company.supabase?.region) errors.push('supabase.region is required')
	for (const key of ['root', ...APP_IDS]) {
		if (!company.domains?.[key]) errors.push(`domains.${key} is required`)
	}
	for (const appId of APP_IDS) {
		const app = company.apps?.[appId]
		if (!app) {
			errors.push(`apps.${appId} is required`)
			continue
		}
		if (!app.directory) errors.push(`apps.${appId}.directory is required`)
		if (!app.workerName) errors.push(`apps.${appId}.workerName is required`)
		if (!app.cookieName) errors.push(`apps.${appId}.cookieName is required`)
		if (!app.url?.startsWith('https://')) {
			errors.push(`apps.${appId}.url must be an https URL`)
		}
		if (!Array.isArray(app.routes) || app.routes.length === 0) {
			errors.push(`apps.${appId}.routes must list at least one domain`)
		}
		if (!app.worker?.main) errors.push(`apps.${appId}.worker.main is required`)
	}
	if (errors.length > 0) {
		throw new Error(`${source} is invalid:\n- ${errors.join('\n- ')}`)
	}
}

export function companyAppById(company, id) {
	const app = company.apps?.[id]
	if (!app) {
		throw new Error(
			`Unknown company app "${id}". Use one of: ${APP_IDS.join(', ')}`,
		)
	}
	return {
		...app,
		absoluteDirectory: join(repoRoot, app.directory),
		domain: app.routes[0],
		id,
		wranglerConfig: join(repoRoot, app.directory, 'wrangler.jsonc'),
		generatedWranglerConfig: join(
			generatedConfigDir,
			company.slug,
			`${id}.wrangler.json`,
		),
	}
}

export function selectedCompanyApps(company, selection) {
	if (!selection || selection === 'all') {
		return APP_IDS.map((id) => companyAppById(company, id))
	}
	return selection.split(',').map((id) => companyAppById(company, id.trim()))
}

export function companyUrls(company) {
	return {
		driver: company.apps.driver.url,
		internal: company.apps.internal.url,
		portal: company.apps.portal.url,
		root: `https://${company.domains.root}`,
		website: company.apps.website.url,
	}
}

export function companyBuildEnv(company, app, env = process.env) {
	const urls = companyUrls(company)
	return {
		LOGIS_COMPANY_SLUG: company.slug,
		LOGIS_DEPLOYMENT_ID: env.LOGIS_DEPLOYMENT_ID ?? env.GITHUB_RUN_ID ?? '',
		LOGIS_RELEASE_CHANNEL: env.LOGIS_RELEASE_CHANNEL ?? 'stable',
		LOGIS_VERSION: env.LOGIS_VERSION ?? env.GITHUB_SHA ?? '',
		VITE_DRIVER_API_BASE: urls.driver,
		VITE_INTERNAL_URL: urls.internal,
		VITE_MAPTILER_KEY: env.VITE_MAPTILER_KEY ?? env.MAPTILER_KEY ?? '',
		VITE_PORTAL_URL: urls.portal,
		VITE_ROAD_ROUTE_ENDPOINT:
			env.VITE_ROAD_ROUTE_ENDPOINT ??
			env.ROAD_ROUTE_ENDPOINT ??
			'https://router.project-osrm.org/route/v1/driving',
		VITE_SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
		VITE_SUPABASE_COOKIE_NAME: app.cookieName,
		VITE_SUPABASE_URL: env.SUPABASE_URL,
		VITE_SUPPORT_EMAIL:
			env.VITE_SUPPORT_EMAIL ??
			env.SUPPORT_INBOUND_EMAIL ??
			company.support.email,
		VITE_SUPPORT_PHONE_E164:
			env.VITE_SUPPORT_PHONE_E164 ?? env.SUPPORT_PHONE_E164 ?? '',
		VITE_SUPPORT_PHONE_LABEL:
			env.VITE_SUPPORT_PHONE_LABEL ?? env.SUPPORT_PHONE_LABEL ?? '',
		VITE_SUPPORT_WHATSAPP_E164:
			env.VITE_SUPPORT_WHATSAPP_E164 ?? env.SUPPORT_WHATSAPP_E164 ?? '',
		VITE_USE_AI: env.VITE_USE_AI ?? env.USE_AI ?? 'true',
		VITE_WEBSITE_URL: urls.website,
	}
}

export function companySupabaseConfig(company, config) {
	const urls = companyUrls(company)
	const redirects = [
		urls.website,
		`${urls.website}/login`,
		urls.portal,
		`${urls.portal}/login`,
		urls.internal,
		`${urls.internal}/login`,
		urls.driver,
		`${urls.driver}/login`,
	]
	return config
		.replace(
			/^project_id = "hyperquote"$/m,
			`project_id = "${company.supabase.projectId}"`,
		)
		.replace(
			/^site_url = "http:\/\/localhost:3000"$/m,
			`site_url = "${urls.website}"`,
		)
		.replace(
			/additional_redirect_urls = \[[\s\S]*?\]\n/,
			`additional_redirect_urls = [\n${redirects.map((url) => `  "${url}"`).join(',\n')}\n]\n`,
		)
		.replace(
			/\n# Use pre-defined local phone OTPs for development smoke checks\.\n\[auth\.sms\.test_otp\]\n(?:[^\n]+\n)+/u,
			'\n',
		)
}

export function writeGeneratedWranglerConfig(company, app) {
	const config = {
		$schema: '../../node_modules/wrangler/config-schema.json',
		name: app.workerName,
		main: app.worker.main,
		compatibility_date: '2026-05-22',
		compatibility_flags: ['nodejs_compat'],
		workers_dev: false,
		routes: app.routes.map((pattern) => ({ custom_domain: true, pattern })),
		...(app.worker.assets ? { assets: app.worker.assets } : {}),
		observability: { enabled: true },
		vars: {
			APP_ENV: 'production',
			DRIVER_URL: company.apps.driver.url,
			INTERNAL_URL: company.apps.internal.url,
			LOGIS_COMPANY_SLUG: company.slug,
			LOGIS_RELEASE_CHANNEL: process.env.LOGIS_RELEASE_CHANNEL ?? 'stable',
			LOGIS_VERSION: process.env.LOGIS_VERSION ?? process.env.GITHUB_SHA ?? '',
			PORTAL_URL: company.apps.portal.url,
			SUPABASE_COOKIE_NAME: app.cookieName,
			WEBSITE_URL: company.apps.website.url,
		},
	}
	mkdirSync(dirname(app.generatedWranglerConfig), { recursive: true })
	writeFileSync(
		app.generatedWranglerConfig,
		`${JSON.stringify(config, null, 2)}\n`,
	)
	return app.generatedWranglerConfig
}

export function resolveEnvBackedValue(value, env = process.env) {
	if (typeof value !== 'string') return value
	if (!value.startsWith('env:')) return value
	return env[value.slice(4)]?.trim() ?? ''
}

function normalizeSlug(slug) {
	const normalized = String(slug ?? '').trim()
	if (!isSlug(normalized)) {
		throw new Error(`Invalid company slug "${slug}". Use lowercase kebab-case.`)
	}
	return normalized
}

function isSlug(value) {
	return typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)
}

function parseSimpleYaml(source) {
	const root = {}
	const stack = [{ indent: -1, value: root }]
	const lines = source.split(/\r?\n/u)
	for (const [lineIndex, rawLine] of lines.entries()) {
		const withoutComment = rawLine.replace(/\s+#.*$/u, '')
		if (!withoutComment.trim()) continue
		const indent = withoutComment.match(/^ */u)?.[0].length ?? 0
		const line = withoutComment.trim()
		while (stack.at(-1).indent >= indent) stack.pop()
		const parent = stack.at(-1).value
		if (line.startsWith('- ')) {
			if (!Array.isArray(parent))
				throw new Error(`Invalid YAML list line: ${rawLine}`)
			parent.push(parseScalar(line.slice(2).trim()))
			continue
		}
		const match = /^([^:]+):(.*)$/u.exec(line)
		if (!match) throw new Error(`Invalid YAML line: ${rawLine}`)
		const key = match[1].trim()
		const rest = match[2].trim()
		if (rest) {
			parent[key] = parseScalar(rest)
			continue
		}
		const nextContainer = nextMeaningfulLineIsList(lines, lineIndex) ? [] : {}
		parent[key] = nextContainer
		stack.push({ indent, value: nextContainer })
	}
	return root
}

function nextMeaningfulLineIsList(lines, currentIndex) {
	const currentIndent = lines[currentIndex].match(/^ */u)?.[0].length ?? 0
	for (const line of lines.slice(currentIndex + 1)) {
		if (!line.trim() || line.trim().startsWith('#')) continue
		const indent = line.match(/^ */u)?.[0].length ?? 0
		return indent > currentIndent && line.trim().startsWith('- ')
	}
	return false
}

function parseScalar(value) {
	if (value === 'true') return true
	if (value === 'false') return false
	if (/^-?\d+$/u.test(value)) return Number(value)
	return value.replace(/^"(.*)"$/u, '$1').replace(/^'(.*)'$/u, '$1')
}
