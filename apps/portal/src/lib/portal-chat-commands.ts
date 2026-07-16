import type { CommandPaletteData } from './chat-types'

type PortalChatCommandCategory =
	| 'Start here'
	| 'Workspace'
	| 'Catalog'
	| 'Drafts'
	| 'Orders'
	| 'Account'
	| 'Support'

export interface PortalChatCommandDefinition {
	argumentHint?: string
	category: PortalChatCommandCategory
	description: string
	example?: string
	featured?: boolean
	inputMode: 'prefill' | 'run'
	name: `/${string}`
	scope: 'local' | 'server'
	title: string
}

export const PORTAL_CHAT_COMMANDS = [
	{
		category: 'Start here',
		description:
			'Turn a project idea or material list into a quote plan, one clear question at a time.',
		example: '/plan-quote villa roof with wood and rebar',
		featured: true,
		inputMode: 'prefill',
		name: '/plan-quote',
		scope: 'server',
		title: 'Plan a quote',
		argumentHint: 'Describe the project, materials, quantities, or constraints',
	},
	{
		category: 'Start here',
		description:
			'Find real catalog matches by material, type, company, specification, or a misspelled name.',
		example: '/search-products red brik from El Sewedy',
		featured: true,
		inputMode: 'prefill',
		name: '/search-products',
		scope: 'server',
		title: 'Search products',
		argumentHint: 'What product, material, company, or specification?',
	},
	{
		category: 'Start here',
		description:
			'Add a product and quantity to the live quote cart; Lyon asks only for missing details.',
		example: '/add-to-cart 400 rebar',
		featured: true,
		inputMode: 'prefill',
		name: '/add-to-cart',
		scope: 'server',
		title: 'Add to cart',
		argumentHint: 'What should I add, and how much?',
	},
	{
		category: 'Start here',
		description:
			'Increase, deduct, set, replace, or remove a cart item with progressive clarification.',
		example: '/edit-cart deduct 100 plywood',
		featured: true,
		inputMode: 'prefill',
		name: '/edit-cart',
		scope: 'server',
		title: 'Edit cart',
		argumentHint: 'What should change? Include the item and quantity if known',
	},
	{
		category: 'Start here',
		description:
			'Draft a support ticket, review it, and submit only after your confirmation.',
		example: '/ticket delivery address is not updating',
		featured: true,
		inputMode: 'prefill',
		name: '/ticket',
		scope: 'server',
		title: 'Draft a ticket',
		argumentHint: 'Describe the problem or request',
	},
	{
		category: 'Workspace',
		description: 'Start a clean chat page without contacting the server.',
		inputMode: 'run',
		name: '/clear',
		scope: 'local',
		title: 'Clear chat',
	},
	{
		category: 'Workspace',
		description:
			'Open the full interactive command desk. This works even when open-ended AI chat is unavailable.',
		featured: true,
		inputMode: 'run',
		name: '/commands',
		scope: 'local',
		title: 'Command desk',
	},
	{
		category: 'Workspace',
		description: 'Show this command menu without contacting the server.',
		inputMode: 'run',
		name: '/help',
		scope: 'local',
		title: 'Command desk alias',
	},
	{
		category: 'Catalog',
		description: 'List visible catalog products, with optional search terms.',
		inputMode: 'run',
		name: '/products',
		scope: 'server',
		title: 'Products',
	},
	{
		category: 'Catalog',
		description: 'Open catalog and draft quote shortcuts.',
		inputMode: 'run',
		name: '/market',
		scope: 'server',
		title: 'Market',
	},
	{
		category: 'Catalog',
		description: 'Compare visible catalog products for a material need.',
		inputMode: 'prefill',
		name: '/compare-products',
		scope: 'server',
		title: 'Compare products',
	},
	{
		category: 'Catalog',
		description: 'Get material suggestions without writing to a draft.',
		inputMode: 'prefill',
		name: '/recommend-materials',
		scope: 'server',
		title: 'Recommend materials',
	},
	{
		category: 'Drafts',
		description: 'Start a new draft quote from the portal quote drawer.',
		inputMode: 'run',
		name: '/new-draft',
		scope: 'server',
		title: 'New draft',
	},
	{
		category: 'Drafts',
		description: 'Show the live quote drawer cart saved in this browser.',
		inputMode: 'run',
		name: '/cart',
		scope: 'local',
		title: 'Cart',
	},
	{
		category: 'Drafts',
		description: 'Open the live quote drawer without leaving chat.',
		inputMode: 'run',
		name: '/open-cart',
		scope: 'local',
		title: 'Open cart',
	},
	{
		category: 'Orders',
		description: 'List customer-owned quote requests and orders.',
		inputMode: 'run',
		name: '/orders',
		scope: 'server',
		title: 'Orders',
	},
	{
		category: 'Drafts',
		description: 'List editable customer-owned drafts.',
		inputMode: 'run',
		name: '/drafts',
		scope: 'server',
		title: 'Drafts',
	},
	{
		category: 'Drafts',
		description: 'Show one editable draft by reference or description.',
		inputMode: 'prefill',
		name: '/draft',
		scope: 'server',
		title: 'Draft detail',
	},
	{
		category: 'Drafts',
		description: 'Open one editable draft in the chat draft desk.',
		inputMode: 'prefill',
		name: '/edit-draft',
		scope: 'server',
		title: 'Edit draft',
	},
	{
		category: 'Drafts',
		description: 'Delete one editable draft by reference or description.',
		inputMode: 'prefill',
		name: '/delete-draft',
		scope: 'server',
		title: 'Delete draft',
	},
	{
		category: 'Drafts',
		description: 'Clear all item lines from one editable draft.',
		inputMode: 'prefill',
		name: '/clear-draft',
		scope: 'server',
		title: 'Clear draft',
	},
	{
		category: 'Drafts',
		description: 'Remove one item line from an editable draft.',
		inputMode: 'prefill',
		name: '/remove-from-draft',
		scope: 'server',
		title: 'Remove draft item',
	},
	{
		category: 'Drafts',
		description: 'Rename one editable draft.',
		inputMode: 'prefill',
		name: '/rename-draft',
		scope: 'server',
		title: 'Rename draft',
	},
	{
		category: 'Drafts',
		description: 'Update the simple note on one editable draft.',
		inputMode: 'prefill',
		name: '/note-draft',
		scope: 'server',
		title: 'Draft note',
	},
	{
		category: 'Drafts',
		description: 'Validate one editable draft for unavailable or stale items.',
		inputMode: 'prefill',
		name: '/validate-draft',
		scope: 'server',
		title: 'Validate draft',
	},
	{
		category: 'Drafts',
		description: 'Add available catalog products to one editable draft.',
		inputMode: 'prefill',
		name: '/add-to-draft',
		scope: 'server',
		title: 'Add to draft',
	},
	{
		category: 'Drafts',
		description: 'Replace one draft item with another catalog product.',
		inputMode: 'prefill',
		name: '/replace-draft-item',
		scope: 'server',
		title: 'Replace draft item',
	},
	{
		category: 'Drafts',
		description: 'Set delivery date or saved address on one editable draft.',
		inputMode: 'prefill',
		name: '/set-draft-delivery',
		scope: 'server',
		title: 'Set draft delivery',
	},
	{
		category: 'Drafts',
		description: 'Copy a previous quote request or order into a new draft.',
		inputMode: 'prefill',
		name: '/reorder',
		scope: 'server',
		title: 'Reorder',
	},
	{
		category: 'Drafts',
		description: 'Remove empty editable drafts after confirmation.',
		inputMode: 'prefill',
		name: '/clean-drafts',
		scope: 'server',
		title: 'Clean drafts',
	},
	{
		category: 'Drafts',
		description: 'Merge editable drafts into one draft after confirmation.',
		inputMode: 'prefill',
		name: '/merge-drafts',
		scope: 'server',
		title: 'Merge drafts',
	},
	{
		category: 'Orders',
		description: 'Show the latest customer-owned quote request or order.',
		inputMode: 'run',
		name: '/latest-order',
		scope: 'server',
		title: 'Latest order',
	},
	{
		category: 'Orders',
		description: 'Show status for one quote request or order.',
		inputMode: 'prefill',
		name: '/status',
		scope: 'server',
		title: 'Status',
	},
	{
		category: 'Orders',
		description: 'Show recent visible activity for one quote request or order.',
		inputMode: 'prefill',
		name: '/activity',
		scope: 'server',
		title: 'Activity',
	},
	{
		category: 'Orders',
		description: 'Track the latest customer-visible delivery.',
		inputMode: 'run',
		name: '/track',
		scope: 'server',
		title: 'Track delivery',
	},
	{
		category: 'Orders',
		description: 'List active customer-visible deliveries.',
		inputMode: 'run',
		name: '/deliveries',
		scope: 'server',
		title: 'Deliveries',
	},
	{
		category: 'Workspace',
		description: 'Start a clean chat page without contacting the server.',
		inputMode: 'run',
		name: '/new',
		scope: 'local',
		title: 'New chat',
	},
	{
		category: 'Drafts',
		description: 'Delete all editable customer-owned drafts.',
		inputMode: 'prefill',
		name: '/clear-all-drafts',
		scope: 'server',
		title: 'Clear all drafts',
	},
	{
		category: 'Account',
		description:
			'Show the signed-in customer profile, addresses, and projects.',
		inputMode: 'run',
		name: '/profile',
		scope: 'server',
		title: 'Profile',
	},
	{
		category: 'Account',
		description: 'Show saved customer delivery addresses.',
		inputMode: 'run',
		name: '/addresses',
		scope: 'server',
		title: 'Addresses',
	},
	{
		category: 'Account',
		description: 'Show saved customer projects.',
		inputMode: 'run',
		name: '/projects',
		scope: 'server',
		title: 'Projects',
	},
	{
		category: 'Account',
		description: 'Summarize stale drafts and missing account setup.',
		inputMode: 'run',
		name: '/account-health',
		scope: 'server',
		title: 'Account health',
	},
	{
		category: 'Support',
		description: 'Open support, contact, FAQ, and public docs links.',
		inputMode: 'run',
		name: '/support',
		scope: 'server',
		title: 'Support',
	},
	{
		category: 'Support',
		description: 'Open direct support contact options.',
		inputMode: 'run',
		name: '/contact',
		scope: 'server',
		title: 'Contact',
	},
	{
		category: 'Support',
		description: 'Send a short support feedback ticket.',
		inputMode: 'prefill',
		name: '/feedback',
		scope: 'server',
		title: 'Feedback',
	},
	{
		category: 'Support',
		description: 'Open docs, or ask a public docs question after the command.',
		inputMode: 'run',
		name: '/docs',
		scope: 'server',
		title: 'Docs',
	},
	{
		category: 'Support',
		description: 'Search public docs directly.',
		inputMode: 'prefill',
		name: '/docs-search',
		scope: 'server',
		title: 'Docs search',
	},
] as const satisfies readonly PortalChatCommandDefinition[]

