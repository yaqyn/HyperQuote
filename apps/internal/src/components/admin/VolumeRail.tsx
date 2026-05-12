import { useQuery } from '@tanstack/react-query'
import { BookOpen, CheckCircle2, X } from 'lucide-react'
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
import {
	EmployeeActionButton,
	EmployeeStatusPill,
} from '../shared/EmployeeControls'

interface VolumeCountState {
	count: number | null
	isLoading: boolean
	isError: boolean
}

function useVolumeCounts(): Record<VolumeId, VolumeCountState> {
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
		customers: {
			count: customers.data?.length ?? null,
			isLoading: customers.isPending,
			isError: customers.isError,
		},
		products: {
			count: products.data?.length ?? null,
			isLoading: products.isPending,
			isError: products.isError,
		},
		employees: {
			count: employees.data?.length ?? null,
			isLoading: employees.isPending,
			isError: employees.isError,
		},
		drivers: {
			count: drivers.data?.length ?? null,
			isLoading: drivers.isPending,
			isError: drivers.isError,
		},
		suppliers: {
			count: suppliers.data?.length ?? null,
			isLoading: suppliers.isPending,
			isError: suppliers.isError,
		},
	}
}

export function VolumeRail({
	onVolumeSelect,
	onClose,
}: {
	onVolumeSelect?: () => void
	onClose?: () => void
}) {
	const { t } = useTranslation('admin')
	const activeVolume = useAdminStore((s) => s.activeVolume)
	const setActiveVolume = useAdminStore((s) => s.setActiveVolume)
	const counts = useVolumeCounts()

	return (
		<nav
			className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-black/[0.06] bg-[var(--color-surface)] dark:border-white/[0.08] lg:w-[260px] lg:border-inline-end"
			aria-label={t('rail.title')}
		>
			{/* Rail masthead ─────────────────────── */}
			<div className="border-b border-black/[0.06] px-5 py-5 dark:border-white/[0.08] sm:px-8 lg:px-5">
				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<p className="font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
							{t('masthead.eyebrow')}
						</p>
						<p className="mt-2 break-words font-[family-name:var(--font-bricolage)] text-[24px] font-semibold leading-none text-[var(--color-text)]">
							{t('rail.title')}
						</p>
					</div>
					{onClose && (
						<EmployeeActionButton
							onClick={onClose}
							tone="neutral"
							size="sm"
							leading={<X size={14} strokeWidth={2.2} />}
							className="lg:hidden"
						>
							{t('actions.close')}
						</EmployeeActionButton>
					)}
				</div>
				<div className="mt-4">
					<EmployeeStatusPill
						tone="success"
						leading={<CheckCircle2 size={13} strokeWidth={2.2} />}
					>
						{t('rail.status')}
					</EmployeeStatusPill>
				</div>
			</div>

			{/* Volume list ─────────────────────── */}
			<ol className="flex-1 space-y-0 overflow-y-auto px-3 py-5 sm:px-4 sm:py-6">
				{VOLUMES.map((v) => {
					const isActive = activeVolume === v.id
					const countState = counts[v.id]
					const countLabel = countState.isError
						? t('rail.countError')
						: countState.isLoading
							? t('rail.countLoading')
							: String(countState.count ?? 0).padStart(3, '0')
					const countAriaLabel = countState.isError
						? t('rail.countErrorLabel')
						: countState.isLoading
							? t('rail.countLoadingLabel')
							: t('rail.entryCount', { count: countState.count ?? 0 })
					return (
						<li key={v.id}>
							<button
								type="button"
								onClick={() => {
									setActiveVolume(v.id)
									onVolumeSelect?.()
								}}
								className={`group relative flex min-h-14 w-full items-center gap-3 rounded-md px-3 py-3 text-start outline-none transition-colors
                  ${isActive ? 'bg-[var(--color-primary)]/[0.07] text-[var(--color-text)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-primary)]/[0.04] hover:text-[var(--color-text)]'}
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

								<span
									className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md font-[family-name:var(--font-geist-mono)] text-[12px] font-semibold tabular-nums
                    ${isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)] group-hover:text-[var(--color-text-muted)]'}`}
								>
									{v.roman}
								</span>

								{/* Title + count */}
								<span className="flex-1 min-w-0 flex items-baseline justify-between gap-3">
									<span className="min-w-0 break-words font-[family-name:var(--font-archivo)] text-[14px] font-semibold">
										{t(v.labelKey)}
									</span>
									<span
										className={`shrink-0 rounded-full px-2 py-1 font-[family-name:var(--font-geist-mono)] text-[10px] tabular-nums ${
											countState.isError
												? 'bg-red-600/[0.08] text-red-700 dark:text-red-300'
												: 'bg-black/[0.05] text-[var(--color-text-muted)] dark:bg-white/[0.07]'
										}`}
									>
										<span aria-hidden="true">{countLabel}</span>
										<span className="sr-only">{countAriaLabel}</span>
									</span>
								</span>
							</button>
						</li>
					)
				})}
			</ol>

			{/* Rail footer ─────────────────────── */}
			<div className="border-t border-black/[0.06] px-5 py-5 dark:border-white/[0.08] sm:px-8">
				<p className="font-[family-name:var(--font-archivo)] text-[12px] leading-relaxed text-[var(--color-text-muted)]">
					<BookOpen
						aria-hidden="true"
						size={14}
						strokeWidth={2.2}
						className="me-2 inline text-[var(--color-primary)]"
					/>
					{t('masthead.caption')}
				</p>
			</div>
		</nav>
	)
}
