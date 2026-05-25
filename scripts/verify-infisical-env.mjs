#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const VERIFY_SENTINEL = 'HYPERQUOTE_VERIFY_INFISICAL_ENV'
const HYPERQUOTE_INFISICAL_PATH = '/Projects/HyperQuote'

const ENV_ALIASES = new Map([
	['dev', { infisicalEnv: 'dev', label: 'local dev' }],
	['local', { infisicalEnv: 'dev', label: 'local dev' }],
	['local-dev', { infisicalEnv: 'dev', label: 'local dev' }],
	['production', { infisicalEnv: 'prod', label: 'production' }],
	['prod', { infisicalEnv: 'prod', label: 'production' }],
])

const requestedEnv = process.argv[2] ?? 'dev'
const target = ENV_ALIASES.get(requestedEnv)

if (!target) {
	console.error(
		`Unknown Infisical environment "${requestedEnv}". Use dev or production.`,
	)
	process.exit(1)
}

if (process.env[VERIFY_SENTINEL] !== target.infisicalEnv) {
	const infisical = spawnSync('infisical', ['--version'], {
		encoding: 'utf8',
		stdio: ['ignore', 'ignore', 'ignore'],
	})
	if (infisical.status !== 0) {
		console.error('Infisical CLI is required to verify environment secrets.')
		process.exit(1)
	}

	const relaunched = spawnSync(
		'infisical',
		[
			'run',
			`--env=${target.infisicalEnv}`,
			`--path=${HYPERQUOTE_INFISICAL_PATH}`,
			'--recursive',
			'--',
			process.execPath,
			fileURLToPath(import.meta.url),
			requestedEnv,
		],
		{
			env: {
				...process.env,
				[VERIFY_SENTINEL]: target.infisicalEnv,
			},
			stdio: 'inherit',
		},
	)
	process.exit(relaunched.status ?? 1)
}

const requiredGroups = requiredSecretGroups(target.infisicalEnv)
const missing = requiredGroups.filter((group) => !isGroupConfigured(group))

if (missing.length > 0) {
	console.error(`Infisical ${target.label} is missing required secret groups:`)
	for (const group of missing) {
		console.error(`- ${group.label}`)
	}
	process.exit(1)
}

const warnings =
	process.env.HYPERQUOTE_WARN_OPTIONAL_SECRETS === '1'
		? optionalSecretGroups().filter((group) => !isGroupConfigured(group))
		: []

console.log(`Infisical ${target.label} has the required secret groups.`)
for (const group of warnings) {
	console.warn(`Optional secret group missing: ${group.label}`)
}

