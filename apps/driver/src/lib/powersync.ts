import { PowerSyncDatabase } from '@powersync/capacitor'
import { column, Schema, Table } from '@powersync/web'

const vehicles = new Table({
  plate_number: column.text,
  type: column.text,
  make: column.text,
  model: column.text,
  year: column.text,
  status: column.text,
  capacity_kg: column.text,
  capacity_m3: column.text,
  moffett_equipped: column.text,
})

const driver_shifts = new Table({
  driver_id: column.text,
  vehicle_id: column.text,
  inspection_id: column.text,
  started_at: column.text,
  ended_at: column.text,
  status: column.text,
  start_odometer: column.real,
  end_odometer: column.real,
  start_location: column.text,
  end_location: column.text,
})

const vehicle_inspections = new Table({
  vehicle_id: column.text,
  driver_id: column.text,
  inspection_type: column.text,
  status: column.text,
  odometer_reading: column.real,
  signature_url: column.text,
  gps_lat: column.real,
  gps_lng: column.real,
  notes: column.text,
  created_at: column.text,
})

const vehicle_inspection_items = new Table({
  inspection_id: column.text,
  item_name: column.text,
  item_order: column.integer,
  status: column.text,
  severity: column.text,
  notes: column.text,
  photo_url: column.text,
})

const deliveries = new Table({
  order_id: column.text,
  route_id: column.text,
  driver_id: column.text,
  customer_id: column.text,
  status: column.text,
  scheduled_date: column.text,
  actual_arrival: column.text,
  actual_departure: column.text,
  pod_signature_url: column.text,
  pod_photos: column.text,
  notes: column.text,
})

const delivery_items = new Table({
  delivery_id: column.text,
  product_id: column.text,
  product_name: column.text,
  quantity_expected: column.real,
  quantity_delivered: column.real,
  unit: column.text,
  status: column.text,
  damage_notes: column.text,
  photo_url: column.text,
})

const routes = new Table({
  driver_id: column.text,
  vehicle_id: column.text,
  date: column.text,
  status: column.text,
  total_distance_km: column.real,
  total_weight_kg: column.real,
  estimated_finish: column.text,
  actual_finish: column.text,
  stop_count: column.integer,
})

const route_stops = new Table({
  route_id: column.text,
  delivery_id: column.text,
  stop_order: column.integer,
  customer_name: column.text,
  address: column.text,
  lat: column.real,
  lng: column.real,
  status: column.text,
  eta: column.text,
  notes: column.text,
  unloading_method: column.text,
})

export const DriverSchema = new Schema({
  vehicles,
  driver_shifts,
  vehicle_inspections,
  vehicle_inspection_items,
  deliveries,
  delivery_items,
  routes,
  route_stops,
})

export const db = new PowerSyncDatabase({
  schema: DriverSchema,
  database: { dbFilename: 'hyperquote-driver.db' },
})
