#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { inspect } from 'node:util'
import { createClient } from '@supabase/supabase-js'

const LOCAL_DEV_PASSWORD =
	process.env.HYPERQUOTE_LOCAL_DEV_PASSWORD ??
	['hyperquote', 'local', 'only', '2026'].join('-')

const LOCAL_ACCOUNTS = {
	customer: {
		companyName: 'Local Cairo Contractors',
		contactName: 'Local Customer',
		email: 'local-customer@hyperquote.local',
		phone: '+201000000000',
	},
	driver: {
		email: 'local-driver@hyperquote.local',
		fullName: 'Local Driver',
		phone: '+201000000002',
		truckPlateNumber: 'HQ-LOCAL-17',
		vehicleLabel: 'Local Truck 17',
	},
	employee: {
		email: 'local-admin@hyperquote.local',
		fullName: 'Local Admin',
		phone: '+201000000001',
	},
}

const PANEL_PERMISSIONS = [
	'sales',
	'inventory',
	'warehouse',
	'finance',
	'dispatch',
	'customer_service',
	'admin',
	'search',
]

const EMPLOYEE_ROLES = [
	'admin',
	'sales',
	'inventory',
	'warehouse',
	'finance',
	'dispatch',
	'customer_service',
	'driver_manager',
	'ceo',
]

const SIMPLE_INTERNAL_ADMIN = {
	email: 'admin@admin.admin',
	fullName: 'Admin',
	isCeo: true,
	panels: PANEL_PERMISSIONS,
	password: 'admin',
	phone: '+201000000003',
	roles: EMPLOYEE_ROLES,
}

const LOCAL_ROLE_EMPLOYEES = [
	{
		email: 'local-manager@hyperquote.local',
		fullName: 'Local Sales Manager',
		panels: ['sales'],
		phone: '+201000000019',
		roles: ['sales'],
	},
	{
		email: 'local-advisor@hyperquote.local',
		fullName: 'Local Warehouse Advisor',
		panels: ['warehouse', 'dispatch'],
		phone: '+201000000020',
		roles: ['warehouse', 'dispatch'],
	},
	{
		email: 'local-sales@hyperquote.local',
		fullName: 'Local Sales',
		panels: ['sales'],
		phone: '+201000000011',
		roles: ['sales'],
	},
	{
		email: 'local-inventory@hyperquote.local',
		fullName: 'Local Inventory',
		panels: ['inventory'],
		phone: '+201000000012',
		roles: ['inventory'],
	},
	{
		email: 'local-warehouse@hyperquote.local',
		fullName: 'Local Warehouse',
		panels: ['warehouse'],
		phone: '+201000000013',
		roles: ['warehouse'],
	},
	{
		email: 'local-finance@hyperquote.local',
		fullName: 'Local Finance',
		panels: ['finance'],
		phone: '+201000000014',
		roles: ['finance'],
	},
	{
		email: 'local-dispatch@hyperquote.local',
		fullName: 'Local Dispatch',
		panels: ['dispatch'],
		phone: '+201000000015',
		roles: ['dispatch'],
	},
	{
		email: 'local-customer-service@hyperquote.local',
		fullName: 'Local Customer Service',
		panels: ['customer_service'],
		phone: '+201000000016',
		roles: ['customer_service'],
	},
	{
		email: 'local-panel-admin@hyperquote.local',
		fullName: 'Local Panel Admin',
		panels: PANEL_PERMISSIONS,
		phone: '+201000000017',
		roles: ['admin'],
	},
	{
		email: 'local-ceo@hyperquote.local',
		fullName: 'Local CEO',
		isCeo: true,
		panels: PANEL_PERMISSIONS,
		phone: '+201000000018',
		roles: ['ceo'],
	},
]

const quiet = process.argv.includes('--quiet')

main().catch((error) => {
	console.error(
		error instanceof Error ? error.message : inspect(error, { depth: 4 }),
	)
	process.exit(1)
})

