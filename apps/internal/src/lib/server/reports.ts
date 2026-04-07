import { createServerFn } from '@tanstack/react-start'
import type { ReportsTab, ReportFilter, DashboardData } from '../../types/reports'

// ─── Mock KPI Data per Role ─────────────────────────────

function getSalesData(): DashboardData {
  return {
    kpis: [
      { label: 'Pipeline Value', value: 2_450_000, unit: 'EGP', trend: 12, trendDirection: 'up' },
      { label: 'Conversion Rate', value: 34, unit: '%', trend: 3, trendDirection: 'up' },
      { label: 'Avg Response Time', value: '2.1h', trend: -8, trendDirection: 'down' },
      { label: 'Win Rate', value: 28, unit: '%', trend: 2, trendDirection: 'up' },
      { label: 'Revenue MTD', value: 1_200_000, unit: 'EGP', trend: 15, trendDirection: 'up' },
      { label: 'Revenue Target', value: 1_800_000, unit: 'EGP' },
    ],
    tableData: [
      { id: 1, customer: 'Cairo Construction Co.', deal: 'ORD-4521', value: 450_000, stage: 'Negotiation', rep: 'Ahmed Hassan' },
      { id: 2, customer: 'Delta Building Materials', deal: 'ORD-4523', value: 320_000, stage: 'Quoted', rep: 'Sara Mohamed' },
      { id: 3, customer: 'Nile Development Group', deal: 'ORD-4525', value: 280_000, stage: 'Won', rep: 'Ahmed Hassan' },
      { id: 4, customer: 'Giza Contractors Ltd.', deal: 'ORD-4527', value: 215_000, stage: 'Quoted', rep: 'Khaled Ibrahim' },
      { id: 5, customer: 'Alexandria Steel Works', deal: 'ORD-4529', value: 190_000, stage: 'Negotiation', rep: 'Sara Mohamed' },
      { id: 6, customer: 'Heliopolis Marble', deal: 'ORD-4530', value: 175_000, stage: 'Won', rep: 'Khaled Ibrahim' },
      { id: 7, customer: 'Nasr City Developers', deal: 'ORD-4532', value: 160_000, stage: 'Quoted', rep: 'Ahmed Hassan' },
      { id: 8, customer: 'Maadi Construction Hub', deal: 'ORD-4534', value: 145_000, stage: 'Negotiation', rep: 'Sara Mohamed' },
      { id: 9, customer: 'October Cement Works', deal: 'ORD-4536', value: 130_000, stage: 'Won', rep: 'Khaled Ibrahim' },
      { id: 10, customer: 'Shoubra Hardware', deal: 'ORD-4538', value: 115_000, stage: 'Quoted', rep: 'Ahmed Hassan' },
    ],
  }
}

function getProcurementData(): DashboardData {
  return {
    kpis: [
      { label: 'Pending Inquiries', value: 23, trend: -5, trendDirection: 'down' },
      { label: 'Response Rate', value: 89, unit: '%', trend: 4, trendDirection: 'up' },
      { label: 'PO Pending', value: 12, trend: 2, trendDirection: 'up' },
      { label: 'PO Approved', value: 45, trend: 8, trendDirection: 'up' },
      { label: 'Cost Savings MTD', value: 185_000, unit: 'EGP', trend: 11, trendDirection: 'up' },
    ],
    tableData: [
      { id: 1, supplier: 'Suez Cement Co.', responseRate: 95, avgResponseTime: '1.5h', activePOs: 8, rating: 4.8 },
      { id: 2, supplier: 'Egyptian Steel', responseRate: 91, avgResponseTime: '2.0h', activePOs: 6, rating: 4.6 },
      { id: 3, supplier: 'Arabia Insulation', responseRate: 87, avgResponseTime: '2.5h', activePOs: 4, rating: 4.3 },
      { id: 4, supplier: 'Delta Aggregate', responseRate: 82, avgResponseTime: '3.2h', activePOs: 5, rating: 4.1 },
      { id: 5, supplier: 'Cairo Marble Works', responseRate: 78, avgResponseTime: '4.0h', activePOs: 3, rating: 3.9 },
    ],
  }
}

function getOperationsData(): DashboardData {
  return {
    kpis: [
      { label: 'Orders in Pipeline', value: 87, trend: 5, trendDirection: 'up' },
      { label: 'On-Time Delivery', value: 91, unit: '%', trend: 2, trendDirection: 'up' },
      { label: 'Completion Rate', value: 94, unit: '%', trend: 1, trendDirection: 'up' },
      { label: 'Avg Cycle Time', value: '3.2 days', trend: -4, trendDirection: 'down' },
      { label: 'Resource Utilization', value: 78, unit: '%', trend: 3, trendDirection: 'up' },
    ],
    tableData: [
      { stage: 'Quoting', count: 23, percentage: 26 },
      { stage: 'PO Issued', count: 18, percentage: 21 },
      { stage: 'In Fulfillment', count: 15, percentage: 17 },
      { stage: 'Dispatched', count: 12, percentage: 14 },
      { stage: 'Delivered', count: 11, percentage: 13 },
      { stage: 'Invoiced', count: 8, percentage: 9 },
    ],
  }
}

