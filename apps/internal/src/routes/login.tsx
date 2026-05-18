import { createFileRoute } from '@tanstack/react-router'
import {
	ArrowRight,
	Building2,
	ChevronDown,
	ExternalLink,
	LifeBuoy,
	type LucideIcon,
	ShieldCheck,
	UserRoundCheck,
} from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'
import { Button } from 'react-aria-components'
import { z } from 'zod'
import { getSafeRedirectPath } from '../lib/login-redirect'
import {
	getInternalLoginStatus,
	submitInternalLogin,
} from '../lib/server/internal-auth'
import type { InternalLoginErrorCode } from '../lib/server/internal-auth-core'

const loginSearchSchema = z.object({
	redirect: z.string().optional(),
})

type LoginField = 'email' | 'password'
type LoginInvalidFields = Partial<Record<LoginField, boolean>>
type LoginFieldState = 'neutral' | 'valid' | 'invalid'

interface LoginSquareCell {
	column: number
	delay: string
	duration: string
	id: string
	row: number
	tone: 'ink' | 'blue'
}

const LOGIN_GRID_COLUMNS = 60
const LOGIN_GRID_ROWS = 32

const LOGIN_SQUARE_CELLS = buildLoginSquareCells()
const STATUS_ROWS = [
	{
		label: 'Access',
		value: 'Employee only',
		tone: 'text-[#111111]',
	},
	{
		label: 'Provisioning',
		value: 'Manual',
		tone: 'text-[#111111]',
	},
	{
		label: 'Redirect policy',
		value: 'Same-origin',
		tone: 'text-[#111111]',
	},
]

export const Route = createFileRoute('/login')({
	validateSearch: loginSearchSchema,
	beforeLoad: async () => ({
		loginStatus: await getInternalLoginStatus(),
	}),
	component: InternalLoginRoute,
})

function buildLoginSquareCells(): LoginSquareCell[] {
	const cells: LoginSquareCell[] = []

	for (let row = 1; row <= LOGIN_GRID_ROWS; row += 1) {
		for (let column = 1; column <= LOGIN_GRID_COLUMNS; column += 1) {
			const placementHash = getGridHash(column, row)
			if (placementHash > 0.23) continue

			const timingHash = getGridHash(row + 17, column + 29)
			const waveOffset = (column * 0.18 + row * 0.28 + timingHash * 5) % 7.2
			const duration = 3.9 + timingHash * 1.5

			cells.push({
				column,
				delay: `${-waveOffset.toFixed(2)}s`,
				duration: `${duration.toFixed(2)}s`,
				id: `${column}-${row}`,
				row,
				tone: getGridHash(column + 41, row + 13) > 0.76 ? 'blue' : 'ink',
			})
		}
	}

	return cells
}

function getGridHash(column: number, row: number) {
	const value = Math.sin(column * 12.9898 + row * 78.233) * 43_758.5453
	return value - Math.floor(value)
}

