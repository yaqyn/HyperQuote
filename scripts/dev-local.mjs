#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { connect } from 'node:net'
import process from 'node:process'
import { createInterface } from 'node:readline'
import {
	devProtocolEnabled,
	emitDevEvent,
	parseDevCommand,
	sanitizeDevText,
} from './dev-protocol.mjs'
import {
	INFISICAL_DEV_SENTINEL,
	infisicalDevRunArgs,
	requireInfisicalReady,
	skipInfisical,
} from './infisical-dev.mjs'
import { hasConfiguredTwilioVerifyEnv } from './supabase-auth-env.mjs'

const DEFAULT_GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const LOCAL_AI_PROXY_KEY = 'local-groq-proxy'
const SUPABASE_READY_TIMEOUT_MS = 90_000
const SUPABASE_READY_INTERVAL_MS = 1_000
const APP_READY_TIMEOUT_MS = 30_000
const APP_STOP_TIMEOUT_MS = 8_000
const protocolMode = devProtocolEnabled()
const useColor = Boolean(process.stdout.isTTY && !process.env.NO_COLOR)

const APPS = [
	{
		name: 'website',
		cookieName: 'hyperquote_customer_auth',
		cwd: 'apps/website',
		url: 'http://localhost:3000',
	},
	{
		name: 'portal',
		cookieName: 'hyperquote_customer_auth',
		cwd: 'apps/portal',
		url: 'http://localhost:3001',
	},
	{
		name: 'internal',
		cookieName: 'hyperquote_internal_auth',
		cwd: 'apps/internal',
		url: 'http://localhost:3002',
	},
	{
		name: 'driver',
		cookieName: 'hyperquote_driver_auth',
		cwd: 'apps/driver',
		url: 'http://localhost:3003',
	},
]

maybeRelaunchWithInfisical()

main().catch((error) => {
	const message = error instanceof Error ? error.message : String(error)
	if (protocolMode) emitDevEvent({ type: 'error', message })
	else console.error(message)
	process.exit(1)
})

