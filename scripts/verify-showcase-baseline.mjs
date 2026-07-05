#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { inspect } from 'node:util'
import { createClient } from '@supabase/supabase-js'
import {
	productionSupabaseDatabaseUrl,
	repoRoot,
} from './production-config.mjs'

const args = new Set(process.argv.slice(2))
const production = args.has('--production')
const exactAuth = args.has('--exact-auth')
const expectedPassword = '123456'
const expectedEmails = [
	'customer@hyperquote.net',
	'admin@hyperquote.net',
	'manager@hyperquote.net',
	'advisor@hyperquote.net',
	'driver@hyperquote.net',
]
const expectedCategories = [
	{ name: 'Cement Products', slug: 'cement' },
	{ name: 'Steel Products', slug: 'steel' },
	{ name: 'Wood Products', slug: 'timber' },
]
const expectedProducts = [
	{ category: 'cement', name: 'Ezz Al Arab White Cement' },
	{ category: 'cement', name: 'Modern White Cement' },
	{ category: 'cement', name: 'Lafarge Portland Cement' },
	{ category: 'cement', name: 'Suez Portland Cement' },
	{ category: 'cement', name: 'Cemex Ready Mix Concrete C25' },
	{ category: 'cement', name: 'Lafarge Ready Mix Concrete C30' },
	{ category: 'steel', name: 'Ezz Rebar 12mm' },
	{ category: 'steel', name: 'Beshay Rebar 16mm' },
	{ category: 'steel', name: 'Egyptian Steel Mesh A142' },
	{ category: 'steel', name: 'Ezz Welded Mesh A193' },
	{ category: 'steel', name: 'Beshay IPE Steel Profile' },
	{ category: 'steel', name: 'Suez Steel Angle Profile' },
	{ category: 'timber', name: 'Swedish Pine Timber' },
	{ category: 'timber', name: 'Romanian Whitewood Timber' },
	{ category: 'timber', name: 'Marine Plywood 18mm' },
	{ category: 'timber', name: 'Film Faced Plywood 18mm' },
	{ category: 'timber', name: 'Red Formwork Board' },
	{ category: 'timber', name: 'White Formwork Board' },
]

main().catch((error) => {
	console.error(error instanceof Error ? error.message : inspect(error))
	process.exit(1)
})

async function main() {
	const dbUrl = readDatabaseUrl()
	const { apiUrl, serviceRoleKey, anonKey } = production
		? readProductionApiEnv()
		: readLocalApiEnv()
	const categories = readJson(dbUrl, activeCategoriesSql())
	const products = readJson(dbUrl, activeProductsSql())
	const trucks = readJson(dbUrl, driverTruckSql())

	assertCategories(categories)
	assertProducts(products)
	assertDriverTruck(trucks)

	const supabase = createClient(apiUrl, serviceRoleKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	})
	await assertAuthUsers(supabase)
	if (anonKey) await assertPasswordSignIns(apiUrl, anonKey)

	console.log('Showcase baseline verification passed')
}

function readDatabaseUrl() {
	const explicitUrl =
		process.env.SUPABASE_DB_URL?.trim() ?? process.env.DATABASE_URL?.trim()
	const dbUrl = explicitUrl
		? explicitUrl
		: production
			? productionSupabaseDatabaseUrl()
			: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
	if (!dbUrl) {
		throw new Error(
			'Cannot verify showcase baseline. Missing SUPABASE_DB_URL or production database credentials.',
		)
	}
	return dbUrl
}

function readProductionApiEnv() {
	const apiUrl = process.env.SUPABASE_URL?.trim()
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
	const anonKey = process.env.SUPABASE_ANON_KEY?.trim()
	const missing = []
	if (!apiUrl) missing.push('SUPABASE_URL')
	if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
	if (missing.length > 0) {
		throw new Error(
			`Cannot verify production showcase baseline. Missing env: ${missing.join(', ')}`,
		)
	}
	return { anonKey, apiUrl, serviceRoleKey }
}