async function main() {
	debugStep('read-local-env')
	const { apiUrl, serviceRoleKey } = readLocalSupabaseEnv()
	const supabase = createClient(apiUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	})

	debugStep('customer-auth')
	const customerUser = await upsertAuthUser(supabase, {
		app_metadata: { pool: 'external', roles: ['customer'] },
		email: LOCAL_ACCOUNTS.customer.email,
		phone: LOCAL_ACCOUNTS.customer.phone,
		user_metadata: {
			company_name: LOCAL_ACCOUNTS.customer.companyName,
			name: LOCAL_ACCOUNTS.customer.contactName,
		},
	})
	debugStep('customer-row')
	const customer = await upsertCustomer(supabase, customerUser.id)
	await syncCustomerProfile(supabase, customerUser.id, customer.id)
	await ensureLocalSubmittedQuoteRequest(supabase, customer.id, customerUser.id)

	debugStep('employee-auth')
	const employeeUser = await upsertAuthUser(supabase, {
		app_metadata: { pool: 'internal', roles: EMPLOYEE_ROLES },
		email: LOCAL_ACCOUNTS.employee.email,
		phone: LOCAL_ACCOUNTS.employee.phone,
		user_metadata: { name: LOCAL_ACCOUNTS.employee.fullName },
	})
	debugStep('employee-row')
	const employee = await upsertEmployee(supabase, employeeUser.id)
	await syncEmployeeProfile(supabase, employeeUser.id, employee.id)

	for (const account of [SIMPLE_INTERNAL_ADMIN, ...LOCAL_ROLE_EMPLOYEES]) {
		debugStep(`role-auth:${account.email}`)
		const roleEmployeeUser = await upsertAuthUser(supabase, {
			app_metadata: { pool: 'internal', roles: account.roles },
			email: account.email,
			password: account.password,
			phone: account.phone,
			user_metadata: { name: account.fullName },
		})
		debugStep(`role-row:${account.email}`)
		const roleEmployee = await upsertRoleEmployee(
			supabase,
			roleEmployeeUser.id,
			account,
		)
		await syncRoleEmployeeProfile(
			supabase,
			roleEmployeeUser.id,
			roleEmployee.id,
			account,
		)
	}

	debugStep('driver-auth')
	const driverUser = await upsertAuthUser(supabase, {
		app_metadata: { pool: 'driver', roles: ['driver'] },
		email: LOCAL_ACCOUNTS.driver.email,
		phone: LOCAL_ACCOUNTS.driver.phone,
		user_metadata: { name: LOCAL_ACCOUNTS.driver.fullName },
	})
	debugStep('driver-row')
	const driver = await upsertDriver(supabase, driverUser.id)
	debugStep('driver-truck')
	await upsertDriverTruck(supabase, driver.id)
	await syncDriverProfile(supabase, driverUser.id, driver.id)

	if (!quiet) {
		console.log('Local Supabase auth accounts are seeded.')
		console.log(`Customer OTP phone: ${LOCAL_ACCOUNTS.customer.phone}`)
		console.log(`Simple internal email: ${SIMPLE_INTERNAL_ADMIN.email}`)
		console.log(`Internal email: ${LOCAL_ACCOUNTS.employee.email}`)
		console.log(`Driver email: ${LOCAL_ACCOUNTS.driver.email}`)
		console.log(
			'Internal/driver password: HYPERQUOTE_LOCAL_DEV_PASSWORD or the local-only default in this script.',
		)
	}
}

function debugStep(label) {
	if (process.env.SEED_DEBUG === '1') console.error(`[seed] ${label}`)
}

function readLocalSupabaseEnv() {
	const result = spawnSync('supabase', ['status', '-o', 'env'], {
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})

	if (result.status !== 0) {
		throw new Error(
			'Local Supabase is not running. Run `bun run db:start` first.',
		)
	}

	const env = parseEnvOutput(result.stdout)
	const apiUrl = env.API_URL
	const serviceRoleKey = env.SERVICE_ROLE_KEY

	if (!apiUrl || !serviceRoleKey) {
		throw new Error('Could not read local Supabase API URL/service role key.')
	}

	return { apiUrl, serviceRoleKey }
}

function parseEnvOutput(output) {
	const env = {}
	for (const line of output.split('\n')) {
		const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
		if (!match) continue
		env[match[1]] = stripEnvQuotes(match[2])
	}
	return env
}

function stripEnvQuotes(value) {
	if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
	return value
}

async function upsertAuthUser(
	supabase,
	{ app_metadata, email, password = LOCAL_DEV_PASSWORD, phone, user_metadata },
) {
	const existing = await findAuthUser(supabase, { email, phone })
	const payload = {
		app_metadata,
		email,
		email_confirm: true,
		phone,
		phone_confirm: true,
		user_metadata,
	}

	if (existing) {
		payload.password = password
		const { data, error } = await supabase.auth.admin.updateUserById(
			existing.id,
			payload,
		)
		if (error || !data.user) {
			throw new Error(error?.message ?? `Failed to update auth user ${email}`)
		}
		return data.user
	}

	payload.password = password
	const { data, error } = await supabase.auth.admin.createUser(payload)
	if (error || !data.user) {
		throw new Error(error?.message ?? `Failed to create auth user ${email}`)
	}
	return data.user
}

