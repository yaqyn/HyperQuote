import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useShortcut } from '../../hooks/useShortcut'
import { useInternalStore } from '../../stores/internal'
import { useProcurementStore } from '../../stores/procurement'

/**
 * Procurement-specific keyboard shortcuts (CONTEXT.md Section 2.7).
 * Only active when procurement module is open.
 *
 * N        - New Supplier Inquiry
 * G then I - Go to Inquiries
 * G then P - Go to PO List
 * G then S - Go to Supplier Directory
 * /        - Focus search within Procurement
 * ?        - Show shortcuts help
 */
export function ProcurementShortcuts() {
	const { scope } = useKeyboardScope()
	const activeModule = useInternalStore((s) => s.activeModule)
	const setActiveTab = useProcurementStore((s) => s.setActiveTab)
	const [showHelp, setShowHelp] = useState(false)
	const [gPrefix, setGPrefix] = useState(false)

	const isActive = activeModule === 'procurement' && scope === 'panel'

	// N - New Supplier Inquiry (navigate to sourcing tab)
	useShortcut(
		'n',
		() => {
			if (gPrefix) {
				setGPrefix(false)
				return
			}
			setActiveTab('sourcing')
		},
		{ enabled: isActive },
	)

	// G prefix - start sequence
	useShortcut(
		'g',
		() => {
			setGPrefix(true)
			// Auto-clear after 1 second if no follow-up
			setTimeout(() => setGPrefix(false), 1000)
		},
		{ enabled: isActive && !gPrefix },
	)

	// G then I - Go to Sourcing
	useShortcut(
		'i',
		() => {
			if (gPrefix) {
				setActiveTab('sourcing')
				setGPrefix(false)
			}
		},
		{ enabled: isActive && gPrefix },
	)

	// G then P - Go to PO List
	useShortcut(
		'p',
		() => {
			if (gPrefix) {
				setActiveTab('po-management')
				setGPrefix(false)
			}
		},
		{ enabled: isActive && gPrefix },
	)

	// G then S - Go to Supplier Directory
	useShortcut(
		's',
		() => {
			if (gPrefix) {
				setActiveTab('suppliers')
				setGPrefix(false)
			}
		},
		{ enabled: isActive && gPrefix },
	)

	// / - Focus search
	useShortcut(
		'/',
		() => {
			if (gPrefix) {
				setGPrefix(false)
				return
			}
			const searchInput = document.querySelector<HTMLInputElement>(
				'input[type="text"][placeholder*="earch"], input[type="search"]',
			)
			searchInput?.focus()
		},
		{ enabled: isActive },
	)

	// ? - Show shortcuts help
	useShortcut(
		'?',
		() => {
			if (gPrefix) {
				setGPrefix(false)
				return
			}
			setShowHelp((prev) => !prev)
		},
		{ enabled: isActive },
	)

	if (!showHelp) return null

	const shortcuts = [
		{ keys: 'N', action: 'New Supplier Inquiry' },
		{ keys: 'G I', action: 'Go to Sourcing' },
		{ keys: 'G P', action: 'Go to PO Management' },
		{ keys: 'G S', action: 'Go to Supplier Directory' },
		{ keys: '/', action: 'Focus search' },
		{ keys: '?', action: 'Toggle this help' },
	]

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/90 p-6 shadow-2xl dark:bg-black/90">
				<div className="mb-5 flex items-center justify-between">
					<h3 className="text-[13px] font-semibold tracking-tight">
						Keyboard Shortcuts
					</h3>
					<Button
						onPress={() => setShowHelp(false)}
						className="rounded-md px-2 py-1 text-xs text-[var(--color-text-muted)] outline-none transition-colors
              data-[hovered]:bg-black/[0.04] dark:data-[hovered]:bg-white/[0.04]
              data-[focus-visible]:ring-2 data-[focus-visible]:ring-[var(--color-primary)]/40"
					>
						Close
					</Button>
				</div>
				<div className="flex flex-col gap-2.5">
					{shortcuts.map((shortcut) => (
						<div
							key={shortcut.keys}
							className="flex items-center justify-between"
						>
							<span className="text-[13px] text-[var(--color-text-muted)]">
								{shortcut.action}
							</span>
							<div className="flex items-center gap-1">
								{shortcut.keys.split(' ').map((k) => (
									<kbd
										key={k}
										className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-black/[0.08] bg-black/[0.03] px-1.5 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums dark:border-white/[0.08] dark:bg-white/[0.03]"
									>
										{k}
									</kbd>
								))}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
