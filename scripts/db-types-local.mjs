#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import process from 'node:process'
import { withLocalSupabaseAuthEnv } from './supabase-auth-env.mjs'

const outputPath = 'packages/types/src/database.types.ts'
const env = withLocalSupabaseAuthEnv(process.env)

const generated = spawnSync(
	'supabase',
	['gen', 'types', 'typescript', '--local'],
	{
		encoding: 'utf8',
		env,
		stdio: ['ignore', 'pipe', 'pipe'],
	},
)

if (generated.stderr) process.stderr.write(generated.stderr)
if (generated.status !== 0) process.exit(generated.status ?? 1)

writeFileSync(outputPath, generated.stdout)

const formatted = spawnSync('biome', ['format', '--write', outputPath], {
	stdio: 'inherit',
})
process.exit(formatted.status ?? 0)
