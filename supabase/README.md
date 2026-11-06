# Together database

The root `supabase/` directory is for the existing Supabase GitHub integration, working directory `.`, production branch `main`. Migrations are additive; no existing project or live data is reset.

Before auth/data implementation the required cases are: two separately authenticated pair members can add, read, mark and delete purchases; signed-out and unrelated accounts cannot access a known household or item; membership and authorship cannot be forged; expired, replaced, reused and concurrently redeemed invitations cannot admit a third member. Local notes remain local and are never uploaded.

`python3 scripts/test-database.py` starts an isolated PostgreSQL 17 container, applies the real migration and exercises those access rules, including concurrent redemption from separate connections. It never connects to the hosted project. Docker with the local Unix socket is required. Browser/auth integration tests are separate.

The hosted project is `lyewmhtufesdccisqmin`; only the public project URL and publishable key belong in the client. No database password or privileged key is needed by the browser. Do not commit session tokens, invitation codes or real purchases.

## Web Push owner configuration

`20261104010000_web_push_notifications.sql` records Shopping additions and completed purchases server-side; `20261106030000_task_push_events.sql` adds newly created household tasks, covered by the "new items" preference. It creates private subscriptions, preference, event and delivery tables, then calls the `push-delivery` Edge Function. The function excludes the actor, reads the recipient's household membership at delivery time, respects individual preferences and stores one delivery key per event/device. It removes endpoints that return HTTP 404 or 410. The minute schedule also evaluates weekly reminders in the member's selected IANA timezone and only when unpurchased items still exist. Delivery logs are deleted after 30 days.

Before enabling the feature in production, a Supabase Owner or Administrator must:

1. Enable `pg_net`, `pg_cron` and Supabase Vault in the project Database Extensions page. The migration safely records events even before the dispatch token exists, so Shopping never fails because notification configuration is incomplete. If extensions are enabled after this migration, run this once in the SQL editor:

   ```sql
   do $$ begin
     if to_regprocedure('cron.schedule(text,text,text)') is not null then
       if not exists (select 1 from cron.job where jobname = 'together-push-schedule') then
         perform cron.schedule('together-push-schedule', '* * * * *', $schedule$select public.run_together_push_schedule()$schedule$);
       end if;
     end if;
   end $$;
   ```
