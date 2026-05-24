#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
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
	console.log(`No Cloudflare runtime secrets required for ${app}.`)
	process.exit(0)
}

const configuredBindings = secretsStoreBindingsFromConfig(config)
const missingBindings = requiredSecrets.filter(
	(name) => !configuredBindings.some((binding) => binding.binding === name),
)
if (missingBindings.length > 0) {
	console.error(
		`::error::Missing Secrets Store bindings in ${config}: ${missingBindings.join(', ')}`,
	)
	console.error(
		'Run deploy:apply-secrets-store before checking or deploying this Worker.',
	)
	process.exit(1)
}

for (const [storeId, bindings] of bindingsByStore(configuredBindings)) {
	const presentNames = listSecretsStoreNames(storeId)
	const missingSecretNames = bindings
		.map((binding) => binding.secret_name)
		.filter((name) => !presentNames.has(name))
	if (missingSecretNames.length > 0) {
		console.error(
			`::error::Missing Cloudflare Secrets Store names for ${worker}: ${missingSecretNames.join(', ')}`,
		)
		console.error(
			'Create the missing names in Cloudflare Secrets Store. Do not use classic Worker secrets for production runtime config.',
		)
		process.exit(1)
	}
}

console.log(`Cloudflare Secrets Store contract satisfied for ${worker}.`)

function secretsStoreBindingsFromConfig(configPath) {
	const configJson = JSON.parse(readJsonLikeFile(configPath))
	return Array.isArray(configJson.secrets_store_secrets)
		? configJson.secrets_store_secrets.filter(
				(binding) =>
					binding &&
					typeof binding === 'object' &&
					typeof binding.binding === 'string' &&
					typeof binding.secret_name === 'string' &&
					typeof binding.store_id === 'string',
			)
		: []
}

function listSecretsStoreNames(storeId) {
	const result = spawnSync(
		'bunx',
		[
			'wrangler',
			'secrets-store',
			'secret',
			'list',
			storeId,
			'--remote',
			'--per-page',
			'100',
		],
		{
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	)

	if (result.status !== 0) {
		console.error(
			`::error::Unable to list Cloudflare Secrets Store names for store ${storeId}.`,
		)
		if (result.stderr.trim()) console.error(result.stderr.trim())
		process.exit(result.status ?? 1)
	}

	return parseSecretsStoreNames(result.stdout)
}

function parseSecretsStoreNames(output) {
	const names = new Set()
	for (const line of stripAnsi(output).split('\n')) {
		if (!line.includes('│')) continue
		const cells = line
			.split('│')
			.map((cell) => cell.trim())
			.filter(Boolean)
		const name = cells[0]
		if (!name || name === 'Name' || name.startsWith('─')) continue
		names.add(name)
	}
	return names
}

function bindingsByStore(bindings) {
	const grouped = new Map()
	for (const binding of bindings) {
		const group = grouped.get(binding.store_id) ?? []
		group.push(binding)
		grouped.set(binding.store_id, group)
	}
	return grouped
}

function stripAnsi(value) {
	const escapeCharacter = String.fromCharCode(27)
	return value.replace(new RegExp(`${escapeCharacter}\\[[0-9;]*m`, 'g'), '')
}

function readJsonLikeFile(path) {
	return readFileSync(path, 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^\s*\/\/.*$/gm, '')
}
