import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

// ============================================================================
// Server function: check if we're in dev mode
// ============================================================================

const checkDevMode = createServerFn({ method: 'GET' }).handler(async () => {
	const isDev =
		!process.env.SUPABASE_URL ||
		process.env.SUPABASE_URL === 'https://placeholder.supabase.co'
	return { isDev }
})

// ============================================================================
// Route search params
// ============================================================================

const loginSearchSchema = z.object({
	redirect: z.string().optional(),
})

// ============================================================================
// Route
// ============================================================================

export const Route = createFileRoute('/login')({
	validateSearch: loginSearchSchema,
	loaderDeps: ({ search }) => ({ redirectTo: search.redirect }),
	loader: async ({ deps }) => {
		const { isDev } = await checkDevMode()

		// Dev mode: auto-redirect to home (auth is mocked in _ceo.tsx beforeLoad)
		if (isDev) {
			throw redirect({ to: deps.redirectTo ?? '/' })
		}

		return { isDev }
	},
	component: LoginPage,
})

// ============================================================================
// Component (shown only when NOT in dev mode and real auth is needed)
// ============================================================================

function LoginPage() {
	return (
		<div className="flex h-dvh w-full flex-col items-center justify-center bg-[var(--color-bg)]">
			<h1 className="text-2xl font-semibold text-[var(--color-text)]">
				CEO Login
			</h1>
			<p className="mt-2 text-[var(--color-text-muted)]">
				Biometric, PIN, or OTP authentication required.
			</p>
			<p className="mt-6 text-sm text-[var(--color-text-subtle)]">
				Real authentication deferred to integration phase.
			</p>
		</div>
	)
}
