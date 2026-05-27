import {
	useDocumentScrollLock,
	useVisualViewportKeyboard,
} from '@hyperquote/ui/viewport/keyboard'
import { ChevronLeft } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
	type CSSProperties,
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useAdminStore } from '../../stores/admin'
import { useSupportStore } from '../../stores/customer-service'
import { useDispatchStore } from '../../stores/dispatch'
import { useFinanceStore } from '../../stores/finance'
import { useProcurementStore } from '../../stores/procurement'
import { useSalesStore } from '../../stores/sales'
import { useSearchStore } from '../../stores/search'
import { useWarehouseStore } from '../../stores/warehouse'

/**
 * Context holding:
 *   1. The DOM node every SlidePanel portals into so panels layer on top
 *      of *everything* below the WindowHeader — tab strips, toolbars,
 *      shortcut rails, etc. Without the portal, a panel rendered from a
 *      view deep inside a tab would be clipped by its wrapping container.
 *   2. A closer registry so clicking outside any panel dismisses *every*
 *      currently-open panel in the same host (e.g. if the global AI chat
 *      and a contextual right panel are both open, one backdrop click
 *      closes both).
 */
interface PanelHostContextValue {
	host: HTMLElement | null
	registerClose: (key: string, fn: () => void) => void
	unregisterClose: (key: string) => void
	closeAll: () => void
}

const noop = () => {}
const PanelHostContext = createContext<PanelHostContextValue>({
	host: null,
	registerClose: noop,
	unregisterClose: noop,
	closeAll: noop,
})

export function PanelHostProvider({
	host,
	children,
}: {
	host: HTMLElement | null
	children: ReactNode
}) {
	// Use a ref so the register/unregister/closeAll identities stay stable;
	// we don't want SlidePanels to re-run effects every time another panel
	// opens or closes.
	const closersRef = useRef<Map<string, () => void>>(new Map())

	const value = useMemo<PanelHostContextValue>(
		() => ({
			host,
			registerClose: (key, fn) => {
				closersRef.current.set(key, fn)
			},
			unregisterClose: (key) => {
				closersRef.current.delete(key)
			},
			closeAll: () => {
				// Snapshot so mutations during close (unregister cascading) don't
				// interfere with iteration.
				const closers = Array.from(closersRef.current.values())
				for (const fn of closers) fn()
			},
		}),
		[host],
	)

	return (
		<PanelHostContext.Provider value={value}>
			{children}
		</PanelHostContext.Provider>
	)
}

/**
 * SlidePanel — the single definition for every slide-in side panel in the
 * internal app. Any new panel (current or future) drops its content inside
 * this component and automatically inherits:
 *
 *   • Spring slide-in from the trailing edge, spring slide-out
 *   • Transparent click-outside backdrop (no dimming, no blur)
 *   • Escape-key dismissal
 *   • Visible mobile back control, plus backdrop/Escape dismissal
 *   • Opaque surface background (no bleed-through)
 *   • Shared border, shadow, and positioning
 *   • Optional registration with the module's overlay-close handler so the
 *     outer panel X closes the side panel first instead of the whole module.
 *
 * If the design language ever shifts — wider default, different spring,
 * edge behavior, whatever — changing it here updates every panel at once.
 */

type SlidePanelScope =
	| 'sales'
	| 'procurement'
	| 'finance'
	| 'warehouse'
	| 'dispatch'
	| 'customer-service'
	| 'admin'
	| 'search'
type SlidePanelSide = 'start' | 'end'
type SlidePanelStyle = CSSProperties & {
	'--slide-panel-max-width': string
	'--color-surface'?: string
	'--color-text'?: string
	'--color-text-muted'?: string
	'--color-text-subtle'?: string
	'--color-border'?: string
	'--color-primary'?: string
}

interface SlidePanelProps {
	isOpen: boolean
	onClose: () => void
	/** Max width in pixels. Defaults to 560. */
	maxWidth?: number
	/** Accessible label for the dialog. */
	ariaLabel?: string
	/**
	 * Which module's overlay close handler to register with. When set, the
	 * outer panel X (WindowHeader close) will dismiss this panel first
	 * instead of closing the whole module. Pass the module that OWNS this
	 * panel — e.g. sales panels pass 'sales'.
	 */
	scope?: SlidePanelScope
	/**
	 * Which edge the panel slides in from. 'end' (default) = trailing edge,
	 * where all contextual side panels live. 'start' = leading edge, used
	 * for shell-level global panels like the AI chat.
	 */
	side?: SlidePanelSide
	/**
	 * Distinct key so AnimatePresence treats content swaps as the same
	 * panel instance (prevents re-mount churn when switching between
	 * drill-down states inside one panel).
	 */
	panelKey?: string
	mobileTitle?: ReactNode
	mobileSubtitle?: ReactNode
	mobileAction?: ReactNode
	keyboardAware?: boolean
	tone?: 'default' | 'dark'
	children: ReactNode
}