function InternalLoginRoute() {
	const search = Route.useSearch()
	const { loginStatus } = Route.useRouteContext()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [invalidFields, setInvalidFields] = useState<LoginInvalidFields>({})
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [loginError, setLoginError] = useState<InternalLoginErrorCode | null>(
		null,
	)

	const isLoginConfigured = loginStatus.configured

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault()
		if (isSubmitting) return
		setLoginError(null)

		if (!isLoginConfigured) {
			setLoginError('not_configured')
			return
		}

		const nextInvalidFields = getInvalidFields(email, password)
		setInvalidFields(nextInvalidFields)
		if (Object.keys(nextInvalidFields).length > 0) return

		setIsSubmitting(true)
		const result = await submitInternalLogin({
			data: {
				email: email.trim(),
				password,
				redirect: search.redirect,
			},
		})

		if (result.ok) {
			window.location.assign(
				getSafeRedirectPath(result.redirectTo, window.location.origin),
			)
			return
		}

		setLoginError(result.error)
		if (
			result.error === 'invalid_credentials' ||
			result.error === 'wrong_pool'
		) {
			setInvalidFields({ email: true, password: true })
		}
		setIsSubmitting(false)
	}

	function handleEmailChange(value: string) {
		setEmail(value)
		setLoginError(null)
		if (isEmailValid(value)) {
			setInvalidFields((current) => clearInvalidField(current, 'email'))
		}
	}

	function handlePasswordChange(value: string) {
		setPassword(value)
		setLoginError(null)
		if (isPasswordValid(value)) {
			setInvalidFields((current) => clearInvalidField(current, 'password'))
		}
	}

	const emailState = getFieldState('email', email, invalidFields.email === true)
	const passwordState = getFieldState(
		'password',
		password,
		invalidFields.password === true,
	)

	return (
		<div className="relative min-h-dvh select-none overflow-x-hidden bg-white text-[#111111] xl:overflow-hidden">
			<div aria-hidden="true" className="login-square-grid" />
			<LoginSquareField />
			<div
				aria-hidden="true"
				className="absolute inset-y-0 left-0 w-full bg-[radial-gradient(circle_at_84%_16%,rgba(17,17,17,0.07),transparent_24%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(255,255,255,0.72)_48%,rgba(255,255,255,0.9))]"
			/>

			<main className="relative z-10 grid min-h-dvh grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(440px,520px)]">
				<section
					aria-labelledby="internal-login-title"
					className="hidden min-h-0 flex-col justify-between px-5 pt-5 pb-6 sm:px-8 sm:pt-7 sm:pb-8 md:mx-auto md:w-full md:max-w-[760px] md:pt-8 md:pb-9 xl:mx-0 xl:flex xl:min-h-dvh xl:max-w-none xl:px-12 xl:py-10"
				>
					<header className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-3">
							<img
								src="/brand/logos/LyonBlack.svg"
								alt=""
								width={64}
								height={64}
								className="h-16 w-16"
							/>
							<div>
								<p className="font-[family-name:var(--font-plex-mono)] text-[11px] uppercase leading-none text-[#2563eb]">
									HyperQuote
								</p>
								<p className="mt-1 font-[family-name:var(--font-archivo)] text-sm font-semibold leading-none text-[#111111]">
									Internal operations
								</p>
							</div>
						</div>
						<p className="hidden border-l border-black/10 pl-4 text-right font-[family-name:var(--font-plex-mono)] text-[11px] leading-5 text-black/55 sm:block">
							Employee access
							<br />
							Manual provisioning
						</p>
					</header>

					<div className="max-w-3xl py-8 sm:py-10 md:py-14 xl:py-20">
						<p className="font-[family-name:var(--font-plex-mono)] text-[11px] uppercase text-[#2563eb]">
							Executive console
						</p>
						<h1
							id="internal-login-title"
							className="mt-4 max-w-[760px] font-[family-name:var(--font-archivo)] text-[32px] font-bold leading-[1.02] text-[#111111] sm:text-4xl md:text-5xl xl:text-7xl xl:leading-[0.96]"
						>
							Command entry for the internal floor.
						</h1>
						<p className="mt-5 max-w-2xl font-[family-name:var(--font-archivo)] text-[15px] leading-6 text-black/60 sm:text-base sm:leading-7 md:text-lg">
							Sign in with a provisioned employee account to reach sales,
							procurement, warehouse, finance, dispatch, support, and admin
							operations.
						</p>
					</div>

					<div className="grid max-w-3xl grid-cols-3 gap-2 border-t border-black/10 pt-3 sm:gap-3 sm:pt-4">
						{STATUS_ROWS.map((row) => (
							<div
								key={row.label}
								className="min-w-0 rounded-sm border border-black/10 bg-white/70 p-2 backdrop-blur xl:border-0 xl:bg-transparent xl:p-0 xl:backdrop-blur-none"
							>
								<p className="font-[family-name:var(--font-plex-mono)] text-[9px] uppercase text-black/45 sm:text-[10px]">
									{row.label}
								</p>
								<p
									className={`mt-1 truncate font-[family-name:var(--font-archivo)] text-xs font-semibold sm:text-sm ${row.tone}`}
								>
									{row.value}
								</p>
							</div>
						))}
					</div>
				</section>

				<aside className="flex min-h-dvh w-full items-center bg-white px-7 py-7 sm:px-8 sm:py-8 md:px-12 md:py-10 xl:border-y-0 xl:border-r-0 xl:border-l xl:border-black/10 xl:bg-white/90 xl:px-10 xl:py-7 xl:shadow-[-32px_0_90px_rgba(17,17,17,0.10)] xl:backdrop-blur">
					<section
						aria-labelledby="internal-login-form-title"
						className="mx-auto w-full max-w-[520px] xl:max-w-none"
					>
						<div className="border-b border-black/10 pb-5">
							<div className="flex items-center justify-between gap-4">
								<div>
									<p className="font-[family-name:var(--font-plex-mono)] text-[11px] uppercase text-black/45">
										Secure sign-in
									</p>
									<h2
										id="internal-login-form-title"
										className="mt-2 font-[family-name:var(--font-archivo)] text-2xl font-bold leading-tight text-[#111111]"
									>
										Employee credentials
									</h2>
								</div>
								<div className="flex h-11 w-11 items-center justify-center rounded-sm border border-[#2563eb]/20 bg-[#2563eb]/10 text-[#2563eb]">
									<ShieldCheck aria-hidden="true" size={22} strokeWidth={1.8} />
								</div>
							</div>
						</div>

						<form noValidate onSubmit={handleSubmit} className="pt-6">
							<div className="space-y-4 xl:space-y-5">
								<CredentialField
									autoComplete="username"
									id="internal-login-email"
									isDisabled={isSubmitting || !isLoginConfigured}
									label="Employee email"
									onChange={handleEmailChange}
									state={emailState}
									type="email"
									value={email}
								/>
								<CredentialField
									autoComplete="current-password"
									id="internal-login-password"
									isDisabled={isSubmitting || !isLoginConfigured}
									label="Password"
									onChange={handlePasswordChange}
									state={passwordState}
									type="password"
									value={password}
								/>
							</div>

							<LoginStatusMessage
								code={isLoginConfigured ? loginError : 'not_configured'}
							/>

							<Button
								type="submit"
								isDisabled={isSubmitting || !isLoginConfigured}
								className="group mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-[#2563eb] px-4 font-[family-name:var(--font-archivo)] text-sm font-bold text-white outline-none transition-colors hover:bg-[#1d4ed8] focus-visible:ring-2 focus-visible:ring-[#2563eb]/35 disabled:cursor-not-allowed disabled:bg-black/25"
							>
								{isSubmitting ? (
									<ArrowRight aria-hidden="true" size={18} />
								) : (
									<ArrowRight
										aria-hidden="true"
										size={18}
										className="motion-safe:transition-transform group-hover:motion-safe:translate-x-0.5"
									/>
								)}
								{isSubmitting
									? 'Entering internal ops'
									: isLoginConfigured
										? 'Enter internal ops'
										: 'Login not configured'}
							</Button>
						</form>

						<EmployeeLoginHelp />
					</section>
				</aside>
			</main>
		</div>
	)
}

