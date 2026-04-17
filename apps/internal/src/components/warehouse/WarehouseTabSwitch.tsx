import { motion } from 'motion/react'
import { useWarehouseStore, type WarehouseTab } from '../../stores/warehouse'

/**
 * Tab switch that lives inside the queue masthead below the stat
 * numbers. Lets the warehouse advisor pivot between outgoing loads
 * and incoming supplier deliveries without leaving the module.
 */
export function WarehouseTabSwitch() {
	const activeTab = useWarehouseStore((s) => s.activeTab)
	const setActiveTab = useWarehouseStore((s) => s.setActiveTab)

	return (
		<div className="mt-6 grid grid-cols-2 gap-2">
			<Tab
				id="loading"
				label="Loading · Outgoing"
				sub="Customer orders"
				active={activeTab === 'loading'}
				onPress={() => setActiveTab('loading')}
			/>
			<Tab
				id="receiving"
				label="Receiving · Incoming"
				sub="Supplier deliveries"
				active={activeTab === 'receiving'}
				onPress={() => setActiveTab('receiving')}
			/>
		</div>
	)
}

function Tab({
	id,
	label,
	sub,
	active,
	onPress,
}: {
	id: WarehouseTab
	label: string
	sub: string
	active: boolean
	onPress: () => void
}) {
	return (
		<motion.button
			type="button"
			onClick={onPress}
			whileTap={{ scale: 0.98 }}
			animate={{
				backgroundColor: active ? '#0A0A0A' : 'rgba(0,0,0,0)',
				color: active ? '#F4F4EC' : '#0A0A0A',
			}}
			transition={{ duration: 0.2 }}
			className="border-[3px] border-[#0A0A0A] px-4 py-3 text-start"
			style={{ minHeight: '64px' }}
			aria-pressed={active}
			data-tab-id={id}
		>
			<p className="font-[family-name:var(--font-geist-mono)] text-[11px] font-bold uppercase tracking-[0.22em] leading-none">
				{label}
			</p>
			<p
				className="mt-1 font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.18em]"
				style={{ opacity: active ? 0.7 : 0.45 }}
			>
				{sub}
			</p>
		</motion.button>
	)
}
