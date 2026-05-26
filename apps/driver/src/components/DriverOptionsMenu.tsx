import {
	detectPwaInstallGuideKind,
	getPwaInstallGuide,
	type PwaInstallGuide,
	type PwaInstallGuideKind,
	usePwaInstallPrompt,
} from '@hyperquote/ui/pwa/install'
import { Download, Languages, Moon, MoreHorizontal, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Dialog, DialogTrigger, Heading } from 'react-aria-components/Dialog'
import { Modal, ModalOverlay } from 'react-aria-components/Modal'
import { Popover } from 'react-aria-components/Popover'
import { useTranslation } from 'react-i18next'

export interface DriverOption {
	icon: ReactNode
	isDisabled?: boolean
	label: string
	onPress: () => Promise<void> | void
}

interface DriverOptionsMenuProps {
	label: string
	options: DriverOption[]
}

export function getDriverPreferenceOptions({
	languageLabel,
	onToggleLanguage,
	onToggleTheme,
	theme,
	themeLabel,
}: {
	languageLabel: string
	onToggleLanguage: () => void
	onToggleTheme: () => void
	theme: 'dark' | 'light'
	themeLabel: string
}): DriverOption[] {
	return [
		{
			icon: <Languages aria-hidden="true" size={16} />,
			label: languageLabel,
			onPress: onToggleLanguage,
		},
		{
			icon:
				theme === 'light' ? (
					<Moon aria-hidden="true" size={16} />
				) : (
					<Sun aria-hidden="true" size={16} />
				),
			label: themeLabel,
			onPress: onToggleTheme,
		},
	]
}

export function DriverOptionsMenu({ label, options }: DriverOptionsMenuProps) {
	const { t, i18n } = useTranslation('driver')
	const [isOpen, setIsOpen] = useState(false)
	const [installGuideOpen, setInstallGuideOpen] = useState(false)
	const install = usePwaInstallPrompt()

	async function handleInstallApp() {
		const handled = await install.install()
		if (!handled) {
			window.setTimeout(() => setInstallGuideOpen(true), 140)
		}
	}

	const menuOptions: DriverOption[] = [
		{
			icon: <Download aria-hidden="true" size={16} />,
			label: install.isInstalled
				? t('controls.installed')
				: t('controls.install'),
			onPress: handleInstallApp,
		},
		...options,
	]

	return (
		<>
			<DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
				<Button
					aria-label={label}
					className="driver-control-button grid h-10 w-10 place-items-center border outline-none backdrop-blur focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
				>
					<MoreHorizontal aria-hidden="true" size={19} />
				</Button>
				<Popover
					placement="bottom end"
					offset={8}
					className="z-50 w-[min(13rem,calc(100vw-1.5rem))] border border-[var(--color-border)] bg-[var(--color-panel)] p-1.5 shadow-[0_18px_70px_rgba(17,17,17,0.18)] outline-none"
				>
					<div className="grid gap-1">
						{menuOptions.map((option) => (
							<Button
								className="grid h-10 grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 border border-transparent px-2 text-start text-xs font-semibold text-[var(--color-text)] outline-none hover:border-[var(--color-border)] hover:bg-[var(--color-surface)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:opacity-45"
								isDisabled={option.isDisabled}
								key={option.label}
								onPress={() => {
									void option.onPress()
									setIsOpen(false)
								}}
							>
								<span className="grid h-6 w-6 place-items-center text-[var(--color-text-muted)]">
									{option.icon}
								</span>
								<span className="truncate">{option.label}</span>
							</Button>
						))}
					</div>
				</Popover>
			</DialogTrigger>
			<DriverInstallGuideDialog
				isArabic={i18n.language === 'ar'}
				isOpen={installGuideOpen}
				onClose={() => setInstallGuideOpen(false)}
			/>
		</>
	)
}

