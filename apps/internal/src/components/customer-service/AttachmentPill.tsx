import type { Message } from '../../types/customer-service'

export function AttachmentPill({
	attachment,
}: {
	attachment: Message['attachments'][number]
}) {
	const content = (
		<>
			<span className="min-w-0 break-words">{attachment.name}</span>
			{attachment.sizeBytes > 0 && (
				<span className="text-[var(--color-text-subtle)] tabular-nums">
					{(attachment.sizeBytes / 1024).toFixed(0)}KB
				</span>
			)}
		</>
	)
	const className =
		'inline-flex max-w-full items-center gap-2 rounded-md border border-black/[0.08] px-2 py-1 font-[family-name:var(--font-archivo)] text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)] dark:border-white/[0.1]'
	if (!attachment.url) {
		return <span className={className}>{content}</span>
	}
	return (
		<a
			href={attachment.url}
			target="_blank"
			rel="noreferrer"
			className={`${className} transition-colors hover:border-[var(--color-primary)]/35 hover:text-[var(--color-text)]`}
		>
			{content}
		</a>
	)
}
