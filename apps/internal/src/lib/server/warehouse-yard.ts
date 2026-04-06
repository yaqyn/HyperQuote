import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type { YardZone, WeatherAlert } from '../../types/warehouse'

// ─── Mock Data ─────────────────────────────────────────────

function getMockYardZones(): YardZone[] {
  return [
    { id: 'yz-001', name: 'Zone A - Steel Storage', capacityPercent: 72, status: 'medium', inventorySummary: 'Rebar, wire mesh, structural steel', lastActivity: '2 hours ago', maxCapacity: 500, currentUsage: 360 },
    { id: 'yz-002', name: 'Zone B - Cement Covered', capacityPercent: 85, status: 'high', inventorySummary: 'Portland cement, masonry cement', lastActivity: '30 minutes ago', maxCapacity: 300, currentUsage: 255 },
    { id: 'yz-003', name: 'Zone C - Aggregate Bins', capacityPercent: 55, status: 'low', inventorySummary: 'Sand, gravel, crushed stone', lastActivity: '1 hour ago', maxCapacity: 1000, currentUsage: 550 },
    { id: 'yz-004', name: 'Zone D - Lumber Yard', capacityPercent: 30, status: 'low', inventorySummary: 'Dimensional lumber, plywood, OSB', lastActivity: '4 hours ago', maxCapacity: 200, currentUsage: 60 },
    { id: 'yz-005', name: 'Zone E - Pipe Rack', capacityPercent: 95, status: 'high', inventorySummary: 'PVC, copper, steel pipe', lastActivity: '15 minutes ago', maxCapacity: 150, currentUsage: 142 },
    { id: 'yz-006', name: 'Zone F - Loading Dock', capacityPercent: 40, status: 'low', inventorySummary: 'Staged outbound shipments', lastActivity: '45 minutes ago', maxCapacity: 50, currentUsage: 20 },
    { id: 'yz-007', name: 'Zone G - Returns Area', capacityPercent: 65, status: 'medium', inventorySummary: 'Returned materials pending inspection', lastActivity: '3 hours ago', maxCapacity: 80, currentUsage: 52 },
    { id: 'yz-008', name: 'Zone H - Hazmat/Chemical', capacityPercent: 20, status: 'low', inventorySummary: 'Adhesives, sealants, coatings', lastActivity: '6 hours ago', maxCapacity: 100, currentUsage: 20 },
  ]
}

function getMockWeatherAlerts(): WeatherAlert[] {
  return [
    {
      id: 'wa-001',
      type: 'khamsin',
      severity: 'warning',
      windSpeedKmh: 35,
      sheetDeliveryBlocked: true,
      outdoorOpsPaused: false,
      message: 'Khamsin dust storm approaching — wind speeds 35 km/h',
      recommendation: 'Block sheet material deliveries. Cover cement pallets. Prepare tarps for outdoor steel.',
    },
    {
      id: 'wa-002',
      type: 'heat',
      severity: 'warning',
      windSpeedKmh: 8,
      sheetDeliveryBlocked: false,
      outdoorOpsPaused: false,
      message: 'Extreme heat advisory — 42C expected',
      recommendation: 'Mandatory breaks for outdoor workers 12-3 PM. Ensure water stations stocked.',
    },
  ]
}

// ─── Server Functions ──────────────────────────────────────

const getYardZonesInput = z.object({
  warehouseId: z.string().optional(),
})

export const getYardZones = createServerFn({ method: 'GET' })
  .inputValidator(getYardZonesInput)
  .handler(async ({ data: _input }) => {
    return { zones: getMockYardZones() }
  })

const getWeatherAlertsInput = z.object({
  warehouseId: z.string().optional(),
})

export const getWeatherAlerts = createServerFn({ method: 'GET' })
  .inputValidator(getWeatherAlertsInput)
  .handler(async ({ data: _input }) => {
    return { alerts: getMockWeatherAlerts() }
  })
