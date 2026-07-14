#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, realpathSync } from 'node:fs'
import { connect } from 'node:net'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { devProtocolEnabled, emitDevEvent } from './dev-protocol.mjs'
import {
	INFISICAL_DEV_SENTINEL,
	infisicalDevRunArgs,
	requireInfisicalReady,
	skipInfisical,
} from './infisical-dev.mjs'

const repoRoot = realpathSync(
	join(dirname(fileURLToPath(import.meta.url)), '..'),
)
const SUPABASE_READY_TIMEOUT_MS = 90_000
const SUPABASE_READY_INTERVAL_MS = 1_000
const OWNED_PORT_SHUTDOWN_TIMEOUT_MS = 8_000
const DEV_UI_SENTINEL = 'HYPERQUOTE_DEV_UI_RENDERED'
const doctorOnly = process.argv.includes('--doctor')
const skipToolUpdates = process.argv.includes('--no-update')
const protocolMode = devProtocolEnabled()
const useColor = Boolean(process.stdout.isTTY && !process.env.NO_COLOR)

const APP_PORTS = [
	{ name: 'Website', port: 3000, url: 'http://localhost:3000' },
	{ name: 'Portal', port: 3001, url: 'http://localhost:3001' },
	{ name: 'Internal', port: 3002, url: 'http://localhost:3002' },
	{ name: 'Driver', port: 3003, url: 'http://localhost:3003' },
]

const color = {
	accent: (value) => paint('38;2;37;99;235', value),
	dim: (value) => paint('2', value),
	error: (value) => paint('31', value),
	success: (value) => paint('32', value),
	warning: (value) => paint('33', value),
}

main().catch((error) => {
	fail(error instanceof Error ? error.message : String(error))
})

async function main() {
	if (!process.env[DEV_UI_SENTINEL]) {
		renderBanner()
		status('Runtime', 'CHECK', 'validating Bun and Node')
	}
	requireCommand('bun', 'Install the repo-pinned Bun runtime, then retry.')
	requireCommand('node', 'Node is required by the repository scripts.')
	status('Runtime', 'OK', 'Bun and Node are available')

	if (!process.env[INFISICAL_DEV_SENTINEL] && !skipToolUpdates) {
		status('Dev tools', 'CHECK', 'official GitHub releases, at most daily')
		const updated = spawnSync(
			process.execPath,
			['scripts/update-dev-tools.mjs', '--quiet'],
			{
				cwd: repoRoot,
				encoding: protocolMode ? 'utf8' : undefined,
				stdio: protocolMode ? ['ignore', 'pipe', 'pipe'] : 'inherit',
			},
		)
		if (updated.status !== 0) {
			warn(
				'Automatic CLI update check failed; continuing with installed tools.',
			)
		} else {
			status('Dev tools', 'OK', 'integrity-checked')
		}
	}

	if (!skipInfisical()) {
		loadInfisicalDevSecrets()
	} else {
		warn('Infisical loading is disabled by HYPERQUOTE_SKIP_INFISICAL.')
	}

	requireCommand('supabase', 'Run `bun run dev:tools:update`, then retry.')
	if (!skipInfisical()) {
		requireCommand('infisical', 'Run `bun run dev:tools:update`, then retry.')
	}

	ensureWorkspaceDependencies()
	await ensureSupabase()
	ensureLocalMigrations()

	let busyPorts = await busyAppPorts()
	if (busyPorts.length === APP_PORTS.length) {
		assertOwnedListeners(busyPorts)
		const unhealthyApps = await unhealthyAppPorts()
		if (unhealthyApps.length === 0) {
			status('Application stack', 'READY', 'already running and healthy')
			renderUrls()
			return
		}
		if (doctorOnly) {
			fail(
				`Unhealthy app responses: ${unhealthyApps.map((app) => app.name).join(', ')}.`,
			)
		} else {
			await recoverOwnedListeners(busyPorts)
			busyPorts = []
		}
	}

	if (busyPorts.length > 0) {
		if (doctorOnly) {
			fail(
				`Partial app stack detected on ${busyPorts.map((app) => app.port).join(', ')}.`,
			)
		} else {
			await recoverOwnedListeners(busyPorts)
		}
	}

	if (doctorOnly) {
		status('Doctor', 'OK', 'workspace is ready for local development')
		renderUrls()
		return
	}

	status('Application stack', 'START', 'launching four isolated app servers')
	const child = spawn(process.execPath, ['scripts/dev-local.mjs'], {
		cwd: repoRoot,
		stdio: 'inherit',
	})
	child.on('error', (error) =>
		fail(`Could not launch app stack: ${error.message}`),
	)
	child.on('exit', (code, signal) => {
		if (signal) process.kill(process.pid, signal)
		process.exit(code ?? 0)
	})
}

