import { lazy, Suspense } from 'react'
import { useChatWidget } from '../../hooks/useChatWidget'
import { ChatFAB } from './ChatFAB'

const ChatRuntime = lazy(() =>
	import('./ChatRuntime').then((module) => ({ default: module.ChatRuntime })),
)

export function ChatWidget() {
	const shouldLoadRuntime = useChatWidget(
		(state) =>
			state.isRuntimeRequested || state.isOpen || state.pendingMessage !== null,
	)

	return (
		<>
			<ChatFAB />
			{shouldLoadRuntime ? (
				<Suspense fallback={null}>
					<ChatRuntime />
				</Suspense>
			) : null}
		</>
	)
}
