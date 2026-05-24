#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import process from 'node:process'

const INFISICAL_DEV_SENTINEL = 'HYPERQUOTE_APP_DEV_INFISICAL_LOADED'
const HYPERQUOTE_INFISICAL_PATH = '/Projects/HyperQuote'

const [command, ...args] = process.argv.slice(2)
if (!command) {
	console.error('Usage: node scripts/with-dev-secrets.mjs <command> [...args]')
	process.exit(1)
}

if (shouldLoadInfisical()) {
	console.log('Loading local development secrets from Infisical dev...')
	const relaunched = spawnSync(
		'infisical',
		[
			'run',
			'--env=dev',
			`--path=${HYPERQUOTE_INFISICAL_PATH}`,
			'--recursive',
			'--',
			process.execPath,
			...process.argv.slice(1),
		],
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
	if (skipInfisical()) return false

	const infisical = spawnSync('infisical', ['--version'], {
		encoding: 'utf8',
		stdio: ['ignore', 'ignore', 'ignore'],
	})
	if (infisical.status === 0) return true
	console.error(
		'Infisical CLI is required for local dev secrets. Install/login to Infisical or set HYPERQUOTE_SKIP_INFISICAL=1 for an explicit local-only bypass.',
	)
	process.exit(1)
}

function skipInfisical() {
	const flag = process.env.HYPERQUOTE_SKIP_INFISICAL
	const normalized = flag?.trim().toLowerCase()
	return normalized === '1' || normalized === 'true'
}