function DriverInstallGuideDialog({
	isArabic,
	isOpen,
	onClose,
}: {
	isArabic: boolean
	isOpen: boolean
	onClose: () => void
}) {
	const { t } = useTranslation('driver')
	const [copyStatus, setCopyStatus] = useState<string | null>(null)
	const guide = getLocalizedDriverInstallGuide({
		appName: 'Drive',
		isArabic,
		kind: detectPwaInstallGuideKind(),
	})

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href)
			setCopyStatus(t('pwa.linkCopied'))
		} catch {
			setCopyStatus(t('pwa.copyFromAddressBar'))
		}
	}

	return (
		<ModalOverlay
			isOpen={isOpen}
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			className="fixed inset-0 z-[90] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm"
		>
			<Modal className="w-full max-w-sm border border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-text)] shadow-[0_24px_90px_rgba(0,0,0,0.26)]">
				<Dialog className="outline-none">
					<div className="border-b border-[var(--color-border)] px-5 py-4">
						<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-muted)]">
							{t('pwa.installEyebrow')}
						</p>
						<Heading className="mt-1 font-[family-name:var(--font-archivo)] text-[18px] font-bold leading-tight text-[var(--color-text)]">
							{guide.title}
						</Heading>
						<p className="mt-1 text-[13px] leading-5 text-[var(--color-text-muted)]">
							{guide.caption}
						</p>
					</div>
					<div className="space-y-4 px-5 py-4">
						<ol className="space-y-3">
							{guide.steps.map((step, index) => (
								<li key={step} className="flex gap-3">
									<span className="flex h-6 w-6 shrink-0 items-center justify-center bg-[var(--color-primary)] font-[family-name:var(--font-plex-mono)] text-[11px] text-white">
										{index + 1}
									</span>
									<span className="pt-0.5 text-[13px] leading-snug text-[var(--color-text)]">
										{step}
									</span>
								</li>
							))}
						</ol>
						<p className="border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[12px] leading-snug text-[var(--color-text-muted)]">
							{guide.note}
						</p>
					</div>
					<div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-5 py-3">
						<p className="min-w-0 flex-1 truncate font-[family-name:var(--font-plex-mono)] text-[10px] text-[var(--color-text-muted)]">
							{copyStatus}
						</p>
						<Button
							onPress={copyLink}
							className="px-3 py-2 text-[12px] font-semibold text-[var(--color-text-muted)] outline-none transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-text)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
						>
							{t('pwa.copyLink')}
						</Button>
						<Button
							onPress={onClose}
							className="bg-[var(--color-primary)] px-3 py-2 text-[12px] font-semibold text-white outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35"
						>
							{t('pwa.gotIt')}
						</Button>
					</div>
				</Dialog>
			</Modal>
		</ModalOverlay>
	)
}

function getLocalizedDriverInstallGuide({
	appName,
	isArabic,
	kind,
}: {
	appName: string
	isArabic: boolean
	kind: PwaInstallGuideKind
}): PwaInstallGuide {
	if (!isArabic) return getPwaInstallGuide({ appName, kind })

	if (kind === 'ios') {
		return {
			title: `أضف ${appName} إلى الشاشة الرئيسية`,
			caption: 'iOS يثبت التطبيق من قائمة المشاركة في Safari.',
			steps: [
				'افتح هذه الصفحة في Safari.',
				'اضغط زر المشاركة.',
				'اختر Add to Home Screen.',
				'اضغط Add.',
			],
			note: `بعدها يفتح ${appName} من الشاشة الرئيسية كتطبيق مستقل.`,
		}
	}

	if (kind === 'safari-desktop') {
		return {
			title: `أضف ${appName} إلى Dock`,
			caption: 'Safari يضع التثبيت داخل قائمة المتصفح.',
			steps: [
				'افتح هذه الصفحة في Safari.',
				'اختر File من شريط القوائم.',
				'اختر Add to Dock.',
				`أكد اسم التطبيق ${appName}.`,
			],
			note: `بعدها يفتح ${appName} من Dock في نافذة مستقلة.`,
		}
	}

	if (kind === 'firefox') {
		return {
			title: `تثبيت ${appName}`,
			caption: 'دعم Firefox للتثبيت يختلف حسب الجهاز والإعدادات.',
			steps: [
				'افتح قائمة المتصفح.',
				'ابحث عن Install أو Add to Home Screen.',
				`أكد ${appName}.`,
			],
			note: 'إذا لم يظهر خيار التثبيت، افتح نفس الرابط في Chrome أو Edge أو Safari.',
		}
	}

	return {
		title: `تثبيت ${appName}`,
		caption: 'المتصفح لم يعرض زر التثبيت المباشر بعد.',
		steps: [
			'ابحث عن أيقونة التثبيت في شريط العنوان.',
			'إذا لم تظهر، افتح قائمة المتصفح.',
			`اختر Install ${appName} أو Add to Home Screen.`,
		],
		note: 'Chrome وEdge عادة يعرضان التثبيت المباشر بعد تحميل التطبيق من HTTPS الإنتاجي.',
	}
}