function requiredSecretGroups(infisicalEnv) {
	const twilioVerify = [
		{
			label:
				'Twilio account SID (TWILIO_ACCOUNT_SID or SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID, starts with AC)',
			names: ['TWILIO_ACCOUNT_SID', 'SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID'],
			isValid: (value) => value.startsWith('AC'),
		},
		{
			label:
				'Twilio Verify service SID (TWILIO_VERIFY_SERVICE_SID or SUPABASE_AUTH_SMS_TWILIO_VERIFY_SERVICE_SID, starts with VA)',
			names: [
				'TWILIO_VERIFY_SERVICE_SID',
				'SUPABASE_AUTH_SMS_TWILIO_VERIFY_SERVICE_SID',
			],
			isValid: (value) => value.startsWith('VA'),
		},
		{
			label:
				'Twilio auth token (TWILIO_AUTH_TOKEN or SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN)',
			names: ['TWILIO_AUTH_TOKEN', 'SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN'],
			isValid: (value) => value.length > 0,
		},
	]
	const resendEmail = [
		{
			label: 'Resend API key (RESEND_API_KEY, starts with re_)',
			names: ['RESEND_API_KEY'],
			isValid: (value) => value.startsWith('re_'),
		},
	]

	if (infisicalEnv === 'dev') return [...twilioVerify, ...resendEmail]

	return [
		...twilioVerify,
		...resendEmail,
		{
			label: 'Resend inbound webhook secret (RESEND_WEBHOOK_SECRET)',
			names: ['RESEND_WEBHOOK_SECRET'],
			isValid: (value) => value.length > 0,
		},
		{
			label: 'Production cookie domain (COOKIE_DOMAIN=.hyperquote.net)',
			names: ['COOKIE_DOMAIN'],
			isValid: (value) => value === '.hyperquote.net',
		},
		{
			label: 'Support inbound email (SUPPORT_INBOUND_EMAIL)',
			names: ['SUPPORT_INBOUND_EMAIL'],
			isValid: isEmail,
		},
		{
			label: 'Support reply-to email (SUPPORT_REPLY_TO)',
			names: ['SUPPORT_REPLY_TO'],
			isValid: isEmail,
		},
		{
			label: 'Support sender (SUPPORT_EMAIL_FROM)',
			names: ['SUPPORT_EMAIL_FROM'],
			isValid: (value) => value.length > 0,
		},
		{
			label: 'Support URL (SUPPORT_URL, https URL)',
			names: ['SUPPORT_URL'],
			isValid: (value) => value.startsWith('https://'),
		},
		{
			label: 'Hosted Supabase URL (SUPABASE_URL, https URL)',
			names: ['SUPABASE_URL'],
			isValid: (value) => value.startsWith('https://'),
		},
		{
			label: 'Hosted Supabase anon key (SUPABASE_ANON_KEY)',
			names: ['SUPABASE_ANON_KEY'],
			isValid: (value) => value.length > 0,
		},
		{
			label: 'Hosted Supabase service role key (SUPABASE_SERVICE_ROLE_KEY)',
			names: ['SUPABASE_SERVICE_ROLE_KEY'],
			isValid: (value) => value.length > 0,
		},
		{
			label:
				'Supabase production database URL or password (SUPABASE_DB_URL or SUPABASE_DB_PASSWORD)',
			names: ['SUPABASE_DB_URL', 'SUPABASE_DB_PASSWORD'],
			isValid: (value) =>
				value.length > 0 &&
				(value === process.env.SUPABASE_DB_PASSWORD?.trim() ||
					value.startsWith('postgres://') ||
					value.startsWith('postgresql://')),
		},
		{
			label: 'Supabase production project ref (SUPABASE_PROJECT_REF)',
			names: ['SUPABASE_PROJECT_REF'],
			isValid: (value) => value.length > 0,
		},
		{
			label: 'Cloudflare account ID (CLOUDFLARE_ACCOUNT_ID)',
			names: ['CLOUDFLARE_ACCOUNT_ID'],
			isValid: (value) => value.length > 0,
		},
		{
			label: 'Cloudflare zone ID (CLOUDFLARE_ZONE_ID)',
			names: ['CLOUDFLARE_ZONE_ID'],
			isValid: (value) => value.length > 0,
		},
		{
			label: 'Cloudflare deploy token (CLOUDFLARE_API_TOKEN)',
			names: ['CLOUDFLARE_API_TOKEN'],
			isValid: (value) => value.length > 0,
		},
		{
			label: 'Groq API key (GROQ_API_KEY)',
			names: ['GROQ_API_KEY'],
			isValid: (value) => value.length > 0,
		},
	]
}

function optionalSecretGroups() {
	return [
		{
			label: 'MapTiler browser key (MAPTILER_KEY)',
			names: ['MAPTILER_KEY', 'VITE_MAPTILER_KEY'],
			isValid: (value) => value.length > 0,
		},
		{
			label: 'Road-route endpoint override (ROAD_ROUTE_ENDPOINT)',
			names: ['ROAD_ROUTE_ENDPOINT', 'VITE_ROAD_ROUTE_ENDPOINT'],
			isValid: (value) => value.length > 0,
		},
	]
}

function isGroupConfigured(group) {
	return group.names.some((name) => {
		const value = process.env[name]?.trim()
		return value ? group.isValid(value) : false
	})
}

function isEmail(value) {
	return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value)
}
