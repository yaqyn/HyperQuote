export const PORTAL_CHAT_COMMANDS = [
	{
		description: 'Start a clean chat page without contacting the server.',
		name: '/clear',
		scope: 'local',
		title: 'Clear chat',
	},
	{
		description: 'Show this command menu with the safest shortcuts.',
		name: '/help',
		scope: 'server',
		title: 'Command guide',
	},
	{
		description: 'List visible catalog products, with optional search terms.',
		name: '/products',
		scope: 'server',
		title: 'Products',
	},
	{
		description: 'Open catalog and draft quote shortcuts.',
		name: '/market',
		scope: 'server',
		title: 'Market',
	},
	{
		description: 'Compare visible catalog products for a material need.',
		name: '/compare-products',
		scope: 'server',
		title: 'Compare products',
	},
	{
		description: 'Get material suggestions without writing to a draft.',
		name: '/recommend-materials',
		scope: 'server',
		title: 'Recommend materials',
	},
	{
		description: 'Start a new draft quote from the portal quote drawer.',
		name: '/new-draft',
		scope: 'server',
		title: 'New draft',
	},
	{
		description: 'Show the live quote drawer cart saved in this browser.',
		name: '/cart',
		scope: 'local',
		title: 'Cart',
	},
	{
		description: 'List customer-owned quote requests and orders.',
		name: '/orders',
		scope: 'server',
		title: 'Orders',
	},
	{
		description: 'List editable customer-owned drafts.',
		name: '/drafts',
		scope: 'server',
		title: 'Drafts',
	},
	{
		description: 'Show one editable draft by reference or description.',
		name: '/draft',
		scope: 'server',
		title: 'Draft detail',
	},
	{
		description: 'Open one editable draft in the chat draft desk.',
		name: '/edit-draft',
		scope: 'server',
		title: 'Edit draft',
	},
	{
		description: 'Delete one editable draft by reference or description.',
		name: '/delete-draft',
		scope: 'server',
		title: 'Delete draft',
	},
	{
		description: 'Clear all item lines from one editable draft.',
		name: '/clear-draft',
		scope: 'server',
		title: 'Clear draft',
	},
	{
		description: 'Rename one editable draft.',
		name: '/rename-draft',
		scope: 'server',
		title: 'Rename draft',
	},
	{
		description: 'Update the simple note on one editable draft.',
		name: '/note-draft',
		scope: 'server',
		title: 'Draft note',
	},
	{
		description: 'Validate one editable draft for unavailable or stale items.',
		name: '/validate-draft',
		scope: 'server',
		title: 'Validate draft',
	},
	{
		description: 'Add available catalog products to one editable draft.',
		name: '/add-to-draft',
		scope: 'server',
		title: 'Add to draft',
	},
	{
		description: 'Replace one draft item with another catalog product.',
		name: '/replace-draft-item',
		scope: 'server',
		title: 'Replace draft item',
	},
	{
		description: 'Set delivery date or saved address on one editable draft.',
		name: '/set-draft-delivery',
		scope: 'server',
		title: 'Set draft delivery',
	},
	{
		description: 'Copy a previous quote request or order into a new draft.',
		name: '/reorder',
		scope: 'server',
		title: 'Reorder',
	},
	{
		description: 'Show the latest customer-owned quote request or order.',
		name: '/latest-order',
		scope: 'server',
		title: 'Latest order',
	},
	{
		description: 'Show status for one quote request or order.',
		name: '/status',
		scope: 'server',
		title: 'Status',
	},
	{
		description: 'Show recent visible activity for one quote request or order.',
		name: '/activity',
		scope: 'server',
		title: 'Activity',
	},
	{
		description: 'Track the latest customer-visible delivery.',
		name: '/track',
		scope: 'server',
		title: 'Track delivery',
	},
	{
		description: 'List active customer-visible deliveries.',
		name: '/deliveries',
		scope: 'server',
		title: 'Deliveries',
	},
	{
		description: 'Start a clean chat page without contacting the server.',
		name: '/new',
		scope: 'local',
		title: 'New chat',
	},
	{
		description: 'Delete all editable customer-owned drafts.',
		name: '/clear-all-drafts',
		scope: 'server',
		title: 'Clear all drafts',
	},
	{
		description:
			'Show the signed-in customer profile, addresses, and projects.',
		name: '/profile',
		scope: 'server',
		title: 'Profile',
	},
	{
		description: 'Show saved customer delivery addresses.',
		name: '/addresses',
		scope: 'server',
		title: 'Addresses',
	},
	{
		description: 'Show saved customer projects.',
		name: '/projects',
		scope: 'server',
		title: 'Projects',
	},
	{
		description: 'Summarize stale drafts and missing account setup.',
		name: '/account-health',
		scope: 'server',
		title: 'Account health',
	},
	{
		description: 'Open support, contact, FAQ, and public docs links.',
		name: '/support',
		scope: 'server',
		title: 'Support',
	},
	{
		description: 'Open direct support contact options.',
		name: '/contact',
		scope: 'server',
		title: 'Contact',
	},
	{
		description: 'Send a short support feedback ticket.',
		name: '/feedback',
		scope: 'server',
		title: 'Feedback',
	},
	{
		description: 'Open docs, or ask a public docs question after the command.',
		name: '/docs',
		scope: 'server',
		title: 'Docs',
	},
	{
		description: 'Search public docs directly.',
		name: '/docs-search',
		scope: 'server',
		title: 'Docs search',
	},
] as const

export type PortalChatCommandName =
	(typeof PORTAL_CHAT_COMMANDS)[number]['name']
export type PortalChatCommandScope =
	(typeof PORTAL_CHAT_COMMANDS)[number]['scope']

export interface PortalChatCommandInvocation {
	args: string
	name: PortalChatCommandName
	raw: string
}

const PORTAL_CHAT_COMMAND_NAMES = new Set<string>(
	PORTAL_CHAT_COMMANDS.map((command) => command.name),
)

export function parsePortalChatCommand(
	input: string,
): PortalChatCommandInvocation | null {
	const raw = input.trim()
	if (!raw.startsWith('/')) return null
	const [commandToken = '', ...rest] = raw.split(/\s+/)
	const name = commandToken.toLowerCase()
	if (!PORTAL_CHAT_COMMAND_NAMES.has(name)) return null
	return {
		args: rest.join(' ').trim(),
		name: name as PortalChatCommandName,
		raw,
	}
}

export function isLocalPortalChatCommand(name: PortalChatCommandName): boolean {
	return (
		PORTAL_CHAT_COMMANDS.find((command) => command.name === name)?.scope ===
		'local'
	)
}
