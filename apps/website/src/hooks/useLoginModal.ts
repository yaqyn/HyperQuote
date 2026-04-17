import { create } from 'zustand'

type LoginStep = 'phone' | 'otp' | 'create' | 'claiming'

interface LoginModalState {
	isOpen: boolean
	step: LoginStep
	phone: string
	redirectTo: string | null
	claimableCompany: string | null
	open: (redirectTo?: string) => void
	close: () => void
	setStep: (step: LoginStep) => void
	setPhone: (phone: string) => void
	setClaimableCompany: (company: string | null) => void
	reset: () => void
}

export const useLoginModal = create<LoginModalState>((set) => ({
	isOpen: false,
	step: 'phone',
	phone: '',
	redirectTo: null,
	claimableCompany: null,
	open: (redirectTo) =>
		set({
			isOpen: true,
			step: 'phone',
			phone: '',
			redirectTo: redirectTo ?? null,
			claimableCompany: null,
		}),
	close: () => set({ isOpen: false }),
	setStep: (step) => set({ step }),
	setPhone: (phone) => set({ phone }),
	setClaimableCompany: (company) => set({ claimableCompany: company }),
	reset: () =>
		set({
			isOpen: false,
			step: 'phone',
			phone: '',
			redirectTo: null,
			claimableCompany: null,
		}),
}))

export type { LoginModalState, LoginStep }