function maybeRelaunchWithInfisical() {
	if (process.env[INFISICAL_DEV_SENTINEL]) return
	if (process.env.CI) return
	if (skipInfisical()) return

	logDev(
		'system',
		'info',
		'Loading local development secrets from Infisical dev...',
	)
	requireInfisicalReady('local dev secrets')
	const relaunched = spawnSync(
		'infisical',
		infisicalDevRunArgs([process.execPath, ...process.argv.slice(1)]),
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

async function main() {
	let localEnv = readLocalSupabaseEnv()
	if (!localEnv) {
		logDev('supabase', 'info', 'Starting local Supabase...')
		const started = spawnSync(
			'node',
			['scripts/supabase-local.mjs', 'start', '--quiet'],
			{ stdio: 'ignore' },
		)
		if (started.status !== 0) {
			logDev(
				'supabase',
				'warning',
				'Supabase start returned non-zero; waiting for local Supabase readiness before failing.',
			)
			localEnv = await waitForLocalSupabaseEnv()
			if (!localEnv) {
				throw new Error(
					'Could not start local Supabase. Run `bun run db:start`.',
				)
			}
		} else {
			localEnv = await waitForLocalSupabaseEnv()
		}
	}

	if (!localEnv) {
		throw new Error('Could not read local Supabase status after start.')
	}

	const seeded = spawnSync(
		'node',
		['scripts/seed-local-auth.mjs', '--preserve-existing-passwords', '--quiet'],
		{
			encoding: protocolMode ? 'utf8' : undefined,
			stdio: protocolMode ? ['ignore', 'pipe', 'pipe'] : 'inherit',
		},
	)
	if (seeded.status !== 0) {
		throw new Error(
			lastOutputLine(seeded.stderr || seeded.stdout) ||
				'Could not seed local development accounts.',
		)
	}
	const aiProxy = await startLocalAiProxy()

	writeRuntimeEnv(localEnv, aiProxy)

	renderRuntimeHeader(localEnv, aiProxy)
	if (!hasConfiguredTwilioVerifyEnv(process.env)) {
		logDev(
			'system',
			'warning',
			'Twilio Verify credentials are missing; real phone OTP delivery is disabled for this local run.',
		)
	}

	let shuttingDown = false
	let activeOperation = null
	const children = new Map()
	const expectedStops = new Set()
	let teardownControls = () => undefined
	const readiness = []
	for (const app of APPS) {
		readiness.push(startApp(app))
		await sleep(750)
	}
	teardownControls = setupTerminalControls({
		handleCommand,
		localEnv,
		aiProxy,
		shutdown,
	})
	renderControls()
	void Promise.all(readiness).then((results) => {
		if (shuttingDown) return
		const healthy = results.every(Boolean)
		if (protocolMode) {
			emitDevEvent({
				type: 'stack',
				status: healthy ? 'ready' : 'degraded',
			})
		}
	})

	function startApp(app) {
		if (!localEnv) {
			throw new Error('Start local Supabase before starting app servers.')
		}
		emitService(app.name, 'starting', app.url)
		const child = spawn('bun', ['run', 'dev'], {
			cwd: app.cwd,
			detached: true,
			env: appRuntimeEnv(app, localEnv),
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		children.set(app.name, child)
		pipeAppLogs(child.stdout, app.name, false, () => shuttingDown)
		pipeAppLogs(child.stderr, app.name, true, () => shuttingDown)
		child.on('error', (error) => {
			if (shuttingDown) return
			emitService(app.name, 'error', app.url, error.message)
			logDev(app.name, 'error', `Could not start: ${error.message}`)
		})
		child.on('exit', (code, signal) => {
			if (children.get(app.name) === child) children.delete(app.name)
			if (shuttingDown) return
			if (expectedStops.delete(app.name)) {
				emitService(app.name, 'stopped', app.url)
				return
			}
			const detail = signal ? `signal ${signal}` : `exit code ${code}`
			emitService(app.name, 'error', app.url, detail)
			logDev(app.name, 'error', `Dev server exited with ${detail}.`)
		})
		return reportAppReady(app, child, () => children.get(app.name) === child)
	}

	async function stopApp(app) {
		const child = children.get(app.name)
		if (!child) return
		expectedStops.add(app.name)
		emitService(app.name, 'stopping', app.url)
		const exited = waitForChildExit(child)
		signalAppProcessGroup(child, 'SIGTERM')
		try {
			await Promise.all([exited, waitForAppPortRelease(app)])
		} catch (error) {
			signalAppProcessGroup(child, 'SIGKILL')
			expectedStops.delete(app.name)
			throw error
		}
	}

	async function restartApp(appName) {
		const app = APPS.find((candidate) => candidate.name === appName)
		if (!app) throw new Error(`Unknown app: ${appName}`)
		await stopApp(app)
		await startApp(app)
	}

	async function restartAllApps() {
		for (const app of APPS) await stopApp(app)
		const nextReadiness = []
		for (const app of APPS) {
			nextReadiness.push(startApp(app))
			await sleep(500)
		}
		const results = await Promise.all(nextReadiness)
		if (results.some((healthy) => !healthy)) {
			throw new Error('One or more app servers did not become ready.')
		}
	}

	async function handleCommand(command) {
		if (!command || typeof command.action !== 'string') return
		switch (command.action) {
			case 'quit':
				shutdown(0)
				return
			case 'restart-app':
				await withOperation(`Restart ${command.app ?? 'app'}`, () =>
					restartApp(command.app),
				)
				return
			case 'restart-all':
				await withOperation('Restart application stack', restartAllApps)
				return
			case 'supabase-start':
				await withOperation('Start local Supabase', async () => {
					await runRepoScript('db:start')
					const nextEnv = await waitForLocalSupabaseEnv()
					if (!nextEnv) throw new Error('Local Supabase did not become ready.')
					localEnv = nextEnv
					writeRuntimeEnv(localEnv, aiProxy)
					emitBackendStatus(localEnv)
				})
				return
			case 'supabase-stop':
				await withOperation('Stop local Supabase', async () => {
					await runRepoScript('db:stop')
					localEnv = null
					emitBackendStatus(null)
				})
				return
			case 'supabase-migrate':
				await withOperation('Apply local migrations', async () => {
					if (!readLocalSupabaseEnv()) {
						throw new Error('Start local Supabase before applying migrations.')
					}
					await runRepoScript('db:migrate')
				})
				return
			case 'supabase-reset':
				if (command.confirmation !== 'RESET LOCAL') {
					emitWarning('Local database reset requires RESET LOCAL confirmation.')
					return
				}
				await withOperation('Reset local database', async () => {
					if (!readLocalSupabaseEnv()) {
						throw new Error('Start local Supabase before resetting it.')
					}
					await runRepoScript('db:reset')
					const nextEnv = readLocalSupabaseEnv()
					if (!nextEnv) {
						throw new Error('Local Supabase is unavailable after reset.')
					}
					localEnv = nextEnv
					writeRuntimeEnv(localEnv, aiProxy)
					emitBackendStatus(localEnv)
				})
				return
			case 'doctor':
				await withOperation('Run local doctor', runDoctor)
				return
		}
	}

	async function runDoctor() {
		const backendEnv = readLocalSupabaseEnv()
		emitBackendStatus(backendEnv)
		const checks = await Promise.all(
			APPS.map(async (app) => {
				const healthy = await appIsHealthy(app)
				emitService(
					app.name,
					healthy ? 'ready' : 'error',
					app.url,
					healthy ? undefined : 'HTTP readiness check failed',
				)
				return healthy
			}),
		)
		if (!backendEnv || checks.some((healthy) => !healthy)) {
			throw new Error('Doctor found unavailable local services.')
		}
	}

	async function withOperation(label, operation) {
		if (activeOperation) {
			emitWarning(`Wait for ${activeOperation} to finish.`)
			return
		}
		activeOperation = label
		emitOperation(label, 'running')
		try {
			await operation()
			emitOperation(label, 'success')
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error)
			emitOperation(label, 'error', message)
			logDev('system', 'error', message)
		} finally {
			activeOperation = null
		}
	}

	function shutdown(exitCode = 0) {
		if (shuttingDown) return
		shuttingDown = true
		if (protocolMode) emitDevEvent({ type: 'shutdown', status: 'stopping' })
		teardownControls()
		aiProxy?.server.close()
		writeLocalAppEnv()
		const forceExit = setTimeout(() => {
			for (const child of children.values()) {
				signalAppProcessGroup(child, 'SIGKILL')
			}
			process.exit(exitCode)
		}, APP_STOP_TIMEOUT_MS + 1_000)
		void Promise.allSettled(APPS.map((app) => stopApp(app))).then(() => {
			clearTimeout(forceExit)
			process.exit(exitCode)
		})
	}

	process.on('SIGINT', () => shutdown(0))
	process.on('SIGTERM', () => shutdown(0))
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function pipeAppLogs(stream, appName, isError, isShuttingDown) {
	if (!stream) return
	const reader = createInterface({ input: stream })
	reader.on('line', (line) => {
		if (!line.trim() || isShuttingDown()) return
		if (protocolMode) {
			emitDevEvent({
				type: 'log',
				source: appName,
				level: isError ? 'error' : 'info',
				message: sanitizeDevText(line),
			})
			return
		}
		const prefix = appLogPrefix(appName)
		const output = `${prefix} ${line}`
		if (isError) console.error(output)
		else console.log(output)
	})
}

async function reportAppReady(app, child, isCurrent) {
	const deadline = Date.now() + APP_READY_TIMEOUT_MS
	while (Date.now() < deadline) {
		if (!isCurrent() || child.exitCode !== null) return false
		if (await appIsHealthy(app)) {
			emitService(app.name, 'ready', app.url)
			if (!protocolMode) {
				console.log(
					`${appLogPrefix(app.name)} ${paint('32', 'READY')} ${app.url}`,
				)
			}
			return true
		}
		await sleep(500)
	}
	const message = 'Did not become reachable within 30 seconds.'
	emitService(app.name, 'error', app.url, message)
	if (!protocolMode) console.warn(`${appLogPrefix(app.name)} ${message}`)
	return false
}

async function appIsHealthy(app) {
	try {
		const response = await fetch(app.url, {
			redirect: 'manual',
			signal: AbortSignal.timeout(3_000),
		})
		return response.status > 0 && response.status < 500
	} catch {
		return false
	}
}

async function waitForAppPortRelease(app) {
	const deadline = Date.now() + APP_STOP_TIMEOUT_MS
	while (Date.now() < deadline) {
		if (!(await appPortIsOpen(app))) return
		await sleep(100)
	}
	throw new Error(`${app.name} did not release ${app.url} within 8 seconds.`)
}

async function appPortIsOpen(app) {
	const { port } = new URL(app.url)
	const checks = await Promise.all([
		isHostPortOpen('127.0.0.1', Number(port)),
		isHostPortOpen('::1', Number(port)),
	])
	return checks.some(Boolean)
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
		socket.setTimeout(500, () => finish(false))
	})
}

function setupTerminalControls({ handleCommand, shutdown, localEnv, aiProxy }) {
	if (protocolMode) {
		const reader = createInterface({ input: process.stdin })
		reader.on('line', (line) => {
			const command = parseDevCommand(line)
			if (command) void handleCommand(command)
		})
		const onClose = () => shutdown(0)
		reader.on('close', onClose)
		return () => {
			reader.off('close', onClose)
			reader.close()
		}
	}
	if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
		return () => undefined
	}

	process.stdin.setRawMode(true)
	process.stdin.resume()
	const onData = (chunk) => {
		const key = chunk.toString().toLowerCase()
		if (key === 'q' || key === '\u0003') {
			shutdown(0)
			return
		}
		if (key === 'c') {
			process.stdout.write('\u001b[2J\u001b[H')
			renderRuntimeHeader(localEnv, aiProxy)
			renderControls()
			return
		}
		const appIndex = Number(key) - 1
		if (Number.isInteger(appIndex) && APPS[appIndex]) {
			openUrl(APPS[appIndex].url)
			return
		}
		if (key === 's') openUrl('http://localhost:54323')
	}
	process.stdin.on('data', onData)

	return () => {
		process.stdin.off('data', onData)
		if (process.stdin.isTTY) {
			try {
				process.stdin.setRawMode(false)
			} catch {
				// The terminal may already be detached during process shutdown.
			}
		}
		process.stdin.pause()
	}
}

function openUrl(url) {
	const opener = spawn('xdg-open', [url], {
		detached: true,
		stdio: 'ignore',
	})
	opener.on('error', () => {
		console.warn(`Could not open ${url}.`)
	})
	opener.unref()
}

function renderRuntimeHeader(localEnv, aiProxy) {
	if (protocolMode) {
		emitDevEvent({
			type: 'runtime',
			backendUrl: localEnv?.API_URL ?? null,
			studioUrl: localEnv?.STUDIO_URL ?? 'http://localhost:54323',
			aiEnabled: Boolean(aiProxy),
		})
		emitBackendStatus(localEnv)
		emitService(
			'ai',
			aiProxy ? 'ready' : 'disabled',
			undefined,
			aiProxy ? undefined : 'No local Groq proxy',
		)
		return
	}
	const rule = paint(
		'2',
		'----------------------------------------------------------------',
	)
	console.log('')
	console.log(rule)
	console.log(`${paint('38;2;37;99;235', 'HYPERQUOTE DEV')}  Dev. by qvOS`)
	console.log(rule)
	if (localEnv) {
		console.log(`Backend  ${localEnv.API_URL}`)
		if (localEnv.STUDIO_URL) console.log(`Studio   ${localEnv.STUDIO_URL}`)
		console.log(
			`AI       ${aiProxy ? paint('32', 'READY') : paint('33', 'DISABLED')}`,
		)
	}
	for (const [index, app] of APPS.entries()) {
		console.log(`${index + 1}        ${app.name.padEnd(9)} ${app.url}`)
	}
	console.log(rule)
}

function renderControls() {
	if (protocolMode) {
		emitDevEvent({ type: 'controls', status: 'ready' })
		return
	}
	if (!process.stdin.isTTY) return
	console.log(
		paint('2', 'Controls  [1-4] open app  [s] Studio  [c] clear  [q] stop'),
	)
}

function appLogPrefix(appName) {
	const colors = {
		website: '36',
		portal: '38;2;37;99;235',
		internal: '35',
		driver: '33',
	}
	return paint(colors[appName] ?? '37', `[${appName.padEnd(8)}]`)
}

function paint(code, value) {
	return useColor ? `\u001b[${code}m${value}\u001b[0m` : value
}

function appRuntimeEnv(app, localEnv) {
	return {
		...process.env,
		SUPABASE_ANON_KEY: localEnv.ANON_KEY,
		SUPABASE_COOKIE_NAME: app.cookieName,
		SUPABASE_SERVICE_ROLE_KEY: localEnv.SERVICE_ROLE_KEY,
		SUPABASE_URL: localEnv.API_URL,
		VITE_INTERNAL_URL: 'http://localhost:3002',
		VITE_SUPABASE_ANON_KEY: localEnv.ANON_KEY,
		VITE_SUPABASE_COOKIE_NAME: app.cookieName,
		VITE_SUPABASE_URL: localEnv.API_URL,
	}
}

function writeRuntimeEnv(localEnv, aiProxy) {
	writeLocalAppEnv(
		{
			SUPABASE_ANON_KEY: localEnv.ANON_KEY,
			SUPABASE_SERVICE_ROLE_KEY: localEnv.SERVICE_ROLE_KEY,
			SUPABASE_URL: localEnv.API_URL,
			VITE_SUPABASE_ANON_KEY: localEnv.ANON_KEY,
			VITE_SUPABASE_URL: localEnv.API_URL,
		},
		aiProxy,
	)
}

function waitForChildExit(child) {
	if (child.exitCode !== null || child.signalCode) return Promise.resolve()
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(() => {
			child.off('exit', onExit)
			reject(new Error('App server did not stop within 8 seconds.'))
		}, APP_STOP_TIMEOUT_MS)
		const onExit = () => {
			clearTimeout(timeout)
			resolve()
		}
		child.once('exit', onExit)
	})
}

