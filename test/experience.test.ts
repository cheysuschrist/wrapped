import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildExperience, buildFunnel } from '../src/tracking/experience.ts';
import { action, at } from './helpers.ts';

const stream = [
  action({ action: 'album_opened', anonymous_id: 'v1', timestamp: at(0).toISOString() }),
  action({ action: 'photo_viewed', anonymous_id: 'v1', object_id: 'IMG_1', timestamp: at(1).toISOString() }),
  action({ action: 'photo_viewed', anonymous_id: 'v1', object_id: 'IMG_1', timestamp: at(2).toISOString() }),
  action({ action: 'photo_downloaded', anonymous_id: 'v1', object_id: 'IMG_1', timestamp: at(3).toISOString() }),
  action({ action: 'album_opened', anonymous_id: 'v2', timestamp: at(4).toISOString() }),
  action({ action: 'photo_viewed', anonymous_id: 'v2', object_id: 'IMG_2', timestamp: at(5).toISOString() }),
  // v3 arrives straight from a QR and votes without ever browsing.
  action({ action: 'album_opened', anonymous_id: 'v3', timestamp: at(6).toISOString() }),
  action({
    action: 'poll_answered',
    anonymous_id: 'v3',
    object_id: 'flavour',
    metadata: { choice: 'Cherry' },
    timestamp: at(7).toISOString(),
  }),
];

test('the funnel counts distinct people, not actions', () => {
  const funnel = buildFunnel(stream);
  const byStage = Object.fromEntries(funnel.map((step) => [step.stage, step.visitors]));
  assert.equal(byStage.opened, 3);
  assert.equal(byStage.explored, 2);
  assert.equal(byStage.acquired, 1);
  assert.equal(byStage.participated, 1);
});

test('a stage nobody reached does not break the one after it', () => {
  const funnel = buildFunnel(stream);
  const participated = funnel.find((step) => step.stage === 'participated')!;
  const contributed = funnel.find((step) => step.stage === 'contributed')!;
  assert.equal(contributed.visitors, 0);
  // share_of_previous for `participated` is measured against `acquired` (1), the
  // last stage anyone reached — not against an empty stage.
  assert.equal(participated.share_of_previous, 1);
  assert.equal(participated.share_of_opened, 1 / 3);
});

test('reach is stated against the guest list when there is one', () => {
  const report = buildExperience(stream, { expectedAttendees: 50 });
  assert.equal(report.visitors, 3);
  assert.equal(report.expected_attendees, 50);
  assert.equal(report.reach, 3 / 50);
});

test('photo counts separate people from actions', () => {
  const report = buildExperience(stream);
  assert.equal(report.photos.views, 3);
  assert.equal(report.photos.viewers, 2);
  assert.equal(report.photos.downloads, 1);
  assert.equal(report.photos.top_viewed[0]!.object_id, 'IMG_1');
  assert.equal(report.photos.top_viewed[0]!.people, 1);
});

test('returning means a different day, not a different session', () => {
  const nextMorning = [
    ...stream,
    action({ action: 'returned_to_album', anonymous_id: 'v1', timestamp: at(16 * 60).toISOString() }),
  ];
  const report = buildExperience(nextMorning, { timeZone: 'America/New_York' });
  assert.equal(report.returning.visitors, 1);
});

test('sentiment is only reported when the client logged it', () => {
  const withFeedback = [
    action({
      action: 'prompt_answered',
      anonymous_id: 'v1',
      object_id: 'how_was_tonight',
      metadata: { response: 'loved it' },
    }),
    action({
      action: 'prompt_answered',
      anonymous_id: 'v2',
      object_id: 'how_was_tonight',
      metadata: { response: 'great', sentiment: 'positive' },
    }),
  ];
  const report = buildExperience(withFeedback);
  const prompt = report.prompts[0]!;
  assert.equal(prompt.responses, 2);
  assert.deepEqual(prompt.sentiment, { positive: 1 });
  assert.deepEqual(prompt.answers, ['loved it', 'great']);
});
