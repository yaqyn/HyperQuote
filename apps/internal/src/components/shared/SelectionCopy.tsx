import { SelectionCopyToolbar } from '@hyperquote/ui/selection/SelectionCopyToolbar'
import { useAIChatStore } from '../../stores/ai-chat'

export function SelectionCopy({
	isDisabled = false,
}: {
	isDisabled?: boolean
}) {
	const openAI = useAIChatStore((s) => s.open)
	const setDraft = useAIChatStore((s) => s.setDraft)

	function handleAskLyon(text: string) {
		setDraft(text)
		openAI()
	}

	return (
		<SelectionCopyToolbar
			isDisabled={isDisabled}
			onAsk={handleAskLyon}
			toolbarClassName="bg-[var(--color-text)]"
			buttonClassName="text-[var(--color-surface)] hover:bg-white/[0.1]"
		/>
	)
}
