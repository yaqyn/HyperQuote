#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { getRuntimeSecretsForApp, parseArgs } from './deploy-contract.mjs'

const args = parseArgs(process.argv.slice(2))
const target = args.target
const app = args.app
const configPath = args.config

if (!target || !app || !configPath) {
	console.error(
		'Usage: node scripts/apply-secrets-store-bindings.mjs --target <staging|production> --app <app> --config <wrangler-config>',
	)
	process.exit(1)
}

const requiredSecrets = getRuntimeSecretsForApp(app)
if (requiredSecrets.length === 0) {
	console.log(`No Secrets Store bindings required for ${target} ${app}.`)
	process.exit(0)
}

const targetEnvPrefix = target.toUpperCase()
const storeId =
	nonEmptyEnv(`${targetEnvPrefix}_CLOUDFLARE_SECRETS_STORE_ID`) ??
	nonEmptyEnv('CLOUDFLARE_SECRETS_STORE_ID')
if (!storeId) {
	console.error(
		`::error::Missing Cloudflare Secrets Store ID for ${target} ${app}.`,
	)
	console.error(
		'Set CLOUDFLARE_SECRETS_STORE_ID, or a target-specific <TARGET>_CLOUDFLARE_SECRETS_STORE_ID variable, before deploy.',
	)
	process.exit(1)
}

const prefix =
	nonEmptyEnv(`${targetEnvPrefix}_CLOUDFLARE_SECRETS_STORE_PREFIX`) ??
	nonEmptyEnv('CLOUDFLARE_SECRETS_STORE_PREFIX') ??
	`HYPERQUOTE_${targetEnvPrefix}_${app.toUpperCase()}_`

const config = JSON.parse(readJsonLikeFile(configPath))
const existingBindings = Array.isArray(config.secrets_store_secrets)
	? config.secrets_store_secrets.filter(
			(binding) =>
				binding &&
				typeof binding === 'object' &&
				typeof binding.binding === 'string' &&
				!requiredSecrets.includes(binding.binding),
		)
	: []

config.secrets_store_secrets = [
	...existingBindings,
	...requiredSecrets.map((name) => ({
		binding: name,
		secret_name: `${prefix}${name}`,
		store_id: storeId,
	})),
].sort((left, right) => left.binding.localeCompare(right.binding))

writeFileSync(configPath, `${JSON.stringify(config, null, '\t')}\n`)
console.log(
	`Applied ${requiredSecrets.length} Secrets Store bindings to ${configPath} for ${target} ${app}.`,
)

function readJsonLikeFile(path) {
	return readFileSync(path, 'utf8')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/^\s*\/\/.*$/gm, '')
}

function nonEmptyEnv(name) {
	const value = process.env[name]?.trim()
	return value ? value : undefined
}
