import '@opentui/core/runtime-plugin-support'
import { BoxRenderable, CliRenderEvents, TextRenderable } from '@opentui/core'

const COLORS = {
	accent: '#4f8cff',
	background: '#07111f',
	border: '#1e3a5f',
	danger: '#fb7185',
	dim: '#7890ad',
	panel: '#0b1728',
	success: '#34d399',
	text: '#dbeafe',
	warning: '#fbbf24',
}

const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
const MAX_LOG_LINES = 1_000
const RESET_CONFIRMATION = 'RESET LOCAL'

const STAGES = [
	'Runtime',
	'Dev tools',
	'Secrets',
	'Dependencies',
	'Local backend',
	'Database',
	'Application stack',
]

const DEFAULT_SERVICES = [
	{
		id: 'website',
		kind: 'app',
		label: 'Website',
		status: 'pending',
		url: 'http://localhost:3000',
	},
	{
		id: 'portal',
		kind: 'app',
		label: 'Portal',
		status: 'pending',
		url: 'http://localhost:3001',
	},
	{
		id: 'internal',
		kind: 'app',
		label: 'Internal',
		status: 'pending',
		url: 'http://localhost:3002',
	},
	{
		id: 'driver',
		kind: 'app',
		label: 'Driver',
		status: 'pending',
		url: 'http://localhost:3003',
	},
	{
		id: 'supabase',
		kind: 'backend',
		label: 'Supabase',
		status: 'pending',
		url: 'http://localhost:54321',
	},
	{
		id: 'studio',
		kind: 'tool',
		label: 'Studio',
		status: 'pending',
		url: 'http://localhost:54323',
	},
	{
		id: 'ai',
		kind: 'tool',
		label: 'AI proxy',
		status: 'pending',
		url: null,
	},
]

export function createInitialDashboardState() {
	return {
		confirmationError: null,
		confirmationText: '',
		error: null,
		focus: 'services',
		logFilter: 'all',
		logOffset: 0,
		logs: [],
		modal: null,
		operation: null,
		phase: 'startup',
		selectedIndex: 0,
		services: DEFAULT_SERVICES.map((service) => ({ ...service })),
		stages: STAGES.map((label) => ({
			detail: '',
			label,
			status: 'pending',
		})),
		toast: null,
	}
}

export function terminalLayout(width, height) {
	const columns = Math.max(1, Math.floor(width))
	const rows = Math.max(1, Math.floor(height))
	const micro = columns < 12 || rows < 4
	const mode =
		columns < 48 || rows < 12
			? 'tiny'
			: columns < 92 || rows < 26
				? 'compact'
				: 'wide'
	const padding = mode === 'tiny' ? 0 : 1
	const headerHeight = micro ? Math.min(1, rows) : mode === 'tiny' ? 1 : 3
	const footerHeight = micro ? 0 : 1
	const availableBodyHeight = Math.max(
		0,
		rows - headerHeight - footerHeight - padding * 2,
	)
	let panelGap = 0
	let serviceHeight = availableBodyHeight
	let logHeight = 0
	if (!micro && mode === 'wide') {
		logHeight = availableBodyHeight
	} else if (!micro && mode === 'tiny' && availableBodyHeight >= 2) {
		serviceHeight = availableBodyHeight - 1
		logHeight = 1
	} else if (!micro && mode === 'compact' && availableBodyHeight >= 3) {
		panelGap = availableBodyHeight >= 4 ? 1 : 0
		logHeight = Math.max(1, Math.floor((availableBodyHeight - panelGap) * 0.4))
		serviceHeight = Math.max(1, availableBodyHeight - panelGap - logHeight)
	}
	return {
		availableBodyHeight,
		columns,
		footerHeight,
		headerHeight,
		logHeight,
		micro,
		mode,
		panelGap,
		padding,
		rows,
		serviceHeight,
	}
}

