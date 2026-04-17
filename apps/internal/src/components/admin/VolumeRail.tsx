import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { useTranslation } from 'react-i18next'
import {
	adminListCustomers,
	adminListEmployees,
	adminListProducts,
	adminListSuppliers,
	adminListTrucks,
} from '../../lib/server/admin'
import { useAdminStore } from '../../stores/admin'
import { VOLUMES, type VolumeId } from '../../types/admin'

/**
 * The rail reads every volume's count so the catalog always shows what
 * you're about to open. Each query hits the same key the volume itself
 * uses, so navigating into a volume is a cache hit, not a refetch.
 */
function useVolumeCounts(): Record<VolumeId, number> {
	const customers = useQuery({
		queryKey: ['admin', 'customers'],
		queryFn: () => adminListCustomers(),
	})
	const products = useQuery({
		queryKey: ['admin', 'products'],
		queryFn: () => adminListProducts(),
	})
	const employees = useQuery({
		queryKey: ['admin', 'employees'],
		queryFn: () => adminListEmployees(),
	})
	const drivers = useQuery({
		queryKey: ['admin', 'drivers'],
		queryFn: () => adminListTrucks(),
	})
	const suppliers = useQuery({
		queryKey: ['admin', 'suppliers'],
		queryFn: () => adminListSuppliers(),
	})

	return {
		customers: customers.data?.length ?? 0,
		products: products.data?.length ?? 0,
		employees: employees.data?.length ?? 0,
		drivers: drivers.data?.length ?? 0,
		suppliers: suppliers.data?.length ?? 0,
	}
}

export function VolumeRail() {
	const { t } = useTranslation('admin')
	const activeVolume = useAdminStore((s) => s.activeVolume)
	const setActiveVolume = useAdminStore((s) => s.setActiveVolume)
	const counts = useVolumeCounts()

	return (
		<nav
			className="w-[260px] shrink-0 border-inline-end border-black/[0.06] dark:border-white/[0.08] flex flex-col min-h-0 overflow-hidden"
			aria-label={t('rail.title')}
		>
			{/* Rail masthead ─────────────────────── */}
			<div className="px-8 pt-10 pb-8 border-b border-black/[0.06] dark:border-white/[0.08]">
				<p className="font-[family-name:var(--font-geist-mono)] text-[10px] uppercase tracking-[0.22em] text-[var(--color-text-subtle)]">
					{t('masthead.eyebrow')}
				</p>
				<p
					className="mt-2 font-[family-name:var(--font-fraunces)] text-[22px] leading-none text-[var(--color-text)]"
					style={{ fontFeatureSettings: '"ss01" on' }}
				>
					{t('rail.title')}
				</p>
			</div>

			{/* Volume list ─────────────────────── */}
			<ol className="flex-1 overflow-y-auto px-4 py-6 space-y-0">
				{VOLUMES.map((v) => {
					const isActive = activeVolume === v.id
					const count = counts[v.id]
					return (
						<li key={v.id}>
							<button
								type="button"
								onClick={() => setActiveVolume(v.id)}
								className={`group relative w-full text-start flex items-baseline gap-4 px-4 py-3 rounded-md outline-none transition-colors
                  ${isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}
                  focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]/40`}
							>
								{/* Active accent bar — layoutId shares the motion across volumes */}
								{isActive && (
									<motion.span
										layoutId="rail-active"
										className="absolute inset-y-2 start-0 w-[2px] rounded-full bg-[var(--color-primary)]"
										transition={{ type: 'spring', stiffness: 280, damping: 26 }}
									/>
								)}

								{/* Roman numeral ─ distinctive display serif */}
								<span
									className={`font-[family-name:var(--font-fraunces)] italic tabular-nums w-8 shrink-0 text-[20px] leading-none
                    ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)] group-hover:text-[var(--color-text-muted)]'}`}
									style={{
										fontFeatureSettings: '"ss01" on',
										fontVariationSettings: '"opsz" 144, "SOFT" 30',
									}}
								>
									{v.roman}.
								</span>

								{/* Title + count */}
								<span className="flex-1 min-w-0 flex items-baseline justify-between gap-3">
									<span className="font-[family-name:var(--font-inter)] text-[14px] font-medium truncate">
										{t(v.labelKey)}
									</span>
									<span className="font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums text-[var(--color-text-subtle)]">
										{String(count).padStart(3, '0')}
									</span>
								</span>
							</button>
						</li>
					)
				})}
			</ol>

			{/* Rail footer ─────────────────────── */}
			<div className="px-8 py-5 border-t border-black/[0.06] dark:border-white/[0.08]">
				<p className="font-[family-name:var(--font-geist-mono)] text-[10px] leading-relaxed text-[var(--color-text-subtle)]">
					{t('masthead.caption')}
				</p>
			</div>
		</nav>
	)
}
