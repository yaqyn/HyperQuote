import { describe, it, expect } from 'vitest'
import { DriverSchema } from './powersync'

/** Helper: get table names from schema (tables is an array with .name) */
function getTableNames(): string[] {
  return DriverSchema.tables.map((t: { name: string }) => t.name)
}

/** Helper: get column names from a table by name */
function getColumnNames(tableName: string): string[] {
  const table = DriverSchema.tables.find((t: { name: string }) => t.name === tableName)
  if (!table) throw new Error(`Table "${tableName}" not found in schema`)
  return table.columns.map((c: { name: string }) => c.name)
}

describe('DriverSchema', () => {
  it('has all 8 driver-relevant tables', () => {
    const names = getTableNames()
    expect(names).toHaveLength(8)
    expect(names).toContain('vehicles')
    expect(names).toContain('driver_shifts')
    expect(names).toContain('vehicle_inspections')
    expect(names).toContain('vehicle_inspection_items')
    expect(names).toContain('deliveries')
    expect(names).toContain('delivery_items')
    expect(names).toContain('routes')
    expect(names).toContain('route_stops')
  })

  it('vehicles table has expected columns', () => {
    const cols = getColumnNames('vehicles')
    expect(cols).toContain('plate_number')
    expect(cols).toContain('type')
    expect(cols).toContain('make')
    expect(cols).toContain('model')
    expect(cols).toContain('year')
    expect(cols).toContain('status')
    expect(cols).toContain('capacity_kg')
    expect(cols).toContain('capacity_m3')
    expect(cols).toContain('moffett_equipped')
  })

  it('vehicle_inspection_items has item_order column', () => {
    const cols = getColumnNames('vehicle_inspection_items')
    expect(cols).toContain('item_order')
    expect(cols).toContain('item_name')
    expect(cols).toContain('status')
    expect(cols).toContain('severity')
    expect(cols).toContain('photo_url')
  })

  it('driver_shifts has odometer fields', () => {
    const cols = getColumnNames('driver_shifts')
    expect(cols).toContain('start_odometer')
    expect(cols).toContain('end_odometer')
    expect(cols).toContain('start_location')
    expect(cols).toContain('end_location')
  })

  it('vehicle_inspections has GPS coordinates', () => {
    const cols = getColumnNames('vehicle_inspections')
    expect(cols).toContain('gps_lat')
    expect(cols).toContain('gps_lng')
    expect(cols).toContain('odometer_reading')
    expect(cols).toContain('signature_url')
  })

  it('deliveries has POD fields', () => {
    const cols = getColumnNames('deliveries')
    expect(cols).toContain('pod_signature_url')
    expect(cols).toContain('pod_photos')
    expect(cols).toContain('status')
    expect(cols).toContain('actual_arrival')
    expect(cols).toContain('actual_departure')
  })

  it('routes has distance and weight', () => {
    const cols = getColumnNames('routes')
    expect(cols).toContain('total_distance_km')
    expect(cols).toContain('total_weight_kg')
    expect(cols).toContain('stop_count')
    expect(cols).toContain('estimated_finish')
  })

  it('route_stops has coordinates and ordering', () => {
    const cols = getColumnNames('route_stops')
    expect(cols).toContain('stop_order')
    expect(cols).toContain('lat')
    expect(cols).toContain('lng')
    expect(cols).toContain('customer_name')
    expect(cols).toContain('address')
    expect(cols).toContain('unloading_method')
  })
})
