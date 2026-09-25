import { actorKey } from './taxonomy.ts';
import type { EventAction } from './types.ts';

/**
 * Answer-to-reveal.
 *
 * The attendee taps an option and immediately sees where the room stands. That
 * instant result is the reason they answer at all, so the tally has to be
 * computed from the live stream, not batched overnight.
 *
 * Convention: `poll_answered` carries `object_id = poll id` and
 * `metadata.choice = the option`. `metadata.question` is optional and, when
 * present, the most recent one wins.
 */

export interface PollOptionTally {
  choice: string;
  votes: number;
  /** 0–1 share of votes cast in this poll. */
  share: number;
}

export interface PollTally {
  poll_id: string;
  question?: string;
  votes: number;
  options: PollOptionTally[];
  leader?: PollOptionTally;
  /** Closest thing to a genuine split: the poll's two top options within 10 points. */
  contested: boolean;
  updated_at?: string;
}

/** One vote per actor per poll; changing your mind replaces the earlier vote. */
function lastVotes(actions: EventAction[], pollId: string): Map<string, { choice: string; at: string }> {
  const votes = new Map<string, { choice: string; at: string }>();
  for (const action of actions) {
    if (action.action !== 'poll_answered' || action.object_id !== pollId) continue;
    const choice = action.metadata?.choice;
    if (typeof choice !== 'string') continue;
    const previous = votes.get(actorKey(action));
    if (!previous || previous.at <= action.timestamp) {
      votes.set(actorKey(action), { choice, at: action.timestamp });
    }
  }
  return votes;
}

export function tallyPoll(actions: EventAction[], pollId: string): PollTally {
  const votes = lastVotes(actions, pollId);
  const counts = new Map<string, number>();
  let updatedAt: string | undefined;
  let question: string | undefined;

  for (const { choice, at } of votes.values()) {
    counts.set(choice, (counts.get(choice) ?? 0) + 1);
    if (!updatedAt || at > updatedAt) updatedAt = at;
  }
  for (const action of actions) {
    if (action.object_id === pollId && typeof action.metadata?.question === 'string') {
      question = action.metadata.question;
    }
  }

  const total = votes.size;
  const options = [...counts.entries()]
    .map(([choice, count]) => ({ choice, votes: count, share: total ? count / total : 0 }))
    .sort((a, b) => b.votes - a.votes || a.choice.localeCompare(b.choice));

  const contested =
    options.length > 1 && options[0]!.share - options[1]!.share <= 0.1;

  return {
    poll_id: pollId,
    ...(question ? { question } : {}),
    votes: total,
    options,
    ...(options[0] ? { leader: options[0] } : {}),
    contested,
    ...(updatedAt ? { updated_at: updatedAt } : {}),
  };
}

export function pollIds(actions: EventAction[]): string[] {
  const ids = new Set<string>();
  for (const action of actions) {
    if ((action.action === 'poll_answered' || action.action === 'poll_viewed') && action.object_id) {
      ids.add(action.object_id);
    }
  }
  return [...ids];
}

export function tallyPolls(actions: EventAction[]): PollTally[] {
  return pollIds(actions)
    .map((id) => tallyPoll(actions, id))
    .sort((a, b) => b.votes - a.votes);
}

export interface CrowdResult extends PollTally {
  /** What this attendee picked, if they've voted. */
  your_choice?: string;
  /** 0–1 share of the room that agrees with them. */
  agreement?: number;
  /** Ready-to-render line. Deliberately plain: a count, not a claim. */
  headline: string;
}

/**
 * The line shown the instant someone votes: "you picked Track 4 — 37% of the
 * room agrees". When they're the only vote so far, say that instead of
 * printing a meaningless 100%.
 */
export function crowdResult(
  actions: EventAction[],
  pollId: string,
  choice?: string,
): CrowdResult {
  const tally = tallyPoll(actions, pollId);
  const mine = choice ? tally.options.find((option) => option.choice === choice) : undefined;

  let headline: string;
  if (!choice) {
    headline = tally.leader
      ? `${tally.leader.choice} is ahead — ${pct(tally.leader.share)} of ${tally.votes} votes`
      : 'no votes yet';
  } else if (tally.votes <= 1) {
    headline = `you picked ${choice} — first vote in`;
  } else {
    headline = `you picked ${choice} — ${pct(mine?.share ?? 0)} of the room agrees`;
  }

  return {
    ...tally,
    ...(choice ? { your_choice: choice } : {}),
    ...(mine ? { agreement: mine.share } : {}),
    headline,
  };
}

/** The poll the room split hardest on. Useful for "most disagreed-on" in the Wrap. */
export function mostDivisive(tallies: PollTally[]): PollTally | undefined {
  const contested = tallies.filter((tally) => tally.votes >= 2 && tally.options.length > 1);
  if (contested.length === 0) return undefined;
  return contested.sort((a, b) => spread(a) - spread(b) || b.votes - a.votes)[0];
}

function spread(tally: PollTally): number {
  return (tally.options[0]?.share ?? 0) - (tally.options[1]?.share ?? 0);
}

export function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}
