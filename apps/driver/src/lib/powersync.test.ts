import { describe, it, expect } from 'vitest'
import { DriverSchema } from './powersync'

describe('DriverSchema', () => {
  const tableNames = Object.keys(DriverSchema.tables)

  it('has all 8 driver-relevant tables', () => {
    expect(tableNames).toHaveLength(8)
    expect(tableNames).toContain('vehicles')
    expect(tableNames).toContain('driver_shifts')
    expect(tableNames).toContain('vehicle_inspections')
    expect(tableNames).toContain('vehicle_inspection_items')
    expect(tableNames).toContain('deliveries')
    expect(tableNames).toContain('delivery_items')
    expect(tableNames).toContain('routes')
    expect(tableNames).toContain('route_stops')
  })

  it('vehicles table has expected columns', () => {
    const vehicleCols = Object.keys(DriverSchema.tables.vehicles.columns)
    expect(vehicleCols).toContain('plate_number')
    expect(vehicleCols).toContain('type')
    expect(vehicleCols).toContain('make')
    expect(vehicleCols).toContain('model')
    expect(vehicleCols).toContain('year')
    expect(vehicleCols).toContain('status')
    expect(vehicleCols).toContain('capacity_kg')
    expect(vehicleCols).toContain('capacity_m3')
    expect(vehicleCols).toContain('moffett_equipped')
  })

  it('vehicle_inspection_items has item_order column', () => {
    const cols = Object.keys(DriverSchema.tables.vehicle_inspection_items.columns)
    expect(cols).toContain('item_order')
    expect(cols).toContain('item_name')
    expect(cols).toContain('status')
    expect(cols).toContain('severity')
    expect(cols).toContain('photo_url')
  })

  it('driver_shifts has odometer fields', () => {
    const cols = Object.keys(DriverSchema.tables.driver_shifts.columns)
    expect(cols).toContain('start_odometer')
    expect(cols).toContain('end_odometer')
    expect(cols).toContain('start_location')
    expect(cols).toContain('end_location')
  })

  it('vehicle_inspections has GPS coordinates', () => {
    const cols = Object.keys(DriverSchema.tables.vehicle_inspections.columns)
    expect(cols).toContain('gps_lat')
    expect(cols).toContain('gps_lng')
    expect(cols).toContain('odometer_reading')
    expect(cols).toContain('signature_url')
  })

  it('deliveries has POD fields', () => {
    const cols = Object.keys(DriverSchema.tables.deliveries.columns)
    expect(cols).toContain('pod_signature_url')
    expect(cols).toContain('pod_photos')
    expect(cols).toContain('status')
    expect(cols).toContain('actual_arrival')
    expect(cols).toContain('actual_departure')
  })

  it('routes has distance and weight', () => {
    const cols = Object.keys(DriverSchema.tables.routes.columns)
    expect(cols).toContain('total_distance_km')
    expect(cols).toContain('total_weight_kg')
    expect(cols).toContain('stop_count')
    expect(cols).toContain('estimated_finish')
  })

  it('route_stops has coordinates and ordering', () => {
    const cols = Object.keys(DriverSchema.tables.route_stops.columns)
    expect(cols).toContain('stop_order')
    expect(cols).toContain('lat')
    expect(cols).toContain('lng')
    expect(cols).toContain('customer_name')
    expect(cols).toContain('address')
    expect(cols).toContain('unloading_method')
  })
})