export function progressBar(completed, total, width) {
	const safeTotal = Math.max(1, total)
	const ratio = Math.max(0, Math.min(1, completed / safeTotal))
	const percent = `${String(Math.round(ratio * 100)).padStart(3)}%`
	const barWidth = Math.max(4, Math.min(44, width - percent.length - 1))
	const filled = Math.round(barWidth * ratio)
	return `${'█'.repeat(filled)}${'░'.repeat(barWidth - filled)} ${percent}`
}

export function visibleLogLines(state, count) {
	const selected = state.services[state.selectedIndex]
	const filtered =
		state.logFilter === 'selected' && selected
			? state.logs.filter((line) => line.source === selected.id)
			: state.logs
	const visibleCount = Math.max(1, count)
	const maxOffset = Math.max(0, filtered.length - visibleCount)
	const offset = Math.min(state.logOffset, maxOffset)
	const end = filtered.length - offset
	return filtered.slice(Math.max(0, end - visibleCount), end)
}

export class DevDashboardView {
	constructor(renderer, callbacks = {}) {
		this.renderer = renderer
		this.callbacks = callbacks
		this.state = createInitialDashboardState()
		this.renderPending = false
		this.renderTimer = null
		this.spinnerIndex = 0
		this.destroyed = false
		this.onKeyPress = (key) => this.handleKey(key)
		this.onResize = () => this.scheduleRender()
		this.renderer.keyInput.on('keypress', this.onKeyPress)
		this.renderer.on(CliRenderEvents.RESIZE, this.onResize)
		this.animationTimer = setInterval(() => {
			if (
				this.state.phase === 'startup' ||
				this.state.operation?.status === 'running'
			) {
				this.spinnerIndex = (this.spinnerIndex + 1) % SPINNER.length
				this.scheduleRender()
			}
		}, 90)
		this.animationTimer.unref()
		this.render()
	}

	handleEvent(event) {
		if (!event || typeof event.type !== 'string') return
		switch (event.type) {
			case 'status':
				this.applyStatus(event)
				break
			case 'urls':
				for (const service of event.services ?? []) {
					this.updateService(service.id, { url: service.url })
				}
				break
			case 'runtime':
				this.updateService('supabase', {
					status: event.backendUrl ? 'ready' : 'stopped',
					url: event.backendUrl,
				})
				this.updateService('studio', {
					status: event.backendUrl ? 'ready' : 'stopped',
					url: event.studioUrl,
				})
				this.updateService('ai', {
					status: event.aiEnabled ? 'ready' : 'disabled',
				})
				break
			case 'service':
				this.updateService(event.id, {
					detail: event.detail,
					status: event.status,
					url: event.url,
				})
				break
			case 'stack':
				this.state.phase = 'dashboard'
				this.completeStage('Application stack', event.status)
				break
			case 'operation':
				this.state.operation = {
					detail: event.detail ?? '',
					label: event.label,
					status: event.status,
				}
				if (event.status !== 'running') {
					this.addLog(
						'system',
						event.status === 'success' ? 'info' : 'error',
						[event.label, event.detail].filter(Boolean).join(': '),
					)
				}
				break
			case 'log':
				this.addLog(event.source, event.level, event.message)
				break
			case 'warning':
				this.state.toast = event.message
				this.addLog('system', 'warning', event.message)
				break
			case 'error':
				this.state.error = event.message
				this.state.phase = 'error'
				this.addLog('system', 'error', event.message)
				break
			case 'shutdown':
				this.state.operation = {
					detail: '',
					label: 'Stopping local stack',
					status: 'running',
				}
				break
			case 'process-exit':
				if (event.expected) this.state.phase = 'stopped'
				else {
					this.state.error = `Launcher exited with code ${event.code ?? 'unknown'}.`
					this.state.phase = 'error'
				}
				break
		}
		this.scheduleRender()
	}

