import { PanelLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { usePortalStore } from '../../stores/portal'

interface SidebarTitleButtonProps {
	className?: string
}

export function SidebarTitleButton({
	className = '',
}: SidebarTitleButtonProps) {
	const { t } = useTranslation('portal')
	const isSidebarOpen = usePortalStore((s) => s.isSidebarOpen)
	const toggleSidebar = usePortalStore((s) => s.toggleSidebar)

	return (
		<button
			type="button"
			onClick={toggleSidebar}
			className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[var(--p-text-muted)] transition-colors hover:bg-[var(--p-hover)] hover:text-[var(--p-text)] ${className}`}
			aria-label={isSidebarOpen ? t('sidebar.hide') : t('sidebar.show')}
			aria-pressed={isSidebarOpen}
			aria-keyshortcuts="["
		>
			<PanelLeft size={16} strokeWidth={1.5} />
		</button>
	)
}
