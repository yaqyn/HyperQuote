import type { LucideIcon } from 'lucide-react'
import {
  Tag,
  ShoppingCart,
  Warehouse,
  Banknote,
  Truck,
  Headset,
} from 'lucide-react'

export interface ModuleConfig {
  id: string
  icon: LucideIcon
  labelKey: string
  hotkey: string
  permission: string
}

export const MODULES: ModuleConfig[] = [
  { id: 'sales', icon: Tag, labelKey: 'modules.sales', hotkey: 'S', permission: 'sales.read' },
  { id: 'procurement', icon: ShoppingCart, labelKey: 'modules.procurement', hotkey: 'P', permission: 'procurement.read' },
  { id: 'warehouse', icon: Warehouse, labelKey: 'modules.warehouse', hotkey: 'W', permission: 'warehouse.read' },
  { id: 'finance', icon: Banknote, labelKey: 'modules.finance', hotkey: 'F', permission: 'finance.read' },
  { id: 'dispatch', icon: Truck, labelKey: 'modules.dispatch', hotkey: 'D', permission: 'dispatch.read' },
  { id: 'customer-service', icon: Headset, labelKey: 'modules.customerService', hotkey: 'C', permission: 'customer_service.read' },
]
