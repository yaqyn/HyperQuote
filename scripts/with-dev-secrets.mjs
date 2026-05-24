#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const INFISICAL_DEV_SENTINEL = 'HYPERQUOTE_APP_DEV_INFISICAL_LOADED'

const [command, ...args] = process.argv.slice(2)
if (!command) {
	console.error('Usage: node scripts/with-dev-secrets.mjs <command> [...args]')
	process.exit(1)
}

if (shouldLoadInfisical()) {
	console.log('Loading local development secrets from Infisical...')
	const relaunched = spawnSync(
		'infisical',
		['run', '--recursive', '--', process.execPath, ...process.argv.slice(1)],
		{
			env: {
				...process.env,
				[INFISICAL_DEV_SENTINEL]: '1',
			},
			stdio: 'inherit',
		},
	)
	process.exit(relaunched.status ?? 1)
}

const child = spawnSync(command, args, {
	env: process.env,
	stdio: 'inherit',
})
if (child.error) {
	console.error(child.error.message)
	process.exit(1)
}
process.exit(child.status ?? 1)

function shouldLoadInfisical() {
	if (process.env[INFISICAL_DEV_SENTINEL]) return false
	if (process.env.HYPERQUOTE_DEV_INFISICAL_LOADED) return false
	if (process.env.CI) return false
	if (!localAiRequested()) return false
	if (process.env.GROQ_API_KEY || process.env.HQ_GROQ_API_KEY) return false

	const infisical = spawnSync('infisical', ['--version'], {
		encoding: 'utf8',
		stdio: ['ignore', 'ignore', 'ignore'],
	})
	return infisical.status === 0
}

function localAiRequested() {
	const flag = process.env.USE_AI ?? process.env.HQ_USE_AI
	const normalized = flag?.trim().toLowerCase()
	return normalized !== '0' && normalized !== 'false'
}
