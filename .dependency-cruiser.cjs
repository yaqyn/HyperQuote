const applicationIds = ['website', 'portal', 'internal', 'driver']

const crossApplicationRules = applicationIds.map((applicationId) => ({
	name: `no-${applicationId}-to-sibling-app`,
	comment:
		'Applications communicate through shared packages or APIs, not source imports.',
	severity: 'error',
	from: { path: `^apps/${applicationId}/` },
	to: {
		path: `^apps/(?!${applicationId}/)(?:${applicationIds.join('|')})/`,
	},
}))

module.exports = {
	forbidden: [
		{
			name: 'no-circular',
			comment:
				'Circular dependencies make module ownership and initialization order ambiguous.',
			severity: 'error',
			from: {},
			to: { circular: true },
		},
		{
			name: 'no-unresolvable',
			comment:
				'Every import must resolve from the checked-in workspace and manifests.',
			severity: 'error',
			from: {},
			to: { couldNotResolve: true },
		},
		{
			name: 'no-package-to-app',
			comment: 'Shared packages must not depend on application source.',
			severity: 'error',
			from: { path: '^packages/' },
			to: { path: '^apps/' },
		},
		...crossApplicationRules,
		{
			name: 'no-client-auth-server-import',
			comment:
				'Browser components, hooks, and stores must not import privileged auth helpers.',
			severity: 'error',
			from: { path: '^apps/[^/]+/src/(?:components|hooks|stores)/' },
			to: { path: '^packages/auth/src/server\\.ts$' },
		},
	],
	options: {
		doNotFollow: { path: 'node_modules' },
		tsConfig: { fileName: 'tsconfig.json' },
		enhancedResolveOptions: {
			exportsFields: ['exports'],
			conditionNames: ['import', 'types', 'default'],
		},
	},
}
