import { hasPermission } from '@hyperquote/auth'
import { authGuard } from '@hyperquote/auth/guard'
import { resolveSupabaseRuntimeConfig } from '@hyperquote/auth/server'
import { signLogisUpdateRequest } from '@hyperquote/runtime/logis-update'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { getInternalSupabasePasswordClient } from './_supabase'

const updateInput = z.object({
	confirmation: z.string(),
	password: z.string().min(1),
})

export const getLogisUpdateStatus = createServerFn({ method: 'GET' }).handler(
	async () => {
		const auth = await requireUpdateAdmin()
		return {
			canUpdate: canRequestLogisUpdate(auth),
			changelogUrl:
				process.env.LOGIS_CHANGELOG_URL ??
				'https://github.com/yaqyn/HyperQuote/releases',
			companySlug: process.env.LOGIS_COMPANY_SLUG ?? 'hyperquote',
			configured: Boolean(
				process.env.LOGIS_CONTROL_URL &&
					process.env.LOGIS_UPDATE_SIGNING_SECRET,
			),
			currentVersion: process.env.LOGIS_VERSION || 'local',
			lastDeployStatusUrl: process.env.LOGIS_DEPLOY_STATUS_URL ?? null,
			releaseChannel: process.env.LOGIS_RELEASE_CHANNEL ?? 'stable',
		}
	},
)

export const requestLogisStableUpdate = createServerFn({ method: 'POST' })
	.inputValidator(updateInput)
	.handler(async ({ data }) => {
		const auth = await requireUpdateAdmin()
		if (!canRequestLogisUpdate(auth)) return { ok: false, error: 'forbidden' }

		const companySlug = process.env.LOGIS_COMPANY_SLUG ?? 'hyperquote'
		if (data.confirmation !== `UPDATE ${companySlug}`) {
			return { ok: false, error: 'confirmation_required' }
		}
		const passwordOk = await validatePassword(
			auth.user.email,
			auth.user.id,
			data.password,
		)
		if (!passwordOk) return { ok: false, error: 'password_required' }

		const controlUrl = process.env.LOGIS_CONTROL_URL
		const secret = process.env.LOGIS_UPDATE_SIGNING_SECRET
		if (!controlUrl || !secret) return { ok: false, error: 'not_configured' }

		const request = await signLogisUpdateRequest(
			{
				actorUserId: auth.user.id,
				companySlug,
				requestId: crypto.randomUUID(),
				timestamp: new Date().toISOString(),
				version: 'stable',
			},
			secret,
		)
		const response = await fetch(controlUrl, {
			body: JSON.stringify(request),
			headers: { 'content-type': 'application/json; charset=utf-8' },
			method: 'POST',
			signal: AbortSignal.timeout(15_000),
		})
		if (!response.ok) {
			return { ok: false, error: 'dispatch_failed' }
		}
		return { ok: true, requestId: request.requestId }
	})

async function requireUpdateAdmin() {
	const config = await resolveSupabaseRuntimeConfig(process.env)
	if (!config) throw new Error('Supabase is required for LOGIS updates')
	return authGuard({
		...config,
		loginPath: '/login',
		requiredPool: 'internal',
	})
}

function canRequestLogisUpdate(
	auth: Awaited<ReturnType<typeof requireUpdateAdmin>>,
) {
	return hasPermission(auth, 'admin.update') || auth.roles.includes('ceo')
}

async function validatePassword(
	email: string | undefined,
	userId: string,
	password: string,
) {
	if (!email) return false
	const passwordClient = await getInternalSupabasePasswordClient()
	const { data, error } = await passwordClient.auth.signInWithPassword({
		email,
		password,
	})
	await passwordClient.auth.signOut({ scope: 'local' })
	return (
		!error &&
		data.user?.id === userId &&
		data.user.app_metadata?.pool === 'internal'
	)
}
