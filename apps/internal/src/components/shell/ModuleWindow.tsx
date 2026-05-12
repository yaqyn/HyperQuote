import { GlassWindow } from '@hyperquote/ui/glass/GlassWindow'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MODULES } from '../../lib/modules'
import { useAdminStore } from '../../stores/admin'
import { useAIChatStore } from '../../stores/ai-chat'
import { useSupportStore } from '../../stores/customer-service'
import { useDispatchStore } from '../../stores/dispatch'
import { useFinanceStore } from '../../stores/finance'
import { useInternalStore } from '../../stores/internal'
import { keyboardScopeStore } from '../../stores/keyboard-scope'
import { useProcurementStore } from '../../stores/procurement'
import { useSalesStore } from '../../stores/sales'
import { useWarehouseStore } from '../../stores/warehouse'
import { AIChatPanel } from '../shared/AIChatPanel'
import { PanelHostProvider } from '../shared/SlidePanel'
import { WindowHeader } from './WindowHeader'

const MODULE_COMPONENTS: Record<
	string,
	React.LazyExoticComponent<React.ComponentType>
> = {
	sales: lazy(() =>
		import('../sales/SalesModule').then((m) => ({ default: m.SalesModule })),
	),
	procurement: lazy(() =>
		import('../procurement/ProcurementModule').then((m) => ({
			default: m.ProcurementModule,
		})),
	),
	warehouse: lazy(() =>
		import('../warehouse/WarehouseModule').then((m) => ({
			default: m.WarehouseModule,
		})),
	),
	finance: lazy(() =>
		import('../finance/FinanceModule').then((m) => ({
			default: m.FinanceModule,
		})),
	),
	dispatch: lazy(() =>
		import('../dispatch/DispatchModule').then((m) => ({
			default: m.DispatchModule,
		})),
	),
	'customer-service': lazy(() =>
		import('../customer-service/SupportModule').then((m) => ({
			default: m.CustomerServiceModule,
		})),
	),
	admin: lazy(() =>
		import('../admin/AdminModule').then((m) => ({ default: m.AdminModule })),
	),
}

interface ModuleWindowProps {
	moduleId: string
	isOpen: boolean
	onClose: () => void
}