	handleKey(key) {
		if (key.eventType === 'release') return
		if (key.ctrl && key.name === 'c') {
			this.callbacks.onQuit?.()
			return
		}
		if (this.state.modal === 'reset') {
			this.handleResetKey(key)
			return
		}
		if (this.state.modal === 'help') {
			if (key.name === 'escape' || key.sequence === '?' || key.name === 'q') {
				this.state.modal = null
				this.scheduleRender()
			}
			return
		}

		const sequence = key.sequence.toLowerCase()
		if (key.name === 'q' || sequence === 'q') {
			this.callbacks.onQuit?.()
			return
		}
		const layout = terminalLayout(this.renderer.width, this.renderer.height)
		if (layout.micro) return
		if (key.sequence === '?') {
			this.state.modal = 'help'
			this.scheduleRender()
			return
		}
		if (this.state.phase !== 'dashboard') return

		if (key.name === 'tab') {
			this.state.focus = this.state.focus === 'services' ? 'logs' : 'services'
			this.scheduleRender()
			return
		}
		if (key.name === 'escape') {
			this.state.focus = 'services'
			this.scheduleRender()
			return
		}
		if (key.name === 'up' || sequence === 'k') {
			if (this.state.focus === 'logs') this.scrollLogs(1)
			else this.moveSelection(-1)
			return
		}
		if (key.name === 'down' || sequence === 'j') {
			if (this.state.focus === 'logs') this.scrollLogs(-1)
			else this.moveSelection(1)
			return
		}
		if (key.name === 'pageup') {
			this.scrollLogs(8)
			return
		}
		if (key.name === 'pagedown') {
			this.scrollLogs(-8)
			return
		}
		if (key.name === 'end') {
			this.state.logOffset = 0
			this.scheduleRender()
			return
		}
		if (key.name === 'return' || key.name === 'enter') {
			const selected = this.selectedService()
			if (selected?.url) this.callbacks.onOpenUrl?.(selected.url)
			else this.localNotice('The selected service has no browser URL.')
			return
		}

		switch (sequence) {
			case 'l':
				this.state.focus = 'logs'
				break
			case 'f':
				this.state.logFilter =
					this.state.logFilter === 'all' ? 'selected' : 'all'
				this.state.logOffset = 0
				break
			case 'c':
				this.state.logs = []
				this.state.logOffset = 0
				break
			case 'r': {
				const selected = this.selectedService()
				if (selected?.kind !== 'app') {
					this.localNotice('Select an app before restarting it.')
					return
				}
				this.callbacks.onCommand?.({
					action: 'restart-app',
					app: selected.id,
				})
				break
			}
			case 'a':
				this.callbacks.onCommand?.({ action: 'restart-all' })
				break
			case 's':
				this.callbacks.onCommand?.({ action: 'supabase-start' })
				break
			case 't':
				this.callbacks.onCommand?.({ action: 'supabase-stop' })
				break
			case 'm':
				this.callbacks.onCommand?.({ action: 'supabase-migrate' })
				break
			case 'x':
				if (layout.columns < 36 || layout.availableBodyHeight < 8) {
					this.localNotice('Enlarge the terminal to reset safely.')
					return
				}
				this.state.confirmationError = null
				this.state.confirmationText = ''
				this.state.modal = 'reset'
				break
			case 'd':
				this.callbacks.onCommand?.({ action: 'doctor' })
				break
			default:
				return
		}
		this.scheduleRender()
	}

