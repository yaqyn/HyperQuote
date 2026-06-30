import { SelectionCopyToolbar } from '@hyperquote/ui/selection/SelectionCopyToolbar'
import { useChatWidget } from '../../hooks/useChatWidget'

export function SelectionCopy() {
	const openWithMessage = useChatWidget((s) => s.openWithMessage)

	return (
		<SelectionCopyToolbar
			onAsk={openWithMessage}
			toolbarClassName="border border-[var(--color-border)] bg-[var(--color-base)] text-[var(--color-text)] shadow-[0_18px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_18px_60px_rgba(0,0,0,0.5)]"
			buttonClassName="hover:bg-[var(--color-surface)]"
			dividerClassName="bg-[var(--color-border)]"
		/>
	)
}
