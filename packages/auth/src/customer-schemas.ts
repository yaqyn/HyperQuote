import { z } from 'zod'

export const customerPhoneInput = z.string().regex(/^(10|11|12|15)\d{8}$/)

export const customerOtpCodeInput = z
	.string()
	.length(6)
	.regex(/^\d{6}$/)

export const sendCustomerOtpInput = z.object({
	method: z.enum(['whatsapp', 'sms']),
	phone: customerPhoneInput,
})

export const verifyCustomerOtpInput = z.object({
	code: customerOtpCodeInput,
	phone: customerPhoneInput,
})

export const createCustomerAccountInput = z
	.object({
		companyName: z.string().min(1).max(200),
		email: z.string().trim().email().max(254).optional(),
		fullName: z.string().min(1).max(100),
		method: z.enum(['phone_otp', 'email_password']).optional(),
		password: z.string().min(6).max(128).optional(),
		phone: customerPhoneInput,
	})
	.superRefine((input, ctx) => {
		const hasEmail = Boolean(input.email?.trim())
		const hasPassword = Boolean(input.password)
		if (hasEmail === hasPassword) return
		ctx.addIssue({
			code: 'custom',
			message: 'Email and password must be provided together.',
			path: hasEmail ? ['password'] : ['email'],
		})
	})

export const claimCustomerAccountInput = z.object({
	phone: customerPhoneInput,
})

export const customerEmailPasswordInput = z.object({
	email: z.string().trim().email().max(254),
	password: z.string().min(6).max(128),
})

export const customerPasswordResetRequestInput = z.object({
	email: z.string().trim().email().max(254),
})

export const customerPasswordResetCompleteInput = z.object({
	password: z.string().min(6).max(128),
	tokenHash: z.string().min(16).max(512),
})
