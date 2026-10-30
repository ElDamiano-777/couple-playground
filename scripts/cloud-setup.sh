#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
npm ci
npx playwright install --with-deps chromium webkit
printf '\nSetup complete. Use npm run verify before publishing.\n'
