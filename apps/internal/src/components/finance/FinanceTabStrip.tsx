import { type FinanceTab, useFinanceStore } from '../../stores/finance'
import { ModuleTabStrip } from '../shell/ModuleTabStrip'

const TABS: { id: FinanceTab; label: string }[] = [
	{ id: 'deals-orders', label: 'Deals & Orders' },
	{ id: 'history', label: 'History' },
]

export function FinanceTabStrip() {
	const activeTab = useFinanceStore((s) => s.activeTab)
	const setActiveTab = useFinanceStore((s) => s.setActiveTab)

	return (
		<ModuleTabStrip
			tabs={TABS}
			activeTab={activeTab}
			onTabChange={(id) => setActiveTab(id as FinanceTab)}
			ariaLabel="Finance"
		/>
	)
}