async function findAuthUser(supabase, { email, phone }) {
	let page = 1
	const perPage = 100
	const normalizedPhone = normalizePhoneForAuth(phone)

	while (true) {
		const { data, error } = await supabase.auth.admin.listUsers({
			page,
			perPage,
		})
		if (error) throw new Error(error.message)

		const found = data.users.find(
			(user) =>
				user.email === email ||
				normalizePhoneForAuth(user.phone ?? '') === normalizedPhone,
		)
		if (found) return found
		if (data.users.length < perPage) return null
		page += 1
	}
}

function normalizePhoneForAuth(phone) {
	return phone.replace(/^\+/, '')
}

async function upsertCustomer(supabase, userId) {
	const { data, error } = await supabase
		.from('customers')
		.upsert(
			{
				company_name: LOCAL_ACCOUNTS.customer.companyName,
				contact_name: LOCAL_ACCOUNTS.customer.contactName,
				email: LOCAL_ACCOUNTS.customer.email,
				phone: LOCAL_ACCOUNTS.customer.phone,
				status: 'active',
				user_id: userId,
			},
			{ onConflict: 'phone' },
		)
		.select('id')
		.single()

	if (error || !data) {
		throw new Error(error?.message ?? 'Failed to upsert local customer')
	}

	const { data: existingAddress, error: addressLookupError } = await supabase
		.from('customer_addresses')
		.select('id')
		.eq('customer_id', data.id)
		.eq('label', 'Local office')
		.maybeSingle()

	if (addressLookupError) throw new Error(addressLookupError.message)

	const addressPayload = {
		area: 'Downtown',
		city: 'Cairo',
		customer_id: data.id,
		governorate: 'Cairo',
		is_default: true,
		label: 'Local office',
		phone: LOCAL_ACCOUNTS.customer.phone,
		street: '15 Local Market Street',
	}

	if (existingAddress) {
		await must(
			supabase
				.from('customer_addresses')
				.update(addressPayload)
				.eq('id', existingAddress.id),
		)
	} else {
		await must(supabase.from('customer_addresses').insert(addressPayload))
	}

	return data
}

async function ensureLocalSubmittedQuoteRequest(supabase, customerId, userId) {
	const preferredProduct = await mustReturnMaybe(
		supabase
			.from('products')
			.select('id, name, name_ar, unit_of_measure, unit_of_measure_ar')
			.eq('slug', 'portland-cement-cemi-42-5n')
			.maybeSingle(),
	)
	const product =
		preferredProduct ??
		(await mustReturnMaybe(
			supabase
				.from('products')
				.select('id, name, name_ar, unit_of_measure, unit_of_measure_ar')
				.eq('is_active', true)
				.neq('availability_status', 'hidden')
				.order('created_at', { ascending: true })
				.limit(1)
				.maybeSingle(),
		))
	if (!product) {
		throw new Error('Failed to load an active local seed product')
	}

	const notes = 'Local submitted order for portal smoke'
	const { data: existing, error: existingError } = await supabase
		.from('quote_requests')
		.select('id')
		.eq('customer_id', customerId)
		.eq('notes', notes)
		.order('created_at', { ascending: false })
		.limit(1)
		.maybeSingle()
	if (existingError) throw new Error(existingError.message)

	const quoteRequest =
		existing ??
		(await mustReturn(
			supabase
				.from('quote_requests')
				.insert({
					attachment_urls: [],
					customer_id: customerId,
					notes,
					status: 'submitted',
					submitted_at: new Date().toISOString(),
					submitted_by: userId,
					urgency: 'standard',
				})
				.select('id')
				.single(),
		))

	const { count, error: countError } = await supabase
		.from('quote_request_items')
		.select('id', { count: 'exact', head: true })
		.eq('quote_request_id', quoteRequest.id)
	if (countError) throw new Error(countError.message)
	if ((count ?? 0) > 0) return

	await must(
		supabase.from('quote_request_items').insert({
			customer_description: product.name,
			is_unmatched: false,
			match_confidence: 1,
			notes: 'Local submitted order seed item',
			product_id: product.id,
			product_name_ar: product.name_ar ?? product.name,
			quantity: 12,
			quote_request_id: quoteRequest.id,
			sort_order: 0,
			unit_of_measure: product.unit_of_measure,
			unit_of_measure_ar: product.unit_of_measure_ar ?? product.unit_of_measure,
		}),
	)
}

