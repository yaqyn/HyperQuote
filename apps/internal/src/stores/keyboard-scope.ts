import { createStore } from '@xstate/store'

/**
 * Keyboard scope state machine for the internal platform.
 *
 * Three scopes control which hotkeys are active:
 * - 'canvas': Home state. Module hotkeys (S/P/O/W/F/D/C/H/A/R/I) fire.
 * - 'panel': A module window or command palette is open. Only Escape and Ctrl+K fire.
 * - 'input': User is typing in a text field. No hotkeys fire.
 *
 * MUTUAL EXCLUSIVITY ASSUMPTION:
 * panelOpen is a single boolean because command palette and module windows are
 * mutually exclusive -- opening the command palette closes any active module window,
 * and module hotkeys are disabled while the command palette is open (scope === 'panel').
 * If this assumption changes (e.g., picture-in-picture windows), panelOpen must become
 * a stack or counter.
 */
export const keyboardScopeStore = createStore({
	context: {
		scope: 'canvas' as 'canvas' | 'panel' | 'input',
		panelOpen: false,
	},
	on: {
		openPanel: (ctx) => ({
			...ctx,
			scope: 'panel' as const,
			panelOpen: true,
		}),
		closePanel: (ctx) => ({
			...ctx,
			scope: 'canvas' as const,
			panelOpen: false,
		}),
		focusInput: (ctx) => ({
			...ctx,
			scope: 'input' as const,
		}),
		blurInput: (ctx) => ({
			...ctx,
			scope: ctx.panelOpen ? ('panel' as const) : ('canvas' as const),
		}),
	},
})
