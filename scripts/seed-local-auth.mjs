#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
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

const quiet = process.argv.includes('--quiet')

main().catch((error) => {
	console.error(error instanceof Error ? error.message : String(error))
	process.exit(1)
})

async function main() {
	const { apiUrl, serviceRoleKey } = readLocalSupabaseEnv()
	const supabase = createClient(apiUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	})

	const customerUser = await upsertAuthUser(supabase, {
		app_metadata: { pool: 'external', roles: ['customer'] },
		email: LOCAL_ACCOUNTS.customer.email,
		phone: LOCAL_ACCOUNTS.customer.phone,
		user_metadata: {
			company_name: LOCAL_ACCOUNTS.customer.companyName,
			name: LOCAL_ACCOUNTS.customer.contactName,
		},
	})
	const customer = await upsertCustomer(supabase, customerUser.id)
	await syncCustomerProfile(supabase, customerUser.id, customer.id)

	const employeeUser = await upsertAuthUser(supabase, {
		app_metadata: { pool: 'internal', roles: EMPLOYEE_ROLES },
		email: LOCAL_ACCOUNTS.employee.email,
		phone: LOCAL_ACCOUNTS.employee.phone,
		user_metadata: { name: LOCAL_ACCOUNTS.employee.fullName },
	})
	const employee = await upsertEmployee(supabase, employeeUser.id)
	await syncEmployeeProfile(supabase, employeeUser.id, employee.id)

	const driverUser = await upsertAuthUser(supabase, {
		app_metadata: { pool: 'driver', roles: ['driver'] },
		email: LOCAL_ACCOUNTS.driver.email,
		phone: LOCAL_ACCOUNTS.driver.phone,
		user_metadata: { name: LOCAL_ACCOUNTS.driver.fullName },
	})
	const driver = await upsertDriver(supabase, driverUser.id)
	await syncDriverProfile(supabase, driverUser.id, driver.id)

	if (!quiet) {
		console.log('Local Supabase auth accounts are seeded.')
		console.log(`Customer OTP phone: ${LOCAL_ACCOUNTS.customer.phone}`)
		console.log(`Internal email: ${LOCAL_ACCOUNTS.employee.email}`)
		console.log(`Driver email: ${LOCAL_ACCOUNTS.driver.email}`)
		console.log(
			'Internal/driver password: HYPERQUOTE_LOCAL_DEV_PASSWORD or the local-only default in this script.',
		)
	}
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
	{ app_metadata, email, phone, user_metadata },
) {
	const existing = await findAuthUser(supabase, { email, phone })
	const payload = {
		app_metadata,
		email,
		email_confirm: true,
		password: LOCAL_DEV_PASSWORD,
		phone,
		phone_confirm: true,
		user_metadata,
	}

	if (existing) {
		const { data, error } = await supabase.auth.admin.updateUserById(
			existing.id,
			payload,
		)
		if (error || !data.user) {
			throw new Error(error?.message ?? `Failed to update auth user ${email}`)
		}
		return data.user
	}

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

async function upsertEmployee(supabase, userId) {
	const { data, error } = await supabase
		.from('employees')
		.upsert(
			{
				email: LOCAL_ACCOUNTS.employee.email,
				full_name: LOCAL_ACCOUNTS.employee.fullName,
				is_ceo: true,
				phone: LOCAL_ACCOUNTS.employee.phone,
				status: 'active',
				user_id: userId,
			},
			{ onConflict: 'email' },
		)
		.select('id')
		.single()

	if (error || !data) {
		throw new Error(error?.message ?? 'Failed to upsert local employee')
	}

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
