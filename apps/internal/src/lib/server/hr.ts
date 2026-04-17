import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import type {
	AttendanceRecord,
	DriverComplianceRecord,
	Employee,
	LeaveRequest,
	LeaveStatus,
	LeaveType,
} from '../../types/hr'
import { getComplianceStatus } from '../../types/hr'

// ─── Mock Employees ────────────────────────────────────

const MOCK_EMPLOYEES: Employee[] = [
	{
		id: 'emp-001',
		name: 'Ahmed Hassan',
		phone: '+201012345678',
		email: 'ahmed.h@hyperquote.io',
		department: 'Sales',
		role: 'Sales Manager',
		status: 'active',
		hireDate: '2020-03-15',
		reportingManager: null,
		nationalId: '29001012345678',
		contractType: 'full-time',
	},
	{
		id: 'emp-002',
		name: 'Fatima El-Sayed',
		phone: '+201098765432',
		email: 'fatima.e@hyperquote.io',
		department: 'Procurement',
		role: 'Procurement Lead',
		status: 'active',
		hireDate: '2021-06-01',
		reportingManager: 'emp-001',
		nationalId: '29201054321098',
		contractType: 'full-time',
	},
	{
		id: 'emp-003',
		name: 'Mohamed Kamal',
		phone: '+201155556666',
		email: 'mohamed.k@hyperquote.io',
		department: 'Operations',
		role: 'Operations Coordinator',
		status: 'active',
		hireDate: '2022-01-10',
		reportingManager: 'emp-001',
		nationalId: '29501087654321',
		contractType: 'full-time',
	},
	{
		id: 'emp-004',
		name: 'Nour Abdelrahman',
		phone: '+201277778888',
		email: 'nour.a@hyperquote.io',
		department: 'Finance',
		role: 'Accountant',
		status: 'active',
		hireDate: '2019-09-20',
		reportingManager: null,
		nationalId: '29301023456789',
		contractType: 'full-time',
	},
	{
		id: 'emp-005',
		name: 'Khaled Ibrahim',
		phone: '+201344445555',
		email: 'khaled.i@hyperquote.io',
		department: 'Dispatch',
		role: 'Dispatch Supervisor',
		status: 'active',
		hireDate: '2021-11-05',
		reportingManager: 'emp-003',
		nationalId: '28801098765432',
		contractType: 'full-time',
	},
	{
		id: 'emp-006',
		name: 'Yasmin Mostafa',
		phone: '+201566667777',
		email: 'yasmin.m@hyperquote.io',
		department: 'Sales',
		role: 'Sales Representative',
		status: 'active',
		hireDate: '2023-02-14',
		reportingManager: 'emp-001',
		nationalId: '29901034567890',
		contractType: 'full-time',
	},
	{
		id: 'emp-007',
		name: 'Omar Tarek',
		phone: '+201688889999',
		email: 'omar.t@hyperquote.io',
		department: 'Warehouse',
		role: 'Warehouse Manager',
		status: 'active',
		hireDate: '2020-07-22',
		reportingManager: null,
		nationalId: '29101045678901',
		contractType: 'full-time',
	},
	{
		id: 'emp-008',
		name: 'Hana Magdy',
		phone: '+201711112222',
		email: 'hana.m@hyperquote.io',
		department: 'Procurement',
		role: 'Supplier Coordinator',
		status: 'active',
		hireDate: '2024-01-08',
		reportingManager: 'emp-002',
		nationalId: '29801056789012',
		contractType: 'full-time',
	},
	{
		id: 'emp-009',
		name: 'Youssef Farid',
		phone: '+201833334444',
		email: 'youssef.f@hyperquote.io',
		department: 'Dispatch',
		role: 'Driver',
		status: 'active',
		hireDate: '2022-05-30',
		reportingManager: 'emp-005',
		nationalId: '29601067890123',
		contractType: 'contracted',
	},
	{
		id: 'emp-010',
		name: 'Mariam Samy',
		phone: '+201944445555',
		email: 'mariam.s@hyperquote.io',
		department: 'Finance',
		role: 'Financial Analyst',
		status: 'active',
		hireDate: '2023-08-15',
		reportingManager: 'emp-004',
		nationalId: '29701078901234',
		contractType: 'full-time',
	},
	{
		id: 'emp-011',
		name: 'Ali Mahmoud',
		phone: '+201055556666',
		email: 'ali.m@hyperquote.io',
		department: 'Operations',
		role: 'Quality Inspector',
		status: 'inactive',
		hireDate: '2021-03-01',
		reportingManager: 'emp-003',
		nationalId: '28901089012345',
		contractType: 'full-time',
	},
	{
		id: 'emp-012',
		name: 'Sara Adel',
		phone: '+201166667777',
		email: 'sara.a@hyperquote.io',
		department: 'Warehouse',
		role: 'Inventory Clerk',
		status: 'active',
		hireDate: '2024-04-01',
		reportingManager: 'emp-007',
		nationalId: '30001090123456',
		contractType: 'part-time',
	},
]

