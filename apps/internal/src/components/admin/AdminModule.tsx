import { BookOpen } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAdminStore } from '../../stores/admin'
import { EmployeeActionButton } from '../shared/EmployeeControls'
import { VolumeRail } from './VolumeRail'
import { CustomersVolume } from './volumes/CustomersVolume'
import { DriversVolume } from './volumes/DriversVolume'
import { EmployeesVolume } from './volumes/EmployeesVolume'
import { ProductsVolume } from './volumes/ProductsVolume'
import { SuppliersVolume } from './volumes/SuppliersVolume'

/**
 * The admin module — five editable registry volumes for the internal team.
 * Desktop keeps the volume rail visible; tablet and phone use a full-screen
 * volume menu so the working record always has the available space.
 */
export function AdminModule() {
	const { t } = useTranslation('admin')
	const activeVolume = useAdminStore((s) => s.activeVolume)
	const [volumeListOpen, setVolumeListOpen] = useState(false)

	return (
		<div className="relative flex h-full min-h-0 overflow-hidden bg-dot-grid">
			<div className="hidden lg:flex">
				<VolumeRail />
			</div>
			{volumeListOpen && (
				<div className="absolute inset-0 z-30 flex bg-[var(--color-surface)] lg:hidden">
					<VolumeRail
						onVolumeSelect={() => setVolumeListOpen(false)}
						onClose={() => setVolumeListOpen(false)}
					/>
				</div>
			)}
			{!volumeListOpen && (
				<EmployeeActionButton
					onClick={() => setVolumeListOpen(true)}
					tone="neutral"
					size="sm"
					leading={<BookOpen size={14} strokeWidth={2.2} />}
					className="absolute end-4 top-4 z-20 lg:hidden"
				>
					{t('rail.title')}
				</EmployeeActionButton>
			)}
			<main className="flex min-w-0 flex-1 flex-col overflow-hidden">
				{activeVolume === 'customers' && <CustomersVolume />}
				{activeVolume === 'products' && <ProductsVolume />}
				{activeVolume === 'employees' && <EmployeesVolume />}
				{activeVolume === 'drivers' && <DriversVolume />}
				{activeVolume === 'suppliers' && <SuppliersVolume />}
			</main>
		</div>
	)
}
