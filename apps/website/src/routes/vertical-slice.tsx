import { createSupabaseServerClient } from '@hyperquote/auth/server'
import {
	type ColumnDef,
	createColumnHelper,
	DataTable,
} from '@hyperquote/tables'
import {
	CurrencyDisplay,
	DateDisplay,
	EmptyState,
	GlassWindow,
	StatusBadge,
	UnitDisplay,
} from '@hyperquote/ui'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getTheme, toggleTheme } from '../lib/theme'

// ---------------------------------------------------------------------------
// Server function: fetch role_permissions from Supabase via RLS
// ---------------------------------------------------------------------------
const fetchPermissions = createServerFn().handler(async () => {
	const request = getRequest()
	const { client } = createSupabaseServerClient({
		request,
		supabaseUrl: process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co',
		supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'placeholder',
	})

	// This query runs with the user's JWT.
	// RLS policy on role_permissions: "read_all" allows SELECT for authenticated users.
	// If user is NOT authenticated, RLS will return empty results (not an error).
	const { data, error } = await client
		.from('role_permissions')
		.select('id, role, permission')
		.limit(20)

	return {
		permissions: data ?? [],
		error: error?.message ?? null,
		timestamp: new Date().toISOString(),
		authenticated: data !== null && data.length > 0,
	}
})

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------
export const Route = createFileRoute('/vertical-slice')({
	loader: () => fetchPermissions(),
	component: VerticalSlicePage,
})

// ---------------------------------------------------------------------------
// Column definitions for DataTable
// ---------------------------------------------------------------------------
type Permission = { id: number; role: string; permission: string }

const columnHelper = createColumnHelper<Permission>()
const columns: ColumnDef<Permission>[] = [
	columnHelper.accessor('id', { header: '#', cell: (info) => info.getValue() }),
	columnHelper.accessor('role', { header: 'Role' }),
	columnHelper.accessor('permission', { header: 'Permission' }),
] as ColumnDef<Permission>[]

// ---------------------------------------------------------------------------
// Page component: proves ALL 7 packages work end-to-end
// ---------------------------------------------------------------------------
function VerticalSlicePage() {
	const data = Route.useLoaderData()
	const { t, i18n } = useTranslation()
	const locale = i18n.language === 'ar' ? 'ar' : 'en'
	const [windowOpen, setWindowOpen] = useState(false)
	const [theme, setThemeState] = useState<'light' | 'dark'>(() =>
		typeof document !== 'undefined' ? getTheme() : 'light',
	)

	function toggleLocale() {
		const next = locale === 'ar' ? 'en' : 'ar'
		i18n.changeLanguage(next)
	}

	function handleToggleTheme() {
		toggleTheme()
		setThemeState(getTheme())
	}

	return (
		<div className="min-h-screen bg-[var(--color-base)] text-[var(--color-text)] p-8">
			<div className="max-w-[1280px] mx-auto">
				{/* Header: title + toggles */}
				<div className="flex items-center justify-between mb-8">
					<h1 className="text-[var(--text-3xl)] font-semibold">
						{t('greeting')} — Vertical Slice
					</h1>
					<div className="flex gap-3">
						<button
							type="button"
							onClick={toggleLocale}
							className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] text-[var(--text-sm)] font-medium hover:bg-[var(--color-primary)] hover:text-white transition-colors"
						>
							{locale === 'ar' ? 'EN' : 'AR'}
						</button>
						<button
							type="button"
							onClick={handleToggleTheme}
							className="px-3 py-1.5 rounded-lg bg-[var(--color-surface)] text-[var(--text-sm)] font-medium hover:bg-[var(--color-primary)] hover:text-white transition-colors"
						>
							{theme === 'dark' ? 'Light' : 'Dark'}
						</button>
					</div>
				</div>

				{/* Auth status */}
				<div className="mb-6">
					<StatusBadge status={data.authenticated ? 'success' : 'warning'}>
						{data.authenticated
							? 'Authenticated — RLS returned data'
							: 'Not authenticated — RLS returned empty results'}
					</StatusBadge>
					{!data.authenticated && (
						<p className="mt-2 text-[var(--text-sm)] text-[var(--color-text-muted)]">
							Sign in via Supabase to see role_permissions data.
						</p>
					)}
				</div>

				{/* Display components showcase */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
					<div className="p-4 rounded-lg bg-[var(--color-surface)]">
						<p className="text-[var(--text-sm)] text-[var(--color-text-muted)] mb-1">
							Currency
						</p>
						<CurrencyDisplay value={56400} />
					</div>
					<div className="p-4 rounded-lg bg-[var(--color-surface)]">
						<p className="text-[var(--text-sm)] text-[var(--color-text-muted)] mb-1">
							Date
						</p>
						<DateDisplay date={data.timestamp} />
					</div>
					<div className="p-4 rounded-lg bg-[var(--color-surface)]">
						<p className="text-[var(--text-sm)] text-[var(--color-text-muted)] mb-1">
							Unit
						</p>
						<UnitDisplay value={500} unit="kg" />
					</div>
				</div>

				{/* Status badges */}
				<div className="flex gap-2 mb-8 flex-wrap">
					<StatusBadge status="success">Delivered</StatusBadge>
					<StatusBadge status="warning">Pending</StatusBadge>
					<StatusBadge status="error">Failed</StatusBadge>
					<StatusBadge status="info">In Transit</StatusBadge>
					<StatusBadge status="neutral">Draft</StatusBadge>
				</div>

				{/* GlassWindow with DataTable */}
				<button
					type="button"
					onClick={() => setWindowOpen(true)}
					className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-[var(--text-sm)] font-medium hover:bg-[var(--color-primary-hover)] transition-colors"
				>
					Open Glass Window
				</button>

				<GlassWindow isOpen={windowOpen} onClose={() => setWindowOpen(false)}>
					<div className="p-6">
						<h2 className="text-[var(--text-xl)] font-semibold mb-4">
							Role Permissions (RLS-enforced)
						</h2>
						{data.permissions.length > 0 ? (
							<DataTable
								data={data.permissions as Permission[]}
								columns={columns}
							/>
						) : (
							<EmptyState
								title="No data"
								description="Sign in to see RLS-protected data from role_permissions table."
							/>
						)}
					</div>
				</GlassWindow>
			</div>
		</div>
	)
}