function loadInfisicalDevSecrets() {
	if (process.env[INFISICAL_DEV_SENTINEL]) {
		status('Secrets', 'OK', 'Infisical dev /Projects/HyperQuote')
		return
	}

	status('Secrets', 'CHECK', 'authenticated Infisical session')
	requireInfisicalReady('HyperQuote dev secrets')
	const relaunched = spawnSync(
		'infisical',
		infisicalDevRunArgs([process.execPath, ...process.argv.slice(1)]),
		{
			cwd: repoRoot,
			env: {
				...process.env,
				[DEV_UI_SENTINEL]: '1',
				[INFISICAL_DEV_SENTINEL]: '1',
			},
			stdio: 'inherit',
		},
	)
	process.exit(relaunched.status ?? 1)
}

function ensureWorkspaceDependencies() {
	status('Dependencies', 'REPAIR', 'synchronizing the committed bun.lock')
	const result = spawnSync('bun', ['install', '--frozen-lockfile'], {
		cwd: repoRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.status !== 0) {
		failWithOutput(
			'Committed dependencies could not be restored.',
			result.stderr || result.stdout,
		)
	}
	status('Dependencies', 'OK', 'lockfile-consistent')
}

async function ensureSupabase() {
	status('Local backend', 'CHECK', 'Supabase services')
	if (readLocalSupabaseEnv()) {
		status('Local backend', 'OK', 'Supabase is healthy')
		return
	}

	status('Local backend', 'START', 'starting Supabase containers')
	const started = spawnSync('bun', ['run', 'db:start'], {
		cwd: repoRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (started.status !== 0 && !(await waitForLocalSupabaseEnv())) {
		failWithOutput(
			'Could not start local Supabase. Confirm Docker is running.',
			started.stderr || started.stdout,
		)
	}

	if (!(await waitForLocalSupabaseEnv())) {
		fail('Supabase started, but its local API credentials are unavailable.')
	}
	status('Local backend', 'OK', 'Supabase is healthy')
}

function ensureLocalMigrations() {
	status('Database', 'CHECK', 'applying pending local migrations')
	const result = spawnSync('bun', ['run', 'db:migrate'], {
		cwd: repoRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.status !== 0) {
		failWithOutput(
			'Local database migrations could not be applied.',
			result.stderr || result.stdout,
		)
	}
	status('Database', 'OK', 'migration history is current')
}

async function recoverOwnedListeners(busyPorts) {
	const pids = assertOwnedListeners(busyPorts)
	status(
		'Application stack',
		'REPAIR',
		`stopping partial HyperQuote stack on ${busyPorts.map((app) => app.port).join(', ')}`,
	)
	for (const pid of pids) {
		try {
			process.kill(pid, 'SIGTERM')
		} catch (error) {
			if (error?.code !== 'ESRCH') throw error
		}
	}

	const deadline = Date.now() + OWNED_PORT_SHUTDOWN_TIMEOUT_MS
	while (Date.now() < deadline) {
		if ((await busyAppPorts()).length === 0) {
			status('Application stack', 'OK', 'stale listeners recovered')
			return
		}
		await sleep(250)
	}
	fail(
		'HyperQuote-owned dev listeners did not stop cleanly. Stop the existing terminal and retry.',
	)
}

function assertOwnedListeners(apps) {
	const pids = new Set()
	for (const app of apps) {
		const listeners = listenerPids(app.port)
		if (
			listeners.length === 0 ||
			listeners.some((pid) => !isOwnedDevPid(pid))
		) {
			fail(
				`Port ${app.port} is owned by another process. It was left untouched for safety.`,
			)
		}
		for (const pid of listeners) pids.add(pid)
	}
	return [...pids]
}

function listenerPids(port) {
	const result = spawnSync(
		'lsof',
		['-nP', '-t', `-iTCP:${port}`, '-sTCP:LISTEN'],
		{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
	)
	if (result.status !== 0 && result.status !== 1) {
		fail('lsof is required to recover occupied local development ports safely.')
	}
	return result.stdout
		.split('\n')
		.map((value) => Number(value.trim()))
		.filter((value) => Number.isSafeInteger(value) && value > 1)
}

function isOwnedDevPid(pid) {
	try {
		const cwd = realpathSync(`/proc/${pid}/cwd`)
		const command = readFileSync(`/proc/${pid}/cmdline`, 'utf8').replaceAll(
			'\0',
			' ',
		)
		return (
			(cwd === repoRoot || cwd.startsWith(`${repoRoot}/`)) &&
			/\b(?:bun|node|vite)\b/i.test(command)
		)
	} catch {
		return false
	}
}

function requireCommand(command, hint) {
	const result = spawnSync(command, ['--version'], {
		encoding: 'utf8',
		stdio: ['ignore', 'ignore', 'ignore'],
	})
	if (result.status === 0) return
	fail(`Missing required command: ${command}\n${hint}`)
}

async function waitForLocalSupabaseEnv() {
	const deadline = Date.now() + SUPABASE_READY_TIMEOUT_MS
	while (Date.now() < deadline) {
		const env = readLocalSupabaseEnv()
		if (env) return env
		await sleep(SUPABASE_READY_INTERVAL_MS)
	}
	return null
}

function readLocalSupabaseEnv() {
	const result = spawnSync('supabase', ['status', '-o', 'env'], {
		cwd: repoRoot,
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
	const checks = await Promise.all(
		APP_PORTS.map(async (app) => ({
			...app,
			busy: await isPortOpen(app.port),
		})),
	)
	return checks.filter((app) => app.busy)
}

async function unhealthyAppPorts() {
	const checks = await Promise.all(
		APP_PORTS.map(async (app) => {
			try {
				const response = await fetch(app.url, {
					redirect: 'manual',
					signal: AbortSignal.timeout(3_000),
				})
				return response.status >= 500 ? app : null
			} catch {
				return app
			}
		}),
	)
	return checks.filter(Boolean)
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

function renderBanner() {
	if (protocolMode) {
		emitDevEvent({ type: 'banner' })
		return
	}
	const rule = color.dim(
		'----------------------------------------------------------------',
	)
	console.log('')
	console.log(rule)
	console.log(
		`${color.accent('HYPERQUOTE')}  ${color.dim('/')}  LOCAL DEVELOPMENT`,
	)
	console.log(`${color.dim('Secure workspace orchestration')}  Dev. by qvOS`)
	console.log(rule)
}

function renderUrls() {
	if (protocolMode) {
		emitDevEvent({
			type: 'urls',
			services: [
				...APP_PORTS.map((app) => ({
					id: app.name.toLowerCase(),
					label: app.name,
					url: app.url,
				})),
				{
					id: 'studio',
					label: 'Studio',
					url: 'http://localhost:54323',
				},
			],
		})
		return
	}
	console.log('')
	for (const app of APP_PORTS) {
		console.log(`  ${color.dim(app.name.padEnd(10))} ${color.accent(app.url)}`)
	}
	console.log(
		`  ${color.dim('Studio'.padEnd(10))} ${color.accent('http://localhost:54323')}`,
	)
	console.log('')
}

function status(label, state, detail) {
	if (protocolMode) {
		emitDevEvent({ type: 'status', label, state, detail })
		return
	}
	const stateColor =
		state === 'OK' || state === 'READY'
			? color.success
			: state === 'REPAIR'
				? color.warning
				: color.accent
	console.log(
		`${color.dim(label.padEnd(19))} ${stateColor(state.padEnd(6))} ${detail}`,
	)
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function paint(code, value) {
	return useColor ? `\u001b[${code}m${value}\u001b[0m` : value
}

function warn(message) {
	if (protocolMode) {
		emitDevEvent({ type: 'warning', message })
		return
	}
	console.warn(`${color.warning('WARN')}  ${message}`)
}

function failWithOutput(message, output) {
	const details = String(output ?? '')
		.trim()
		.split('\n')
		.slice(-12)
		.join('\n')
	fail([message, details].filter(Boolean).join('\n'))
}

function fail(message) {
	if (protocolMode) {
		emitDevEvent({ type: 'error', message })
		process.exit(1)
	}
	console.error(`${color.error('ERROR')} ${message}`)
	process.exit(1)
}
