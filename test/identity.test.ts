import assert from 'node:assert/strict';
import { test } from 'node:test';
import { IdentityGraph, stitch } from '../src/tracking/identity.ts';
import { sequentialIds } from '../src/tracking/ids.ts';
import { action, at } from './helpers.ts';

function graph() {
  return new IdentityGraph({ newId: sequentialIds(), now: () => at(10) });
}

test('history before identification is linked only with consent', () => {
  const identity = graph();
  const before = action({ action: 'photo_viewed', timestamp: at(1).toISOString() });
  const after = action({ action: 'photo_downloaded', timestamp: at(20).toISOString() });

  identity.identify('visitor_a', { email: 'maya@example.com', consent: { link_history: false, marketing: true } });
  const withoutConsent = stitch([before, after], identity);
  assert.equal(withoutConsent[0]!.person_id, null);
  assert.ok(withoutConsent[1]!.person_id);

  const identity2 = graph();
  identity2.identify('visitor_a', { email: 'maya@example.com', consent: { link_history: true, marketing: true } });
  const withConsent = stitch([before, after], identity2);
  assert.ok(withConsent[0]!.person_id);
  assert.equal(withConsent[0]!.person_id, withConsent[1]!.person_id);
});

test('stitching never rewrites the stored rows', () => {
  const identity = graph();
  identity.identify('visitor_a', { email: 'maya@example.com', consent: { link_history: true, marketing: false } });
  const rows = [action({ action: 'photo_viewed', timestamp: at(1).toISOString() })];
  const stitched = stitch(rows, identity);
  assert.equal(rows[0]!.person_id, null);
  assert.notEqual(stitched[0], rows[0]);
});

test('the same email on a second device resolves to one person', () => {
  const identity = graph();
  const first = identity.identify('visitor_phone', { email: 'maya@example.com' });
  const second = identity.identify('visitor_laptop', { email: 'MAYA@example.com ' });
  assert.equal(second.person_id, first.person_id);
  assert.deepEqual(second.anonymous_ids, ['visitor_phone', 'visitor_laptop']);
});

test('a visitor who later identifies as an existing guest merges the records', () => {
  const identity = graph();
  identity.identify('visitor_a', { phone: '+1 (415) 555-0100' });
  const merged = identity.identify('visitor_a', { email: 'maya@example.com', name: 'Maya' });

  identity.identify('visitor_b', { email: 'maya@example.com' });
  const viaEmail = identity.personFor('visitor_b')!;
  assert.equal(viaEmail.person_id, merged.person_id);
  assert.equal(viaEmail.phone, '14155550100');
  assert.equal(identity.people().length, 1);
});

test('a seeded guest list is matched on first identification', () => {
  const identity = graph();
  identity.seed([
    {
      person_id: 'person_guest_1',
      anonymous_ids: [],
      email: 'maya@example.com',
      name: 'Maya Rodriguez',
      identified_at: at(0).toISOString(),
      consent: { link_history: false, marketing: false },
      traits: { rsvp_status: 'Going' },
    },
  ]);
  const person = identity.identify('visitor_a', { email: 'maya@example.com' });
  assert.equal(person.person_id, 'person_guest_1');
  assert.equal(person.traits.rsvp_status, 'Going');
});
