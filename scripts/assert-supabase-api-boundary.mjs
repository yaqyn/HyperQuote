import { execFileSync } from 'node:child_process'

const dbUrl =
	process.env.SUPABASE_DB_URL ??
	process.env.DATABASE_URL ??
	'postgresql://postgres:postgres@127.0.0.1:54322/postgres'

const assertions = [
	{
		name: 'public table/view privileges for anon/authenticated/public',
		sql: `
			select count(*)
			from information_schema.role_table_grants
			where table_schema = 'public'
			  and grantee in ('anon', 'authenticated', 'PUBLIC')
		`,
	},
	{
		name: 'public sequence privileges for anon/authenticated/public',
		sql: `
			select count(*)
			from information_schema.role_usage_grants
			where object_schema = 'public'
			  and object_type = 'SEQUENCE'
			  and grantee in ('anon', 'authenticated', 'PUBLIC')
		`,
	},
	{
		name: 'public SECURITY DEFINER execute privileges for anon/authenticated/public',
		sql: `
			select count(*)
			from pg_proc p
			join pg_namespace n on n.oid = p.pronamespace
			cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
			where n.nspname = 'public'
			  and p.prosecdef
			  and acl.privilege_type = 'EXECUTE'
			  and (
				acl.grantee = 0
				or acl.grantee in (
					select oid from pg_roles where rolname in ('anon', 'authenticated')
				)
			  )
		`,
	},
	{
		name: 'future public defaults for anon/authenticated/public',
		sql: `
			select count(*)
			from pg_default_acl d
			join pg_namespace n on n.oid = d.defaclnamespace
			cross join lateral aclexplode(d.defaclacl) acl
			where n.nspname = 'public'
			  and (
				acl.grantee = 0
				or acl.grantee in (
					select oid from pg_roles where rolname in ('anon', 'authenticated')
				)
			  )
		`,
	},
]

function scalar(sql) {
	return execFileSync(
		'psql',
		[dbUrl, '-X', '-v', 'ON_ERROR_STOP=1', '-Atqc', sql],
		{ encoding: 'utf8' },
	).trim()
}

const failures = []
for (const assertion of assertions) {
	const count = Number(scalar(assertion.sql))
	if (count !== 0) {
		failures.push(`${assertion.name}: ${count}`)
	}
}

if (failures.length > 0) {
	console.error('Supabase API boundary assertions failed:')
	for (const failure of failures) console.error(`- ${failure}`)
	process.exit(1)
}

console.log('Supabase API boundary assertions passed')