	handleResetKey(key) {
		if (key.name === 'escape') {
			this.state.modal = null
			this.state.confirmationText = ''
			this.state.confirmationError = null
			this.scheduleRender()
			return
		}
		if (key.name === 'backspace') {
			this.state.confirmationText = this.state.confirmationText.slice(0, -1)
			this.state.confirmationError = null
			this.scheduleRender()
			return
		}
		if (key.name === 'return' || key.name === 'enter') {
			if (this.state.confirmationText !== RESET_CONFIRMATION) {
				this.state.confirmationError = `Type ${RESET_CONFIRMATION} exactly.`
				this.scheduleRender()
				return
			}
			this.state.modal = null
			this.state.confirmationError = null
			this.state.confirmationText = ''
			this.callbacks.onCommand?.({
				action: 'supabase-reset',
				confirmation: RESET_CONFIRMATION,
			})
			this.scheduleRender()
			return
		}
		if (
			!key.ctrl &&
			!key.meta &&
			key.sequence.length === 1 &&
			key.sequence >= ' ' &&
			this.state.confirmationText.length < RESET_CONFIRMATION.length
		) {
			this.state.confirmationText += key.sequence
			this.state.confirmationError = null
			this.scheduleRender()
		}
	}

	applyStatus(event) {
		const stage = this.state.stages.find((item) => item.label === event.label)
		if (!stage) return
		stage.detail = event.detail ?? ''
		if (event.state === 'OK' || event.state === 'READY') {
			stage.status = 'complete'
			if (event.label === 'Application stack' && event.state === 'READY') {
				for (const service of this.state.services) {
					if (service.kind === 'app') service.status = 'ready'
				}
				this.state.phase = 'dashboard'
			}
		} else {
			stage.status = 'active'
		}
	}

	completeStage(label, status) {
		const stage = this.state.stages.find((item) => item.label === label)
		if (!stage) return
		stage.status = status === 'ready' ? 'complete' : 'warning'
		stage.detail =
			status === 'ready' ? 'all services ready' : 'review service status'
	}

	updateService(id, patch) {
		const service = this.state.services.find((item) => item.id === id)
		if (!service) return
		for (const [key, value] of Object.entries(patch)) {
			if (value !== undefined) service[key] = value
		}
	}

	addLog(source = 'system', level = 'info', message = '') {
		if (!message) return
		this.state.logs.push({
			level,
			message: String(message),
			source: source || 'system',
			time: new Date(),
		})
		if (this.state.logs.length > MAX_LOG_LINES) {
			this.state.logs.splice(0, this.state.logs.length - MAX_LOG_LINES)
		}
	}

	localNotice(message) {
		this.state.toast = message
		this.addLog('system', 'warning', message)
		this.scheduleRender()
	}

	selectedService() {
		return this.state.services[this.state.selectedIndex]
	}

	moveSelection(delta) {
		const count = this.state.services.length
		this.state.selectedIndex =
			(this.state.selectedIndex + delta + count) % count
		if (this.state.logFilter === 'selected') this.state.logOffset = 0
		this.scheduleRender()
	}

	scrollLogs(delta) {
		const selected = this.selectedService()
		const count =
			this.state.logFilter === 'selected' && selected
				? this.state.logs.filter((line) => line.source === selected.id).length
				: this.state.logs.length
		this.state.focus = 'logs'
		this.state.logOffset = Math.max(
			0,
			Math.min(count, this.state.logOffset + delta),
		)
		this.scheduleRender()
	}

	scheduleRender() {
		if (this.destroyed || this.renderPending) return
		this.renderPending = true
		this.renderTimer = setTimeout(() => {
			this.renderPending = false
			this.renderTimer = null
			this.render()
		}, 16)
	}

	render() {
		if (this.destroyed) return
		for (const child of this.renderer.root.getChildren()) {
			this.renderer.root.remove(child)
			child.destroyRecursively()
		}

		const layout = terminalLayout(this.renderer.width, this.renderer.height)
		const shell = new BoxRenderable(this.renderer, {
			backgroundColor: COLORS.background,
			flexDirection: 'column',
			height: '100%',
			id: 'dev-shell',
			padding: layout.padding,
			width: '100%',
		})
		this.renderer.root.add(shell)
		if (layout.micro) {
			this.renderMicro(shell, layout)
			return
		}

		if (this.state.phase === 'startup') this.renderStartup(shell, layout)
		else this.renderDashboard(shell, layout)
	}

