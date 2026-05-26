#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import {
	productionSupabaseDatabaseUrl,
	repoRoot,
} from './production-config.mjs'

const required = ['SUPABASE_PROJECT_REF']
const missing = required.filter((name) => !process.env[name]?.trim())
const dbUrl = productionSupabaseDatabaseUrl()
if (!dbUrl) {
	missing.push('SUPABASE_DB_URL or SUPABASE_DB_PASSWORD')
}
if (missing.length > 0) {
	console.error(
		`Cannot deploy production Supabase. Missing env: ${missing.join(', ')}`,
	)
	process.exit(1)
}

run('supabase', ['migration', 'list', '--db-url', dbUrl])
run('supabase', ['db', 'push', '--db-url', dbUrl, '--yes'])
run(
	process.execPath,
	['scripts/seed-showcase-baseline.mjs', '--production', '--quiet'],
	{
		SUPABASE_DB_URL: dbUrl,
	},
)
run(process.execPath, [
	'scripts/seed-local-auth.mjs',
	'--production',
	'--primary-only',
	'--quiet',
])

run(process.execPath, ['scripts/assert-supabase-api-boundary.mjs'], {
	SUPABASE_DB_URL: dbUrl,
})
run(
	process.execPath,
	['scripts/verify-showcase-baseline.mjs', '--production', '--exact-auth'],
	{
		SUPABASE_DB_URL: dbUrl,
	},
)

function run(command, args, extraEnv = {}) {
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		env: {
			...supabaseCliEnv(),
			...extraEnv,
		},
		stdio: 'inherit',
	})
	if (result.status !== 0) process.exit(result.status ?? 1)
}

function supabaseCliEnv() {
	return {
		...process.env,
		SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID:
			process.env.SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID ??
			process.env.TWILIO_ACCOUNT_SID,
		SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN:
			process.env.SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN ??
			process.env.TWILIO_AUTH_TOKEN,
		SUPABASE_AUTH_SMS_TWILIO_VERIFY_SERVICE_SID:
			process.env.SUPABASE_AUTH_SMS_TWILIO_VERIFY_SERVICE_SID ??
			process.env.TWILIO_VERIFY_SERVICE_SID,
	}
}