async function upsertEmployeeByUserOrEmail(
	supabase,
	userId,
	payload,
	errorMessage,
) {
	const { data: existingByUser, error: lookupError } = await supabase
		.from('employees')
		.select('id')
		.eq('user_id', userId)
		.maybeSingle()
	if (lookupError) throw new Error(lookupError.message)

	if (existingByUser) {
		const { data, error } = await supabase
			.from('employees')
			.update(payload)
			.eq('id', existingByUser.id)
			.select('id')
			.single()
		if (error || !data) throw new Error(error?.message ?? errorMessage)
		return data
	}

	const { data, error } = await supabase
		.from('employees')
		.upsert(payload, { onConflict: 'email' })
		.select('id')
		.single()
	if (error || !data) throw new Error(error?.message ?? errorMessage)
	return data
}

async function upsertEmployee(supabase, userId) {
	const data = await upsertEmployeeByUserOrEmail(
		supabase,
		userId,
		{
			email: LOCAL_ACCOUNTS.employee.email,
			full_name: LOCAL_ACCOUNTS.employee.fullName,
			is_ceo: true,
			phone: LOCAL_ACCOUNTS.employee.phone,
			status: 'active',
			user_id: userId,
		},
		'Failed to upsert local employee',
	)

	for (const role of EMPLOYEE_ROLES) {
		await must(
			supabase.from('employee_roles').upsert(
				{
					employee_id: data.id,
					role,
				},
				{ onConflict: 'employee_id,role' },
			),
		)
	}

	for (const panel of PANEL_PERMISSIONS) {
		await must(
			supabase.from('employee_panel_permissions').upsert(
				{
					can_read: true,
					can_write: true,
					employee_id: data.id,
					panel,
				},
				{ onConflict: 'employee_id,panel' },
			),
		)
	}

	return data
}

async function upsertDriver(supabase, userId) {
	const { data, error } = await supabase
		.from('drivers')
		.upsert(
			{
				email: LOCAL_ACCOUNTS.driver.email,
				full_name: LOCAL_ACCOUNTS.driver.fullName,
				phone: LOCAL_ACCOUNTS.driver.phone,
				status: 'available',
				user_id: userId,
				vehicle_label: LOCAL_ACCOUNTS.driver.vehicleLabel,
			},
			{ onConflict: 'phone' },
		)
		.select('id')
		.single()

	if (error || !data) {
		throw new Error(error?.message ?? 'Failed to upsert local driver')
	}
	return data
}

async function upsertDriverTruck(supabase, driverId) {
	await must(
		supabase.from('trucks').upsert(
			{
				capacity_tons: 8,
				driver_id: driverId,
				plate_number: LOCAL_ACCOUNTS.driver.truckPlateNumber,
				status: 'available',
			},
			{ onConflict: 'plate_number' },
		),
	)
}

async function upsertRoleEmployee(supabase, userId, account) {
	const data = await upsertEmployeeByUserOrEmail(
		supabase,
		userId,
		{
			email: account.email,
			full_name: account.fullName,
			is_ceo: Boolean(account.isCeo),
			phone: account.phone,
			status: 'active',
			user_id: userId,
		},
		`Failed to upsert ${account.email}`,
	)

	await must(
		supabase.from('employee_roles').delete().eq('employee_id', data.id),
	)
	for (const role of account.roles) {
		await must(
			supabase.from('employee_roles').insert({
				employee_id: data.id,
				role,
			}),
		)
	}

	await must(
		supabase
			.from('employee_panel_permissions')
			.delete()
			.eq('employee_id', data.id),
	)
	for (const panel of account.panels) {
		await must(
			supabase.from('employee_panel_permissions').insert({
				can_read: true,
				can_write: true,
				employee_id: data.id,
				panel,
			}),
		)
	}

	return data
}

async function syncCustomerProfile(supabase, userId, customerId) {
	await must(
		supabase.from('profiles').upsert(
			{
				account_type: 'customer',
				auth_user_id: userId,
				display_name: LOCAL_ACCOUNTS.customer.contactName,
				email: LOCAL_ACCOUNTS.customer.email,
				phone: LOCAL_ACCOUNTS.customer.phone,
				status: 'active',
			},
			{ onConflict: 'auth_user_id' },
		),
	)
	await upsertUserProfile(supabase, {
		customer_id: customerId,
		display_name: LOCAL_ACCOUNTS.customer.contactName,
		email: LOCAL_ACCOUNTS.customer.email,
		phone: LOCAL_ACCOUNTS.customer.phone,
		role: 'customer',
		user_id: userId,
		user_type: 'customer',
	})
	await updateAuthMetadata(supabase, userId, {
		customer_id: customerId,
		pool: 'external',
		roles: ['customer'],
	})
}

