import { verifyOTP } from '../../lib/auth'
import { OTP_LENGTH } from './authFields'

export async function verifyOtpCode(phone: string, digits: string[]) {
	const code = digits.join('')
	if (code.length !== OTP_LENGTH) return { status: 'incomplete' as const }

	const result = await verifyOTP({ data: { phone, code } })
	if (!result.success) {
		return {
			status: 'error' as const,
			error: result.error,
		}
	}

	return {
		status: 'success' as const,
		result,
	}
}
