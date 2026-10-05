#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import {
	missingEnvNames,
	requiredRuntimeSecretNamesForApp,
	runtimeSecretPayloadForApp,
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
	const payload = runtimeSecretPayloadForApp(app)

	const tempDir = mkdtempSync(join(tmpdir(), 'hyperquote-worker-secrets-'))
	const secretFile = join(tempDir, `${app.id}.json`)
	try {
		writeFileSync(secretFile, JSON.stringify(payload), { mode: 0o600 })

		console.log(
			`Syncing ${Object.keys(payload).length} secrets for ${app.workerName}.`,
		)
		const result = spawnSync(
			'wrangler',
			['secret', 'bulk', secretFile, '--config', app.wranglerConfig],
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
