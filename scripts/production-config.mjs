import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
	companyAppById,
	companyBuildEnv,
	companySupabaseConfig,
	companyUrls,
	loadCompanyRegistry,
	selectedCompanyApps,
} from './logis/registry.mjs'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const productionCompany = loadCompanyRegistry()

export const productionUrls = companyUrls(productionCompany)

export const requiredProductionBuildEnvNames = [
	'SUPABASE_URL',
	'SUPABASE_ANON_KEY',
]

export const productionAuthAdvisorConfig = {
	mfa_totp_enroll_enabled: true,
	mfa_totp_verify_enabled: true,
}

export const productionPlanGatedAuthAdvisorConfig = {
	password_hibp_enabled: true,
}

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
	'LOGIS_CONTROL_URL',
	'LOGIS_DEPLOY_STATUS_URL',
	'LOGIS_UPDATE_SIGNING_SECRET',
	'SUPPORT_PHONE_E164',
	'SUPPORT_WHATSAPP_E164',
]

export function productionAppById(id) {
	return companyAppById(productionCompany, id)
}

export function selectedProductionApps(selection) {
	return selectedCompanyApps(productionCompany, selection)
}

export function productionBuildEnv(app, env = process.env) {
	return companyBuildEnv(productionCompany, app, env)
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
	return companySupabaseConfig(productionCompany, config)
}
