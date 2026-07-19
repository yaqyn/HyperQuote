#!/usr/bin/env bun
import { spawn } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import {
	DEV_PROTOCOL_ENV,
	encodeDevCommand,
	parseDevEvent,
	sanitizeDevText,
} from './dev-protocol.mjs'

const repoRoot = realpathSync(
	join(dirname(fileURLToPath(import.meta.url)), '..'),
)
const args = process.argv.slice(2)
const plainMode =
	args.includes('--plain') ||
	process.env.HYPERQUOTE_DEV_PLAIN === '1' ||
	process.env.CI ||
	process.env.TERM === 'dumb' ||
	!process.stdin.isTTY ||
	!process.stdout.isTTY

if (plainMode) await runPlainLauncher()
else await runTuiLauncher()

async function runPlainLauncher() {
	const child = spawn(
		'node',
		['scripts/dev-smart.mjs', ...args.filter((arg) => arg !== '--plain')],
		{
			cwd: repoRoot,
			env: { ...process.env, [DEV_PROTOCOL_ENV]: '0' },
			stdio: 'inherit',
		},
	)
	child.once('error', (error) => {
		console.error(`Could not launch local development: ${error.message}`)
		process.exit(1)
	})
	for (const signal of ['SIGINT', 'SIGTERM']) {
		process.on(signal, () => child.kill(signal))
	}
	const { code, signal } = await waitForExit(child)
	if (signal) process.kill(process.pid, signal)
	process.exit(code ?? 0)
}

async function runTuiLauncher() {
	await import('@opentui/core/runtime-plugin-support')
	const { createCliRenderer } = await import('@opentui/core')
	const { DevDashboardView } = await import('./dev-tui-view.mjs')
	let child = null
	let shutdownRequested = false
	let forceStopTimer = null
	let finished = false
	let launcherExitCode = 0

	const renderer = await createCliRenderer({
		backgroundColor: '#07111f',
		clearOnShutdown: true,
		consoleMode: 'disabled',
		exitOnCtrlC: false,
		exitSignals: [],
		maxFps: 60,
		openConsoleOnError: false,
		screenMode: 'alternate-screen',
		targetFps: 30,
		useMouse: false,
	})
	renderer.setTerminalTitle('HyperQuote Local Development')

	const view = new DevDashboardView(renderer, {
		onCommand(command) {
			sendCommand(command)
		},
		onOpenUrl(url) {
			openUrl(url, view)
		},
		onQuit() {
			requestShutdown()
		},
	})

	if (args.includes('--tui-preview')) {
		runPreview(view)
		return
	}

	child = spawn(
		'node',
		['scripts/dev-smart.mjs', ...args.filter((arg) => arg !== '--tui-preview')],
		{
			cwd: repoRoot,
			detached: true,
			env: {
				...process.env,
				[DEV_PROTOCOL_ENV]: '1',
				NO_COLOR: '1',
			},
			stdio: ['pipe', 'pipe', 'pipe'],
		},
	)

	readLauncherStream(child.stdout, 'info', view)
	readLauncherStream(child.stderr, 'error', view)
	child.once('error', (error) => {
		view.handleEvent({ type: 'error', message: error.message })
	})
	child.once('exit', (code, signal) => {
		launcherExitCode = code ?? (signal ? 1 : 0)
		if (forceStopTimer) clearTimeout(forceStopTimer)
		view.handleEvent({
			type: 'process-exit',
			code,
			expected: shutdownRequested || code === 0,
			signal,
		})
		if (shutdownRequested || code === 0) {
			setTimeout(() => finish(code ?? 0), 120)
		}
	})

	process.on('SIGINT', requestShutdown)
	process.on('SIGTERM', requestShutdown)

	function sendCommand(command) {
		if (!child?.stdin?.writable) {
			view.handleEvent({
				type: 'warning',
				message: 'The launcher process is no longer accepting commands.',
			})
			return
		}
		child.stdin.write(encodeDevCommand(command))
	}

	function requestShutdown() {
		if (finished) return
		if (!child || child.exitCode !== null || child.signalCode) {
			finish(launcherExitCode)
			return
		}
		if (shutdownRequested) {
			killLauncherProcessGroup(child, 'SIGTERM')
			return
		}
		shutdownRequested = true
		view.handleEvent({ type: 'shutdown', status: 'stopping' })
		sendCommand({ action: 'quit' })
		forceStopTimer = setTimeout(() => {
			if (child) killLauncherProcessGroup(child, 'SIGTERM')
		}, 4_000)
	}

	function finish(exitCode) {
		if (finished) return
		finished = true
		if (forceStopTimer) clearTimeout(forceStopTimer)
		view.destroy()
		renderer.destroy()
		process.exit(exitCode)
	}

	function runPreview(previewView) {
		const stages = [
			['Runtime', 'OK', 'Bun and Node are available'],
			['Dev tools', 'OK', 'installed; daily refresh is non-blocking'],
			['Secrets', 'OK', 'Infisical dev /Projects/HyperQuote'],
			['Dependencies', 'OK', 'lockfile-consistent'],
			['Local backend', 'OK', 'Supabase is healthy'],
			['Database', 'OK', 'migration history is current'],
			['Application stack', 'START', 'launching app servers'],
		]
		stages.forEach(([label, state, detail], index) => {
			setTimeout(
				() => previewView.handleEvent({ type: 'status', label, state, detail }),
				index * 90,
			)
		})
		setTimeout(() => {
			previewView.handleEvent({
				type: 'runtime',
				aiEnabled: true,
				backendUrl: 'http://localhost:54321',
				studioUrl: 'http://localhost:54323',
			})
			for (const id of ['website', 'portal', 'internal', 'driver']) {
				previewView.handleEvent({
					type: 'service',
					id,
					status: 'ready',
				})
				previewView.handleEvent({
					type: 'log',
					level: 'info',
					message: 'Development server ready',
					source: id,
				})
			}
			previewView.handleEvent({ type: 'stack', status: 'ready' })
		}, stages.length * 90)
	}
}

function readLauncherStream(stream, level, view) {
	if (!stream) return
	const reader = createInterface({ input: stream })
	reader.on('line', (line) => {
		if (!line.trim()) return
		const event = parseDevEvent(line)
		if (event) view.handleEvent(event)
		else {
			view.handleEvent({
				type: 'log',
				level,
				message: sanitizeDevText(line),
				source: 'system',
			})
		}
	})
}

function openUrl(url, view) {
	const opener = spawn('xdg-open', [url], {
		detached: true,
		stdio: 'ignore',
	})
	opener.once('error', () => {
		view.handleEvent({
			type: 'warning',
			message: `Could not open ${url}.`,
		})
	})
	opener.unref()
}

function waitForExit(child) {
	if (child.exitCode !== null || child.signalCode) {
		return Promise.resolve({ code: child.exitCode, signal: child.signalCode })
	}
	return new Promise((resolve) => {
		child.once('exit', (code, signal) => resolve({ code, signal }))
	})
}

function killLauncherProcessGroup(child, signal) {
	if (!child.pid) return
	try {
		process.kill(-child.pid, signal)
	} catch {
		child.kill(signal)
	}
}
