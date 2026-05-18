#!/usr/bin/env node
import { parseArgs } from './deploy-contract.mjs'

const args = parseArgs(process.argv.slice(2))
const app = args.app
const target = args.target ?? 'staging'
const explicitUrl = args.url

if (!app) {
	console.error(
		'Usage: node scripts/deploy-smoke.mjs --target <staging|production> --app <app> [--url <base-url>]',
	)
	process.exit(1)
}

const urlEnvName = `${target}_${app}_url`.toUpperCase()
const baseUrl = explicitUrl ?? process.env[urlEnvName]

if (!baseUrl) {
	console.error(`::error::Missing smoke base URL variable: ${urlEnvName}`)
	process.exit(1)
}

const rootHtml = await fetchText(baseUrl)
assertNoRuntimePlaceholders(rootHtml, `${app} root`)

if (app === 'internal') {
	assertDoesNotInclude(rootHtml, 'dev-user', 'internal root rendered dev-user')
	assertDoesNotInclude(rootHtml, 'Dev User', 'internal root rendered Dev User')

	const loginHtml = await fetchText(new URL('/login', baseUrl).toString())
	assertIncludes(
		loginHtml,
		'Employee credentials',
		'internal login did not render',
	)
	assertDoesNotInclude(
		loginHtml,
		'Login is not configured',
		'internal login is missing runtime Supabase config',
	)
}

console.log(`Smoke checks passed for ${target} ${app}.`)

async function fetchText(url) {
	const response = await fetch(url, {
		headers: {
			accept: 'text/html,application/xhtml+xml',
			'user-agent': 'HyperQuote deploy smoke',
		},
		redirect: 'follow',
	})

	if (!response.ok) {
		throw new Error(`Smoke request failed for ${url}: ${response.status}`)
	}

	return response.text()
}

function assertNoRuntimePlaceholders(html, label) {
	for (const marker of [
		'placeholder.supabase.co',
		'your-project.supabase.co',
		'your-anon-key',
		'your-maptiler-key',
		'AI is not configured on this server.',
		'GROQ_API_KEY is not set',
	]) {
		assertDoesNotInclude(html, marker, `${label} contains ${marker}`)
	}
}

function assertIncludes(haystack, needle, message) {
	if (haystack.includes(needle)) return
	console.error(`::error::${message}`)
	process.exit(1)
}

function assertDoesNotInclude(haystack, needle, message) {
	if (!haystack.includes(needle)) return
	console.error(`::error::${message}`)
	process.exit(1)
}
