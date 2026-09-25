import { contributors, type PersonSummary } from './people.ts';
import { pct, tallyPolls, type PollTally } from './reveal.ts';
import { actorKey } from './taxonomy.ts';
import type { EventAction } from './types.ts';

/**
 * The live pulse — what the room sees on the screen, and what the host reads
 * out halfway through. It exists to make the Wrap feel like it's happening
 * now, which is what gets people to open it a second and third time.
 *
 * Every line is a count. If a line can't be stated as a count, it doesn't go
 * on the screen.
 */

export interface PulseOptions {
  expectedAttendees?: number;
  people?: PersonSummary[];
  /** Only count activity at or before this moment (for replaying a night). */
  until?: Date | string;
}

export interface EventPulse {
  joined: number;
  expected_attendees?: number;
  photos: number;
  uploads: number;
  contributors: number;
  named_contributors: { label: string; uploads: number }[];
  votes: number;
  hot_takes: number;
  missions_completed: number;
  downloads: number;
  leading?: { poll_id: string; choice: string; share: number };
  contested?: { poll_id: string; question?: string };
  outvoted: number;
  updated_at?: string;
  /** Render-ready lines, in the order they should appear. */
  lines: string[];
}

export function eventPulse(actions: EventAction[], options: PulseOptions = {}): EventPulse {
  const until = options.until ? new Date(options.until).toISOString() : undefined;
  const rows = (until ? actions.filter((action) => action.timestamp <= until) : actions).slice().sort(
    (a, b) => a.timestamp.localeCompare(b.timestamp),
  );

  const joined = new Set(rows.map(actorKey)).size;
  const uploads = rows.filter((row) => row.action === 'photo_uploaded').length;
  const downloads = rows.filter((row) => row.action === 'photo_downloaded').length;
  const votes = rows.filter((row) => row.action === 'poll_answered').length;
  const hotTakes = rows.filter((row) => row.action === 'hot_take_submitted').length;
  const missionsCompleted = rows.filter((row) => row.action === 'mission_completed').length;
  const seededPhotos = new Set(
    rows.filter((row) => row.object_id && (row.action === 'photo_viewed' || row.action === 'photo_uploaded')).map((row) => row.object_id!),
  ).size;

  const polls = tallyPolls(rows);
  const top = polls[0];
  const contestedPoll = polls.find((poll) => poll.contested && poll.votes >= 2);
  const people = options.people;
  const contributorStats = people ? contributors(people) : undefined;

  const lines: string[] = [];
  lines.push(
    options.expectedAttendees
      ? `${joined} of ${options.expectedAttendees} people joined`
      : `${joined} people joined`,
  );
  if (seededPhotos) lines.push(`${seededPhotos} photos`);
  if (uploads) lines.push(`${uploads} added by the room`);
  if (votes) lines.push(`${votes} votes`);
  if (hotTakes) lines.push(`${hotTakes} hot takes`);
  if (top?.leader && top.votes > 0) {
    lines.push(`${top.leader.choice} is winning — ${pct(top.leader.share)}`);
  }
  const outvotedCount = outvoted(rows, polls).length;
  if (outvotedCount > 0) {
    lines.push(
      `${outvotedCount} ${outvotedCount === 1 ? 'person is' : 'people are'} outvoted in every poll they answered`,
    );
  }

  return {
    joined,
    ...(options.expectedAttendees ? { expected_attendees: options.expectedAttendees } : {}),
    photos: seededPhotos,
    uploads,
    contributors: contributorStats?.total ?? new Set(rows.filter((r) => r.action === 'photo_uploaded').map(actorKey)).size,
    named_contributors:
      contributorStats?.named.map((person) => ({ label: person.label, uploads: person.photos_uploaded })) ?? [],
    votes,
    hot_takes: hotTakes,
    missions_completed: missionsCompleted,
    downloads,
    ...(top?.leader ? { leading: { poll_id: top.poll_id, choice: top.leader.choice, share: top.leader.share } } : {}),
    ...(contestedPoll
      ? { contested: { poll_id: contestedPoll.poll_id, ...(contestedPoll.question ? { question: contestedPoll.question } : {}) } }
      : {}),
    outvoted: outvotedCount,
    ...(rows.at(-1) ? { updated_at: rows.at(-1)!.timestamp } : {}),
    lines,
  };
}

/**
 * People who answered at least two polls and landed outside the winning option
 * every time. A joke the data can actually support — it is a fact about votes
 * cast, not a personality claim.
 */
export function outvoted(actions: EventAction[], polls: PollTally[] = tallyPolls(actions)): string[] {
  const leaders = new Map(polls.map((poll) => [poll.poll_id, poll.leader?.choice]));
  const byActor = new Map<string, { answered: number; withCrowd: number }>();

  for (const action of actions) {
    if (action.action !== 'poll_answered' || !action.object_id) continue;
    const choice = action.metadata?.choice;
    if (typeof choice !== 'string') continue;
    const entry = byActor.get(actorKey(action)) ?? { answered: 0, withCrowd: 0 };
    entry.answered += 1;
    if (leaders.get(action.object_id) === choice) entry.withCrowd += 1;
    byActor.set(actorKey(action), entry);
  }

  return [...byActor.entries()]
    .filter(([, entry]) => entry.answered >= 2 && entry.withCrowd === 0)
    .map(([actor]) => actor);
}
