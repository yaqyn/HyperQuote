interface PortalChatModelDecision {
	commandName?: string | null
	contextMessage?: string | null
	aiEnabled: boolean
}

export function portalChatShouldUseModel({
	commandName,
	contextMessage,
	aiEnabled,
}: PortalChatModelDecision): boolean {
	return !commandName && !contextMessage && aiEnabled
}
