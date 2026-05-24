import { checkRateLimit, getRateLimitStore } from '@hyperquote/auth/rate-limit'
import {
	appendSetCookieHeaders,
	createActorServiceRoleClient,
	createSupabaseServerClient,
	createSupabaseServiceRoleClient,
	getSupabaseServerUser,
	resolveSupabaseRuntimeConfig,
} from '@hyperquote/auth/server'
import { createServerFn } from '@tanstack/react-start'
import { getRequest, getResponse } from '@tanstack/react-start/server'
import { z } from 'zod'
import { logWebsiteServerError } from './server-log'

const contactInput = z.object({
	name: z.string().min(1).max(200),
	email: z.string().email(),
	phone: z
		.string()
		.regex(/^\+?20[0-9]{10}$/)
		.optional()
		.or(z.literal('')),
	subject: z.enum(['general', 'quote', 'delivery', 'billing', 'other']),
	message: z.string().min(10).max(2000),
})

export const submitContactForm = createServerFn({ method: 'POST' })
	.inputValidator(contactInput)
	.handler(async ({ data: input }) => {
		// Extract client IP for rate limiting
		const request = getRequest()
		const ip =
			request.headers.get('cf-connecting-ip') ??
			request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
			'unknown'

		// Rate limit: 5 per IP per 60 seconds
		const rateLimitStore = await getRateLimitStore()
		const rateCheck = await checkRateLimit(rateLimitStore, {
			key: `contact:${ip}`,
			limit: 5,
			windowSeconds: 60,
		})

		if (!rateCheck.allowed) {
			return {
				error: 'rate_limited' as const,
				retryAfter: rateCheck.retryAfter ?? 60,
			}
		}

		const config = await resolveSupabaseRuntimeConfig(process.env)
		if (!config) return { error: 'not_configured' as const }

		const client = await createSupabaseServiceRoleClient(process.env)
		if (!client) return { error: 'not_configured' as const }

		try {
			const {
				client: authClient,
				responseCookies,
				responseHeaders,
			} = createSupabaseServerClient({
				request,
				...config,
			})
			const {
				data: { user },
			} = await getSupabaseServerUser({
				client: authClient,
				cookieDomain: config.cookieDomain,
				cookieName: config.cookieName,
				request,
				responseHeaders: getResponse().headers,
			})
			appendSetCookieHeaders(
				getResponse().headers,
				responseCookies.values(),
				responseHeaders.entries(),
			)

			const ticketClient =
				user?.app_metadata?.pool === 'external'
					? createActorServiceRoleClient({
							actorPool: 'external',
							actorUserId: user.id,
							client,
						})
					: client

			const { data: ticket, error } = await ticketClient.rpc(
				'create_support_ticket',
				{
					p_client_key: ip,
					p_message: input.message,
					p_requester_email: input.email,
					p_requester_name: input.name,
					p_requester_phone: input.phone || null,
					p_source: 'website',
					p_subject: input.subject,
				},
			)

			if (error || !ticket) {
				if (error?.message.includes('support_ticket_rate_limited')) {
					return { error: 'rate_limited' as const, retryAfter: 60 }
				}
				logWebsiteServerError('website.support.ticket_create_failed', error)
				return { error: 'submit_failed' as const }
			}

			return { ticketId: ticket.reference }
		} catch (err) {
			logWebsiteServerError('website.support.unexpected_error', err)
			return { error: 'submit_failed' as const }
		}
	})