	renderMicro(shell, layout) {
		const completed = this.state.stages.filter(
			(stage) => stage.status === 'complete',
		).length
		const status =
			this.state.phase === 'error'
				? 'ERROR'
				: this.state.phase === 'dashboard'
					? 'READY'
					: `${Math.round((completed / this.state.stages.length) * 100)}%`
		addText(this.renderer, shell, {
			content: fitText(`HQ DEV ${status}`, layout.columns),
			fg: this.state.phase === 'error' ? COLORS.danger : COLORS.accent,
		})
		if (layout.rows >= 2) {
			addText(this.renderer, shell, {
				content: fitText(this.state.error ?? 'Q quits', layout.columns),
				fg: COLORS.dim,
			})
		}
	}

	renderStartup(shell, layout) {
		const outer = new BoxRenderable(this.renderer, {
			alignItems: 'center',
			flexGrow: 1,
			justifyContent: 'center',
		})
		shell.add(outer)
		const bordered = layout.columns >= 36 && layout.rows >= 10
		const cardWidth =
			layout.mode === 'tiny'
				? '100%'
				: Math.min(72, Math.max(32, layout.columns - 6))
		const cardHeight =
			layout.mode === 'tiny'
				? '100%'
				: Math.min(19, Math.max(9, layout.rows - 4))
		const card = new BoxRenderable(this.renderer, {
			backgroundColor: COLORS.panel,
			flexDirection: 'column',
			height: cardHeight,
			padding: bordered ? 1 : 0,
			width: cardWidth,
			...(bordered
				? {
						border: true,
						borderColor: COLORS.border,
						borderStyle: 'rounded',
					}
				: {}),
		})
		outer.add(card)
		const innerWidth =
			typeof cardWidth === 'number'
				? Math.max(1, cardWidth - (bordered ? 4 : 0))
				: layout.columns
		addText(this.renderer, card, {
			content: centerText('HYPERQUOTE  /  LOCAL DEVELOPMENT', innerWidth),
			fg: COLORS.accent,
		})
		if (layout.rows >= 8) {
			addText(this.renderer, card, {
				content: centerText(
					'Secure workspace orchestration · qvOS',
					innerWidth,
				),
				fg: COLORS.dim,
			})
		}

		const completed = this.state.stages.filter(
			(stage) => stage.status === 'complete',
		).length
		const progressWidth = Math.max(12, innerWidth - 2)
		addText(this.renderer, card, {
			content: centerText(
				progressBar(completed, this.state.stages.length, progressWidth),
				innerWidth,
			),
			fg: COLORS.accent,
			marginTop: layout.mode === 'tiny' ? 0 : 1,
		})

		const cardRows = typeof cardHeight === 'number' ? cardHeight : layout.rows
		const stageSlots = Math.max(
			0,
			cardRows -
				(bordered ? 4 : 0) -
				1 -
				(layout.rows >= 8 ? 1 : 0) -
				1 -
				(layout.mode === 'tiny' ? 0 : 1),
		)
		const activeIndex = Math.max(
			0,
			this.state.stages.findIndex((stage) => stage.status === 'active'),
		)
		const start = Math.max(
			0,
			Math.min(activeIndex, this.state.stages.length - stageSlots),
		)
		for (const stage of this.state.stages.slice(start, start + stageSlots)) {
			const marker =
				stage.status === 'complete'
					? '✓'
					: stage.status === 'active'
						? SPINNER[this.spinnerIndex]
						: stage.status === 'warning'
							? '!'
							: '·'
			const detail = layout.mode === 'tiny' ? '' : `  ${stage.detail}`
			addText(this.renderer, card, {
				content: fitText(`${marker} ${stage.label}${detail}`, innerWidth),
				fg: stageColor(stage.status),
			})
		}
	}

