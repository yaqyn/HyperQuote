#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import { productionUrls } from './production-config.mjs'

const checks = [
	{
		label: 'root redirect',
		redirectTo: productionUrls.website,
		url: productionUrls.root,
	},
	{ label: 'website shell', url: productionUrls.website },
	{
		label: 'website health',
		json: true,
		url: `${productionUrls.website}/api/health`,
	},
	{ label: 'portal shell', url: productionUrls.portal },
	{
		label: 'portal health',
		json: true,
		url: `${productionUrls.portal}/api/health`,
	},
	{ label: 'internal login', url: `${productionUrls.internal}/login` },
	{
		label: 'internal health',
		json: true,
		url: `${productionUrls.internal}/api/health`,
	},
	{ label: 'driver shell', url: productionUrls.driver },
	{
		label: 'driver health',
		json: true,
		url: `${productionUrls.driver}/api/health`,
	},
]

let failed = false

for (const check of checks) {
	try {
		const response = await fetch(check.url, {
			redirect: check.redirectTo ? 'manual' : 'follow',
			signal: AbortSignal.timeout(15_000),
		})
		if (check.redirectTo) {
			const location = response.headers.get('location') ?? ''
			if (
				![301, 302, 307, 308].includes(response.status) ||
				!location.startsWith(check.redirectTo)
			) {
				throw new Error(
					`expected redirect to ${check.redirectTo}, got ${response.status} ${location}`,
				)
			}
		} else if (!response.ok) {
			throw new Error(`unexpected status ${response.status}`)
		} else if (check.json) {
			const payload = await response.json()
			if (!payload || typeof payload !== 'object' || payload.ok !== true) {
				throw new Error('health payload was not ok')
			}
		}
		console.log(`${check.label}: ok`)
	} catch (error) {
		if (
			check.redirectTo &&
			isFetchFailure(error) &&
			verifyRedirectWithDoh(check)
		) {
			console.log(`${check.label}: ok (public DNS fallback)`)
			continue
		}
		failed = true
		console.error(
			`${check.label}: ${error instanceof Error ? error.message : String(error)}`,
		)
	}
}

process.exit(failed ? 1 : 0)

function isFetchFailure(error) {
	return error instanceof Error && error.message === 'fetch failed'
}

function verifyRedirectWithDoh(check) {
	const result = spawnSync(
		'curl',
		[
			'-sS',
			'-I',
			'--max-time',
			'15',
			'--doh-url',
			'https://cloudflare-dns.com/dns-query',
			check.url,
		],
		{ encoding: 'utf8' },
	)
	if (result.status !== 0) return false

	const statusMatch = /^HTTP\/\S+\s+(\d+)/im.exec(result.stdout)
	const locationMatch = /^location:\s*(.+)$/im.exec(result.stdout)
	const status = statusMatch ? Number(statusMatch[1]) : 0
	const location = locationMatch?.[1]?.trim() ?? ''
	return (
		[301, 302, 307, 308].includes(status) &&
		location.startsWith(check.redirectTo)
	)
}
