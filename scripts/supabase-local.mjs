#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'
import {
	hasConfiguredTwilioVerifyEnv,
	withLocalSupabaseAuthEnv,
} from './supabase-auth-env.mjs'

const INFISICAL_SENTINEL = 'HYPERQUOTE_SUPABASE_INFISICAL_LOADED'

const args = process.argv.slice(2)
const quiet = args.includes('--quiet')
const supabaseArgs = args.filter((arg) => arg !== '--quiet')

maybeRelaunchWithInfisical()

if (supabaseArgs.length === 0) {
	console.error('Usage: node scripts/supabase-local.mjs <supabase args...>')
	process.exit(1)
}

if (!quiet && !hasConfiguredTwilioVerifyEnv(process.env)) {
	console.error(
		'Twilio Verify credentials are not configured; real phone OTP delivery will fail. Local Supabase test OTP numbers still work.',
	)
}

const child = spawn('supabase', supabaseArgs, {
	env: withLocalSupabaseAuthEnv(process.env),
	stdio: quiet ? 'ignore' : ['inherit', 'pipe', 'pipe'],
})

if (!quiet) {
	child.stdout?.on('data', (chunk) => {
		process.stdout.write(sanitizeSupabaseOutput(chunk.toString()))
	})
	child.stderr?.on('data', (chunk) => {
		process.stderr.write(sanitizeSupabaseOutput(chunk.toString()))
	})
}

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal)
		return
	}
	process.exit(code ?? 0)
})

function sanitizeSupabaseOutput(output) {
	return output
		.split('\n')
		.map((line) => {
			if (
				/(anon key|service_role key|jwt secret|publishable|secret|access key)/i.test(
					line,
				)
			) {
				return line.replace(/(│\s*)[^│]+(\s*│?)$/u, '$1<redacted>$2')
			}
			return line
		})
		.join('\n')
}

function maybeRelaunchWithInfisical() {
	if (process.env[INFISICAL_SENTINEL]) return
	if (process.env.CI) return
	if (hasConfiguredTwilioVerifyEnv(process.env)) return

	const infisical = spawnSync('infisical', ['--version'], {
		encoding: 'utf8',
		stdio: ['ignore', 'ignore', 'ignore'],
	})
	if (infisical.status !== 0) return

	const relaunched = spawnSync(
		'infisical',
		['run', '--recursive', '--', process.execPath, ...process.argv.slice(1)],
		{
			env: {
				...process.env,
				[INFISICAL_SENTINEL]: '1',
			},
			stdio: 'inherit',
		},
	)
	process.exit(relaunched.status ?? 1)
}
