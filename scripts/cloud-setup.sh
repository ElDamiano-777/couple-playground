#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
if ! command -v chromium >/dev/null 2>&1; then
  npx playwright install chromium
fi
printf '\nCloud setup complete. Use npm run verify:cloud. GitHub must pass both browser projects before publishing.\n'
