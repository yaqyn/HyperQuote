#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import {
	listCompanySlugs,
	loadCompanyRegistry,
	selectedCompanyApps,
	writeGeneratedWranglerConfig,
} from './registry.mjs'

const args = process.argv.slice(2)
const all = args.includes('--all')
const versionIndex = args.indexOf('--version')
const version = versionIndex >= 0 ? args[versionIndex + 1] : 'stable'
const slug = args.find((arg) => !arg.startsWith('--')) ?? 'hyperquote'
if (version !== 'stable') {
	console.error('LOGIS V1 supports only --version stable.')
	process.exit(1)
}

const slugs = all ? listCompanySlugs() : [slug]
for (const companySlug of slugs) deployCompany(companySlug)

function deployCompany(companySlug) {
	const company = loadCompanyRegistry(companySlug)
	const apps = selectedCompanyApps(company, 'all')
	console.log(`Deploying ${company.slug} on LOGIS stable.`)
	for (const app of apps) writeGeneratedWranglerConfig(company, app)

	run('bun', ['run', 'secrets:check:production'], {
		HYPERQUOTE_VERIFY_INFISICAL_ENV: 'prod',
		LOGIS_COMPANY_SLUG: company.slug,
	})
	run('bun', ['run', 'deploy:supabase:production'], {
		LOGIS_COMPANY_SLUG: company.slug,
	})
	run('bun', ['run', 'deploy:worker-secrets'], {
		LOGIS_GENERATED_WRANGLER: '1',
		LOGIS_COMPANY_SLUG: company.slug,
	})
	for (const app of apps) {
		const configPath = app.generatedWranglerConfig
		run('bun', ['run', 'build:worker'], {
			cwd: app.absoluteDirectory,
			LOGIS_COMPANY_SLUG: company.slug,
			LOGIS_RELEASE_CHANNEL: 'stable',
		})
		run('wrangler', ['deploy', '--config', configPath], {
			cwd: app.absoluteDirectory,
			LOGIS_COMPANY_SLUG: company.slug,
			LOGIS_RELEASE_CHANNEL: 'stable',
		})
	}
	run('bun', ['run', 'smoke:production'], {
		LOGIS_COMPANY_SLUG: company.slug,
	})
}

function run(command, args, options = {}) {
	const { cwd, ...extraEnv } = options
	const result = spawnSync(command, args, {
		cwd,
		env: { ...process.env, ...extraEnv },
		stdio: 'inherit',
	})
	if (result.status !== 0) process.exit(result.status ?? 1)
}