function getFinanceData(): DashboardData {
  return {
    kpis: [
      { label: 'Revenue MTD', value: 1_200_000, unit: 'EGP', trend: 15, trendDirection: 'up' },
      { label: 'AR Outstanding', value: 3_400_000, unit: 'EGP', trend: 8, trendDirection: 'up' },
      { label: 'Overdue AR', value: 890_000, unit: 'EGP', trend: -3, trendDirection: 'down' },
      { label: 'Cash Position', value: 2_100_000, unit: 'EGP', trend: 5, trendDirection: 'up' },
      { label: 'Margin Trend', value: 22.4, unit: '%', trend: 1.2, trendDirection: 'up' },
    ],
    tableData: [
      { bucket: 'Current', amount: 1_200_000, count: 34 },
      { bucket: '1-30 days', amount: 850_000, count: 21 },
      { bucket: '31-60 days', amount: 460_000, count: 12 },
      { bucket: '61-90 days', amount: 320_000, count: 8 },
      { bucket: '90+ days', amount: 570_000, count: 15 },
    ],
    chartData: [
      { type: 'Wire', count: 45, amount: 2_100_000 },
      { type: 'Cheque', count: 32, amount: 1_800_000 },
      { type: 'Cash', count: 18, amount: 420_000 },
      { type: 'LC', count: 5, amount: 890_000 },
    ],
  }
}

function getWarehouseData(): DashboardData {
  return {
    kpis: [
      { label: 'Inventory Accuracy', value: 97.3, unit: '%', trend: 0.5, trendDirection: 'up' },
      { label: 'Pick Accuracy', value: 99.1, unit: '%', trend: 0.2, trendDirection: 'up' },
      { label: 'On-Time Shipment', value: 93, unit: '%', trend: 3, trendDirection: 'up' },
      { label: 'Receiving Cycle Time', value: '2.4h', trend: -12, trendDirection: 'down' },
      { label: 'Capacity Utilization', value: 72, unit: '%', trend: 4, trendDirection: 'up' },
      { label: 'Slow-Moving Value', value: 340_000, unit: 'EGP', trend: -8, trendDirection: 'down' },
    ],
    tableData: [
      { item: 'Portland Cement CEM I 42.5N', sku: 'CEM-001', qty: 4500, unit: 'bag', turnover: 8.2 },
      { item: 'Steel Rebar 12mm', sku: 'STL-012', qty: 2200, unit: 'ton', turnover: 6.5 },
      { item: 'Marble Slab 60x60', sku: 'MRB-060', qty: 890, unit: 'sqm', turnover: 3.1 },
      { item: 'Ceramic Tile 30x30', sku: 'CER-030', qty: 12000, unit: 'sqm', turnover: 5.8 },
      { item: 'Granite Block Type A', sku: 'GRN-001', qty: 340, unit: 'ton', turnover: 2.4 },
    ],
  }
}

function getDispatchData(): DashboardData {
  return {
    kpis: [
      { label: 'Deliveries Today', value: '8/13', trend: 62, trendDirection: 'up' },
      { label: 'First-Attempt Success', value: 94, unit: '%', trend: 2, trendDirection: 'up' },
      { label: 'Avg Stops/Driver', value: 4.3, trend: 0.5, trendDirection: 'up' },
      { label: 'Route Efficiency', value: 87, unit: '%', trend: 3, trendDirection: 'up' },
      { label: 'Cairo Night Count', value: 3, trend: -1, trendDirection: 'down' },
    ],
    tableData: [
      { driver: 'Ahmed Hassan', vehicle: 'ق ل م 4521', stops: 5, completed: 3, status: 'In Transit' },
      { driver: 'Mohamed Saeed', vehicle: 'ن ر ط 7834', stops: 5, completed: 2, status: 'Loading' },
      { driver: 'Khaled Ibrahim', vehicle: 'ع س د 1290', stops: 3, completed: 0, status: 'Pending' },
    ],
  }
}

function getCSData(): DashboardData {
  return {
    kpis: [
      { label: 'Open Tickets - High', value: 4, trend: -2, trendDirection: 'down' },
      { label: 'Open Tickets - Medium', value: 12, trend: 1, trendDirection: 'up' },
      { label: 'Open Tickets - Low', value: 8, trend: -3, trendDirection: 'down' },
      { label: 'SLA Compliance', value: 92, unit: '%', trend: 4, trendDirection: 'up' },
      { label: 'Avg Resolution Time', value: '4.2h', trend: -15, trendDirection: 'down' },
      { label: 'NPS Score', value: 72, trend: 5, trendDirection: 'up' },
    ],
    tableData: [
      { category: 'Delivery Delays', count: 8, percentage: 28 },
      { category: 'Quality Issues', count: 6, percentage: 21 },
      { category: 'Billing Disputes', count: 5, percentage: 17 },
      { category: 'Order Changes', count: 4, percentage: 14 },
      { category: 'Missing Items', count: 3, percentage: 10 },
      { category: 'Other', count: 3, percentage: 10 },
    ],
  }
}

// ─── Role-Specific Dashboard Resolver ───────────────────

function resolveDashboard(role: ReportsTab): DashboardData {
  switch (role) {
    case 'sales': return getSalesData()
    case 'procurement': return getProcurementData()
    case 'operations': return getOperationsData()
    case 'finance': return getFinanceData()
    case 'warehouse': return getWarehouseData()
    case 'dispatch': return getDispatchData()
    case 'cs': return getCSData()
    default: return getSalesData()
  }
}

// ─── Server Functions ───────────────────────────────────

export const getDashboardData = createServerFn({ method: 'GET' })
  .inputValidator((input: { role: ReportsTab; filters: ReportFilter }) => input)
  .handler(async ({ data }): Promise<DashboardData> => {
    return resolveDashboard(data.role)
  })

export const exportReport = createServerFn({ method: 'POST' })
  .inputValidator((input: { role: ReportsTab; format: 'csv' | 'pdf'; filters: ReportFilter }) => input)
  .handler(async ({ data }): Promise<{ url: string; filename: string }> => {
    // Mock export — returns a placeholder download URL
    const ext = data.format
    const filename = `${data.role}-report-${new Date().toISOString().split('T')[0]}.${ext}`
    return {
      url: `https://cdn.hyperquote.io/reports/${filename}`,
      filename,
    }
  })
