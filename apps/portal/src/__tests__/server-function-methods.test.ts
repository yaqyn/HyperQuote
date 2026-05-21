import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const portalRoot = process.cwd().endsWith('apps/portal')
	? process.cwd()
	: join(process.cwd(), 'apps/portal')

const mutatingServerFunctions = [
	{
		file: 'lib/auth.ts',
		exports: [
			'signOutPortalAccount',
			'signInWithEmailPassword',
			'sendOTP',
			'verifyOTP',
			'createAccount',
			'claimAccount',
		],
	},
	{
		file: 'lib/server/approvals.ts',
		exports: ['submitForApproval'],
	},
	{
		file: 'lib/server/addresses.ts',
		exports: ['createAddress'],
	},
	{
		file: 'lib/server/deliveries.ts',
		exports: [
			'getDeliverySecret',
			'confirmDropShipDelivery',
			'disputeDropShipDelivery',
		],
	},
	{
		file: 'lib/server/notifications.ts',
		exports: ['markNotificationRead', 'markAllNotificationsRead'],
	},
	{
		file: 'lib/server/orders.ts',
		exports: ['deleteOrder', 'saveOrderAsDraft'],
	},
	{
		file: 'lib/server/quote-attachments.ts',
		exports: ['uploadQuoteAttachment'],
	},
	{
		file: 'lib/server/quote-requests.ts',
		exports: ['submitQuoteRequest', 'saveDraft'],
	},
	{
		file: 'lib/server/quotes.ts',
		exports: [
			'acceptQuote',
			'rejectQuote',
			'submitCounterOffer',
			'submitPartialResponse',
		],
	},
	{
		file: 'lib/server/settings.ts',
		exports: [
			'updateCustomerProfile',
			'uploadTradeLicense',
			'uploadProfilePhoto',
			'saveAddress',
			'deleteAddress',
			'saveProject',
			'archiveProject',
			'updateNotificationPreferences',
			'signOutSession',
		],
	},
	{
		file: 'lib/server/supplier-catalog.ts',
		exports: ['uploadCatalog'],
	},
	{
		file: 'lib/server/supplier-invoices.ts',
		exports: ['submitSupplierInvoice'],
	},
	{
		file: 'lib/server/supplier-orders.ts',
		exports: ['confirmPO', 'rejectPO', 'uploadDeliveryNote'],
	},
	{
		file: 'lib/server/supplier-stock.ts',
		exports: ['updateSupplierStock', 'bulkUpdatePrices'],
	},
	{
		file: 'lib/server/team.ts',
		exports: [
			'inviteTeamMember',
			'removeTeamMember',
			'changeTeamMemberRole',
			'transferOwnership',
		],
	},
] satisfies Array<{ exports: string[]; file: string }>

describe('server function methods', () => {
	it('keeps mutating portal server functions on POST', () => {
		for (const entry of mutatingServerFunctions) {
			const source = readFileSync(join(portalRoot, 'src', entry.file), 'utf8')

			for (const exportName of entry.exports) {
				expect(
					source,
					`${entry.file}#${exportName} must not send mutation payloads through a GET URL`,
				).toMatch(
					new RegExp(
						`export\\s+const\\s+${exportName}\\s*=\\s*createServerFn\\(\\{\\s*method:\\s*['"]POST['"]\\s*\\}\\)`,
					),
				)
			}
		}
	})
})
