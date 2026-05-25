#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import {
	cpSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { productionSupabaseConfig, repoRoot } from './production-config.mjs'

const required = ['SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN']
const missing = required.filter((name) => !process.env[name]?.trim())
if (missing.length > 0) {
	console.error(
		`Cannot configure production Supabase. Missing env: ${missing.join(', ')}`,
	)
	process.exit(1)
}

const tempRoot = mkdtempSync(join(tmpdir(), 'hyperquote-supabase-production-'))
let exitCode = 0
try {
	const sourceDir = join(repoRoot, 'supabase')
	const targetDir = join(tempRoot, 'supabase')
	cpSync(sourceDir, targetDir, { recursive: true })
	writeFileSync(
		join(targetDir, 'config.toml'),
		productionSupabaseConfig(
			readFileSync(join(sourceDir, 'config.toml'), 'utf8'),
		),
	)
	run('supabase', [
		'config',
		'push',
		'--project-ref',
		process.env.SUPABASE_PROJECT_REF,
		'--workdir',
		tempRoot,
		'--yes',
	])
} catch (error) {
	exitCode = 1
	console.error(error instanceof Error ? error.message : String(error))
} finally {
	rmSync(tempRoot, { force: true, recursive: true })
}

process.exit(exitCode)

function run(command, args) {
	const result = spawnSync(command, args, {
		cwd: repoRoot,
		env: supabaseConfigEnv(),
		stdio: 'inherit',
	})
	if (result.status !== 0) {
		throw new Error(`${command} exited with code ${result.status ?? 1}`)
	}
}

function supabaseConfigEnv() {
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
