import { standardSchemaResolver } from '@hyperquote/forms'
import {
	ArrowRight,
	ClipboardCheck,
	LockKeyhole,
	Mail,
	MapPinned,
	Navigation,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from 'react-aria-components/Button'
import { Input } from 'react-aria-components/Input'
import { Label } from 'react-aria-components/Label'
import { TextField } from 'react-aria-components/TextField'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
	authenticateDriver,
	type DriverLoginError,
	type LoginFormValues,
	loginSchema,
} from '../lib/auth'
import { useAuthStore } from '../stores/auth'
import { usePreferencesStore } from '../stores/preferences'
import {
	DriverOptionsMenu,
	getDriverPreferenceOptions,
} from './DriverOptionsMenu'

const ACCESS_ROWS = [
	{
		labelKey: 'login.access.pool.label',
		valueKey: 'login.access.pool.value',
	},
	{
		labelKey: 'login.access.provisioning.label',
		valueKey: 'login.access.provisioning.value',
	},
	{
		labelKey: 'login.access.proof.label',
		valueKey: 'login.access.proof.value',
	},
] as const

const ROUTE_STOPS = [
	{
		detailKey: 'login.route.stops.yard.detail',
		icon: MapPinned,
		labelKey: 'login.route.stops.yard.label',
	},
	{
		detailKey: 'login.route.stops.release.detail',
		icon: Navigation,
		labelKey: 'login.route.stops.release.label',
	},
	{
		detailKey: 'login.route.stops.proof.detail',
		icon: ClipboardCheck,
		labelKey: 'login.route.stops.proof.label',
	},
] as const

