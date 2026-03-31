import { ChevronDown } from 'lucide-react'

export function ScrollIndicator() {
	return (
		<button
			type="button"
			className="absolute bottom-8 start-1/2 -translate-x-1/2 cursor-pointer"
			onClick={() =>
				window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })
			}
			aria-hidden="true"
			tabIndex={-1}
		>
			<ChevronDown
				size={24}
				className="animate-bounce text-white opacity-70"
				aria-hidden="true"
			/>
		</button>
	)
}
