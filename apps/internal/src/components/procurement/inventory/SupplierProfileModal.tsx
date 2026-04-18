import { DispatchDialog } from '../../shared/DispatchDialog'
import { SupplierProfileView } from './SupplierProfileView'

interface SupplierProfileModalProps {
	name: string | null
	onClose: () => void
}

/**
 * Standalone modal wrapper around SupplierProfileView. Reuses the
 * shared DispatchDialog frame so suppliers sit in the same dispatch
 * aesthetic as every other modal in the app.
 */
export function SupplierProfileModal({
	name,
	onClose,
}: SupplierProfileModalProps) {
	const isOpen = !!name
	if (!isOpen || !name) return null

	return (
		<DispatchDialog
			isOpen={isOpen}
			onClose={onClose}
			size="lg"
			eyebrow="Compendium · Supplier dossier"
			title={name}
		>
			<div className="flex-1 min-h-0 overflow-y-auto">
				<SupplierProfileView name={name} onBack={onClose} />
			</div>
		</DispatchDialog>
	)
}
