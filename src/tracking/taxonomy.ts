import type { ActionName, EventAction } from './types.ts';

/**
 * Funnel stages, in the order an organiser reads them. A visitor "reaches" a
 * stage by doing at least one action mapped to it — we never assume they
 * passed through the earlier stages, because they may not have.
 */
export const STAGES = [
  'opened',
  'explored',
  'acquired',
  'participated',
  'contributed',
  'feedback',
  'opted_in',
  'next_action',
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  opened: 'opened MyWrap',
  explored: 'explored photos',
  acquired: 'found or downloaded something',
  participated: 'participated',
  contributed: 'contributed content',
  feedback: 'gave feedback',
  opted_in: 'opted in',
  next_action: 'took a next action',
};

const STAGE_BY_ACTION: Record<string, Stage> = {
  album_opened: 'opened',
  touchpoint_visited: 'opened',
  returned_to_album: 'opened',

  photo_viewed: 'explored',
  photos_found: 'explored',
  poll_viewed: 'explored',
  mission_viewed: 'explored',
  wrap_viewed: 'explored',

  photo_downloaded: 'acquired',

  poll_answered: 'participated',
  reaction_added: 'participated',
  hot_take_submitted: 'participated',
  game_started: 'participated',
  game_completed: 'participated',
  mission_completed: 'participated',

  photo_uploaded: 'contributed',

  prompt_answered: 'feedback',

  email_submitted: 'opted_in',
  phone_submitted: 'opted_in',

  link_clicked: 'next_action',
  wrap_shared: 'next_action',
};

export function stageOf(action: ActionName): Stage | undefined {
  return STAGE_BY_ACTION[action];
}

/** Coarse grouping used by the "what people did" breakdown. */
export type Surface = 'photos' | 'polls' | 'prompts' | 'games' | 'missions' | 'links' | 'contact' | 'touchpoints' | 'wrap' | 'other';

const SURFACE_BY_ACTION: Record<string, Surface> = {
  photo_viewed: 'photos',
  photo_downloaded: 'photos',
  photo_uploaded: 'photos',
  photos_found: 'photos',
  reaction_added: 'photos',
  poll_viewed: 'polls',
  poll_answered: 'polls',
  prompt_answered: 'prompts',
  hot_take_submitted: 'prompts',
  game_started: 'games',
  game_completed: 'games',
  mission_viewed: 'missions',
  mission_completed: 'missions',
  reveal_unlocked: 'missions',
  link_clicked: 'links',
  email_submitted: 'contact',
  phone_submitted: 'contact',
  identified: 'contact',
  touchpoint_visited: 'touchpoints',
  wrap_viewed: 'wrap',
  wrap_shared: 'wrap',
};

export function surfaceOf(action: ActionName): Surface {
  return SURFACE_BY_ACTION[action] ?? 'other';
}

/**
 * Who performed an action, for counting purposes: the attendee record when we
 * have one, otherwise the browser. One person on two devices counts once as
 * soon as both devices are stitched to them.
 */
export function actorKey(action: EventAction): string {
  return action.person_id ?? action.anonymous_id;
}

/** Day bucket for "returned the next morning" style questions. */
export function dayKey(timestamp: string, timeZone?: string): string {
  const date = new Date(timestamp);
  if (!timeZone) return date.toISOString().slice(0, 10);
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
    return parts;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
