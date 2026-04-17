import { useAdminStore } from '../../stores/admin'
import { VolumeRail } from './VolumeRail'
import { CustomersVolume } from './volumes/CustomersVolume'
import { DriversVolume } from './volumes/DriversVolume'
import { EmployeesVolume } from './volumes/EmployeesVolume'
import { ProductsVolume } from './volumes/ProductsVolume'
import { SuppliersVolume } from './volumes/SuppliersVolume'

/**
 * The admin module — "The Registry".
 *
 * A dev-facing console that treats the data layer as an archival
 * catalog: five volumes, each a direct CRUD window on one table. The
 * rail on the leading edge indexes volumes; the main area is the
 * open book.
 */
export function AdminModule() {
	const activeVolume = useAdminStore((s) => s.activeVolume)

	return (
		<div className="flex h-full min-h-0 overflow-hidden bg-dot-grid">
			<VolumeRail />
			<main className="flex-1 min-w-0 flex flex-col overflow-hidden">
				{activeVolume === 'customers' && <CustomersVolume />}
				{activeVolume === 'products' && <ProductsVolume />}
				{activeVolume === 'employees' && <EmployeesVolume />}
				{activeVolume === 'drivers' && <DriversVolume />}
				{activeVolume === 'suppliers' && <SuppliersVolume />}
			</main>
		</div>
	)
}
