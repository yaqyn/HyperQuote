import type { LucideIcon } from 'lucide-react'
import {
  Tag,
  ShoppingCart,
  ClipboardList,
  Warehouse,
  Banknote,
  Truck,
  Headset,
  Users,
  Settings,
  BarChart3,
  Sparkles,
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
  { id: 'orders', icon: ClipboardList, labelKey: 'modules.orders', hotkey: 'O', permission: 'orders.read' },
  { id: 'warehouse', icon: Warehouse, labelKey: 'modules.warehouse', hotkey: 'W', permission: 'warehouse.read' },
  { id: 'finance', icon: Banknote, labelKey: 'modules.finance', hotkey: 'F', permission: 'finance.read' },
  { id: 'dispatch', icon: Truck, labelKey: 'modules.dispatch', hotkey: 'D', permission: 'dispatch.read' },
  { id: 'customer-service', icon: Headset, labelKey: 'modules.customerService', hotkey: 'C', permission: 'customer_service.read' },
  { id: 'hr', icon: Users, labelKey: 'modules.hr', hotkey: 'H', permission: 'hr.read' },
  { id: 'admin', icon: Settings, labelKey: 'modules.admin', hotkey: 'A', permission: 'admin.read' },
  { id: 'reports', icon: BarChart3, labelKey: 'modules.reports', hotkey: 'R', permission: 'reports.read' },
  { id: 'ai', icon: Sparkles, labelKey: 'modules.ai', hotkey: 'I', permission: 'ai.read' },
]
