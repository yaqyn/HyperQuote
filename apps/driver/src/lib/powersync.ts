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
  contact_phone: column.text,
  delivery_window_start: column.text,
  delivery_window_end: column.text,
  ppe_required: column.text,
  access_instructions: column.text,
  previous_delivery_notes: column.text,
  site_photos: column.text,
})

const load_verifications = new Table({
  route_id: column.text,
  vehicle_id: column.text,
  verified_by: column.text,
  scan_results: column.text,
  total_items_expected: column.integer,
  total_items_scanned: column.integer,
  weight_expected_kg: column.real,
  weight_actual_kg: column.real,
  weight_variance_percent: column.real,
  truck_photo_uri: column.text,
  cargo_photo_uri: column.text,
  driver_signature_url: column.text,
  gate_clearance: column.text,
  created_at: column.text,
})

const proof_of_delivery = new Table({
  delivery_id: column.text,
  signer_name: column.text,
  signer_role: column.text,
  signature_url: column.text,
  photos: column.text,
  gps_lat: column.real,
  gps_lng: column.real,
  gps_accuracy_meters: column.real,
  condition_notes: column.text,
  condition_status: column.text,
  offline_captured: column.text,
  captured_at: column.text,
  created_at: column.text,
})

const upload_queue = new Table({
  file_uri: column.text,
  upload_type: column.text,
  entity_id: column.text,
  status: column.text,
  retry_count: column.integer,
  uploaded_at: column.text,
  created_at: column.text,
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
  load_verifications,
  proof_of_delivery,
  upload_queue,
})

export const db = new PowerSyncDatabase({
  schema: DriverSchema,
  database: { dbFilename: 'hyperquote-driver.db' },
})
