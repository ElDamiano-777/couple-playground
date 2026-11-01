const endpointPattern = /^https:\/\/(web\.push\.apple\.com|[a-z0-9-]+\.push\.apple\.com|fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com)\/[A-Za-z0-9_/?=&%+.,~:-]+$/;

export function validEndpoint(endpoint: string): boolean {
  return endpoint.length <= 2048 && endpointPattern.test(endpoint);
}

export function deliveryOutcome(status: number | undefined): 'gone' | 'skip' | 'retry' {
  if (status === 404 || status === 410) return 'gone';
  if (status === 400 || status === 401 || status === 403 || status === 413) return 'skip';
  return 'retry';
}

export function notificationPayload(eventId: string, kind: 'added' | 'bought' | 'unbought'): string {
  // Only the event identity and change kind travel; the service worker displays generic text.
  return JSON.stringify({ kind, eventId });
}
