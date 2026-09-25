import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IdentityGraph } from '../src/tracking/identity.ts';
import { sequentialIds } from '../src/tracking/ids.ts';
import { MemoryActionStore } from '../src/tracking/store.ts';
import { Tracker, memoryStorage } from '../src/tracking/tracker.ts';
import { at, harness } from './helpers.ts';

test('an anonymous visitor is still a stable identity across sessions', () => {
  const storage = memoryStorage();
  const store = new MemoryActionStore();
  const newId = sequentialIds();

  const first = new Tracker({ wrapId: 'wrap_test', store, storage, newId, now: () => at(0) });
  first.track('album_opened');

  // Same browser, next morning: same visitor, new session.
  const second = new Tracker({ wrapId: 'wrap_test', store, storage, newId, now: () => at(15 * 60) });
  second.track('returned_to_album');

  assert.equal(second.visitorId, first.visitorId);
  assert.notEqual(second.sessionId, first.sessionId);
  assert.equal(second.isReturningVisit, true);
  assert.equal(store.list({ anonymous_id: first.visitorId }).length, 2);
});

test('a visit continues while the attendee is active', () => {
  const { tracker, store } = harness();
  tracker.track('album_opened', { timestamp: at(0) });
  tracker.track('photo_viewed', { timestamp: at(20) });
  const sessions = new Set(store.list().map((row) => row.session_id));
  assert.equal(sessions.size, 1);
});

test('the session rotates after the inactivity window', () => {
  const { tracker, store } = harness();
  tracker.track('album_opened', { timestamp: at(0) });
  tracker.track('photo_viewed', { timestamp: at(45) });
  const sessions = new Set(store.list().map((row) => row.session_id));
  assert.equal(sessions.size, 2);
});

test('rows carry person_id from the moment someone identifies', () => {
  const identity = new IdentityGraph({ newId: sequentialIds(), now: () => at(0) });
  const { tracker, store } = harness({ identity });

  tracker.track('photo_viewed', { timestamp: at(1) });
  tracker.identify({ email: 'Maya@Example.com ', name: 'Maya' }, { timestamp: at(2) });
  tracker.track('photo_downloaded', { timestamp: at(3) });

  const rows = store.list();
  assert.equal(rows[0]!.person_id, null, 'the earlier row is untouched on disk');
  assert.equal(rows.at(-1)!.person_id, tracker.person!.person_id);
  assert.equal(tracker.person!.email, 'maya@example.com');
});

test('identify without an identity graph is a programming error, not a silent no-op', () => {
  const { tracker } = harness();
  assert.throws(() => tracker.identify({ email: 'a@b.com' }), /requires an IdentityGraph/);
});
