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
	['staging', { infisicalEnv: 'staging', label: 'staging' }],
	['stage', { infisicalEnv: 'staging', label: 'staging' }],
	['production', { infisicalEnv: 'prod', label: 'production' }],
	['prod', { infisicalEnv: 'prod', label: 'production' }],
])

const requestedEnv = process.argv[2] ?? 'dev'
const target = ENV_ALIASES.get(requestedEnv)

if (!target) {
	console.error(
		`Unknown Infisical environment "${requestedEnv}". Use dev, staging, or production.`,
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

const warnings = optionalSecretGroups().filter(
	(group) => !isGroupConfigured(group),
)

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

	if (infisicalEnv === 'dev') return twilioVerify

	return [
		...twilioVerify,
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
	]
}

function optionalSecretGroups() {
	return [
		{
			label: 'AI provider key (GROQ_API_KEY or HQ_GROQ_API_KEY)',
			names: ['GROQ_API_KEY', 'HQ_GROQ_API_KEY'],
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
