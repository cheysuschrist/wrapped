import { actorKey } from './taxonomy.ts';
import type { ActionName, EventAction } from './types.ts';

/**
 * Missions turn "please upload your photos" — work — into something specific
 * and social: "who got the shot from outside?".
 *
 * A mission is completed by an action we already log, so nothing new has to be
 * instrumented. Completing one can unlock a reveal (crowd results, the pro
 * photos, the final Wrap), which is the reciprocity half of the deal: the
 * attendee gets something back for what they gave.
 */

export interface Mission {
  id: string;
  emoji?: string;
  title: string;
  /** The ask, in the attendee's language. */
  blurb?: string;
  /** Which logged action counts, and how many times. */
  completed_by: { action: ActionName; count?: number; object_id?: string };
}

export interface Reveal {
  id: string;
  label: string;
  requires: {
    /** Any N missions. */
    missions?: number;
    /** These specific missions. */
    mission_ids?: string[];
    /** Or simply having done one of these actions (e.g. answered the poll). */
    actions?: ActionName[];
  };
}

/** A starting set an organiser can pick from — the wording is the product. */
export const SUGGESTED_MISSIONS: Mission[] = [
  {
    id: 'prove_you_were_here',
    emoji: '📸',
    title: 'prove you were here',
    blurb: 'add your POV',
    completed_by: { action: 'photo_uploaded' },
  },
  {
    id: 'another_angle',
    emoji: '👀',
    title: 'another angle',
    blurb: 'upload a photo of the main moment',
    completed_by: { action: 'photo_uploaded', count: 2 },
  },
  {
    id: 'find_your_people',
    emoji: '🫡',
    title: 'find your people',
    blurb: 'a photo with someone you met tonight',
    completed_by: { action: 'photo_uploaded' },
  },
  {
    id: 'settle_it',
    emoji: '🏆',
    title: 'settle it',
    blurb: 'vote — the room is split',
    completed_by: { action: 'poll_answered' },
  },
  {
    id: 'hot_take',
    emoji: '🎤',
    title: 'say something reckless',
    blurb: 'one sentence about tonight',
    completed_by: { action: 'hot_take_submitted' },
  },
  {
    id: 'no_context',
    emoji: '❓',
    title: 'no context',
    blurb: 'upload something with absolutely no explanation',
    completed_by: { action: 'photo_uploaded' },
  },
];

export interface MissionProgress {
  mission: Mission;
  done: number;
  needed: number;
  completed: boolean;
  completed_at?: string;
}

export interface MissionBoard {
  actor_key: string;
  missions: MissionProgress[];
  completed: number;
  unlocked: string[];
  locked: { id: string; label: string; needs: string }[];
}

function matches(action: EventAction, mission: Mission): boolean {
  if (action.action !== mission.completed_by.action) return false;
  if (mission.completed_by.object_id && action.object_id !== mission.completed_by.object_id) return false;
  return true;
}

/**
 * One attendee's board. `mission_completed` rows are honoured directly, so a
 * client can also mark a mission done itself; otherwise progress is derived
 * from the underlying actions.
 */
export function missionBoard(
  actions: EventAction[],
  missions: Mission[],
  actor: string,
  reveals: Reveal[] = [],
): MissionBoard {
  const mine = actions
    .filter((action) => actorKey(action) === actor || action.anonymous_id === actor)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const progress: MissionProgress[] = missions.map((mission) => {
    const explicit = mine.filter(
      (action) => action.action === 'mission_completed' && action.object_id === mission.id,
    );
    const derived = mine.filter((action) => matches(action, mission));
    const needed = mission.completed_by.count ?? 1;
    const done = explicit.length > 0 ? needed : derived.length;
    const completedAt =
      explicit[0]?.timestamp ?? (derived.length >= needed ? derived[needed - 1]!.timestamp : undefined);
    return {
      mission,
      done: Math.min(done, needed),
      needed,
      completed: done >= needed,
      ...(completedAt ? { completed_at: completedAt } : {}),
    };
  });

  const completedIds = new Set(progress.filter((p) => p.completed).map((p) => p.mission.id));
  const unlocked: string[] = [];
  const locked: { id: string; label: string; needs: string }[] = [];

  for (const reveal of reveals) {
    const needsMissions = reveal.requires.missions ?? 0;
    const needsIds = reveal.requires.mission_ids ?? [];
    const needsActions = reveal.requires.actions ?? [];

    const missingCount = Math.max(0, needsMissions - completedIds.size);
    const missingIds = needsIds.filter((id) => !completedIds.has(id));
    const actionDone = needsActions.length === 0 || needsActions.some((name) => mine.some((a) => a.action === name));

    if (missingCount === 0 && missingIds.length === 0 && actionDone) {
      unlocked.push(reveal.id);
    } else {
      const needs =
        missingIds.length > 0
          ? `complete ${missingIds.join(', ')}`
          : missingCount > 0
            ? `complete ${missingCount} more mission${missingCount === 1 ? '' : 's'}`
            : `do one of: ${needsActions.join(', ')}`;
      locked.push({ id: reveal.id, label: reveal.label, needs });
    }
  }

  return {
    actor_key: actor,
    missions: progress,
    completed: completedIds.size,
    unlocked,
    locked,
  };
}

export interface MissionCrowdStat {
  mission: Mission;
  people: number;
  /** 0–1 of everyone who opened the Wrap. */
  share: number;
  /** "17/50 people have added their POV" — the social-proof line. */
  line: string;
}

/** The crowd view of the board, for the room-wide nudge. */
export function missionCrowdStats(
  actions: EventAction[],
  missions: Mission[],
  options: { visitors?: number; expectedAttendees?: number } = {},
): MissionCrowdStat[] {
  const actors = new Set(actions.map(actorKey));
  const denominator = options.expectedAttendees ?? options.visitors ?? actors.size;

  return missions.map((mission) => {
    const people = new Set<string>();
    for (const actor of actors) {
      const board = missionBoard(actions, [mission], actor);
      if (board.missions[0]?.completed) people.add(actor);
    }
    return {
      mission,
      people: people.size,
      share: denominator ? people.size / denominator : 0,
      line: `${people.size}/${denominator} ${mission.title}`,
    };
  });
}
