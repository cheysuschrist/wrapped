import assert from 'node:assert/strict';
import { test } from 'node:test';
import { guestListSize, guestsToPeople, parseCsv, parseGuestList } from '../src/tracking/guests.ts';
import { sequentialIds } from '../src/tracking/ids.ts';
import { IdentityGraph } from '../src/tracking/identity.ts';

const csv = [
  'Name,Email,RSVP Status,Ticket type',
  'Maya Rodriguez,Maya@Example.com ,Going,Guest list',
  '"Lee, Jordan",jordan@example.com,Maybe,General',
  'Chidera Eze,chidera@example.com,Going,General',
].join('\n');

test('quoted commas survive the parser', () => {
  const rows = parseCsv(csv);
  assert.equal(rows.length, 4);
  assert.equal(rows[2]![0], 'Lee, Jordan');
});

test('platform column names are matched on aliases, the rest is kept', () => {
  const guests = parseGuestList(csv, 'partiful');
  assert.equal(guests[0]!.email, 'maya@example.com');
  assert.equal(guests[0]!.status, 'Going');
  assert.equal(guests[0]!.traits.rsvp_status, 'Going');
  assert.equal(guests[0]!.traits['Ticket type'], 'Guest list');
  assert.equal(guests[0]!.traits.source, 'partiful');
});

test('the denominator can be scoped to who said they were coming', () => {
  const guests = parseGuestList(csv);
  assert.equal(guestListSize(guests), 3);
  assert.equal(guestListSize(guests, ['going']), 2);
});

test('an imported guest is not consent to market to them', () => {
  const people = guestsToPeople(parseGuestList(csv), sequentialIds());
  assert.deepEqual(people[0]!.consent, { link_history: false, marketing: false });
  assert.deepEqual(people[0]!.anonymous_ids, []);
});

test('the guest list gives the first scan a record to land on', () => {
  const identity = new IdentityGraph({ newId: sequentialIds() });
  identity.seed(guestsToPeople(parseGuestList(csv), sequentialIds()));
  const person = identity.identify('visitor_a', { email: 'chidera@example.com' });
  assert.equal(person.name, 'Chidera Eze');
  assert.equal(identity.people().length, 3);
});