	renderDashboard(shell, layout) {
		this.renderHeader(shell, layout)
		if (this.state.modal === 'help') this.renderHelp(shell, layout)
		else if (this.state.modal === 'reset') this.renderReset(shell, layout)
		else if (this.state.phase === 'error') this.renderError(shell, layout)
		else this.renderMainPanels(shell, layout)
		this.renderFooter(shell, layout)
	}

	renderHeader(shell, layout) {
		const header = new BoxRenderable(this.renderer, {
			flexDirection: 'column',
			height: layout.headerHeight,
			justifyContent: 'center',
		})
		shell.add(header)
		const operation = this.state.operation
		const operationText = operation
			? `${operation.status === 'running' ? SPINNER[this.spinnerIndex] : operation.status === 'success' ? '✓' : '!'} ${operation.label}`
			: this.state.toast || 'Local stack'
		addText(this.renderer, header, {
			content: fitColumns(
				layout.mode === 'tiny' ? 'HQ DEV' : 'HYPERQUOTE DEV  ·  qvOS',
				operationText,
				layout.columns - layout.padding * 2,
			),
			fg: operation?.status === 'error' ? COLORS.danger : COLORS.accent,
		})
		if (layout.mode !== 'tiny') {
			addText(this.renderer, header, {
				content: fitText(
					'Local-only controls · production is never targeted',
					layout.columns - layout.padding * 2,
				),
				fg: COLORS.dim,
			})
		}
	}

	renderMainPanels(shell, layout) {
		const body = new BoxRenderable(this.renderer, {
			columnGap: layout.mode === 'wide' ? 1 : 0,
			flexDirection: layout.mode === 'wide' ? 'row' : 'column',
			flexGrow: 1,
			rowGap: layout.panelGap,
		})
		shell.add(body)
		this.renderServices(body, layout)
		if (layout.logHeight > 0) this.renderLogs(body, layout)
	}

	renderServices(parent, layout) {
		const width = layout.mode === 'wide' ? 38 : '100%'
		const bordered = layout.mode !== 'tiny' && layout.serviceHeight >= 3
		const panel = new BoxRenderable(this.renderer, {
			backgroundColor: COLORS.panel,
			flexDirection: 'column',
			height: layout.serviceHeight,
			paddingX: layout.mode === 'tiny' ? 0 : 1,
			width,
			...(bordered
				? {
						border: true,
						borderColor:
							this.state.focus === 'services' ? COLORS.accent : COLORS.border,
						borderStyle: 'rounded',
						title: ' Services ',
					}
				: {}),
		})
		parent.add(panel)
		const innerWidth =
			layout.mode === 'wide'
				? 34
				: Math.max(1, layout.columns - layout.padding * 2 - (bordered ? 4 : 0))
		const slots = Math.max(
			1,
			layout.serviceHeight - (layout.mode === 'tiny' ? 0 : 2),
		)
		const start = Math.max(
			0,
			Math.min(this.state.selectedIndex, this.state.services.length - slots),
		)
		for (const [offset, service] of this.state.services
			.slice(start, start + slots)
			.entries()) {
			const selected = start + offset === this.state.selectedIndex
			addText(this.renderer, panel, {
				content: formatServiceLine(service, selected, innerWidth),
				fg: selected ? COLORS.text : serviceColor(service.status),
			})
		}
	}

