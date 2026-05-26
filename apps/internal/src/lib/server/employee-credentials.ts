import type { SupabaseClient } from '@supabase/supabase-js'
import { getInternalSupabasePasswordClient } from './_supabase'

interface EmployeeRoleRow {
	role: string
}

interface EmployeePanelPermissionRow {
	can_write: boolean
	panel: string
}

interface EmployeeCredentialRow {
	id: string
	user_id: string | null
	full_name: string
	email: string
	status: string
	is_ceo: boolean
	employee_panel_permissions: EmployeePanelPermissionRow[] | null
	employee_roles: EmployeeRoleRow[] | null
}

interface VerifiedEmployee {
	id: string
	name: string
	email: string
}

export type EmployeeCredentialResult =
	| { success: true; employee: VerifiedEmployee }
	| { success: false; error: string }

export async function verifyEmployeeCredential({
	allowedPanels = new Set(),
	allowedRoles,
	client,
	employeeId,
	method,
	password,
}: {
	allowedPanels?: ReadonlySet<string>
	allowedRoles: ReadonlySet<string>
	client: SupabaseClient
	employeeId: string
	method: 'password' | 'qr'
	password: string
}): Promise<EmployeeCredentialResult> {
	if (method !== 'password') {
		return {
			success: false,
			error: 'Badge signoff is not configured for this employee.',
		}
	}

	const { data, error } = await client
		.from('employees')
		.select(
			'id, user_id, full_name, email, status, is_ceo, employee_roles(role), employee_panel_permissions(panel, can_write)',
		)
		.eq('id', employeeId)
		.maybeSingle()
	if (error) return { success: false, error: error.message }
	if (!data) return { success: false, error: 'Employee not found' }

	const employee = data as unknown as EmployeeCredentialRow
	if (employee.status !== 'active') {
		return { success: false, error: 'Employee is not active' }
	}
	if (!employee.user_id) {
		return {
			success: false,
			error: 'Employee does not have an internal login account',
		}
	}

	const roles = new Set(
		(employee.employee_roles ?? []).map((role) => role.role),
	)
	const writePanels = new Set(
		(employee.employee_panel_permissions ?? [])
			.filter((permission) => permission.can_write)
			.map((permission) => permission.panel),
	)
	const roleAllowed =
		employee.is_ceo ||
		roles.has('admin') ||
		[...allowedRoles].some((role) => roles.has(role)) ||
		[...allowedPanels].some((panel) => writePanels.has(panel))
	if (!roleAllowed) {
		return { success: false, error: 'Employee role cannot sign this action' }
	}

	const passwordClient = await getInternalSupabasePasswordClient()
	const trimmedPassword = password.trim()
	if (!trimmedPassword) return { success: false, error: 'Password is required' }

	const { data: signInData, error: signInError } =
		await passwordClient.auth.signInWithPassword({
			email: employee.email,
			password: trimmedPassword,
		})
	await passwordClient.auth.signOut({ scope: 'local' })

	if (signInError || !signInData.user) {
		return { success: false, error: 'Invalid employee password' }
	}
	if (signInData.user.id !== employee.user_id) {
		return { success: false, error: 'Password belongs to a different account' }
	}
	if (signInData.user.app_metadata?.pool !== 'internal') {
		return { success: false, error: 'Account is not an internal employee' }
	}

	return {
		success: true,
		employee: {
			email: employee.email,
			id: employee.id,
			name: employee.full_name,
		},
	}
}
