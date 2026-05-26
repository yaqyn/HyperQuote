import { useState } from 'react'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useShortcut } from '../../hooks/useShortcut'
import { useInternalStore } from '../../stores/internal'
import { useProcurementStore } from '../../stores/procurement'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../shared/DispatchDialog'

/**
 * Procurement-specific keyboard shortcuts (CONTEXT.md Section 2.7).
 * Only active when procurement module is open.
 *
 * G then S - Go to Stock
 * G then P - Go to Prices
 * G then O - Go to Orders
 * G then D - Go to Damaged
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

	// G then S - Go to Stock
	useShortcut(
		's',
		() => {
			if (gPrefix) {
				setActiveTab('stock')
				setGPrefix(false)
			}
		},
		{ enabled: isActive && gPrefix },
	)

	// G then P - Go to Prices
	useShortcut(
		'p',
		() => {
			if (gPrefix) {
				setActiveTab('procurement')
				setGPrefix(false)
			}
		},
		{ enabled: isActive && gPrefix },
	)

	// G then O - Go to Orders
	useShortcut(
		'o',
		() => {
			if (gPrefix) {
				setActiveTab('orders')
				setGPrefix(false)
			}
		},
		{ enabled: isActive && gPrefix },
	)

	// G then D - Go to Damaged
	useShortcut(
		'd',
		() => {
			if (gPrefix) {
				setActiveTab('damaged')
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
		{ keys: 'G S', action: 'Go to Stock' },
		{ keys: 'G P', action: 'Go to Prices' },
		{ keys: 'G O', action: 'Go to Orders' },
		{ keys: 'G D', action: 'Go to Damaged' },
		{ keys: '/', action: 'Focus search' },
		{ keys: '?', action: 'Toggle this help' },
	]

	return (
		<DispatchDialog
			isOpen={showHelp}
			onClose={() => setShowHelp(false)}
			size="sm"
			eyebrow="Inventory"
			title="Shortcuts"
		>
			<DispatchBody className="space-y-2">
				{shortcuts.map((shortcut) => (
					<div
						key={shortcut.keys}
						className="flex items-center justify-between gap-4 rounded-md px-1 py-1.5"
					>
						<span className="text-[13px] text-[var(--color-text-muted)]">
							{shortcut.action}
						</span>
						<div className="flex items-center gap-1">
							{shortcut.keys.split(' ').map((k) => (
								<kbd
									key={k}
									className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-black/[0.08] bg-black/[0.03] px-1.5 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums dark:border-white/[0.1] dark:bg-white/[0.04]"
								>
									{k}
								</kbd>
							))}
						</div>
					</div>
				))}
			</DispatchBody>
			<DispatchFooter>
				<DispatchAction tone="ghost" onPress={() => setShowHelp(false)}>
					Close
				</DispatchAction>
			</DispatchFooter>
		</DispatchDialog>
	)
}
