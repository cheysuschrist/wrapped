import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eventPulse, outvoted } from '../src/tracking/pulse.ts';
import { buildWrap, sameMomentClusters } from '../src/tracking/wrap.ts';
import { toCrmContacts, segments } from '../src/tracking/crm.ts';
import { buildPeople } from '../src/tracking/people.ts';
import { IdentityGraph, stitch } from '../src/tracking/identity.ts';
import { sequentialIds } from '../src/tracking/ids.ts';
import { action, at } from './helpers.ts';

const upload = (visitor: string, id: string, minute: number) =>
  action({ action: 'photo_uploaded', anonymous_id: visitor, object_id: id, timestamp: at(minute).toISOString() });

const vote = (visitor: string, poll: string, choice: string, minute: number) =>
  action({
    action: 'poll_answered',
    anonymous_id: visitor,
    object_id: poll,
    metadata: { choice },
    timestamp: at(minute).toISOString(),
  });

test('the same moment needs three people, not three photos', () => {
  const onePerson = [upload('v1', 'a', 60), upload('v1', 'b', 61), upload('v1', 'c', 62)];
  assert.equal(sameMomentClusters(onePerson).length, 0);

  const threePeople = [upload('v1', 'a', 60), upload('v2', 'b', 61), upload('v3', 'c', 62)];
  const clusters = sameMomentClusters(threePeople);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0]!.people, 3);
});

test('the Wrap is assembled from what the room actually did', () => {
  const stream = [
    vote('v1', 'tracks', 'Track 7', 1),
    vote('v2', 'tracks', 'Track 7', 2),
    vote('v3', 'tracks', 'Track 3', 3),
    action({ action: 'reaction_added', anonymous_id: 'v1', object_id: 'IMG_9', timestamp: at(4).toISOString() }),
    action({ action: 'reaction_added', anonymous_id: 'v2', object_id: 'IMG_9', timestamp: at(5).toISOString() }),
    action({
      action: 'hot_take_submitted',
      anonymous_id: 'v3',
      object_id: 'hot_takes',
      metadata: { response: 'track 3 is a skip' },
      timestamp: at(6).toISOString(),
    }),
  ];
  const wrap = buildWrap(stream, { title: 'The Vinyl Word', dateLabel: 'September 25, 2026' });
  const sections = Object.fromEntries(wrap.sections.map((section) => [section.key, section]));

  assert.equal(sections.crowd_picked!.items[0]!.label, 'Track 7');
  assert.equal(sections.crowd_picked!.items[0]!.value, '67%');
  assert.equal(sections.the_photo!.note, '2 reactions from 2 people');
  assert.equal(sections.lore!.items[0]!.label, 'track 3 is a skip');
  assert.equal(wrap.stats.find((stat) => stat.label === 'people')!.value, '3');
});

test('the personal half only contains that attendee', () => {
  const stream = [
    upload('v1', 'POV_1', 60),
    upload('v2', 'POV_2', 61),
    vote('v1', 'tracks', 'Track 4', 3),
  ];
  const wrap = buildWrap(stream, { title: 'The Vinyl Word', actor: 'v1' });
  const personal = Object.fromEntries((wrap.personal ?? []).map((section) => [section.key, section]));
  assert.deepEqual(personal.your_pov!.items.map((item) => item.object_id), ['POV_1']);
  assert.equal(personal.you_picked!.items[0]!.label, 'Track 4');
});

test('the pulse is a set of counts and a leader', () => {
  const stream = [
    action({ action: 'album_opened', anonymous_id: 'v1', timestamp: at(0).toISOString() }),
    action({ action: 'album_opened', anonymous_id: 'v2', timestamp: at(1).toISOString() }),
    vote('v1', 'tracks', 'Track 7', 2),
    vote('v2', 'tracks', 'Track 7', 3),
    upload('v1', 'POV_1', 4),
    action({ action: 'album_opened', anonymous_id: 'v3', timestamp: at(90).toISOString() }),
  ];
  const pulse = eventPulse(stream, { expectedAttendees: 50, until: at(10) });
  assert.equal(pulse.joined, 2, 'the late arrival is outside the window');
  assert.equal(pulse.uploads, 1);
  assert.equal(pulse.leading!.choice, 'Track 7');
  assert.equal(pulse.lines[0], '2 of 50 people joined');
});

test('"outvoted in every poll" needs at least two polls answered', () => {
  const stream = [
    vote('v1', 'tracks', 'Track 3', 1),
    vote('v1', 'next', 'basement', 2),
    vote('v2', 'tracks', 'Track 7', 3),
    vote('v2', 'next', 'rooftop', 4),
    vote('v3', 'tracks', 'Track 7', 5),
    vote('v3', 'next', 'rooftop', 6),
    vote('v4', 'tracks', 'Track 7', 7),
  ];
  assert.deepEqual(outvoted(stream), ['v1']);
});

test('only people who agreed to be contacted leave for the CRM', () => {
  const identity = new IdentityGraph({ newId: sequentialIds(), now: () => at(0) });
  identity.identify('v1', { email: 'yes@example.com', name: 'Yes', consent: { link_history: true, marketing: true } });
  identity.identify('v2', { email: 'no@example.com', name: 'No', consent: { link_history: true, marketing: false } });

  const stream = stitch(
    [
      action({ action: 'email_submitted', anonymous_id: 'v1', timestamp: at(1).toISOString() }),
      vote('v1', 'tracks', 'Track 7', 2),
      action({ action: 'email_submitted', anonymous_id: 'v2', timestamp: at(3).toISOString() }),
    ],
    identity,
  );
  const people = buildPeople(stream, { identity });
  const contacts = toCrmContacts(people, { wrapId: 'wrap_test', wrapTitle: 'The Vinyl Word' });

  assert.equal(contacts.length, 1);
  assert.equal(contacts[0]!.email, 'yes@example.com');
  assert.equal(contacts[0]!.properties.mywrap_choice_tracks, 'Track 7');
  assert.ok(segments(people).some((segment) => segment.key === 'opted_in'));
});
