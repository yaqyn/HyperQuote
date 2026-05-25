import { createFileRoute } from '@tanstack/react-router'
import { handleResendInboundEmailWebhook } from '../../../../lib/server/support-email-inbound'

export const Route = createFileRoute('/api/email/inbound/resend')({
	server: {
		handlers: {
			POST: async ({ request }) => handleResendInboundEmailWebhook(request),
		},
	},
})
