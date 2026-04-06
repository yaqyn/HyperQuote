import { createServerFn } from '@tanstack/react-start'
import type {
  DeliveryRoute,
  Driver,
  DriverPerformance,
  GPSPosition,
  PODRecord,
  Vehicle,
} from '../../types/dispatch'

// ─── Mock Drivers ───────────────────────────────────────

const MOCK_DRIVERS: Driver[] = [
  {
    id: 'drv-001',
    name: 'Ahmed Hassan',
    type: 'INTERNAL',
    phone: '+201012345678',
    vehicleId: 'veh-001',
    licenseExpiry: '2027-06-15',
    medicalExpiry: '2027-03-20',
    certifications: ['moffett', 'hazmat'],
    complianceStatus: 'valid',
    activeRouteId: 'route-001',
    available: false,
  },
  {
    id: 'drv-002',
    name: 'Mohamed Saeed',
    type: 'INTERNAL',
    phone: '+201098765432',
    vehicleId: 'veh-002',
    licenseExpiry: '2026-08-10',
    medicalExpiry: '2026-07-01',
    certifications: ['boom', 'crane'],
    complianceStatus: 'expiring',
    activeRouteId: 'route-002',
    available: false,
  },
  {
    id: 'drv-003',
    name: 'Khaled Ibrahim',
    type: 'CONTRACTED',
    phone: '+201155556666',
    vehicleId: 'veh-003',
    licenseExpiry: '2027-12-01',
    medicalExpiry: '2027-11-15',
    certifications: ['moffett'],
    complianceStatus: 'valid',
    activeRouteId: null,
    available: true,
  },
  {
    id: 'drv-004',
    name: 'Youssef Farid',
    type: 'ON_DEMAND',
    phone: '+201277778888',
    vehicleId: null,
    licenseExpiry: '2026-05-01',
    medicalExpiry: '2026-04-20',
    certifications: [],
    complianceStatus: 'expiring',
    activeRouteId: null,
    available: true,
  },
]

// ─── Mock Vehicles ──────────────────────────────────────

const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'veh-001',
    plateNumber: 'ق ل م 4521',
    type: 'flatbed',
    capacityKg: 12_000,
    hasEquipment: { moffett: true, boom: false, crane: false },
    currentDriverId: 'drv-001',
    status: 'transit',
  },
  {
    id: 'veh-002',
    plateNumber: 'ن ر ط 7834',
    type: 'curtainside',
    capacityKg: 8_000,
    hasEquipment: { moffett: false, boom: true, crane: false },
    currentDriverId: 'drv-002',
    status: 'loading',
  },
  {
    id: 'veh-003',
    plateNumber: 'ع س د 1290',
    type: 'flatbed',
    capacityKg: 15_000,
    hasEquipment: { moffett: true, boom: false, crane: true },
    currentDriverId: 'drv-003',
    status: 'offline',
  },
  {
    id: 'veh-004',
    plateNumber: 'ص ح ف 5567',
    type: 'pickup',
    capacityKg: 3_000,
    hasEquipment: { moffett: false, boom: false, crane: false },
    currentDriverId: null,
    status: 'offline',
  },
]

// ─── Mock Routes ────────────────────────────────────────

