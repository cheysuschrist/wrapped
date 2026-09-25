/**
 * Core record types for the MyWrap event stream.
 *
 * Everything in this package is built on one normalized table of observed
 * actions. Nothing here infers intent, sentiment or physical location: a row
 * exists only because the attendee did something inside MyWrap, or because a
 * touchpoint we explicitly instrumented was scanned.
 */

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type Metadata = Record<string, JsonValue>;

/** The MyWrap experience being measured (one activation / event). */
export type WrapId = string;
/** First-party, per-browser id. Persistent, but not personally identifying. */
export type VisitorId = string;
/** An attendee record, created only when someone identifies themselves. */
export type PersonId = string;
/** One visit. Rotates after a period of inactivity. */
export type SessionId = string;

/**
 * The vocabulary we instrument. Callers may log actions outside this list
 * (`ActionName` stays open), but only known actions are classified into
 * funnel stages by `taxonomy.ts`.
 */
export const KNOWN_ACTIONS = [
  'album_opened',
  'photo_viewed',
  'photo_downloaded',
  'photo_uploaded',
  'photos_found',
  'reaction_added',
  'poll_viewed',
  'poll_answered',
  'prompt_answered',
  'link_clicked',
  'email_submitted',
  'phone_submitted',
  'game_started',
  'game_completed',
  'returned_to_album',
  'touchpoint_visited',
  'identified',
  // small-event mechanics
  'mission_viewed',
  'mission_completed',
  'hot_take_submitted',
  'reveal_unlocked',
  'wrap_viewed',
  'wrap_shared',
] as const;

export type KnownAction = (typeof KNOWN_ACTIONS)[number];
// eslint-disable-next-line @typescript-eslint/ban-types
export type ActionName = KnownAction | (string & {});

/** One row of the event stream. This is the only thing we persist about behaviour. */
export interface EventAction {
  /** Unique id for this row. */
  event_id: string;
  /** Which MyWrap this happened in. */
  wrap_id: WrapId;
  /** Always present — anonymous visitors are still a stable identity. */
  anonymous_id: VisitorId;
  /** Present once the visitor has identified themselves (and consent allows). */
  person_id?: PersonId | null;
  session_id: SessionId;
  /** ISO 8601, UTC. */
  timestamp: string;
  action: ActionName;
  /** What the action was performed on: a photo id, poll id, link id, touchpoint id. */
  object_id?: string | null;
  metadata?: Metadata;
}

/** What the attendee agreed to when they handed over contact details. */
export interface Consent {
  /**
   * May we attach the actions taken *before* they identified themselves to
   * their attendee record? When false, only actions from the moment of
   * identification onward are linked.
   */
  link_history: boolean;
  /** May the organiser contact them / sync them to a CRM? */
  marketing: boolean;
}

export const DEFAULT_CONSENT: Consent = { link_history: false, marketing: false };

/** An attendee record. Created only when someone volunteers who they are. */
export interface Person {
  person_id: PersonId;
  /** Every browser we have tied to this person. */
  anonymous_ids: VisitorId[];
  email?: string;
  phone?: string;
  name?: string;
  /** ISO 8601 of the first identification. */
  identified_at: string;
  consent: Consent;
  /** Anything the organiser knows from elsewhere: RSVP status, ticket type, CRM id. */
  traits: Metadata;
  /** Person ids folded into this record by a merge. */
  merged_from?: PersonId[];
}

/** Traits accepted at identify time. */
export interface IdentifyTraits {
  person_id?: PersonId;
  email?: string;
  phone?: string;
  name?: string;
  consent?: Partial<Consent>;
  traits?: Metadata;
}
