#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import process from 'node:process'
import { createInterface } from 'node:readline'
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
	console.error(error)
	process.exit(1)
})

function maybeRelaunchWithInfisical() {
	if (process.env[INFISICAL_DEV_SENTINEL]) return
	if (process.env.CI) return
	if (skipInfisical()) return

	console.log('Loading local development secrets from Infisical dev...')
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
		console.log('Starting local Supabase...')
		const started = spawnSync(
			'node',
			['scripts/supabase-local.mjs', 'start', '--quiet'],
			{ stdio: 'ignore' },
		)
		if (started.status !== 0) {
			console.error(
				'Supabase start returned non-zero; waiting for local Supabase readiness before failing.',
			)
			localEnv = await waitForLocalSupabaseEnv()
			if (!localEnv) {
				console.error('Could not start local Supabase. Run `bun run db:start`.')
				process.exit(started.status ?? 1)
			}
		} else {
			localEnv = await waitForLocalSupabaseEnv()
		}
	}

	if (!localEnv) {
		console.error('Could not read local Supabase status after start.')
		process.exit(1)
	}

	const seeded = spawnSync(
		'node',
		['scripts/seed-local-auth.mjs', '--preserve-existing-passwords', '--quiet'],
		{ stdio: 'inherit' },
	)
	if (seeded.status !== 0) process.exit(seeded.status ?? 1)
	const aiProxy = await startLocalAiProxy()

	const baseEnv = {
		...process.env,
		SUPABASE_ANON_KEY: localEnv.ANON_KEY,
		SUPABASE_SERVICE_ROLE_KEY: localEnv.SERVICE_ROLE_KEY,
		SUPABASE_URL: localEnv.API_URL,
		VITE_INTERNAL_URL: 'http://localhost:3002',
		VITE_SUPABASE_ANON_KEY: localEnv.ANON_KEY,
		VITE_SUPABASE_URL: localEnv.API_URL,
	}
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

	renderRuntimeHeader(localEnv, aiProxy)
	if (!hasConfiguredTwilioVerifyEnv(process.env)) {
		console.log(
			'Twilio Verify credentials are missing; real phone OTP delivery is disabled for this local run.',
		)
	}

	let shuttingDown = false
	const children = []
	let teardownControls = () => undefined
	for (const app of APPS) {
		const appEnv = {
			...baseEnv,
			SUPABASE_COOKIE_NAME: app.cookieName,
			VITE_SUPABASE_COOKIE_NAME: app.cookieName,
		}
		const child = spawn('bun', ['run', 'dev'], {
			cwd: app.cwd,
			env: appEnv,
			stdio: ['ignore', 'pipe', 'pipe'],
		})
		pipeAppLogs(child.stdout, app.name, false, () => shuttingDown)
		pipeAppLogs(child.stderr, app.name, true, () => shuttingDown)
		child.on('error', (error) => {
			if (!shuttingDown) {
				console.error(`[${app.name}] could not start: ${error.message}`)
				shutdown(1)
			}
		})
		child.on('exit', (code, signal) => {
			if (shuttingDown) return
			console.error(
				`${app.name} dev server exited${signal ? ` with ${signal}` : ` with code ${code}`}.`,
			)
			shutdown(code ?? 1)
		})
		children.push(child)
		void reportAppReady(app)
		await sleep(750)
	}
	teardownControls = setupTerminalControls(shutdown, localEnv, aiProxy)
	renderControls()

	function shutdown(exitCode = 0) {
		if (shuttingDown) return
		shuttingDown = true
		teardownControls()
		for (const child of children) {
			if (!child.killed) child.kill('SIGTERM')
		}
		aiProxy?.server.close()
		writeLocalAppEnv()
		setTimeout(() => process.exit(exitCode), 250)
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
		const prefix = appLogPrefix(appName)
		const output = `${prefix} ${line}`
		if (isError) console.error(output)
		else console.log(output)
	})
}

async function reportAppReady(app) {
	const deadline = Date.now() + APP_READY_TIMEOUT_MS
	while (Date.now() < deadline) {
		try {
			const response = await fetch(app.url, { redirect: 'manual' })
			if (response.status > 0 && response.status < 500) {
				console.log(
					`${appLogPrefix(app.name)} ${paint('32', 'READY')} ${app.url}`,
				)
				return
			}
		} catch {
			// The app is still starting.
		}
		await sleep(500)
	}
	console.warn(
		`${appLogPrefix(app.name)} did not become reachable within 30 seconds.`,
	)
}

function setupTerminalControls(shutdown, localEnv, aiProxy) {
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
