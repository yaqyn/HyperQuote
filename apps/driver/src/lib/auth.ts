import { z } from 'zod'
import { MOCK_CURRENT_DRIVER_ID } from './mock-data'

export const loginSchema = z.object({
	email: z.string().trim().email(),
	password: z.string().min(8),
})

export type LoginFormValues = z.infer<typeof loginSchema>

export interface DriverAuthSession {
	driverId: string
	email: string
	startedAt: string
}

export function createMockDriverSession(
	values: LoginFormValues,
): DriverAuthSession {
	return {
		driverId: MOCK_CURRENT_DRIVER_ID,
		email: values.email,
		startedAt: new Date().toISOString(),
	}
}

export function isMockLoginAccepted(values: LoginFormValues): boolean {
	return loginSchema.safeParse(values).success
}