function LoginSquareField() {
	return (
		<div aria-hidden="true" className="login-square-cells">
			{LOGIN_SQUARE_CELLS.map((cell) => (
				<span
					key={cell.id}
					className={`login-square-cell ${
						cell.tone === 'blue'
							? 'login-square-cell-blue'
							: 'login-square-cell-ink'
					}`}
					style={{
						animationDelay: cell.delay,
						animationDuration: cell.duration,
						gridColumn: `${cell.column} / span 1`,
						gridRow: `${cell.row} / span 1`,
					}}
				/>
			))}
		</div>
	)
}

function LoginStatusMessage({ code }: { code: InternalLoginErrorCode | null }) {
	if (!code) return null

	const message = getLoginErrorMessage(code)

	return (
		<p
			role="alert"
			className="mt-4 border border-black/10 bg-black/[0.025] px-3 py-2 font-[family-name:var(--font-archivo)] text-sm leading-5 text-black/62"
		>
			{message}
		</p>
	)
}

function getLoginErrorMessage(code: InternalLoginErrorCode): string {
	switch (code) {
		case 'not_configured':
			return 'Login is not configured on this server. Contact ops support.'
		case 'invalid_credentials':
			return 'Email or password was not accepted.'
		case 'wrong_pool':
			return 'This account is not provisioned for internal operations.'
		case 'unexpected':
			return 'Login could not be completed. Try again or contact ops support.'
	}
}