const MOCK_ROUTES: DeliveryRoute[] = [
  {
    id: 'route-001',
    driverId: 'drv-001',
    vehicleId: 'veh-001',
    date: new Date().toISOString().split('T')[0]!,
    status: 'in_progress',
    totalWeight: 9_500,
    totalDistance: 42.3,
    estimatedDuration: 195,
    stops: [
      {
        id: 'stop-001',
        deliveryId: 'del-001',
        orderId: 'ORD-4521',
        customerName: 'Cairo Construction Co.',
        address: '15 شارع الجزيرة، المعادي، القاهرة',
        lat: 29.9602,
        lng: 31.2569,
        weight: 3_200,
        equipmentNeeded: 'moffett',
        timeWindow: { start: '08:00', end: '10:00' },
        sequence: 1,
        status: 'delivered',
      },
      {
        id: 'stop-002',
        deliveryId: 'del-002',
        orderId: 'ORD-4523',
        customerName: 'Delta Building Materials',
        address: '28 شارع الميرغني، مصر الجديدة، القاهرة',
        lat: 30.0866,
        lng: 31.3225,
        weight: 2_100,
        equipmentNeeded: 'none',
        timeWindow: { start: '10:30', end: '12:00' },
        sequence: 2,
        status: 'en_route',
      },
      {
        id: 'stop-003',
        deliveryId: 'del-003',
        orderId: 'ORD-4525',
        customerName: 'Nile Development Group',
        address: '45 شارع عباس العقاد، مدينة نصر، القاهرة',
        lat: 30.0511,
        lng: 31.3462,
        weight: 1_800,
        equipmentNeeded: 'none',
        timeWindow: { start: '13:00', end: '15:00' },
        sequence: 3,
        status: 'pending',
      },
      {
        id: 'stop-004',
        deliveryId: 'del-004',
        orderId: 'ORD-4527',
        customerName: 'Giza Contractors Ltd.',
        address: '7 شارع المحور المركزي، السادس من أكتوبر، الجيزة',
        lat: 30.0131,
        lng: 31.0087,
        weight: 1_400,
        equipmentNeeded: 'moffett',
        timeWindow: { start: '15:30', end: '17:00' },
        sequence: 4,
        status: 'pending',
      },
      {
        id: 'stop-005',
        deliveryId: 'del-005',
        orderId: 'ORD-4529',
        customerName: 'Alexandria Steel Works',
        address: '12 شارع فيصل، الهرم، الجيزة',
        lat: 30.0081,
        lng: 31.1936,
        weight: 1_000,
        equipmentNeeded: 'none',
        timeWindow: { start: '17:30', end: '19:00' },
        sequence: 5,
        status: 'pending',
      },
    ],
  },
  {
    id: 'route-002',
    driverId: 'drv-002',
    vehicleId: 'veh-002',
    date: new Date().toISOString().split('T')[0]!,
    status: 'in_progress',
    totalWeight: 7_200,
    totalDistance: 35.8,
    estimatedDuration: 165,
    stops: [
      {
        id: 'stop-006',
        deliveryId: 'del-006',
        orderId: 'ORD-4530',
        customerName: 'Heliopolis Marble & Granite',
        address: '33 شارع الحجاز، مصر الجديدة، القاهرة',
        lat: 30.0870,
        lng: 31.3280,
        weight: 2_500,
        equipmentNeeded: 'boom',
        timeWindow: { start: '08:00', end: '09:30' },
        sequence: 1,
        status: 'delivered',
      },
      {
        id: 'stop-007',
        deliveryId: 'del-007',
        orderId: 'ORD-4532',
        customerName: 'Nasr City Developers',
        address: '18 شارع مصطفى النحاس، مدينة نصر، القاهرة',
        lat: 30.0495,
        lng: 31.3500,
        weight: 1_800,
        equipmentNeeded: 'none',
        timeWindow: { start: '10:00', end: '11:30' },
        sequence: 2,
        status: 'delivered',
      },
      {
        id: 'stop-008',
        deliveryId: 'del-008',
        orderId: 'ORD-4534',
        customerName: 'Maadi Construction Hub',
        address: '52 شارع 9، المعادي الجديدة، القاهرة',
        lat: 29.9530,
        lng: 31.2630,
        weight: 900,
        equipmentNeeded: 'none',
        timeWindow: { start: '12:30', end: '14:00' },
        sequence: 3,
        status: 'en_route',
      },
      {
        id: 'stop-009',
        deliveryId: 'del-009',
        orderId: 'ORD-4536',
        customerName: 'October Cement Works',
        address: '3 المنطقة الصناعية، السادس من أكتوبر، الجيزة',
        lat: 29.9721,
        lng: 30.9450,
        weight: 1_000,
        equipmentNeeded: 'crane',
        timeWindow: { start: '15:00', end: '17:00' },
        sequence: 4,
        status: 'pending',
      },
      {
        id: 'stop-010',
        deliveryId: 'del-010',
        orderId: 'ORD-4538',
        customerName: 'Shoubra El-Kheima Hardware',
        address: '67 شارع شبرا، شبرا الخيمة، القليوبية',
        lat: 30.1270,
        lng: 31.2480,
        weight: 1_000,
        equipmentNeeded: 'none',
        timeWindow: { start: '17:30', end: '19:00' },
        sequence: 5,
        status: 'pending',
      },
    ],
  },
  {
    id: 'route-003',
    driverId: 'drv-003',
    vehicleId: 'veh-003',
    date: new Date().toISOString().split('T')[0]!,
    status: 'draft',
    totalWeight: 11_800,
    totalDistance: 28.5,
    estimatedDuration: 140,
    stops: [
      {
        id: 'stop-011',
        deliveryId: 'del-011',
        orderId: 'ORD-4540',
        customerName: 'New Cairo Villas Project',
        address: '14 التجمع الخامس، القاهرة الجديدة',
        lat: 30.0074,
        lng: 31.4913,
        weight: 4_200,
        equipmentNeeded: 'moffett',
        timeWindow: { start: '04:00', end: '06:00' },
        sequence: 1,
        status: 'pending',
      },
      {
        id: 'stop-012',
        deliveryId: 'del-012',
        orderId: 'ORD-4542',
        customerName: 'Rehab City Contractors',
        address: '9 مدينة الرحاب، القاهرة الجديدة',
        lat: 30.0611,
        lng: 31.4909,
        weight: 3_600,
        equipmentNeeded: 'crane',
        timeWindow: { start: '04:30', end: '06:00' },
        sequence: 2,
        status: 'pending',
      },
      {
        id: 'stop-013',
        deliveryId: 'del-013',
        orderId: 'ORD-4544',
        customerName: 'Obour Industrial Zone',
        address: '21 المنطقة الصناعية، مدينة العبور',
        lat: 30.2285,
        lng: 31.4759,
        weight: 4_000,
        equipmentNeeded: 'moffett',
        timeWindow: { start: '04:00', end: '06:00' },
        sequence: 3,
        status: 'pending',
      },
    ],
  },
]

