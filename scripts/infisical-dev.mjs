import { spawnSync } from 'node:child_process'

export const HYPERQUOTE_INFISICAL_PATH = '/Projects/HyperQuote'
export const INFISICAL_DEV_SENTINEL = 'HYPERQUOTE_DEV_INFISICAL_LOADED'

const INFISICAL_DEV_ENV = 'dev'

export function skipInfisical(env = process.env) {
	const normalized = env.HYPERQUOTE_SKIP_INFISICAL?.trim().toLowerCase()
	return normalized === '1' || normalized === 'true'
}

export function requireInfisicalReady(label) {
	const cli = spawnSync('infisical', ['--version'], {
		encoding: 'utf8',
		stdio: ['ignore', 'ignore', 'ignore'],
	})
	if (cli.status !== 0) {
		console.error(
			`Infisical CLI is required for ${label}. Install Infisical CLI, then run \`infisical login\`.`,
		)
		process.exit(1)
	}

	const status = spawnSync('infisical', ['login', 'status'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (status.status === 0) return

	const details = sanitizeInfisicalStatus(
		`${status.stdout ?? ''}${status.stderr ?? ''}`,
	)
	console.error(
		[
			`Infisical login is not ready for ${label}.`,
			details,
			'Run `infisical login`, then run the command again.',
		]
			.filter(Boolean)
			.join('\n'),
	)
	process.exit(status.status ?? 1)
}

export function infisicalDevRunArgs(commandArgs) {
	return [
		'run',
		`--env=${INFISICAL_DEV_ENV}`,
		`--path=${HYPERQUOTE_INFISICAL_PATH}`,
		'--recursive',
		'--',
		...commandArgs,
	]
}

function sanitizeInfisicalStatus(output) {
	return output
		.split('\n')
		.map((line) => line.trim())
		.map((line) =>
			line.startsWith('x Failed to authenticate as ')
				? 'x Failed to authenticate with the current Infisical login.'
				: line,
		)
		.filter(Boolean)
		.filter(
			(line) => !line.startsWith('A new release of infisical is available'),
		)
		.filter((line) => !line.startsWith('To update, run:'))
		.filter((line) => !line.includes('Run `infisical login`'))
		.filter((line) => !line.includes('User ID:'))
		.filter((line) => !line.includes('Organization:'))
		.join('\n')
}
