import type {
	DriverDelivery,
	DriverLocation,
	DriverProfile,
	TeamMessage,
} from './driver-repository'

export const MOCK_CURRENT_DRIVER_ID = 'drv-youssef-hassan'

export const DEFAULT_DRIVER_LOCATION: DriverLocation = {
	accuracyMeters: 18,
	latitude: 30.0258,
	longitude: 31.1364,
	recordedAt: '2026-05-17T07:20:00.000Z',
	source: 'mock',
}

const SIX_OCTOBER_DISPATCH_CONTACT: DriverDelivery['warehouseContact'] = {
	name: { en: '6 October dispatch desk', ar: 'مكتب تشغيل أكتوبر' },
	phone: '+20238200001',
	role: { en: 'Warehouse dispatch', ar: 'تشغيل المخزن' },
}

const SIX_OCTOBER_WAREHOUSE: DriverDelivery['origin'] = {
	label: { en: '6 October warehouse', ar: 'مخزن ٦ أكتوبر' },
	address: {
		en: 'Industrial Zone, 6th of October City',
		ar: 'المنطقة الصناعية، مدينة ٦ أكتوبر',
	},
	latitude: 29.9753,
	longitude: 30.9247,
}

export const MOCK_DRIVERS: DriverProfile[] = [
	{
		id: MOCK_CURRENT_DRIVER_ID,
		email: 'youssef.driver@hyperquote.net',
		name: { en: 'Youssef Hassan', ar: 'يوسف حسن' },
		phone: '+201001112233',
		status: 'available',
		vehicle: { en: 'Isuzu NPR - HQA 4281', ar: 'إيسوزو إن بي آر - HQA 4281' },
		location: DEFAULT_DRIVER_LOCATION,
	},
	{
		id: 'drv-mona-salem',
		email: 'mona.driver@hyperquote.net',
		name: { en: 'Mona Salem', ar: 'منى سالم' },
		phone: '+201009998877',
		status: 'on_delivery',
		vehicle: { en: 'JAC 5 ton - HQA 7732', ar: 'جاك ٥ طن - HQA 7732' },
		activeDeliveryId: 'del-new-cairo-tiles',
		location: {
			accuracyMeters: 22,
			latitude: 30.0183,
			longitude: 31.4758,
			recordedAt: '2026-05-17T07:16:00.000Z',
			source: 'mock',
		},
	},
	{
		id: 'drv-karim-adel',
		email: 'karim.driver@hyperquote.net',
		name: { en: 'Karim Adel', ar: 'كريم عادل' },
		phone: '+201112223344',
		status: 'offline',
		vehicle: { en: 'Mercedes Atego - HQA 9150', ar: 'مرسيدس أتيجو - HQA 9150' },
		location: {
			accuracyMeters: 35,
			latitude: 29.973,
			longitude: 30.934,
			recordedAt: '2026-05-17T06:50:00.000Z',
			source: 'mock',
		},
	},
]