// ─── Mock Driver Compliance ────────────────────────────

const MOCK_DRIVER_COMPLIANCE: DriverComplianceRecord[] = [
	{
		driverId: 'drv-001',
		driverName: 'Ahmed Hassan',
		licenseClass: 'second',
		licenseExpiry: '2027-06-15',
		medicalExpiry: '2027-03-20',
		drugTestDate: '2026-01-15',
		drugTestResult: 'pass',
		certifications: [
			{ type: 'Moffett', expiry: '2027-08-01' },
			{ type: 'Hazmat', expiry: '2027-05-10' },
		],
		complianceStatus: 'green',
		dispatchBlocked: false,
	},
	{
		driverId: 'drv-002',
		driverName: 'Mohamed Saeed',
		licenseClass: 'first',
		licenseExpiry: '2027-12-01',
		medicalExpiry: '2027-11-15',
		drugTestDate: '2026-02-01',
		drugTestResult: 'pass',
		certifications: [
			{ type: 'Boom', expiry: '2027-09-20' },
			{ type: 'Crane', expiry: '2028-01-15' },
		],
		complianceStatus: 'green',
		dispatchBlocked: false,
	},
	{
		driverId: 'drv-003',
		driverName: 'Khaled Ibrahim',
		licenseClass: 'third',
		licenseExpiry: '2026-05-01',
		medicalExpiry: '2026-04-20',
		drugTestDate: '2025-12-10',
		drugTestResult: 'pass',
		certifications: [{ type: 'Moffett', expiry: '2026-04-25' }],
		complianceStatus: 'yellow',
		dispatchBlocked: false,
	},
	{
		driverId: 'drv-004',
		driverName: 'Youssef Farid',
		licenseClass: 'second',
		licenseExpiry: '2026-04-15',
		medicalExpiry: '2026-05-10',
		drugTestDate: '2026-01-20',
		drugTestResult: 'pass',
		certifications: [{ type: 'Forklift', expiry: '2026-04-30' }],
		complianceStatus: 'yellow',
		dispatchBlocked: false,
	},
	{
		driverId: 'drv-005',
		driverName: 'Tarek Mansour',
		licenseClass: 'first',
		licenseExpiry: '2025-11-30',
		medicalExpiry: '2025-10-15',
		drugTestDate: '2025-06-01',
		drugTestResult: 'pass',
		certifications: [{ type: 'Crane', expiry: '2025-09-01' }],
		complianceStatus: 'red',
		dispatchBlocked: true,
	},
	{
		driverId: 'drv-006',
		driverName: 'Hassan Nabil',
		licenseClass: 'third',
		licenseExpiry: '2025-08-20',
		medicalExpiry: '2026-06-10',
		drugTestDate: '2025-03-15',
		drugTestResult: 'fail',
		certifications: [],
		complianceStatus: 'red',
		dispatchBlocked: true,
	},
]

// Recalculate statuses dynamically
for (const record of MOCK_DRIVER_COMPLIANCE) {
	record.complianceStatus = getComplianceStatus(record)
	record.dispatchBlocked = record.complianceStatus === 'red'
}

// ─── Mock Leave Requests ───────────────────────────────

