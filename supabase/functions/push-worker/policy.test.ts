import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deliveryOutcome, notificationPayload, validEndpoint } from './policy.ts';

test('accept only HTTPS provider endpoints without alternate authority syntax', () => {
  for (const endpoint of ['https://web.push.apple.com/QABC', 'https://fcm.googleapis.com/fcm/send/abc', 'https://updates.push.services.mozilla.com/wpush/v2/abc']) assert.equal(validEndpoint(endpoint), true);
  for (const endpoint of ['http://fcm.googleapis.com/a', 'https://127.0.0.1/a', 'https://fcm.googleapis.com.evil.test/a', 'https://fcm.googleapis.com@evil.test/a', 'https://fcm.googleapis.com:444/a', 'https://fcm.googleapis.com/a#fragment', 'https://fcm.googleapis.com\\@evil.test/a', 'https://evil.push.apple.com.attacker.test/a']) assert.equal(validEndpoint(endpoint), false, endpoint);
});

test('expired subscriptions are removed and temporary failures retry', () => {
  assert.equal(deliveryOutcome(404), 'gone');
  assert.equal(deliveryOutcome(410), 'gone');
  for (const status of [400, 401, 403, 413]) assert.equal(deliveryOutcome(status), 'skip');
  for (const status of [429, 500, 503, undefined]) assert.equal(deliveryOutcome(status), 'retry');
});

test('notification carries only stable event identity and change kind', () => {
  const payload = notificationPayload('synthetic-event', 'added');
  assert.deepEqual(JSON.parse(payload), { eventId: 'synthetic-event', kind: 'added' });
  assert.equal(payload, notificationPayload('synthetic-event', 'added'));
});