export type PortalChatCommandName =
	(typeof PORTAL_CHAT_COMMANDS)[number]['name']
export type PortalChatCommandInputMode =
	(typeof PORTAL_CHAT_COMMANDS)[number]['inputMode']

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

export function portalChatCommandInputMode(
	name: PortalChatCommandName,
): PortalChatCommandInputMode {
	return (
		PORTAL_CHAT_COMMANDS.find((command) => command.name === name)?.inputMode ??
		'run'
	)
}

export function portalChatCommandDefinition(
	name: PortalChatCommandName,
): PortalChatCommandDefinition | undefined {
	return PORTAL_CHAT_COMMANDS.find((command) => command.name === name)
}

function commandPaletteEntry(
	command: PortalChatCommandDefinition,
): CommandPaletteData['groups'][number]['commands'][number] {
	return {
		argumentHint: command.argumentHint,
		command: command.name,
		description: command.description,
		example: command.example,
		featured: command.featured,
		inputMode: command.inputMode,
		scope: command.scope,
		title: command.title,
	}
}

export function portalChatCommandPaletteGroups(): CommandPaletteData['groups'] {
	const order: PortalChatCommandCategory[] = [
		'Start here',
		'Workspace',
		'Catalog',
		'Drafts',
		'Orders',
		'Account',
		'Support',
	]
	return order
		.map((category) => ({
			commands: PORTAL_CHAT_COMMANDS.filter(
				(command) => command.category === category,
			).map(commandPaletteEntry),
			title: category,
		}))
		.filter((group) => group.commands.length > 0)
}
