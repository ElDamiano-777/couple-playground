# Shopping push: administrator setup

This is a prepared implementation, not an active notification service. No keys were generated, Edge Function deployed, scheduler enabled or hosted settings changed during development. The additive migration defaults to disabled. Damian must perform this setup in the existing Supabase project (`lyewmhtufesdccisqmin`); no additional service is required. Do not enable the UI until the migration, function and scheduler are ready.

## Data and delivery

Each signed-in person can register up to five browser subscriptions for their own account. Subscriptions use stable UUIDs, authenticated own-account RPC writes and no browser table reads. A unique endpoint cannot move to another account. Subscription endpoints and encryption keys are private device data: never copy them into tickets or logs.

Only future shopping inserts and actual `bought` changes enqueue events. Deleting items, rewriting an unchanged checkbox and applying the migration do not notify anyone. Queues record event/item/household/actor/recipient/device UUIDs and `added`, `bought` or `unbought`; no purchase text is copied. Only the other household member's registered devices are queued. Membership and registration are checked again immediately before each send. Removing a subscription/account removes its queued jobs. Events expire after one day.

The encrypted Web Push payload contains only `kind` and an opaque `eventId`. The service worker displays generic text, so names and purchases do not appear on the lock screen. Standard Apple, Google and Mozilla push infrastructure receives an endpoint and encrypted payload. This uses the providers associated with the person's browser subscription; no analytics service is added. HTTPS endpoint allowlists reject arbitrary destinations, credentials and custom ports in both SQL and worker code.

## Deploy and enable (Damian)

1. Review and publish the additive migration through the existing Supabase GitHub integration. Confirm `20261101040000_shopping_push.sql` succeeded. Keep `together_private.push_settings.enabled` false.
2. On a trusted administrator machine, install the Supabase CLI and authenticate to the existing project. Generate one VAPID pair with `npx --yes web-push@3.6.7 generate-vapid-keys --json`. Generate a separate strong worker credential with `openssl rand -hex 32`. These are administrator actions: do not generate them in the repository, paste private keys into chat or commit output. Keep the VAPID pair stable; replacing it requires devices to subscribe again.
3. Create a file **outside the repository**, readable only by its owner (`chmod 600`), with the following environment variable names and the generated values. Replace the contact with Damian's monitored contact address. The VAPID subject must be a valid `mailto:` or HTTPS URL. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are automatically available inside the hosted Edge Function; never add the service role key to the frontend.

   ```dotenv
   VAPID_PUBLIC_KEY=<generated public key>
   VAPID_PRIVATE_KEY=<generated private key>
   VAPID_SUBJECT=mailto:<administrator contact>
   PUSH_WORKER_SECRET=<generated separate worker credential>
   ```

4. From this repository, deploy to the existing project:

   ```sh
   supabase secrets set --project-ref lyewmhtufesdccisqmin --env-file /absolute/private/path/push.env
   supabase functions deploy push-worker --project-ref lyewmhtufesdccisqmin --no-verify-jwt
   ```

   JWT verification is intentionally disabled only for this function. The function requires its separate `Authorization: Bearer <PUSH_WORKER_SECRET>` header on every POST. Browser JWTs and the public project key cannot invoke delivery. Never put that header in app code. An authenticated manual invocation while database readiness is disabled should return `{"processed":0}`; requests without the worker secret should return 401. Missing worker configuration returns 503. Avoid browser consoles or shell history for secret-bearing invocations.

5. In Supabase enable the existing project's **Cron** (`pg_cron`) and **Database Webhooks / pg_net** extensions if absent. Use Supabase Vault to create two secrets: `together_push_worker_url` with `https://lyewmhtufesdccisqmin.supabase.co/functions/v1/push-worker`, and `together_push_worker_secret` with the same `PUSH_WORKER_SECRET`. Enter values through the administrator dashboard's secret fields. Do not store a literal credential in a cron command or this document. Schedule once using the SQL Editor:

   ```sql
   select cron.schedule('together-shopping-push', '* * * * *', $cron$
     select net.http_post(
       url := (select decrypted_secret from vault.decrypted_secrets where name = 'together_push_worker_url'),
       headers := jsonb_build_object(
         'Content-Type', 'application/json',
         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'together_push_worker_secret')
       ),
       body := '{}'::jsonb,
       timeout_milliseconds := 60000
     );
   $cron$);
   ```

   Check for an existing job with this name before scheduling; avoid duplicate jobs. This document does not install extensions or activate a scheduler. Cron/Vault access remains administrator-only.

6. Set the **public** VAPID key and readiness in the SQL Editor, after the above checks:

   ```sql
   update together_private.push_settings
   set public_key = '<the generated VAPID public key>', enabled = true
   where singleton;
   ```

   This public key must exactly match `VAPID_PUBLIC_KEY` in the Edge Function. Neither private VAPID material nor the worker credential belongs in a migration. The authenticated `push_configuration()` RPC now returns `{"publicKey":"..."}`; until enabled it returns null.

7. On each iPhone, install/open the app from the Home Screen (iOS 16.4 or later), sign into the intended account and explicitly enable shopping notifications. Use two separate accounts/phones: add an item, cross it off, then uncross it. Confirm only the partner receives generic notifications; unchanged checkboxes and deletions produce none. Declining permission must leave shopping usable. Test turning notifications off and signing out. A browser emulator cannot establish real Apple push delivery.

The scheduler runs once per minute; delivery is asynchronous and subject to the browser/OS. Each run atomically leases up to ten jobs for two minutes. Provider requests time out after five seconds. At most five attempts use bounded exponential backoff; 404/410 removes the subscription, malformed/unauthorized provider requests are dropped, and transient failures retry. A process crash after provider acceptance can resend the same event; the service worker's stable event tag replaces a duplicate visible notification. Exactly-once transport is not guaranteed.

## Disable, inspect and maintain

Disable new registrations, queueing and delivery immediately with:

```sql
update together_private.push_settings set enabled = false where singleton;
select cron.unschedule('together-shopping-push');
```

No shopping records are changed. Expired jobs are cleaned during worker runs. For an extended shutdown, remove the scheduled job and delete expired queue rows using administrator access. Avoid inspecting raw subscription data. Function responses contain only a processed count and generic errors; application code does not log endpoints, tokens, payloads or provider exception bodies. Configure platform access-log retention appropriately because infrastructure may record request metadata. Protect Vault, service role and Edge Function secrets as privileged credentials.

Local checks (isolated synthetic data; never hosted data):

```sh
python3 scripts/test-push-database.py
node --test supabase/functions/push-worker/policy.test.ts
deno check supabase/functions/push-worker/index.ts
```

The SQL runner uses a disposable PostgreSQL 17 Docker container and includes the existing household/access tests. Existing CI checks are unchanged. The focused tests cover access isolation, other-member events, endpoint/key rejection, device limits, claims, revoked devices/membership, retry bounds and expiry. Actual hosted Cron/Edge deployment and two-iPhone delivery still require the administrator setup and device checks above.

Development validation passed: disposable PostgreSQL tests including simultaneous worker claims, three policy tests, Deno 2.9.6 typecheck, and a local Deno HTTP smoke test. The runtime test rejected missing/wrong/browser credentials and GET with 401; the correct synthetic worker secret reached the missing-configuration guard (503). It sent no provider requests. In this Node-based workspace, the typecheck used `npx --yes deno check --node-modules-dir=none --no-lock supabase/functions/push-worker/index.ts` to keep Deno's dependency cache separate from the app.