// ─── Mock GPS Positions ─────────────────────────────────

const MOCK_GPS_POSITIONS: GPSPosition[] = [
  {
    driverId: 'drv-001',
    lat: 30.0444,
    lng: 31.2357,
    speed: 35,
    heading: 180,
    timestamp: new Date().toISOString(),
    status: 'transit',
  },
  {
    driverId: 'drv-002',
    lat: 30.0626,
    lng: 31.2497,
    speed: 0,
    heading: 90,
    timestamp: new Date().toISOString(),
    status: 'loading',
  },
]

// ─── Mock POD Records ───────────────────────────────────

const MOCK_POD_RECORDS: PODRecord[] = [
  {
    id: 'pod-001',
    deliveryId: 'del-001',
    driverId: 'drv-001',
    photos: [
      'https://cdn.hyperquote.io/pod/del-001-front.jpg',
      'https://cdn.hyperquote.io/pod/del-001-offload.jpg',
    ],
    signatureUrl: 'https://cdn.hyperquote.io/pod/del-001-sig.png',
    gpsLat: 29.9602,
    gpsLng: 31.2569,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    deliveredQty: { 'cement-50kg': 200, 'rebar-12mm': 50 },
    driverNotes: 'Delivered to site entrance. Foreman signed.',
    durationMinutes: 28,
    autoChecksPassed: true,
  },
  {
    id: 'pod-002',
    deliveryId: 'del-006',
    driverId: 'drv-002',
    photos: [
      'https://cdn.hyperquote.io/pod/del-006-front.jpg',
    ],
    signatureUrl: 'https://cdn.hyperquote.io/pod/del-006-sig.png',
    gpsLat: 30.0870,
    gpsLng: 31.3280,
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    deliveredQty: { 'marble-slab': 30, 'granite-tile': 100 },
    driverNotes: 'Boom crane used for marble slabs. Minor chip noted on 2 slabs.',
    durationMinutes: 45,
    autoChecksPassed: false,
  },
  {
    id: 'pod-003',
    deliveryId: 'del-007',
    driverId: 'drv-002',
    photos: [
      'https://cdn.hyperquote.io/pod/del-007-front.jpg',
      'https://cdn.hyperquote.io/pod/del-007-side.jpg',
    ],
    signatureUrl: 'https://cdn.hyperquote.io/pod/del-007-sig.png',
    gpsLat: 30.0495,
    gpsLng: 31.3500,
    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
    deliveredQty: { 'steel-beam-6m': 15, 'bolt-set': 200 },
    driverNotes: '',
    durationMinutes: 18,
    autoChecksPassed: true,
  },
]

