import type { Dispatch, RefObject, SetStateAction } from 'react'

export const EGYPT_COUNTRY_CODE = '+20'
export const EGYPT_MOBILE_REGEX = /^(10|11|12|15)\d{8}$/
export const OTP_LENGTH = 6
export const OTP_SLOTS = Array.from(
	{ length: OTP_LENGTH },
	(_, i) => `otp-slot-${i}` as const,
)

export function emptyOtpCode() {
	return Array.from({ length: OTP_LENGTH }, () => '')
}

export function sanitizeAuthPhoneInput(value: string) {
	return value.replace(/\D/g, '').slice(0, 10)
}

export function resetOtpCode(
	inputRefs: RefObject<(HTMLInputElement | null)[]>,
	setCode: Dispatch<SetStateAction<string[]>>,
) {
	setCode(emptyOtpCode())
	inputRefs.current[0]?.focus()
}
