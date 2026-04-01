interface JobCardProps {
	title: string
	location: string
	type: string
}

export function JobCard({ title, location, type }: JobCardProps) {
	return (
		<div className="rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 mb-4">
			<h3 className="text-base font-bold">{title}</h3>
			<p className="mt-1 text-sm text-[var(--color-text-muted)]">
				{location} &middot; {type}
			</p>
		</div>
	)
}
