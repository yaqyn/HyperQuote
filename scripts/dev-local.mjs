#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const APPS = [
	{ name: 'website', cwd: 'apps/website', url: 'http://127.0.0.1:3000' },
	{ name: 'portal', cwd: 'apps/portal', url: 'http://127.0.0.1:3001' },
	{ name: 'internal', cwd: 'apps/internal', url: 'http://127.0.0.1:3002' },
	{ name: 'driver', cwd: 'apps/driver', url: 'http://127.0.0.1:3003' },
]

main()

function main() {
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

	const env = {
		...process.env,
		SUPABASE_ANON_KEY: localEnv.ANON_KEY,
		SUPABASE_URL: localEnv.API_URL,
		VITE_INTERNAL_URL: 'http://127.0.0.1:3002',
		VITE_SUPABASE_ANON_KEY: localEnv.ANON_KEY,
		VITE_SUPABASE_URL: localEnv.API_URL,
	}

	console.log('Local Supabase is available.')
	console.log(`API: ${localEnv.API_URL}`)
	if (localEnv.STUDIO_URL) console.log(`Studio: ${localEnv.STUDIO_URL}`)
	for (const app of APPS) console.log(`${app.name}: ${app.url}`)

	let shuttingDown = false
	const children = APPS.map((app) => {
		const child = spawn('bun', ['run', 'dev'], {
			cwd: app.cwd,
			env,
			stdio: 'inherit',
		})
		child.on('exit', (code, signal) => {
			if (shuttingDown) return
			console.error(
				`${app.name} dev server exited${signal ? ` with ${signal}` : ` with code ${code}`}.`,
			)
			shutdown(code ?? 1)
		})
		return child
	})

	function shutdown(exitCode = 0) {
		shuttingDown = true
		for (const child of children) {
			if (!child.killed) child.kill('SIGTERM')
		}
		setTimeout(() => process.exit(exitCode), 250)
	}

	process.on('SIGINT', () => shutdown(0))
	process.on('SIGTERM', () => shutdown(0))
}

function readLocalSupabaseEnv() {
	const result = spawnSync('supabase', ['status', '-o', 'env'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
	})
	if (result.status !== 0) return null

	const env = parseEnvOutput(result.stdout)
	if (!env.API_URL || !env.ANON_KEY) return null
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
