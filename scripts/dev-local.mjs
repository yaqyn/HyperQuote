#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import process from 'node:process'
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

	const seeded = spawnSync('node', ['scripts/seed-local-auth.mjs', '--quiet'], {
		stdio: 'inherit',
	})
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

	console.log('Local Supabase is available.')
	console.log(`API: ${localEnv.API_URL}`)
	if (localEnv.STUDIO_URL) console.log(`Studio: ${localEnv.STUDIO_URL}`)
	if (!hasConfiguredTwilioVerifyEnv(process.env)) {
		console.log(
			'Twilio Verify credentials are missing; real phone OTP delivery is disabled for this local run.',
		)
	}
	if (aiProxy) console.log('Local AI proxy is available.')
	for (const app of APPS) console.log(`${app.name}: ${app.url}`)

	let shuttingDown = false
	const children = []
	for (const app of APPS) {
		const appEnv = {
			...baseEnv,
			SUPABASE_COOKIE_NAME: app.cookieName,
			VITE_SUPABASE_COOKIE_NAME: app.cookieName,
		}
		const child = spawn('bun', ['run', 'dev'], {
			cwd: app.cwd,
			env: appEnv,
			stdio: 'inherit',
		})
		child.on('exit', (code, signal) => {
			if (shuttingDown) return
			console.error(
				`${app.name} dev server exited${signal ? ` with ${signal}` : ` with code ${code}`}.`,
			)
			shutdown(code ?? 1)
		})
		children.push(child)
		await sleep(750)
	}

	function shutdown(exitCode = 0) {
		shuttingDown = true
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

function writeLocalAppEnv(runtimeEnv = {}, aiProxy = null) {
	const serverApps = APPS.filter((app) => app.name !== 'driver')
	for (const app of serverApps) {
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
			`${app.cwd}/.dev.vars`,
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