// ─── Mock Performance Data ──────────────────────────────

const MOCK_PERFORMANCE: DriverPerformance[] = [
  {
    driverId: 'drv-001',
    onTimeRate: 94,
    podComplianceRate: 100,
    damageRate: 1.2,
    avgDeliveriesPerDay: 5.3,
    avgDeliveryDuration: 32,
  },
  {
    driverId: 'drv-002',
    onTimeRate: 87,
    podComplianceRate: 92,
    damageRate: 3.8,
    avgDeliveriesPerDay: 4.1,
    avgDeliveryDuration: 41,
  },
  {
    driverId: 'drv-003',
    onTimeRate: 91,
    podComplianceRate: 88,
    damageRate: 2.0,
    avgDeliveriesPerDay: 4.8,
    avgDeliveryDuration: 35,
  },
  {
    driverId: 'drv-004',
    onTimeRate: 78,
    podComplianceRate: 75,
    damageRate: 5.1,
    avgDeliveriesPerDay: 3.2,
    avgDeliveryDuration: 48,
  },
]

// ─── Dispatch Board Types ───────────────────────────────

export interface DispatchBoard {
  todayDeliveries: {
    total: number
    completed: number
    inProgress: number
    pending: number
    failed: number
  }
  fleetStatus: {
    available: number
    inTransit: number
    loading: number
    atSite: number
    offline: number
  }
  alerts: {
    delayedDeliveries: number
    failedDeliveries: number
    driverIssues: number
    constraintViolations: Array<{ message: string; severity: 'error' | 'warning' }>
  }
  weather: {
    khamsinActive: boolean
    windSpeedKmh: number
    temperature: number
    advisory: string | null
  }
  routes: DeliveryRoute[]
}

export interface DeliveryAnalytics {
  period: string
  totalDeliveries: number
  onTimeRate: number
  avgDuration: number
  podComplianceRate: number
  damageRate: number
  topDrivers: DriverPerformance[]
  deliveriesByArea: Array<{ area: string; count: number }>
}

// ─── Server Functions ───────────────────────────────────

