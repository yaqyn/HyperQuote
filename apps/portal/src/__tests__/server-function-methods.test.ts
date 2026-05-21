import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const repoRoot = process.cwd().endsWith('apps/portal')
	? join(process.cwd(), '../..')
	: process.cwd()
const portalRoot = join(repoRoot, 'apps/portal')
const serverFunctionSourceRoots = [
	'apps/website/src',
	'apps/portal/src',
	'apps/internal/src',
] as const
const payloadOverGetPattern =
	/createServerFn\(\s*(?:\{\s*method:\s*['"]GET['"]\s*,?\s*\})?\s*\)\s*\n\s*\.inputValidator/g

function sourceFilesUnder(root: string): string[] {
	return readdirSync(root).flatMap((entry) => {
		const path = join(root, entry)
		const stats = statSync(path)
		if (stats.isDirectory()) return sourceFilesUnder(path)
		if (!/\.[cm]?[tj]sx?$/.test(entry) || entry === 'routeTree.gen.ts')
			return []
		return [path]
	})
}

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
			'requestPhoneChange',
			'verifyPhoneChange',
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
		exports: ['getDeliverySecret'],
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

	it('keeps server function payloads out of GET URLs', () => {
		const offenders = serverFunctionSourceRoots.flatMap((root) =>
			sourceFilesUnder(join(repoRoot, root)).flatMap((file) => {
				const source = readFileSync(file, 'utf8')
				payloadOverGetPattern.lastIndex = 0
				return payloadOverGetPattern.test(source)
					? [relative(repoRoot, file)]
					: []
			}),
		)

		expect(offenders).toEqual([])
	})
})