	renderLogs(parent, layout) {
		const selected = this.selectedService()
		const filterLabel =
			this.state.logFilter === 'selected' && selected
				? selected.label
				: 'All services'
		const bordered = layout.mode !== 'tiny' && layout.logHeight >= 3
		const panel = new BoxRenderable(this.renderer, {
			backgroundColor: COLORS.panel,
			flexDirection: 'column',
			flexGrow: layout.mode === 'wide' ? 1 : 0,
			height: layout.logHeight,
			paddingX: layout.mode === 'tiny' ? 0 : 1,
			...(bordered
				? {
						border: true,
						borderColor:
							this.state.focus === 'logs' ? COLORS.accent : COLORS.border,
						borderStyle: 'rounded',
						title: ` Logs · ${filterLabel} `,
					}
				: {}),
		})
		parent.add(panel)
		const count = Math.max(
			1,
			layout.logHeight - (layout.mode === 'tiny' ? 0 : 2),
		)
		const lines = visibleLogLines(this.state, count)
		const innerWidth = Math.max(
			1,
			(layout.mode === 'wide'
				? layout.columns - 43
				: layout.columns - layout.padding * 2) -
				(layout.mode === 'tiny' ? 0 : 2),
		)
		const content =
			lines.length === 0
				? 'Waiting for service output…'
				: lines
						.map((line) => formatLogLine(line, innerWidth, layout.mode))
						.join('\n')
		addText(this.renderer, panel, {
			content,
			fg: lines.some((line) => line.level === 'error')
				? COLORS.text
				: COLORS.dim,
			height: '100%',
			wrapMode: 'none',
		})
	}

	renderHelp(shell, layout) {
		const lines = [
			'↑/↓ or J/K   Select service / scroll focused logs',
			'Enter        Open selected service URL',
			'Tab / L      Switch focus to logs',
			'F            Filter logs by selected service',
			'R / A        Restart selected app / all apps',
			'S / T        Start / stop local Supabase',
			'M            Apply pending local migrations',
			'X            Reset local database with confirmation',
			'D            Run local service doctor',
			'C            Clear captured logs',
			'? / Esc      Close help',
			'Q / Ctrl+C   Stop app servers and exit',
		]
		this.renderCenteredPanel(shell, layout, ' Keyboard controls ', lines)
	}

	renderReset(shell, layout) {
		const visibleInput = this.state.confirmationText.padEnd(
			RESET_CONFIRMATION.length,
			'·',
		)
		const lines = [
			'LOCAL ONLY · recreates Postgres.',
			'Unsaved local data/schema is lost.',
			`Type ${RESET_CONFIRMATION}, then Enter:`,
			`> ${visibleInput}`,
			this.state.confirmationError ?? '',
			'Esc cancels · never production.',
		]
		this.renderCenteredPanel(
			shell,
			layout,
			' Reset local database ',
			lines,
			true,
		)
	}

	renderError(shell, layout) {
		this.renderCenteredPanel(shell, layout, ' Launcher error ', [
			this.state.error ?? 'The local launcher stopped unexpectedly.',
			'',
			'Review the captured logs, then press Q to exit.',
		])
	}

	renderCenteredPanel(shell, layout, title, lines, danger = false) {
		const outer = new BoxRenderable(this.renderer, {
			alignItems: 'center',
			flexGrow: 1,
			justifyContent: 'center',
		})
		shell.add(outer)
		const panelWidth =
			layout.mode === 'tiny'
				? '100%'
				: Math.min(76, Math.max(34, layout.columns - 8))
		const bordered = layout.mode !== 'tiny'
		const panel = new BoxRenderable(this.renderer, {
			backgroundColor: COLORS.panel,
			flexDirection: 'column',
			height:
				layout.mode === 'tiny'
					? '100%'
					: Math.min(layout.availableBodyHeight, lines.length + 4),
			padding: layout.mode === 'tiny' ? 0 : 1,
			width: panelWidth,
			...(bordered
				? {
						border: true,
						borderColor: danger ? COLORS.danger : COLORS.accent,
						borderStyle: 'rounded',
						title,
					}
				: {}),
		})
		outer.add(panel)
		const width =
			typeof panelWidth === 'number'
				? panelWidth - (layout.mode === 'tiny' ? 0 : 4)
				: layout.columns
		const slots = Math.max(1, layout.availableBodyHeight - 2)
		for (const line of lines.slice(0, slots)) {
			addText(this.renderer, panel, {
				content: fitText(line, width),
				fg:
					danger &&
					(line.startsWith('>') || line === this.state.confirmationError)
						? COLORS.danger
						: line.includes('Production')
							? COLORS.success
							: COLORS.text,
			})
		}
	}