function EmployeeLoginHelp() {
	return (
		<div className="mt-7 border-t border-black/10 pt-5">
			<details className="group xl:hidden">
				<summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 border border-black/10 px-3 text-[#111111] transition-colors hover:border-[#2563eb]/35 hover:bg-[#2563eb]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/25 [&::-webkit-details-marker]:hidden">
					<span className="flex min-w-0 items-center gap-3">
						<LifeBuoy
							aria-hidden="true"
							size={17}
							strokeWidth={1.8}
							className="shrink-0 text-[#2563eb]"
						/>
						<span className="truncate font-[family-name:var(--font-archivo)] text-sm font-bold">
							Need help?
						</span>
					</span>
					<ChevronDown
						aria-hidden="true"
						size={16}
						className="shrink-0 text-black/35 transition-transform group-open:rotate-180"
					/>
				</summary>
				<div className="pt-4">
					<EmployeeLoginHelpContent />
				</div>
			</details>

			<div className="hidden xl:block">
				<EmployeeLoginHelpContent />
			</div>
		</div>
	)
}

function EmployeeLoginHelpContent() {
	return (
		<>
			<div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3">
				<div className="flex h-11 w-11 items-center justify-center rounded-sm border border-black/10 bg-black/[0.025] text-[#111111]">
					<UserRoundCheck aria-hidden="true" size={20} strokeWidth={1.8} />
				</div>
				<div>
					<p className="font-[family-name:var(--font-archivo)] text-sm font-bold text-[#111111]">
						Employee entry only
					</p>
					<p className="mt-1 font-[family-name:var(--font-archivo)] text-sm leading-6 text-black/60">
						Use the account issued for internal operations. Access follows your
						assigned team, role, and employee pool.
					</p>
				</div>
			</div>

			<div className="mt-5 grid gap-2">
				<a
					href="mailto:support@hyperquote.net?subject=Internal%20ops%20access"
					className="group flex min-h-11 items-center justify-between gap-3 border border-black/10 px-3 text-[#111111] transition-colors hover:border-[#2563eb]/35 hover:bg-[#2563eb]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/25"
				>
					<span className="flex min-w-0 items-center gap-3">
						<LifeBuoy
							aria-hidden="true"
							size={17}
							strokeWidth={1.8}
							className="shrink-0 text-[#2563eb]"
						/>
						<span className="truncate font-[family-name:var(--font-archivo)] text-sm font-semibold">
							Contact ops support
						</span>
					</span>
					<ArrowRight
						aria-hidden="true"
						size={16}
						className="shrink-0 text-black/35 transition-transform group-hover:translate-x-0.5"
					/>
				</a>
			</div>

			<div className="mt-5 border-t border-black/10 pt-4">
				<p className="font-[family-name:var(--font-plex-mono)] text-[11px] uppercase text-black/45">
					Wrong place?
				</p>
				<div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
					<LoginExternalLink
						href="https://portal.hyperquote.net"
						icon={Building2}
						label="Customer portal"
					/>
					<LoginExternalLink
						href="https://hyperquote.net"
						icon={ExternalLink}
						label="Public website"
					/>
				</div>
			</div>
		</>
	)
}

function LoginExternalLink({
	href,
	icon: Icon,
	label,
}: {
	href: string
	icon: LucideIcon
	label: string
}) {
	return (
		<a
			href={href}
			target="_blank"
			rel="noreferrer"
			className="group flex min-h-10 items-center justify-between gap-2 border border-black/10 px-3 text-[#111111] transition-colors hover:border-black/20 hover:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb]/25"
		>
			<span className="flex min-w-0 items-center gap-2">
				<Icon
					aria-hidden="true"
					size={16}
					strokeWidth={1.8}
					className="shrink-0 text-black/45"
				/>
				<span className="truncate font-[family-name:var(--font-archivo)] text-sm font-semibold">
					{label}
				</span>
			</span>
			<ExternalLink
				aria-hidden="true"
				size={14}
				className="shrink-0 text-black/35 transition-transform group-hover:translate-x-0.5"
			/>
		</a>
	)
}

function CredentialField({
	autoComplete,
	id,
	isDisabled,
	label,
	onChange,
	state,
	type,
	value,
}: {
	autoComplete: string
	id: string
	isDisabled: boolean
	label: string
	onChange: (value: string) => void
	state: LoginFieldState
	type: 'email' | 'password'
	value: string
}) {
	const lineColor =
		state === 'invalid'
			? '#b91c1c'
			: state === 'valid'
				? '#2563eb'
				: 'rgba(17, 17, 17, 0.22)'

	return (
		<div>
			<label
				htmlFor={id}
				className="font-[family-name:var(--font-plex-mono)] text-[11px] uppercase text-black/55"
			>
				{label}
			</label>
			<input
				id={id}
				type={type}
				value={value}
				autoComplete={autoComplete}
				disabled={isDisabled}
				aria-invalid={state === 'invalid' ? 'true' : 'false'}
				onChange={(event) => onChange(event.currentTarget.value)}
				style={{ borderLeftColor: lineColor }}
				className="mt-2 h-12 w-full select-text rounded-sm border border-black/10 border-l-[3px] border-l-[#2563eb] bg-white px-3 font-[family-name:var(--font-archivo)] text-[15px] text-[#111111] outline-none transition-colors placeholder:text-black/35 focus:border-[#2563eb] disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-black/40"
			/>
		</div>
	)
}

function getInvalidFields(email: string, password: string): LoginInvalidFields {
	const invalidFields: LoginInvalidFields = {}
	if (!isEmailValid(email)) invalidFields.email = true
	if (!isPasswordValid(password)) invalidFields.password = true
	return invalidFields
}

function getFieldState(
	field: LoginField,
	value: string,
	isInvalid: boolean,
): LoginFieldState {
	if (isInvalid) return 'invalid'
	if (field === 'email' ? isEmailValid(value) : isPasswordValid(value)) {
		return 'valid'
	}
	return 'neutral'
}

function isEmailValid(value: string): boolean {
	const trimmedEmail = value.trim()
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)
}

function isPasswordValid(value: string): boolean {
	return value.length > 0
}

function clearInvalidField(
	current: LoginInvalidFields,
	field: LoginField,
): LoginInvalidFields {
	const next = { ...current }
	delete next[field]
	return next
}
