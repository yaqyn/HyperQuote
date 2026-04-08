// HR domain types — contracts for the entire HR module
// Employees, driver compliance, leave management, attendance, Egyptian labor law

// ─── Tab Navigation ──────────────────────────────────────

export type HRTab =
  | 'home'
  | 'people'
  | 'time'
  | 'settings'

// ─── Status Unions ───────────────────────────────────────

export type ComplianceStatus = 'green' | 'yellow' | 'red'

export type LeaveType =
  | 'annual'
  | 'sick'
  | 'maternity'
  | 'paternity'
  | 'study'
  | 'pilgrimage'
  | 'childcare'
  | 'nursing'

export type LeaveStatus = 'pending' | 'approved' | 'rejected'

export type EmployeeStatus = 'active' | 'inactive'

export type EgyptianLicenseClass = 'first' | 'second' | 'third'

export type OvertimeType = 'day' | 'night' | 'holiday'

// ─── Employee ────────────────────────────────────────────

export interface Employee {
  id: string
  name: string
  phone: string
  email: string
  department: string
  role: string
  status: EmployeeStatus
  hireDate: string
  reportingManager: string | null
  address?: string
  emergencyContact?: string
  nationalId?: string
  contractType?: string
}

// ─── Driver Compliance ───────────────────────────────────

export interface DriverComplianceRecord {
  driverId: string
  driverName: string
  licenseClass: EgyptianLicenseClass
  licenseExpiry: string
  medicalExpiry: string
  drugTestDate: string
  drugTestResult: 'pass' | 'fail' | 'pending'
  certifications: Array<{ type: string; expiry: string }>
  complianceStatus: ComplianceStatus
  dispatchBlocked: boolean
}

// ─── Leave ───────────────────────────────────────────────

export interface LeaveRequest {
  id: string
  employeeId: string
  employeeName: string
  type: LeaveType
  startDate: string
  endDate: string
  reason: string
  attachment: string | null
  status: LeaveStatus
  approverComment: string | null
}

// ─── Attendance ──────────────────────────────────────────

export interface AttendanceRecord {
  id: string
  employeeId: string
  employeeName: string
  date: string
  clockIn: string | null
  clockOut: string | null
  /** Geist Mono */ hoursWorked: number
  /** Geist Mono */ overtime: number
  overtimeType: OvertimeType | null
}

// ─── Egyptian Labor Law Constants ────────────────────────

export const LEAVE_ALLOWANCES = {
  annual_first_year: 15,
  annual_after_year: 21,
  annual_after_10_years_or_50: 30,
  maternity_days: 120,
  maternity_max_times: 3,
  paternity_days: 1,
  sick_total_days: 180,
  sick_first_90_pay_percent: 75,
  sick_next_90_pay_percent: 85,
  mandatory_annual_increase_percent: 3,
} as const

export const OVERTIME_RATES = {
  day: 1.35,
  night: 1.70,
  holiday: 2.00,
} as const

export const WORKING_HOURS = {
  standard_per_day: 8,
  standard_per_week: 48,
  ramadan_per_day: 6,
} as const

// ─── Compliance Status Computation ──────────────────────

/**
 * Compute compliance status from expiry dates.
 * Red = any expired (dispatch block). Yellow = any within 30 days. Green = all clear.
 */
export function getComplianceStatus(record: {
  licenseExpiry: string
  medicalExpiry: string
  certifications: Array<{ expiry: string }>
}): ComplianceStatus {
  const now = new Date()
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000

  const expiryDates = [
    new Date(record.licenseExpiry),
    new Date(record.medicalExpiry),
    ...record.certifications.map((c) => new Date(c.expiry)),
  ]

  for (const expiry of expiryDates) {
    if (expiry.getTime() < now.getTime()) {
      return 'red'
    }
  }

  for (const expiry of expiryDates) {
    if (expiry.getTime() - now.getTime() < thirtyDaysMs) {
      return 'yellow'
    }
  }

  return 'green'
}
