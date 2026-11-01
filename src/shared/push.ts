import { supabase } from './client';

export const pushOwnerKey = `together.push-owner.v1`;

export async function pushRegistration(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  if (!registration?.active) throw new Error(`Open the app again before enabling notifications.`);
  return registration;
}

// Unsubscribe before ending the session so the next person on this device cannot
// receive notifications intended for the previous signed-in account.
export async function disconnectPush(): Promise<void> {
  if (!(`serviceWorker` in navigator) || !(`PushManager` in window)) return;
  const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const removed = await subscription.unsubscribe();
  if (!removed) throw new Error(`Could not turn off notifications on this device.`);
  // An expired endpoint is harmless even if an offline server cleanup fails.
  await supabase.rpc(`unregister_push_subscription`, { endpoint: subscription.endpoint });
  try { localStorage.removeItem(pushOwnerKey); } catch { /* Optional device bookkeeping. */ }
}

export function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const raw = atob(value.replace(/-/g, `+`).replace(/_/g, `/`) + `=`.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(raw, char => char.charCodeAt(0));
}
