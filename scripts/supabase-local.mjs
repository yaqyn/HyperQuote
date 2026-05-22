#!/usr/bin/env node
import { spawn } from 'node:child_process'
import process from 'node:process'
import { withLocalSupabaseAuthEnv } from './supabase-auth-env.mjs'

const args = process.argv.slice(2)
const quiet = args.includes('--quiet')
const supabaseArgs = args.filter((arg) => arg !== '--quiet')

if (supabaseArgs.length === 0) {
	console.error('Usage: node scripts/supabase-local.mjs <supabase args...>')
	process.exit(1)
}

const child = spawn('supabase', supabaseArgs, {
	env: withLocalSupabaseAuthEnv(process.env),
	stdio: quiet ? 'ignore' : ['inherit', 'pipe', 'pipe'],
})

if (!quiet) {
	child.stdout?.on('data', (chunk) => {
		process.stdout.write(sanitizeSupabaseOutput(chunk.toString()))
	})
	child.stderr?.on('data', (chunk) => {
		process.stderr.write(sanitizeSupabaseOutput(chunk.toString()))
	})
}

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal)
		return
	}
	process.exit(code ?? 0)
})

function sanitizeSupabaseOutput(output) {
	return output
		.split('\n')
		.map((line) => {
			if (
				/(anon key|service_role key|jwt secret|publishable|secret|access key)/i.test(
					line,
				)
			) {
				return line.replace(/(│\s*)[^│]+(\s*│?)$/u, '$1<redacted>$2')
			}
			return line
		})
		.join('\n')
}
