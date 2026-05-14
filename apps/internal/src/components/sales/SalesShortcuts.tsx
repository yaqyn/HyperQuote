import { useState } from 'react'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useShortcut } from '../../hooks/useShortcut'
import { useInternalStore } from '../../stores/internal'
import { useSalesStore } from '../../stores/sales'
import {
	DispatchAction,
	DispatchBody,
	DispatchDialog,
	DispatchFooter,
} from '../shared/DispatchDialog'

/**
 * Sales-specific keyboard shortcuts (CONTEXT.md Section 1.10).
 * Only active when sales module is open.
 *
 * N        - New RFQ / New Quote
 * G then I - Go to RFQ Inbox
 * G then B - Toggle Board/List view
 * G then C - Go to Customer 360
 * /        - Focus search within Sales
 * ?        - Show shortcuts help
 */
export function SalesShortcuts() {
	const { scope } = useKeyboardScope()
	const activeModule = useInternalStore((s) => s.activeModule)
	const setActiveTab = useSalesStore((s) => s.setActiveTab)
	const [showHelp, setShowHelp] = useState(false)
	const [gPrefix, setGPrefix] = useState(false)

	const isActive = activeModule === 'sales' && scope === 'panel'

	// N - New RFQ / New Quote (navigate to RFQ inbox)
	useShortcut(
		'n',
		() => {
			if (gPrefix) {
				setGPrefix(false)
				return
			}
			setActiveTab('rfq-inbox')
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

	// G then I - Go to RFQ Inbox
	useShortcut(
		'i',
		() => {
			if (gPrefix) {
				setActiveTab('rfq-inbox')
				setGPrefix(false)
			}
		},
		{ enabled: isActive && gPrefix },
	)

	// G then B - Toggle Board/List view in RFQ inbox
	useShortcut(
		'b',
		() => {
			if (gPrefix) {
				const store = useSalesStore.getState()
				store.setRfqViewMode(store.rfqViewMode === 'list' ? 'board' : 'list')
				setActiveTab('rfq-inbox')
				setGPrefix(false)
			}
		},
		{ enabled: isActive && gPrefix },
	)

	// G then C - Go to Customers
	useShortcut(
		'c',
		() => {
			if (gPrefix) {
				setActiveTab('customers')
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
		{ keys: 'N', action: 'New RFQ / New Quote' },
		{ keys: 'G then I', action: 'Go to RFQ Inbox' },
		{ keys: 'G then B', action: 'Toggle Board/List view' },
		{ keys: 'G then C', action: 'Go to Customer 360' },
		{ keys: '/', action: 'Focus search' },
		{ keys: '?', action: 'Toggle this help' },
	]

	return (
		<DispatchDialog
			isOpen={showHelp}
			onClose={() => setShowHelp(false)}
			size="sm"
			eyebrow="Sales"
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
						<kbd className="rounded border border-black/[0.08] bg-black/[0.03] px-2 py-1 font-[family-name:var(--font-geist-mono)] text-[11px] tabular-nums dark:border-white/[0.1] dark:bg-white/[0.04]">
							{shortcut.keys}
						</kbd>
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
