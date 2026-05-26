#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import {
	productionSupabaseDatabaseUrl,
	repoRoot,
} from './production-config.mjs'

const confirmation = process.env.HYPERQUOTE_CONFIRM_PRODUCTION_RESET?.trim()
if (confirmation !== 'reset-hyperquote-production-showcase') {
	console.error(
		'Refusing to reset production Supabase without HYPERQUOTE_CONFIRM_PRODUCTION_RESET=reset-hyperquote-production-showcase.',
	)
	process.exit(1)
}

const required = [
	'SUPABASE_PROJECT_REF',
	'SUPABASE_URL',
	'SUPABASE_SERVICE_ROLE_KEY',
]
const missing = required.filter((name) => !process.env[name]?.trim())
const dbUrl = productionSupabaseDatabaseUrl()
if (!dbUrl) missing.push('SUPABASE_DB_URL or SUPABASE_DB_PASSWORD')
if (missing.length > 0) {
	console.error(
		`Cannot reset production Supabase showcase baseline. Missing env: ${missing.join(', ')}`,
	)
	process.exit(1)
}

const dumpDir = join(repoRoot, 'supabase', '.temp', 'production-dumps')
mkdirSync(dumpDir, { recursive: true })
const stamp = new Date().toISOString().replaceAll(/[:.]/g, '-')
const schemaDumpPath = join(dumpDir, `pre-showcase-reset-${stamp}.schema.sql`)
const dataDumpPath = join(dumpDir, `pre-showcase-reset-${stamp}.data.sql`)

run('supabase', ['migration', 'list', '--db-url', dbUrl])
run('supabase', ['db', 'dump', '--db-url', dbUrl, '--file', schemaDumpPath])
run('supabase', [
	'db',
	'dump',
	'--db-url',
	dbUrl,
	'--data-only',
	'--use-copy',
	'--file',
	dataDumpPath,
])
run('supabase', ['db', 'reset', '--db-url', dbUrl, '--no-seed', '--yes'])
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
	'--clean-auth',
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

console.log(`Production dump written under ${relativeDumpDir()}`)
console.log('Production Supabase showcase reset completed.')

function run(command, args, extraEnv = {}) {
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		encoding: 'utf8',
		env: {
			...supabaseCliEnv(),
			...extraEnv,
		},
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.stdout) process.stdout.write(redact(result.stdout))
	if (result.stderr) process.stderr.write(redact(result.stderr))
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

function redact(output) {
	let redacted = output.replaceAll(dbUrl, '[redacted-db-url]')
	for (const name of [
		'SUPABASE_SERVICE_ROLE_KEY',
		'SUPABASE_ANON_KEY',
		'SUPABASE_DB_PASSWORD',
	]) {
		const value = process.env[name]?.trim()
		if (value) redacted = redacted.replaceAll(value, `[redacted-${name}]`)
	}
	return redacted
}

function relativeDumpDir() {
	return 'supabase/.temp/production-dumps'
}
