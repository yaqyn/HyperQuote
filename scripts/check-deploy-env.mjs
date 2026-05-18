#!/usr/bin/env node
import {
	getBuildVarsForApps,
	getContractApps,
	parseArgs,
} from './deploy-contract.mjs'

const args = parseArgs(process.argv.slice(2))
const target = args.target ?? 'unknown'
const apps = getContractApps(args.app)
const requiredVars = getBuildVarsForApps(apps)
const missing = requiredVars.filter((name) => !process.env[name])

if (missing.length > 0) {
	console.error(
		`::error::Missing ${target} build environment variables: ${missing.join(', ')}`,
	)
	console.error(
		'Configure them as GitHub Actions variables and map them to the canonical VITE_* names before building.',
	)
	process.exit(1)
}

console.log(
	`Deploy build environment contract satisfied for ${target}: ${apps.join(', ')}`,
)
