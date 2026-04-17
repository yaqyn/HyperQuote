/**
 * Vertical blue line indicator for active/selected nav items.
 * Place inside a relatively-positioned parent with data-[selected] support.
 *
 * Uses the `[[data-selected]_&]` pattern to show when a parent React Aria
 * component (Tab, ListBoxItem, etc.) has the selected state.
 */
export function ActiveLine() {
	return (
		<span
			className="absolute start-0 top-1 bottom-1 w-[2px] rounded-full bg-[#2563EB] opacity-0 transition-opacity
        [[data-selected]_&]:opacity-100"
		/>
	)
}
