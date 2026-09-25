import type { IdentityGraph } from './identity.ts';
import { STAGES, actorKey, dayKey, stageOf, type Stage } from './taxonomy.ts';
import type { EventAction, Metadata } from './types.ts';

/**
 * The same event stream, grouped by person instead of by crowd.
 *
 * Deliberately absent: engagement scores, superfan badges, and any adjective
 * about how someone felt. A row says what they did and when. That is all we
 * know, and it is what an organiser can act on without embarrassing themselves
 * in front of a client.
 */

export interface PersonSummary {
  /** person_id when identified, otherwise the anonymous visitor id. */
  actor_key: string;
  person_id?: string;
  anonymous_ids: string[];
  /** "Maya Rodriguez" or "Anonymous #12". Safe to render. */
  label: string;
  identified: boolean;
  name?: string;
  email?: string;
  phone?: string;
  traits?: Metadata;

  first_seen: string;
  last_seen: string;
  sessions: number;
  actions: number;
  days_active: number;
  returned: boolean;

  photos_viewed: number;
  photos_downloaded: number;
  photos_uploaded: number;
  reactions: number;
  prompts_answered: number;
  missions_completed: string[];
  /** poll id -> the option they landed on. */
  poll_choices: Record<string, string>;
  links_clicked: string[];

  opted_in: boolean;
  marketing_consent: boolean;
  stages: Stage[];
}

export interface PeopleOptions {
  identity?: IdentityGraph;
  timeZone?: string;
  /** First number used for "Anonymous #n" labels. Default 1. */
  labelOffset?: number;
}

export function buildPeople(actions: EventAction[], options: PeopleOptions = {}): PersonSummary[] {
  const byActor = new Map<string, EventAction[]>();
  const sorted = [...actions].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  for (const action of sorted) {
    const key = actorKey(action);
    const bucket = byActor.get(key) ?? [];
    bucket.push(action);
    byActor.set(key, bucket);
  }

  let anonymousCounter = options.labelOffset ?? 1;
  const people: PersonSummary[] = [];

  for (const [key, rows] of byActor) {
    const person = rows[0]!.person_id
      ? options.identity?.personById(rows[0]!.person_id)
      : options.identity?.personFor(rows[0]!.anonymous_id);

    const sessions = new Set(rows.map((row) => row.session_id));
    const days = new Set(rows.map((row) => dayKey(row.timestamp, options.timeZone)));
    const pollChoices: Record<string, string> = {};
    const missions = new Set<string>();
    const links = new Set<string>();

    for (const row of rows) {
      if (row.action === 'poll_answered' && row.object_id && typeof row.metadata?.choice === 'string') {
        pollChoices[row.object_id] = row.metadata.choice;
      }
      if (row.action === 'mission_completed' && row.object_id) missions.add(row.object_id);
      if (row.action === 'link_clicked' && row.object_id) links.add(row.object_id);
    }

    const identified = Boolean(person);
    const label = person?.name ?? (identified ? 'Identified attendee' : `Anonymous #${anonymousCounter++}`);

    people.push({
      actor_key: key,
      ...(person ? { person_id: person.person_id } : {}),
      anonymous_ids: [...new Set(rows.map((row) => row.anonymous_id))],
      label,
      identified,
      ...(person?.name ? { name: person.name } : {}),
      ...(person?.email ? { email: person.email } : {}),
      ...(person?.phone ? { phone: person.phone } : {}),
      ...(person?.traits ? { traits: person.traits } : {}),

      first_seen: rows[0]!.timestamp,
      last_seen: rows.at(-1)!.timestamp,
      sessions: sessions.size,
      actions: rows.length,
      days_active: days.size,
      returned: days.size > 1,

      photos_viewed: count(rows, 'photo_viewed'),
      photos_downloaded: count(rows, 'photo_downloaded'),
      photos_uploaded: count(rows, 'photo_uploaded'),
      reactions: count(rows, 'reaction_added'),
      prompts_answered: count(rows, 'prompt_answered') + count(rows, 'hot_take_submitted'),
      missions_completed: [...missions],
      poll_choices: pollChoices,
      links_clicked: [...links],

      opted_in: rows.some((row) => row.action === 'email_submitted' || row.action === 'phone_submitted'),
      marketing_consent: person?.consent.marketing ?? false,
      stages: STAGES.filter((stage) => rows.some((row) => stageOf(row.action) === stage)),
    });
  }

  return people.sort((a, b) => b.actions - a.actions || a.first_seen.localeCompare(b.first_seen));
}

function count(rows: EventAction[], action: string): number {
  return rows.filter((row) => row.action === action).length;
}

export interface PeopleFilter {
  identified?: boolean;
  optedIn?: boolean;
  returned?: boolean;
  contributed?: boolean;
  clickedLink?: boolean;
  /** Inclusive floor on total actions. Pair with `activityFloor()`. */
  minActions?: number;
  /** Everyone who picked `choice` in poll `poll`. */
  votedFor?: { poll: string; choice: string };
}

export function filterPeople(people: PersonSummary[], filter: PeopleFilter = {}): PersonSummary[] {
  return people.filter((person) => {
    if (filter.identified !== undefined && person.identified !== filter.identified) return false;
    if (filter.optedIn !== undefined && person.opted_in !== filter.optedIn) return false;
    if (filter.returned !== undefined && person.returned !== filter.returned) return false;
    if (filter.contributed !== undefined && person.photos_uploaded > 0 !== filter.contributed) return false;
    if (filter.clickedLink !== undefined && person.links_clicked.length > 0 !== filter.clickedLink) return false;
    if (filter.minActions !== undefined && person.actions < filter.minActions) return false;
    if (filter.votedFor && person.poll_choices[filter.votedFor.poll] !== filter.votedFor.choice) return false;
    return true;
  });
}

/**
 * A "most active" cut-off derived from this event's own distribution rather
 * than a made-up score: the action count at the given percentile. Call it what
 * it is in the UI — "top 25% by actions at this event" — not "superfans".
 */
export function activityFloor(people: PersonSummary[], percentile = 0.75): number {
  if (people.length === 0) return 0;
  const counts = people.map((person) => person.actions).sort((a, b) => a - b);
  const index = Math.min(counts.length - 1, Math.floor(percentile * counts.length));
  return counts[index]!;
}

/**
 * Contributors, for the live "17/50 people have added their POV" moment.
 * Only people who chose to be publicly visible are named; everyone else is
 * counted but not identified.
 */
export function contributors(
  people: PersonSummary[],
): { named: PersonSummary[]; anonymous_count: number; total: number } {
  const all = people.filter((person) => person.photos_uploaded > 0);
  const named = all.filter((person) => person.traits?.public_display === true && person.name);
  return {
    named: named.sort((a, b) => b.photos_uploaded - a.photos_uploaded),
    anonymous_count: all.length - named.length,
    total: all.length,
  };
}
