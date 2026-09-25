import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SUGGESTED_MISSIONS, missionBoard, missionCrowdStats, type Mission, type Reveal } from '../src/tracking/missions.ts';
import { action, at } from './helpers.ts';

const missions: Mission[] = [
  { id: 'pov', title: 'prove you were here', completed_by: { action: 'photo_uploaded' } },
  { id: 'angles', title: 'another angle', completed_by: { action: 'photo_uploaded', count: 3 } },
  { id: 'vote', title: 'settle it', completed_by: { action: 'poll_answered' } },
];

const reveals: Reveal[] = [
  { id: 'crowd_results', label: 'crowd results', requires: { actions: ['poll_answered'] } },
  { id: 'secret_gallery', label: 'secret gallery', requires: { mission_ids: ['angles'] } },
  { id: 'wrap', label: 'the Wrap', requires: { missions: 3 } },
];

const stream = [
  action({ action: 'photo_uploaded', anonymous_id: 'v1', object_id: 'POV_1', timestamp: at(1).toISOString() }),
  action({ action: 'photo_uploaded', anonymous_id: 'v1', object_id: 'POV_2', timestamp: at(2).toISOString() }),
  action({
    action: 'poll_answered',
    anonymous_id: 'v1',
    object_id: 'tracks',
    metadata: { choice: 'Track 7' },
    timestamp: at(3).toISOString(),
  }),
  action({ action: 'photo_uploaded', anonymous_id: 'v2', object_id: 'POV_3', timestamp: at(4).toISOString() }),
];

test('progress is derived from actions already logged', () => {
  const board = missionBoard(stream, missions, 'v1', reveals);
  const byId = Object.fromEntries(board.missions.map((progress) => [progress.mission.id, progress]));
  assert.equal(byId.pov!.completed, true);
  assert.equal(byId.pov!.completed_at, at(1).toISOString());
  assert.equal(byId.angles!.completed, false);
  assert.equal(byId.angles!.done, 2);
  assert.equal(byId.vote!.completed, true);
  assert.equal(board.completed, 2);
});

test('a reveal says exactly what is still missing', () => {
  const board = missionBoard(stream, missions, 'v1', reveals);
  assert.deepEqual(board.unlocked, ['crowd_results']);
  assert.deepEqual(
    board.locked.map((locked) => `${locked.id}: ${locked.needs}`),
    ['secret_gallery: complete angles', 'wrap: complete 1 more mission'],
  );
});

test('an explicit mission_completed row is honoured', () => {
  const explicit = [...stream, action({ action: 'mission_completed', anonymous_id: 'v2', object_id: 'angles' })];
  const board = missionBoard(explicit, missions, 'v2');
  assert.equal(board.missions.find((progress) => progress.mission.id === 'angles')!.completed, true);
});

test('the crowd line counts people against the guest list', () => {
  const stats = missionCrowdStats(stream, missions, { expectedAttendees: 50 });
  const pov = stats.find((stat) => stat.mission.id === 'pov')!;
  assert.equal(pov.people, 2);
  assert.equal(pov.line, '2/50 prove you were here');
  assert.equal(pov.share, 2 / 50);
});

test('the suggested missions all map to actions we actually log', () => {
  const logged = new Set(['photo_uploaded', 'poll_answered', 'hot_take_submitted', 'reaction_added']);
  for (const mission of SUGGESTED_MISSIONS) {
    assert.ok(logged.has(mission.completed_by.action), `${mission.id} -> ${mission.completed_by.action}`);
  }
});