const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
	{
		id: 'lv-001',
		employeeId: 'emp-001',
		employeeName: 'Ahmed Hassan',
		type: 'annual',
		startDate: '2026-04-15',
		endDate: '2026-04-22',
		reason: 'Family vacation',
		attachment: null,
		status: 'pending',
		approverComment: null,
	},
	{
		id: 'lv-002',
		employeeId: 'emp-002',
		employeeName: 'Fatima El-Sayed',
		type: 'maternity',
		startDate: '2026-05-01',
		endDate: '2026-08-28',
		reason: 'Maternity leave',
		attachment: 'medical-cert-002.pdf',
		status: 'approved',
		approverComment: 'Approved per labor law',
	},
	{
		id: 'lv-003',
		employeeId: 'emp-006',
		employeeName: 'Yasmin Mostafa',
		type: 'sick',
		startDate: '2026-04-03',
		endDate: '2026-04-05',
		reason: 'Flu',
		attachment: 'medical-cert-006.pdf',
		status: 'approved',
		approverComment: 'Get well soon',
	},
	{
		id: 'lv-004',
		employeeId: 'emp-003',
		employeeName: 'Mohamed Kamal',
		type: 'pilgrimage',
		startDate: '2026-06-10',
		endDate: '2026-06-25',
		reason: 'Hajj pilgrimage',
		attachment: null,
		status: 'pending',
		approverComment: null,
	},
	{
		id: 'lv-005',
		employeeId: 'emp-008',
		employeeName: 'Hana Magdy',
		type: 'study',
		startDate: '2026-04-20',
		endDate: '2026-04-21',
		reason: 'University exam',
		attachment: null,
		status: 'approved',
		approverComment: 'Approved',
	},
	{
		id: 'lv-006',
		employeeId: 'emp-010',
		employeeName: 'Mariam Samy',
		type: 'annual',
		startDate: '2026-04-12',
		endDate: '2026-04-14',
		reason: 'Personal',
		attachment: null,
		status: 'rejected',
		approverComment: 'Overlaps with quarter-end close',
	},
	{
		id: 'lv-007',
		employeeId: 'emp-009',
		employeeName: 'Youssef Farid',
		type: 'paternity',
		startDate: '2026-04-08',
		endDate: '2026-04-08',
		reason: 'Wife giving birth',
		attachment: null,
		status: 'pending',
		approverComment: null,
	},
	{
		id: 'lv-008',
		employeeId: 'emp-012',
		employeeName: 'Sara Adel',
		type: 'annual',
		startDate: '2026-03-28',
		endDate: '2026-03-30',
		reason: 'Wedding attendance',
		attachment: null,
		status: 'rejected',
		approverComment: 'Short notice, staffing conflict',
	},
]

// ─── Mock Attendance Records ───────────────────────────

function todayStr(): string {
	const [day] = new Date().toISOString().split('T')
	return day ?? ''
}

function _weekDates(): string[] {
	const dates: string[] = []
	const now = new Date()
	const dayOfWeek = now.getDay()
	const sunday = new Date(now)
	sunday.setDate(now.getDate() - dayOfWeek)
	for (let i = 0; i < 7; i++) {
		const d = new Date(sunday)
		d.setDate(sunday.getDate() + i)
		const [day] = d.toISOString().split('T')
		if (day) dates.push(day)
	}
	return dates
}

const MOCK_ATTENDANCE: AttendanceRecord[] = [
	{
		id: 'att-001',
		employeeId: 'emp-001',
		employeeName: 'Ahmed Hassan',
		date: todayStr(),
		clockIn: '08:00',
		clockOut: '17:30',
		hoursWorked: 9.5,
		overtime: 1.5,
		overtimeType: 'day',
	},
	{
		id: 'att-002',
		employeeId: 'emp-002',
		employeeName: 'Fatima El-Sayed',
		date: todayStr(),
		clockIn: '08:15',
		clockOut: '16:15',
		hoursWorked: 8,
		overtime: 0,
		overtimeType: null,
	},
	{
		id: 'att-003',
		employeeId: 'emp-003',
		employeeName: 'Mohamed Kamal',
		date: todayStr(),
		clockIn: '07:45',
		clockOut: '18:00',
		hoursWorked: 10.25,
		overtime: 2.25,
		overtimeType: 'day',
	},
	{
		id: 'att-004',
		employeeId: 'emp-004',
		employeeName: 'Nour Abdelrahman',
		date: todayStr(),
		clockIn: '08:30',
		clockOut: null,
		hoursWorked: 0,
		overtime: 0,
		overtimeType: null,
	},
	{
		id: 'att-005',
		employeeId: 'emp-005',
		employeeName: 'Khaled Ibrahim',
		date: todayStr(),
		clockIn: '06:00',
		clockOut: '14:30',
		hoursWorked: 8.5,
		overtime: 0.5,
		overtimeType: 'day',
	},
	{
		id: 'att-006',
		employeeId: 'emp-007',
		employeeName: 'Omar Tarek',
		date: todayStr(),
		clockIn: '20:00',
		clockOut: '04:30',
		hoursWorked: 8.5,
		overtime: 0.5,
		overtimeType: 'night',
	},
	{
		id: 'att-007',
		employeeId: 'emp-009',
		employeeName: 'Youssef Farid',
		date: todayStr(),
		clockIn: '07:00',
		clockOut: '16:00',
		hoursWorked: 9,
		overtime: 1,
		overtimeType: 'day',
	},
	{
		id: 'att-008',
		employeeId: 'emp-010',
		employeeName: 'Mariam Samy',
		date: todayStr(),
		clockIn: '08:00',
		clockOut: '16:00',
		hoursWorked: 8,
		overtime: 0,
		overtimeType: null,
	},
	{
		id: 'att-009',
		employeeId: 'emp-012',
		employeeName: 'Sara Adel',
		date: todayStr(),
		clockIn: '09:00',
		clockOut: '17:00',
		hoursWorked: 8,
		overtime: 0,
		overtimeType: null,
	},
	{
		id: 'att-010',
		employeeId: 'emp-006',
		employeeName: 'Yasmin Mostafa',
		date: todayStr(),
		clockIn: null,
		clockOut: null,
		hoursWorked: 0,
		overtime: 0,
		overtimeType: null,
	},
]