function readLocalApiEnv() {
	const result = spawnSync('supabase', ['status', '-o', 'env'], {
		cwd: repoRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.status !== 0) {
		throw new Error('Local Supabase is not running. Run `bun run db:start`.')
	}
	const env = parseEnvOutput(result.stdout)
	const apiUrl = env.API_URL
	const serviceRoleKey = env.SERVICE_ROLE_KEY
	const anonKey = env.ANON_KEY
	if (!apiUrl || !serviceRoleKey) {
		throw new Error('Could not read local Supabase API URL/service role key.')
	}
	return { anonKey, apiUrl, serviceRoleKey }
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

function readJson(dbUrl, sql) {
	try {
		const output = execFileSync(
			'psql',
			[dbUrl, '-X', '-v', 'ON_ERROR_STOP=1', '-Atqc', sql],
			{
				cwd: repoRoot,
				encoding: 'utf8',
				stdio: ['ignore', 'pipe', 'pipe'],
			},
		).trim()
		return JSON.parse(output || '[]')
	} catch (error) {
		throw new Error(
			`Showcase verification query failed: ${redactPsqlError(error, dbUrl)}`,
		)
	}
}

function activeCategoriesSql() {
	return `
		select coalesce(jsonb_agg(to_jsonb(row) order by row.slug), '[]'::jsonb)::text
		from (
			select slug, name, name_ar
			from public.categories
			where is_active
		) row
	`
}

function activeProductsSql() {
	return `
		select coalesce(jsonb_agg(to_jsonb(row) order by row.category, row.name), '[]'::jsonb)::text
		from (
			select
				p.slug,
				p.sku,
				p.name,
				p.name_ar,
				p.category,
				p.availability_status,
				p.price_range_min::float8 as price_range_min,
				p.price_range_max::float8 as price_range_max,
				coalesce(s.on_hand_quantity, 0)::float8 as on_hand_quantity,
				coalesce(s.minimum_quantity, 0)::float8 as minimum_quantity,
				coalesce(s.good_quantity, 0)::float8 as good_quantity,
				count(spl.id)::int as supplier_links
			from public.products p
			left join public.inventory_stock s on s.product_id = p.id
			left join public.supplier_product_links spl on spl.product_id = p.id
			where p.is_active
			group by p.id, s.id
		) row
	`
}

function driverTruckSql() {
	return `
		select coalesce(jsonb_agg(to_jsonb(row) order by row.plate_number), '[]'::jsonb)::text
		from (
			select
				d.email,
				d.user_id::text as user_id,
				d.vehicle_label,
				t.id::text as truck_id,
				t.driver_id::text as truck_driver_id,
				t.plate_number,
				t.status
			from public.drivers d
			join public.trucks t on t.driver_id = d.id
			where lower(d.email) = 'driver@hyperquote.net'
		) row
	`
}

function assertCategories(categories) {
	const actual = new Map(
		categories.map((category) => [category.slug, category]),
	)
	for (const expected of expectedCategories) {
		const category = actual.get(expected.slug)
		if (!category || category.name !== expected.name || !category.name_ar) {
			throw new Error(`Missing showcase category ${expected.name}.`)
		}
	}
}

function assertProducts(products) {
	const actual = new Map(
		products.map((product) => [`${product.category}:${product.name}`, product]),
	)
	for (const expected of expectedProducts) {
		const product = actual.get(`${expected.category}:${expected.name}`)
		if (!product) throw new Error(`Missing showcase product ${expected.name}.`)
		if (!product.name_ar) {
			throw new Error(`Showcase product ${expected.name} is missing Arabic.`)
		}
		if (product.availability_status !== 'available') {
			throw new Error(`Showcase product ${expected.name} is not available.`)
		}
		if (
			product.on_hand_quantity <= 0 ||
			product.good_quantity < product.minimum_quantity ||
			product.price_range_min <= 0 ||
			product.price_range_max < product.price_range_min ||
			product.supplier_links < 1
		) {
			throw new Error(`Showcase product ${expected.name} is incomplete.`)
		}
	}
}

function assertDriverTruck(trucks) {
	if (trucks.length !== 1) {
		throw new Error(`Expected one driver truck, found ${trucks.length}.`)
	}
	const [truck] = trucks
	if (
		truck.email !== 'driver@hyperquote.net' ||
		truck.plate_number !== 'HQ-TRUCK-1' ||
		truck.vehicle_label !== 'Truck 1' ||
		truck.status !== 'available'
	) {
		throw new Error('Driver truck baseline does not match the showcase spec.')
	}
}

async function assertAuthUsers(supabase) {
	const users = await listAuthUsers(supabase)
	const emails = users
		.map((user) => user.email?.trim().toLowerCase())
		.filter(Boolean)
	const missing = expectedEmails.filter((email) => !emails.includes(email))
	if (missing.length > 0) {
		throw new Error(`Missing showcase auth users: ${missing.join(', ')}`)
	}
	if (exactAuth) {
		const extra = emails.filter((email) => !expectedEmails.includes(email))
		if (extra.length > 0) {
			throw new Error(`Unexpected auth users after reset: ${extra.join(', ')}`)
		}
	}
}

async function listAuthUsers(supabase) {
	const users = []
	let page = 1
	const perPage = 100
	while (true) {
		const { data, error } = await supabase.auth.admin.listUsers({
			page,
			perPage,
		})
		if (error) throw new Error(error.message)
		users.push(...data.users)
		if (data.users.length < perPage) return users
		page += 1
	}
}

async function assertPasswordSignIns(apiUrl, anonKey) {
	const client = createClient(apiUrl, anonKey, {
		auth: {
			autoRefreshToken: false,
			persistSession: false,
		},
	})
	for (const email of expectedEmails) {
		const { error } = await client.auth.signInWithPassword({
			email,
			password: expectedPassword,
		})
		if (error) throw new Error(`Showcase password sign-in failed for ${email}.`)
		await client.auth.signOut({ scope: 'local' })
	}
}

function redactPsqlError(error, dbUrl) {
	const stderr = error?.stderr?.toString?.().trim()
	const message =
		error instanceof Error ? error.message : String(error ?? 'unknown error')
	return (stderr || message).replaceAll(dbUrl, '[redacted-db-url]')
}
