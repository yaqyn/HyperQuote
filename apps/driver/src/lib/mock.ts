/**
 * Dev fixtures. Once the server endpoint exists this file is replaced
 * by a fetch wrapper returning the same shapes. Coordinates seeded
 * from real Cairo districts.
 */

import type {
	ActiveOrder,
	Coords,
	DriverSession,
	Message,
	MessageThread,
	OrderSummary,
	Telemetry,
} from './types'

const WAREHOUSE_COORDS: Coords = { lat: 30.1294, lng: 31.2434 }

export const DRIVER_SESSION: DriverSession = {
	driverId: 'drv-04',
	driverName: 'Mahmoud El-Sayed',
	driverNameAr: 'محمود السيد',
	truckPlate: 'CAI-1842',
	truckCapacityTons: 12,
	depot: 'Shubra Warehouse',
}

const ORDERS: OrderSummary[] = [
	{
		id: 'ord-7204',
		displayId: 'ORD-7204',
		customerName: 'Pyramid Builders',
		customerNameAr: 'بنّاؤو الأهرام',
		cargoClass: 'aggregate',
		weightTons: 8.4,
		itemCount: 4,
		stage: 'loading',
		dockBay: 'Bay 03',
		loadingProgress: 0.62,
		deliveryCity: '6th October City',
	},
	{
		id: 'ord-7211',
		displayId: 'ORD-7211',
		customerName: 'Maadi Engineering',
		customerNameAr: 'هندسة المعادي',
		cargoClass: 'finishes',
		weightTons: 2.1,
		itemCount: 3,
		stage: 'queued',
		dockBay: 'Bay 02',
		loadingProgress: 0,
		deliveryCity: 'Maadi',
	},
	{
		id: 'ord-7218',
		displayId: 'ORD-7218',
		customerName: 'Al-Nour Construction',
		customerNameAr: 'إنشاءات النور',
		cargoClass: 'metal',
		weightTons: 11.2,
		itemCount: 2,
		stage: 'queued',
		dockBay: 'Bay 04',
		loadingProgress: 0,
		deliveryCity: 'Dokki, Giza',
	},
	{
		id: 'ord-7202',
		displayId: 'ORD-7202',
		customerName: 'Heliopolis Developments',
		customerNameAr: 'تطوير مصر الجديدة',
		cargoClass: 'mixed',
		weightTons: 6.8,
		itemCount: 5,
		stage: 'sealed',
		dockBay: 'Bay 01',
		loadingProgress: 1,
		deliveryCity: 'Heliopolis',
	},
	{
		id: 'ord-7197',
		displayId: 'ORD-7197',
		customerName: 'Nasr City Holdings',
		customerNameAr: 'القابضة لمدينة نصر',
		cargoClass: 'aggregate',
		weightTons: 14.0,
		itemCount: 1,
		stage: 'queued',
		dockBay: 'Bay 05',
		loadingProgress: 0,
		deliveryCity: 'Nasr City',
	},
]

const ACTIVE_ORDER: ActiveOrder = {
	...ORDERS[0],
	contact: {
		name: 'Mostafa El-Sayed',
		role: 'Site Foreman',
		phone: '+20 100 222 8841',
	},
	dispatchContact: {
		name: 'Yasmine El-Gammal',
		role: 'Dispatch Coordinator',
		phone: '+20 100 222 3344',
	},
	deliveryAddress: 'Plot 142, Industrial Zone B, 6th October City',
	deliveryAddressAr: 'قطعة ١٤٢، المنطقة الصناعية ب، مدينة السادس من أكتوبر',
	deliveryCoords: { lat: 29.9667, lng: 30.9333 },
	originCoords: WAREHOUSE_COORDS,
	totalAmountEgp: 184_500,
	estimatedDepartureMinutesFromNow: 18,
	notes: 'Site gate closes at 17:00. Foreman has crane crew on standby.',
	notesAr: 'بوابة الموقع تغلق ٥ مساءً. المعلم لديه طاقم رافعة جاهز.',
	items: [
		{
			productSlug: 'cement-portland-50kg',
			productName: 'Portland Cement, 50kg bag',
			productNameAr: 'أسمنت بورتلاندي، كيس ٥٠كجم',
			quantity: 80,
			unit: 'bag',
			weightKg: 4000,
		},
		{
			productSlug: 'rebar-12mm-12m',
			productName: 'Rebar Ø12mm, 12m length',
			productNameAr: 'حديد تسليح Ø١٢مم، ١٢م',
			quantity: 240,
			unit: 'pcs',
			weightKg: 2560,
		},
		{
			productSlug: 'aggregate-3-4-bulk',
			productName: 'Crushed Aggregate, 3/4"',
			productNameAr: 'بحص ٣/٤ بوصة',
			quantity: 1.5,
			unit: 'm3',
			weightKg: 1840,
		},
		{
			productSlug: 'block-hollow-20cm',
			productName: 'Hollow Concrete Block, 20cm',
			productNameAr: 'بلوك أسمنتي مفرغ، ٢٠سم',
			quantity: 18,
			unit: 'pcs',
			weightKg: 0,
		},
	],
}

