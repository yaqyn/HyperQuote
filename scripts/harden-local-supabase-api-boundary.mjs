import { execFileSync } from 'node:child_process'

const dbUrl =
	process.env.SUPABASE_ADMIN_DB_URL ??
	'postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres'

const sql = `
alter default privileges for role supabase_admin in schema public
	revoke all on tables from public, anon, authenticated;
alter default privileges for role supabase_admin in schema public
	revoke all on sequences from public, anon, authenticated;
alter default privileges for role supabase_admin in schema public
	revoke execute on functions from public, anon, authenticated;

alter default privileges for role supabase_admin in schema public
	grant all on tables to service_role;
alter default privileges for role supabase_admin in schema public
	grant usage, select on sequences to service_role;
alter default privileges for role supabase_admin in schema public
	grant execute on functions to service_role;
`

execFileSync('psql', [dbUrl, '-X', '-v', 'ON_ERROR_STOP=1', '-Atqc', sql], {
	stdio: 'pipe',
})

console.log('Hardened local supabase_admin default API privileges')
