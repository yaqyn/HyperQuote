/**
 * Sign-in. Quiet centered card. Truck plate + 4-digit PIN.
 * No theatrics — just a real sign-in form.
 */

import { createRoute, redirect, useNavigate } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../stores/auth'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
	getParentRoute: () => rootRoute,
	path: '/login',
	beforeLoad: () => {
		if (useAuth.getState().session) throw redirect({ to: '/' })
	},
	component: LoginPage,
})

function LoginPage() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const signIn = useAuth((s) => s.signIn)
	const [plate, setPlate] = useState('CAI-1842')
	const [pin, setPin] = useState('')

	const submit = (e: React.FormEvent) => {
		e.preventDefault()
		if (pin.length !== 4) return
		signIn()
		navigate({ to: '/' })
	}

	return (
		<div className="grid min-h-dvh place-items-center bg-[var(--bg)] px-6">
			<div className="w-full max-w-[400px]">
				<div className="mb-8 text-center">
					<div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-[var(--r-md)] bg-[var(--accent)] text-[var(--accent-fg)]">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							role="img"
							aria-label="HQ"
						>
							<title>HyperQuote Driver</title>
							<path
								d="M4 17V7l8-4 8 4v10l-8 4-8-4z"
								stroke="currentColor"
								strokeWidth="1.6"
								strokeLinejoin="round"
							/>
							<path
								d="M4 7l8 4 8-4M12 11v10"
								stroke="currentColor"
								strokeWidth="1.6"
							/>
						</svg>
					</div>
					<h1 className="t-display">{t('login.title')}</h1>
					<p className="mt-2 text-[14px] text-[var(--ink-3)]">
						{t('login.subtitle')}
					</p>
				</div>

				<form onSubmit={submit} className="card overflow-hidden">
					<div className="p-5">
						<label className="block">
							<span className="t-label">{t('login.plate')}</span>
							<input
								className="field field--num mt-2 uppercase"
								value={plate}
								onChange={(e) => setPlate(e.target.value)}
								maxLength={10}
								autoComplete="off"
								placeholder="CAI-0000"
							/>
						</label>

						<label className="mt-4 block">
							<span className="t-label">{t('login.pin')}</span>
							<input
								className="field field--num mt-2 text-center text-[22px] tracking-[0.5em]"
								inputMode="numeric"
								maxLength={4}
								pattern="\d{4}"
								placeholder="••••"
								value={pin}
								onChange={(e) =>
									setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
								}
								// biome-ignore lint/a11y/noAutofocus: cab cold-start UX — driver shouldn't have to tap to focus PIN
								autoFocus
							/>
						</label>
					</div>
					<div className="border-t border-[var(--line)] bg-[var(--surface-2)] p-3">
						<button
							type="submit"
							disabled={pin.length !== 4}
							className="btn btn--primary btn--block btn--lg"
						>
							{t('login.signIn')}
							<ArrowRight size={16} strokeWidth={2} />
						</button>
					</div>
				</form>

				<p className="mt-6 text-center text-[12px] text-[var(--ink-4)]">
					{t('login.demoHint')}
				</p>
			</div>
		</div>
	)
}
