import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const origin = 'https://eldamiano-777.github.io';
const headers = {
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const emptyPreferences = {
  new_item_enabled: true, purchased_enabled: true, reminder_enabled: false,
  reminder_weekday: 0, reminder_time: '18:00:00', timezone: 'Europe/Berlin',
};

function validSubscription(value: unknown): value is { endpoint: string; keys: { p256dh: string; auth: string } } {
  const item = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  return typeof item?.endpoint === 'string' && item.endpoint.length <= 4096 &&
    typeof item.keys?.p256dh === 'string' && item.keys.p256dh.length <= 512 &&
    typeof item.keys?.auth === 'string' && item.keys.auth.length <= 512;
}

function validTimezone(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 64) return false;
  try { Intl.DateTimeFormat(undefined, { timeZone: value }); return true; } catch { return false; }
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return response({ error: 'Sign in first.' }, 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
  const { data: userResult, error: userError } = await admin.auth.getUser(token);
  if (userError || !userResult.user) return response({ error: 'Sign in first.' }, 401);
  const user = userResult.user;
  const membership = await admin.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle();
  if (membership.error || !membership.data) return response({ error: 'Connect your home first.' }, 403);
  const householdId = membership.data.household_id;
  const publicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  if (request.method === 'GET') {
    const preferences = await admin.from('notification_preferences').select('new_item_enabled,purchased_enabled,reminder_enabled,reminder_weekday,reminder_time,timezone').eq('user_id', user.id).maybeSingle();
    if (preferences.error) return response({ error: 'Could not load notification settings.' }, 500);
    return response({ vapidPublicKey: publicKey ?? null, preferences: preferences.data ?? emptyPreferences });
  }
  if (request.method === 'DELETE') {
    const body = await request.json().catch(() => ({}));
    if (typeof body.endpoint !== 'string') return response({ error: 'Missing subscription.' }, 400);
    const removed = await admin.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', body.endpoint);
    return removed.error ? response({ error: 'Could not disable notifications.' }, 500) : response({ ok: true });
  }
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);
  const body = await request.json().catch(() => null) as { action?: string; subscription?: unknown; preferences?: Record<string, unknown> } | null;
  if (body?.action === 'subscribe' && validSubscription(body.subscription)) {
    if (!publicKey) return response({ error: 'Notifications are not configured yet.' }, 503);
    const saved = await admin.from('push_subscriptions').upsert({ user_id: user.id, endpoint: body.subscription.endpoint, p256dh: body.subscription.keys.p256dh, auth: body.subscription.keys.auth, updated_at: new Date().toISOString() }, { onConflict: 'user_id,endpoint' });
    if (saved.error) return response({ error: 'Could not save this device.' }, 500);
    const preferences = await admin.from('notification_preferences').upsert({ user_id: user.id, household_id: householdId }, { onConflict: 'user_id', ignoreDuplicates: true });
    return preferences.error ? response({ error: 'Could not save notification settings.' }, 500) : response({ ok: true });
  }
  if (body?.action === 'preferences' && body.preferences) {
    const input = body.preferences;
    const weekday = input.reminder_weekday;
    const time = input.reminder_time;
    if (typeof input.new_item_enabled !== 'boolean' || typeof input.purchased_enabled !== 'boolean' || typeof input.reminder_enabled !== 'boolean' || !Number.isInteger(weekday) || Number(weekday) < 0 || Number(weekday) > 6 || typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time) || !validTimezone(input.timezone)) return response({ error: 'Invalid notification settings.' }, 400);
    const updated = await admin.from('notification_preferences').upsert({ user_id: user.id, household_id: householdId, new_item_enabled: input.new_item_enabled, purchased_enabled: input.purchased_enabled, reminder_enabled: input.reminder_enabled, reminder_weekday: weekday, reminder_time: time, timezone: input.timezone }, { onConflict: 'user_id' });
    return updated.error ? response({ error: 'Could not save notification settings.' }, 500) : response({ ok: true });
  }
  return response({ error: 'Invalid notification request.' }, 400);
});