// ─── Server Functions ──────────────────────────────────

export const getEmployeeDirectory = createServerFn({ method: 'GET' }).handler(
	async (): Promise<Employee[]> => {
		return MOCK_EMPLOYEES
	},
)

export const updateEmployeeRecord = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			employeeId: z.string(),
			updates: z.record(z.string(), z.unknown()),
		}),
	)
	.handler(async (): Promise<{ success: true }> => {
		// Mock handler — Supabase wiring in Phase 24 will read `data`.
		return { success: true }
	})

export const getDriverCompliance = createServerFn({ method: 'GET' }).handler(
	async (): Promise<DriverComplianceRecord[]> => {
		return MOCK_DRIVER_COMPLIANCE
	},
)

export const getLeaveRequests = createServerFn({ method: 'GET' }).handler(
	async (): Promise<LeaveRequest[]> => {
		return MOCK_LEAVE_REQUESTS
	},
)

export const submitLeaveRequest = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			employeeId: z.string(),
			type: z.string(),
			startDate: z.string(),
			endDate: z.string(),
			reason: z.string().optional(),
			attachment: z.string().optional(),
		}),
	)
	.handler(async ({ data }): Promise<{ success: true; requestId: string }> => {
		const employee = MOCK_EMPLOYEES.find((e) => e.id === data.employeeId)
		const requestId = `lv-${Date.now()}`
		MOCK_LEAVE_REQUESTS.push({
			id: requestId,
			employeeId: data.employeeId,
			employeeName: employee?.name ?? 'Unknown',
			type: data.type as LeaveType,
			startDate: data.startDate,
			endDate: data.endDate,
			reason: data.reason ?? '',
			attachment: data.attachment ?? null,
			status: 'pending',
			approverComment: null,
		})
		return { success: true, requestId }
	})

export const approveLeaveRequest = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			requestId: z.string(),
			decision: z.enum(['approved', 'rejected']),
			comment: z.string().optional(),
		}),
	)
	.handler(
		async ({
			data,
		}): Promise<{ success: true; updatedStatus: LeaveStatus }> => {
			const request = MOCK_LEAVE_REQUESTS.find((r) => r.id === data.requestId)
			if (request) {
				request.status = data.decision
				request.approverComment = data.comment ?? null
			}
			return { success: true, updatedStatus: data.decision }
		},
	)

export const getAttendance = createServerFn({ method: 'GET' })
	.inputValidator(z.object({ date: z.string().optional() }).optional())
	.handler(async ({ data }): Promise<AttendanceRecord[]> => {
		const targetDate = data?.date ?? todayStr()
		// Return mock data for any date — generate records if not today
		if (targetDate === todayStr()) {
			return MOCK_ATTENDANCE
		}
		// Generate mock historical data for the requested date
		return MOCK_EMPLOYEES.slice(0, 8).map((emp, i) => ({
			id: `att-hist-${i}`,
			employeeId: emp.id,
			employeeName: emp.name,
			date: targetDate,
			clockIn: i < 7 ? `0${7 + (i % 3)}:${i % 2 === 0 ? '00' : '30'}` : null,
			clockOut: i < 7 ? `${16 + (i % 2)}:${i % 2 === 0 ? '00' : '30'}` : null,
			hoursWorked: i < 7 ? 8 + (i % 3) * 0.5 : 0,
			overtime: i < 3 ? (i + 1) * 0.5 : 0,
			overtimeType: i < 3 ? ('day' as const) : null,
		}))
	})

export const clockInOut = createServerFn({ method: 'POST' })
	.inputValidator(
		z.object({
			employeeId: z.string(),
			action: z.enum(['in', 'out']),
		}),
	)
	.handler(async (): Promise<{ success: true; timestamp: string }> => {
		// Mock handler — Supabase wiring in Phase 24 will read `data`.
		return {
			success: true,
			timestamp: new Date().toISOString(),
		}
	})

export const savePerformanceNotes = createServerFn({ method: 'POST' })
	.inputValidator(z.object({ employeeId: z.string(), notes: z.string() }))
	.handler(async (): Promise<{ success: true }> => {
		// Mock handler — Supabase wiring in Phase 24 will read `data`.
		return { success: true }
	})
