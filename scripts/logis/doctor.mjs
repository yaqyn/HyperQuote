#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import {
	loadCompanyRegistry,
	resolveEnvBackedValue,
	selectedCompanyApps,
} from './registry.mjs'

const slug = process.argv[2] ?? process.env.LOGIS_COMPANY_SLUG ?? 'hyperquote'
const company = loadCompanyRegistry(slug)
const apps = selectedCompanyApps(company, 'all')

const checks = [
	{ command: 'bun', args: ['--version'], label: 'Bun' },
	{ command: 'gh', args: ['auth', 'status'], label: 'GitHub CLI auth' },
	{ command: 'wrangler', args: ['whoami'], label: 'Wrangler auth' },
	{ command: 'infisical', args: ['--version'], label: 'Infisical CLI' },
	{ command: 'supabase', args: ['--version'], label: 'Supabase CLI' },
]

let failed = false
for (const check of checks) {
	const result = spawnSync(check.command, check.args, {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.status === 0) {
		console.log(`${check.label}: ok`)
	} else {
		failed = true
		console.error(`${check.label}: missing or not authenticated`)
	}
}

console.log(`Company: ${company.slug}`)
console.log(`Infisical path: ${company.infisical.path}`)
console.log(
	`Supabase project: ${company.supabase.projectId} (${company.supabase.region})`,
)
for (const app of apps) {
	console.log(`${app.id}: ${app.workerName} -> ${app.url}`)
}

const envBacked = [
	['cloudflare.accountId', company.cloudflare.accountId],
	['cloudflare.zoneId', company.cloudflare.zoneId],
	['supabase.projectRef', company.supabase.projectRef],
]
for (const [label, value] of envBacked) {
	if (
		typeof value === 'string' &&
		value.startsWith('env:') &&
		!resolveEnvBackedValue(value)
	) {
		console.warn(`${label}: ${value} not set in current environment`)
	}
}

process.exit(failed ? 1 : 0)
