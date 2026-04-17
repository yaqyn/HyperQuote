import { createFileRoute, useRouter } from '@tanstack/react-router'
import { CustomerDetail } from '../../../components/detail/CustomerDetail'
import { DeliveryDetail } from '../../../components/detail/DeliveryDetail'
import { EmployeeDetail } from '../../../components/detail/EmployeeDetail'
import { InvoiceDetail } from '../../../components/detail/InvoiceDetail'
import { OrderDetail } from '../../../components/detail/OrderDetail'
import { ProductDetail } from '../../../components/detail/ProductDetail'
import { SupplierDetail } from '../../../components/detail/SupplierDetail'
import { getEntityDetail } from '../../../lib/server/entity'
import type {
	CEOOrder,
	Customer,
	Delivery,
	Employee,
	EntityType,
	Invoice,
	Product,
	Supplier,
} from '../../../types/entity'

export const Route = createFileRoute('/_ceo/entity/$type/$id')({
	loader: async ({ params }) => {
		const entity = await getEntityDetail({
			data: {
				entityType: params.type as EntityType,
				entityId: params.id,
			},
		})
		return { entity, entityType: params.type as EntityType }
	},
	component: EntityDetailPage,
})

function EntityDetailPage() {
	const { entity, entityType } = Route.useLoaderData()
	const router = useRouter()

	function handleBack() {
		router.history.back()
	}

	switch (entityType) {
		case 'employee':
			return <EmployeeDetail data={entity as Employee} onBack={handleBack} />
		case 'customer':
			return <CustomerDetail data={entity as Customer} onBack={handleBack} />
		case 'order':
			return <OrderDetail data={entity as CEOOrder} onBack={handleBack} />
		case 'invoice':
			return <InvoiceDetail data={entity as Invoice} onBack={handleBack} />
		case 'supplier':
			return <SupplierDetail data={entity as Supplier} onBack={handleBack} />
		case 'delivery':
			return <DeliveryDetail data={entity as Delivery} onBack={handleBack} />
		case 'product':
			return <ProductDetail data={entity as Product} onBack={handleBack} />
		default:
			return (
				<div className="flex h-full items-center justify-center">
					<p className="text-[var(--color-text-muted)]">Unknown entity type</p>
				</div>
			)
	}
}
