#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import {
	missingEnvNames,
	productionAppById,
	productionBuildEnv,
	requiredProductionBuildEnvNames,
} from './production-config.mjs'

const appId = process.argv[2]

if (!appId) {
	console.error(
		'Usage: node scripts/build-worker.mjs <website|portal|internal|driver>',
	)
	process.exit(1)
}

const app = productionAppById(appId)
const localDevVars = ['.dev.vars', '.dev.vars.production']
	.map((name) => join(app.absoluteDirectory, name))
	.filter(existsSync)
if (localDevVars.length > 0) {
	console.error(
		`Cannot build ${app.id} Worker while legacy .dev.vars files exist. Restart \`bun run dev\` to migrate local runtime variables safely.`,
	)
	process.exit(1)
}
const missing = missingEnvNames(requiredProductionBuildEnvNames)
if (missing.length > 0) {
	console.error(
		`Cannot build ${app.id} Worker. Missing production build env: ${missing.join(', ')}`,
	)
	process.exit(1)
}

const result = spawnSync('vite', ['build'], {
	cwd: app.absoluteDirectory,
	env: {
		...process.env,
		...productionBuildEnv(app),
		CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false',
		HYPERQUOTE_DEPLOY_TARGET: app.id === 'driver' ? '' : 'cloudflare',
		NODE_ENV: 'production',
		SUPABASE_COOKIE_NAME: app.cookieName,
	},
	stdio: 'inherit',
})

process.exit(result.status ?? 1)
