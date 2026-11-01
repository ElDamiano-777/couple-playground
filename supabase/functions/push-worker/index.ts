import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
// @ts-types="npm:@types/web-push@3.6.4"
import webpush from 'npm:web-push@3.6.7';
import { deliveryOutcome, notificationPayload, validEndpoint } from './policy.ts';

async function authorized(request: Request, secret: string): Promise<boolean> {
  const incoming = request.headers.get('authorization') ?? '';
  // Digest comparison avoids early-exit comparison of the server-only credential.
  const digest = async (value: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  const [left, right] = await Promise.all([digest(incoming), digest(`Bearer ${secret}`)]);
  return left.reduce((difference, byte, index) => difference | (byte ^ right[index]), 0) === 0;
}

Deno.serve(async (request: Request) => {
  const secret = Deno.env.get('PUSH_WORKER_SECRET');
  if (!secret || secret.length < 32) return new Response('Not configured', { status: 503 });
  if (request.method !== 'POST' || !await authorized(request, secret)) return new Response('Unauthorized', { status: 401 });

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const privateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const subject = Deno.env.get('VAPID_SUBJECT');
  if (!url || !serviceKey || !publicKey || !privateKey || !subject) return new Response('Not configured', { status: 503 });

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const database = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: jobs, error } = await database.rpc('claim_push_jobs');
    if (error) return new Response('Delivery unavailable', { status: 503 });
    let processed = 0;
    for (const job of jobs ?? []) {
      const { data: delivery, error: lookupError } = await database.rpc('push_delivery', { job_id: job.id, token: job.claim_token });
      if (lookupError) continue; // Lease expiry safely retries database failures.
      let outcome: 'sent' | 'gone' | 'skip' | 'retry' = 'skip';
      if (delivery && validEndpoint(delivery.endpoint)) {
        try {
          // web-push encrypts the payload with the device keys and does not follow redirects.
          await webpush.sendNotification({ endpoint: delivery.endpoint, keys: delivery.keys }, notificationPayload(delivery.eventId, delivery.kind), {
            TTL: 3600,
            urgency: 'normal',
            timeout: 5000,
          });
          outcome = 'sent';
        } catch (error) {
          // Provider exceptions contain endpoint URLs and response bodies: never log them.
          const status = typeof error === 'object' && error !== null && 'statusCode' in error ? Number(error.statusCode) : undefined;
          outcome = deliveryOutcome(status);
        }
      }
      const { error: finishError } = await database.rpc('finish_push_job', { job_id: job.id, token: job.claim_token, outcome });
      if (!finishError) processed++;
    }
    return Response.json({ processed });
  } catch {
    return new Response('Delivery unavailable', { status: 503 });
  }
});