export const MOCK_DELIVERIES: DriverDelivery[] = [
	{
		id: 'del-zayed-rebar',
		deliveryNumber: 'DLV-2026-0417',
		orderName: { en: 'Zayed rebar drop', ar: 'توصيل حديد زايد' },
		customer: {
			name: { en: 'Nile Edge Contracting', ar: 'نايل إيدج للمقاولات' },
			phone: '+20238200031',
			role: { en: 'Site engineer', ar: 'مهندس الموقع' },
		},
		warehouseContact: SIX_OCTOBER_DISPATCH_CONTACT,
		origin: SIX_OCTOBER_WAREHOUSE,
		address: {
			label: { en: 'Sheikh Zayed site gate', ar: 'بوابة موقع الشيخ زايد' },
			address: {
				en: 'Beverly Hills Gate 2, Sheikh Zayed, Giza',
				ar: 'بوابة ٢ بيفرلي هيلز، الشيخ زايد، الجيزة',
			},
			latitude: 30.0569,
			longitude: 30.9656,
		},
		items: [
			{
				id: 'item-rebar-12',
				name: { en: '12 mm steel rebar', ar: 'حديد تسليح ١٢ مم' },
				quantity: { en: '3 bundles', ar: '٣ ربط' },
			},
			{
				id: 'item-rebar-16',
				name: { en: '16 mm steel rebar', ar: 'حديد تسليح ١٦ مم' },
				quantity: { en: '2 bundles', ar: '٢ ربط' },
			},
		],
		notes: {
			en: 'Call the site engineer ten minutes before the gate. Forklift is available onsite.',
			ar: 'اتصل بمهندس الموقع قبل البوابة بعشر دقائق. توجد رافعة شوكية في الموقع.',
		},
		scheduledWindow: { en: 'Today 10:00-12:00', ar: 'اليوم ١٠:٠٠-١٢:٠٠' },
		etaMinutes: 38,
		status: 'available',
		driverId: null,
	},
	{
		id: 'del-new-cairo-tiles',
		deliveryNumber: 'DLV-2026-0418',
		orderName: {
			en: 'New Cairo tile pallets',
			ar: 'طبالي سيراميك القاهرة الجديدة',
		},
		customer: {
			name: { en: 'Palm District Developments', ar: 'بالم ديستريكت للتطوير' },
			phone: '+20226188440',
			role: { en: 'Receiving foreman', ar: 'مشرف الاستلام' },
		},
		warehouseContact: {
			name: { en: 'Badr warehouse desk', ar: 'مكتب مخزن بدر' },
			phone: '+20244870015',
			role: { en: 'Warehouse dispatch', ar: 'تشغيل المخزن' },
		},
		origin: {
			label: { en: 'Badr warehouse', ar: 'مخزن بدر' },
			address: { en: 'Badr industrial area', ar: 'المنطقة الصناعية بدر' },
			latitude: 30.1367,
			longitude: 31.7063,
		},
		address: {
			label: { en: 'Fifth Settlement zone B', ar: 'التجمع الخامس منطقة ب' },
			address: {
				en: 'South 90 Road, New Cairo',
				ar: 'شارع التسعين الجنوبي، القاهرة الجديدة',
			},
			latitude: 30.018,
			longitude: 31.492,
		},
		items: [
			{
				id: 'item-porcelain-grey',
				name: { en: 'Grey porcelain floor tile', ar: 'بورسلين أرضيات رمادي' },
				quantity: { en: '18 pallets', ar: '١٨ طبلة' },
			},
		],
		notes: {
			en: 'Other driver is already committed. Read-only in this driver app.',
			ar: 'السائق الآخر ملتزم بالفعل. تظهر للقراءة فقط في تطبيق هذا السائق.',
		},
		scheduledWindow: { en: 'Today 09:30-11:30', ar: 'اليوم ٠٩:٣٠-١١:٣٠' },
		etaMinutes: 24,
		status: 'in_transit',
		driverId: 'drv-mona-salem',
		departedAt: '2026-05-17T06:58:00.000Z',
	},
	{
		id: 'del-obour-cement',
		deliveryNumber: 'DLV-2026-0419',
		orderName: { en: 'Obour cement top-up', ar: 'تزويد أسمنت العبور' },
		customer: {
			name: { en: 'Delta Formworks', ar: 'دلتا فورمووركس' },
			phone: '+20244770320',
			role: { en: 'Storekeeper', ar: 'أمين المخزن' },
		},
		warehouseContact: {
			name: { en: 'Obour depot', ar: 'مستودع العبور' },
			phone: '+20244770010',
			role: { en: 'Warehouse dispatch', ar: 'تشغيل المخزن' },
		},
		origin: {
			label: { en: 'Obour depot', ar: 'مستودع العبور' },
			address: {
				en: 'First Industrial Zone, Obour',
				ar: 'المنطقة الصناعية الأولى، العبور',
			},
			latitude: 30.2292,
			longitude: 31.4697,
		},
		address: {
			label: { en: 'Obour block 18', ar: 'العبور بلوك ١٨' },
			address: {
				en: 'Block 18 construction yard, Obour',
				ar: 'ساحة إنشاء بلوك ١٨، العبور',
			},
			latitude: 30.2214,
			longitude: 31.4638,
		},
		items: [
			{
				id: 'item-cement-50',
				name: { en: 'OPC cement 50 kg', ar: 'أسمنت عادي ٥٠ كجم' },
				quantity: { en: '160 bags', ar: '١٦٠ شيكارة' },
			},
		],
		notes: {
			en: 'Keep the delivery note dry. Customer rejects torn bag counts.',
			ar: 'حافظ على إذن التسليم جافا. العميل يرفض عد الشكاير المقطوعة.',
		},
		scheduledWindow: { en: 'Today 13:00-15:00', ar: 'اليوم ١٣:٠٠-١٥:٠٠' },
		etaMinutes: 52,
		status: 'available',
		driverId: null,
	},
	{
		id: 'del-maadi-drywall',
		deliveryNumber: 'DLV-2026-0416',
		orderName: { en: 'Maadi drywall closeout', ar: 'إغلاق جبسوم بورد المعادي' },
		customer: {
			name: { en: 'Cairo Fitout Studio', ar: 'كايرو فيت آوت ستوديو' },
			phone: '+20223581119',
			role: { en: 'Project coordinator', ar: 'منسق المشروع' },
		},
		warehouseContact: SIX_OCTOBER_DISPATCH_CONTACT,
		origin: SIX_OCTOBER_WAREHOUSE,
		address: {
			label: { en: 'Maadi tower lobby', ar: 'مدخل برج المعادي' },
			address: { en: 'Street 9, Maadi, Cairo', ar: 'شارع ٩، المعادي، القاهرة' },
			latitude: 29.9602,
			longitude: 31.2569,
		},
		items: [
			{
				id: 'item-drywall-regular',
				name: { en: 'Regular gypsum board', ar: 'جبسوم بورد عادي' },
				quantity: { en: '42 sheets', ar: '٤٢ لوح' },
			},
		],
		notes: {
			en: 'Completed with clean customer signature and GPS proof.',
			ar: 'اكتمل بتوقيع العميل وإثبات الموقع.',
		},
		scheduledWindow: { en: 'Today 07:00-08:30', ar: 'اليوم ٠٧:٠٠-٠٨:٣٠' },
		etaMinutes: 0,
		status: 'completed',
		driverId: MOCK_CURRENT_DRIVER_ID,
		acceptedAt: '2026-05-17T04:15:00.000Z',
		departedAt: '2026-05-17T04:35:00.000Z',
		arrivedAt: '2026-05-17T05:28:00.000Z',
		completedAt: '2026-05-17T05:42:00.000Z',
	},
]

export const MOCK_TEAM_MESSAGES: TeamMessage[] = [
	{
		id: 'msg-1',
		authorDriverId: 'drv-karim-adel',
		authorName: { en: 'Karim Adel', ar: 'كريم عادل' },
		body: {
			en: 'Gate 4 at October is moving faster than gate 2.',
			ar: 'بوابة ٤ في أكتوبر أسرع من بوابة ٢.',
		},
		createdAt: '2026-05-17T06:45:00.000Z',
	},
	{
		id: 'msg-2',
		authorDriverId: 'drv-mona-salem',
		authorName: { en: 'Mona Salem', ar: 'منى سالم' },
		body: {
			en: 'New Cairo receiving asked for pallets to stay wrapped.',
			ar: 'استلام القاهرة الجديدة طلب بقاء الطبالي مغلفة.',
		},
		createdAt: '2026-05-17T07:05:00.000Z',
	},
]
