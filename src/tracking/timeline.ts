import { actorKey, dayKey } from './taxonomy.ts';
import type { EventAction } from './types.ts';

/**
 * One attendee's evening, in order.
 *
 * Descriptions are literal restatements of the logged row. "Downloaded
 * IMG_3842" is something we watched happen; "loved the event" is not, and
 * never appears here.
 */

export interface TimelineEntry {
  timestamp: string;
  /** Localised clock time, e.g. "7:43 PM". */
  time: string;
  action: string;
  description: string;
  object_id?: string;
  metadata?: Record<string, unknown>;
}

export interface TimelineDay {
  day: string;
  /** "Thursday, September 25" */
  label: string;
  entries: TimelineEntry[];
}

export interface TimelineOptions {
  timeZone?: string;
  locale?: string;
}

export function describeAction(action: EventAction): string {
  const object = action.object_id ?? '';
  const meta = action.metadata ?? {};
  switch (action.action) {
    case 'album_opened':
      return 'Opened MyWrap';
    case 'returned_to_album':
      return 'Came back to the album';
    case 'photos_found':
      return typeof meta.count === 'number' ? `Found ${meta.count} photos of themselves` : 'Used find-my-photos';
    case 'photo_viewed':
      return object ? `Viewed ${object}` : 'Viewed a photo';
    case 'photo_downloaded':
      return object ? `Downloaded ${object}` : 'Downloaded a photo';
    case 'photo_uploaded':
      return object ? `Uploaded ${object}` : 'Uploaded a photo';
    case 'reaction_added':
      return `Reacted ${typeof meta.reaction === 'string' ? meta.reaction : ''} to ${object || 'a photo'}`.replace(
        /\s+/g,
        ' ',
      );
    case 'poll_viewed':
      return object ? `Saw the ${object} poll` : 'Saw a poll';
    case 'poll_answered':
      return typeof meta.choice === 'string' ? `Voted ${meta.choice}` : 'Voted';
    case 'prompt_answered':
      return typeof meta.response === 'string' ? `Answered "${meta.response}"` : 'Answered a prompt';
    case 'hot_take_submitted':
      return typeof meta.response === 'string' ? `Hot take: "${meta.response}"` : 'Left a hot take';
    case 'mission_viewed':
      return object ? `Saw mission ${object}` : 'Saw the missions';
    case 'mission_completed':
      return object ? `Completed mission ${object}` : 'Completed a mission';
    case 'reveal_unlocked':
      return object ? `Unlocked ${object}` : 'Unlocked a reveal';
    case 'game_started':
      return object ? `Started ${object}` : 'Started a game';
    case 'game_completed':
      return object ? `Finished ${object}` : 'Finished a game';
    case 'link_clicked':
      return `Clicked ${typeof meta.label === 'string' ? meta.label : object || 'a link'}`;
    case 'email_submitted':
      return 'Entered their email';
    case 'phone_submitted':
      return 'Entered their phone number';
    case 'identified':
      return 'Identified themselves';
    case 'touchpoint_visited':
      return `Scanned ${typeof meta.label === 'string' ? meta.label : object || 'a touchpoint'}`;
    case 'wrap_viewed':
      return 'Opened the Wrap';
    case 'wrap_shared':
      return 'Shared the Wrap';
    default:
      return object ? `${action.action} (${object})` : action.action;
  }
}

function timeFormatter(options: TimelineOptions): Intl.DateTimeFormat | undefined {
  try {
    return new Intl.DateTimeFormat(options.locale ?? 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      ...(options.timeZone ? { timeZone: options.timeZone } : {}),
    });
  } catch {
    return undefined;
  }
}

function dayFormatter(options: TimelineOptions): Intl.DateTimeFormat | undefined {
  try {
    return new Intl.DateTimeFormat(options.locale ?? 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      ...(options.timeZone ? { timeZone: options.timeZone } : {}),
    });
  } catch {
    return undefined;
  }
}

export interface Timeline {
  actor_key: string;
  entries: TimelineEntry[];
  days: TimelineDay[];
}

/** `actor` is a person_id or an anonymous visitor id — whichever you have. */
export function buildTimeline(
  actions: EventAction[],
  actor: string,
  options: TimelineOptions = {},
): Timeline {
  const time = timeFormatter(options);
  const day = dayFormatter(options);

  const rows = actions
    .filter((action) => actorKey(action) === actor || action.anonymous_id === actor)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const entries: TimelineEntry[] = rows.map((action) => ({
    timestamp: action.timestamp,
    time: time ? time.format(new Date(action.timestamp)) : action.timestamp.slice(11, 16),
    action: action.action,
    description: describeAction(action),
    ...(action.object_id ? { object_id: action.object_id } : {}),
    ...(action.metadata ? { metadata: action.metadata } : {}),
  }));

  const days: TimelineDay[] = [];
  for (const entry of entries) {
    const key = dayKey(entry.timestamp, options.timeZone);
    let bucket = days.find((candidate) => candidate.day === key);
    if (!bucket) {
      bucket = {
        day: key,
        label: day ? day.format(new Date(entry.timestamp)) : key,
        entries: [],
      };
      days.push(bucket);
    }
    bucket.entries.push(entry);
  }

  return { actor_key: actor, entries, days };
}