function signalAppProcessGroup(child, signal) {
	if (!child.pid) return
	try {
		process.kill(-child.pid, signal)
	} catch {
		if (child.exitCode === null && !child.signalCode) child.kill(signal)
	}
}

function runRepoScript(script) {
	return new Promise((resolve, reject) => {
		const child = spawn('bun', ['run', script], {
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		pipeCommandLogs(child.stdout, 'info')
		pipeCommandLogs(child.stderr, 'error')
		child.once('error', reject)
		child.once('exit', (code, signal) => {
			if (code === 0) {
				resolve()
				return
			}
			reject(
				new Error(
					signal
						? `${script} stopped with ${signal}.`
						: `${script} exited with code ${code}.`,
				),
			)
		})
	})
}

function pipeCommandLogs(stream, level) {
	if (!stream) return
	const reader = createInterface({ input: stream })
	reader.on('line', (line) => {
		if (line.trim()) logDev('supabase', level, line)
	})
}

function emitBackendStatus(localEnv) {
	if (!protocolMode) return
	emitService('supabase', localEnv ? 'ready' : 'stopped', localEnv?.API_URL)
	emitService(
		'studio',
		localEnv ? 'ready' : 'stopped',
		localEnv?.STUDIO_URL ?? 'http://localhost:54323',
	)
}

function emitService(id, status, url, detail) {
	if (!protocolMode) return
	emitDevEvent({ type: 'service', id, status, url, detail })
}

function emitOperation(label, status, detail) {
	if (!protocolMode) return
	emitDevEvent({ type: 'operation', label, status, detail })
}

function emitWarning(message) {
	if (protocolMode) emitDevEvent({ type: 'warning', message })
	else console.warn(message)
}

function logDev(source, level, message) {
	if (protocolMode) {
		emitDevEvent({
			type: 'log',
			source,
			level,
			message: sanitizeDevText(message),
		})
		return
	}
	const output = source === 'system' ? message : `[${source}] ${message}`
	if (level === 'error' || level === 'warning') console.error(output)
	else console.log(output)
}

function lastOutputLine(output) {
	return String(output ?? '')
		.trim()
		.split('\n')
		.at(-1)
}

function writeLocalAppEnv(runtimeEnv = null, aiProxy = null) {
	const serverApps = APPS.filter((app) => app.name !== 'driver')
	for (const app of serverApps) {
		const legacyDevVarsPath = `${app.cwd}/.dev.vars`
		const localEnvPath = `${app.cwd}/.env.local`
		rmSync(legacyDevVarsPath, { force: true })
		if (!runtimeEnv) {
			rmSync(localEnvPath, { force: true })
			continue
		}
		const next = {
			...localAppAiEnv(aiProxy),
			SUPABASE_ANON_KEY: 'placeholder',
			SUPABASE_SERVICE_ROLE_KEY: 'placeholder',
			SUPABASE_URL: 'https://placeholder.supabase.co',
			VITE_INTERNAL_URL: 'http://localhost:3002',
			VITE_SUPABASE_ANON_KEY: 'placeholder',
			VITE_SUPABASE_URL: 'https://placeholder.supabase.co',
			...runtimeEnv,
			SUPABASE_COOKIE_NAME: app.cookieName,
			VITE_SUPABASE_COOKIE_NAME: app.cookieName,
		}
		writeFileSync(
			localEnvPath,
			`${Object.entries(next)
				.map(([key, value]) => `${key}=${quoteEnvValue(value)}`)
				.join('\n')}\n`,
		)
	}
}

function localAppAiEnv(aiProxy) {
	const model = process.env.GROQ_MODEL
	const reasoningEffort = process.env.GROQ_REASONING_EFFORT
	const env = {
		GROQ_MODEL: model ?? 'openai/gpt-oss-120b',
		USE_AI: aiProxy ? localAiFlag() : '0',
	}
	if (!aiProxy) return env
	env.GROQ_API_KEY = LOCAL_AI_PROXY_KEY
	env.GROQ_URL = aiProxy.url
	if (reasoningEffort) env.GROQ_REASONING_EFFORT = reasoningEffort
	return env
}

function localAiFlag() {
	if (process.env.USE_AI) return process.env.USE_AI
	return '1'
}

function localAiRequested() {
	const flag = process.env.USE_AI
	return flag !== '0' && flag !== 'false'
}

async function startLocalAiProxy() {
	const apiKey = process.env.GROQ_API_KEY
	if (!apiKey || !localAiRequested()) return null

	const upstreamUrl = process.env.GROQ_URL ?? DEFAULT_GROQ_URL
	const server = createServer(async (request, response) => {
		if (
			request.method !== 'POST' ||
			request.url !== '/openai/v1/chat/completions'
		) {
			response.writeHead(404)
			response.end()
			return
		}

		try {
			const upstream = await fetch(upstreamUrl, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${apiKey}`,
					'Content-Type': request.headers['content-type'] ?? 'application/json',
				},
				body: await readRequestBody(request),
			})
			response.writeHead(upstream.status, {
				'Content-Type':
					upstream.headers.get('content-type') ?? 'application/json',
			})
			if (!upstream.body) {
				response.end()
				return
			}
			for await (const chunk of upstream.body) {
				response.write(chunk)
			}
			response.end()
		} catch {
			response.writeHead(502, { 'Content-Type': 'application/json' })
			response.end(
				JSON.stringify({ error: { message: 'Local AI proxy failed' } }),
			)
		}
	})

	await new Promise((resolve, reject) => {
		server.once('error', reject)
		server.listen(0, '127.0.0.1', () => {
			server.off('error', reject)
			resolve()
		})
	})
	const address = server.address()
	if (!address || typeof address === 'string') {
		server.close()
		return null
	}
	return {
		server,
		url: `http://127.0.0.1:${address.port}/openai/v1/chat/completions`,
	}
}

function readRequestBody(request) {
	return new Promise((resolve, reject) => {
		const chunks = []
		request.on('data', (chunk) => chunks.push(chunk))
		request.on('end', () => resolve(Buffer.concat(chunks)))
		request.on('error', reject)
	})
}

function quoteEnvValue(value) {
	const text = String(value ?? '')
	if (/^[A-Za-z0-9_./:@-]+$/.test(text)) return text
	return JSON.stringify(text)
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
		env[match[1]] = stripEnvQuotes(match[2])
	}
	return env
}

function stripEnvQuotes(value) {
	if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
	return value
}
