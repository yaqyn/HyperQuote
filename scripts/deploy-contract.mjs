const START_RUNTIME_SECRETS = [
	'SUPABASE_URL',
	'SUPABASE_ANON_KEY',
	'SUPABASE_SERVICE_ROLE_KEY',
	'GROQ_API_KEY',
	'GROQ_MODEL',
	'USE_AI',
]

const CUSTOMER_AUTH_RUNTIME_SECRETS = ['COOKIE_DOMAIN', 'SUPABASE_COOKIE_NAME']
const DRIVER_RUNTIME_SECRETS = [
	'SUPABASE_URL',
	'SUPABASE_ANON_KEY',
	'SUPABASE_SERVICE_ROLE_KEY',
	'SUPABASE_COOKIE_NAME',
]

const APP_DEPLOY_CONTRACTS = {
	website: {
		buildVars: [],
		runtimeSecrets: [
			...START_RUNTIME_SECRETS,
			...CUSTOMER_AUTH_RUNTIME_SECRETS,
		],
	},
	portal: {
		buildVars: [
			'VITE_SUPABASE_URL',
			'VITE_SUPABASE_ANON_KEY',
			'VITE_INTERNAL_URL',
		],
		runtimeSecrets: [
			...START_RUNTIME_SECRETS,
			...CUSTOMER_AUTH_RUNTIME_SECRETS,
		],
	},
	internal: {
		buildVars: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
		runtimeSecrets: [...START_RUNTIME_SECRETS, 'SUPABASE_COOKIE_NAME'],
	},
	driver: {
		buildVars: [],
		runtimeSecrets: DRIVER_RUNTIME_SECRETS,
	},
}

export function parseArgs(argv) {
	const args = {}
	for (let index = 0; index < argv.length; index += 1) {
		const token = argv[index]
		if (!token.startsWith('--')) continue
		const key = token.slice(2)
		const next = argv[index + 1]
		if (!next || next.startsWith('--')) {
			args[key] = 'true'
			continue
		}
		args[key] = next
		index += 1
	}
	return args
}

export function getContractApps(app) {
	if (!app || app === 'all') return Object.keys(APP_DEPLOY_CONTRACTS)
	if (!APP_DEPLOY_CONTRACTS[app]) {
		throw new Error(`Unknown deploy app: ${app}`)
	}
	return [app]
}

function unique(values) {
	return [...new Set(values)]
}

export function getBuildVarsForApps(apps) {
	return unique(apps.flatMap((app) => APP_DEPLOY_CONTRACTS[app].buildVars))
}

export function getRuntimeSecretsForApp(app) {
	if (!APP_DEPLOY_CONTRACTS[app]) {
		throw new Error(`Unknown deploy app: ${app}`)
	}
	return APP_DEPLOY_CONTRACTS[app].runtimeSecrets
}