2. Generate a VAPID key pair locally. Keep the private key out of source control. Set `VAPID_SUBJECT` to a monitored `mailto:` address.
3. Set these Edge Function secrets: `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and a random `PUSH_DELIVERY_TOKEN`.
4. Add the same random value to Vault under the exact name `together_push_delivery_token`. This is the token database triggers use to call the private delivery function.
5. Deploy `push-subscriptions` and `push-delivery` from `supabase/functions/` to project `lyewmhtufesdccisqmin`.

Neither VAPID private material nor `PUSH_DELIVERY_TOKEN` belongs in GitHub Pages, Git, browser code or support screenshots. The browser receives only the VAPID public key from the authenticated `push-subscriptions` function.

For a real-device test, install Together from the Home Screen on iPhone and from Chrome on Android, enable notifications for both accounts, then add and buy separate uniquely named items. Confirm each partner receives one notification while the app is closed. Set two different weekly reminder times, leave an unpurchased item, and confirm one reminder at each chosen time. Do not mark the feature as live until this has passed.

## Google Calendar, read-only

`20261105020000_google_calendar_readonly.sql` creates private connection and calendar-preference records. Browser clients have no database permissions for either table. The `calendar-google` Edge Function verifies the Together session, reads only calendars selected by the owner, and sends a partner only calendars explicitly marked Share. It uses Google’s `calendar.readonly` scope; no Google event write endpoint exists.

Before Google connection can work in production, a Supabase Owner or Administrator must configure it once:

1. In Google Cloud Console, create or select a project, enable **Google Calendar API**, then configure an OAuth consent screen. Add Masha and Damian as test users while the app is in Testing.
2. Create a **Web application** OAuth client. Add this exact authorized redirect URI: `https://lyewmhtufesdccisqmin.supabase.co/functions/v1/calendar-google?action=callback`.
3. Deploy `calendar-google` from `supabase/functions/` to project `lyewmhtufesdccisqmin` with JWT verification disabled. The function validates the Together bearer token itself.
4. Set Edge Function secrets: `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, and `GOOGLE_CALENDAR_TOKEN_KEY`. Generate the last value as a random 32-byte key encoded with base64. Do not put it, Google’s client secret, an OAuth code, or a refresh token in GitHub, browser code, screenshots, or support messages.
5. Open Together → Home → Calendar on each phone, use **Connect Google Calendar**, complete Google’s consent screen, choose visible calendars, and only then switch on Share for calendars the partner may see.

Google returns refresh tokens only for offline consent. A Testing consent screen can issue refresh tokens that expire after seven days; publish the consent screen or reconnect when Google asks. The connection is read-only: Together expands recurring events for display, keeps all-day values as dates, and asks Google for every refresh instead of copying events into Together.

## Shared child and pet profiles

`20261101050000_family_profiles.sql` adds `family_profiles` in the existing project, with stable profile/household UUIDs, an immutable `child`/`pet` kind, a trimmed 1–100 character name, an optional trimmed 1–80 character animal type for pets only, creator identity and creation time. Both household members can add, read, rename and delete their shared cards. RLS blocks unrelated and anonymous accounts; column privileges prevent clients from forging identity/authorship or moving a card to another household. Deleting the creator's account preserves cards for the remaining partner with null authorship; deleting the final household removes its cards. No photos, additional services, secrets or setup are introduced.

`20261101060000_family_birthdays.sql` adds optional `birth_date` calendar dates for both children and pets, from `0001-01-01` through the current UTC date. Existing cards stay null. PostgreSQL rejects impossible dates, future dates and infinite values. The client sends `YYYY-MM-DD` or null to add, edit or clear a birthday. Only this column gains insert/update privileges; existing household RLS and immutable identity fields remain unchanged. Birthdays stay within the household and are not used for notifications.

`python3 scripts/test-family-database.py` applies the first two migrations and both family migrations to a disposable PostgreSQL 17 container. It runs the existing access tests plus synthetic child/pet CRUD, partner edits, optional birthdays, valid leap dates, impossible/future-date rejection, foreign/anonymous access attempts, immutable-column checks, creator deletion and final-household cleanup. It never connects to hosted data and leaves existing workflows/checks unchanged.

The GitHub integration must report successful migration before enabling shared shopping. `supabase/config.toml` also documents the intended Auth site/redirect URLs; verify these in Authentication → URL Configuration because a database migration does not update the hosted Auth settings. Email confirmation stays enabled. Do not disable it to simplify testing.

## Named POC accounts

The third migration adds only two reserved, owner-requested POC users and a separate household. They authenticate through the real Auth service with an entered password; only bcrypt verifiers are committed. Global email-confirmation settings and existing personal users are untouched. A trigger prevents testers from changing or deleting these shared identities.

`TOGETHER_POC_TEST_PASSWORD` plus `python3 scripts/test-poc-login.py` exercises the full migration chain with PostgreSQL 17 and GoTrue v2.197.0 in disposable containers, including login, wrong-password rejection, refresh, private/POC household isolation and identity protection. It never uses the hosted database. The simpler RLS runner continues to test the first two migrations with synthetic auth roles.

## Recipes, wishlist and places

`20261101070000_folder_entries.sql` adds household-shared `folder_entries`: stable UUID, household UUID, immutable `kind` (`recipe`, `wish`, `place`), trimmed 1–150 character `title`, `notes` up to 20,000 characters (empty by default, newlines preserved), creator UUID and creation time. Both members can read, add, edit titles/notes and delete records. Existing household RLS excludes foreign and anonymous accounts; column privileges prevent changing or forging IDs, kind, household, authorship and timestamps. Creator deletion preserves records with null authorship for the remaining partner; final-household deletion cascades its records. No link fetching, extra service or new setup is involved.

`20261103050000_recipe_library.sql` adds optional category, preparation time and compressed photo fields to existing recipes. Existing notes and shared household access remain unchanged. Recipe photos use the same household-protected database storage as existing pet and favorite photos.

`20261103060000_recipe_import.sql` adds the original link, optional external photo link, ingredients and instructions to the same household-protected records. Recipe imports use the public Jina Reader service; social links and unavailable sites can be saved without extraction. No API key is used.

`20261103070000_recipe_servings.sql` adds the optional recipe yield while leaving existing recipes unchanged.

`20261103080000_recipe_caption.sql` adds an optional public post caption to household-protected recipes. The app reads accessible public metadata from Jina Reader and TikTok oEmbed when available; unavailable posts remain links.

`python3 scripts/test-folder-entries.py` runs the first two base migrations and this new migration in disposable PostgreSQL 17. It checks both members across all three kinds, multiline notes and limits, forbidden foreign/anonymous requests to known IDs, immutable columns and account-deletion cleanup. It never touches hosted data, runs no unrelated family tests and changes no existing CI checks.
