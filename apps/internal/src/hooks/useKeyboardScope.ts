import { useSelector } from '@xstate/store/react'
import { keyboardScopeStore } from '../stores/keyboard-scope'

/**
 * React hook for the keyboard scope state machine.
 * Returns the current scope and dispatchers for scope transitions.
 */
export function useKeyboardScope() {
	const scope = useSelector(keyboardScopeStore, (s) => s.context.scope)

	return {
		scope,
		openPanel: () => keyboardScopeStore.send({ type: 'openPanel' }),
		closePanel: () => keyboardScopeStore.send({ type: 'closePanel' }),
		focusInput: () => keyboardScopeStore.send({ type: 'focusInput' }),
		blurInput: () => keyboardScopeStore.send({ type: 'blurInput' }),
	}
}
