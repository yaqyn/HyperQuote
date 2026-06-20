#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { connect } from 'node:net'
import process from 'node:process'

const HYPERQUOTE_INFISICAL_PATH = '/Projects/HyperQuote'
const APP_PORTS = [
	{ name: 'website', port: 3000, url: 'http://localhost:3000' },
	{ name: 'portal', port: 3001, url: 'http://localhost:3001' },
	{ name: 'internal', port: 3002, url: 'http://localhost:3002' },
	{ name: 'driver', port: 3003, url: 'http://localhost:3003' },
]

main().catch((error) => {
	fail(error instanceof Error ? error.message : String(error))
})

async function main() {
	log('HyperQuote local dev launcher')
	log('Checking required CLIs...')
	requireCommand('bun', 'Install Bun, then run this again.')
	requireCommand('node', 'Node is required by the repo scripts.')
	requireCommand('supabase', 'Install Supabase CLI, then run this again.')

	if (!skipInfisical()) {
		requireCommand(
			'infisical',
			'Install Infisical CLI, then run `infisical login`.',
		)
		await verifyInfisical()
	} else {
		warn('Skipping Infisical because HYPERQUOTE_SKIP_INFISICAL is set.')
	}

	const busyPorts = await busyAppPorts()
	if (busyPorts.length === APP_PORTS.length) {
		log('HyperQuote dev stack already appears to be running.')
		log('URLs:')
		for (const app of APP_PORTS) log(`  ${app.name.padEnd(8)} ${app.url}`)
		log(
			'Use the existing browser tabs, or press Ctrl+C in the terminal running dev before starting a fresh stack.',
		)
		return
	}
	if (busyPorts.length > 0) {
		fail(
			[
				'Some app ports are already in use:',
				...busyPorts.map((app) => `  ${app.name}: ${app.url}`),
				'Stop the process using those ports, then run `bun run dev` again.',
			].join('\n'),
		)
	}
	await ensureSupabase()

	log('Starting apps. Leave this terminal open; press Ctrl+C to stop.')
	log('URLs:')
	for (const app of APP_PORTS) log(`  ${app.name.padEnd(8)} ${app.url}`)
	log('Supabase Studio: http://localhost:54323')

	const child = spawn(process.execPath, ['scripts/dev-local.mjs'], {
		stdio: 'inherit',
	})
	child.on('exit', (code, signal) => {
		if (signal) process.kill(process.pid, signal)
		process.exit(code ?? 0)
	})
}

function requireCommand(command, hint) {
	const result = spawnSync(command, ['--version'], {
		encoding: 'utf8',
		stdio: ['ignore', 'ignore', 'ignore'],
	})
	if (result.status === 0) return
	fail(`Missing required command: ${command}\n${hint}`)
}

async function verifyInfisical() {
	log('Checking Infisical dev access...')
	const result = spawnSync(
		'infisical',
		[
			'run',
			'--silent',
			'--env=dev',
			`--path=${HYPERQUOTE_INFISICAL_PATH}`,
			'--recursive',
			'--',
			process.execPath,
			'-e',
			'process.exit(0)',
		],
		{
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	)
	if (result.status === 0) return

	const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
	const loginHint = /login|session|auth/i.test(output)
		? 'Run `infisical login`, then run `bun run dev` again.'
		: 'Check Infisical access to /Projects/HyperQuote dev secrets.'
	fail(`Infisical dev access is not ready.\n${loginHint}`)
}

async function ensureSupabase() {
	log('Checking local Supabase...')
	if (readLocalSupabaseEnv()) {
		log('Local Supabase is already running.')
		return
	}

	log('Starting local Supabase with repo script...')
	const started = spawnSync('bun', ['run', 'db:start'], {
		stdio: 'inherit',
	})
	if (started.status !== 0) {
		fail(
			[
				'Could not start local Supabase.',
				'Try `bun run db:start` to inspect the full Supabase output.',
				'If Docker is stopped, start Docker and retry.',
			].join('\n'),
		)
	}

	if (readLocalSupabaseEnv()) {
		log('Local Supabase is ready.')
		return
	}
	fail(
		[
			'Supabase start finished, but local API keys were not readable.',
			'Run `supabase status -o env` and check for API_URL, ANON_KEY, and SERVICE_ROLE_KEY.',
		].join('\n'),
	)
}

function readLocalSupabaseEnv() {
	const result = spawnSync('supabase', ['status', '-o', 'env'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
	})
	if (result.status !== 0) return null
	const env = parseEnvOutput(result.stdout)
	if (!env.API_URL || !env.ANON_KEY || !env.SERVICE_ROLE_KEY) return null
	return env
}

function parseEnvOutput(output) {
	const env = {}
	for (const line of output.split('\n')) {
		const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
		if (!match) continue
		env[match[1]] = stripEnvQuotes(match[2] ?? '')
	}
	return env
}

function stripEnvQuotes(value) {
	if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
	return value
}

async function busyAppPorts() {
	const busy = []
	for (const app of APP_PORTS) {
		if (await isPortOpen(app.port)) busy.push(app)
	}
	return busy
}

function isPortOpen(port) {
	return Promise.all([
		isHostPortOpen('127.0.0.1', port),
		isHostPortOpen('::1', port),
	]).then((results) => results.some(Boolean))
}

function isHostPortOpen(host, port) {
	return new Promise((resolve) => {
		const socket = connect({ host, port })
		let settled = false
		const finish = (open) => {
			if (settled) return
			settled = true
			socket.destroy()
			resolve(open)
		}
		socket.once('connect', () => finish(true))
		socket.once('error', () => finish(false))
		socket.setTimeout(750, () => finish(false))
	})
}

function skipInfisical() {
	const normalized = process.env.HYPERQUOTE_SKIP_INFISICAL?.trim().toLowerCase()
	return normalized === '1' || normalized === 'true'
}

function log(message) {
	console.log(`dev: ${message}`)
}

function warn(message) {
	console.warn(`dev warning: ${message}`)
}

function fail(message) {
	console.error(`dev error: ${message}`)
	process.exit(1)
}
