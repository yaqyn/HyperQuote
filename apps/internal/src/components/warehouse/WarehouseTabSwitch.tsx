import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import {
	getReceivingQueue,
	getWarehouseQueue,
} from '../../lib/server/warehouse'
import { useWarehouseStore, type WarehouseTab } from '../../stores/warehouse'

/**
 * Tab switch that lives inside the queue masthead below the stat
 * numbers. Lets the warehouse advisor pivot between outgoing loads
 * and incoming supplier deliveries without leaving the module.
 */
export function WarehouseTabSwitch() {
	const activeTab = useWarehouseStore((s) => s.activeTab)
	const setActiveTab = useWarehouseStore((s) => s.setActiveTab)
	const { data: loadingData } = useQuery({
		queryKey: ['warehouse-queue'],
		queryFn: () => getWarehouseQueue({ data: {} }),
		staleTime: 10_000,
	})
	const { data: receivingData } = useQuery({
		queryKey: ['warehouse-receiving-queue'],
		queryFn: () => getReceivingQueue({ data: {} }),
		staleTime: 10_000,
	})

	return (
		<div className="grid grid-cols-2 gap-2 lg:mt-6">
			<Tab
				id="loading"
				label="Loading"
				sub="Customer orders"
				count={loadingData?.totals.total ?? 0}
				active={activeTab === 'loading'}
				onPress={() => setActiveTab('loading')}
			/>
			<Tab
				id="receiving"
				label="Receiving"
				sub="Supplier deliveries"
				count={receivingData?.totals.total ?? 0}
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
	count,
	active,
	onPress,
}: {
	id: WarehouseTab
	label: string
	sub: string
	count: number
	active: boolean
	onPress: () => void
}) {
	return (
		<motion.button
			type="button"
			onClick={onPress}
			whileTap={{ scale: 0.98 }}
			animate={{
				backgroundColor: active ? 'var(--color-text)' : 'rgba(0,0,0,0)',
				color: active ? '#FFFFFF' : 'var(--color-text)',
			}}
			transition={{ duration: 0.2 }}
			className="border-2 border-[var(--color-text)] px-3 py-2 text-start lg:border-[3px] lg:px-4 lg:py-3"
			style={{ minHeight: '52px' }}
			aria-pressed={active}
			data-tab-id={id}
		>
			<p className="flex min-w-0 items-center justify-between gap-2 font-[family-name:var(--font-geist-mono)] text-[10px] font-bold uppercase leading-none tracking-[0.16em] lg:text-[11px] lg:tracking-[0.22em]">
				<span className="truncate lg:hidden">
					{label} ({count})
				</span>
				<span className="hidden truncate lg:inline">{label}</span>
				<span
					className="hidden rounded-full px-2 py-0.5 text-[9px] tabular-nums tracking-[0.08em] lg:inline-flex"
					style={{
						background: active ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.06)',
					}}
				>
					{count}
				</span>
			</p>
			<p
				className="mt-1 hidden font-[family-name:var(--font-geist-mono)] text-[9px] uppercase tracking-[0.18em] lg:block"
				style={{ opacity: active ? 0.7 : 0.45 }}
			>
				{sub}
			</p>
		</motion.button>
	)
}
