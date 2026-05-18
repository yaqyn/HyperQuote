#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { getRuntimeSecretsForApp, parseArgs } from './deploy-contract.mjs'

const args = parseArgs(process.argv.slice(2))
const app = args.app
const worker = args.worker
const config = args.config

if (!app || !worker || !config) {
	console.error(
		'Usage: node scripts/check-worker-secrets.mjs --app <app> --worker <worker-name> --config <wrangler-config>',
	)
	process.exit(1)
}

const requiredSecrets = getRuntimeSecretsForApp(app)
if (requiredSecrets.length === 0) {
	console.log(`No Worker secrets required for ${app}.`)
	process.exit(0)
}

const result = spawnSync(
	'bunx',
	[
		'wrangler',
		'secret',
		'list',
		'--format',
		'json',
		'--config',
		config,
		'--name',
		worker,
	],
	{
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	},
)

if (result.status !== 0) {
	console.error(`::error::Unable to list Worker secrets for ${worker}.`)
	if (result.stderr.trim()) console.error(result.stderr.trim())
	process.exit(result.status ?? 1)
}

let listedSecrets
try {
	listedSecrets = JSON.parse(result.stdout)
} catch {
	console.error(
		`::error::Wrangler returned invalid secret-list JSON for ${worker}.`,
	)
	process.exit(1)
}

if (!Array.isArray(listedSecrets)) {
	console.error(`::error::Wrangler returned an unexpected secret-list shape.`)
	process.exit(1)
}

const presentNames = new Set(
	listedSecrets
		.map((entry) => entry?.name)
		.filter((name) => typeof name === 'string'),
)
const missing = requiredSecrets.filter((name) => !presentNames.has(name))

if (missing.length > 0) {
	console.error(
		`::error::Missing Worker secret names for ${worker}: ${missing.join(', ')}`,
	)
	console.error(
		'Set them with wrangler secret put before deploying this Worker.',
	)
	process.exit(1)
}

console.log(`Worker secret-name contract satisfied for ${worker}.`)
