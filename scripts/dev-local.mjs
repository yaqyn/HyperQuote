#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import process from 'node:process'

const APPS = [
	{
		name: 'website',
		cookieName: 'hyperquote_customer_auth',
		cwd: 'apps/website',
		url: 'http://127.0.0.1:3000',
	},
	{
		name: 'portal',
		cookieName: 'hyperquote_customer_auth',
		cwd: 'apps/portal',
		url: 'http://127.0.0.1:3001',
	},
	{
		name: 'internal',
		cookieName: 'hyperquote_internal_auth',
		cwd: 'apps/internal',
		url: 'http://127.0.0.1:3002',
	},
	{
		name: 'driver',
		cookieName: 'hyperquote_driver_auth',
		cwd: 'apps/driver',
		url: 'http://127.0.0.1:3003',
	},
]

main().catch((error) => {
	console.error(error)
	process.exit(1)
})

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
			console.error('Could not start local Supabase. Run `bun run db:start`.')
			process.exit(started.status ?? 1)
		}
		localEnv = readLocalSupabaseEnv()
	}

	if (!localEnv) {
		console.error('Could not read local Supabase status after start.')
		process.exit(1)
	}

	const seeded = spawnSync('node', ['scripts/seed-local-auth.mjs', '--quiet'], {
		stdio: 'inherit',
	})
	if (seeded.status !== 0) process.exit(seeded.status ?? 1)

	const baseEnv = {
		...process.env,
		...localOperatorAiEnv(),
		SUPABASE_ANON_KEY: localEnv.ANON_KEY,
		SUPABASE_SERVICE_ROLE_KEY: localEnv.SERVICE_ROLE_KEY,
		SUPABASE_URL: localEnv.API_URL,
		VITE_INTERNAL_URL: 'http://127.0.0.1:3002',
		VITE_SUPABASE_ANON_KEY: localEnv.ANON_KEY,
		VITE_SUPABASE_URL: localEnv.API_URL,
	}
	writeLocalWorkerEnv({
		SUPABASE_ANON_KEY: localEnv.ANON_KEY,
		SUPABASE_SERVICE_ROLE_KEY: localEnv.SERVICE_ROLE_KEY,
		SUPABASE_URL: localEnv.API_URL,
		VITE_SUPABASE_ANON_KEY: localEnv.ANON_KEY,
		VITE_SUPABASE_URL: localEnv.API_URL,
	})

	console.log('Local Supabase is available.')
	console.log(`API: ${localEnv.API_URL}`)
	if (localEnv.STUDIO_URL) console.log(`Studio: ${localEnv.STUDIO_URL}`)
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
		writeLocalWorkerEnv()
		setTimeout(() => process.exit(exitCode), 250)
	}

	process.on('SIGINT', () => shutdown(0))
	process.on('SIGTERM', () => shutdown(0))
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

function writeLocalWorkerEnv(runtimeEnv = {}) {
	const workerApps = APPS.filter((app) => app.name !== 'driver')
	for (const app of workerApps) {
		const next = {
			GROQ_MODEL: 'openai/gpt-oss-120b',
			SUPABASE_ANON_KEY: 'placeholder',
			SUPABASE_SERVICE_ROLE_KEY: 'placeholder',
			SUPABASE_URL: 'https://placeholder.supabase.co',
			USE_AI: localAiFlag(),
			VITE_INTERNAL_URL: 'http://127.0.0.1:3002',
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

function localAiFlag() {
	if (process.env.USE_AI) return process.env.USE_AI
	if (process.env.HQ_USE_AI) return process.env.HQ_USE_AI
	if (process.env.GROQ_API_KEY || process.env.HQ_GROQ_API_KEY) return '1'
	return '0'
}

function localOperatorAiEnv() {
	const aiEnv = {}
	if (!process.env.GROQ_API_KEY && process.env.HQ_GROQ_API_KEY) {
		aiEnv.GROQ_API_KEY = process.env.HQ_GROQ_API_KEY
	}
	if (!process.env.GROQ_MODEL && process.env.HQ_GROQ_MODEL) {
		aiEnv.GROQ_MODEL = process.env.HQ_GROQ_MODEL
	}
	if (
		!process.env.GROQ_REASONING_EFFORT &&
		process.env.HQ_GROQ_REASONING_EFFORT
	) {
		aiEnv.GROQ_REASONING_EFFORT = process.env.HQ_GROQ_REASONING_EFFORT
	}
	if (!process.env.GROQ_URL && process.env.HQ_GROQ_URL) {
		aiEnv.GROQ_URL = process.env.HQ_GROQ_URL
	}
	if (!process.env.USE_AI && process.env.HQ_USE_AI) {
		aiEnv.USE_AI = process.env.HQ_USE_AI
	}
	return aiEnv
}

function quoteEnvValue(value) {
	const text = String(value ?? '')
	if (/^[A-Za-z0-9_./:@-]+$/.test(text)) return text
	return JSON.stringify(text)
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
