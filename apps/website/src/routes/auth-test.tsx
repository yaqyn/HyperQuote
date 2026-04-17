import { createSupabaseServerClient } from '@hyperquote/auth/server'
import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

const testSupabaseSSR = createServerFn().handler(async () => {
	try {
		// This is the go/no-go test for FOUND-03.
		// If @supabase/ssr crashes with "dynamic require of stream is not supported",
		// nodejs_compat is not working and we need the manual cookie wrapper fallback.
		const request = getRequest()

		const { client } = createSupabaseServerClient({
			request,
			supabaseUrl:
				process.env.SUPABASE_URL ?? 'https://placeholder.supabase.co',
			supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? 'placeholder',
		})

		// Try to call getSession — this exercises the cookie parsing path.
		// With placeholder credentials, we expect an auth error (not a runtime crash).
		const { data, error } = await client.auth.getSession()

		return {
			status: 'PASS' as const,
			message: 'Supabase SSR client created successfully on Workers',
			hasSession: !!data?.session,
			// An auth error (invalid credentials) is EXPECTED and means SUCCESS.
			// A runtime error (stream module) means FAILURE.
			authError: error?.message ?? null,
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err)
		const isStreamError =
			message.includes('stream') || message.includes('dynamic require')
		return {
			status: 'FAIL' as const,
			message: isStreamError
				? 'BLOCKER: @supabase/ssr stream module crash. Need manual cookie wrapper fallback.'
				: `Unexpected error: ${message}`,
			needsFallback: isStreamError,
		}
	}
})

export const Route = createFileRoute('/auth-test')({
	loader: () => testSupabaseSSR(),
	component: AuthTestPage,
})

function AuthTestPage() {
	const data = Route.useLoaderData()
	const passed = data.status === 'PASS'
	return (
		<div style={{ fontFamily: 'system-ui', padding: '2rem' }}>
			<h1>Supabase SSR on Workers: {data.status}</h1>
			<pre
				style={{
					padding: '1rem',
					background: passed ? '#d4edda' : '#f8d7da',
					borderRadius: '4px',
				}}
			>
				{JSON.stringify(data, null, 2)}
			</pre>
			{passed && (
				<p>FOUND-03 validated. Supabase SSR works on Cloudflare Workers.</p>
			)}
		</div>
	)
}