export function SlidePanel({
	isOpen,
	onClose,
	maxWidth = 560,
	ariaLabel = 'Side panel',
	scope,
	side = 'end',
	panelKey = 'slide-panel',
	mobileTitle,
	mobileSubtitle,
	mobileAction,
	keyboardAware = false,
	tone = 'default',
	children,
}: SlidePanelProps) {
	const { host, registerClose, unregisterClose, closeAll } =
		useContext(PanelHostContext)

	// Which direction the panel slides in from. RTL-safe via logical props
	// (start/end), which the runtime resolves to left/right based on dir.
	// For the animation we use raw x and flip the sign when side==='start'.
	const enterOffset = side === 'start' ? '-100%' : '100%'
	const edgeClass =
		side === 'start'
			? 'start-0 end-0 md:end-auto md:border-e'
			: 'start-0 end-0 md:start-auto md:border-s'
	const shadowClass =
		side === 'start' ? 'slide-drawer-start' : 'slide-drawer-end'
	const isDark = tone === 'dark'
	const keyboard = useVisualViewportKeyboard({
		enabled: keyboardAware && isOpen,
	})
	useDocumentScrollLock(keyboardAware && isOpen)
	const panelStyle: SlidePanelStyle = {
		'--slide-panel-max-width': `${maxWidth}px`,
		...(keyboard.isOpen
			? {
					bottom: 'auto',
					height: `${keyboard.height}px`,
					top: `${keyboard.offsetTop}px`,
				}
			: {}),
		...(isDark
			? {
					'--color-surface': '#070707',
					'--color-text': 'rgba(250,250,250,0.92)',
					'--color-text-muted': 'rgba(250,250,250,0.58)',
					'--color-text-subtle': 'rgba(250,250,250,0.34)',
					'--color-border': 'rgba(255,255,255,0.1)',
					'--color-primary': '#a9b8cc',
					boxShadow:
						side === 'start'
							? '24px 0 80px -28px rgba(0,0,0,0.96), inset -1px 0 0 rgba(255,255,255,0.045)'
							: '-24px 0 80px -28px rgba(0,0,0,0.96), inset 1px 0 0 rgba(255,255,255,0.045)',
				}
			: {}),
	}
	const panelShellClass = isDark
		? `slide-panel-shell fixed inset-0 ${edgeClass} ${shadowClass} z-30 flex w-full max-w-none flex-col rounded-none border-white/[0.075] bg-[#050505] text-white md:absolute md:inset-y-0 md:max-w-[var(--slide-panel-max-width)]`
		: `slide-panel-shell fixed inset-0 ${edgeClass} ${shadowClass} z-30 flex w-full max-w-none flex-col rounded-none border-black/[0.08] bg-[var(--color-surface)] dark:border-white/[0.08] md:absolute md:inset-y-0 md:max-w-[var(--slide-panel-max-width)]`
	const mobileBarClass = isDark
		? 'slide-panel-mobile-bar flex h-12 shrink-0 items-center gap-2 border-b border-white/[0.075] bg-[#050505] px-2 md:hidden'
		: 'slide-panel-mobile-bar flex h-12 shrink-0 items-center gap-2 border-b border-black/[0.06] px-2 dark:border-white/[0.08] md:hidden'
	const mobileBackClass = isDark
		? 'flex h-9 w-9 items-center justify-center text-white/42 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25'
		: 'flex h-9 w-9 items-center justify-center text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35'

	// SSR / pre-mount guard: if the panel host isn't available yet, render
	// nothing on the first paint and catch up once it mounts.
	const [hostReady, setHostReady] = useState(false)
	useEffect(() => {
		setHostReady(host !== null)
	}, [host])

	// Register this panel's closer with the host so a backdrop click can
	// dismiss every currently-open panel in one go. Only register while
	// open — that way closeAll() only calls panels that are actually visible.
	useEffect(() => {
		if (!isOpen) return
		registerClose(panelKey, onClose)
		return () => unregisterClose(panelKey)
	}, [isOpen, panelKey, onClose, registerClose, unregisterClose])
	// Register with the owning module store so the panel X dismisses this
	// overlay before dismissing the whole module. We rely on only one slide
	// panel being open per module at a time — the app enforces that.
	const setSalesHandler = useSalesStore((s) => s.setOverlayCloseHandler)
	const setProcurementHandler = useProcurementStore(
		(s) => s.setOverlayCloseHandler,
	)
	const setFinanceHandler = useFinanceStore((s) => s.setOverlayCloseHandler)
	const setWarehouseHandler = useWarehouseStore((s) => s.setOverlayCloseHandler)
	const setDispatchHandler = useDispatchStore((s) => s.setOverlayCloseHandler)
	const setSupportHandler = useSupportStore((s) => s.setOverlayCloseHandler)
	const setAdminHandler = useAdminStore((s) => s.setOverlayCloseHandler)
	const setSearchHandler = useSearchStore((s) => s.setOverlayCloseHandler)

	useEffect(() => {
		if (!scope) return
		const setter =
			scope === 'sales'
				? setSalesHandler
				: scope === 'procurement'
					? setProcurementHandler
					: scope === 'finance'
						? setFinanceHandler
						: scope === 'warehouse'
							? setWarehouseHandler
							: scope === 'dispatch'
								? setDispatchHandler
								: scope === 'customer-service'
									? setSupportHandler
									: scope === 'admin'
										? setAdminHandler
										: setSearchHandler
		if (!isOpen) {
			// When this panel closes, drop any handler *it* registered. If another
			// panel in the same module is open, its own effect will have already
			// overwritten the slot, so this is a no-op in that case.
			return
		}
		setter(() => {
			onClose()
			return true
		})
		return () => setter(null)
	}, [
		isOpen,
		scope,
		onClose,
		setSalesHandler,
		setProcurementHandler,
		setFinanceHandler,
		setWarehouseHandler,
		setDispatchHandler,
		setSupportHandler,
		setAdminHandler,
		setSearchHandler,
	])

	// Escape dismisses whichever panel is currently open.
	useEffect(() => {
		if (!isOpen) return
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				onClose()
			}
		}
		document.addEventListener('keydown', handler)
		return () => document.removeEventListener('keydown', handler)
	}, [isOpen, onClose])

	const panel = (
		<AnimatePresence>
			{isOpen && (
				<>
					{/* Transparent click-outside backdrop — no dim, no blur, just a
              full-bleed surface that swallows clicks and closes the panel. */}
					<motion.button
						key={`${panelKey}-backdrop`}
						type="button"
						aria-label="Close panel"
						onClick={closeAll}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="slide-panel-backdrop fixed inset-0 z-20 cursor-default bg-transparent md:absolute"
					/>

					<motion.div
						key={panelKey}
						role="dialog"
						aria-label={ariaLabel}
						initial={{ x: enterOffset }}
						animate={{ x: 0 }}
						exit={{ x: enterOffset }}
						transition={{ type: 'spring', stiffness: 300, damping: 34 }}
						className={panelShellClass}
						style={panelStyle}
					>
						<div className={mobileBarClass}>
							<button
								type="button"
								onClick={onClose}
								aria-label="Back from side panel"
								className={mobileBackClass}
							>
								<ChevronLeft
									aria-hidden="true"
									size={19}
									strokeWidth={1.9}
									className="rtl:rotate-180"
								/>
							</button>
							{mobileTitle && (
								<div className="min-w-0 flex-1">
									<div className="truncate font-[family-name:var(--font-archivo)] text-[13px] font-semibold text-[var(--color-text)]">
										{mobileTitle}
									</div>
									{mobileSubtitle && (
										<div className="mt-0.5 truncate font-[family-name:var(--font-archivo)] text-[10px] italic text-[var(--color-text-subtle)]">
											{mobileSubtitle}
										</div>
									)}
								</div>
							)}
							{mobileAction && (
								<div className="flex shrink-0 items-center">{mobileAction}</div>
							)}
						</div>
						<div className="min-h-0 flex-1">{children}</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	)

	// Portal into the shell-provided host so the panel covers the full
	// module body (under the header, above tab strips / toolbars / content).
	// If no host is provided (rare — outside ModuleWindow), render inline.
	if (hostReady && host) {
		return createPortal(panel, host)
	}
	return panel
}
