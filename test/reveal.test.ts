import assert from 'node:assert/strict';
import { test } from 'node:test';
import { crowdResult, mostDivisive, tallyPoll, tallyPolls } from '../src/tracking/reveal.ts';
import { action, at } from './helpers.ts';

const vote = (visitor: string, choice: string, minute: number, poll = 'tracks') =>
  action({
    action: 'poll_answered',
    anonymous_id: visitor,
    object_id: poll,
    metadata: { choice, question: 'which track wins tonight?' },
    timestamp: at(minute).toISOString(),
  });

test('one vote per person — changing your mind replaces the first answer', () => {
  const tally = tallyPoll([vote('v1', 'Track 3', 1), vote('v1', 'Track 7', 5), vote('v2', 'Track 7', 2)], 'tracks');
  assert.equal(tally.votes, 2);
  assert.equal(tally.leader!.choice, 'Track 7');
  assert.equal(tally.leader!.votes, 2);
  assert.equal(tally.options.find((option) => option.choice === 'Track 3'), undefined);
});

test('the first voter is told they are first, not that 100% agrees', () => {
  const result = crowdResult([vote('v1', 'Track 4', 1)], 'tracks', 'Track 4');
  assert.match(result.headline, /first vote in/);
});

test('the reveal line states the share of the room that agrees', () => {
  const result = crowdResult(
    [vote('v1', 'Track 4', 1), vote('v2', 'Track 7', 2), vote('v3', 'Track 7', 3), vote('v4', 'Track 7', 4)],
    'tracks',
    'Track 4',
  );
  assert.equal(result.agreement, 0.25);
  assert.equal(result.headline, 'you picked Track 4 — 25% of the room agrees');
});

test('a genuinely split poll is flagged, and the most split one wins', () => {
  const actions = [
    vote('v1', 'Track 7', 1),
    vote('v2', 'Track 7', 2),
    vote('v3', 'Track 7', 3),
    vote('v4', 'Track 3', 4),
    vote('v5', 'rooftop', 5, 'next'),
    vote('v6', 'basement', 6, 'next'),
  ];
  const tallies = tallyPolls(actions);
  assert.equal(tallies.find((tally) => tally.poll_id === 'next')!.contested, true);
  assert.equal(tallies.find((tally) => tally.poll_id === 'tracks')!.contested, false);
  assert.equal(mostDivisive(tallies)!.poll_id, 'next');
});

test('a poll nobody answered reveals nothing rather than guessing', () => {
  const result = crowdResult([], 'tracks');
  assert.equal(result.votes, 0);
  assert.equal(result.headline, 'no votes yet');
});
