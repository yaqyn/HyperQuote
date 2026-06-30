import { SelectionCopyToolbar } from '@hyperquote/ui/selection/SelectionCopyToolbar'
import { useChatWidget } from '../../hooks/useChatWidget'

export function SelectionCopy() {
	const openWithMessage = useChatWidget((s) => s.openWithMessage)

	return (
		<SelectionCopyToolbar
			onAsk={openWithMessage}
			toolbarClassName="border border-black/10 bg-[#101010] text-white shadow-[0_18px_45px_rgba(0,0,0,0.26)] dark:border-white/10 dark:bg-white dark:text-[#101010] dark:shadow-[0_18px_55px_rgba(0,0,0,0.55)]"
			buttonClassName="hover:bg-white/10 dark:hover:bg-black/10"
			dividerClassName="bg-white/15 dark:bg-black/15"
		/>
	)
}
