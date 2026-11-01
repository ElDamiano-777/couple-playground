# Together database

The root `supabase/` directory is for the existing Supabase GitHub integration, working directory `.`, production branch `main`. Migrations are additive; no existing project or live data is reset.

Before auth/data implementation the required cases are: two separately authenticated pair members can add, read, mark and delete purchases; signed-out and unrelated accounts cannot access a known household or item; membership and authorship cannot be forged; expired, replaced, reused and concurrently redeemed invitations cannot admit a third member. Local notes remain local and are never uploaded.

`python3 scripts/test-database.py` starts an isolated PostgreSQL 17 container, applies the real migration and exercises those access rules, including concurrent redemption from separate connections. It never connects to the hosted project. Docker with the local Unix socket is required. Browser/auth integration tests are separate.

The hosted project is `lyewmhtufesdccisqmin`; only the public project URL and publishable key belong in the client. No database password or privileged key is needed by the browser. Do not commit session tokens, invitation codes or real purchases.

## Shared child and pet profiles

`20261101050000_family_profiles.sql` adds `family_profiles` in the existing project, with stable profile/household UUIDs, an immutable `child`/`pet` kind, a trimmed 1–100 character name, an optional trimmed 1–80 character animal type for pets only, creator identity and creation time. Both household members can add, read, rename and delete their shared cards. RLS blocks unrelated and anonymous accounts; column privileges prevent clients from forging identity/authorship or moving a card to another household. Deleting the creator's account preserves cards for the remaining partner with null authorship; deleting the final household removes its cards. No photos, additional services, secrets or setup are introduced.

`20261101060000_family_birthdays.sql` adds optional `birth_date` calendar dates for both children and pets, from `0001-01-01` through the current UTC date. Existing cards stay null. PostgreSQL rejects impossible dates, future dates and infinite values. The client sends `YYYY-MM-DD` or null to add, edit or clear a birthday. Only this column gains insert/update privileges; existing household RLS and immutable identity fields remain unchanged. Birthdays stay within the household and are not used for notifications.

`python3 scripts/test-family-database.py` applies the first two migrations and both family migrations to a disposable PostgreSQL 17 container. It runs the existing access tests plus synthetic child/pet CRUD, partner edits, optional birthdays, valid leap dates, impossible/future-date rejection, foreign/anonymous access attempts, immutable-column checks, creator deletion and final-household cleanup. It never connects to hosted data and leaves existing workflows/checks unchanged.

The GitHub integration must report successful migration before enabling shared shopping. `supabase/config.toml` also documents the intended Auth site/redirect URLs; verify these in Authentication → URL Configuration because a database migration does not update the hosted Auth settings. Email confirmation stays enabled. Do not disable it to simplify testing.

## Named POC accounts

The third migration adds only two reserved, owner-requested POC users and a separate household. They authenticate through the real Auth service with an entered password; only bcrypt verifiers are committed. Global email-confirmation settings and existing personal users are untouched. A trigger prevents testers from changing or deleting these shared identities.

`TOGETHER_POC_TEST_PASSWORD` plus `python3 scripts/test-poc-login.py` exercises the full migration chain with PostgreSQL 17 and GoTrue v2.197.0 in disposable containers, including login, wrong-password rejection, refresh, private/POC household isolation and identity protection. It never uses the hosted database. The simpler RLS runner continues to test the first two migrations with synthetic auth roles.
