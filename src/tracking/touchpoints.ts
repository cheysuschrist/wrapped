import { actorKey } from './taxonomy.ts';
import type { EventAction } from './types.ts';

/**
 * Physical touchpoints.
 *
 * MyWrap knows nothing about where anyone stood. It knows which QR or NFC tag
 * was scanned, because each one carries its own touchpoint id. That is the
 * only honest way to say anything about the room, and it is enough to
 * reconstruct the parts of the journey that were instrumented.
 *
 * Convention: `touchpoint_visited` with `object_id = touchpoint id`.
 */

export interface Touchpoint {
  id: string;
  label: string;
  /** Display order; also the order the flow is read in. */
  order?: number;
}

/** The URL behind the sticker at that station. */
export function touchpointUrl(baseUrl: string, wrapId: string, touchpointId: string): string {
  const url = new URL(baseUrl);
  url.pathname = `${url.pathname.replace(/\/$/, '')}/${wrapId}`;
  url.searchParams.set('tp', touchpointId);
  return url.toString();
}

export interface TouchpointStat {
  id: string;
  label: string;
  visitors: number;
  scans: number;
  /** 0–1 of everyone who scanned the first touchpoint. */
  share_of_first: number;
  /** 0–1 of the previous touchpoint in the defined order. */
  share_of_previous: number;
  first_scan?: string;
  last_scan?: string;
}

export function touchpointFlow(actions: EventAction[], touchpoints: Touchpoint[]): TouchpointStat[] {
  const ordered = [...touchpoints].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const scans = actions.filter((action) => action.action === 'touchpoint_visited');

  let firstCount = 0;
  let previousCount = 0;

  return ordered.map((touchpoint, index) => {
    const mine = scans.filter((action) => action.object_id === touchpoint.id);
    const visitors = new Set(mine.map(actorKey)).size;
    if (index === 0) firstCount = visitors;
    const stat: TouchpointStat = {
      id: touchpoint.id,
      label: touchpoint.label,
      visitors,
      scans: mine.length,
      share_of_first: firstCount ? visitors / firstCount : 0,
      share_of_previous: previousCount ? visitors / previousCount : index === 0 ? 1 : 0,
      ...(mine[0] ? { first_scan: mine[0].timestamp } : {}),
      ...(mine.at(-1) ? { last_scan: mine.at(-1)!.timestamp } : {}),
    };
    if (visitors > 0) previousCount = visitors;
    return stat;
  });
}

export interface Journey {
  actor_key: string;
  stops: { id: string; at: string }[];
}

/** Per-attendee scan order. Gaps are real: unscanned stations are invisible. */
export function journeys(actions: EventAction[]): Journey[] {
  const byActor = new Map<string, { id: string; at: string }[]>();
  for (const action of actions) {
    if (action.action !== 'touchpoint_visited' || !action.object_id) continue;
    const key = actorKey(action);
    const stops = byActor.get(key) ?? [];
    stops.push({ id: action.object_id, at: action.timestamp });
    byActor.set(key, stops);
  }
  return [...byActor.entries()].map(([actor_key, stops]) => ({
    actor_key,
    stops: stops.sort((a, b) => a.at.localeCompare(b.at)),
  }));
}

export interface PathCount {
  path: string[];
  people: number;
}

/** The most common scan sequences, deduplicated on consecutive repeats. */
export function commonPaths(actions: EventAction[], limit = 5): PathCount[] {
  const counts = new Map<string, number>();
  for (const journey of journeys(actions)) {
    const path = journey.stops
      .map((stop) => stop.id)
      .filter((id, index, all) => id !== all[index - 1]);
    if (path.length === 0) continue;
    const key = path.join(' → ');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, people]) => ({ path: key.split(' → '), people }))
    .sort((a, b) => b.people - a.people)
    .slice(0, limit);
}
