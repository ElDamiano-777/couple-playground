import { useEffect, useMemo, useState } from 'react';
import { supabase } from './client';

type Preferences = {
  new_item_enabled: boolean;
  purchased_enabled: boolean;
  reminder_enabled: boolean;
  reminder_weekday: number;
  reminder_time: string;
  timezone: string;
};

const fallback: Preferences = {
  new_item_enabled: true,
  purchased_enabled: true,
  reminder_enabled: false,
  reminder_weekday: 0,
  reminder_time: '18:00',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Berlin',
};
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function urlBase64ToUint8Array(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function NotificationSettings({ active }: { active: boolean }) {
  const [preferences, setPreferences] = useState<Preferences>(fallback);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const supported = useMemo(() => typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setMessage(''); setEnabled(false);
    if (!active || !supported) { setLoading(false); return; }
    void (async () => {
      const { data, error } = await supabase.functions.invoke('push-subscriptions', { method: 'GET' });
      if (cancelled) return;
      if (error || !data) { setMessage('Notification settings are not available yet.'); setLoading(false); return; }
      setPublicKey(data.vapidPublicKey ?? null);
      const next = data.preferences as Preferences;
      setPreferences({ ...fallback, ...next, reminder_time: String(next.reminder_time).slice(0, 5) });
      setLoading(false);
      void navigator.serviceWorker.ready.then(registration => registration.pushManager.getSubscription()).then(subscription => {
        if (!cancelled) setEnabled(Boolean(subscription));
      }).catch(() => {});
    })();
    return () => { cancelled = true; };
  }, [active, supported]);

  async function enable() {
    if (!publicKey || !supported) { setMessage('Notifications are not configured yet.'); return; }
    if (!isStandalone() && /iPhone|iPad|iPod/i.test(navigator.userAgent)) { setMessage('Add Together to your iPhone Home Screen first, then open it there and tap Enable notifications.'); return; }
    setSaving(true); setMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { setMessage('Notifications are blocked. Enable Together in your phone notification settings.'); return; }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
      const { error } = await supabase.functions.invoke('push-subscriptions', { body: { action: 'subscribe', subscription: subscription.toJSON() } });
      if (error) throw error;
      setEnabled(true); setMessage('Notifications are enabled on this device.');
    } catch { setMessage('Could not enable notifications. Check your connection and try again.'); }
    finally { setSaving(false); }
  }

  async function disable() {
    setSaving(true); setMessage('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        const { error } = await supabase.functions.invoke('push-subscriptions', { method: 'DELETE', body: { endpoint: subscription.endpoint } });
        if (error) throw error;
        await subscription.unsubscribe();
      }
      setEnabled(false); setMessage('Notifications are disabled on this device.');
    } catch { setMessage('Could not disable notifications. Try again.'); }
    finally { setSaving(false); }
  }

  async function savePreferences() {
    setSaving(true); setMessage('');
    const { error } = await supabase.functions.invoke('push-subscriptions', { body: { action: 'preferences', preferences } });
    if (error) setMessage('Could not save notification settings. Try again.');
    else setMessage('Notification settings saved.');
    setSaving(false);
  }

  if (!active) return null;
  return <section className="notification-settings" aria-labelledby="notification-settings-title">
    <h2 id="notification-settings-title">Notifications</h2>
    <p>Receive Shopping and task updates from your partner, even while Together is closed.</p>
    {!supported ? <p className="feedback error-message">This browser does not support Web Push. Use Together from your iPhone or Android Home Screen.</p>
      : loading ? <p role="status">Checking notification settings…</p>
        : <>
          <div className="notification-device-row"><span>{enabled ? 'Enabled on this device' : 'Not enabled on this device'}</span><button className="text-action" type="button" disabled={saving || (!enabled && !publicKey)} onClick={() => { void (enabled ? disable() : enable()); }}>{saving ? 'Please wait…' : enabled ? 'Disable' : 'Enable notifications'}</button></div>
          <fieldset disabled={!enabled || saving}>
            <legend>Choose what you receive</legend>
            <label><input type="checkbox" checked={preferences.new_item_enabled} onChange={event => setPreferences(current => ({ ...current, new_item_enabled: event.target.checked }))} /> New Shopping items and tasks</label>
            <label><input type="checkbox" checked={preferences.purchased_enabled} onChange={event => setPreferences(current => ({ ...current, purchased_enabled: event.target.checked }))} /> Purchased items</label>
            <label><input type="checkbox" checked={preferences.reminder_enabled} onChange={event => setPreferences(current => ({ ...current, reminder_enabled: event.target.checked }))} /> Weekly Shopping reminder</label>
            {preferences.reminder_enabled && <div className="notification-reminder-time"><label>Day<select value={preferences.reminder_weekday} onChange={event => setPreferences(current => ({ ...current, reminder_weekday: Number(event.target.value) }))}>{weekdays.map((day, index) => <option value={index} key={day}>{day}</option>)}</select></label><label>Time<input type="time" value={preferences.reminder_time} onChange={event => setPreferences(current => ({ ...current, reminder_time: event.target.value }))} /></label></div>}
            <button className="primary" type="button" onClick={() => { void savePreferences(); }}>Save notification settings</button>
          </fieldset>
          <details className="notification-help"><summary>Set up on iPhone</summary><ol><li>Open Together in Safari.</li><li>Tap Share, then Add to Home Screen.</li><li>Open Together from its Home Screen icon.</li><li>Tap Enable notifications above and allow notifications.</li></ol></details>
          <details className="notification-help"><summary>Set up on Samsung Android</summary><ol><li>Open Together in Chrome.</li><li>Tap the Chrome menu, then Install app or Add to Home screen.</li><li>Open Together from its installed icon.</li><li>Tap Enable notifications above and allow notifications.</li></ol></details>
          {message && <p className="feedback" role="status">{message}</p>}
        </>}
  </section>;
}