export const getDispatchBoard = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DispatchBoard> => {
    const allStops = MOCK_ROUTES.flatMap((r) => r.stops)
    const completedStops = allStops.filter((s) => s.status === 'delivered')
    const inProgressStops = allStops.filter((s) => s.status === 'en_route' || s.status === 'arrived')
    const pendingStops = allStops.filter((s) => s.status === 'pending')
    const failedStops = allStops.filter((s) => s.status === 'failed')

    return {
      todayDeliveries: {
        total: allStops.length,
        completed: completedStops.length,
        inProgress: inProgressStops.length,
        pending: pendingStops.length,
        failed: failedStops.length,
      },
      fleetStatus: {
        available: MOCK_VEHICLES.filter((v) => v.status === 'offline' && v.currentDriverId).length,
        inTransit: MOCK_VEHICLES.filter((v) => v.status === 'transit').length,
        loading: MOCK_VEHICLES.filter((v) => v.status === 'loading').length,
        atSite: MOCK_VEHICLES.filter((v) => v.status === 'at_site').length,
        offline: MOCK_VEHICLES.filter((v) => v.status === 'offline' && !v.currentDriverId).length,
      },
      alerts: {
        delayedDeliveries: 1,
        failedDeliveries: failedStops.length,
        driverIssues: MOCK_DRIVERS.filter((d) => d.complianceStatus === 'expiring' || d.complianceStatus === 'expired').length,
        constraintViolations: [
          { message: 'Route 001 Stop 4: Near Cairo truck ban hours', severity: 'warning' },
          { message: 'Driver Mohamed Saeed: Medical certificate expiring soon', severity: 'warning' },
        ],
      },
      weather: {
        khamsinActive: false,
        windSpeedKmh: 18,
        temperature: 34,
        advisory: null,
      },
      routes: MOCK_ROUTES,
    }
  },
)

export const getDriverList = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Driver[]> => {
    return MOCK_DRIVERS
  },
)

export const getDriverLocations = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GPSPosition[]> => {
    return MOCK_GPS_POSITIONS
  },
)

export const createShipment = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ id: string; routeId: string }> => {
    return { id: `del-${Date.now()}`, routeId: 'route-003' }
  },
)

export const optimizeRoute = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{
    optimizedStops: DeliveryRoute['stops']
    estimatedDuration: number
    estimatedDistance: number
    savings: { distanceKm: number; durationMin: number }
  }> => {
    const route = MOCK_ROUTES[2]!
    return {
      optimizedStops: [...route.stops].reverse(),
      estimatedDuration: route.estimatedDuration - 15,
      estimatedDistance: route.totalDistance - 4.2,
      savings: { distanceKm: 4.2, durationMin: 15 },
    }
  },
)

export const reassignDriver = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ success: boolean; routeId: string; driverId: string }> => {
    return { success: true, routeId: 'route-003', driverId: 'drv-003' }
  },
)

export const confirmDeliveryPOD = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ podId: string; valid: boolean; checks: Record<string, boolean> }> => {
    return {
      podId: 'pod-001',
      valid: true,
      checks: {
        photosOk: true,
        signatureOk: true,
        quantitiesOk: true,
        gpsOk: true,
        noDamage: true,
      },
    }
  },
)

export const flagDeliveryIssue = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ issueId: string; deliveryId: string; escalated: boolean }> => {
    return {
      issueId: `issue-${Date.now()}`,
      deliveryId: 'del-006',
      escalated: false,
    }
  },
)

export const publishRoutes = createServerFn({ method: 'POST' }).handler(
  async (): Promise<{ publishedCount: number; routeIds: string[]; notifiedDrivers: string[] }> => {
    return {
      publishedCount: 1,
      routeIds: ['route-003'],
      notifiedDrivers: ['drv-003'],
    }
  },
)

export const getDeliveryAnalytics = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DeliveryAnalytics> => {
    return {
      period: 'MTD',
      totalDeliveries: 342,
      onTimeRate: 89.5,
      avgDuration: 36,
      podComplianceRate: 91.2,
      damageRate: 2.8,
      topDrivers: MOCK_PERFORMANCE,
      deliveriesByArea: [
        { area: 'Maadi', count: 68 },
        { area: 'Heliopolis', count: 52 },
        { area: 'Nasr City', count: 71 },
        { area: '6th October', count: 85 },
        { area: 'New Cairo', count: 43 },
        { area: 'Shoubra', count: 23 },
      ],
    }
  },
)