const ORDER_QUEUE: OrderSummary[] = ORDERS

const THREADS: MessageThread[] = [
	{
		id: 'warehouse',
		name: 'Warehouse',
		nameAr: 'المستودع',
		subtitle: 'Yasmine, Bay 03',
		subtitleAr: 'ياسمين، بوابة ٣',
		online: true,
		unread: 2,
	},
	{
		id: 'fleet',
		name: 'Drivers',
		nameAr: 'السائقون',
		subtitle: '6 on shift',
		subtitleAr: '٦ في النوبة',
		online: true,
		unread: 0,
	},
	{
		id: 'dispatch',
		name: 'Dispatch',
		nameAr: 'التوزيع',
		subtitle: 'Khaled',
		subtitleAr: 'خالد',
		online: false,
		unread: 1,
	},
]

const INITIAL_MESSAGES: Message[] = [
	{
		id: 'msg-001',
		threadId: 'warehouse',
		authorId: 'emp-002',
		authorName: 'Yasmine',
		body: 'Loading bay 03 — cement first, rebar last. Tarps ready.',
		bodyAr: 'جاري التحميل من بوابة ٣ — الأسمنت أولاً، ثم الحديد.',
		minutesAgo: 12,
	},
	{
		id: 'msg-002',
		threadId: 'warehouse',
		authorId: 'drv-04',
		authorName: 'You',
		body: 'Copy. Pulling forward to bay door.',
		bodyAr: 'تمام. جاري التقدم نحو البوابة.',
		minutesAgo: 11,
		self: true,
	},
	{
		id: 'msg-003',
		threadId: 'warehouse',
		authorId: 'system',
		authorName: 'System',
		body: 'Cargo seal scanned · ORD-7204',
		bodyAr: 'تم مسح ختم الشحنة · ORD-7204',
		minutesAgo: 8,
		system: true,
	},
	{
		id: 'msg-004',
		threadId: 'warehouse',
		authorId: 'emp-002',
		authorName: 'Yasmine',
		body: 'Foreman has crane crew ready. Don\u2019t miss the 17:00 gate.',
		bodyAr: 'المعلم في الموقع جاهز برافعة. لا تفوت بوابة الخامسة.',
		minutesAgo: 4,
	},
	{
		id: 'msg-005',
		threadId: 'fleet',
		authorId: 'drv-09',
		authorName: 'Hassan',
		body: 'Ring road westbound clear after the El-Moneeb exit.',
		bodyAr: 'الطريق الدائري غرباً صافي بعد مخرج المنيب.',
		minutesAgo: 6,
	},
	{
		id: 'msg-006',
		threadId: 'fleet',
		authorId: 'drv-12',
		authorName: 'Tarek',
		body: 'Heavy traffic at Maadi corniche — try Salah Salem instead.',
		bodyAr: 'زحمة شديدة في كورنيش المعادي — جرب صلاح سالم.',
		minutesAgo: 3,
	},
	{
		id: 'msg-007',
		threadId: 'dispatch',
		authorId: 'emp-005',
		authorName: 'Khaled',
		body: 'After ORD-7204 you\u2019re scheduled ORD-7218 to Dokki. Confirm.',
		bodyAr: 'بعد ORD-7204 لديك ORD-7218 إلى الدقي. أكد.',
		minutesAgo: 22,
	},
]

const TELEMETRY: Telemetry = {
	signalStrength: 4,
	gpsLocked: true,
	batteryPct: 78,
	odometerKm: 142_318,
}

export function getOrderQueue(): Promise<OrderSummary[]> {
	return Promise.resolve(ORDER_QUEUE)
}
export function getActiveOrder(): Promise<ActiveOrder> {
	return Promise.resolve(ACTIVE_ORDER)
}
export function getThreads(): Promise<MessageThread[]> {
	return Promise.resolve(THREADS)
}
export function getMessages(threadId: string): Promise<Message[]> {
	return Promise.resolve(
		INITIAL_MESSAGES.filter((m) => m.threadId === threadId),
	)
}
