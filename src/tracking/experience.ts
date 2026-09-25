import { tallyPolls, type PollTally } from './reveal.ts';
import { STAGES, STAGE_LABELS, actorKey, dayKey, stageOf, type Stage } from './taxonomy.ts';
import type { EventAction } from './types.ts';

/**
 * The crowd view: what happened inside this MyWrap.
 *
 * Every number here is a count of logged actions or of distinct actors. There
 * are no scores, no inferred sentiment, and no claim about anything that
 * happened outside the app unless a touchpoint was explicitly instrumented.
 */

export interface ExperienceOptions {
  /** IANA zone used to decide what "the next morning" means. Default UTC. */
  timeZone?: string;
  /** Guest-list size, so reach can be stated as "41 of 50". */
  expectedAttendees?: number;
}

export interface FunnelStep {
  stage: Stage;
  label: string;
  visitors: number;
  /** 0–1 of everyone who opened the Wrap. */
  share_of_opened: number;
  /** 0–1 of the previous non-empty step. */
  share_of_previous: number;
}

export interface PhotoStats {
  viewers: number;
  views: number;
  downloaders: number;
  downloads: number;
  contributors: number;
  uploads: number;
  reactions: number;
  top_viewed: ObjectCount[];
  top_downloaded: ObjectCount[];
  top_reacted: ObjectCount[];
}

export interface ObjectCount {
  object_id: string;
  count: number;
  people: number;
}

export interface PromptResult {
  prompt_id: string;
  question?: string;
  responses: number;
  respondents: number;
  /** Verbatim answers, newest last. Never summarised into a mood here. */
  answers: string[];
  /**
   * Only populated when the client explicitly logged `metadata.sentiment`
   * (e.g. an emoji scale). We never infer it from free text.
   */
  sentiment?: Record<string, number>;
}

export interface GameResult {
  game_id: string;
  starts: number;
  completions: number;
  players: number;
  completion_rate: number;
}

export interface LinkResult {
  link_id: string;
  label?: string;
  clicks: number;
  clickers: number;
}

export interface MissionResult {
  mission_id: string;
  completions: number;
  people: number;
}

export interface ExperienceReport {
  wrap_id: string;
  first_action?: string;
  last_action?: string;
  actions: number;
  sessions: number;
  visitors: number;
  identified: number;
  anonymous: number;
  expected_attendees?: number;
  /** 0–1 of the guest list that opened the Wrap, when a guest list is known. */
  reach?: number;
  returning: { visitors: number; share: number };
  funnel: FunnelStep[];
  photos: PhotoStats;
  polls: PollTally[];
  prompts: PromptResult[];
  games: GameResult[];
  missions: MissionResult[];
  links: LinkResult[];
}

function distinct(actions: EventAction[], predicate: (a: EventAction) => boolean): Set<string> {
  const set = new Set<string>();
  for (const action of actions) if (predicate(action)) set.add(actorKey(action));
  return set;
}

function countByObject(
  actions: EventAction[],
  action: string,
  limit = 5,
): ObjectCount[] {
  const counts = new Map<string, { count: number; people: Set<string> }>();
  for (const row of actions) {
    if (row.action !== action || !row.object_id) continue;
    const entry = counts.get(row.object_id) ?? { count: 0, people: new Set<string>() };
    entry.count += 1;
    entry.people.add(actorKey(row));
    counts.set(row.object_id, entry);
  }
  return [...counts.entries()]
    .map(([object_id, entry]) => ({ object_id, count: entry.count, people: entry.people.size }))
    .sort((a, b) => b.count - a.count || a.object_id.localeCompare(b.object_id))
    .slice(0, limit);
}

export function buildFunnel(actions: EventAction[]): FunnelStep[] {
  const opened = distinct(actions, (a) => stageOf(a.action) === 'opened').size;
  let previous = 0;
  return STAGES.map((stage) => {
    const visitors = distinct(actions, (a) => stageOf(a.action) === stage).size;
    const step: FunnelStep = {
      stage,
      label: STAGE_LABELS[stage],
      visitors,
      share_of_opened: opened ? visitors / opened : 0,
      share_of_previous: previous ? visitors / previous : opened ? visitors / opened : 0,
    };
    if (visitors > 0) previous = visitors;
    return step;
  });
}

function promptResults(actions: EventAction[]): PromptResult[] {
  const byPrompt = new Map<string, PromptResult>();
  for (const action of actions) {
    if (action.action !== 'prompt_answered' && action.action !== 'hot_take_submitted') continue;
    const id = action.object_id ?? action.action;
    const entry = byPrompt.get(id) ?? { prompt_id: id, responses: 0, respondents: 0, answers: [] };
    entry.responses += 1;
    const response = action.metadata?.response;
    if (typeof response === 'string') entry.answers.push(response);
    if (typeof action.metadata?.question === 'string') entry.question = action.metadata.question;
    const sentiment = action.metadata?.sentiment;
    if (typeof sentiment === 'string') {
      entry.sentiment = { ...(entry.sentiment ?? {}), [sentiment]: (entry.sentiment?.[sentiment] ?? 0) + 1 };
    }
    byPrompt.set(id, entry);
  }
  for (const [id, entry] of byPrompt) {
    entry.respondents = distinct(
      actions,
      (a) =>
        (a.action === 'prompt_answered' || a.action === 'hot_take_submitted') &&
        (a.object_id ?? a.action) === id,
    ).size;
  }
  return [...byPrompt.values()].sort((a, b) => b.responses - a.responses);
}

