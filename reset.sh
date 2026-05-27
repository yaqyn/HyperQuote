#!/usr/bin/env bash
set -euo pipefail

confirmation_phrase="reset-hyperquote-production"

cat <<'EOF'
This will reset the HyperQuote production Supabase database.
It creates pre-reset dumps, rebuilds from migrations, seeds showcase data,
and recreates the primary auth accounts.
EOF

printf 'Type "%s" to continue: ' "$confirmation_phrase"
read -r confirmation

if [[ "$confirmation" != "$confirmation_phrase" ]]; then
	printf 'Reset cancelled.\n' >&2
	exit 1
fi

bun run secrets:check:production

HYPERQUOTE_CONFIRM_PRODUCTION_RESET=reset-hyperquote-production-showcase \
	infisical run --env prod --path /Projects/HyperQuote -- \
	bun run db:reset:production:showcase
