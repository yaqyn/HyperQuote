import type { ParseKeys } from 'i18next'
import type { LucideIcon } from 'lucide-react'
import {
	Archive,
	Banknote,
	Headset,
	Search,
	ShoppingCart,
	Tag,
	Truck,
	Warehouse,
} from 'lucide-react'

type InternalKey = ParseKeys<'internal'>

interface ModuleConfig {
	id: string
	icon: LucideIcon
	labelKey: InternalKey
	hotkey: string
	permission: string
}

export const MODULES: ModuleConfig[] = [
	{
		id: 'sales',
		icon: Tag,
		labelKey: 'modules.sales',
		hotkey: 'S',
		permission: 'sales.read',
	},
	{
		id: 'procurement',
		icon: ShoppingCart,
		labelKey: 'modules.procurement',
		hotkey: 'P',
		permission: 'procurement.read',
	},
	{
		id: 'warehouse',
		icon: Warehouse,
		labelKey: 'modules.warehouse',
		hotkey: 'W',
		permission: 'warehouse.read',
	},
	{
		id: 'finance',
		icon: Banknote,
		labelKey: 'modules.finance',
		hotkey: 'F',
		permission: 'finance.read',
	},
	{
		id: 'dispatch',
		icon: Truck,
		labelKey: 'modules.dispatch',
		hotkey: 'D',
		permission: 'dispatch.read',
	},
	{
		id: 'customer-service',
		icon: Headset,
		labelKey: 'modules.customerService',
		hotkey: 'C',
		permission: 'customer_service.read',
	},
	{
		id: 'admin',
		icon: Archive,
		labelKey: 'modules.admin',
		hotkey: 'A',
		permission: 'admin.read',
	},
	{
		id: 'search',
		icon: Search,
		labelKey: 'modules.search',
		hotkey: '/',
		permission: 'executive.search',
	},
]