export function ModuleWindow({ moduleId, isOpen, onClose }: ModuleWindowProps) {
	const { t } = useTranslation('internal')
	const contentRef = useRef<HTMLDivElement>(null)
	const [panelHost, setPanelHost] = useState<HTMLElement | null>(null)
	const getWindowState = useInternalStore((s) => s.getWindowState)
	const saveWindowState = useInternalStore((s) => s.saveWindowState)
	const toggleAIChat = useAIChatStore((s) => s.toggle)

	const mod = MODULES.find((m) => m.id === moduleId)
	const ModuleComponent = MODULE_COMPONENTS[moduleId]

	// Manage keyboard scope
	useEffect(() => {
		if (isOpen) {
			keyboardScopeStore.send({ type: 'openPanel' })
		}
		return () => {
			if (isOpen) {
				keyboardScopeStore.send({ type: 'closePanel' })
			}
		}
	}, [isOpen])

	// Global AI chat toggle — ⌘K / Ctrl+K while any module is open.
	useEffect(() => {
		if (!isOpen) return
		const handler = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
				e.preventDefault()
				toggleAIChat()
			}
		}
		document.addEventListener('keydown', handler)
		return () => document.removeEventListener('keydown', handler)
	}, [isOpen, toggleAIChat])

	// Restore scroll position on mount
	useEffect(() => {
		if (isOpen && contentRef.current) {
			const saved = getWindowState(moduleId)
			if (saved?.scrollTop) {
				contentRef.current.scrollTop = saved.scrollTop
			}
		}
	}, [isOpen, moduleId, getWindowState])

	function handleClose() {
		// Lyon is a global leading-edge panel. If it's open, the module X
		// dismisses Lyon first; a second click then continues down the normal
		// module / contextual-panel close ladder.
		const aiChat = useAIChatStore.getState()
		if (aiChat.isOpen) {
			aiChat.close()
			return
		}

		// In the sales module, the close button walks down a dismissal ladder:
		//   1. If the quote builder has a slide-in overlay (map / line margin)
		//      open, close that first. Prevents the accidental "clicked map X,
		//      lost my whole quote" mistake.
		//   2. If the quote builder itself is open, close it.
		//   3. Otherwise, close the panel.
		if (moduleId === 'sales') {
			const sales = useSalesStore.getState()
			if (sales.overlayCloseHandler?.()) {
				return
			}
			// New quote in progress → discard it first, keep module open
			if (sales.newQuoteCustomer) {
				sales.closeQuoteBuilder()
				return
			}
		}

		// Same pattern for procurement — clicking X while a refill / product
		// detail / supplier profile panel is open should dismiss that panel
		// first, not the whole module.
		if (moduleId === 'procurement') {
			const procurement = useProcurementStore.getState()
			if (procurement.overlayCloseHandler?.()) {
				return
			}
		}
		if (moduleId === 'finance') {
			const finance = useFinanceStore.getState()
			if (finance.overlayCloseHandler?.()) {
				return
			}
		}
		if (moduleId === 'warehouse') {
			const warehouse = useWarehouseStore.getState()
			if (warehouse.overlayCloseHandler?.()) {
				return
			}
		}
		if (moduleId === 'dispatch') {
			const dispatch = useDispatchStore.getState()
			if (dispatch.overlayCloseHandler?.()) {
				return
			}
		}
		if (moduleId === 'customer-service') {
			const support = useSupportStore.getState()
			if (support.overlayCloseHandler?.()) {
				return
			}
		}
		if (moduleId === 'admin') {
			const admin = useAdminStore.getState()
			if (admin.overlayCloseHandler?.()) {
				return
			}
		}
		if (contentRef.current) {
			saveWindowState(moduleId, { scrollTop: contentRef.current.scrollTop })
		}
		// The AI chat is global, but its visibility shouldn't leak across
		// module sessions — closing the shell resets it so the next module
		// opens with the chat dismissed.
		useAIChatStore.getState().close()
		onClose()
	}

	return (
		<GlassWindow
			isOpen={isOpen}
			onClose={handleClose}
			closeOnBackdropClick={false}
			className="shell-plate"
		>
			{/* Header — pinned at top, never scrolls */}
			<WindowHeader moduleId={moduleId} onClose={handleClose} />

			{/* Body — relative + ref-captured so every SlidePanel in the module
          can portal into this container and cover the whole body (below
          the WindowHeader, above any tab strips, toolbars, or content). */}
			<div
				ref={(node) => setPanelHost(node)}
				className="relative flex-1 min-h-0 overflow-hidden"
			>
				<PanelHostProvider host={panelHost}>
					{/* Scrollable content area — takes remaining height */}
					<div
						ref={contentRef}
						data-module-content
						className="h-full overflow-y-auto overflow-x-hidden"
					>
						{ModuleComponent ? (
							<Suspense fallback={<ModuleLoader />}>
								<ModuleComponent />
							</Suspense>
						) : (
							<div className="flex flex-col items-center justify-center h-full gap-3 p-6">
								{mod && (
									<mod.icon
										size={48}
										className="text-[var(--color-text-muted)]"
									/>
								)}
								<p className="text-[var(--color-text-muted)] text-sm">
									{t('window.comingSoon')}
								</p>
							</div>
						)}
					</div>

					{/* Global AI chat — slides in from the leading edge via the same
              portal, same rules as every contextual side panel. */}
					<AIChatPanel />
				</PanelHostProvider>
			</div>
		</GlassWindow>
	)
}

function ModuleLoader() {
	return (
		<div className="flex items-center justify-center h-full min-h-[200px]">
			<div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
		</div>
	)
}
