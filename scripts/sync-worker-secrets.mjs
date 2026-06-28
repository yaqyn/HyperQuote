#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { writeGeneratedWranglerConfig } from './logis/registry.mjs'
import {
	missingEnvNames,
	optionalRuntimeSecretNamesForApp,
	productionCompany,
	requiredRuntimeSecretNamesForApp,
	selectedProductionApps,
} from './production-config.mjs'

const selection = process.argv[2] ?? 'all'
const apps = selectedProductionApps(selection)

for (const app of apps) {
	const requiredSecretNames = requiredRuntimeSecretNamesForApp(app)
	const missing = missingEnvNames(requiredSecretNames)
	if (missing.length > 0) {
		console.error(
			`Cannot sync ${app.workerName} secrets. Missing env: ${missing.join(', ')}`,
		)
		process.exit(1)
	}
	const optionalSecretNames = optionalRuntimeSecretNamesForApp(app).filter(
		(name) => process.env[name]?.trim(),
	)
	const secretNames = [...requiredSecretNames, ...optionalSecretNames]

	const tempDir = mkdtempSync(join(tmpdir(), 'hyperquote-worker-secrets-'))
	const secretFile = join(tempDir, `${app.id}.json`)
	try {
		const wranglerConfig =
			process.env.LOGIS_GENERATED_WRANGLER === '1'
				? writeGeneratedWranglerConfig(productionCompany, app)
				: app.wranglerConfig
		const payload = Object.fromEntries(
			secretNames.map((name) => [name, process.env[name]]),
		)
		writeFileSync(secretFile, JSON.stringify(payload), { mode: 0o600 })

		console.log(`Syncing ${secretNames.length} secrets for ${app.workerName}.`)
		const result = spawnSync(
			'wrangler',
			['secret', 'bulk', secretFile, '--config', wranglerConfig],
			{
				cwd: app.absoluteDirectory,
				stdio: 'inherit',
			},
		)
		if (result.status !== 0) process.exit(result.status ?? 1)
	} finally {
		rmSync(tempDir, { force: true, recursive: true })
	}
}