	renderFooter(shell, layout) {
		const footer = new BoxRenderable(this.renderer, {
			height: layout.footerHeight,
			justifyContent: 'center',
		})
		shell.add(footer)
		const shortcuts =
			layout.mode === 'wide'
				? '↑↓ select  Enter open  L logs  R restart  A all  S/T backend  M migrate  X reset  ? help  Q quit'
				: layout.mode === 'compact'
					? '↑↓ select · Enter open · L logs · R restart · S/T DB · X reset · ? help · Q quit'
					: '? help · q quit'
		addText(this.renderer, footer, {
			content: centerText(
				fitText(shortcuts, layout.columns - layout.padding * 2),
				layout.columns - layout.padding * 2,
			),
			fg: COLORS.dim,
		})
	}

	destroy() {
		if (this.destroyed) return
		this.destroyed = true
		clearInterval(this.animationTimer)
		if (this.renderTimer) clearTimeout(this.renderTimer)
		this.renderer.keyInput.off('keypress', this.onKeyPress)
		this.renderer.off(CliRenderEvents.RESIZE, this.onResize)
	}
}

function addText(renderer, parent, options) {
	const text = new TextRenderable(renderer, {
		height: options.height ?? 1,
		selectable: false,
		truncate: true,
		width: '100%',
		...options,
	})
	parent.add(text)
	return text
}

function formatServiceLine(service, selected, width) {
	const marker = selected ? '›' : ' '
	const statusMarker =
		{
			disabled: '–',
			error: '×',
			pending: '·',
			ready: '●',
			starting: '◌',
			stopped: '○',
			stopping: '◌',
		}[service.status] ?? '·'
	const status = String(service.status ?? 'pending')
		.toUpperCase()
		.padEnd(8)
	return fitText(
		`${marker} ${service.label.padEnd(10)} ${statusMarker} ${status}`,
		width,
	)
}

function formatLogLine(line, width, mode) {
	const timestamp = line.time instanceof Date ? line.time : new Date(line.time)
	const time = timestamp.toLocaleTimeString('en-GB', { hour12: false })
	const source = String(line.source).slice(0, 8).padEnd(8)
	const prefix = mode === 'tiny' ? `${source} ` : `${time} ${source} `
	return fitText(`${prefix}${line.message}`, width)
}

function fitColumns(left, right, width) {
	if (width <= 1) return fitText(left, width)
	const safeLeft = fitText(left, Math.max(1, Math.floor(width * 0.55)))
	const availableRight = Math.max(0, width - safeLeft.length - 1)
	if (availableRight < 4) return fitText(safeLeft, width)
	const safeRight = fitText(right, availableRight)
	return `${safeLeft}${' '.repeat(Math.max(1, width - safeLeft.length - safeRight.length))}${safeRight}`
}

function fitText(value, width) {
	const text = String(value ?? '')
	const safeWidth = Math.max(0, Math.floor(width))
	if (text.length <= safeWidth) return text
	if (safeWidth <= 1) return text.slice(0, safeWidth)
	return `${text.slice(0, safeWidth - 1)}…`
}

function centerText(value, width) {
	const text = fitText(value, width)
	return `${' '.repeat(Math.max(0, Math.floor((width - text.length) / 2)))}${text}`
}

function stageColor(status) {
	if (status === 'complete') return COLORS.success
	if (status === 'active') return COLORS.accent
	if (status === 'warning') return COLORS.warning
	return COLORS.dim
}

function serviceColor(status) {
	if (status === 'ready') return COLORS.success
	if (status === 'starting' || status === 'stopping') return COLORS.accent
	if (status === 'error') return COLORS.danger
	if (status === 'stopped') return COLORS.warning
	return COLORS.dim
}
