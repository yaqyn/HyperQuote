// AI Assistant domain types — chat interface, safety, suggestions

// ─── Messages ───────────────────────────────────────────

export interface AIMessage {
	id: string
	role: 'user' | 'assistant'
	content: string
	timestamp: string
	attachments?: string[]
}

// ─── Capability Tiers ───────────────────────────────────

export type AICapabilityTier = 'read' | 'suggest' | 'draft' | 'execute'

// ─── Safety Configuration ───────────────────────────────

export interface AISafetyConfig {
	readOnlyDb: true
	draftReviewConfirm: true
	auditLogged: true
	promptCached: true
}

// ─── Role-Based Suggestions ─────────────────────────────

export interface RoleSuggestion {
	role: string
	prompts: string[]
}

// ─── Draft Action ───────────────────────────────────────

export interface DraftAction {
	id: string
	type: 'mutation'
	description: string
	status: 'draft' | 'reviewed' | 'confirmed'
}
