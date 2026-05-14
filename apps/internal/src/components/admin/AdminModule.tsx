import { useState } from 'react'
import { useAdminStore } from '../../stores/admin'
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
	const activeVolume = useAdminStore((s) => s.activeVolume)
	const [volumeListOpen, setVolumeListOpen] = useState(false)
	const openVolumes = () => setVolumeListOpen(true)

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
			<main className="flex min-w-0 flex-1 flex-col overflow-hidden">
				{activeVolume === 'customers' && (
					<CustomersVolume onOpenVolumes={openVolumes} />
				)}
				{activeVolume === 'products' && (
					<ProductsVolume onOpenVolumes={openVolumes} />
				)}
				{activeVolume === 'employees' && (
					<EmployeesVolume onOpenVolumes={openVolumes} />
				)}
				{activeVolume === 'drivers' && (
					<DriversVolume onOpenVolumes={openVolumes} />
				)}
				{activeVolume === 'suppliers' && (
					<SuppliersVolume onOpenVolumes={openVolumes} />
				)}
			</main>
		</div>
	)
}
