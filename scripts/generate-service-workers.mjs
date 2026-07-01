import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
	SERVICE_WORKER_APPS,
	serviceWorkerSourceForApp,
} from './service-worker-source.mjs'

const root = process.cwd()

for (const app of SERVICE_WORKER_APPS) {
	writeFileSync(
		join(root, 'apps', app.key, 'public', app.file),
		serviceWorkerSourceForApp(app),
	)
}

console.log(`Generated service workers for ${SERVICE_WORKER_APPS.length} apps.`)
