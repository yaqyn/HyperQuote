import { useState } from 'react'
import { Button } from 'react-aria-components'
import { useKeyboardScope } from '../../hooks/useKeyboardScope'
import { useShortcut } from '../../hooks/useShortcut'
import { useInternalStore } from '../../stores/internal'
import { useSalesStore } from '../../stores/sales'

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

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
			<div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/90 p-6 shadow-2xl dark:bg-black/90">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-sm font-semibold">Keyboard Shortcuts</h3>
					<Button
						onPress={() => setShowHelp(false)}
						className="rounded-md px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/5"
					>
						Close
					</Button>
				</div>
				<div className="flex flex-col gap-2">
					{[
						{ keys: 'N', action: 'New RFQ / New Quote' },
						{ keys: 'G then I', action: 'Go to RFQ Inbox' },
						{ keys: 'G then B', action: 'Toggle Board/List view' },
						{ keys: 'G then C', action: 'Go to Customer 360' },
						{ keys: '/', action: 'Focus search' },
						{ keys: '?', action: 'Toggle this help' },
					].map((shortcut) => (
						<div
							key={shortcut.keys}
							className="flex items-center justify-between"
						>
							<span className="text-sm text-black/60 dark:text-white/60">
								{shortcut.action}
							</span>
							<kbd className="rounded border border-black/10 bg-black/5 px-2 py-0.5 font-[family-name:var(--font-geist-mono)] text-xs dark:border-white/10 dark:bg-white/5">
								{shortcut.keys}
							</kbd>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
