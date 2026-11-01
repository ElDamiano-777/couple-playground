import { useEffect, useState } from 'react';
import { supabase } from './client';
import { applicationServerKey, disconnectPush, pushOwnerKey, pushRegistration } from './push';

export default function PushSettings({ userId }: { userId: string }) {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(``);
  const [permission, setPermission] = useState<NotificationPermission>(
    `Notification` in window ? Notification.permission : `default`,
  );
  const supported = `Notification` in window && `PushManager` in window && `serviceWorker` in navigator;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === `MacIntel` && navigator.maxTouchPoints > 1);
  const installed = matchMedia(`(display-mode: standalone)`).matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  useEffect(() => {
    let active = true;
    setEnabled(false);
    setHasSubscription(false);
    setMessage(``);
    setLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase.rpc(`push_configuration`);
        if (!active) return;
        if (!error && typeof data?.publicKey === `string`) setPublicKey(data.publicKey);
        else setPublicKey(null);
        if (!supported) return;
        const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
        const subscription = await registration?.pushManager.getSubscription();
        if (!active || !subscription) return;
        setHasSubscription(true);
        let owner: string | null = null;
        try { owner = localStorage.getItem(pushOwnerKey); } catch { /* Re-enable explicitly if storage is unavailable. */ }
        if (owner === userId && Notification.permission === `granted`) {
          const result = await supabase.rpc(`register_push_subscription`, { subscription: subscription.toJSON() });
          if (active && !result.error) setEnabled(true);
        } else {
          await disconnectPush();
          if (active) setHasSubscription(false);
        }
      } catch { if (active) setMessage(`We couldn’t check notifications. Reopen Shopping to try again.`); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [userId, supported]);

  async function enable() {
    if (!publicKey || busy) return;
    setBusy(true);
    setMessage(``);
    let created: PushSubscription | null = null;
    try {
      // Keep the permission request directly inside the user gesture for iOS.
      const allowed = await Notification.requestPermission();
      setPermission(allowed);
      if (allowed !== `granted`) {
        setMessage(allowed === `denied` ? `Notifications are blocked. You can allow them in your phone’s notification settings.` : `Notifications stay off. You can try again whenever you like.`);
        return;
      }
      const registration = await pushRegistration();
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
        created = subscription;
      }
      const current = await supabase.auth.getSession();
      if (current.data.session?.user.id !== userId) throw new Error(`Account changed`);
      const { error } = await supabase.rpc(`register_push_subscription`, { subscription: subscription.toJSON() });
      if (error) throw error;
      try { localStorage.setItem(pushOwnerKey, userId); } catch { /* Server registration remains authoritative. */ }
      setEnabled(true);
      setHasSubscription(true);
      setMessage(`Notifications are on for this phone. Your partner needs to enable them on their phone too.`);
    } catch {
      if (created) await created.unsubscribe().catch(() => false);
      setMessage(`We couldn’t turn notifications on. Check your connection and try again.`);
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    setMessage(``);
    try { await disconnectPush(); setEnabled(false); setHasSubscription(false); setMessage(`Notifications are off for this phone.`); }
    catch { setMessage(`We couldn’t turn notifications off. Please try again.`); }
    finally { setBusy(false); }
  }

  return <section className="dashboard-card push-settings" aria-labelledby="push-title">
    <h2 id="push-title">Shopping notifications</h2>
    <p>Your phone can notify you when your partner adds a purchase or changes its bought status. Purchase names stay out of the notification.</p>
    {ios && !installed ? <p>On iPhone, open Together in Safari, choose Share → Add to Home Screen, then open it from its icon to enable notifications.</p>
      : !supported ? <p>Phone notifications aren’t available in this browser. On iPhone, use iOS 16.4 or later and open Together from its Home Screen icon.</p>
      : loading ? <p role="status">Checking notifications…</p>
      : !publicKey ? <>
        <p>Phone notifications aren’t ready yet. Your shopping list works as usual.</p>
        {hasSubscription && <button type="button" className="text-action" disabled={busy} onClick={() => { void disable(); }}>Turn off notifications</button>}
      </>
      : <>
        <p>{enabled ? `On for this phone.` : permission === `denied` ? `Blocked in your phone’s settings.` : `Off for this phone.`}</p>
        <button type="button" className="text-action" disabled={busy || (!hasSubscription && permission === `denied`)} onClick={() => { void (hasSubscription ? disable() : enable()); }}>
          {busy ? `Please wait…` : hasSubscription ? `Turn off notifications` : `Enable notifications`}
        </button>
      </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
