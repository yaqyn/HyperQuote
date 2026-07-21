import { describe, expect, test } from 'bun:test'
import { createTestRenderer } from '@opentui/core/testing'
import {
	DEV_COMMAND_PREFIX,
	DEV_EVENT_PREFIX,
	encodeDevCommand,
	parseDevCommand,
	parseDevEvent,
	sanitizeDevText,
} from './dev-protocol.mjs'
import {
	createInitialDashboardState,
	DevDashboardView,
	progressBar,
	terminalLayout,
	visibleLogLines,
} from './dev-tui-view.mjs'

describe('development TUI protocol', () => {
	test('round-trips commands and events without accepting plain log lines', () => {
		const command = { action: 'restart-app', app: 'portal' }
		expect(parseDevCommand(encodeDevCommand(command).trimEnd())).toEqual(
			command,
		)
		expect(
			parseDevEvent(
				`${DEV_EVENT_PREFIX}${JSON.stringify({ type: 'service', id: 'portal' })}`,
			),
		).toEqual({ type: 'service', id: 'portal' })
		expect(parseDevEvent('vite ready')).toBeNull()
		expect(parseDevCommand(`${DEV_COMMAND_PREFIX}{broken`)).toBeNull()
	})

	test('strips terminal control sequences from captured child output', () => {
		const escapeSequence = String.fromCharCode(27)
		const nullByte = String.fromCharCode(0)
		const c1Control = String.fromCharCode(133)
		expect(
			sanitizeDevText(
				`${escapeSequence}[31mred${escapeSequence}[0m${nullByte}${c1Control}\t safe`,
			),
		).toBe('red\t safe')
		expect(
			parseDevEvent(
				`${DEV_EVENT_PREFIX}${JSON.stringify({ message: `${escapeSequence}[31mred` })}`,
			),
		).toEqual({ message: 'red' })
	})
})

describe('development TUI layout', () => {
	test('uses deliberate tiny, compact, and wide breakpoints', () => {
		expect(terminalLayout(10, 2).micro).toBe(true)
		expect(terminalLayout(20, 6).mode).toBe('tiny')
		expect(terminalLayout(47, 11).mode).toBe('tiny')
		expect(terminalLayout(48, 12).mode).toBe('compact')
		expect(terminalLayout(91, 25).mode).toBe('compact')
		expect(terminalLayout(92, 26).mode).toBe('wide')
		for (const [width, height] of [
			[20, 6],
			[40, 10],
			[48, 12],
			[91, 25],
		]) {
			const layout = terminalLayout(width, height)
			expect(
				layout.serviceHeight + layout.logHeight + layout.panelGap,
			).toBeLessThanOrEqual(layout.availableBodyHeight)
		}
	})

	test('keeps progress and log windows bounded', () => {
		expect(progressBar(3, 7, 32)).toHaveLength(32)
		const state = createInitialDashboardState()
		state.logs = Array.from({ length: 20 }, (_, index) => ({
			level: 'info',
			message: `line ${index}`,
			source: index % 2 === 0 ? 'portal' : 'website',
			time: new Date(0),
		}))
		expect(visibleLogLines(state, 4).map((line) => line.message)).toEqual([
			'line 16',
			'line 17',
			'line 18',
			'line 19',
		])
		state.logFilter = 'selected'
		state.selectedIndex = 1
		expect(visibleLogLines(state, 2).map((line) => line.message)).toEqual([
			'line 16',
			'line 18',
		])
	})
})

describe('development TUI rendering and controls', () => {
	test('renders startup safely across supported terminal classes', async () => {
		for (const [width, height] of [
			[20, 6],
			[47, 11],
			[48, 12],
			[91, 25],
			[92, 26],
			[160, 50],
		]) {
			const setup = await createTestRenderer({ width, height })
			const view = new DevDashboardView(setup.renderer)
			await setup.flush()
			const frame = setup.captureCharFrame()
			expect(frame).toContain('HYPERQUOTE')
			const lines = frame.endsWith('\n')
				? frame.slice(0, -1).split('\n')
				: frame.split('\n')
			expect(lines.length).toBe(height)
			for (const line of lines) expect(line.length).toBeLessThanOrEqual(width)
			view.destroy()
			setup.renderer.destroy()
		}
	})

	test('keeps startup stages inside the bordered 40 by 10 card', async () => {
		const setup = await createTestRenderer({ width: 40, height: 10 })
		const view = new DevDashboardView(setup.renderer)
		for (const name of ['Runtime', 'Dev tools', 'Secrets', 'Database']) {
			view.handleEvent({ type: 'stage', name, status: 'complete' })
		}
		await setup.flush()
		const frame = setup.captureCharFrame()
		const lines = frame.slice(0, -1).split('\n')
		expect(lines).toHaveLength(10)
		expect(lines[9]).toContain('╰')
		expect(lines[9]).toContain('╯')
		expect(lines[9]).not.toMatch(/[A-Za-z]/)
		view.destroy()
		setup.renderer.destroy()
	})

	test('degrades to a readable micro view below four rows', async () => {
		for (const [width, height] of [
			[8, 1],
			[11, 3],
		]) {
			const setup = await createTestRenderer({ width, height })
			const view = new DevDashboardView(setup.renderer)
			await setup.flush()
			const frame = setup.captureCharFrame()
			expect(frame).toContain('HQ')
			view.destroy()
			setup.renderer.destroy()
		}
	})

	test('limits micro terminals to the visible quit control', async () => {
		const commands = []
		const setup = await createTestRenderer({ width: 11, height: 3 })
		const view = new DevDashboardView(setup.renderer, {
			onCommand(command) {
				commands.push(command)
			},
		})
		view.handleEvent({ type: 'stack', status: 'ready' })
		for (const key of ['r', 's', 't', 'm', 'x', 'd']) {
			setup.mockInput.pressKey(key)
		}
		expect(commands).toEqual([])
		expect(view.state.modal).toBeNull()
		view.destroy()
		setup.renderer.destroy()
	})

	test('shows reset only when its full confirmation fits', async () => {
		const cramped = await createTestRenderer({ width: 48, height: 12 })
		const crampedView = new DevDashboardView(cramped.renderer)
		crampedView.handleEvent({ type: 'stack', status: 'ready' })
		cramped.mockInput.pressKey('x')
		expect(crampedView.state.modal).toBeNull()
		expect(crampedView.state.toast).toContain('Enlarge')
		crampedView.destroy()
		cramped.renderer.destroy()

		const usable = await createTestRenderer({ width: 40, height: 10 })
		const usableView = new DevDashboardView(usable.renderer)
		usableView.handleEvent({ type: 'stack', status: 'ready' })
		usable.mockInput.pressKey('x')
		await Bun.sleep(25)
		expect(usableView.state.modal).toBe('reset')
		expect(usable.captureCharFrame()).toContain('RESET LOCAL')
		usableView.destroy()
		usable.renderer.destroy()
	})

	test('keeps tiny dashboard rows separate and borderless', async () => {
		const setup = await createTestRenderer({ width: 40, height: 10 })
		const view = new DevDashboardView(setup.renderer)
		for (const id of ['website', 'portal', 'internal', 'driver']) {
			view.handleEvent({ type: 'service', id, status: 'ready' })
		}
		view.handleEvent({
			type: 'log',
			level: 'info',
			message: 'Vite server ready',
			source: 'website',
		})
		view.handleEvent({ type: 'stack', status: 'ready' })
		await Bun.sleep(25)
		await setup.flush()
		const frame = setup.captureCharFrame()
		const lines = frame.slice(0, -1).split('\n')
		expect(lines).toHaveLength(10)
		expect(frame).not.toContain('╭')
		expect(lines[8]).toContain('Vite server ready')
		expect(lines[9]).toContain('? help · q quit')
		view.destroy()
		setup.renderer.destroy()
	})

	test('shows the responsive dashboard and captures service logs', async () => {
		const setup = await createTestRenderer({ width: 100, height: 30 })
		const view = new DevDashboardView(setup.renderer)
		view.handleEvent({
			type: 'runtime',
			aiEnabled: true,
			backendUrl: 'http://localhost:54321',
			studioUrl: 'http://localhost:54323',
		})
		view.handleEvent({
			type: 'service',
			id: 'website',
			status: 'ready',
			url: 'http://localhost:3000',
		})
		view.handleEvent({
			type: 'log',
			level: 'info',
			message: 'Vite server ready',
			source: 'website',
		})
		view.handleEvent({ type: 'stack', status: 'ready' })
		await setup.flush()
		await Bun.sleep(25)
		await setup.flush()
		const frame = setup.captureCharFrame()
		expect(frame).toContain('Services')
		expect(frame).toContain('Website')
		expect(frame).toContain('Vite server ready')
		expect(frame).toContain('production is never targeted')
		view.destroy()
		setup.renderer.destroy()
	})

	test('keeps the specific launcher error when the child exits', async () => {
		const setup = await createTestRenderer({ width: 100, height: 20 })
		const view = new DevDashboardView(setup.renderer)
		view.handleEvent({
			type: 'log',
			level: 'error',
			message: 'Infisical login is not ready.',
			source: 'system',
		})
		view.handleEvent({
			type: 'log',
			level: 'error',
			message: 'Run `infisical login`, then retry.',
			source: 'system',
		})
		view.handleEvent({ type: 'process-exit', code: 1, expected: false })
		await Bun.sleep(25)
		await setup.flush()
		const frame = setup.captureCharFrame()
		expect(view.state.error).toContain('Infisical login is not ready')
		expect(frame).toContain('Infisical login is not ready')
		expect(frame).toContain('Run `infisical login`, then retry.')
		expect(frame).not.toContain('Launcher exited with code 1')
		view.destroy()
		setup.renderer.destroy()
	})

	test('reports an exit code when no specific launcher error was captured', async () => {
		const setup = await createTestRenderer({ width: 100, height: 20 })
		const view = new DevDashboardView(setup.renderer)
		view.handleEvent({ type: 'process-exit', code: 7, expected: false })
		expect(view.state.error).toBe('Launcher exited with code 7.')
		view.destroy()
		setup.renderer.destroy()
	})

	test('dispatches reset only after exact local confirmation', async () => {
		const commands = []
		const setup = await createTestRenderer({ width: 90, height: 24 })
		const view = new DevDashboardView(setup.renderer, {
			onCommand(command) {
				commands.push(command)
			},
		})
		view.handleEvent({ type: 'stack', status: 'ready' })
		setup.mockInput.pressKey('x')
		await setup.mockInput.typeText('reset local')
		setup.mockInput.pressEnter()
		await Bun.sleep(25)
		expect(commands).toEqual([])
		expect(setup.captureCharFrame()).toContain('Type RESET LOCAL exactly')

		setup.mockInput.pressEscape()
		await Bun.sleep(80)
		setup.mockInput.pressKey('x')
		await setup.mockInput.typeText('RESET LOCAL')
		setup.mockInput.pressEnter()
		expect(commands).toEqual([
			{ action: 'supabase-reset', confirmation: 'RESET LOCAL' },
		])
		view.destroy()
		setup.renderer.destroy()
	})

	test('exposes non-destructive Supabase controls as explicit commands', async () => {
		const commands = []
		const setup = await createTestRenderer({ width: 80, height: 24 })
		const view = new DevDashboardView(setup.renderer, {
			onCommand(command) {
				commands.push(command)
			},
		})
		view.handleEvent({ type: 'stack', status: 'ready' })
		setup.mockInput.pressKey('s')
		setup.mockInput.pressKey('t')
		setup.mockInput.pressKey('m')
		expect(commands.map((command) => command.action)).toEqual([
			'supabase-start',
			'supabase-stop',
			'supabase-migrate',
		])
		view.destroy()
		setup.renderer.destroy()
	})
})
