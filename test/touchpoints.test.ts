import assert from 'node:assert/strict';
import { test } from 'node:test';
import { commonPaths, journeys, touchpointFlow, touchpointUrl } from '../src/tracking/touchpoints.ts';
import { action, at } from './helpers.ts';

const scan = (visitor: string, id: string, minute: number) =>
  action({ action: 'touchpoint_visited', anonymous_id: visitor, object_id: id, timestamp: at(minute).toISOString() });

const stops = [
  { id: 'entrance', label: 'Entrance', order: 1 },
  { id: 'sampling', label: 'Sampling bar', order: 2 },
  { id: 'photo_booth', label: 'Photo booth', order: 3 },
];

const stream = [
  scan('v1', 'entrance', 0),
  scan('v1', 'sampling', 10),
  scan('v1', 'photo_booth', 20),
  scan('v2', 'entrance', 1),
  scan('v2', 'sampling', 12),
  scan('v3', 'entrance', 2),
  scan('v3', 'entrance', 3),
];

test('the flow is a share of scans, not an assumption about walking', () => {
  const flow = touchpointFlow(stream, stops);
  assert.deepEqual(
    flow.map((stop) => [stop.id, stop.visitors, stop.share_of_first]),
    [
      ['entrance', 3, 1],
      ['sampling', 2, 2 / 3],
      ['photo_booth', 1, 1 / 3],
    ],
  );
  assert.equal(flow[1]!.scans, 2);
});

test('a journey is only the stations that were scanned', () => {
  const all = journeys(stream);
  assert.deepEqual(all.find((journey) => journey.actor_key === 'v2')!.stops.map((stop) => stop.id), [
    'entrance',
    'sampling',
  ]);
});

test('repeat scans of the same station collapse in path counts', () => {
  const paths = commonPaths(stream);
  assert.deepEqual(paths[0]!.path, ['entrance', 'sampling', 'photo_booth']);
  assert.ok(paths.some((path) => path.path.join() === 'entrance'));
});

test('each station gets its own link', () => {
  assert.equal(
    touchpointUrl('https://getmywrap.com/w', 'vinyl-word', 'sampling'),
    'https://getmywrap.com/w/vinyl-word?tp=sampling',
  );
});