function gameResults(actions: EventAction[]): GameResult[] {
  const ids = new Set<string>();
  for (const action of actions) {
    if ((action.action === 'game_started' || action.action === 'game_completed') && action.object_id) {
      ids.add(action.object_id);
    }
  }
  return [...ids]
    .map((id) => {
      const starts = actions.filter((a) => a.action === 'game_started' && a.object_id === id).length;
      const completions = actions.filter((a) => a.action === 'game_completed' && a.object_id === id).length;
      const players = distinct(
        actions,
        (a) => (a.action === 'game_started' || a.action === 'game_completed') && a.object_id === id,
      ).size;
      return {
        game_id: id,
        starts,
        completions,
        players,
        completion_rate: starts ? completions / starts : 0,
      };
    })
    .sort((a, b) => b.starts - a.starts);
}

function linkResults(actions: EventAction[]): LinkResult[] {
  const byLink = new Map<string, LinkResult & { actors: Set<string> }>();
  for (const action of actions) {
    if (action.action !== 'link_clicked') continue;
    const id = action.object_id ?? 'link';
    const entry = byLink.get(id) ?? { link_id: id, clicks: 0, clickers: 0, actors: new Set<string>() };
    entry.clicks += 1;
    entry.actors.add(actorKey(action));
    if (typeof action.metadata?.label === 'string') entry.label = action.metadata.label;
    byLink.set(id, entry);
  }
  return [...byLink.values()]
    .map(({ actors, ...link }) => ({ ...link, clickers: actors.size }))
    .sort((a, b) => b.clicks - a.clicks);
}

function missionResults(actions: EventAction[]): MissionResult[] {
  const byMission = new Map<string, { completions: number; people: Set<string> }>();
  for (const action of actions) {
    if (action.action !== 'mission_completed' || !action.object_id) continue;
    const entry = byMission.get(action.object_id) ?? { completions: 0, people: new Set<string>() };
    entry.completions += 1;
    entry.people.add(actorKey(action));
    byMission.set(action.object_id, entry);
  }
  return [...byMission.entries()]
    .map(([mission_id, entry]) => ({ mission_id, completions: entry.completions, people: entry.people.size }))
    .sort((a, b) => b.completions - a.completions);
}

/** How many distinct actors came back on a later day. */
function returningVisitors(actions: EventAction[], timeZone?: string): number {
  const days = new Map<string, Set<string>>();
  for (const action of actions) {
    const key = actorKey(action);
    const set = days.get(key) ?? new Set<string>();
    set.add(dayKey(action.timestamp, timeZone));
    days.set(key, set);
  }
  let count = 0;
  for (const set of days.values()) if (set.size > 1) count += 1;
  return count;
}

export function buildExperience(
  actions: EventAction[],
  options: ExperienceOptions = {},
): ExperienceReport {
  const sorted = [...actions].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const visitors = distinct(sorted, () => true);
  const identified = new Set<string>();
  const sessions = new Set<string>();
  for (const action of sorted) {
    sessions.add(action.session_id);
    if (action.person_id) identified.add(action.person_id);
  }

  const returning = returningVisitors(sorted, options.timeZone);

  return {
    wrap_id: sorted[0]?.wrap_id ?? '',
    ...(sorted[0] ? { first_action: sorted[0].timestamp } : {}),
    ...(sorted.at(-1) ? { last_action: sorted.at(-1)!.timestamp } : {}),
    actions: sorted.length,
    sessions: sessions.size,
    visitors: visitors.size,
    identified: identified.size,
    anonymous: visitors.size - identified.size,
    ...(options.expectedAttendees ? { expected_attendees: options.expectedAttendees } : {}),
    ...(options.expectedAttendees
      ? { reach: visitors.size / options.expectedAttendees }
      : {}),
    returning: { visitors: returning, share: visitors.size ? returning / visitors.size : 0 },
    funnel: buildFunnel(sorted),
    photos: {
      viewers: distinct(sorted, (a) => a.action === 'photo_viewed').size,
      views: sorted.filter((a) => a.action === 'photo_viewed').length,
      downloaders: distinct(sorted, (a) => a.action === 'photo_downloaded').size,
      downloads: sorted.filter((a) => a.action === 'photo_downloaded').length,
      contributors: distinct(sorted, (a) => a.action === 'photo_uploaded').size,
      uploads: sorted.filter((a) => a.action === 'photo_uploaded').length,
      reactions: sorted.filter((a) => a.action === 'reaction_added').length,
      top_viewed: countByObject(sorted, 'photo_viewed'),
      top_downloaded: countByObject(sorted, 'photo_downloaded'),
      top_reacted: countByObject(sorted, 'reaction_added'),
    },
    polls: tallyPolls(sorted),
    prompts: promptResults(sorted),
    games: gameResults(sorted),
    missions: missionResults(sorted),
    links: linkResults(sorted),
  };
}
