const LOCAL_TWILIO_ACCOUNT_SID = ['local', 'test', 'account', 'sid'].join('-')
const LOCAL_TWILIO_MESSAGE_SERVICE_SID = [
	'local',
	'test',
	'message',
	'service',
	'sid',
].join('-')
const LOCAL_TWILIO_AUTH_TOKEN = ['local', 'test', 'auth', 'token'].join('-')

export function withLocalSupabaseAuthEnv(env = process.env) {
	return {
		...env,
		SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID:
			firstString(
				env.SUPABASE_AUTH_SMS_TWILIO_ACCOUNT_SID,
				env.TWILIO_ACCOUNT_SID,
			) ?? LOCAL_TWILIO_ACCOUNT_SID,
		SUPABASE_AUTH_SMS_TWILIO_MESSAGE_SERVICE_SID:
			firstString(
				env.SUPABASE_AUTH_SMS_TWILIO_MESSAGE_SERVICE_SID,
				env.TWILIO_MESSAGE_SERVICE_SID,
				twilioMessagingServiceSid(env.TWILIO_SID),
			) ?? LOCAL_TWILIO_MESSAGE_SERVICE_SID,
		SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN:
			firstString(
				env.SUPABASE_AUTH_SMS_TWILIO_AUTH_TOKEN,
				env.TWILIO_AUTH_TOKEN,
			) ?? LOCAL_TWILIO_AUTH_TOKEN,
	}
}

function firstString(...values) {
	for (const value of values) {
		if (typeof value === 'string' && value.trim()) return value
	}
	return undefined
}

function twilioMessagingServiceSid(value) {
	if (typeof value !== 'string') return undefined
	const trimmed = value.trim()
	return trimmed.startsWith('MG') ? trimmed : undefined
}
