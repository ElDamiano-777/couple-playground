import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

type Event = { id: string; household_id: string; actor_id: string | null; kind: 'item_added' | 'item_purchased'; item_name: string; created_at: string; processed_at: string | null };
type Subscription = { id: string; user_id: string; endpoint: string; p256dh: string; auth: string };
type Preferences = { user_id: string; household_id: string; new_item_enabled: boolean; purchased_enabled: boolean; reminder_enabled: boolean; reminder_weekday: number; reminder_time: string; timezone: string };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const url = Deno.env.get('SUPABASE_URL')!;
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url, serviceRole, { auth: { persistSession: false } });
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!);

function localParts(timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const value = (type: string) => parts.find(part => part.type === type)?.value ?? '';
  return { weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(value('weekday')), time: `${value('hour')}:${value('minute')}`, date: new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date()) };
}

async function reserve(dedupeKey: string, values: Omit<Record<string, unknown>, 'dedupe_key'>) {
  const result = await admin.from('push_deliveries').upsert({ dedupe_key: dedupeKey, ...values }, { onConflict: 'dedupe_key', ignoreDuplicates: true }).select('id').maybeSingle();
  return result.data?.id ?? null;
}

async function send(subscription: Subscription, deliveryId: string, title: string, body: string) {
  try {
    await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title, body, url: '/couple-playground/' }), { TTL: 60 * 60 });
    await admin.from('push_deliveries').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', deliveryId);
  } catch (error) {
    const statusCode = Number((error as { statusCode?: number }).statusCode ?? 0) || null;
    await admin.from('push_deliveries').update({ status: 'failed', error_code: statusCode }).eq('id', deliveryId);
    if (statusCode === 404 || statusCode === 410) await admin.from('push_subscriptions').delete().eq('id', subscription.id);
  }
}

async function processEvent(event: Event) {
  if (event.processed_at) return;
  const members = await admin.from('household_members').select('user_id').eq('household_id', event.household_id).neq('user_id', event.actor_id ?? '00000000-0000-0000-0000-000000000000');
  if (members.error) throw members.error;
  for (const member of members.data ?? []) {
    const pref = await admin.from('notification_preferences').select('*').eq('user_id', member.user_id).maybeSingle();
    if (pref.error || !pref.data) continue;
    const enabled = event.kind === 'item_added' ? pref.data.new_item_enabled : pref.data.purchased_enabled;
    if (!enabled) continue;
    const subscriptions = await admin.from('push_subscriptions').select('*').eq('user_id', member.user_id);
    for (const subscription of subscriptions.data as Subscription[] ?? []) {
      const deliveryId = await reserve(`event:${event.id}:subscription:${subscription.id}`, { event_id: event.id, recipient_id: member.user_id, subscription_id: subscription.id, kind: event.kind });
      if (deliveryId) await send(subscription, deliveryId, 'Together', event.kind === 'item_added' ? `Your partner added ${event.item_name} to Shopping.` : `Your partner marked ${event.item_name} as purchased.`);
    }
  }
  await admin.from('push_events').update({ processed_at: new Date().toISOString() }).eq('id', event.id).is('processed_at', null);
}

async function processPending(eventId?: string) {
  let query = admin.from('push_events').select('*').is('processed_at', null).order('created_at').limit(50);
  if (eventId) query = query.eq('id', eventId);
  else query = query.gte('created_at', new Date(Date.now() - 1000 * 60 * 10).toISOString());
  const events = await query;
  if (events.error) throw events.error;
  for (const event of events.data as Event[] ?? []) await processEvent(event);
}

async function sendReminders() {
  const preferences = await admin.from('notification_preferences').select('*').eq('reminder_enabled', true);
  if (preferences.error) throw preferences.error;
  for (const pref of preferences.data as Preferences[] ?? []) {
    let local: ReturnType<typeof localParts>;
    try { local = localParts(pref.timezone); } catch { continue; }
    if (local.weekday !== pref.reminder_weekday || local.time !== pref.reminder_time.slice(0, 5)) continue;
    const unpurchased = await admin.from('shopping_items').select('id', { count: 'exact', head: true }).eq('household_id', pref.household_id).eq('bought', false);
    if (unpurchased.error || !unpurchased.count) continue;
    const subscriptions = await admin.from('push_subscriptions').select('*').eq('user_id', pref.user_id);
    for (const subscription of subscriptions.data as Subscription[] ?? []) {
      const deliveryId = await reserve(`reminder:${pref.user_id}:${local.date}:${pref.reminder_time.slice(0, 5)}:subscription:${subscription.id}`, { recipient_id: pref.user_id, subscription_id: subscription.id, kind: 'shopping_reminder' });
      if (deliveryId) await send(subscription, deliveryId, 'Together', `Your Shopping list still has ${unpurchased.count} unpurchased ${unpurchased.count === 1 ? 'item' : 'items'}.`);
    }
  }
}

Deno.serve(async request => {
  if (request.method !== 'POST' || request.headers.get('x-together-push-token') !== Deno.env.get('PUSH_DELIVERY_TOKEN')) return json({ error: 'Not authorized.' }, 401);
  const body = await request.json().catch(() => ({})) as { mode?: string; event_id?: string };
  try {
    if (body.mode === 'event' && body.event_id) await processPending(body.event_id);
    else if (body.mode === 'scheduled') { await processPending(); await sendReminders(); await admin.from('push_deliveries').delete().lt('created_at', new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString()); }
    else return json({ error: 'Invalid request.' }, 400);
    return json({ ok: true });
  } catch (error) { console.error('Push delivery failed', error); return json({ error: 'Delivery failed.' }, 500); }
});
