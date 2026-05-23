export const PORTAL_CHAT_COMMANDS = [
	{
		description: 'Start a clean chat page without contacting the server.',
		name: '/clear',
		scope: 'local',
		title: 'Clear chat',
	},
	{
		description: 'List visible catalog products, with optional search terms.',
		name: '/products',
		scope: 'server',
		title: 'Products',
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
		description: 'Show the latest customer-owned quote request or order.',
		name: '/latest-order',
		scope: 'server',
		title: 'Latest order',
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
