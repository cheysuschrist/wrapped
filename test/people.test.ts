import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IdentityGraph, stitch } from '../src/tracking/identity.ts';
import { sequentialIds } from '../src/tracking/ids.ts';
import { activityFloor, buildPeople, contributors, filterPeople } from '../src/tracking/people.ts';
import { buildTimeline, describeAction } from '../src/tracking/timeline.ts';
import { action, at } from './helpers.ts';

const stream = [
  action({ action: 'album_opened', anonymous_id: 'v1', timestamp: at(0).toISOString() }),
  action({ action: 'photo_viewed', anonymous_id: 'v1', object_id: 'IMG_1', timestamp: at(1).toISOString() }),
  action({ action: 'photo_downloaded', anonymous_id: 'v1', object_id: 'IMG_1', timestamp: at(2).toISOString() }),
  action({
    action: 'poll_answered',
    anonymous_id: 'v1',
    object_id: 'flavour',
    metadata: { choice: 'Cherry' },
    timestamp: at(3).toISOString(),
  }),
  action({ action: 'email_submitted', anonymous_id: 'v1', timestamp: at(4).toISOString() }),
  action({ action: 'photo_uploaded', anonymous_id: 'v1', object_id: 'POV_1', timestamp: at(5).toISOString() }),
  action({ action: 'album_opened', anonymous_id: 'v2', timestamp: at(6).toISOString() }),
  action({
    action: 'poll_answered',
    anonymous_id: 'v2',
    object_id: 'flavour',
    metadata: { choice: 'Lemon' },
    timestamp: at(7).toISOString(),
  }),
  action({ action: 'returned_to_album', anonymous_id: 'v2', timestamp: at(16 * 60).toISOString() }),
];

test('anonymous people are summarised without being named', () => {
  const people = buildPeople(stream, { timeZone: 'America/New_York' });
  const labels = people.map((person) => person.label);
  assert.deepEqual(labels, ['Anonymous #1', 'Anonymous #2']);
  assert.equal(people[0]!.identified, false);
  assert.equal(people[0]!.photos_downloaded, 1);
  assert.deepEqual(people[0]!.poll_choices, { flavour: 'Cherry' });
});

test('identified people are grouped under the attendee record', () => {
  const identity = new IdentityGraph({ newId: sequentialIds(), now: () => at(4) });
  identity.identify('v1', { email: 'maya@example.com', name: 'Maya', consent: { link_history: true, marketing: true } });
  const people = buildPeople(stitch(stream, identity), { identity });
  const maya = people.find((person) => person.name === 'Maya')!;
  assert.equal(maya.identified, true);
  assert.equal(maya.opted_in, true);
  assert.equal(maya.marketing_consent, true);
  assert.deepEqual(maya.anonymous_ids, ['v1']);
});

test('returning is a different day, and filters compose', () => {
  const people = buildPeople(stream, { timeZone: 'America/New_York' });
  assert.equal(filterPeople(people, { returned: true }).length, 1);
  assert.equal(filterPeople(people, { contributed: true }).length, 1);
  assert.equal(filterPeople(people, { votedFor: { poll: 'flavour', choice: 'Cherry' } }).length, 1);
});

test('"most active" comes from this event\'s own distribution', () => {
  const people = buildPeople(stream);
  const floor = activityFloor(people, 0.75);
  assert.equal(floor, 6);
  assert.equal(filterPeople(people, { minActions: floor }).length, 1);
});

test('contributors are only named when they chose to be visible', () => {
  const identity = new IdentityGraph({ newId: sequentialIds(), now: () => at(4) });
  identity.identify('v1', {
    email: 'maya@example.com',
    name: 'Maya',
    consent: { link_history: true, marketing: true },
    traits: { public_display: false },
  });
  const hidden = contributors(buildPeople(stitch(stream, identity), { identity }));
  assert.equal(hidden.total, 1);
  assert.equal(hidden.named.length, 0);
  assert.equal(hidden.anonymous_count, 1);
});

test('timeline entries restate the row and nothing more', () => {
  const timeline = buildTimeline(stream, 'v1', { timeZone: 'America/New_York' });
  const descriptions = timeline.entries.map((entry) => entry.description);
  assert.deepEqual(descriptions, [
    'Opened MyWrap',
    'Viewed IMG_1',
    'Downloaded IMG_1',
    'Voted Cherry',
    'Entered their email',
    'Uploaded POV_1',
  ]);
  assert.equal(timeline.days.length, 1);
  assert.equal(timeline.entries[0]!.time, '7:00 PM');
});

test('an unknown action degrades to its own name rather than an invented phrase', () => {
  assert.equal(describeAction(action({ action: 'raffle_entered', object_id: 'raffle_1' })), 'raffle_entered (raffle_1)');
});
