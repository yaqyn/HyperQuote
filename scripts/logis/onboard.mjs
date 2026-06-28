#!/usr/bin/env node
import process from 'node:process'
import { loadCompanyRegistry } from './registry.mjs'

const args = process.argv.slice(2)
const slug = args.find((arg) => !arg.startsWith('--')) ?? 'hyperquote'
const apply = args.includes('--apply')
const dryRun = args.includes('--dry-run') || !apply

if (apply && dryRun) {
	console.error('Use either --dry-run or --apply, not both.')
	process.exit(1)
}

const company = loadCompanyRegistry(slug)

console.log(
	`LOGIS onboarding ${dryRun ? 'dry-run' : 'apply'} for ${company.slug}`,
)
console.log('Planned resources:')
console.log(`- Infisical project path: ${company.infisical.path}`)
console.log(`- GitHub environment: company-${company.slug}`)
console.log(
	`- Supabase project: ${company.supabase.projectId} (${company.supabase.region})`,
)
console.log(`- Cloudflare zone/domain: ${company.domains.root}`)
for (const [appId, app] of Object.entries(company.apps)) {
	console.log(`- Worker ${appId}: ${app.workerName} -> ${app.url}`)
}

if (!apply) {
	console.log(
		'No provider changes made. Re-run with --apply after reviewing the plan.',
	)
	process.exit(0)
}

console.error(
	'Apply mode is intentionally gated for V1. Use the dry-run report to perform or script provider creation, then store only scoped secrets in the company Infisical path and GitHub company environment.',
)
process.exit(1)