async function syncEmployeeProfile(supabase, userId, employeeId) {
	await must(
		supabase.from('profiles').upsert(
			{
				account_type: 'employee',
				auth_user_id: userId,
				display_name: LOCAL_ACCOUNTS.employee.fullName,
				email: LOCAL_ACCOUNTS.employee.email,
				phone: LOCAL_ACCOUNTS.employee.phone,
				status: 'active',
			},
			{ onConflict: 'auth_user_id' },
		),
	)
	await upsertUserProfile(supabase, {
		display_name: LOCAL_ACCOUNTS.employee.fullName,
		email: LOCAL_ACCOUNTS.employee.email,
		employee_id: employeeId,
		phone: LOCAL_ACCOUNTS.employee.phone,
		role: 'admin',
		user_id: userId,
		user_type: 'internal',
	})
	await updateAuthMetadata(supabase, userId, {
		employee_id: employeeId,
		pool: 'internal',
		roles: EMPLOYEE_ROLES,
	})
}

async function syncRoleEmployeeProfile(supabase, userId, employeeId, account) {
	await must(
		supabase.from('profiles').upsert(
			{
				account_type: 'employee',
				auth_user_id: userId,
				display_name: account.fullName,
				email: account.email,
				phone: account.phone,
				status: 'active',
			},
			{ onConflict: 'auth_user_id' },
		),
	)
	await upsertUserProfile(supabase, {
		display_name: account.fullName,
		email: account.email,
		employee_id: employeeId,
		phone: account.phone,
		role: account.roles[0],
		user_id: userId,
		user_type: 'internal',
	})
	await updateAuthMetadata(supabase, userId, {
		employee_id: employeeId,
		pool: 'internal',
		roles: account.roles,
	})
}

async function syncDriverProfile(supabase, userId, driverId) {
	await must(
		supabase.from('profiles').upsert(
			{
				account_type: 'driver',
				auth_user_id: userId,
				display_name: LOCAL_ACCOUNTS.driver.fullName,
				email: LOCAL_ACCOUNTS.driver.email,
				phone: LOCAL_ACCOUNTS.driver.phone,
				status: 'active',
			},
			{ onConflict: 'auth_user_id' },
		),
	)
	await upsertUserProfile(supabase, {
		display_name: LOCAL_ACCOUNTS.driver.fullName,
		driver_id: driverId,
		email: LOCAL_ACCOUNTS.driver.email,
		phone: LOCAL_ACCOUNTS.driver.phone,
		role: 'driver',
		user_id: userId,
		user_type: 'driver',
	})
	await updateAuthMetadata(supabase, userId, {
		driver_id: driverId,
		pool: 'driver',
		roles: ['driver'],
	})
}

async function upsertUserProfile(
	supabase,
	{
		customer_id = null,
		display_name,
		driver_id = null,
		email,
		employee_id = null,
		phone,
		role,
		user_id,
		user_type,
	},
) {
	const { data, error } = await supabase
		.from('user_profiles')
		.upsert(
			{
				customer_id,
				display_name,
				driver_id,
				email,
				employee_id,
				is_active: true,
				phone,
				user_id,
				user_type,
			},
			{ onConflict: 'user_id' },
		)
		.select('id')
		.single()

	if (error || !data) {
		throw new Error(error?.message ?? `Failed to upsert ${user_type} profile`)
	}

	await must(
		supabase.from('user_roles').upsert(
			{
				role,
				user_profile_id: data.id,
			},
			{ onConflict: 'user_profile_id,role' },
		),
	)
}

async function updateAuthMetadata(supabase, userId, appMetadata) {
	const { error } = await supabase.auth.admin.updateUserById(userId, {
		app_metadata: appMetadata,
	})
	if (error) throw new Error(error.message)
}

async function must(promise) {
	const { error } = await promise
	if (error) throw new Error(error.message)
}

async function mustReturn(promise) {
	const { data, error } = await promise
	if (error || !data) throw new Error(error?.message ?? 'Expected database row')
	return data
}

async function mustReturnMaybe(promise) {
	const { data, error } = await promise
	if (error) throw new Error(error.message)
	return data
}
