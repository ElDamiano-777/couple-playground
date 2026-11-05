import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const appUrl = 'https://eldamiano-777.github.io/couple-playground/';
const appOrigin = 'https://eldamiano-777.github.io';
const functionUrl = 'https://lyewmhtufesdccisqmin.supabase.co/functions/v1/calendar-google';
const headers = {
  'Access-Control-Allow-Origin': appOrigin,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-supabase-api-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const calendarScope = 'https://www.googleapis.com/auth/calendar.readonly';
type Connection = { user_id: string; encrypted_refresh_token: string; token_iv: string };
type Preference = { calendar_id: string; selected: boolean; visible_to_partner: boolean };
type GoogleCalendar = { id: string; summary: string; color: string; primary: boolean };

function configured() {
  return ['GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET', 'GOOGLE_CALENDAR_TOKEN_KEY'].every(name => !!Deno.env.get(name));
}
function b64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
function unb64(value: string) { return Uint8Array.from(atob(value), char => char.charCodeAt(0)); }
async function tokenKey() {
  const raw = unb64(Deno.env.get('GOOGLE_CALENDAR_TOKEN_KEY')!);
  if (raw.length !== 32) throw new Error('Invalid calendar encryption key');
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await tokenKey();
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(value));
  return { encrypted_refresh_token: b64(new Uint8Array(encrypted)), token_iv: b64(iv) };
}
async function decrypt(connection: Connection) {
  const key = await tokenKey();
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(connection.token_iv) }, key, unb64(connection.encrypted_refresh_token));
  return new TextDecoder().decode(plain);
}
function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
}
async function signedIn(request: Request) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const client = admin();
  const { data, error } = await client.auth.getUser(token);
  return error ? null : data.user;
}
async function accessToken(connection: Connection) {
  const body = new URLSearchParams({
    client_id: Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!,
    client_secret: Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!,
    refresh_token: await decrypt(connection), grant_type: 'refresh_token',
  });
  const result = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await result.json() as { access_token?: string };
  if (!result.ok || !data.access_token) throw new Error('Google authorization expired');
  return data.access_token;
}
async function googleJson(token: string, path: string) {
  const result = await fetch(`https://www.googleapis.com/calendar/v3/${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!result.ok) throw new Error('Google Calendar could not be read');
  return result.json();
}
async function ownCalendars(connection: Connection): Promise<GoogleCalendar[]> {
  const token = await accessToken(connection);
  const data = await googleJson(token, 'users/me/calendarList?minAccessRole=reader');
  return (data.items ?? []).map((item: Record<string, unknown>) => ({
    id: String(item.id ?? ''), summary: String(item.summaryOverride || item.summary || 'Untitled calendar'), color: typeof item.backgroundColor === 'string' ? item.backgroundColor : '#8040be', primary: item.primary === true,
  })).filter((item: { id: string }) => item.id);
}
function preferencesFor(calendars: GoogleCalendar[], stored: Preference[]) {
  return calendars.map(calendar => {
    const preference = stored.find(item => item.calendar_id === calendar.id);
    return { ...calendar, selected: preference?.selected ?? true, shared: preference?.visible_to_partner ?? false };
  });
}

Deno.serve(async request => {
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') return new Response(null, { headers });
  if (url.searchParams.get('action') === 'callback') {
    const state = url.searchParams.get('state'); const code = url.searchParams.get('code');
    if (!configured() || !state || !code) return Response.redirect(`${appUrl}?calendar=failed`, 302);
    const client = admin();
    const stateRow = await client.from('google_calendar_oauth_states').select('user_id,expires_at').eq('state', state).maybeSingle();
    await client.from('google_calendar_oauth_states').delete().eq('state', state);
    if (!stateRow.data || new Date(stateRow.data.expires_at) < new Date()) return Response.redirect(`${appUrl}?calendar=failed`, 302);
    const form = new URLSearchParams({ code, client_id: Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!, client_secret: Deno.env.get('GOOGLE_CALENDAR_CLIENT_SECRET')!, redirect_uri: `${functionUrl}?action=callback`, grant_type: 'authorization_code' });
    const result = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
    const tokens = await result.json() as { refresh_token?: string };
    if (!result.ok || !tokens.refresh_token) return Response.redirect(`${appUrl}?calendar=reauthorize`, 302);
    const encrypted = await encrypt(tokens.refresh_token);
    const saved = await client.from('google_calendar_connections').upsert({ user_id: stateRow.data.user_id, ...encrypted }, { onConflict: 'user_id' });
    return Response.redirect(`${appUrl}?calendar=${saved.error ? 'failed' : 'connected'}`, 302);
  }
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);
  const user = await signedIn(request);
  if (!user) return response({ error: 'Sign in first.' }, 401);
  if (!configured()) return response({ error: 'Google Calendar is not configured yet.' }, 503);
  const client = admin();
  const member = await client.from('household_members').select('household_id').eq('user_id', user.id).maybeSingle();
  if (!member.data) return response({ error: 'Connect your home first.' }, 403);
  const body = await request.json().catch(() => null) as { action?: string; timeMin?: string; timeMax?: string; calendars?: { id: string; selected: boolean; shared: boolean }[] } | null;
  if (body?.action === 'connect') {
    const state = crypto.randomUUID() + crypto.randomUUID();
    const saved = await client.from('google_calendar_oauth_states').insert({ state, user_id: user.id, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
    if (saved.error) return response({ error: 'Could not start Google connection.' }, 500);
    const params = new URLSearchParams({ client_id: Deno.env.get('GOOGLE_CALENDAR_CLIENT_ID')!, redirect_uri: `${functionUrl}?action=callback`, response_type: 'code', scope: calendarScope, access_type: 'offline', prompt: 'consent select_account', state });
    return response({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
  }
  if (body?.action === 'disconnect') {
    await client.from('google_calendar_preferences').delete().eq('user_id', user.id);
    const removed = await client.from('google_calendar_connections').delete().eq('user_id', user.id);
    return removed.error ? response({ error: 'Could not disconnect Google Calendar.' }, 500) : response({ ok: true });
  }
  const connection = await client.from('google_calendar_connections').select('user_id,encrypted_refresh_token,token_iv').eq('user_id', user.id).maybeSingle();
  if (body?.action === 'calendars') {
    if (!connection.data) return response({ connected: false, calendars: [] });
    try {
      const [calendars, preferences] = await Promise.all([ownCalendars(connection.data as Connection), client.from('google_calendar_preferences').select('calendar_id,selected,visible_to_partner').eq('user_id', user.id)]);
      return response({ connected: true, calendars: preferencesFor(calendars, (preferences.data ?? []) as Preference[]) });
    } catch { return response({ error: 'Google Calendar needs reconnecting.' }, 401); }
  }
  if (body?.action === 'preferences' && Array.isArray(body.calendars) && connection.data) {
    try {
      const accessible = new Set((await ownCalendars(connection.data as Connection)).map((item: { id: string }) => item.id));
      const rows = body.calendars.filter(item => typeof item.id === 'string' && accessible.has(item.id) && typeof item.selected === 'boolean' && typeof item.shared === 'boolean').map(item => ({ user_id: user.id, calendar_id: item.id, selected: item.selected, visible_to_partner: item.shared }));
      const saved = await client.from('google_calendar_preferences').upsert(rows, { onConflict: 'user_id,calendar_id' });
      return saved.error ? response({ error: 'Could not save calendar visibility.' }, 500) : response({ ok: true });
    } catch { return response({ error: 'Google Calendar needs reconnecting.' }, 401); }
  }
  if (body?.action !== 'events' || !body.timeMin || !body.timeMax) return response({ error: 'Invalid calendar request.' }, 400);
  const members = await client.from('household_members').select('user_id').eq('household_id', member.data.household_id);
  const memberIds = [...new Set([user.id, ...(members.data ?? []).map(item => item.user_id)])];
  const connections = await client.from('google_calendar_connections').select('user_id,encrypted_refresh_token,token_iv').in('user_id', memberIds);
  const preferences = await client.from('google_calendar_preferences').select('user_id,calendar_id,selected,visible_to_partner').in('user_id', (connections.data ?? []).map(item => item.user_id));
  const events: unknown[] = [];
  for (const owner of (connections.data ?? []) as Connection[]) {
    try {
      const calendars = preferencesFor(await ownCalendars(owner), (preferences.data ?? []).filter(item => item.user_id === owner.user_id) as Preference[]);
      for (const calendar of calendars.filter((item: { selected: boolean; shared: boolean }) => item.selected && (owner.user_id === user.id || item.shared))) {
        const query = new URLSearchParams({ singleEvents: 'true', orderBy: 'startTime', timeMin: body.timeMin, timeMax: body.timeMax, maxResults: '2500' });
        const token = await accessToken(owner);
        const data = await googleJson(token, `calendars/${encodeURIComponent(calendar.id)}/events?${query}`);
        for (const event of data.items ?? []) events.push({ id: `${owner.user_id}:${calendar.id}:${event.id}`, title: event.summary || 'Untitled event', start: event.start, end: event.end, calendar: calendar.summary, color: calendar.color, own: owner.user_id === user.id });
      }
    } catch { /* One revoked partner connection never hides the rest of the agenda. */ }
  }
  return response({ events });
});
