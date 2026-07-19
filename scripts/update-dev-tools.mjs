#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
	chmodSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1_000
const RELEASE_LOOKUP_TIMEOUT_MS = 15_000
const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1_000
const LOCAL_COMMAND_TIMEOUT_MS = 15_000
const cacheDir = join(homedir(), '.cache', 'hyperquote')
const cachePath = join(cacheDir, 'dev-tools.json')
const installDir = join(homedir(), '.local', 'bin')
const force = process.argv.includes('--force')
const quiet = process.argv.includes('--quiet')

const platform = process.platform
const architecture = resolveArchitecture(process.arch)
if (platform !== 'linux' || !architecture) {
	log(
		`Automatic CLI updates are not configured for ${platform}/${process.arch}.`,
	)
	process.exit(0)
}

if (!force && checkedRecently()) process.exit(0)
if (!commandExists('gh')) {
	warn('GitHub CLI is unavailable; skipping automatic dev-tool updates.')
	writeCheckTimestamp()
	process.exit(0)
}

const tools = [
	{
		binaryName: 'supabase',
		command: 'supabase',
		displayName: 'Supabase CLI',
		repository: 'supabase/cli',
		assetName(version) {
			return `supabase_${version}_linux_${architecture}.tar.gz`
		},
		checksumAsset: 'checksums.txt',
	},
	{
		binaryName: 'infisical',
		command: 'infisical',
		displayName: 'Infisical CLI',
		repository: 'Infisical/cli',
		assetName(version) {
			return `cli_${version}_linux_${architecture}.tar.gz`
		},
		checksumAsset: 'checksums.txt',
	},
]

for (const tool of tools) {
	try {
		updateTool(tool)
	} catch (error) {
		warn(
			`${tool.displayName} update skipped: ${error instanceof Error ? error.message : String(error)}`,
		)
	}
}
writeCheckTimestamp()

function updateTool(tool) {
	const release = readLatestRelease(tool.repository)
	const latestVersion = release.tagName.replace(/^v/, '')
	const currentVersion = readInstalledVersion(tool.command)
	if (currentVersion && compareVersions(currentVersion, latestVersion) >= 0) {
		log(`${tool.displayName} ${currentVersion} is current.`)
		return
	}

	const assetName = tool.assetName(latestVersion)
	const availableAssets = new Set(release.assets.map((asset) => asset.name))
	if (
		!availableAssets.has(assetName) ||
		!availableAssets.has(tool.checksumAsset)
	) {
		throw new Error(
			`release ${release.tagName} is missing verified Linux assets`,
		)
	}

	const workDir = mkdtempSync(join(tmpdir(), 'hyperquote-dev-tool-'))
	try {
		run(
			'gh',
			[
				'release',
				'download',
				release.tagName,
				'--repo',
				tool.repository,
				'--pattern',
				assetName,
				'--pattern',
				tool.checksumAsset,
				'--dir',
				workDir,
			],
			DOWNLOAD_TIMEOUT_MS,
		)
		verifyChecksum(
			join(workDir, assetName),
			join(workDir, tool.checksumAsset),
			assetName,
		)
		run(
			'tar',
			['-xzf', join(workDir, assetName), '-C', workDir, tool.binaryName],
			LOCAL_COMMAND_TIMEOUT_MS,
		)

		const candidate = join(workDir, tool.binaryName)
		chmodSync(candidate, 0o755)
		const candidateVersion = readBinaryVersion(candidate)
		if (candidateVersion !== latestVersion) {
			throw new Error(
				`verified archive reports ${candidateVersion ?? 'an unknown version'}, expected ${latestVersion}`,
			)
		}

		mkdirSync(installDir, { recursive: true })
		const target = join(installDir, tool.binaryName)
		const pending = `${target}.next-${process.pid}`
		copyFileSync(candidate, pending)
		chmodSync(pending, 0o755)
		renameSync(pending, target)
		log(
			`${tool.displayName} ${currentVersion ?? 'not installed'} -> ${latestVersion}`,
		)
	} finally {
		rmSync(workDir, { force: true, recursive: true })
	}
}

function readLatestRelease(repository) {
	const result = run(
		'gh',
		['release', 'view', '--repo', repository, '--json', 'tagName,assets'],
		RELEASE_LOOKUP_TIMEOUT_MS,
	)
	const parsed = JSON.parse(result.stdout)
	if (
		!parsed ||
		typeof parsed.tagName !== 'string' ||
		!Array.isArray(parsed.assets)
	) {
		throw new Error('GitHub returned an invalid release manifest')
	}
	return parsed
}

function verifyChecksum(assetPath, checksumPath, assetName) {
	const line = readFileSync(checksumPath, 'utf8')
		.split('\n')
		.find((entry) => entry.trim().endsWith(` ${assetName}`))
	const expected = line?.trim().split(/\s+/)[0]
	if (!expected || !/^[a-f0-9]{64}$/i.test(expected)) {
		throw new Error(`checksum manifest does not contain ${assetName}`)
	}
	const actual = createHash('sha256')
		.update(readFileSync(assetPath))
		.digest('hex')
	if (actual !== expected.toLowerCase()) {
		throw new Error(`checksum verification failed for ${assetName}`)
	}
}

function readInstalledVersion(command) {
	if (!commandExists(command)) return null
	return readBinaryVersion(command)
}

function readBinaryVersion(command) {
	const result = spawnSync(command, ['--version'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
		timeout: LOCAL_COMMAND_TIMEOUT_MS,
	})
	if (result.status !== 0) return null
	return /\d+\.\d+\.\d+/.exec(result.stdout)?.[0] ?? null
}

function commandExists(command) {
	return (
		spawnSync(command, ['--version'], {
			stdio: ['ignore', 'ignore', 'ignore'],
			timeout: LOCAL_COMMAND_TIMEOUT_MS,
		}).status === 0
	)
}

function run(command, args, timeout) {
	const result = spawnSync(command, args, {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		timeout,
	})
	if (result.status !== 0) {
		const details = (result.stderr || result.stdout).trim().split('\n').at(-1)
		throw new Error(
			details ||
				result.error?.message ||
				`${command} exited with ${result.status}`,
		)
	}
	return result
}

function compareVersions(left, right) {
	const leftParts = left.split('.').map(Number)
	const rightParts = right.split('.').map(Number)
	for (let index = 0; index < 3; index += 1) {
		const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0)
		if (difference !== 0) return difference
	}
	return 0
}

function checkedRecently() {
	if (!existsSync(cachePath)) return false
	try {
		const cache = JSON.parse(readFileSync(cachePath, 'utf8'))
		return (
			typeof cache.checkedAt === 'number' &&
			Date.now() - cache.checkedAt < CHECK_INTERVAL_MS
		)
	} catch {
		return false
	}
}

function writeCheckTimestamp() {
	mkdirSync(cacheDir, { recursive: true })
	writeFileSync(cachePath, `${JSON.stringify({ checkedAt: Date.now() })}\n`, {
		mode: 0o600,
	})
}

function resolveArchitecture(value) {
	if (value === 'x64') return 'amd64'
	if (value === 'arm64') return 'arm64'
	return null
}

function log(message) {
	if (!quiet) console.log(`tools: ${message}`)
}

function warn(message) {
	console.warn(`tools warning: ${message}`)
}