export function LoginScreen() {
	const { t } = useTranslation('driver')
	const signIn = useAuthStore((state) => state.signIn)
	const theme = usePreferencesStore((state) => state.theme)
	const toggleLanguage = usePreferencesStore((state) => state.toggleLanguage)
	const toggleTheme = usePreferencesStore((state) => state.toggleTheme)
	const [authError, setAuthError] = useState<DriverLoginError | null>(null)
	const {
		formState: { errors, isSubmitting },
		handleSubmit,
		register,
	} = useForm<LoginFormValues>({
		mode: 'onBlur',
		resolver: standardSchemaResolver(loginSchema),
	})

	async function onSubmit(values: LoginFormValues) {
		setAuthError(null)
		const result = await authenticateDriver(values)
		if (result.ok) {
			signIn(result.session)
			return
		}
		setAuthError(result.error)
	}

	return (
		<main className="driver-auth-scene relative min-h-dvh overflow-x-hidden overflow-y-auto bg-[var(--color-surface)] text-[var(--color-text)] lg:overflow-hidden">
			<div aria-hidden="true" className="driver-route-field hidden lg:block" />
			<header
				className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6 lg:px-8"
				dir="ltr"
			>
				<div className="flex min-w-0 items-center gap-3">
					<div className="min-w-0">
						<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-primary)]">
							{t('brand.eyebrow')}
						</p>
						<p className="truncate font-[family-name:var(--font-archivo)] text-base font-semibold">
							{t('brand.driver')}
						</p>
					</div>
				</div>
				<DriverOptionsMenu
					label={t('controls.options')}
					options={getDriverPreferenceOptions({
						languageLabel: t('controls.language'),
						onToggleLanguage: toggleLanguage,
						onToggleTheme: toggleTheme,
						theme,
						themeLabel: t('controls.theme'),
					})}
				/>
			</header>

			<section className="relative z-10 grid min-h-dvh grid-cols-1 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(400px,500px)] lg:items-center lg:gap-7 lg:px-8 lg:pt-20 xl:gap-10">
				<div className="hidden min-h-0 flex-col justify-center lg:flex">
					<div className="driver-route-ticket max-w-4xl border border-[var(--color-border-strong)] bg-[var(--color-panel)]/86 p-4 shadow-[8px_8px_0_var(--color-auth-shadow)] backdrop-blur sm:p-5 lg:bg-[var(--color-panel)]/72 xl:p-6">
						<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)] lg:items-end">
							<div className="min-w-0">
								<p className="font-[family-name:var(--font-plex-mono)] text-[11px] uppercase text-[var(--color-primary)]">
									{t('login.kicker')}
								</p>
								<h1 className="mt-3 max-w-[780px] font-[family-name:var(--font-archivo)] text-[34px] font-black leading-[0.98] tracking-normal sm:text-5xl lg:text-6xl xl:text-7xl">
									{t('login.title')}
								</h1>
								<p className="mt-4 max-w-2xl text-[15px] leading-6 text-[var(--color-text-muted)] sm:text-base sm:leading-7">
									{t('login.body')}
								</p>
							</div>

							<div className="border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
								<div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] pb-2">
									<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
										{t('login.route.label')}
									</p>
									<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-primary)]">
										{t('login.route.code')}
									</p>
								</div>
								<div className="driver-route-stops mt-3 space-y-3">
									{ROUTE_STOPS.map((stop) => {
										const Icon = stop.icon
										return (
											<div
												key={stop.labelKey}
												className="relative flex items-start gap-3"
											>
												<div className="relative z-10 grid h-8 w-8 shrink-0 place-items-center border border-[var(--color-border-strong)] bg-[var(--color-surface)]">
													<Icon
														aria-hidden="true"
														size={15}
														strokeWidth={1.8}
													/>
												</div>
												<div className="min-w-0 pt-0.5">
													<p className="truncate text-sm font-semibold">
														{t(stop.labelKey)}
													</p>
													<p className="mt-0.5 truncate text-xs text-[var(--color-text-muted)]">
														{t(stop.detailKey)}
													</p>
												</div>
											</div>
										)
									})}
								</div>
							</div>
						</div>

						<div className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--color-border)] pt-3 sm:gap-3">
							{ACCESS_ROWS.map((row) => (
								<div
									key={row.labelKey}
									className="min-w-0 border-inline-start border-[var(--color-border)] ps-2 first:border-inline-start-0 first:ps-0 sm:ps-3"
								>
									<p className="font-[family-name:var(--font-plex-mono)] text-[9px] uppercase text-[var(--color-text-subtle)] sm:text-[10px]">
										{t(row.labelKey)}
									</p>
									<p className="mt-1 truncate text-xs font-semibold sm:text-sm">
										{t(row.valueKey)}
									</p>
								</div>
							))}
						</div>
					</div>
				</div>

				<aside className="flex min-h-[calc(100dvh-6rem)] items-center justify-center lg:min-h-0">
					<section
						aria-labelledby="driver-login-title"
						className="driver-pass-panel mx-auto w-full max-w-[520px] border border-[var(--color-border-strong)] bg-[var(--color-panel)] shadow-[8px_8px_0_var(--color-auth-shadow)] lg:max-w-none"
					>
						<div className="border-b border-[var(--color-border)] px-4 py-4 sm:px-5">
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0">
									<p className="font-[family-name:var(--font-plex-mono)] text-[11px] uppercase text-[var(--color-primary)]">
										{t('login.formEyebrow')}
									</p>
									<h2
										id="driver-login-title"
										className="mt-2 font-[family-name:var(--font-archivo)] text-[28px] font-black leading-none"
									>
										{t('login.formTitle')}
									</h2>
								</div>
								<div className="grid h-12 w-12 shrink-0 place-items-center border border-[var(--color-border)] bg-[var(--color-surface)]">
									<Navigation
										aria-hidden="true"
										size={22}
										className="text-[var(--color-primary)]"
									/>
								</div>
							</div>
						</div>

						<form
							noValidate
							onSubmit={handleSubmit(onSubmit)}
							className="px-4 py-3.5 sm:px-5 sm:py-4"
						>
							<div className="space-y-3">
								<TextField className="group" isInvalid={Boolean(errors.email)}>
									<Label className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text)]">
										<Mail aria-hidden="true" size={16} strokeWidth={1.8} />
										<span>{t('login.email')}</span>
									</Label>
									<div
										className="driver-auth-input-frame flex h-12 items-center border"
										data-invalid={errors.email ? 'true' : undefined}
									>
										<Input
											{...register('email')}
											autoComplete="username"
											className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[15px] font-medium text-[var(--color-text)] outline-none"
											inputMode="email"
											type="email"
										/>
									</div>
									{errors.email && (
										<p role="alert" className="mt-1.5 text-xs text-[#B91C1C]">
											{t('login.validation.email')}
										</p>
									)}
								</TextField>
								<TextField
									className="group"
									isInvalid={Boolean(errors.password)}
								>
									<Label className="mb-1.5 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-text)]">
										<LockKeyhole
											aria-hidden="true"
											size={16}
											strokeWidth={1.8}
										/>
										<span>{t('login.password')}</span>
									</Label>
									<div
										className="driver-auth-input-frame flex h-12 items-center border"
										data-invalid={errors.password ? 'true' : undefined}
									>
										<Input
											{...register('password')}
											autoComplete="current-password"
											className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[15px] font-medium text-[var(--color-text)] outline-none"
											type="password"
										/>
									</div>
									{errors.password && (
										<p role="alert" className="mt-1.5 text-xs text-[#B91C1C]">
											{t('login.validation.password')}
										</p>
									)}
								</TextField>
							</div>

							{authError && (
								<p role="alert" className="mt-3 text-sm text-[#B91C1C]">
									{t(`login.errors.${authError}`)}
								</p>
							)}

							<Button
								type="submit"
								isDisabled={isSubmitting}
								className="driver-action-button mt-5 flex h-14 w-full items-center justify-between border px-4 font-[family-name:var(--font-archivo)] text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/35 disabled:cursor-not-allowed disabled:opacity-55"
							>
								<span>{t('login.submit')}</span>
								<ArrowRight aria-hidden="true" size={18} />
							</Button>
						</form>

						<div className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-[var(--color-border)] px-4 py-3 sm:px-5">
							<p className="min-w-0 truncate font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-text-subtle)]">
								{t('login.passFooter')}
							</p>
							<p className="font-[family-name:var(--font-plex-mono)] text-[10px] uppercase text-[var(--color-primary)]">
								{t('login.passStamp')}
							</p>
						</div>
					</section>
				</aside>
			</section>
		</main>
	)
}
