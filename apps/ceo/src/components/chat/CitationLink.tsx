import type { Citation } from '../../types/chat'

interface CitationLinkProps {
	citation: Citation
	index: number
}

export function CitationLink({ citation, index }: CitationLinkProps) {
	return (
		<span className="inline-flex items-baseline gap-0.5 text-xs text-[var(--color-text-muted)]">
			<span className="text-[10px] align-super">[{index + 1}]</span>
			<span>{citation.text}</span>
		</span>
	)
}
