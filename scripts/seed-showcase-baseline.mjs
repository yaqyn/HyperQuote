#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import process from 'node:process'
import {
	productionSupabaseDatabaseUrl,
	repoRoot,
} from './production-config.mjs'

const args = new Set(process.argv.slice(2))
const production = args.has('--production')
const quiet = args.has('--quiet')
const dbUrl = readDatabaseUrl()

if (!dbUrl) {
	console.error(
		'Cannot seed showcase baseline. Missing SUPABASE_DB_URL or production database credentials.',
	)
	process.exit(1)
}

const seedPath = join(repoRoot, 'supabase', 'showcase-baseline.sql')
const result = spawnSync(
	'psql',
	[dbUrl, '-X', '-v', 'ON_ERROR_STOP=1', '-f', seedPath],
	{
		cwd: repoRoot,
		encoding: 'utf8',
		stdio: quiet ? ['ignore', 'pipe', 'pipe'] : ['inherit', 'pipe', 'pipe'],
	},
)

if (result.stdout && !quiet) process.stdout.write(redact(result.stdout))
if (result.stderr && !quiet) process.stderr.write(redact(result.stderr))

if (result.status !== 0) {
	if (quiet) {
		const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()
		if (output) console.error(redact(output))
	}
	process.exit(result.status ?? 1)
}

if (!quiet) console.log('Showcase baseline data is seeded.')

function readDatabaseUrl() {
	const explicitUrl =
		process.env.SUPABASE_DB_URL?.trim() ?? process.env.DATABASE_URL?.trim()
	if (explicitUrl) return explicitUrl
	if (production) return productionSupabaseDatabaseUrl()
	return 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
}

function redact(output) {
	return output.replaceAll(dbUrl, '[redacted-db-url]')
}
