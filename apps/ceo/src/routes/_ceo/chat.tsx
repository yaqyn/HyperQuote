import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
// ChatView uses askCEOAI server function for mock streaming
import { ChatView } from '../../components/chat/ChatView'

const chatSearchSchema = z.object({
	q: z.string().optional(),
})

export const Route = createFileRoute('/_ceo/chat')({
	validateSearch: chatSearchSchema,
	component: CEOChat,
})

function CEOChat() {
	const { q } = Route.useSearch()

	return (
		<div className="flex h-full flex-col">
			{/* Back button + title */}
			<div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
				<a
					href="/"
					onClick={(e) => {
						e.preventDefault()
						window.history.back()
					}}
					className="text-sm text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
					aria-label="Go back"
				>
					&larr;
				</a>
				<h1 className="text-lg font-semibold text-[var(--color-text)]">
					AI Chat
				</h1>
			</div>

			{/* Chat interface */}
			<div className="flex-1 overflow-hidden">
				<ChatView initialQuery={q} />
			</div>
		</div>
	)
}
