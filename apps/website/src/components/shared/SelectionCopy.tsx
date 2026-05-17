import { SelectionCopyToolbar } from '@hyperquote/ui/selection/SelectionCopyToolbar'
import { useChatWidget } from '../../hooks/useChatWidget'

export function SelectionCopy() {
	const openWithMessage = useChatWidget((s) => s.openWithMessage)

	return <SelectionCopyToolbar onAsk={openWithMessage} />
}
