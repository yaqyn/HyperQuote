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
import {
	productionAuthAdvisorConfig,
	productionPlanGatedAuthAdvisorConfig,
	productionSupabaseConfig,
	repoRoot,
} from './production-config.mjs'

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
	await updateProductionAuthConfig(
		productionAuthAdvisorConfig,
		'Production Supabase Auth advisor settings updated.',
	)
	await updateProductionAuthConfig(
		productionPlanGatedAuthAdvisorConfig,
		'Production Supabase plan-gated Auth advisor settings updated.',
		{ allowPaymentRequired: true },
	)
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

async function updateProductionAuthConfig(
	config,
	successMessage,
	options = {},
) {
	const response = await fetch(
		`https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/config/auth`,
		{
			body: JSON.stringify(config),
			headers: {
				Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
				'Content-Type': 'application/json',
			},
			method: 'PATCH',
		},
	)
	if (!response.ok) {
		const message = await response.text()
		if (options.allowPaymentRequired && response.status === 402) {
			console.warn(
				`Skipped plan-gated Supabase Auth advisor settings: ${message}`,
			)
			return
		}
		throw new Error(
			`Supabase Auth config update failed with HTTP ${response.status}: ${message}`,
		)
	}
	console.log(successMessage)
}
